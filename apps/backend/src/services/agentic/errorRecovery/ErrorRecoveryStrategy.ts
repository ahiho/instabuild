import { logger } from '../../../lib/logger.js';
import {
  ErrorContext,
  ErrorRecoveryConfig,
  ErrorRecoveryStrategy,
  TaskComplexity,
} from '../types.js';
import { errorClassifier } from './ErrorClassifier.js';

/**
 * Error recovery strategy manager for handling different types of failures
 */
export class ErrorRecoveryStrategyManager {
  private errorRecoveryConfig: ErrorRecoveryConfig = {
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    fallbackStrategies: [
      ErrorRecoveryStrategy.RETRY,
      ErrorRecoveryStrategy.ALTERNATIVE_APPROACH,
      ErrorRecoveryStrategy.SIMPLIFY_TASK,
      ErrorRecoveryStrategy.USER_FEEDBACK,
    ],
    userFeedbackThreshold: 2, // Request user feedback after 2 failed attempts
  };

  private errorAttempts: Map<string, number> = new Map();

  /**
   * Select appropriate recovery strategy based on error type and context
   */
  selectRecoveryStrategy(
    errorType: string,
    context: ErrorContext
  ): ErrorRecoveryStrategy {
    const { previousAttempts, taskComplexity } = context;

    // If we've exceeded the user feedback threshold, request guidance
    if (previousAttempts >= this.errorRecoveryConfig.userFeedbackThreshold) {
      return ErrorRecoveryStrategy.USER_FEEDBACK;
    }

    // Strategy selection based on error type
    switch (errorType) {
      case 'NoSuchTool':
        return ErrorRecoveryStrategy.ALTERNATIVE_APPROACH;

      case 'InvalidToolInput':
        return previousAttempts < 2
          ? ErrorRecoveryStrategy.RETRY
          : ErrorRecoveryStrategy.SIMPLIFY_TASK;

      case 'APICall':
        return previousAttempts < 1
          ? ErrorRecoveryStrategy.RETRY
          : ErrorRecoveryStrategy.GRACEFUL_DEGRADATION;

      case 'ToolCallRepair':
        return ErrorRecoveryStrategy.SIMPLIFY_TASK;

      default:
        // For complex tasks, be more conservative
        if (
          taskComplexity === TaskComplexity.COMPLEX ||
          taskComplexity === TaskComplexity.ADVANCED
        ) {
          return previousAttempts < 1
            ? ErrorRecoveryStrategy.RETRY
            : ErrorRecoveryStrategy.USER_FEEDBACK;
        }
        return ErrorRecoveryStrategy.RETRY;
    }
  }

  /**
   * Execute the selected recovery strategy
   */
  async executeRecoveryStrategy(
    strategy: ErrorRecoveryStrategy,
    error: unknown,
    context: ErrorContext,
    conversationId: string
  ): Promise<void> {
    logger.info('Executing error recovery strategy', {
      conversationId,
      strategy,
      errorType: errorClassifier.classifyError(error),
    });

    switch (strategy) {
      case ErrorRecoveryStrategy.RETRY: {
        // Increment attempt counter
        const attemptKey = `${conversationId}-${context.stepNumber}`;
        this.errorAttempts.set(
          attemptKey,
          (this.errorAttempts.get(attemptKey) || 0) + 1
        );

        // Add delay before retry
        await new Promise(resolve =>
          setTimeout(resolve, this.errorRecoveryConfig.retryDelay)
        );
        break;
      }

      case ErrorRecoveryStrategy.ALTERNATIVE_APPROACH:
        logger.info('Attempting alternative approach', { conversationId });
        // The AI SDK will handle this through the repair mechanism
        break;

      case ErrorRecoveryStrategy.SIMPLIFY_TASK:
        logger.info('Simplifying task approach', { conversationId });
        // This would be handled by the AI model's reasoning
        break;

      case ErrorRecoveryStrategy.USER_FEEDBACK:
        logger.warn('Requesting user feedback for error recovery', {
          conversationId,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
        // This would trigger a user notification in the UI
        break;

      case ErrorRecoveryStrategy.GRACEFUL_DEGRADATION:
        logger.info('Continuing with graceful degradation', { conversationId });
        // Continue execution with reduced functionality
        break;
    }
  }

  /**
   * Get error recovery configuration
   */
  getErrorRecoveryConfig(): ErrorRecoveryConfig {
    return this.errorRecoveryConfig;
  }

  /**
   * Get attempt count for a specific step
   */
  getAttemptCount(conversationId: string, stepNumber: number): number {
    const attemptKey = `${conversationId}-${stepNumber}`;
    return this.errorAttempts.get(attemptKey) || 0;
  }

  /**
   * Clear attempts for a conversation
   */
  clearAttempts(conversationId: string): void {
    for (const key of this.errorAttempts.keys()) {
      if (key.startsWith(conversationId)) {
        this.errorAttempts.delete(key);
      }
    }
  }
}

export const errorRecoveryStrategyManager =
  new ErrorRecoveryStrategyManager();
