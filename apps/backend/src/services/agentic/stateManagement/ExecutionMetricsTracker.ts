import {
  ExecutionMetrics,
  TaskComplexity,
  ToolExecutionMetric,
} from '../types.js';

/**
 * Execution metrics tracker for monitoring task execution
 */
export class ExecutionMetricsTracker {
  private executionMetrics: Map<string, ExecutionMetrics> = new Map();

  /**
   * Initialize execution metrics tracking
   */
  initializeExecutionMetrics(
    conversationId: string,
    taskComplexity: TaskComplexity
  ): ExecutionMetrics {
    const metrics: ExecutionMetrics = {
      conversationId,
      totalTokensUsed: 0,
      totalSteps: 0,
      toolExecutions: [],
      executionTime: 0,
      successRate: 0,
      errorRate: 0,
      averageStepTime: 0,
      taskComplexity,
      completionStatus: 'success',
    };

    this.executionMetrics.set(conversationId, metrics);
    return metrics;
  }

  /**
   * Track step execution metrics
   */
  async trackStepMetrics(
    conversationId: string,
    stepResult: any,
    stepNumber: number
  ): Promise<void> {
    const metrics = this.executionMetrics.get(conversationId);
    if (!metrics) return;

    // Update basic metrics
    metrics.totalSteps = stepNumber;
    metrics.totalTokensUsed += stepResult.usage?.totalTokens || 0;

    // Track tool executions
    if (stepResult.toolCalls) {
      for (const toolCall of stepResult.toolCalls) {
        const toolMetric: ToolExecutionMetric = {
          toolName: toolCall.toolName,
          executionTime: 0, // Would need to track this separately
          success: !stepResult.toolResults?.some(
            (tr: any) => tr.toolCallId === toolCall.toolCallId && tr.error
          ),
          inputSize: JSON.stringify(toolCall.input || {}).length,
          outputSize: 0, // Would need to track output size
          stepNumber,
          timestamp: new Date(),
        };

        metrics.toolExecutions.push(toolMetric);
      }
    }

    this.executionMetrics.set(conversationId, metrics);
  }

  /**
   * Complete execution metrics calculation
   */
  async completeExecutionMetrics(
    conversationId: string,
    startTime: Date,
    finalResult: any
  ): Promise<void> {
    const metrics = this.executionMetrics.get(conversationId);
    if (!metrics) return;

    // Calculate final metrics
    const executionTime = Date.now() - startTime.getTime();
    metrics.executionTime = executionTime;
    metrics.averageStepTime =
      metrics.totalSteps > 0 ? executionTime / metrics.totalSteps : 0;

    // Calculate success and error rates
    const successfulTools = metrics.toolExecutions.filter(
      te => te.success
    ).length;
    const totalTools = metrics.toolExecutions.length;

    metrics.successRate = totalTools > 0 ? successfulTools / totalTools : 1;
    metrics.errorRate =
      totalTools > 0 ? (totalTools - successfulTools) / totalTools : 0;

    // Determine completion status
    if (finalResult.finishReason === 'stop' && metrics.errorRate === 0) {
      metrics.completionStatus = 'success';
    } else if (finalResult.finishReason === 'stop' && metrics.errorRate < 0.5) {
      metrics.completionStatus = 'partial';
    } else {
      metrics.completionStatus = 'failed';
    }

    this.executionMetrics.set(conversationId, metrics);
  }

  /**
   * Get execution metrics for monitoring
   */
  getExecutionMetrics(conversationId: string): ExecutionMetrics | undefined {
    return this.executionMetrics.get(conversationId);
  }

  /**
   * Get all execution metrics
   */
  getAllExecutionMetrics(): Map<string, ExecutionMetrics> {
    return new Map(this.executionMetrics);
  }

  /**
   * Delete execution metrics
   */
  deleteExecutionMetrics(conversationId: string): void {
    this.executionMetrics.delete(conversationId);
  }

  /**
   * Get most used tool from execution metrics
   */
  getMostUsedTool(toolExecutions: ToolExecutionMetric[]): string | null {
    if (toolExecutions.length === 0) return null;

    const toolCounts = toolExecutions.reduce(
      (acc, te) => {
        acc[te.toolName] = (acc[te.toolName] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(toolCounts).reduce((a, b) =>
      toolCounts[a[0]] > toolCounts[b[0]] ? a : b
    )[0];
  }
}

export const executionMetricsTracker = new ExecutionMetricsTracker();
