import { z } from 'zod';

/**
 * Context provided to tools during execution
 */
export interface ToolExecutionContext {
  userId: string;
  conversationId: string;
  toolCallId: string;
  pageId?: string;
  selectedElementId?: string;
}

/**
 * Definition of a tool that can be registered and executed
 */
export interface ToolDefinition<T = any> {
  name: string;
  description: string;
  inputSchema: z.ZodSchema<T>;
  execute: (input: T, context: ToolExecutionContext) => Promise<any> | any;
  permissions?: string[];
  timeout?: number;
  rateLimitKey?: string;
}

/**
 * Registry interface for managing tools
 */
export interface ToolRegistry {
  registerTool<T>(definition: ToolDefinition<T>): void;
  getTools(): Record<string, any>; // Will be VercelAITool when we integrate
  executeTool(
    name: string,
    input: any,
    context: ToolExecutionContext
  ): Promise<any>;
  validatePermissions(toolName: string, userId: string): boolean;
  isToolRegistered(name: string): boolean;
  getToolDefinition(name: string): ToolDefinition | undefined;
}

/**
 * Error types for tool execution
 */
export enum ToolErrorType {
  VALIDATION_ERROR = 'validation_error',
  PERMISSION_DENIED = 'permission_denied',
  EXECUTION_ERROR = 'execution_error',
  TIMEOUT_ERROR = 'timeout_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  UNKNOWN_TOOL = 'unknown_tool',
}

/**
 * Structured error information for tool failures
 */
export interface ToolError {
  type: ToolErrorType;
  message: string;
  details?: any;
  retryable: boolean;
}

/**
 * Custom error class for tool execution failures
 */
export class ToolExecutionError extends Error {
  constructor(
    public toolName: string,
    public toolCallId: string,
    public errorType: ToolErrorType,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ToolExecutionError';
  }

  toToolError(): ToolError {
    return {
      type: this.errorType,
      message: this.message,
      details: this.details,
      retryable: this.isRetryable(),
    };
  }

  private isRetryable(): boolean {
    switch (this.errorType) {
      case ToolErrorType.TIMEOUT_ERROR:
      case ToolErrorType.RATE_LIMIT_ERROR:
      case ToolErrorType.EXECUTION_ERROR:
        return true;
      case ToolErrorType.VALIDATION_ERROR:
      case ToolErrorType.PERMISSION_DENIED:
      case ToolErrorType.UNKNOWN_TOOL:
        return false;
      default:
        return false;
    }
  }
}

/**
 * Status of tool execution
 */
export enum ToolExecutionStatus {
  PENDING = 'pending',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
}

/**
 * Tool execution tracking model
 */
export interface ToolExecution {
  id: string;
  conversationId: string;
  toolCallId: string;
  toolName: string;
  input: any;
  output?: any;
  error?: string;
  status: ToolExecutionStatus;
  startTime: Date;
  endTime?: Date;
  userId: string;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (context: ToolExecutionContext) => string;
}

/**
 * Tool registration options
 */
export interface ToolRegistrationOptions {
  permissions?: string[];
  timeout?: number;
  rateLimit?: RateLimitConfig;
  enabled?: boolean;
}
