import { SafetyLevel } from '@instabuild/shared';
import {
  EnhancedToolDefinition,
  ToolCategory,
  ToolErrorType,
  ToolExecutionContext,
  ToolExecutionError,
  ToolExecutionProgress,
  ToolExecutionResult,
  ToolExecutionStatus,
  ToolMetadata,
} from '@instabuild/shared/types';
import { tool } from 'ai';
import { z } from 'zod';
import { logger } from '../lib/logger.js';
import { analyticsCollector } from './analyticsCollector.js';
import {
  SafetyLevel as SafetyConstraintLevel,
  safetyConstraintSystem,
} from './safetyConstraintSystem.js';
import {
  ExecutionContext,
  OperationType,
  securitySystem,
} from './securitySystem.js';

/**
 * Enhanced Tool Registry that extends AI SDK tool functionality with user-friendly feedback
 */
export class EnhancedToolRegistry {
  private enhancedTools = new Map<string, EnhancedToolDefinition>();
  private executionProgress = new Map<string, ToolExecutionProgress>();
  private progressCallbacks = new Map<
    string,
    (progress: ToolExecutionProgress) => void
  >();

  /**
   * Register an enhanced tool with user-friendly metadata
   */
  registerEnhancedTool<T>(definition: EnhancedToolDefinition<T>): void {
    try {
      this.validateEnhancedToolDefinition(definition);
      this.enhancedTools.set(definition.name, definition);

      logger.info('Enhanced tool registered successfully', {
        toolName: definition.name,
        displayName: definition.displayName,
        category: definition.category,
        version: definition.metadata.version,
      });
    } catch (error) {
      logger.error('Failed to register enhanced tool', {
        toolName: definition.name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Create an AI SDK tool from enhanced definition with user feedback capabilities
   */
  createAISDKToolWithFeedback<T>(
    definition: EnhancedToolDefinition<T>
  ): ReturnType<typeof tool> {
    return tool({
      description: definition.description,
      parameters: definition.inputSchema,
      execute: async (input, { toolCallId }) => {
        const context: ToolExecutionContext = {
          userId: 'system', // Will be properly set when we have user context
          conversationId: 'unknown',
          toolCallId,
        };

        return await this.executeEnhancedTool(definition.name, input, context);
      },
    });
  }

  /**
   * Execute an enhanced tool with progress tracking and user feedback
   */
  async executeEnhancedTool(
    name: string,
    input: any,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const toolDef = this.enhancedTools.get(name);
    if (!toolDef) {
      throw new ToolExecutionError(
        name,
        context.toolCallId,
        ToolErrorType.UNKNOWN_TOOL,
        `Enhanced tool '${name}' is not registered`
      );
    }

    // Initialize progress tracking
    const progress: ToolExecutionProgress = {
      toolCallId: context.toolCallId,
      toolName: name,
      displayName: toolDef.displayName,
      status: ToolExecutionStatus.PENDING,
      progress: 0,
      message: `Preparing to ${toolDef.userDescription.toLowerCase()}...`,
      startTime: new Date(),
      estimatedCompletion: toolDef.estimatedDuration
        ? new Date(Date.now() + toolDef.estimatedDuration)
        : undefined,
    };

    this.executionProgress.set(context.toolCallId, progress);
    this.notifyProgress(progress);

    // Start analytics tracking
    analyticsCollector.logToolExecutionStart(
      name,
      context.toolCallId,
      context,
      input
    );

    try {
      // Update progress to executing
      progress.status = ToolExecutionStatus.EXECUTING;
      progress.progress = 10;
      progress.message = `${toolDef.displayName} is working on your request...`;
      this.notifyProgress(progress);

      // Validate safety constraints
      if (!this.validateSafety(name, context)) {
        const error = new ToolExecutionError(
          name,
          context.toolCallId,
          ToolErrorType.PERMISSION_DENIED,
          `Tool execution blocked by safety constraints for '${name}'`
        );

        progress.status = ToolExecutionStatus.FAILED;
        progress.message = 'Request blocked for security reasons';
        this.notifyProgress(progress);

        analyticsCollector.logToolExecutionError(
          context.toolCallId,
          ToolErrorType.PERMISSION_DENIED,
          error.message
        );
        throw error;
      }

      // Evaluate safety constraints for potentially destructive actions
      const safetyEvaluation = await this.evaluateToolSafety(
        name,
        validationResult.data,
        context
      );

      if (safetyEvaluation.requiresConfirmation) {
        // Update progress to show confirmation needed
        progress.status = ToolExecutionStatus.PENDING;
        progress.message = `${toolDef.displayName} requires confirmation: ${safetyEvaluation.warningMessage}`;
        this.notifyProgress(progress);

        logger.info('Enhanced tool requires user confirmation', {
          toolName: name,
          displayName: toolDef.displayName,
          toolCallId: context.toolCallId,
          safetyLevel: safetyEvaluation.safetyLevel,
          warningMessage: safetyEvaluation.warningMessage,
          affectedElements: safetyEvaluation.affectedElements,
        });

        // TODO: Implement actual confirmation flow
        // For now, we'll allow execution but log the safety evaluation
        progress.status = ToolExecutionStatus.EXECUTING;
        progress.message = `${toolDef.displayName} is processing your changes...`;
        this.notifyProgress(progress);
      }

      // Validate input against schema
      const validationResult = toolDef.inputSchema.safeParse(input);
      if (!validationResult.success) {
        const error = new ToolExecutionError(
          name,
          context.toolCallId,
          ToolErrorType.VALIDATION_ERROR,
          `Invalid input for ${toolDef.displayName}: ${validationResult.error.message}`,
          validationResult.error.issues
        );

        progress.status = ToolExecutionStatus.FAILED;
        progress.message = 'Invalid request parameters';
        this.notifyProgress(progress);

        analyticsCollector.logToolExecutionError(
          context.toolCallId,
          ToolErrorType.VALIDATION_ERROR,
          error.message,
          validationResult.error.issues
        );
        throw error;
      }

      // Update progress to mid-execution
      progress.progress = 50;
      progress.message = `${toolDef.displayName} is processing your changes...`;
      this.notifyProgress(progress);

      logger.info('Executing enhanced tool', {
        toolName: name,
        displayName: toolDef.displayName,
        toolCallId: context.toolCallId,
        userId: context.userId,
        conversationId: context.conversationId,
      });

      // Execute the tool with timeout
      const result = await this.executeWithTimeout(
        toolDef.execute(validationResult.data, context),
        toolDef.timeout || 30000
      );

      // Wrap result in ToolExecutionResult format if not already
      const executionResult: ToolExecutionResult = this.normalizeResult(
        result,
        toolDef
      );

      // Update progress to completed
      progress.status = ToolExecutionStatus.COMPLETED;
      progress.progress = 100;
      progress.message = executionResult.userFeedback;
      this.notifyProgress(progress);

      logger.info('Enhanced tool execution completed', {
        toolName: name,
        displayName: toolDef.displayName,
        toolCallId: context.toolCallId,
        success: executionResult.success,
        previewRefreshNeeded: executionResult.previewRefreshNeeded,
      });

      // Log successful execution
      analyticsCollector.logToolExecutionSuccess(
        context.toolCallId,
        executionResult,
        executionResult.changedFiles
      );

      return executionResult;
    } catch (error) {
      // Update progress to failed
      progress.status = ToolExecutionStatus.FAILED;
      progress.message = this.getUserFriendlyErrorMessage(error, toolDef);
      this.notifyProgress(progress);

      logger.error('Enhanced tool execution failed', {
        toolName: name,
        displayName: toolDef.displayName,
        toolCallId: context.toolCallId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Log error if not already logged
      if (!(error instanceof ToolExecutionError)) {
        analyticsCollector.logToolExecutionError(
          context.toolCallId,
          ToolErrorType.EXECUTION_ERROR,
          error instanceof Error ? error.message : 'Unknown execution error',
          error
        );

        // Wrap other errors
        throw new ToolExecutionError(
          name,
          context.toolCallId,
          ToolErrorType.EXECUTION_ERROR,
          error instanceof Error ? error.message : 'Unknown execution error',
          error
        );
      }

      // Re-throw ToolExecutionError as-is (already logged)
      throw error;
    } finally {
      // Clean up progress tracking after a delay
      setTimeout(() => {
        this.executionProgress.delete(context.toolCallId);
      }, 30000); // Keep progress for 30 seconds after completion
    }
  }

  /**
   * Get current execution progress for a tool call
   */
  getExecutionProgress(toolCallId: string): ToolExecutionProgress | undefined {
    return this.executionProgress.get(toolCallId);
  }

  /**
   * Subscribe to progress updates for a tool call
   */
  subscribeToProgress(
    toolCallId: string,
    callback: (progress: ToolExecutionProgress) => void
  ): void {
    this.progressCallbacks.set(toolCallId, callback);
  }

  /**
   * Unsubscribe from progress updates
   */
  unsubscribeFromProgress(toolCallId: string): void {
    this.progressCallbacks.delete(toolCallId);
  }

  /**
   * Get all enhanced tools available for a context
   */
  getAvailableEnhancedTools(
    context: ToolExecutionContext
  ): Record<string, ReturnType<typeof tool>> {
    const availableTools: Record<string, ReturnType<typeof tool>> = {};

    for (const [name, definition] of this.enhancedTools) {
      if (this.validateSafety(name, context)) {
        availableTools[name] = this.createAISDKToolWithContextInjection(
          definition,
          context
        );
      }
    }

    return availableTools;
  }

  /**
   * Get enhanced tool definition by name
   */
  getEnhancedToolDefinition(name: string): EnhancedToolDefinition | undefined {
    return this.enhancedTools.get(name);
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: ToolCategory): EnhancedToolDefinition[] {
    return Array.from(this.enhancedTools.values()).filter(
      tool => tool.category === category
    );
  }

  /**
   * Wrap an existing AI SDK tool with enhanced functionality
   */
  wrapAISDKTool<T extends z.ZodSchema>(
    aiTool: ReturnType<typeof tool<T>>,
    metadata: ToolMetadata & {
      name: string;
      displayName: string;
      category: ToolCategory;
      userDescription: string;
      safetyLevel: SafetyLevel;
    }
  ): ReturnType<typeof tool<T>> {
    return tool({
      description: aiTool.description,
      parameters: aiTool.parameters,
      execute: async (input, context) => {
        const executionContext: ToolExecutionContext = {
          userId: 'system',
          conversationId: 'unknown',
          toolCallId: context.toolCallId,
        };

        // Create progress tracking for wrapped tool
        const progress: ToolExecutionProgress = {
          toolCallId: context.toolCallId,
          toolName: metadata.name,
          displayName: metadata.displayName,
          status: ToolExecutionStatus.EXECUTING,
          progress: 50,
          message: `${metadata.displayName} is working...`,
          startTime: new Date(),
        };

        this.executionProgress.set(context.toolCallId, progress);
        this.notifyProgress(progress);

        try {
          // Validate safety
          if (!this.validateSafety(metadata.name, executionContext)) {
            throw new ToolExecutionError(
              metadata.name,
              context.toolCallId,
              ToolErrorType.PERMISSION_DENIED,
              `Tool execution blocked by safety constraints for '${metadata.name}'`
            );
          }

          const result = await aiTool.execute(input, context);

          // Update progress to completed
          progress.status = ToolExecutionStatus.COMPLETED;
          progress.progress = 100;
          progress.message = `${metadata.displayName} completed successfully`;
          this.notifyProgress(progress);

          return result;
        } catch (error) {
          progress.status = ToolExecutionStatus.FAILED;
          progress.message = `${metadata.displayName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          this.notifyProgress(progress);
          throw error;
        }
      },
    });
  }

  /**
   * Private helper methods
   */

  private validateEnhancedToolDefinition(
    definition: EnhancedToolDefinition
  ): void {
    if (!definition.name || typeof definition.name !== 'string') {
      throw new Error('Tool name is required and must be a string');
    }

    if (!definition.displayName || typeof definition.displayName !== 'string') {
      throw new Error('Tool displayName is required and must be a string');
    }

    if (
      !definition.userDescription ||
      typeof definition.userDescription !== 'string'
    ) {
      throw new Error('Tool userDescription is required and must be a string');
    }

    if (!Object.values(ToolCategory).includes(definition.category)) {
      throw new Error('Tool category must be a valid ToolCategory');
    }

    if (
      !definition.safetyLevel ||
      !['safe', 'potentially_destructive'].includes(definition.safetyLevel)
    ) {
      throw new Error(
        'Tool safetyLevel is required and must be "safe" or "potentially_destructive"'
      );
    }

    if (!definition.metadata || !definition.metadata.version) {
      throw new Error('Tool metadata with version is required');
    }

    if (this.enhancedTools.has(definition.name)) {
      throw new Error(
        `Enhanced tool '${definition.name}' is already registered`
      );
    }
  }

  private validateSafety(
    toolName: string,
    context: ToolExecutionContext
  ): boolean {
    const toolDef = this.enhancedTools.get(toolName);
    if (!toolDef) {
      return false;
    }

    const executionContext: ExecutionContext = {
      userId: context.userId,
      conversationId: context.conversationId,
      toolCallId: context.toolCallId,
    };

    const result = securitySystem.validateToolSafety(
      toolName,
      toolDef.category,
      OperationType.EXECUTE,
      executionContext
    );

    return result.allowed;
  }

  /**
   * Evaluate safety constraints for an enhanced tool execution
   */
  private async evaluateToolSafety(
    toolName: string,
    parameters: any,
    context: ToolExecutionContext,
    overrideOptions?: {
      forceConfirmation?: boolean;
      skipConfirmation?: boolean;
      customWarning?: string;
    }
  ): Promise<import('./safetyConstraintSystem.js').SafetyEvaluation> {
    const toolDef = this.enhancedTools.get(toolName);
    if (!toolDef) {
      throw new Error(`Enhanced tool '${toolName}' not found`);
    }

    const safetyContext = {
      userId: context.userId,
      conversationId: context.conversationId,
      toolCallId: context.toolCallId,
      timestamp: new Date(),
    };

    // Convert SafetyLevel to SafetyConstraintLevel
    const constraintSafetyLevel =
      toolDef.safetyLevel === 'safe'
        ? SafetyConstraintLevel.SAFE
        : SafetyConstraintLevel.POTENTIALLY_DESTRUCTIVE;

    return await safetyConstraintSystem.evaluateAction(
      toolName,
      parameters,
      safetyContext,
      constraintSafetyLevel,
      overrideOptions
    );
  }

  private async executeWithTimeout<T>(
    promise: Promise<T> | T,
    timeoutMs: number
  ): Promise<T> {
    if (!(promise instanceof Promise)) {
      return promise;
    }

    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Tool execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private normalizeResult(
    result: any,
    toolDef: EnhancedToolDefinition
  ): ToolExecutionResult {
    // If result is already a ToolExecutionResult, return as-is
    if (
      result &&
      typeof result === 'object' &&
      'success' in result &&
      'userFeedback' in result
    ) {
      return result as ToolExecutionResult;
    }

    // Otherwise, wrap the result
    return {
      success: true,
      data: result,
      userFeedback: `${toolDef.displayName} completed successfully`,
      previewRefreshNeeded: false,
      technicalDetails: result,
    };
  }

  private getUserFriendlyErrorMessage(
    error: any,
    toolDef: EnhancedToolDefinition
  ): string {
    if (error instanceof ToolExecutionError) {
      switch (error.errorType) {
        case ToolErrorType.PERMISSION_DENIED:
          return `Sorry, I can't ${toolDef.userDescription.toLowerCase()} due to security restrictions`;
        case ToolErrorType.VALIDATION_ERROR:
          return `The request for ${toolDef.displayName} has invalid parameters`;
        case ToolErrorType.TIMEOUT_ERROR:
          return `${toolDef.displayName} is taking too long to respond`;
        case ToolErrorType.RATE_LIMIT_ERROR:
          return `Please wait a moment before using ${toolDef.displayName} again`;
        default:
          return `${toolDef.displayName} encountered an error`;
      }
    }

    return `${toolDef.displayName} couldn't complete the request`;
  }

  private notifyProgress(progress: ToolExecutionProgress): void {
    const callback = this.progressCallbacks.get(progress.toolCallId);
    if (callback) {
      callback(progress);
    }

    // Also log progress for debugging
    logger.debug('Tool execution progress', {
      toolCallId: progress.toolCallId,
      toolName: progress.toolName,
      displayName: progress.displayName,
      status: progress.status,
      progress: progress.progress,
      message: progress.message,
    });
  }

  private createAISDKToolWithContextInjection(
    definition: EnhancedToolDefinition,
    baseContext: ToolExecutionContext
  ): ReturnType<typeof tool> {
    return tool({
      description: definition.description,
      parameters: definition.inputSchema,
      execute: async (input, { toolCallId }) => {
        const context: ToolExecutionContext = {
          ...baseContext,
          toolCallId,
        };

        return await this.executeEnhancedTool(definition.name, input, context);
      },
    });
  }

  /**
   * Get statistics about enhanced tools
   */
  getStats(): {
    totalEnhancedTools: number;
    toolsByCategory: Record<string, number>;
    activeExecutions: number;
  } {
    const toolsByCategory: Record<string, number> = {};

    for (const tool of this.enhancedTools.values()) {
      toolsByCategory[tool.category] =
        (toolsByCategory[tool.category] || 0) + 1;
    }

    return {
      totalEnhancedTools: this.enhancedTools.size,
      toolsByCategory,
      activeExecutions: this.executionProgress.size,
    };
  }

  /**
   * Clear all enhanced tools (for testing)
   */
  clearEnhancedTools(): void {
    this.enhancedTools.clear();
    this.executionProgress.clear();
    this.progressCallbacks.clear();
    logger.debug('All enhanced tools cleared');
  }
}

// Export singleton instance
export const enhancedToolRegistry = new EnhancedToolRegistry();
