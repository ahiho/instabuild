/**
 * Agentic AI Service - Modular exports
 *
 * This file exports all modules for the agentic AI service.
 * The service provides multi-step execution capabilities with task complexity analysis,
 * error recovery strategies, and state management.
 */

// Main service
export { AgenticAIService, agenticAIService } from './AgenticAIService.js';

// Types and enums
export {
  TaskComplexity,
  ErrorRecoveryStrategy,
  type ErrorRecoveryConfig,
  type ErrorContext,
  type ConversationState,
  type ExecutionMetrics,
  type ToolExecutionMetric,
  type TaskTypeConfig,
} from './types.js';

// Task configuration
export {
  TaskConfigurationManager,
  taskConfigurationManager,
} from './taskConfiguration.js';

// Error recovery modules
export {
  ErrorClassifier,
  errorClassifier,
} from './errorRecovery/ErrorClassifier.js';
export {
  ErrorRecoveryStrategyManager,
  errorRecoveryStrategyManager,
} from './errorRecovery/ErrorRecoveryStrategy.js';
export {
  ToolCallRepairManager,
  toolCallRepairManager,
} from './errorRecovery/ToolCallRepair.js';

// State management modules
export {
  ConversationStateManager,
  conversationStateManager,
} from './stateManagement/ConversationStateManager.js';
export {
  ExecutionMetricsTracker,
  executionMetricsTracker,
} from './stateManagement/ExecutionMetricsTracker.js';

// Prompt builder
export {
  SystemPromptBuilder,
  systemPromptBuilder,
} from './prompts/SystemPromptBuilder.js';
