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

      // Find idle sandboxes that should be cleaned up
      const idleSandboxes = await prisma.conversation.findMany({
        where: {
          sandboxId: {
            not: null, // Has a sandbox
          },
          sandboxStatus: 'ready', // Is currently active
          lastAccessedAt: {
            lt: idleThreshold, // Last accessed before threshold
          },
        },
        select: {
          id: true,
          sandboxId: true,
          lastAccessedAt: true,
        },
      });

      if (idleSandboxes.length === 0) {
        logger.debug('No idle sandboxes to clean up');
        return;
      }

      logger.info('Found idle sandboxes to cleanup', {
        count: idleSandboxes.length,
      });

      // Process each idle sandbox
      for (const conversation of idleSandboxes) {
        try {
          // Destroy the container
          if (conversation.sandboxId) {
            await sandboxManager.destroySandbox(conversation.sandboxId);
          }

          // Mark conversation as terminated
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              sandboxStatus: 'terminated',
            },
          });

          logger.info('Cleaned up idle sandbox', {
            conversationId: conversation.id,
            sandboxId: conversation.sandboxId,
            lastAccessedAt: conversation.lastAccessedAt?.toISOString(),
            idleMinutes: (now.getTime() - (conversation.lastAccessedAt?.getTime() || 0)) / (60 * 1000),
          });
        } catch (error) {
          logger.error('Failed to cleanup sandbox', {
            conversationId: conversation.id,
            sandboxId: conversation.sandboxId,
            error: error instanceof Error ? error.message : String(error),
          });
          // Continue with next sandbox even if one fails
        }
      }

      logger.info('Sandbox cleanup check completed', {
        cleaned: idleSandboxes.length,
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
