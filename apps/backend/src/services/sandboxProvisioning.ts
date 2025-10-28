import Docker from 'dockerode';
import { EventEmitter } from 'events';
import { logger } from '../lib/logger';

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
  private containers: Map<string, SandboxContainer> = new Map();
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

    logger.info('SandboxProvisioningService initialized');
  }

  /**
   * Provision a new sandbox container for a user
   */
  async provisionSandbox(
    request: SandboxProvisionRequest
  ): Promise<SandboxProvisionResponse> {
    const sandboxId = `${request.userId}-${request.projectId}-${Date.now()}`;

    try {
      logger.info(`Provisioning sandbox for user ${request.userId}`, {
        sandboxId,
        request,
      });

      // Create sandbox container record
      const sandbox: SandboxContainer = {
        id: sandboxId,
        userId: request.userId,
        status: 'provisioning',
        createdAt: new Date(),
        lastActivity: new Date(),
        resourceLimits: {
          ...this.defaultResourceLimits,
          ...request.resourceLimits,
        },
      };

      this.containers.set(sandboxId, sandbox);

      // Find available port
      const port = await this.findAvailablePort();

      // Create container configuration
      const containerConfig = this.createContainerConfig(
        sandbox,
        port,
        request.useGVisor
      );

      // Create and start container
      const container = await this.docker.createContainer(containerConfig);
      await container.start();

      // Update sandbox record
      sandbox.containerId = container.id;
      sandbox.port = port;
      sandbox.endpoint = `http://localhost:${port}`;
      sandbox.status = 'ready';

      logger.info('Sandbox provisioned successfully', {
        sandboxId,
        containerId: container.id,
        port,
      });

      this.emit('sandbox-provisioned', sandbox);

      return {
        containerId: sandboxId,
        status: 'ready',
        endpoint: sandbox.endpoint,
        port,
      };
    } catch (error) {
      logger.error('Failed to provision sandbox', { sandboxId, error });

      // Update status to failed
      const sandbox = this.containers.get(sandboxId);
      if (sandbox) {
        sandbox.status = 'failed';
      }

      return {
        containerId: sandboxId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get sandbox information
   */
  getSandbox(sandboxId: string): SandboxContainer | undefined {
    return this.containers.get(sandboxId);
  }

  /**
   * Update sandbox activity timestamp
   */
  updateActivity(sandboxId: string): void {
    const sandbox = this.containers.get(sandboxId);
    if (sandbox) {
      sandbox.lastActivity = new Date();
    }
  }

  /**
   * Stop and remove a sandbox
   */
  async destroySandbox(sandboxId: string): Promise<boolean> {
    const sandbox = this.containers.get(sandboxId);
    if (!sandbox || !sandbox.containerId) {
      return false;
    }

    try {
      const container = this.docker.getContainer(sandbox.containerId);

      // Stop container
      try {
        await container.stop({ t: 10 }); // 10 second timeout
      } catch (error) {
        // Container might already be stopped
        logger.warn('Container already stopped', {
          sandboxId,
          containerId: sandbox.containerId,
        });
      }

      // Remove container
      await container.remove({ force: true });

      // Remove from tracking
      this.containers.delete(sandboxId);

      logger.info('Sandbox destroyed', {
        sandboxId,
        containerId: sandbox.containerId,
      });
      this.emit('sandbox-destroyed', sandbox);

      return true;
    } catch (error) {
      logger.error('Failed to destroy sandbox', { sandboxId, error });
      return false;
    }
  }

  /**
   * List all active sandboxes for a user
   */
  getUserSandboxes(userId: string): SandboxContainer[] {
    return Array.from(this.containers.values()).filter(
      sandbox => sandbox.userId === userId && sandbox.status !== 'failed'
    );
  }

  /**
   * Get container statistics
   */
  async getContainerStats(sandboxId: string): Promise<any> {
    const sandbox = this.containers.get(sandboxId);
    if (!sandbox || !sandbox.containerId) {
      throw new Error('Sandbox not found');
    }

    const container = this.docker.getContainer(sandbox.containerId);
    const stats = await container.stats({ stream: false });
    return stats;
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
   * Clean up idle containers
   */
  private async cleanupIdleContainers(): Promise<void> {
    const now = new Date();
    const idleContainers: string[] = [];

    for (const [sandboxId, sandbox] of this.containers.entries()) {
      const idleTime = now.getTime() - sandbox.lastActivity.getTime();

      if (idleTime > this.maxIdleTime) {
        idleContainers.push(sandboxId);
      }
    }

    for (const sandboxId of idleContainers) {
      logger.info('Cleaning up idle sandbox', { sandboxId });
      await this.destroySandbox(sandboxId);
    }

    if (idleContainers.length > 0) {
      logger.info(`Cleaned up ${idleContainers.length} idle containers`);
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

      return {
        status: baseImageExists ? 'healthy' : 'unhealthy',
        details: {
          dockerConnected: true,
          baseImageExists,
          activeContainers: this.containers.size,
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
