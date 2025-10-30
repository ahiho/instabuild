import Docker from 'dockerode';
import { EventEmitter } from 'events';
import { logger } from '../lib/logger';
import { prisma } from '../server';

export interface SandboxContainer {
  id: string;
  userId: string;
  status: 'provisioning' | 'ready' | 'running' | 'stopped' | 'failed';
  createdAt: Date;
  lastActivity: Date;
  resourceLimits: ResourceLimits;
  containerId?: string;
  port?: number;
  endpoint?: string;
}

export interface ResourceLimits {
  cpuLimit: string; // e.g., "0.25" for 0.25 CPU cores
  memoryLimit: string; // e.g., "256m" for 256MB
  executionTimeout: number; // seconds
  diskQuota: string; // e.g., "1g" for 1GB
  pidsLimit: number; // max processes
}

export interface SandboxProvisionRequest {
  userId: string;
  projectId: string;
  baseImage?: string;
  resourceLimits?: Partial<ResourceLimits>;
  useGVisor?: boolean;
}

export interface SandboxProvisionResponse {
  containerId: string;
  status: 'ready' | 'failed';
  endpoint?: string;
  port?: number;
  error?: string;
}

export class SandboxProvisioningService extends EventEmitter {
  private docker: Docker;
  /**
   * Phase 3.5: Sandbox state is persisted in Conversation model
   * No in-memory tracking - all data reads/writes go through Prisma
   */
  private readonly defaultResourceLimits: ResourceLimits = {
    cpuLimit: '0.25', // 0.25 CPU cores
    memoryLimit: '256m', // 256MB RAM
    executionTimeout: 300, // 5 minutes
    diskQuota: '1g', // 1GB disk
    pidsLimit: 100, // max 100 processes
  };

  private readonly baseImage = 'agentic-sandbox-base:latest';
  private readonly cleanupInterval = 60000; // 1 minute
  private readonly maxIdleTime = 1800000; // 30 minutes

  constructor() {
    super();
    this.docker = new Docker({
      socketPath: '/var/run/docker.sock',
    });

    // Start cleanup timer
    setInterval(() => this.cleanupIdleContainers(), this.cleanupInterval);

    // Recover existing sandboxes from database on startup
    this.recoverExistingSandboxes().catch(error => {
      logger.error('Failed to recover existing sandboxes on startup', {
        error,
      });
    });

    logger.info('SandboxProvisioningService initialized');
  }

