/**
 * Sandbox Health Check Service
 *
 * Periodically verifies that all READY sandboxes still exist and are healthy.
 * If a sandbox container is no longer running, marks it as FAILED to allow recovery.
 *
 * Run interval: Every 5 minutes (configurable)
 */

import { logger } from '../lib/logger.js';
import { prisma } from '../server.js';
import { sandboxManager } from './sandboxManager.js';

export class SandboxHealthCheckService {
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  // Run health check every 5 minutes
  private readonly HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000;

  /**
   * Start the background health check job
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Sandbox health check service already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting sandbox health check service', {
      intervalMinutes: this.HEALTH_CHECK_INTERVAL_MS / (60 * 1000),
    });

    // Run health check immediately on startup
    await this.performHealthCheck();

    // Set up periodic health checks
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL_MS);
  }

  /**
   * Stop the background health check job
   */
  async stop() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.isRunning = false;
    logger.info('Sandbox health check service stopped');
  }

  /**
   * Perform health check on all READY sandboxes
   */
  private async performHealthCheck() {
    try {
      logger.debug('Starting sandbox health check');

      // Get all READY sandboxes from projects
      const readySandboxes = await prisma.project.findMany({
        where: {
          sandboxId: {
            not: null, // Has a sandbox
          },
          sandboxStatus: 'READY', // Is currently ready
        },
        select: {
          id: true,
          sandboxId: true,
        },
      });

      if (readySandboxes.length === 0) {
        logger.debug('No READY sandboxes to health check');
        return;
      }

      logger.info('Checking health of sandboxes', {
        count: readySandboxes.length,
      });

      const healthy = [];
      const unhealthy = [];

      // Check each sandbox
      for (const sandbox of readySandboxes) {
        if (!sandbox.sandboxId) continue;

        try {
          // Query sandbox info via sandboxManager using project ID
          const sandboxInfo = await sandboxManager.getSandboxInfoByProjectId(
            sandbox.id
          );

          if (sandboxInfo) {
            healthy.push(sandbox.sandboxId);
            logger.debug('Sandbox health check passed', {
              sandboxId: sandbox.sandboxId,
              projectId: sandbox.id,
            });
          } else {
            // Sandbox no longer exists
            unhealthy.push(sandbox.sandboxId);
            logger.warn('Sandbox health check failed - container not found', {
              sandboxId: sandbox.sandboxId,
              projectId: sandbox.id,
            });
          }
        } catch (error) {
          unhealthy.push(sandbox.sandboxId);
          logger.warn('Sandbox health check error', {
            sandboxId: sandbox.sandboxId,
            projectId: sandbox.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Mark unhealthy sandboxes as FAILED
      if (unhealthy.length > 0) {
        try {
          const result = await prisma.project.updateMany({
            where: {
              sandboxId: {
                in: unhealthy,
              },
              sandboxStatus: 'READY', // Only update READY ones
            },
            data: {
              sandboxStatus: 'FAILED',
            },
          });

          logger.info('Marked unhealthy sandboxes as FAILED', {
            count: result.count,
            sandboxIds: unhealthy,
          });
        } catch (error) {
          logger.error('Failed to mark sandboxes as FAILED', {
            error: error instanceof Error ? error.message : String(error),
            sandboxIds: unhealthy,
          });
        }
      }

      logger.info('Sandbox health check completed', {
        total: readySandboxes.length,
        healthy: healthy.length,
        unhealthy: unhealthy.length,
      });
    } catch (error) {
      logger.error('Error during sandbox health check', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - continue running even if health check fails
    }
  }
}

// Export singleton instance
export const sandboxHealthCheckService = new SandboxHealthCheckService();
