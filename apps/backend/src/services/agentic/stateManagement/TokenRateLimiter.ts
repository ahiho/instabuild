import { logger } from '../../../lib/logger.js';

/**
 * Token usage entry in the sliding window
 */
interface TokenUsageEntry {
  timestamp: number;
  tokens: number;
}

/**
 * Result of delay calculation
 */
interface DelayDecision {
  shouldDelay: boolean;
  delayMs: number;
  currentRate: number;
  reason: 'NORMAL' | 'WARNING' | 'CRITICAL';
}

/**
 * Token Rate Limiter with sliding window tracking
 * Prevents OpenAI token-per-minute rate limit violations
 */
export class TokenRateLimiter {
  // Sliding window: Map<conversationId, Array<{timestamp, tokens}>>
  private tokenUsageWindow: Map<string, TokenUsageEntry[]> = new Map();

  // OpenAI rate limits (configurable)
  private readonly RATE_LIMIT = 20000;
  private readonly WARNING_THRESHOLD = 10000;
  private readonly CRITICAL_THRESHOLD = 15000;

  // Adaptive delays (in milliseconds)
  private readonly WARNING_DELAY_ADD = 3000;
  private readonly CRITICAL_DELAY_ADD = 25000;

  // Window size (60 seconds)
  private readonly WINDOW_MS = 60000;

  /**
   * Add token usage for a conversation
   */
  addTokenUsage(conversationId: string, tokens: number): void {
    const now = Date.now();

    // Get or create window for this conversation
    if (!this.tokenUsageWindow.has(conversationId)) {
      this.tokenUsageWindow.set(conversationId, []);
    }

    const window = this.tokenUsageWindow.get(conversationId)!;

    // Add new entry
    window.push({ timestamp: now, tokens });

    logger.debug('[TOKEN RATE LIMITER] Adding token usage', {
      conversationId,
      tokens,
      currentWindowSize: window.length,
      timestamp: now,
    });

    // Clean old entries outside the 60-second window
    this.cleanOldEntries(conversationId);
  }

  /**
   * Get current token rate (tokens in last 60 seconds)
   */
  getCurrentRate(conversationId: string): number {
    // Clean old entries first
    this.cleanOldEntries(conversationId);

    const window = this.tokenUsageWindow.get(conversationId);
    if (!window || window.length === 0) {
      return 0;
    }

    // Sum all tokens in the current window
    const totalTokens = window.reduce((sum, entry) => sum + entry.tokens, 0);

    logger.debug('[TOKEN RATE LIMITER] Current rate calculated', {
      conversationId,
      tokensPerMinute: totalTokens,
      windowEntries: window.length,
      oldestEntry: window[0]?.timestamp
        ? new Date(window[0].timestamp).toISOString()
        : null,
      newestEntry: window[window.length - 1]?.timestamp
        ? new Date(window[window.length - 1].timestamp).toISOString()
        : null,
    });

    return totalTokens;
  }

  /**
   * Determine if delay should be increased and by how much
   */
  shouldIncreaseDelay(conversationId: string): DelayDecision {
    const currentRate = this.getCurrentRate(conversationId);

    let shouldDelay = false;
    let delayMs = 0;
    let reason: 'NORMAL' | 'WARNING' | 'CRITICAL' = 'NORMAL';

    if (currentRate >= this.CRITICAL_THRESHOLD) {
      shouldDelay = true;
      delayMs = this.CRITICAL_DELAY_ADD;
      reason = 'CRITICAL';
    } else if (currentRate >= this.WARNING_THRESHOLD) {
      shouldDelay = true;
      delayMs = this.WARNING_DELAY_ADD;
      reason = 'WARNING';
    }

    const percentOfLimit = ((currentRate / this.RATE_LIMIT) * 100).toFixed(1);

    logger.debug('[TOKEN RATE LIMITER] Delay decision', {
      conversationId,
      currentRate,
      percentOfLimit: percentOfLimit + '%',
      warningThreshold: this.WARNING_THRESHOLD,
      criticalThreshold: this.CRITICAL_THRESHOLD,
      rateLimit: this.RATE_LIMIT,
      shouldDelay,
      delayMs,
      reason,
    });

    return {
      shouldDelay,
      delayMs,
      currentRate,
      reason,
    };
  }

  /**
   * Clean entries older than the window size (60 seconds)
   */
  private cleanOldEntries(conversationId: string): void {
    const window = this.tokenUsageWindow.get(conversationId);
    if (!window) {
      return;
    }

    const now = Date.now();
    const cutoffTime = now - this.WINDOW_MS;

    const beforeCount = window.length;

    // Remove entries older than cutoff
    const filteredWindow = window.filter(
      entry => entry.timestamp >= cutoffTime
    );

    this.tokenUsageWindow.set(conversationId, filteredWindow);

    const removedCount = beforeCount - filteredWindow.length;
    if (removedCount > 0) {
      logger.debug('[TOKEN RATE LIMITER] Cleaned old entries', {
        conversationId,
        beforeCount,
        afterCount: filteredWindow.length,
        removedCount,
        cutoffTime: new Date(cutoffTime).toISOString(),
      });
    }
  }

  /**
   * Clear all token usage data for a conversation (e.g., when conversation ends)
   */
  clearConversation(conversationId: string): void {
    const existed = this.tokenUsageWindow.has(conversationId);
    this.tokenUsageWindow.delete(conversationId);

    if (existed) {
      logger.debug('[TOKEN RATE LIMITER] Cleared conversation data', {
        conversationId,
      });
    }
  }

  /**
   * Get statistics for monitoring
   */
  getStats(): {
    totalConversations: number;
    conversationRates: Array<{
      conversationId: string;
      tokensPerMinute: number;
    }>;
  } {
    const conversationRates = Array.from(this.tokenUsageWindow.keys()).map(
      conversationId => ({
        conversationId,
        tokensPerMinute: this.getCurrentRate(conversationId),
      })
    );

    return {
      totalConversations: this.tokenUsageWindow.size,
      conversationRates,
    };
  }
}

// Export singleton instance
export const tokenRateLimiter = new TokenRateLimiter();
