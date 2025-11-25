import Docker from 'dockerode';
import { EventEmitter } from 'events';
import { logger } from '../lib/logger';
import { prisma } from '../server';

export interface SandboxContainer {
  id: string;
  userId: string;
  status: 'PENDING' | 'READY' | 'FAILED';
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
  conversationId?: string;
  baseImage?: string;
  resourceLimits?: Partial<ResourceLimits>;
  useGVisor?: boolean;
}

export interface SandboxProvisionResponse {
  containerId: string;
  status: 'READY' | 'FAILED';
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
    cpuLimit: '2.0', // 2.0 CPU cores (increased from 0.25 for Vite builds)
    memoryLimit: '2048m', // 2GB RAM (increased from 256m for Vite builds)
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

    // Start reconciliation timer - verify DB state matches Docker reality
    setInterval(() => this.reconcileContainerStates(), this.cleanupInterval);

    // Recover existing sandboxes from database on startup
    this.recoverExistingSandboxes().catch(error => {
      logger.error('Failed to recover existing sandboxes on startup', {
        error,
      });
    });

    logger.info('SandboxProvisioningService initialized');
  }

  /**
   * Check if a container with the given name already exists
   * If it does, either reuse it (if healthy) or remove it
   */
  private async handleExistingContainer(
    containerName: string,
    conversationId: string
  ): Promise<{
    id?: string;
    port?: number;
    action: 'reused' | 'removed' | 'none';
  }> {
    try {
      // List all containers (including stopped ones) and find by name
      const containers = await this.docker.listContainers({
        all: true,
        filters: {
          name: [containerName],
        },
      });

      if (containers.length === 0) {
        // No container with this name exists
        return { action: 'none' };
      }

      // Get the first matching container
      const containerInfo = containers[0];
      const container = this.docker.getContainer(containerInfo.Id);

      // Now inspect the container to get full details
      const inspectInfo = await container.inspect();

      logger.warn('Found existing container with same name', {
        conversationId,
        containerName,
        containerId: inspectInfo.Id,
        state: inspectInfo.State.Status,
      });

      // If container is running and healthy, try to reuse it
      if (inspectInfo.State.Running) {
        // Check if container is healthy (if health check is configured)
        const isHealthy =
          !inspectInfo.State.Health ||
          inspectInfo.State.Health.Status === 'healthy';

        if (isHealthy) {
          // Extract the actual port binding from Docker
          const port = this.extractPortFromContainer(inspectInfo);

          logger.info('Reusing existing running and healthy container', {
            conversationId,
            containerId: inspectInfo.Id,
            healthStatus: inspectInfo.State.Health?.Status,
            port,
          });
          return {
            id: inspectInfo.Id,
            port,
            action: 'reused',
          };
        } else {
          logger.warn('Container running but not healthy, removing', {
            conversationId,
            containerId: inspectInfo.Id,
            healthStatus: inspectInfo.State.Health?.Status,
          });
        }
      }

      // If container is stopped, try to remove it
      try {
        await container.remove({ force: true });
        logger.info('Removed stale container', {
          conversationId,
          containerId: inspectInfo.Id,
        });
        return {
          action: 'removed',
        };
      } catch (removeError) {
        logger.error('Failed to remove stale container', {
          conversationId,
          containerId: inspectInfo.Id,
          error:
            removeError instanceof Error
              ? removeError.message
              : String(removeError),
        });
        // If we can't remove it, consider it as existing but unable to clean
        return {
          id: inspectInfo.Id,
          action: 'reused', // Treat as reused since we can't remove it
        };
      }
    } catch (error) {
      // Container doesn't exist, which is normal
      return {
        action: 'none',
      };
    }
  }

  /**
   * Provision a new sandbox container for a user
   * Stores all state in Conversation model via Prisma (no in-memory storage)
   */
  async provisionSandbox(
    request: SandboxProvisionRequest
  ): Promise<SandboxProvisionResponse> {
    // Use provided conversationId or generate a unique ID
    const conversationId =
      request.conversationId ||
      `${request.userId}-${request.projectId}-${Date.now()}`;

    try {
      logger.info(`Provisioning sandbox for user ${request.userId}`, {
        conversationId,
        request,
      });

      // Find available port
      const port = await this.findAvailablePort();

      // Create temporary sandbox container record for config generation
      // Use projectId as the sandbox ID to ensure all conversations in the same project share the same container
      const tempSandbox: SandboxContainer = {
        id: request.projectId,
        userId: request.userId,
        status: 'PENDING',
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

      // Check if a container with this name already exists
      // Use projectId so all conversations in the same project share the same container
      const containerName = `agentic-sandbox-${request.projectId}`;
      const existingResult = await this.handleExistingContainer(
        containerName,
        conversationId
      );

      let container;
      let actualPort = port; // Default to newly found port

      if (existingResult.action === 'reused' && existingResult.id) {
        // Reuse the existing running container
        // Use the actual port from the container if available
        if (existingResult.port) {
          actualPort = existingResult.port;
          logger.info('Using existing container with actual port from Docker', {
            conversationId,
            containerId: existingResult.id,
            actualPort,
            requestedPort: port,
          });
        } else {
          logger.warn(
            'Could not extract port from existing container, using requested port',
            {
              conversationId,
              containerId: existingResult.id,
              fallbackPort: port,
            }
          );
        }
        container = this.docker.getContainer(existingResult.id);
      } else {
        // Create new container (either first time or after removing stale one)
        logger.info('Creating Docker container', {
          conversationId,
          imageName: this.baseImage,
          containerName,
          port,
        });

        container = await this.docker.createContainer(containerConfig);

        logger.info('Docker container created, starting container', {
          conversationId,
          containerId: container.id,
        });

        await container.start();

        logger.info('Docker container started successfully', {
          conversationId,
          containerId: container.id,
          port,
        });

        // ✅ FIX RACE CONDITION: Set PENDING status immediately in database
        // This prevents concurrent provision-sandbox calls from creating duplicate containers
        await prisma.project.update({
          where: { id: request.projectId },
          data: {
            sandboxId: container.id,
            sandboxStatus: 'PENDING',
            sandboxPort: port,
            sandboxCreatedAt: new Date(),
            sandboxPublicUrl: `http://localhost:${port}`,
          },
        });

        logger.info('Set sandbox status to PENDING in database', {
          conversationId,
          projectId: request.projectId,
          containerId: container.id,
          port,
        });

        // Wait for container to be healthy before proceeding
        await this.waitForContainerHealth(container, conversationId);

        logger.info('Docker container health check passed', {
          conversationId,
          containerId: container.id,
        });

        // Initialize git in the container workspace
        await this.initializeGitInContainer(container.id, conversationId);

        // Restore code from GitHub - check project repo first, then landing page
        try {
          const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            select: {
              projectId: true,
              project: {
                select: {
                  githubRepoUrl: true,
                },
              },
            },
          });

          if (conversation) {
            const { getGitHubSyncService } = await import('./githubSync.js');
            const githubSync = getGitHubSyncService();
            const workspacePath = '/workspace';

            // Priority 1: Check if project has a GitHub repo (project-level sync)
            if (conversation.project.githubRepoUrl) {
              try {
                await githubSync.restoreProjectToWorkspace(
                  conversation.projectId,
                  container.id,
                  conversationId
                );

                logger.info('Restored project code from GitHub to container', {
                  conversationId,
                  projectId: conversation.projectId,
                  containerId: container.id,
                });

                // Install dependencies if package.json exists
                try {
                  await this.installDependenciesInContainer(
                    container.id,
                    conversationId
                  );
                } catch (installError) {
                  logger.warn(
                    'Failed to install dependencies after project restore',
                    {
                      conversationId,
                      error:
                        installError instanceof Error
                          ? installError.message
                          : String(installError),
                    }
                  );
                  // Continue - container is still usable even if install failed
                }
              } catch (restoreError) {
                logger.warn('Failed to restore project code from GitHub', {
                  conversationId,
                  projectId: conversation.projectId,
                  error:
                    restoreError instanceof Error
                      ? restoreError.message
                      : String(restoreError),
                });
                // Continue - container is still usable even if restore failed
              }
            } else {
              // Priority 2: Fall back to landing page restore (legacy)
              const landingPage = await prisma.landingPage.findFirst({
                where: { projectId: conversation.projectId },
                select: { id: true, githubRepoUrl: true },
              });

              if (landingPage && landingPage.githubRepoUrl) {
                try {
                  await githubSync.restoreToWorkspace(
                    landingPage.id,
                    workspacePath
                  );

                  logger.info(
                    'Restored landing page code from GitHub to container',
                    {
                      conversationId,
                      landingPageId: landingPage.id,
                      workspacePath,
                    }
                  );

                  // Install dependencies if package.json exists
                  try {
                    await this.installDependenciesInContainer(
                      container.id,
                      conversationId
                    );
                  } catch (installError) {
                    logger.warn(
                      'Failed to install dependencies after landing page restore',
                      {
                        conversationId,
                        error:
                          installError instanceof Error
                            ? installError.message
                            : String(installError),
                      }
                    );
                    // Continue - container is still usable even if install failed
                  }
                } catch (restoreError) {
                  logger.warn(
                    'Failed to restore landing page code from GitHub',
                    {
                      conversationId,
                      error:
                        restoreError instanceof Error
                          ? restoreError.message
                          : String(restoreError),
                    }
                  );
                  // Continue - container is still usable even if restore failed
                }
              }
            }
          }
        } catch (error) {
          logger.debug('Could not restore GitHub code for container', {
            conversationId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Phase 3.5: Store sandbox state in Project via Prisma (persistent)
      await prisma.project.update({
        where: { id: request.projectId },
        data: {
          sandboxId: container.id, // Docker container ID
          sandboxStatus: 'READY',
          sandboxPort: actualPort, // Use actual port from container
          sandboxCreatedAt: new Date(),
          sandboxPublicUrl: `http://localhost:${actualPort}`, // Use actual port
        },
      });

      // Get conversation for emitting event
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      logger.info('Sandbox provisioned successfully', {
        conversationId,
        containerId: container.id,
        actualPort,
        sandboxId: container.id,
      });

      this.emit('sandbox-provisioned', {
        id: conversationId,
        userId: request.userId,
        status: 'READY',
        createdAt: conversation?.startTime || new Date(),
        lastActivity: conversation?.lastAccessedAt || new Date(),
        resourceLimits: tempSandbox.resourceLimits,
        containerId: container.id,
        port: actualPort,
        endpoint: `http://localhost:${actualPort}`,
      });

      return {
        containerId: container.id,
        status: 'READY',
        endpoint: `http://localhost:${actualPort}`,
        port: actualPort,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error('Failed to provision sandbox', {
        conversationId,
        error: errorMessage,
        stack: errorStack,
        fullError: JSON.stringify(error, null, 2),
      });

      // Phase 3.5: Mark as failed in database
      try {
        await prisma.project.update({
          where: { id: request.projectId },
          data: {
            sandboxStatus: 'FAILED',
          },
        });
      } catch (dbError) {
        logger.error('Failed to update sandbox status in database', {
          dbError,
        });
      }

      return {
        containerId: conversationId,
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get sandbox information from database by projectId
   * Used by health checks and other services that work at the project level
   */
  async getSandboxByProjectId(
    projectId: string
  ): Promise<SandboxContainer | undefined> {
    try {
      // Get sandbox info from project
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          userId: true,
          sandboxId: true,
          sandboxStatus: true,
          sandboxPort: true,
          sandboxPublicUrl: true,
          sandboxCreatedAt: true,
          conversations: {
            orderBy: { lastAccessedAt: 'desc' },
            take: 1,
            select: {
              lastAccessedAt: true,
            },
          },
        },
      });

      if (!project || !project.sandboxId) {
        logger.info('Sandbox not found for project', {
          projectId,
          found: false,
        });
        return undefined;
      }

      logger.info('Retrieved sandbox from database by projectId', {
        projectId,
        found: true,
        sandboxId: project.sandboxId,
        sandboxStatus: project.sandboxStatus,
        sandboxPort: project.sandboxPort,
      });

      // Map Prisma enum to SandboxContainer status type
      let statusMap: 'PENDING' | 'READY' | 'FAILED' = 'FAILED';
      if (project.sandboxStatus === 'PENDING') {
        statusMap = 'PENDING';
      } else if (project.sandboxStatus === 'READY') {
        statusMap = 'READY';
      } else if (project.sandboxStatus === 'FAILED' || !project.sandboxStatus) {
        statusMap = 'FAILED';
      }

      return {
        id: projectId,
        userId: project.userId || 'unknown',
        status: statusMap,
        createdAt: project.sandboxCreatedAt || new Date(),
        lastActivity: project.conversations[0]?.lastAccessedAt || new Date(),
        resourceLimits: this.defaultResourceLimits,
        containerId: project.sandboxId,
        port: project.sandboxPort || undefined,
        endpoint: project.sandboxPublicUrl || undefined,
      };
    } catch (error) {
      logger.error('Error retrieving sandbox from database by projectId', {
        projectId,
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  }

  /**
   * Get sandbox information from database by conversationId
   * Phase 3.5: Queries Conversation model instead of in-memory storage
   */
  async getSandbox(
    conversationId: string
  ): Promise<SandboxContainer | undefined> {
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: {
          projectId: true,
          userId: true,
          startTime: true,
          lastAccessedAt: true,
        },
      });

      if (!conversation) {
        logger.info('Conversation not found in database', {
          conversationId,
          found: false,
        });
        return undefined;
      }

      // Get sandbox info from project
      const project = await prisma.project.findUnique({
        where: { id: conversation.projectId },
        select: {
          sandboxId: true,
          sandboxStatus: true,
          sandboxPort: true,
          sandboxPublicUrl: true,
          sandboxCreatedAt: true,
        },
      });

      if (!project || !project.sandboxId) {
        logger.info('Sandbox not found in project', {
          conversationId,
          projectId: conversation.projectId,
          found: false,
        });
        return undefined;
      }

      logger.info('Retrieved sandbox from database', {
        conversationId,
        projectId: conversation.projectId,
        found: true,
        sandboxId: project.sandboxId,
        sandboxStatus: project.sandboxStatus,
        sandboxPort: project.sandboxPort,
      });

      // Map Prisma enum to SandboxContainer status type
      let statusMap: 'PENDING' | 'READY' | 'FAILED' = 'FAILED';
      if (project.sandboxStatus === 'PENDING') {
        statusMap = 'PENDING';
      } else if (project.sandboxStatus === 'READY') {
        statusMap = 'READY';
      } else if (project.sandboxStatus === 'FAILED' || !project.sandboxStatus) {
        statusMap = 'FAILED';
      }

      return {
        id: conversationId,
        userId: conversation.userId || 'unknown',
        status: statusMap,
        createdAt: project.sandboxCreatedAt || conversation.startTime,
        lastActivity: conversation.lastAccessedAt || new Date(),
        resourceLimits: this.defaultResourceLimits,
        containerId: project.sandboxId,
        port: project.sandboxPort || undefined,
        endpoint: project.sandboxPublicUrl || undefined,
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
   * Handles shared sandboxes - only removes Docker container if no other conversations use it
   */
  async destroySandbox(conversationId: string): Promise<boolean> {
    try {
      // Get project from conversation
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: {
          id: true,
          projectId: true,
          project: {
            select: {
              sandboxId: true,
              sandboxStatus: true,
            },
          },
        },
      });

      if (!conversation || !conversation.project.sandboxId) {
        logger.warn('Sandbox not found for destruction', { conversationId });
        return false;
      }

      const { sandboxId } = conversation.project;
      const { projectId } = conversation;

      // Remove Docker container
      try {
        const container = this.docker.getContainer(sandboxId);

        // Stop container
        try {
          await container.stop({ t: 10 }); // 10 second timeout
        } catch (error) {
          // Container might already be stopped
          logger.warn('Container already stopped', {
            projectId,
            containerId: sandboxId,
          });
        }

        // Remove container
        await container.remove({ force: true });

        logger.info('Docker container removed', {
          projectId,
          containerId: sandboxId,
        });
      } catch (error) {
        logger.warn('Failed to stop/remove Docker container', {
          projectId,
          containerId: sandboxId,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Mark project's sandbox status as FAILED
      await prisma.project.update({
        where: { id: projectId },
        data: {
          sandboxStatus: 'FAILED',
        },
      });

      logger.info('Sandbox destroyed for project', {
        projectId,
        containerId: sandboxId,
      });

      this.emit('sandbox-destroyed', {
        id: projectId,
        containerId: sandboxId,
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
   * Get container logs using Docker API
   * Returns stdout/stderr from the container's main process (npm run dev)
   */
  async getContainerLogs(
    conversationId: string,
    options: {
      tail?: number;
      since?: number;
      timestamps?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    logs?: string;
    error?: string;
  }> {
    try {
      // Get project from conversation
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: {
          id: true,
          projectId: true,
          project: {
            select: {
              sandboxId: true,
              sandboxStatus: true,
            },
          },
        },
      });

      if (!conversation || !conversation.project.sandboxId) {
        logger.warn('Sandbox not found for getting logs', { conversationId });
        return {
          success: false,
          error: 'Sandbox not found or not running',
        };
      }

      const { sandboxId } = conversation.project;

      // Get container logs using Docker API
      const container = this.docker.getContainer(sandboxId);

      const logStream = await container.logs({
        stdout: true,
        stderr: true,
        tail: options.tail || 100,
        since: options.since,
        timestamps: options.timestamps || false,
      });

      // Convert buffer to string
      const logs = logStream.toString('utf-8');

      logger.info('Retrieved container logs', {
        conversationId,
        containerId: sandboxId,
        logLength: logs.length,
      });

      return {
        success: true,
        logs,
      };
    } catch (error) {
      logger.error('Failed to get container logs', {
        conversationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * List all active sandboxes for a user from database
   */
  async getUserSandboxes(userId: string): Promise<SandboxContainer[]> {
    try {
      const projects = await prisma.project.findMany({
        where: {
          userId,
          sandboxStatus: {
            in: ['PENDING', 'READY'],
          },
        },
        include: {
          conversations: {
            orderBy: { lastAccessedAt: 'desc' },
            take: 1,
          },
        },
      });

      return projects
        .filter(proj => proj.sandboxId)
        .map(proj => ({
          id: proj.id,
          userId: proj.userId || 'unknown',
          status:
            (proj.sandboxStatus as 'PENDING' | 'READY' | 'FAILED') || 'FAILED',
          createdAt: proj.sandboxCreatedAt || new Date(),
          lastActivity: proj.conversations[0]?.lastAccessedAt || new Date(),
          resourceLimits: this.defaultResourceLimits,
          containerId: proj.sandboxId!,
          port: proj.sandboxPort || undefined,
          endpoint: proj.sandboxPublicUrl || undefined,
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
        select: {
          projectId: true,
        },
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Get sandbox info from project
      const project = await prisma.project.findUnique({
        where: { id: conversation.projectId },
        select: {
          sandboxId: true,
        },
      });

      if (!project || !project.sandboxId) {
        throw new Error('Sandbox not found');
      }

      const container = this.docker.getContainer(project.sandboxId);
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
   * Wait for container to become healthy
   * Polls the container health status for up to 30 seconds with exponential backoff
   * Resolves when container health is 'healthy' or start-period expires
   */
  private async waitForContainerHealth(
    container: Docker.Container,
    conversationId: string,
    maxWaitTimeMs = 30000
  ): Promise<void> {
    const startTime = Date.now();
    const pollIntervalMs = 500; // Start with 500ms, increase with backoff

    while (Date.now() - startTime < maxWaitTimeMs) {
      try {
        const containerInfo = await container.inspect();

        // Check health status
        if (containerInfo.State.Health) {
          const { Status, FailingStreak } = containerInfo.State.Health;

          if (Status === 'healthy') {
            logger.info('Container health check passed', {
              conversationId,
              healthStatus: Status,
              failingStreak: FailingStreak,
            });
            return; // Success!
          }

          if (Status === 'starting') {
            logger.debug('Container still starting health checks', {
              conversationId,
              failingStreak: FailingStreak,
            });
          } else if (Status === 'unhealthy') {
            throw new Error(
              `Container became unhealthy: ${FailingStreak} consecutive failures`
            );
          }
        } else {
          // No health check configured - assume healthy if running
          if (containerInfo.State.Running) {
            logger.info('Container running (no health check configured)', {
              conversationId,
            });
            return;
          }
        }

        // Wait before next poll with exponential backoff (capped at 2 seconds)
        const waitTime = Math.min(pollIntervalMs, 2000);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('Container became unhealthy')
        ) {
          throw error;
        }

        logger.warn('Error checking container health', {
          conversationId,
          error: error instanceof Error ? error.message : String(error),
        });

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      }
    }

    throw new Error(
      `Container health check timeout after ${maxWaitTimeMs}ms - container did not become healthy`
    );
  }

  /**
   * Initialize git repository in container workspace
   * Configures git with InstaBuild AI identity and sets up credential helper
   */
  private async initializeGitInContainer(
    containerId: string,
    conversationId: string
  ): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);

      // Execute git initialization commands
      const commands = [
        'git init',
        'git branch -m main',
        'git config user.name "InstaBuild AI"',
        'git config user.email "ai@instabuild.dev"',
        'git config credential.helper instabuild',
      ];

      for (const command of commands) {
        const exec = await container.exec({
          Cmd: ['sh', '-c', `cd /workspace && ${command}`],
          AttachStdout: true,
          AttachStderr: true,
        });

        const stream = await exec.start({ Detach: false });

        // Wait for command to complete
        await new Promise<void>((resolve, reject) => {
          let stderr = '';

          stream.on('data', (chunk: Buffer) => {
            const text = chunk.toString();
            // Docker multiplexes stdout/stderr - strip control bytes
            if (text.length > 8) {
              const cleaned = text.slice(8);
              // Only capture stderr for logging
              if (chunk[0] === 2) stderr += cleaned;
            }
          });

          stream.on('end', () => {
            if (
              stderr &&
              !stderr.includes('Initialized empty Git repository')
            ) {
              logger.warn('Git initialization command produced stderr', {
                conversationId,
                command,
                stderr: stderr.trim(),
              });
            }
            resolve();
          });

          stream.on('error', reject);
        });
      }

      logger.info('Git initialized in container workspace', {
        conversationId,
        containerId,
      });
    } catch (error) {
      // Log warning but don't fail provisioning if git init fails
      logger.warn('Failed to initialize git in container', {
        conversationId,
        containerId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Install dependencies in container workspace
   * Checks for package.json and runs pnpm install if found
   * Non-blocking - container starts even if installation fails
   */
  private async installDependenciesInContainer(
    containerId: string,
    conversationId: string
  ): Promise<void> {
    const startTime = Date.now();
    try {
      const container = this.docker.getContainer(containerId);

      logger.debug('Starting dependency installation check', {
        conversationId,
        containerId,
      });

      // Check if package.json exists
      const checkExec = await container.exec({
        Cmd: ['sh', '-c', 'test -f /workspace/package.json && echo "exists"'],
        AttachStdout: true,
        AttachStderr: true,
      });

      const checkStream = await checkExec.start({ Detach: false });
      let hasPackageJson = false;

      await new Promise<void>(resolve => {
        checkStream.on('data', (chunk: Buffer) => {
          const text = chunk.toString();
          logger.debug('package.json check output', {
            conversationId,
            output: text,
          });
          if (text.includes('exists')) {
            hasPackageJson = true;
          }
        });
        checkStream.on('end', resolve);
        checkStream.on('error', resolve); // Resolve even on error
      });

      if (!hasPackageJson) {
        logger.debug(
          'No package.json found, skipping dependency installation',
          {
            conversationId,
          }
        );
        return;
      }

      logger.debug('package.json found, checking pnpm availability', {
        conversationId,
      });

      // Check if pnpm is available and get version
      const pnpmCheckExec = await container.exec({
        Cmd: ['sh', '-c', 'which pnpm && pnpm --version'],
        AttachStdout: true,
        AttachStderr: true,
      });

      const pnpmCheckStream = await pnpmCheckExec.start({ Detach: false });
      let pnpmCheckOutput = '';

      await new Promise<void>(resolve => {
        pnpmCheckStream.on('data', (chunk: Buffer) => {
          pnpmCheckOutput += chunk.toString();
        });
        pnpmCheckStream.on('end', resolve);
        pnpmCheckStream.on('error', resolve);
      });

      logger.debug('pnpm availability check', {
        conversationId,
        output: pnpmCheckOutput.trim(),
      });

      // Check workspace permissions
      const permCheckExec = await container.exec({
        Cmd: ['sh', '-c', 'ls -la /workspace && whoami'],
        AttachStdout: true,
        AttachStderr: true,
      });

      const permCheckStream = await permCheckExec.start({ Detach: false });
      let permCheckOutput = '';

      await new Promise<void>(resolve => {
        permCheckStream.on('data', (chunk: Buffer) => {
          permCheckOutput += chunk.toString();
        });
        permCheckStream.on('end', resolve);
        permCheckStream.on('error', resolve);
      });

      logger.debug('Workspace permissions check', {
        conversationId,
        output: permCheckOutput.trim().substring(0, 1000),
      });

      // Run pnpm install
      logger.info('Installing dependencies in container', {
        conversationId,
        containerId,
      });

      const installExec = await container.exec({
        Cmd: [
          'sh',
          '-c',
          'cd /workspace && CI=true pnpm install --prefer-offline 2>&1',
        ],
        AttachStdout: true,
        AttachStderr: true,
      });

      const installStream = await installExec.start({ Detach: false });

      await new Promise<void>((resolve, reject) => {
        let stdout = '';
        let stderr = '';
        let allOutput = '';

        installStream.on('data', (chunk: Buffer) => {
          const text = chunk.toString();
          allOutput += text;

          // Docker multiplexes stdout/stderr - strip control bytes
          if (text.length > 8) {
            const cleaned = text.slice(8);
            // Stream type: 1 = stdout, 2 = stderr
            if (chunk[0] === 1) {
              stdout += cleaned;
            } else if (chunk[0] === 2) {
              stderr += cleaned;
            }
          }

          // Log progress in real-time for debugging
          if (text.includes('Progress:') || text.includes('Packages:')) {
            logger.debug('pnpm install progress', {
              conversationId,
              progress: text.trim().substring(0, 200),
            });
          }
        });

        installStream.on('end', async () => {
          const duration = Date.now() - startTime;

          logger.debug('pnpm install stream ended', {
            conversationId,
            duration,
            stdoutLength: stdout.length,
            stderrLength: stderr.length,
            allOutputLength: allOutput.length,
          });

          // Check exit code
          const inspectResult = await installExec.inspect();
          const exitCode = inspectResult.ExitCode;

          logger.debug('pnpm install exit code', {
            conversationId,
            exitCode,
          });

          if (exitCode !== 0) {
            logger.error('pnpm install failed with non-zero exit code', {
              conversationId,
              exitCode,
              stdout: stdout.substring(0, 2000),
              stderr: stderr.substring(0, 2000),
              allOutput: allOutput.substring(0, 2000),
            });
            reject(
              new Error(
                `Dependency installation failed: Command failed: pnpm install --prefer-offline\nExit code: ${exitCode}\n\nOutput:\n${allOutput.substring(0, 1000)}`
              )
            );
            return;
          }

          // pnpm install produces stderr for progress, so only warn on actual errors
          if (
            stderr &&
            !stderr.includes('Progress:') &&
            !stderr.includes('Packages:')
          ) {
            logger.warn('Dependency installation produced warnings', {
              conversationId,
              stderr: stderr.trim().substring(0, 1000),
            });
          }

          logger.debug('Full pnpm install output', {
            conversationId,
            stdout: stdout.substring(0, 2000),
            stderr: stderr.substring(0, 2000),
          });

          resolve();
        });

        installStream.on('error', err => {
          logger.error('pnpm install stream error', {
            conversationId,
            error: err instanceof Error ? err.message : String(err),
          });
          reject(err);
        });
      });

      const duration = Date.now() - startTime;
      logger.info('Dependencies installed successfully', {
        conversationId,
        containerId,
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to install dependencies', {
        conversationId,
        containerId,
        duration,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Don't throw - installation failures shouldn't prevent container startup
    }
  }

  /**
   * Extract the actual port binding from a Docker container's inspect data
   * Returns the host port that the container's 5173/tcp port is bound to
   */
  private extractPortFromContainer(containerInfo: any): number | undefined {
    try {
      const portBindings = containerInfo.NetworkSettings?.Ports;
      if (!portBindings) {
        logger.warn('No port bindings found in container info');
        return undefined;
      }

      // Look for 5173/tcp port binding
      const binding = portBindings['5173/tcp'];
      if (!binding || binding.length === 0) {
        logger.warn('Port 5173/tcp not bound in container', {
          availablePorts: Object.keys(portBindings),
        });
        return undefined;
      }

      const hostPort = parseInt(binding[0].HostPort, 10);
      if (isNaN(hostPort)) {
        logger.warn('Invalid host port in binding', {
          binding: binding[0],
        });
        return undefined;
      }

      logger.debug('Extracted port from container', { hostPort });
      return hostPort;
    } catch (error) {
      logger.warn('Error extracting port from container', {
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
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

      // Find projects with idle sandboxes
      const idleProjects = await prisma.project.findMany({
        where: {
          sandboxStatus: {
            in: ['READY'],
          },
          sandboxId: { not: null },
          conversations: {
            every: {
              lastAccessedAt: {
                lt: idleThreshold,
              },
            },
          },
        },
        select: {
          id: true,
          sandboxId: true,
          conversations: {
            select: { id: true },
            take: 1,
          },
        },
      });

      if (idleProjects.length === 0) {
        return;
      }

      logger.info('Found idle sandboxes for cleanup', {
        count: idleProjects.length,
      });

      // Destroy idle containers
      for (const project of idleProjects) {
        logger.info('Cleaning up idle sandbox', {
          projectId: project.id,
          sandboxId: project.sandboxId,
        });
        // Use a conversation ID if available for destroySandbox
        const conversationId = project.conversations[0]?.id || project.id;
        await this.destroySandbox(conversationId);
      }

      logger.info(`Cleaned up ${idleProjects.length} idle containers`);
    } catch (error) {
      logger.error('Error during sandbox cleanup', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Reconcile container states between Docker and database
   * Runs every 60 seconds to catch any mismatches
   * - Detects containers with invalid status that don't match reality
   * - Fixes stale DB entries
   * - Handles orphaned containers
   */
  private async reconcileContainerStates(): Promise<void> {
    try {
      logger.info('Starting container state reconciliation');

      // Get all projects with sandboxes from database
      const dbSandboxes = await prisma.project.findMany({
        where: {
          sandboxId: { not: null },
        },
        select: {
          id: true,
          userId: true,
          sandboxId: true,
          sandboxStatus: true,
          sandboxPort: true,
        },
      });

      logger.info('Checking database sandboxes against Docker', {
        count: dbSandboxes.length,
      });

      let mismatchCount = 0;
      let fixedCount = 0;

      // Check each database entry against Docker reality
      for (const dbSandbox of dbSandboxes) {
        try {
          const container = this.docker.getContainer(dbSandbox.sandboxId!);
          const containerInfo = await container.inspect();
          const containerRunning = containerInfo.State.Running;

          // Check for state mismatch
          const shouldBeReady = containerRunning;
          const isMarkedReady = dbSandbox.sandboxStatus === 'READY';

          // Also check if container has health check and is unhealthy
          const isUnhealthy =
            containerInfo.State.Health &&
            containerInfo.State.Health.Status === 'unhealthy';

          if (isUnhealthy) {
            logger.warn('Mismatch detected: Container is unhealthy', {
              projectId: dbSandbox.id,
              containerId: dbSandbox.sandboxId,
              healthStatus: containerInfo.State.Health?.Status,
              failingStreak: containerInfo.State.Health?.FailingStreak,
            });
            mismatchCount++;

            // Mark as FAILED due to unhealthy status
            await prisma.project.update({
              where: { id: dbSandbox.id },
              data: { sandboxStatus: 'FAILED' },
            });
            fixedCount++;
            logger.info('Fixed container state', {
              projectId: dbSandbox.id,
              action: 'marked as FAILED',
              reason: 'container unhealthy',
            });
          } else if (shouldBeReady && !isMarkedReady) {
            // Container is running but DB says it's not READY
            logger.warn(
              'Mismatch detected: Container running but DB status is not READY',
              {
                projectId: dbSandbox.id,
                containerId: dbSandbox.sandboxId,
                dbStatus: dbSandbox.sandboxStatus,
                containerState: containerInfo.State.Status,
              }
            );
            mismatchCount++;

            // Fix the database
            await prisma.project.update({
              where: { id: dbSandbox.id },
              data: {
                sandboxStatus: 'READY',
              },
            });
            fixedCount++;
            logger.info('Fixed container state', {
              projectId: dbSandbox.id,
              action: 'marked as READY',
            });
          } else if (!shouldBeReady && isMarkedReady) {
            // Container is not running but DB says it's READY
            logger.warn(
              'Mismatch detected: Container not running but DB status is READY',
              {
                projectId: dbSandbox.id,
                containerId: dbSandbox.sandboxId,
                dbStatus: dbSandbox.sandboxStatus,
                containerState: containerInfo.State.Status,
              }
            );
            mismatchCount++;

            // Fix the database
            await prisma.project.update({
              where: { id: dbSandbox.id },
              data: { sandboxStatus: 'FAILED' },
            });
            fixedCount++;
            logger.info('Fixed container state', {
              projectId: dbSandbox.id,
              action: 'marked as FAILED',
              reason: `container state is ${containerInfo.State.Status}`,
            });
          }
        } catch (error) {
          // Container not found or error inspecting
          if (dbSandbox.sandboxStatus !== 'FAILED') {
            logger.warn(
              'Mismatch detected: Container not found but DB status is not FAILED',
              {
                projectId: dbSandbox.id,
                containerId: dbSandbox.sandboxId,
                dbStatus: dbSandbox.sandboxStatus,
                error: error instanceof Error ? error.message : String(error),
              }
            );
            mismatchCount++;

            // Fix the database
            await prisma.project.update({
              where: { id: dbSandbox.id },
              data: { sandboxStatus: 'FAILED' },
            });
            fixedCount++;
            logger.info('Fixed container state', {
              projectId: dbSandbox.id,
              action: 'marked as FAILED',
              reason: 'container not found',
            });
          }
        }
      }

      // Optionally: Find running containers not in database (orphaned)
      try {
        const runningContainers = await this.docker.listContainers({
          filters: {
            label: ['agentic.sandbox=true'], // Only our sandbox containers
          },
        });

        logger.info('Checking for orphaned containers', {
          count: runningContainers.length,
        });

        for (const dockerContainer of runningContainers) {
          // Try multiple matching strategies:
          // 1. Match by full or partial container ID in sandboxId field
          const containerId = dockerContainer.Id.slice(0, 12);
          let dbEntry = dbSandboxes.find(s =>
            s.sandboxId?.includes(containerId)
          );

          // 2. Match by project ID from container name (agentic-sandbox-{projectId})
          if (
            !dbEntry &&
            dockerContainer.Names &&
            dockerContainer.Names.length > 0
          ) {
            const containerName = dockerContainer.Names[0].replace(/^\//, ''); // Remove leading slash
            const projectIdMatch = containerName.match(/agentic-sandbox-(.+)/);
            if (projectIdMatch) {
              const projectId = projectIdMatch[1];
              dbEntry = dbSandboxes.find(s => s.id === projectId);
            }
          }

          if (!dbEntry) {
            logger.warn('Found orphaned container - cleaning up', {
              containerId: dockerContainer.Id,
              names: dockerContainer.Names,
            });

            // Clean up orphaned container
            try {
              const container = this.docker.getContainer(dockerContainer.Id);
              await container.stop({ t: 10 });
              await container.remove({ force: true });
              logger.info('Successfully removed orphaned container', {
                containerId: dockerContainer.Id,
                names: dockerContainer.Names,
              });
            } catch (cleanupError) {
              logger.error('Failed to remove orphaned container', {
                containerId: dockerContainer.Id,
                error:
                  cleanupError instanceof Error
                    ? cleanupError.message
                    : String(cleanupError),
              });
            }
          }
        }
      } catch (error) {
        // If label filtering fails, skip orphan check
        logger.debug('Could not check for orphaned containers', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      logger.info('Container state reconciliation complete', {
        totalChecked: dbSandboxes.length,
        mismatchesFound: mismatchCount,
        mismatchesFixed: fixedCount,
      });
    } catch (error) {
      logger.error('Error during container state reconciliation', {
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
      const activeSandboxes = await prisma.project.findMany({
        where: {
          sandboxStatus: {
            in: ['PENDING', 'READY'],
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

          // Check if container is running and healthy
          const isRunning = containerInfo.State.Running;
          const isHealthy =
            !containerInfo.State.Health ||
            containerInfo.State.Health.Status === 'healthy';

          if (isRunning && isHealthy) {
            logger.info('Successfully recovered sandbox', {
              projectId: sandbox.id,
              containerId: sandbox.sandboxId,
              port: sandbox.sandboxPort,
              healthStatus: containerInfo.State.Health?.Status,
            });
            recoveredCount++;

            // Validate and sync port with Docker reality
            const actualPort = this.extractPortFromContainer(containerInfo);
            if (actualPort && actualPort !== sandbox.sandboxPort) {
              logger.warn(
                'Port mismatch detected on startup - syncing database',
                {
                  projectId: sandbox.id,
                  databasePort: sandbox.sandboxPort,
                  actualPort,
                }
              );

              // Update database with actual port
              await prisma.project.update({
                where: { id: sandbox.id },
                data: {
                  sandboxPort: actualPort,
                  sandboxPublicUrl: `http://localhost:${actualPort}`,
                  sandboxStatus: 'READY',
                },
              });
            } else {
              // Port matches or couldn't extract - just ensure status is READY
              await prisma.project.update({
                where: { id: sandbox.id },
                data: {
                  sandboxStatus: 'READY',
                },
              });
            }
          } else {
            logger.warn('Container not healthy, marking as failed', {
              projectId: sandbox.id,
              containerId: sandbox.sandboxId,
              state: containerInfo.State.Status,
              healthStatus: containerInfo.State.Health?.Status,
            });
            failedCount++;
            await prisma.project.update({
              where: { id: sandbox.id },
              data: { sandboxStatus: 'FAILED' },
            });
          }
        } catch (error) {
          logger.warn('Failed to recover sandbox, marking as failed', {
            projectId: sandbox.id,
            containerId: sandbox.sandboxId,
            error: error instanceof Error ? error.message : String(error),
          });
          failedCount++;

          await prisma.project.update({
            where: { id: sandbox.id },
            data: { sandboxStatus: 'FAILED' },
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
      const activeSandboxCount = await prisma.project.count({
        where: {
          sandboxStatus: {
            in: ['READY'],
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