  /**
   * Provision a new sandbox container for a user
   * Stores all state in Conversation model via Prisma (no in-memory storage)
   */
  async provisionSandbox(
    request: SandboxProvisionRequest
  ): Promise<SandboxProvisionResponse> {
    const conversationId = `${request.userId}-${request.projectId}-${Date.now()}`;

    try {
      logger.info(`Provisioning sandbox for user ${request.userId}`, {
        conversationId,
        request,
      });

      // Find available port
      const port = await this.findAvailablePort();

      // Create temporary sandbox container record for config generation
      const tempSandbox: SandboxContainer = {
        id: conversationId,
        userId: request.userId,
        status: 'provisioning',
        createdAt: new Date(),
        lastActivity: new Date(),
        resourceLimits: {
          ...this.defaultResourceLimits,
          ...request.resourceLimits,
        },
      };

      // Create container configuration
      const containerConfig = this.createContainerConfig(
        tempSandbox,
        port,
        request.useGVisor
      );

      // Create and start Docker container
      const container = await this.docker.createContainer(containerConfig);
      await container.start();

      // Phase 3.5: Store sandbox state in Conversation via Prisma (persistent)
      const conversation = await prisma.conversation.create({
        data: {
          id: conversationId,
          userId: request.userId,
          landingPageId: request.projectId,
          sandboxId: container.id, // Docker container ID
          sandboxStatus: 'ready',
          sandboxPort: port,
          sandboxCreatedAt: new Date(),
          sandboxPublicUrl: `http://localhost:${port}`,
          lastAccessedAt: new Date(),
        },
      });

      logger.info('Sandbox provisioned successfully', {
        conversationId,
        containerId: container.id,
        port,
        sandboxId: container.id,
      });

      this.emit('sandbox-provisioned', {
        id: conversationId,
        userId: request.userId,
        status: 'ready',
        createdAt: conversation.startTime,
        lastActivity: conversation.lastAccessedAt || new Date(),
        resourceLimits: tempSandbox.resourceLimits,
        containerId: container.id,
        port,
        endpoint: `http://localhost:${port}`,
      });

      return {
        containerId: conversationId,
        status: 'ready',
        endpoint: `http://localhost:${port}`,
        port,
      };
    } catch (error) {
      logger.error('Failed to provision sandbox', {
        conversationId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Phase 3.5: Mark as failed in database
      try {
        await prisma.conversation.upsert({
          where: { id: conversationId },
          create: {
            id: conversationId,
            userId: request.userId,
            landingPageId: request.projectId,
            sandboxStatus: 'failed',
          },
          update: {
            sandboxStatus: 'failed',
          },
        });
      } catch (dbError) {
        logger.error('Failed to update sandbox status in database', {
          dbError,
        });
      }

      return {
        containerId: conversationId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get sandbox information from database
   * Phase 3.5: Queries Conversation model instead of in-memory storage
   */
  async getSandbox(
    conversationId: string
  ): Promise<SandboxContainer | undefined> {
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation || !conversation.sandboxId) {
        logger.info('Sandbox not found in database', {
          conversationId,
          found: false,
        });
        return undefined;
      }

      logger.info('Retrieved sandbox from database', {
        conversationId,
        found: true,
        sandboxId: conversation.sandboxId,
        sandboxStatus: conversation.sandboxStatus,
        sandboxPort: conversation.sandboxPort,
      });

      return {
        id: conversationId,
        userId: conversation.userId || 'unknown',
        status:
          (conversation.sandboxStatus as
            | 'provisioning'
            | 'ready'
            | 'running'
            | 'stopped'
            | 'failed') || 'failed',
        createdAt: conversation.sandboxCreatedAt || conversation.startTime,
        lastActivity: conversation.lastAccessedAt || new Date(),
        resourceLimits: this.defaultResourceLimits,
        containerId: conversation.sandboxId,
        port: conversation.sandboxPort || undefined,
        endpoint: conversation.sandboxPublicUrl || undefined,
      };
    } catch (error) {
      logger.error('Error retrieving sandbox from database', {
        conversationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  }

  /**
   * Update sandbox activity timestamp in database
   */
  async updateActivity(conversationId: string): Promise<void> {
    try {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastAccessedAt: new Date(),
        },
      });
    } catch (error) {
      logger.warn('Failed to update sandbox activity', {
        conversationId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Stop and remove a sandbox
   * Phase 3.5: Updates Conversation model to mark as stopped
   */
  async destroySandbox(conversationId: string): Promise<boolean> {
    try {
      // Get sandbox from database
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation || !conversation.sandboxId) {
        logger.warn('Sandbox not found for destruction', { conversationId });
        return false;
      }

      try {
        const container = this.docker.getContainer(conversation.sandboxId);

        // Stop container
        try {
          await container.stop({ t: 10 }); // 10 second timeout
        } catch (error) {
          // Container might already be stopped
          logger.warn('Container already stopped', {
            conversationId,
            containerId: conversation.sandboxId,
          });
        }

        // Remove container
        await container.remove({ force: true });
      } catch (error) {
        logger.warn('Failed to stop/remove Docker container', {
          conversationId,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Phase 3.5: Mark as stopped in database
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          sandboxStatus: 'stopped',
        },
      });

      logger.info('Sandbox destroyed', {
        conversationId,
        containerId: conversation.sandboxId,
      });

      this.emit('sandbox-destroyed', {
        id: conversationId,
        containerId: conversation.sandboxId,
      });

      return true;
    } catch (error) {
      logger.error('Failed to destroy sandbox', {
        conversationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * List all active sandboxes for a user from database
   */
  async getUserSandboxes(userId: string): Promise<SandboxContainer[]> {
    try {
      const conversations = await prisma.conversation.findMany({
        where: {
          userId,
          sandboxStatus: {
            in: ['provisioning', 'ready', 'running'],
          },
        },
      });

      return conversations
        .filter(conv => conv.sandboxId)
        .map(conv => ({
          id: conv.id,
          userId: conv.userId || 'unknown',
          status:
            (conv.sandboxStatus as
              | 'provisioning'
              | 'ready'
              | 'running'
              | 'stopped'
              | 'failed') || 'failed',
          createdAt: conv.sandboxCreatedAt || conv.startTime,
          lastActivity: conv.lastAccessedAt || new Date(),
          resourceLimits: this.defaultResourceLimits,
          containerId: conv.sandboxId!,
          port: conv.sandboxPort || undefined,
          endpoint: conv.sandboxPublicUrl || undefined,
        }));
    } catch (error) {
      logger.error('Failed to get user sandboxes', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get container statistics from Docker
   */
  async getContainerStats(conversationId: string): Promise<any> {
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation || !conversation.sandboxId) {
        throw new Error('Sandbox not found');
      }

      const container = this.docker.getContainer(conversation.sandboxId);
      const stats = await container.stats({ stream: false });
      return stats;
    } catch (error) {
      logger.error('Failed to get container stats', {
        conversationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Create Docker container configuration
   */
  private createContainerConfig(
    sandbox: SandboxContainer,
    port: number,
    useGVisor = false
  ) {
    const config: any = {
      Image: this.baseImage,
      name: `agentic-sandbox-${sandbox.id}`,
      User: '1000:1000', // Non-root user
      WorkingDir: '/workspace',
      Env: [
        `USER_ID=${sandbox.userId}`,
        `SANDBOX_ID=${sandbox.id}`,
        'NODE_ENV=development',
        'HOST=0.0.0.0',
        'PORT=5173',
      ],
      ExposedPorts: {
        '5173/tcp': {},
      },
      HostConfig: {
        // Resource limits
        Memory: this.parseMemoryLimit(sandbox.resourceLimits.memoryLimit),
        CpuQuota: Math.floor(
          parseFloat(sandbox.resourceLimits.cpuLimit) * 100000
        ), // CPU quota in microseconds
        CpuPeriod: 100000, // 100ms period
        PidsLimit: sandbox.resourceLimits.pidsLimit,

        // Port binding
        PortBindings: {
          '5173/tcp': [{ HostPort: port.toString() }],
        },

        // Network isolation
        NetworkMode: 'bridge',

        // Security options
        SecurityOpt: ['no-new-privileges:true'],
        ReadonlyRootfs: false, // Allow writes to workspace

        // Auto-remove on exit
        AutoRemove: false, // We manage cleanup manually

        // Tmpfs mounts for security
        Tmpfs: {
          '/tmp': 'rw,noexec,nosuid,size=100m',
        },
      },
      Labels: {
        'agentic.sandbox': 'true',
        'agentic.user': sandbox.userId,
        'agentic.sandbox-id': sandbox.id,
        'agentic.created': sandbox.createdAt.toISOString(),
      },
    };

    // Add gVisor runtime if requested
    if (useGVisor) {
      config.HostConfig.Runtime = 'runsc';
    }

    return config;
  }

  /**
   * Parse memory limit string to bytes
   */
  private parseMemoryLimit(limit: string): number {
    const match = limit.match(/^(\d+)([kmg]?)$/i);
    if (!match) {
      throw new Error(`Invalid memory limit format: ${limit}`);
    }

    const value = parseInt(match[1]);
    const unit = match[2]?.toLowerCase() || '';

    switch (unit) {
      case 'k':
        return value * 1024;
      case 'm':
        return value * 1024 * 1024;
      case 'g':
        return value * 1024 * 1024 * 1024;
      default:
        return value;
    }
  }

  /**
   * Find an available port for the container
   */
  private async findAvailablePort(): Promise<number> {
    const net = await import('net');

    return new Promise((resolve, reject) => {
      const server = net.createServer();
      server.listen(0, () => {
        const port = (server.address() as any)?.port;
        server.close(() => {
          if (port) {
            resolve(port);
          } else {
            reject(new Error('Could not find available port'));
          }
        });
      });
    });
  }

  /**
   * Clean up idle containers from database
   * Phase 3.5: Queries database instead of in-memory Map
   */
  private async cleanupIdleContainers(): Promise<void> {
    try {
      const now = new Date();
      const idleThreshold = new Date(now.getTime() - this.maxIdleTime);

      // Find idle sandboxes from database
      const idleSandboxes = await prisma.conversation.findMany({
        where: {
          sandboxStatus: {
            in: ['ready', 'running'],
          },
          lastAccessedAt: {
            lt: idleThreshold,
          },
        },
        select: {
          id: true,
          sandboxId: true,
        },
      });

      if (idleSandboxes.length === 0) {
        return;
      }

      logger.info('Found idle sandboxes for cleanup', {
        count: idleSandboxes.length,
      });

      // Destroy idle containers
      for (const sandbox of idleSandboxes) {
        logger.info('Cleaning up idle sandbox', {
          conversationId: sandbox.id,
          sandboxId: sandbox.sandboxId,
        });
        await this.destroySandbox(sandbox.id);
      }

      logger.info(`Cleaned up ${idleSandboxes.length} idle containers`);
    } catch (error) {
      logger.error('Error during sandbox cleanup', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Recover existing sandboxes from database on server startup
   * Phase 3.5: Reconnects to existing Docker containers tracked in Conversation model
   */
  private async recoverExistingSandboxes(): Promise<void> {
    try {
      logger.info('Recovering existing sandboxes from database');

      // Find all active sandboxes in database
      const activeSandboxes = await prisma.conversation.findMany({
        where: {
          sandboxStatus: {
            in: ['provisioning', 'ready', 'running'],
          },
          sandboxId: {
            not: null,
          },
        },
        select: {
          id: true,
          userId: true,
          sandboxId: true,
          sandboxStatus: true,
          sandboxPort: true,
        },
      });

      logger.info('Found sandboxes in database', {
        count: activeSandboxes.length,
      });

      // Try to reconnect to each container
      let recoveredCount = 0;
      let failedCount = 0;

      for (const sandbox of activeSandboxes) {
        try {
          const container = this.docker.getContainer(sandbox.sandboxId!);
          const containerInfo = await container.inspect();

          if (containerInfo.State.Running) {
            logger.info('Successfully recovered sandbox', {
              conversationId: sandbox.id,
              containerId: sandbox.sandboxId,
              port: sandbox.sandboxPort,
            });
            recoveredCount++;

            // Update lastAccessedAt to current time
            await prisma.conversation.update({
              where: { id: sandbox.id },
              data: { lastAccessedAt: new Date() },
            });
          } else {
            logger.warn('Container not running, marking as stopped', {
              conversationId: sandbox.id,
              containerId: sandbox.sandboxId,
            });
            failedCount++;
            await prisma.conversation.update({
              where: { id: sandbox.id },
              data: { sandboxStatus: 'stopped' },
            });
          }
        } catch (error) {
          logger.warn('Failed to recover sandbox, marking as failed', {
            conversationId: sandbox.id,
            containerId: sandbox.sandboxId,
            error: error instanceof Error ? error.message : String(error),
          });
          failedCount++;

          await prisma.conversation.update({
            where: { id: sandbox.id },
            data: { sandboxStatus: 'failed' },
          });
        }
      }

      logger.info('Sandbox recovery complete', {
        total: activeSandboxes.length,
        recovered: recoveredCount,
        failed: failedCount,
      });
    } catch (error) {
      logger.error('Error recovering sandboxes', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Health check - verify Docker connection and base image
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: any;
  }> {
    try {
      // Check Docker connection
      await this.docker.ping();

      // Check if base image exists
      const images = await this.docker.listImages({
        filters: { reference: [this.baseImage] },
      });

      const baseImageExists = images.length > 0;

      // Get active sandbox count from database
      const activeSandboxCount = await prisma.conversation.count({
        where: {
          sandboxStatus: {
            in: ['ready', 'running'],
          },
        },
      });

      return {
        status: baseImageExists ? 'healthy' : 'unhealthy',
        details: {
          dockerConnected: true,
          baseImageExists,
          activeSandboxCount,
          baseImage: this.baseImage,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          dockerConnected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}
