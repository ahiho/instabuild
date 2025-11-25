/**
 * Task complexity levels for determining appropriate step limits
 */
export enum TaskComplexity {
  SIMPLE = 'simple', // 1-3 steps: single file edits, simple queries
  MODERATE = 'moderate', // 4-7 steps: multi-file changes, analysis + modification
  COMPLEX = 'complex', // 8-15 steps: full feature implementation, refactoring
  ADVANCED = 'advanced', // 16-25 steps: complex multi-component tasks
}

/**
 * Error recovery strategies for different types of failures
 */
export enum ErrorRecoveryStrategy {
  RETRY = 'retry', // Retry the same operation
  ALTERNATIVE_APPROACH = 'alternative', // Try a different approach
  SIMPLIFY_TASK = 'simplify', // Break down into simpler steps
  USER_FEEDBACK = 'user_feedback', // Request user guidance
  GRACEFUL_DEGRADATION = 'degradation', // Continue with reduced functionality
}

/**
 * Error recovery configuration
 */
export interface ErrorRecoveryConfig {
  maxRetries: number;
  retryDelay: number;
  fallbackStrategies: ErrorRecoveryStrategy[];
  userFeedbackThreshold: number;
}

/**
 * Error context for recovery decisions
 */
export interface ErrorContext {
  error: unknown;
  toolName?: string;
  stepNumber: number;
  totalSteps: number;
  previousAttempts: number;
  taskComplexity: TaskComplexity;
}

/**
 * Tool execution error tracking
 */
export interface ToolExecutionError {
  toolName: string;
  toolCallId: string;
  error: string;
  args?: Record<string, any>;
  stepNumber?: number;
  timestamp: Date;
}

/**
 * Conversation state tracking
 */
export interface ConversationState {
  conversationId: string;
  userId: string;
  landingPageId?: string;
  currentStep: number;
  totalSteps: number;
  taskComplexity: TaskComplexity;
  startTime: Date;
  lastActivity: Date;
  toolsUsed: string[];
  filesModified: string[];
  errorCount: number;
  pendingErrors?: ToolExecutionError[]; // Errors detected in onStepFinish, consumed by prepareStep
  errorRecoveryAttempts?: number; // Track recovery attempts to prevent infinite loops
  status: 'active' | 'completed' | 'failed' | 'paused';
  context: {
    projectStructure?: string[];
    recentChanges?: string[];
    workingDirectory?: string;
  };
  // File tracking for read-before-edit enforcement
  // Using Record instead of Map for JSON serializability
  readFiles?: Record<string, string>; // Map of file path -> file hash (SHA-256)
}

/**
 * Execution metrics for monitoring and analytics
 */
export interface ExecutionMetrics {
  conversationId: string;
  totalTokensUsed: number;
  totalSteps: number;
  toolExecutions: ToolExecutionMetric[];
  executionTime: number;
  successRate: number;
  errorRate: number;
  averageStepTime: number;
  taskComplexity: TaskComplexity;
  completionStatus: 'success' | 'partial' | 'failed';
}

/**
 * Individual tool execution metrics
 */
export interface ToolExecutionMetric {
  toolName: string;
  executionTime: number;
  success: boolean;
  inputSize: number;
  outputSize: number;
  stepNumber: number;
  timestamp: Date;
  errorMessage?: string;
}

/**
 * Configuration for different task types and their execution parameters
 */
export interface TaskTypeConfig {
  maxSteps: number;
  stopConditions: any[];
  description: string;
}

/**
 * Context for prepareStep callback handler
 */
export interface PrepareStepContext {
  conversationId: string;
  userId: string;
  messageContent: string;
  detectedComplexity: TaskComplexity;
  taskConfig: TaskTypeConfig;
  model: any; // LanguageModel from AI SDK
  STEP_DELAY_MS: number;
}

/**
 * Context for onStepFinish callback handler
 */
export interface StepFinishContext {
  conversationId: string;
  userId: string;
  taskConfig: TaskTypeConfig;
  executionContext: any; // ToolExecutionContext from shared types
  analysisStepId: string;
  onProgress?: (progress: {
    currentStep: number;
    totalSteps: number;
    action: string;
  }) => Promise<void>;
  onToolCall?: (toolCall: any) => Promise<void>;
  onStepFinish?: (stepResult: any) => Promise<void>;
}

/**
 * Context for onFinish callback handler
 */
export interface FinishContext {
  conversationId: string;
  userId: string;
  analysisStepId: string;
}
