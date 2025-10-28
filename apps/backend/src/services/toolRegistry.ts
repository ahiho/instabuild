import {
  EnhancedToolDefinition,
  ToolRegistry as IToolRegistry,
  SafetyLevel,
  ToolCategory,
  ToolDefinition,
  ToolErrorType,
  ToolExecutionContext,
  ToolExecutionError,
  ToolMetadata,
  ToolRegistrationOptions,
} from '@instabuild/shared/types';
import { tool } from 'ai';
import { z } from 'zod';
import { logger } from '../lib/logger.js';
import { analyticsCollector } from './analyticsCollector.js';
import { enhancedToolRegistry } from './enhancedToolRegistry.js';
// Permission system removed - using safety constraints instead
import {
  SafetyLevel as SafetyConstraintLevel,
  safetyConstraintSystem,
} from './safetyConstraintSystem.js';
import {
  ExecutionContext,
  OperationType,
  securitySystem,
  ToolCategory as SecurityToolCategory,
} from './securitySystem.js';

/**
 * Rate limiting tracker for tools
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Implementation of the Tool Registry for managing and executing tools
 */
export class ToolRegistry implements IToolRegistry {
  private tools = new Map<string, ToolDefinition>();
  private rateLimitMap = new Map<string, RateLimitEntry>();
  private safetyLevels = new Map<string, SafetyLevel>();

  /**
   * Unregister a tool from the registry
   */
  unregisterTool(name: string): boolean {
    const wasRegistered = this.tools.has(name);
    this.tools.delete(name);
    this.safetyLevels.delete(name);

    if (wasRegistered) {
      logger.info('Tool unregistered successfully', {
        toolName: name,
      });
    }

    return wasRegistered;
  }

