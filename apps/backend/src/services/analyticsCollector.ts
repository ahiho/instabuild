import { ToolErrorType, ToolExecutionContext } from '@instabuild/shared/types';
import { logger } from '../lib/logger.js';

/**
 * Tool execution metrics
 */
export interface ToolExecutionMetrics {
  toolName: string;
  toolCallId: string;
  userId: string;
  conversationId: string;
  startTime: Date;
  endTime?: Date;
  executionTimeMs?: number;
  success: boolean;
  errorType?: ToolErrorType;
  errorMessage?: string;
  inputSize?: number;
  outputSize?: number;
  resourcesUsed?: string[];
}

/**
 * Aggregated tool analytics
 */
export interface ToolAnalytics {
  toolName: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  totalExecutionTime: number;
  errorPatterns: ErrorPattern[];
  usagePatterns: UsagePattern[];
  performanceMetrics: PerformanceMetrics;
}

/**
 * Error pattern analysis
 */
export interface ErrorPattern {
  errorType: ToolErrorType;
  count: number;
  percentage: number;
  commonMessages: string[];
  firstSeen: Date;
  lastSeen: Date;
}

/**
 * Usage pattern analysis
 */
export interface UsagePattern {
  timeOfDay: number; // Hour of day (0-23)
  dayOfWeek: number; // Day of week (0-6)
  executionCount: number;
  averageExecutionTime: number;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  minExecutionTime: number;
  maxExecutionTime: number;
  p50ExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

/**
 * Time range for analytics queries
 */
export interface TimeRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Analytics query options
 */
export interface AnalyticsQueryOptions {
  timeRange?: TimeRange;
  toolNames?: string[];
  userIds?: string[];
  successOnly?: boolean;
  errorOnly?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Analytics Collector service for tracking tool execution metrics
 */
export class AnalyticsCollector {
  private executionMetrics: Map<string, ToolExecutionMetrics> = new Map();
  private aggregatedAnalytics: Map<string, ToolAnalytics> = new Map();
  private executionTimes: Map<string, number[]> = new Map();

  /**
   * Log the start of a tool execution
   */
  logToolExecutionStart(
    toolName: string,
    toolCallId: string,
    context: ToolExecutionContext,
    input?: any
  ): void {
    // Validate user context for analytics tracking
    if (!context.userId) {
      logger.warn('Tool execution started without user context', {
        toolName,
        toolCallId,
      });
      return;
    }
    const metrics: ToolExecutionMetrics = {
      toolName,
      toolCallId,
      userId: context.userId,
      conversationId: context.conversationId,
      startTime: new Date(),
      success: false, // Will be updated on completion
      inputSize: input ? JSON.stringify(input).length : 0,
    };

    this.executionMetrics.set(toolCallId, metrics);

    logger.debug('Tool execution started', {
      toolName,
      toolCallId,
      userId: context.userId,
      conversationId: context.conversationId,
      sandboxId: context.sandboxId,
    });
  }

  /**
   * Log successful tool execution completion
   */
  logToolExecutionSuccess(
    toolCallId: string,
    output?: any,
    resourcesUsed?: string[]
  ): void {
    const metrics = this.executionMetrics.get(toolCallId);
    if (!metrics) {
      logger.warn('Tool execution metrics not found for success logging', {
        toolCallId,
      });
      return;
    }

    const endTime = new Date();
    const executionTimeMs = endTime.getTime() - metrics.startTime.getTime();

    metrics.endTime = endTime;
    metrics.executionTimeMs = executionTimeMs;
    metrics.success = true;
    metrics.outputSize = output ? JSON.stringify(output).length : 0;
    metrics.resourcesUsed = resourcesUsed;

    // Update aggregated analytics
    this.updateAggregatedAnalytics(metrics);

    logger.info('Tool execution completed successfully', {
      toolName: metrics.toolName,
      toolCallId,
      executionTimeMs,
      inputSize: metrics.inputSize,
      outputSize: metrics.outputSize,
      userId: metrics.userId,
      conversationId: metrics.conversationId,
    });
  }

  /**
   * Log failed tool execution
   */
  logToolExecutionError(
    toolCallId: string,
    errorType: ToolErrorType,
    errorMessage: string,
    errorDetails?: any
  ): void {
    const metrics = this.executionMetrics.get(toolCallId);
    if (!metrics) {
      logger.warn('Tool execution metrics not found for error logging', {
        toolCallId,
      });
      return;
    }

    const endTime = new Date();
    const executionTimeMs = endTime.getTime() - metrics.startTime.getTime();

    metrics.endTime = endTime;
    metrics.executionTimeMs = executionTimeMs;
    metrics.success = false;
    metrics.errorType = errorType;
    metrics.errorMessage = errorMessage;

    // Update aggregated analytics
    this.updateAggregatedAnalytics(metrics);

    logger.error('Tool execution failed', {
      toolName: metrics.toolName,
      toolCallId,
      executionTimeMs,
      errorType,
      errorMessage,
      errorDetails,
      userId: metrics.userId,
      conversationId: metrics.conversationId,
    });
  }

