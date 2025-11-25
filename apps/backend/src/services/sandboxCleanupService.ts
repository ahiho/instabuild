/**
 * Sandbox Cleanup Service
 *
 * Periodically removes idle sandboxes that have been inactive for 4 hours.
 * Prevents resource leaks from forgotten conversations.
 */

import { logger } from '../lib/logger.js';
import { prisma } from '../server.js';
import { sandboxManager } from './sandboxManager.js';

export class SandboxCleanupService {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  // 4 hours in milliseconds
  private readonly IDLE_TIMEOUT_MS = 4 * 60 * 60 * 1000;

  // Run cleanup every 30 minutes
  private readonly CLEANUP_INTERVAL_MS = 30 * 60 * 1000;

  /**
   * Start the background cleanup job
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Sandbox cleanup service already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting sandbox cleanup service', {
      idleTimeoutHours: this.IDLE_TIMEOUT_MS / (60 * 60 * 1000),
      cleanupIntervalMinutes: this.CLEANUP_INTERVAL_MS / (60 * 1000),
    });

    // Run cleanup immediately on startup
    await this.performCleanup();

    // Set up periodic cleanup
    this.cleanupInterval = setInterval(async () => {
      await this.performCleanup();
    }, this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Stop the background cleanup job
   */
  async stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.isRunning = false;
    logger.info('Sandbox cleanup service stopped');
  }

  /**
   * Perform cleanup of idle sandboxes
   */
  private async performCleanup() {
    try {
      const now = new Date();
      const idleThreshold = new Date(now.getTime() - this.IDLE_TIMEOUT_MS);

      logger.debug('Starting sandbox cleanup check', {
        idleThreshold: idleThreshold.toISOString(),
      });

      // Find idle projects with sandboxes
      // A project is idle if ALL its conversations have been inactive
      const idleProjects = await prisma.project.findMany({
        where: {
          sandboxId: {
            not: null, // Has a sandbox
          },
          sandboxStatus: 'READY', // Is currently active
        },
        include: {
          conversations: {
            select: {
              id: true,
              lastAccessedAt: true,
            },
            orderBy: {
              lastAccessedAt: 'desc',
            },
          },
        },
      });

      // Filter projects where the most recent conversation is idle
      const projectsToCleanup = idleProjects.filter(project => {
        if (project.conversations.length === 0) {
          return true; // No conversations, should cleanup
        }
        // Check if the most recently accessed conversation is idle
        const mostRecentAccess = project.conversations[0].lastAccessedAt;
        return mostRecentAccess && mostRecentAccess < idleThreshold;
      });

      if (projectsToCleanup.length === 0) {
        logger.debug('No idle sandboxes to clean up');
        return;
      }

      logger.info('Found idle project sandboxes to cleanup', {
        count: projectsToCleanup.length,
      });

      // Process each idle project sandbox
      for (const project of projectsToCleanup) {
        try {
          // Destroy the container using any conversation from this project
          if (project.sandboxId && project.conversations.length > 0) {
            await sandboxManager.destroySandbox(project.sandboxId);
          }

          // Mark project's sandbox status as failed (cleanup complete)
          await prisma.project.update({
            where: { id: project.id },
            data: {
              sandboxStatus: 'FAILED',
            },
          });

          const mostRecentAccess = project.conversations[0]?.lastAccessedAt;
          logger.info('Cleaned up idle project sandbox', {
            projectId: project.id,
            sandboxId: project.sandboxId,
            conversationCount: project.conversations.length,
            lastAccessedAt: mostRecentAccess?.toISOString(),
            idleMinutes: mostRecentAccess
              ? (now.getTime() - mostRecentAccess.getTime()) / (60 * 1000)
              : undefined,
          });
        } catch (error) {
          logger.error('Failed to cleanup project sandbox', {
            projectId: project.id,
            sandboxId: project.sandboxId,
            error: error instanceof Error ? error.message : String(error),
          });
          // Continue with next sandbox even if one fails
        }
      }

      logger.info('Sandbox cleanup check completed', {
        cleaned: projectsToCleanup.length,
      });
    } catch (error) {
      logger.error('Error during sandbox cleanup', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - continue running even if cleanup fails
    }
  }
}

// Export singleton instance
export const sandboxCleanupService = new SandboxCleanupService();