  /**
   * Register a new tool with the registry
   */
  registerTool<T>(
    definition: ToolDefinition<T>,
    options: ToolRegistrationOptions = {}
  ): void {
    try {
      // Validate tool definition
      this.validateToolDefinition(definition);

      // Determine safety level
      const safetyLevel =
        options.safetyLevel || definition.safetyLevel || 'safe';

      // Store the tool definition
      this.tools.set(definition.name, {
        ...definition,
        safetyLevel,
        timeout: options.timeout || definition.timeout || 30000, // 30s default
      });

      // Store safety level
      this.safetyLevels.set(definition.name, safetyLevel);

      logger.info('Tool registered successfully', {
        toolName: definition.name,
        safetyLevel,
        timeout: options.timeout,
      });
    } catch (error) {
      logger.error('Failed to register tool', {
        toolName: definition.name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Unregister an enhanced tool from the registry
   */
  unregisterEnhancedTool(name: string): boolean {
    const wasRegistered = this.tools.has(name);
    this.unregisterTool(name);

    // Also unregister from enhanced registry
    enhancedToolRegistry.unregisterEnhancedTool(name);

    return wasRegistered;
  }

  /**
   * Register an enhanced tool with user-friendly metadata
   */
  registerEnhancedTool<T>(definition: EnhancedToolDefinition<T>): void {
    // Validate that enhanced tool has safety level
    if (!definition.safetyLevel) {
      throw new Error(
        `Enhanced tool '${definition.name}' must specify a safetyLevel`
      );
    }

    // Register with enhanced registry
    enhancedToolRegistry.registerEnhancedTool(definition);

    // Also register as regular tool for backward compatibility
    this.registerTool(definition);
  }

  /**
   * Get all registered tools in Vercel AI SDK format
   * Returns all tools without permission filtering
   */
  getTools(): Record<string, any> {
    const tools: Record<string, any> = {};

    // Return all registered tools - no permission filtering needed
    for (const [name, definition] of this.tools) {
      tools[name] = this.createAISDKTool(definition);
    }

    return tools;
  }

  /**
   * Create an AI SDK tool from our tool definition
   */
  private createAISDKTool(definition: ToolDefinition): any {
    // Use the AI SDK's tool function with inputSchema (v5.0 format)
    return tool({
      description: definition.description,
      inputSchema: definition.inputSchema,
      execute: async (input: any, context: { toolCallId: string }) => {
        const executionContext: ToolExecutionContext = {
          userId: 'system', // Will be set properly when we have user context
          conversationId: 'unknown',
          toolCallId: context.toolCallId,
        };

        return await this.executeTool(definition.name, input, executionContext);
      },
    });
  }

  /**
   * Execute a tool with the given input and context
   */
  async executeTool(
    name: string,
    input: any,
    context: ToolExecutionContext
  ): Promise<any> {
    // Start analytics tracking
    analyticsCollector.logToolExecutionStart(
      name,
      context.toolCallId,
      context,
      input
    );

    try {
      // Check if tool exists
      const toolDef = this.tools.get(name);
      if (!toolDef) {
        const error = new ToolExecutionError(
          name,
          context.toolCallId,
          ToolErrorType.UNKNOWN_TOOL,
          `Tool '${name}' is not registered`
        );
        analyticsCollector.logToolExecutionError(
          context.toolCallId,
          ToolErrorType.UNKNOWN_TOOL,
          error.message
        );
        throw error;
      }

      // Validate safety constraints
      if (!this.validateSafety(name, context)) {
        const error = new ToolExecutionError(
          name,
          context.toolCallId,
          ToolErrorType.PERMISSION_DENIED,
          `Tool execution blocked by safety constraints for '${name}'`
        );
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
        input,
        context
      );

      if (safetyEvaluation.requiresConfirmation) {
        // For now, log that confirmation would be required
        // In a full implementation, this would trigger the confirmation flow
        logger.info('Tool requires user confirmation', {
          toolName: name,
          toolCallId: context.toolCallId,
          safetyLevel: safetyEvaluation.safetyLevel,
          warningMessage: safetyEvaluation.warningMessage,
          affectedElements: safetyEvaluation.affectedElements,
        });

        // TODO: Implement actual confirmation flow
        // For now, we'll allow execution but log the safety evaluation
      }

      // Check rate limits
      if (!this.checkRateLimit(name, context)) {
        const error = new ToolExecutionError(
          name,
          context.toolCallId,
          ToolErrorType.RATE_LIMIT_ERROR,
          `Rate limit exceeded for tool '${name}'`
        );
        analyticsCollector.logToolExecutionError(
          context.toolCallId,
          ToolErrorType.RATE_LIMIT_ERROR,
          error.message
        );
        throw error;
      }

      // Validate input against schema
      const validationResult = toolDef.inputSchema.safeParse(input);
      if (!validationResult.success) {
        const error = new ToolExecutionError(
          name,
          context.toolCallId,
          ToolErrorType.VALIDATION_ERROR,
          `Invalid input for tool '${name}': ${validationResult.error.message}`,
          validationResult.error.issues
        );
        analyticsCollector.logToolExecutionError(
          context.toolCallId,
          ToolErrorType.VALIDATION_ERROR,
          error.message,
          validationResult.error.issues
        );
        throw error;
      }

      logger.info('Executing tool', {
        toolName: name,
        toolCallId: context.toolCallId,
        userId: context.userId,
        conversationId: context.conversationId,
      });

      // Execute the tool with timeout
      const result = await this.executeWithTimeout(
        toolDef.execute(validationResult.data, context),
        toolDef.timeout || 30000
      );

      logger.info('Tool execution completed', {
        toolName: name,
        toolCallId: context.toolCallId,
      });

      // Log successful execution
      analyticsCollector.logToolExecutionSuccess(context.toolCallId, result);

      return result;
    } catch (error) {
      logger.error('Tool execution failed', {
        toolName: name,
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
    }
  }

  /**
   * Validate if a tool operation is safe to execute
   * Now uses only safety constraints without permission filtering
   */
  validateSafety(toolName: string, context: ToolExecutionContext): boolean {
    // Get tool definition to determine category
    const toolDef = this.tools.get(toolName);
    if (!toolDef) {
      return false; // Tool doesn't exist
    }

    // Determine tool category (this would be set during tool registration)
    const toolCategory = this.getToolCategory(toolName);

    // Create execution context for security system
    const executionContext: ExecutionContext = {
      userId: context.userId,
      conversationId: context.conversationId,
      toolCallId: context.toolCallId,
    };

    // Check safety using the security system only (no permission checks)
    const securityResult = securitySystem.validateToolSafety(
      toolName,
      toolCategory,
      OperationType.EXECUTE,
      executionContext
    );

    if (!securityResult.allowed) {
      logger.debug('Tool safety validation failed', {
        toolName,
        userId: context.userId,
        reason: securityResult.reason,
      });
      return false;
    }

    logger.debug('Tool safety validation passed', {
      toolName,
      userId: context.userId,
      securityAllowed: securityResult.allowed,
    });

    return true; // All tools are allowed if they pass safety constraints
  }

  /**
   * Evaluate safety constraints for a tool execution
   * This integrates with the Safety Constraint System
   */
  async evaluateToolSafety(
    toolName: string,
    parameters: any,
    context: ToolExecutionContext,
    overrideOptions?: {
      forceConfirmation?: boolean;
      skipConfirmation?: boolean;
      customWarning?: string;
    }
  ): Promise<import('./safetyConstraintSystem.js').SafetyEvaluation> {
    const toolSafetyLevel = this.getToolSafetyLevel(toolName);
    const safetyContext = {
      userId: context.userId,
      conversationId: context.conversationId,
      toolCallId: context.toolCallId,
      timestamp: new Date(),
    };

    // Convert SafetyLevel to SafetyConstraintLevel
    const constraintSafetyLevel =
      toolSafetyLevel === 'safe'
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

  // User role and permission mapping methods removed - no longer needed

  /**
   * Enhanced safety validation with context
   */
  validateSafetyWithContext(
    toolName: string,
    executionContext: ExecutionContext,
    resourcePath?: string
  ): boolean {
    const toolDef = this.tools.get(toolName);
    if (!toolDef) {
      return false;
    }

    const toolCategory = this.getToolCategory(toolName);
    const contextWithResource = {
      ...executionContext,
      resourcePath,
    };

    const result = securitySystem.validateToolSafety(
      toolName,
      toolCategory,
      OperationType.EXECUTE,
      contextWithResource
    );

    return result.allowed;
  }

  /**
   * Get tool category based on tool name (basic implementation)
   */
  private getToolCategory(toolName: string): SecurityToolCategory {
    // This is a simple mapping - in production, this would be stored with the tool definition
    if (
      toolName.includes('file') ||
      toolName.includes('read') ||
      toolName.includes('write')
    ) {
      return SecurityToolCategory.FILE_SYSTEM;
    }
    if (toolName.includes('page') || toolName.includes('element')) {
      return SecurityToolCategory.LANDING_PAGE;
    }
    if (toolName.includes('upload') || toolName.includes('image')) {
      return SecurityToolCategory.UPLOAD;
    }
    if (toolName.includes('api') || toolName.includes('fetch')) {
      return SecurityToolCategory.EXTERNAL_API;
    }
    if (toolName.includes('analytics') || toolName.includes('stats')) {
      return SecurityToolCategory.ANALYTICS;
    }
    return SecurityToolCategory.UTILITY;
  }

  /**
   * Check if a tool is registered
   */
  isToolRegistered(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get the safety level for a tool
   */
  getToolSafetyLevel(toolName: string): SafetyLevel | undefined {
    return this.safetyLevels.get(toolName);
  }

  /**
   * Get tool definition by name
   */
  getToolDefinition(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool would require confirmation without executing it
   */
  wouldRequireConfirmation(toolName: string, parameters: any): boolean {
    const toolSafetyLevel = this.getToolSafetyLevel(toolName);
    const constraintSafetyLevel =
      toolSafetyLevel === 'safe'
        ? SafetyConstraintLevel.SAFE
        : SafetyConstraintLevel.POTENTIALLY_DESTRUCTIVE;

    return safetyConstraintSystem.wouldRequireConfirmation(
      toolName,
      parameters,
      constraintSafetyLevel
    );
  }

  /**
   * Validate tool definition structure
   */
  private validateToolDefinition(definition: ToolDefinition): void {
    if (!definition.name || typeof definition.name !== 'string') {
      throw new Error('Tool name is required and must be a string');
    }

    if (!definition.description || typeof definition.description !== 'string') {
      throw new Error('Tool description is required and must be a string');
    }

    if (!definition.inputSchema) {
      throw new Error('Tool input schema is required');
    }

    if (!definition.execute || typeof definition.execute !== 'function') {
      throw new Error('Tool execute function is required');
    }

    // Validate safety level if provided
    if (
      definition.safetyLevel &&
      !['safe', 'potentially_destructive'].includes(definition.safetyLevel)
    ) {
      throw new Error(
        `Tool safety level must be 'safe' or 'potentially_destructive', got '${definition.safetyLevel}'`
      );
    }

    // Check for duplicate registration
    if (this.tools.has(definition.name)) {
      throw new Error(`Tool '${definition.name}' is already registered`);
    }
  }

  /**
   * Check rate limits for tool execution
   */
  private checkRateLimit(
    toolName: string,
    context: ToolExecutionContext
  ): boolean {
    const toolDef = this.tools.get(toolName);
    if (!toolDef?.rateLimitKey) {
      return true; // No rate limiting configured
    }

    const rateLimitKey = `${toolName}:${context.userId}`;
    const now = Date.now();
    const entry = this.rateLimitMap.get(rateLimitKey);

    // Default rate limit: 10 requests per minute
    const windowMs = 60000;
    const maxRequests = 10;

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.rateLimitMap.set(rateLimitKey, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (entry.count >= maxRequests) {
      return false; // Rate limit exceeded
    }

    // Increment counter
    entry.count++;
    return true;
  }

  /**
   * Execute a promise with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T> | T,
    timeoutMs: number
  ): Promise<T> {
    // If it's not a promise, return immediately
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

  /**
   * Clear rate limit entries (for testing/maintenance)
   */
  clearRateLimits(): void {
    this.rateLimitMap.clear();
  }

  /**
   * Get tool statistics
   */
  getStats(): {
    totalTools: number;
    toolNames: string[];
    rateLimitEntries: number;
  } {
    return {
      totalTools: this.tools.size,
      toolNames: Array.from(this.tools.keys()),
      rateLimitEntries: this.rateLimitMap.size,
    };
  }

  /**
   * Get available tools for a specific user context
   * Now returns all tools without permission filtering
   */
  getAvailableTools(context: ToolExecutionContext): Record<string, any> {
    const availableTools: Record<string, any> = {};

    // Return all registered tools - no permission filtering
    for (const [name, definition] of this.tools) {
      availableTools[name] = this.createAISDKToolWithContext(
        definition,
        context
      );
    }

    return availableTools;
  }

  /**
   * Create an AI SDK tool with proper context injection
   */
  private createAISDKToolWithContext(
    definition: ToolDefinition,
    baseContext: ToolExecutionContext
  ): any {
    return tool({
      description: definition.description,
      inputSchema: definition.inputSchema,
      execute: async (input: any, context: { toolCallId: string }) => {
        const executionContext: ToolExecutionContext = {
          ...baseContext,
          toolCallId: context.toolCallId,
        };

        // Log tool execution start
        logger.info('AI SDK tool execution started', {
          toolName: definition.name,
          toolCallId: context.toolCallId,
          userId: executionContext.userId,
          conversationId: executionContext.conversationId,
        });

        try {
          const result = await this.executeTool(
            definition.name,
            input,
            executionContext
          );

          // Log successful execution
          logger.info('AI SDK tool execution completed', {
            toolName: definition.name,
            toolCallId: context.toolCallId,
            success: true,
          });

          return result;
        } catch (error) {
          // Log failed execution
          logger.error('AI SDK tool execution failed', {
            toolName: definition.name,
            toolCallId: context.toolCallId,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },
    });
  }

  /**
   * Wrap an existing AI SDK tool with our enhanced functionality
   */
  wrapAISDKTool(
    aiTool: any,
    metadata: {
      name: string;
      permissions?: string[];
      timeout?: number;
      rateLimitKey?: string;
    }
  ): any {
    return {
      description: aiTool.description || `Enhanced ${metadata.name}`,
      parameters: aiTool.parameters || aiTool.inputSchema || z.object({}),
      execute: async (input: any, context: any) => {
        const executionContext: ToolExecutionContext = {
          userId: 'system', // Will be properly set when we have user context
          conversationId: 'unknown',
          toolCallId: context.toolCallId,
        };

        // Validate safety constraints
        if (!this.validateSafety(metadata.name, executionContext)) {
          throw new ToolExecutionError(
            metadata.name,
            context.toolCallId,
            ToolErrorType.PERMISSION_DENIED,
            `Tool execution blocked by safety constraints for '${metadata.name}'`
          );
        }

        // Check rate limits
        if (
          metadata.rateLimitKey &&
          !this.checkRateLimit(metadata.name, executionContext)
        ) {
          throw new ToolExecutionError(
            metadata.name,
            context.toolCallId,
            ToolErrorType.RATE_LIMIT_ERROR,
            `Rate limit exceeded for tool '${metadata.name}'`
          );
        }

        // Execute with timeout and logging
        const startTime = Date.now();
        logger.info('Wrapped AI SDK tool execution started', {
          toolName: metadata.name,
          toolCallId: context.toolCallId,
        });

        try {
          const result = await this.executeWithTimeout(
            aiTool.execute?.(input, context) || Promise.resolve({}),
            metadata.timeout || 30000
          );

          const executionTime = Date.now() - startTime;
          logger.info('Wrapped AI SDK tool execution completed', {
            toolName: metadata.name,
            toolCallId: context.toolCallId,
            executionTime,
          });

          return result;
        } catch (error) {
          const executionTime = Date.now() - startTime;
          logger.error('Wrapped AI SDK tool execution failed', {
            toolName: metadata.name,
            toolCallId: context.toolCallId,
            executionTime,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },
    };
  }

  /**
   * Wrap an AI SDK tool with enhanced functionality including user feedback
   */
  wrapTool(
    aiTool: any,
    metadata: ToolMetadata & {
      displayName: string;
      category: ToolCategory;
      userDescription: string;
      name: string;
      safetyLevel: SafetyLevel;
    }
  ): any {
    return enhancedToolRegistry.wrapAISDKTool(aiTool, metadata);
  }

  /**
   * Get enhanced tool definition
   */
  getEnhancedToolDefinition(name: string): EnhancedToolDefinition | undefined {
    return enhancedToolRegistry.getEnhancedToolDefinition(name);
  }
}

// Export singleton instance
export const toolRegistry = new ToolRegistry();
