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
 * Safety levels for tool execution
 */
export type SafetyLevel = 'safe' | 'potentially_destructive';

/**
 * Enhanced tool definition with user-friendly metadata and safety levels
 */
export interface EnhancedToolDefinition<T = any> extends ToolDefinition<T> {
  displayName: string; // User-friendly name for UI display
  category: ToolCategory;
  userDescription: string; // Non-technical description for users
  icon?: string; // Icon identifier for UI
  estimatedDuration?: number; // Estimated execution time in ms
  safetyLevel: SafetyLevel; // Safety level for constraint evaluation
  metadata: ToolMetadata;
}

/**
 * Tool metadata for enhanced functionality
 */
export interface ToolMetadata {
  version: string;
  author?: string;
  tags: string[];
  examples?: ToolExample[];
  limitations?: string[];
  relatedTools?: string[];
}

/**
 * Tool usage example
 */
export interface ToolExample {
  description: string;
  input: any;
  expectedOutput?: any;
}

/**
 * Tool categories for organization and permissions
 */
export enum ToolCategory {
  FILE_SYSTEM = 'file_system',
  LANDING_PAGE = 'landing_page',
  UPLOAD = 'upload',
  UTILITY = 'utility',
  EXTERNAL_API = 'external_api',
  ANALYTICS = 'analytics',
}

/**
 * Tool execution progress information
 */
export interface ToolExecutionProgress {
  toolCallId: string;
  toolName: string;
  displayName: string;
  status: ToolExecutionStatus;
  progress: number; // 0-100
  message: string; // User-friendly status message
  startTime: Date;
  estimatedCompletion?: Date;
}

/**
 * Tool execution result with user feedback
 */
export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  userFeedback: string; // User-friendly description of what was done
  technicalDetails?: any; // Technical details for debugging
  previewRefreshNeeded: boolean;
  changedFiles?: string[];
  warnings?: string[];
  suggestions?: string[];
}

/**
 * Definition of a tool that can be registered and executed
 */
export interface ToolDefinition<T = any> {
  name: string;
  description: string;
  inputSchema: z.ZodSchema<T>;
  execute: (input: T, context: ToolExecutionContext) => Promise<any> | any;
  safetyLevel?: SafetyLevel; // Optional safety level for basic tools
  timeout?: number;
  rateLimitKey?: string;
}

/**
 * Registry interface for managing tools
 */
export interface ToolRegistry {
  registerTool<T>(
    definition: ToolDefinition<T>,
    options?: ToolRegistrationOptions
  ): void;
  registerEnhancedTool<T>(definition: EnhancedToolDefinition<T>): void;
  getTools(): Record<string, any>; // Will be VercelAITool when we integrate
  getAvailableTools(context: ToolExecutionContext): Record<string, any>;
  executeTool(
    name: string,
    input: any,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult>;
  validateSafety(toolName: string, context: ToolExecutionContext): boolean;
  isToolRegistered(name: string): boolean;
  getToolDefinition(name: string): ToolDefinition | undefined;
  getEnhancedToolDefinition(name: string): EnhancedToolDefinition | undefined;
  getToolSafetyLevel(toolName: string): SafetyLevel | undefined;
  wrapTool(
    aiTool: any,
    metadata: ToolMetadata & {
      displayName: string;
      category: ToolCategory;
      userDescription: string;
      safetyLevel: SafetyLevel;
    }
  ): any;
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
  safetyLevel?: SafetyLevel;
  timeout?: number;
  rateLimit?: RateLimitConfig;
  enabled?: boolean;
}
