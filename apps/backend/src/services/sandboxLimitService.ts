import { PrismaClient } from '@prisma/client';
import type { Project } from '@prisma/client';

/**
 * Service for managing per-user sandbox concurrency limits.
 *
 * Supports:
 * - Free tier: 1 concurrent sandbox
 * - Pro tier: 3 concurrent sandboxes
 * - Enterprise: unlimited sandboxes
 *
 * Design principles:
 * - Single source of truth: Prisma database
 * - Scalable: Easily extendable for new subscription tiers
 * - Automatic cleanup: Old sandboxes are destroyed when limit is reached
 */
export class SandboxLimitService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get the maximum number of concurrent sandboxes for a user.
   * Can be customized per subscription tier.
   */
  private getMaxConcurrentSandboxes(subscriptionTier: string): number {
    const tierLimits: Record<string, number> = {
      free: 1,
      pro: 3,
      enterprise: Infinity,
    };
    return tierLimits[subscriptionTier] ?? 1; // Default to free tier
  }

  /**
   * Count active (READY or PENDING) sandboxes for a user.
   */
  async countActiveSandboxes(userId: string): Promise<number> {
    const count = await this.prisma.project.count({
      where: {
        userId,
        sandboxStatus: {
          in: ['READY', 'PENDING'],
        },
      },
    });
    return count;
  }

  /**
   * Get list of active sandboxes for a user (ordered by age, oldest first).
   * Useful for cleanup operations.
   */
  async getActiveSandboxes(userId: string): Promise<Project[]> {
    return await this.prisma.project.findMany({
      where: {
        userId,
        sandboxStatus: {
          in: ['READY', 'PENDING'],
        },
      },
      orderBy: {
        sandboxCreatedAt: 'asc', // Oldest first
      },
    });
  }

  /**
   * Check if user can create a new sandbox.
   * Returns whether the limit is reached and how many need to be cleaned up.
   */
  async canCreateSandbox(userId: string): Promise<{
    allowed: boolean;
    activeSandboxCount: number;
    maxAllowed: number;
    needsCleanup: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true, maxConcurrentSandboxes: true },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const maxAllowed = this.getMaxConcurrentSandboxes(user.subscriptionTier);
    const activeSandboxCount = await this.countActiveSandboxes(userId);
    const needsCleanup = Math.max(0, activeSandboxCount + 1 - maxAllowed);

    return {
      allowed: activeSandboxCount < maxAllowed,
      activeSandboxCount,
      maxAllowed,
      needsCleanup,
    };
  }

  /**
   * Clean up sandboxes if user exceeds their limit.
   * Destroys oldest sandboxes first until user is below their limit.
   * Called automatically when creating a new conversation.
   *
   * Returns the IDs of destroyed sandboxes.
   */
  async enforceLimit(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const maxAllowed = this.getMaxConcurrentSandboxes(user.subscriptionTier);

    // If enterprise (unlimited), don't enforce any limits
    if (maxAllowed === Infinity) {
      return [];
    }

    const activeSandboxes = await this.getActiveSandboxes(userId);
    const toDestroy = activeSandboxes.slice(
      0,
      activeSandboxes.length - maxAllowed + 1
    );

    const destroyedIds: string[] = [];

    for (const sandbox of toDestroy) {
      if (sandbox.sandboxId) {
        try {
          // Import at runtime to avoid circular dependencies
          const { sandboxManager } = await import('./sandboxManager.js');
          await sandboxManager.destroySandbox(sandbox.sandboxId);
          destroyedIds.push(sandbox.sandboxId);

          // Mark project sandbox as failed
          await this.prisma.project.update({
            where: { id: sandbox.id },
            data: { sandboxStatus: 'FAILED' },
          });

          console.log(
            `[SandboxLimitService] Destroyed sandbox ${sandbox.sandboxId} for user ${userId} to enforce limit`
          );
        } catch (error) {
          console.error(
            `[SandboxLimitService] Failed to destroy sandbox ${sandbox.sandboxId}:`,
            error
          );
          // Continue with next sandbox even if this one fails
        }
      }
    }

    return destroyedIds;
  }

  /**
   * Upgrade user's subscription tier and sandbox limit.
   * Useful for admin operations or when user subscribes to a paid plan.
   */
  async upgradeSubscription(
    userId: string,
    newTier: 'free' | 'pro' | 'enterprise'
  ): Promise<void> {
    const maxSandboxes = this.getMaxConcurrentSandboxes(newTier);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: newTier,
        maxConcurrentSandboxes: maxSandboxes,
      },
    });

    console.log(
      `[SandboxLimitService] Upgraded user ${userId} to ${newTier} tier`
    );
  }

  /**
   * Get current usage stats for a user (for UI/analytics).
   */
  async getUserSandboxUsage(userId: string): Promise<{
    activeSandboxCount: number;
    maxAllowed: number;
    subscriptionTier: string;
    remainingCapacity: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const maxAllowed = this.getMaxConcurrentSandboxes(user.subscriptionTier);
    const activeSandboxCount = await this.countActiveSandboxes(userId);
    const remainingCapacity = Math.max(0, maxAllowed - activeSandboxCount);

    return {
      activeSandboxCount,
      maxAllowed: maxAllowed === Infinity ? -1 : maxAllowed, // -1 indicates unlimited
      subscriptionTier: user.subscriptionTier,
      remainingCapacity:
        remainingCapacity === Infinity ? -1 : remainingCapacity,
    };
  }
}

// Singleton instance
let instance: SandboxLimitService | null = null;

export function initializeSandboxLimitService(
  prisma: PrismaClient
): SandboxLimitService {
  if (!instance) {
    instance = new SandboxLimitService(prisma);
  }
  return instance;
}

export function getSandboxLimitService(): SandboxLimitService {
  if (!instance) {
    throw new Error(
      'SandboxLimitService not initialized. Call initializeSandboxLimitService first.'
    );
  }
  return instance;
}