  /**
   * Log a tool sequence execution
   */
  logToolSequence(
    toolCalls: Array<{ toolName: string; toolCallId: string }>
  ): void {
    logger.info('Tool sequence executed', {
      sequenceLength: toolCalls.length,
      tools: toolCalls.map(tc => tc.toolName),
    });

    // This could be enhanced to track tool sequences and dependencies
    for (const toolCall of toolCalls) {
      logger.debug('Tool in sequence', {
        toolName: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
      });
    }
  }

  /**
   * Get analytics for a specific tool
   */
  getToolAnalytics(toolName: string): ToolAnalytics | undefined {
    return this.aggregatedAnalytics.get(toolName);
  }

  /**
   * Get analytics for multiple tools
   */
  getAnalytics(options: AnalyticsQueryOptions = {}): ToolAnalytics[] {
    // Note: In a production system, this would filter by user permissions
    // For now, we return all analytics but this should be secured
    let analytics = Array.from(this.aggregatedAnalytics.values());

    // Filter by tool names if specified
    if (options.toolNames && options.toolNames.length > 0) {
      analytics = analytics.filter(a =>
        options.toolNames!.includes(a.toolName)
      );
    }

    // Apply limit and offset
    if (options.offset) {
      analytics = analytics.slice(options.offset);
    }
    if (options.limit) {
      analytics = analytics.slice(0, options.limit);
    }

    return analytics;
  }

  /**
   * Get performance metrics for a tool
   */
  getPerformanceMetrics(toolName: string): PerformanceMetrics | undefined {
    const executionTimes = this.executionTimes.get(toolName);
    if (!executionTimes || executionTimes.length === 0) {
      return undefined;
    }

    const sortedTimes = [...executionTimes].sort((a, b) => a - b);
    const length = sortedTimes.length;

    return {
      minExecutionTime: sortedTimes[0],
      maxExecutionTime: sortedTimes[length - 1],
      p50ExecutionTime: sortedTimes[Math.floor(length * 0.5)],
      p95ExecutionTime: sortedTimes[Math.floor(length * 0.95)],
      p99ExecutionTime: sortedTimes[Math.floor(length * 0.99)],
    };
  }

  /**
   * Get error patterns for a tool
   */
  getErrorPatterns(toolName: string): ErrorPattern[] {
    const analytics = this.aggregatedAnalytics.get(toolName);
    return analytics?.errorPatterns || [];
  }

  /**
   * Get usage patterns for a tool
   */
  getUsagePatterns(toolName: string): UsagePattern[] {
    const analytics = this.aggregatedAnalytics.get(toolName);
    return analytics?.usagePatterns || [];
  }

  /**
   * Get overall system analytics (admin only)
   */
  getSystemAnalytics(): {
    totalExecutions: number;
    totalTools: number;
    overallSuccessRate: number;
    averageExecutionTime: number;
    topTools: Array<{ toolName: string; executionCount: number }>;
    errorSummary: Array<{ errorType: ToolErrorType; count: number }>;
  } {
    const allAnalytics = Array.from(this.aggregatedAnalytics.values());

    const totalExecutions = allAnalytics.reduce(
      (sum, a) => sum + a.totalExecutions,
      0
    );
    const totalSuccessful = allAnalytics.reduce(
      (sum, a) => sum + a.successfulExecutions,
      0
    );
    const totalExecutionTime = allAnalytics.reduce(
      (sum, a) => sum + a.totalExecutionTime,
      0
    );

    const topTools = allAnalytics
      .map(a => ({ toolName: a.toolName, executionCount: a.totalExecutions }))
      .sort((a, b) => b.executionCount - a.executionCount)
      .slice(0, 10);

    const errorSummary = new Map<ToolErrorType, number>();
    for (const analytics of allAnalytics) {
      for (const errorPattern of analytics.errorPatterns) {
        errorSummary.set(
          errorPattern.errorType,
          (errorSummary.get(errorPattern.errorType) || 0) + errorPattern.count
        );
      }
    }

    return {
      totalExecutions,
      totalTools: allAnalytics.length,
      overallSuccessRate:
        totalExecutions > 0 ? (totalSuccessful / totalExecutions) * 100 : 0,
      averageExecutionTime:
        totalExecutions > 0 ? totalExecutionTime / totalExecutions : 0,
      topTools,
      errorSummary: Array.from(errorSummary.entries()).map(
        ([errorType, count]) => ({
          errorType,
          count,
        })
      ),
    };
  }

