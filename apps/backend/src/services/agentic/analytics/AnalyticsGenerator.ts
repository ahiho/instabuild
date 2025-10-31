import { AnalyticsSummary } from '../types.js';
import { conversationStateManager } from '../stateManagement/ConversationStateManager.js';
import { executionMetricsTracker } from '../stateManagement/ExecutionMetricsTracker.js';

/**
 * Analytics generator for generating insights from conversation data
 */
export class AnalyticsGenerator {
  /**
   * Generate analytics summary for a completed conversation
   */
  async generateAnalyticsSummary(conversationId: string): Promise<AnalyticsSummary | null> {
    const state = conversationStateManager.getConversationState(conversationId);
    const metrics = executionMetricsTracker.getExecutionMetrics(conversationId);

    if (!state || !metrics) {
      return null;
    }

    const mostUsedTool = executionMetricsTracker.getMostUsedTool(
      metrics.toolExecutions
    );

    return {
      conversationId,
      duration: metrics.executionTime,
      taskComplexity: state.taskComplexity,
      stepsCompleted: metrics.totalSteps,
      toolsUsed: state.toolsUsed.length,
      uniqueTools: new Set(state.toolsUsed).size,
      successRate: Math.round(metrics.successRate * 100),
      errorRate: Math.round(metrics.errorRate * 100),
      tokensUsed: metrics.totalTokensUsed,
      averageStepTime: Math.round(metrics.averageStepTime),
      completionStatus: metrics.completionStatus,
      filesModified: state.filesModified.length,
      mostUsedTool,
    };
  }

  /**
   * Generate execution statistics summary
   */
  getExecutionStats() {
    const allMetrics = executionMetricsTracker.getAllExecutionMetrics();
    const allStates = conversationStateManager.getAllConversationStates();

    const totalConversations = allMetrics.size;
    const totalTokens = Array.from(allMetrics.values()).reduce(
      (sum, m) => sum + m.totalTokensUsed,
      0
    );
    const averageSuccessRate = Array.from(allMetrics.values()).reduce(
      (sum, m) => sum + m.successRate,
      0
    ) / (totalConversations || 1);

    return {
      totalConversations,
      totalTokensUsed: totalTokens,
      averageSuccessRate: Math.round(averageSuccessRate * 100),
      activeConversations: Array.from(allStates.values()).filter(
        s => s.status === 'active'
      ).length,
      completedConversations: Array.from(allStates.values()).filter(
        s => s.status === 'completed'
      ).length,
      failedConversations: Array.from(allStates.values()).filter(
        s => s.status === 'failed'
      ).length,
    };
  }
}

export const analyticsGenerator = new AnalyticsGenerator();
