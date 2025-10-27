import {
  ToolRegistry as IToolRegistry,
  ToolDefinition,
  ToolErrorType,
  ToolExecutionContext,
  ToolExecutionError,
  ToolRegistrationOptions,
} from '@instabuild/shared/types';
import { logger } from '../lib/logger.js';

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
  private permissions = new Map<string, string[]>();

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

      // Store the tool definition
      this.tools.set(definition.name, {
        ...definition,
        permissions: options.permissions || definition.permissions,
        timeout: options.timeout || definition.timeout || 30000, // 30s default
      });

      // Store permissions if provided
      if (options.permissions) {
        this.permissions.set(definition.name, options.permissions);
      }

      logger.info('Tool registered successfully', {
        toolName: definition.name,
        permissions: options.permissions,
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
   * Get all registered tools in Vercel AI SDK format
   * Note: This will return a simplified format for now, will be enhanced in later tasks
   */
  getTools(): Record<string, any> {
    const tools: Record<string, any> = {};

    for (const [name, definition] of this.tools) {
      tools[name] = {
        description: definition.description,
        parameters: this.zodSchemaToJsonSchema(definition.inputSchema),
      };
    }

    return tools;
  }

  /**
   * Execute a tool with the given input and context
   */
  async executeTool(
    name: string,
    input: any,
    context: ToolExecutionContext
  ): Promise<any> {
    const startTime = Date.now();

    try {
      // Check if tool exists
      const toolDef = this.tools.get(name);
      if (!toolDef) {
        throw new ToolExecutionError(
          name,
          context.toolCallId,
          ToolErrorType.UNKNOWN_TOOL,
          `Tool '${name}' is not registered`
        );
      }

      // Validate permissions
      if (!this.validatePermissions(name, context.userId)) {
        throw new ToolExecutionError(
          name,
          context.toolCallId,
          ToolErrorType.PERMISSION_DENIED,
          `User does not have permission to execute tool '${name}'`
        );
      }

      // Check rate limits
      if (!this.checkRateLimit(name, context)) {
        throw new ToolExecutionError(
          name,
          context.toolCallId,
          ToolErrorType.RATE_LIMIT_ERROR,
          `Rate limit exceeded for tool '${name}'`
        );
      }

      // Validate input against schema
      const validationResult = toolDef.inputSchema.safeParse(input);
      if (!validationResult.success) {
        throw new ToolExecutionError(
          name,
          context.toolCallId,
          ToolErrorType.VALIDATION_ERROR,
          `Invalid input for tool '${name}': ${validationResult.error.message}`,
          validationResult.error.issues
        );
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

      const executionTime = Date.now() - startTime;
      logger.info('Tool execution completed', {
        toolName: name,
        toolCallId: context.toolCallId,
        executionTime,
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error('Tool execution failed', {
        toolName: name,
        toolCallId: context.toolCallId,
        executionTime,
        error: error instanceof Error ? error.message : String(error),
      });

      // Re-throw ToolExecutionError as-is
      if (error instanceof ToolExecutionError) {
        throw error;
      }

      // Wrap other errors
      throw new ToolExecutionError(
        name,
        context.toolCallId,
        ToolErrorType.EXECUTION_ERROR,
        error instanceof Error ? error.message : 'Unknown execution error',
        error
      );
    }
  }

  /**
   * Validate if a user has permission to execute a tool
   */
  validatePermissions(toolName: string, userId: string): boolean {
    const toolPermissions = this.permissions.get(toolName);

    // If no permissions are required, allow execution
    if (!toolPermissions || toolPermissions.length === 0) {
      return true;
    }

    // For now, we'll implement a basic permission check
    // In a real implementation, this would check against user roles/permissions
    // For the MVP, we'll allow all authenticated users
    return Boolean(userId && userId.length > 0);
  }

  /**
   * Check if a tool is registered
   */
  isToolRegistered(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get tool definition by name
   */
  getToolDefinition(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
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
   * Convert Zod schema to JSON Schema (simplified)
   * This is a basic implementation - in production, you'd use a proper converter
   */
  private zodSchemaToJsonSchema(_schema: any): any {
    // This is a simplified conversion for the MVP
    // In a real implementation, you'd use a library like zod-to-json-schema
    return {
      type: 'object',
      properties: {},
      additionalProperties: true,
    };
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
}

// Export singleton instance
export const toolRegistry = new ToolRegistry();