  /**
   * Update aggregated analytics with new execution metrics
   */
  private updateAggregatedAnalytics(metrics: ToolExecutionMetrics): void {
    const { toolName } = metrics;
    let analytics = this.aggregatedAnalytics.get(toolName);

    if (!analytics) {
      analytics = {
        toolName,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        successRate: 0,
        averageExecutionTime: 0,
        totalExecutionTime: 0,
        errorPatterns: [],
        usagePatterns: [],
        performanceMetrics: {
          minExecutionTime: 0,
          maxExecutionTime: 0,
          p50ExecutionTime: 0,
          p95ExecutionTime: 0,
          p99ExecutionTime: 0,
        },
      };
      this.aggregatedAnalytics.set(toolName, analytics);
    }

    // Update basic metrics
    analytics.totalExecutions++;
    if (metrics.success) {
      analytics.successfulExecutions++;
    } else {
      analytics.failedExecutions++;
    }

    analytics.successRate =
      (analytics.successfulExecutions / analytics.totalExecutions) * 100;

    // Update execution time metrics
    if (metrics.executionTimeMs !== undefined) {
      analytics.totalExecutionTime += metrics.executionTimeMs;
      analytics.averageExecutionTime =
        analytics.totalExecutionTime / analytics.totalExecutions;

      // Track execution times for percentile calculations
      let executionTimes = this.executionTimes.get(toolName);
      if (!executionTimes) {
        executionTimes = [];
        this.executionTimes.set(toolName, executionTimes);
      }
      executionTimes.push(metrics.executionTimeMs);

      // Update performance metrics
      analytics.performanceMetrics =
        this.calculatePerformanceMetrics(executionTimes);
    }

    // Update error patterns
    if (!metrics.success && metrics.errorType) {
      this.updateErrorPatterns(analytics, metrics);
    }

    // Update usage patterns
    this.updateUsagePatterns(analytics, metrics);
  }

  /**
   * Calculate performance metrics from execution times
   */
  private calculatePerformanceMetrics(
    executionTimes: number[]
  ): PerformanceMetrics {
    const sortedTimes = [...executionTimes].sort((a, b) => a - b);
    const length = sortedTimes.length;

    return {
      minExecutionTime: sortedTimes[0],
      maxExecutionTime: sortedTimes[length - 1],
      p50ExecutionTime: sortedTimes[Math.floor(length * 0.5)],
      p95ExecutionTime: sortedTimes[Math.floor(length * 0.95)],
      p99ExecutionTime: sortedTimes[Math.floor(length * 0.99)],
    };
  }

  /**
   * Update error patterns for a tool
   */
  private updateErrorPatterns(
    analytics: ToolAnalytics,
    metrics: ToolExecutionMetrics
  ): void {
    if (!metrics.errorType || !metrics.errorMessage) return;

    let errorPattern = analytics.errorPatterns.find(
      p => p.errorType === metrics.errorType
    );

    if (!errorPattern) {
      errorPattern = {
        errorType: metrics.errorType,
        count: 0,
        percentage: 0,
        commonMessages: [],
        firstSeen: metrics.startTime,
        lastSeen: metrics.startTime,
      };
      analytics.errorPatterns.push(errorPattern);
    }

    errorPattern.count++;
    errorPattern.percentage =
      (errorPattern.count / analytics.failedExecutions) * 100;
    errorPattern.lastSeen = metrics.startTime;

    // Track common error messages
    if (!errorPattern.commonMessages.includes(metrics.errorMessage)) {
      errorPattern.commonMessages.push(metrics.errorMessage);
      // Keep only top 5 most common messages
      if (errorPattern.commonMessages.length > 5) {
        errorPattern.commonMessages = errorPattern.commonMessages.slice(0, 5);
      }
    }
  }

  /**
   * Update usage patterns for a tool
   */
  private updateUsagePatterns(
    analytics: ToolAnalytics,
    metrics: ToolExecutionMetrics
  ): void {
    const hour = metrics.startTime.getHours();
    const dayOfWeek = metrics.startTime.getDay();

    let usagePattern = analytics.usagePatterns.find(
      p => p.timeOfDay === hour && p.dayOfWeek === dayOfWeek
    );

    if (!usagePattern) {
      usagePattern = {
        timeOfDay: hour,
        dayOfWeek,
        executionCount: 0,
        averageExecutionTime: 0,
      };
      analytics.usagePatterns.push(usagePattern);
    }

    usagePattern.executionCount++;
    if (metrics.executionTimeMs !== undefined) {
      usagePattern.averageExecutionTime =
        (usagePattern.averageExecutionTime * (usagePattern.executionCount - 1) +
          metrics.executionTimeMs) /
        usagePattern.executionCount;
    }
  }

  /**
   * Get user-specific analytics
   */
  getUserAnalytics(
    userId: string,
    _options: AnalyticsQueryOptions = {}
  ): ToolAnalytics[] {
    if (!userId) {
      return [];
    }

    // Filter analytics by user ID
    const userMetrics = Array.from(this.executionMetrics.values()).filter(
      metric => metric.userId === userId
    );

    // Build user-specific analytics
    const userAnalytics = new Map<string, ToolAnalytics>();

    for (const metric of userMetrics) {
      const toolName = metric.toolName;
      let analytics = userAnalytics.get(toolName);

      if (!analytics) {
        analytics = {
          toolName,
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          successRate: 0,
          averageExecutionTime: 0,
          totalExecutionTime: 0,
          errorPatterns: [],
          usagePatterns: [],
          performanceMetrics: {
            minExecutionTime: 0,
            maxExecutionTime: 0,
            p50ExecutionTime: 0,
            p95ExecutionTime: 0,
            p99ExecutionTime: 0,
          },
        };
        userAnalytics.set(toolName, analytics);
      }

      analytics.totalExecutions++;
      if (metric.success) {
        analytics.successfulExecutions++;
      } else {
        analytics.failedExecutions++;
      }

      if (metric.executionTimeMs !== undefined) {
        analytics.totalExecutionTime += metric.executionTimeMs;
      }
    }

    // Calculate derived metrics
    for (const analytics of userAnalytics.values()) {
      analytics.successRate =
        analytics.totalExecutions > 0
          ? (analytics.successfulExecutions / analytics.totalExecutions) * 100
          : 0;
      analytics.averageExecutionTime =
        analytics.totalExecutions > 0
          ? analytics.totalExecutionTime / analytics.totalExecutions
          : 0;
    }

    return Array.from(userAnalytics.values());
  }

  /**
   * Get user usage statistics
   */
  getUserUsageStats(userId: string): {
    totalToolExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    mostUsedTools: Array<{ toolName: string; count: number }>;
    recentActivity: Array<{ date: string; executionCount: number }>;
  } {
    if (!userId) {
      return {
        totalToolExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        mostUsedTools: [],
        recentActivity: [],
      };
    }

    const userMetrics = Array.from(this.executionMetrics.values()).filter(
      metric => metric.userId === userId
    );

    const totalExecutions = userMetrics.length;
    const successfulExecutions = userMetrics.filter(m => m.success).length;
    const failedExecutions = totalExecutions - successfulExecutions;

    const totalTime = userMetrics.reduce(
      (sum, m) => sum + (m.executionTimeMs || 0),
      0
    );
    const averageExecutionTime =
      totalExecutions > 0 ? totalTime / totalExecutions : 0;

    // Calculate most used tools
    const toolCounts = new Map<string, number>();
    for (const metric of userMetrics) {
      toolCounts.set(
        metric.toolName,
        (toolCounts.get(metric.toolName) || 0) + 1
      );
    }

    const mostUsedTools = Array.from(toolCounts.entries())
      .map(([toolName, count]) => ({ toolName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate recent activity (last 7 days)
    const recentActivity: Array<{ date: string; executionCount: number }> = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayExecutions = userMetrics.filter(m => {
        const metricDate = m.startTime.toISOString().split('T')[0];
        return metricDate === dateStr;
      }).length;

      recentActivity.push({ date: dateStr, executionCount: dayExecutions });
    }

    return {
      totalToolExecutions: totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageExecutionTime,
      mostUsedTools,
      recentActivity,
    };
  }

  /**
   * Clear all analytics data (for testing)
   */
  clearAnalytics(): void {
    this.executionMetrics.clear();
    this.aggregatedAnalytics.clear();
    this.executionTimes.clear();
    logger.debug('All analytics data cleared');
  }

  /**
   * Get analytics statistics (admin only)
   */
  getStats(): {
    activeExecutions: number;
    totalToolsTracked: number;
    totalExecutionRecords: number;
  } {
    return {
      activeExecutions: this.executionMetrics.size,
      totalToolsTracked: this.aggregatedAnalytics.size,
      totalExecutionRecords: Array.from(
        this.aggregatedAnalytics.values()
      ).reduce((sum, a) => sum + a.totalExecutions, 0),
    };
  }
}

// Export singleton instance
export const analyticsCollector = new AnalyticsCollector();
