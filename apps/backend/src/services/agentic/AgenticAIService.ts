import type {
  ModelSelectionContext,
  ToolExecutionContext,
} from '@instabuild/shared/types';
import {
  convertToModelMessages,
  streamText,
} from 'ai';
import { logger } from '../../lib/logger.js';
import { modelSelector } from '../model-selector.js';
import {
  ReasoningStepType,
  reasoningTransparencyService,
} from '../reasoningTransparencyService.js';
import { toolRegistry } from '../toolRegistry.js';
import { analyticsGenerator } from './analytics/AnalyticsGenerator.js';
import { conversationStateManager } from './stateManagement/ConversationStateManager.js';
import { executionMetricsTracker } from './stateManagement/ExecutionMetricsTracker.js';
import { errorClassifier } from './errorRecovery/ErrorClassifier.js';
import { errorRecoveryStrategyManager } from './errorRecovery/ErrorRecoveryStrategy.js';
import { toolCallRepairManager } from './errorRecovery/ToolCallRepair.js';
import { systemPromptBuilder } from './prompts/SystemPromptBuilder.js';
import { taskConfigurationManager } from './taskConfiguration.js';
import { TaskComplexity } from './types.js';

/**
 * Agentic AI Service that leverages Vercel AI SDK's built-in multi-step capabilities
 * for complex task decomposition and execution
 */
export class AgenticAIService {
  /**
   * Process a chat message with agentic multi-step execution
   */
  async processAgenticChat(options: {
    messages: any[];
    conversationId: string;
    userId: string;
    landingPageId?: string;
    sandboxId?: string; // Docker container ID for sandbox isolation
    maxSteps?: number;
    taskComplexity?: TaskComplexity;
    customStopConditions?: any[];
    onStepFinish?: (stepResult: any) => Promise<void>;
    onToolCall?: (toolCall: any) => Promise<void>;
    onProgress?: (progress: {
      currentStep: number;
      totalSteps: number;
      action: string;
    }) => Promise<void>;
    onReasoningUpdate?: (reasoning: string) => Promise<void>;
  }) {
    const {
      messages,
      conversationId,
      userId,
      landingPageId,
      sandboxId,
      maxSteps,
      taskComplexity,
      customStopConditions,
      onStepFinish,
      onToolCall,
      onProgress,
      onReasoningUpdate,
    } = options;

    // Get the latest user message for model selection
    const latestUserMessage = messages
      .filter((m: any) => m.role === 'user')
      .slice(-1)[0];

    // Extract text content from message (handle both string and array formats)
    let messageContent = '';
    if (latestUserMessage?.content) {
      if (typeof latestUserMessage.content === 'string') {
        messageContent = latestUserMessage.content;
      } else if (Array.isArray(latestUserMessage.content)) {
        // Extract text from content array
        const textParts = latestUserMessage.content
          .filter((part: any) => part.type === 'text')
          .map((part: any) => part.text);
        messageContent = textParts.join(' ');
      }
    }

    // Determine task complexity and execution parameters
    const detectedComplexity =
      taskComplexity || taskConfigurationManager.analyzeTaskComplexity(messageContent);
    const taskConfig = taskConfigurationManager.getTaskConfiguration(
      detectedComplexity,
      maxSteps,
      customStopConditions
    );

    // Select appropriate model based on task complexity
    const context: ModelSelectionContext = {
      message: messageContent,
      previousMessages: messages.length,
      requiresToolCalling: taskConfigurationManager.detectToolCallRequirement(messageContent),
    };

    const { model, selection } = modelSelector.getModel(context);

    // Initialize conversation state
    conversationStateManager.initializeConversationState({
      conversationId,
      userId,
      landingPageId,
      taskComplexity: detectedComplexity,
      maxSteps: taskConfig.maxSteps,
    });

    // Initialize execution metrics
    executionMetricsTracker.initializeExecutionMetrics(
      conversationId,
      detectedComplexity
    );

    // Start reasoning transparency session
    reasoningTransparencyService.startReasoningSession(conversationId);

    // Register progress callback for reasoning transparency
    if (onReasoningUpdate) {
      reasoningTransparencyService.registerProgressCallback(
        conversationId,
        async _update => {
          const reasoning =
            reasoningTransparencyService.generateReasoningExplanation(
              conversationId
            );
          await onReasoningUpdate(reasoning);
        }
      );
    }

    // Add initial reasoning step
    const analysisStepId = reasoningTransparencyService.addReasoningStep(
      conversationId,
      ReasoningStepType.ANALYSIS,
      'Understanding Request',
      `Analyzing your request: "${messageContent.substring(0, 100)}${messageContent.length > 100 ? '...' : ''}"`
    );

    logger.info('Starting agentic chat processing', {
      conversationId,
      userId,
      landingPageId,
      messageCount: messages.length,
      taskComplexity: detectedComplexity,
      maxSteps: taskConfig.maxSteps,
      stopConditions: taskConfig.stopConditions.length,
      modelSelection: selection.selectedModel,
      reasoning: selection.reasoning,
    });

    // Create execution context for tools
    const executionContext: ToolExecutionContext = {
      userId,
      conversationId,
      toolCallId: 'pending', // Will be set by AI SDK
      sandboxId, // Docker container ID - presence indicates sandboxed execution
    };

    // Get available tools with proper context injection
    const availableTools = toolRegistry.getAvailableTools(executionContext);

    // Configure multi-step execution with Vercel AI SDK
    const result = streamText({
      model,
      messages: convertToModelMessages(messages),
      tools: availableTools,
      stopWhen: taskConfig.stopConditions,
      system: systemPromptBuilder.buildSystemPrompt(
        selection.reasoning,
        landingPageId,
        detectedComplexity,
        taskConfig
      ),

      // Enhanced error handling and recovery
      onError: async ({ error }) => {
        const errorContext = {
          error,
          stepNumber: 0, // Will be updated in onStepFinish
          totalSteps: taskConfig.maxSteps,
          previousAttempts: 0,
          taskComplexity: detectedComplexity,
        };

        await this.handleStreamError(error, errorContext, conversationId);
      },

      // Tool call repair for automatic error recovery
      experimental_repairToolCall: async ({
        toolCall,
        tools,
        error,
        messages,
        system,
      }) => {
        logger.warn('Attempting tool call repair', {
          conversationId,
          toolName: toolCall.toolName,
          errorType: error.constructor.name,
          errorMessage: error.message,
        });

        return await toolCallRepairManager.repairToolCall(
          toolCall,
          tools,
          error,
          messages,
          system || '',
          model
        );
      },

      onStepFinish: async stepResult => {
        const currentStep = stepResult.response?.messages?.length || 0;
        const progressPercentage = Math.round(
          (currentStep / taskConfig.maxSteps) * 100
        );

        logger.info('Agentic step completed', {
          conversationId,
          currentStep,
          maxSteps: taskConfig.maxSteps,
          progressPercentage,
          finishReason: stepResult.finishReason,
          toolCallsCount: stepResult.toolCalls?.length || 0,
          usage: stepResult.usage,
          taskComplexity: detectedComplexity,
        });

        // Add reasoning step for tool execution
        if (stepResult.toolCalls && stepResult.toolCalls.length > 0) {
          for (const toolCall of stepResult.toolCalls) {
            const reasoning =
              reasoningTransparencyService.createToolExecutionReasoning(
                toolCall.toolName,
                toolCall.input,
                executionContext
              );

            reasoningTransparencyService.addReasoningStep(
              conversationId,
              ReasoningStepType.EXECUTION,
              `Using ${toolCall.toolName}`,
              reasoning
            );
          }
        }

        // Provide progress updates
        if (onProgress) {
          const action =
            stepResult.toolCalls?.length > 0
              ? `Executing ${stepResult.toolCalls.map(tc => tc.toolName).join(', ')}`
              : 'Processing response';

          await onProgress({
            currentStep,
            totalSteps: taskConfig.maxSteps,
            action,
          });

          // Send reasoning transparency update
          reasoningTransparencyService.sendProgressUpdate(
            conversationId,
            currentStep,
            taskConfig.maxSteps,
            action,
            'Working on your request...'
          );
        }

        // Update conversation state
        await conversationStateManager.updateConversationState(conversationId, {
          currentStep,
          lastActivity: new Date(),
          toolsUsed: stepResult.toolCalls?.map(tc => tc.toolName) || [],
        });

        // Track execution metrics
        await executionMetricsTracker.trackStepMetrics(
          conversationId,
          stepResult,
          currentStep
        );

        // Log tool calls for monitoring
        if (stepResult.toolCalls && stepResult.toolCalls.length > 0) {
          for (const toolCall of stepResult.toolCalls) {
            logger.info('Tool call executed in step', {
              conversationId,
              stepNumber: currentStep,
              toolName: toolCall.toolName,
              toolCallId: toolCall.toolCallId,
              inputSize: JSON.stringify(toolCall.input || {}).length,
            });

            // Track tool usage in conversation state
            await conversationStateManager.trackToolUsage(
              conversationId,
              toolCall.toolName
            );

            // Notify about tool call if callback provided
            if (onToolCall) {
              await onToolCall(toolCall);
            }
          }
        }

        // Enhanced step tracking for complex workflows
        if (
          detectedComplexity === TaskComplexity.COMPLEX ||
          detectedComplexity === TaskComplexity.ADVANCED
        ) {
          this.trackComplexWorkflowProgress(
            stepResult,
            currentStep,
            taskConfig.maxSteps
          );
        }

        // Call custom step finish callback if provided
        if (onStepFinish) {
          await onStepFinish(stepResult);
        }
      },

      onFinish: async finalResult => {
        try {
          // Save assistant message to database BEFORE finishing
          const { prisma } = await import('../../server.js');

          // Save all response messages from AI SDK
          if (finalResult.response && finalResult.response.messages) {
            // Pre-process messages to merge tool-result messages into preceding assistant messages
            const processedMessages: any[] = [];

            for (const message of finalResult.response.messages) {
              if (message.role === 'tool') {
                // This is a tool-result message - merge it into the last assistant message
                const lastMessage = processedMessages[processedMessages.length - 1];
                if (lastMessage && lastMessage.role === 'assistant') {
                  // Append tool-result parts to the last assistant message
                  if (Array.isArray(message.content)) {
                    lastMessage.content = [...(lastMessage.content || []), ...message.content];
                  }
                  // Don't add this message to processedMessages - it's merged
                  continue;
                }
              }

              // For assistant and other messages, add them normally
              if (['assistant', 'user', 'system'].includes(message.role)) {
                processedMessages.push({
                  role: message.role as 'assistant' | 'user' | 'system',
                  content: message.content,
                });
              }
            }

            // Now save the processed messages (with tool-results merged in)
            for (const message of processedMessages) {
              let parts: any = [];
              let toolCallsCount = 0;
              let toolResultsCount = 0;

              // Use message content as-is
              if (Array.isArray(message.content)) {
                parts = [...message.content];

                // Count tool calls and results
                toolCallsCount = message.content.filter(
                  (part: any) => part.type === 'tool-call'
                ).length;

                toolResultsCount = message.content.filter(
                  (part: any) => part.type === 'tool-result'
                ).length;

              } else if (typeof message.content === 'string') {
                // Convert string content to parts format
                parts = [{ type: 'text', text: message.content }];
              }

              // Save message to database
              await prisma.chatMessage.create({
                data: {
                  conversationId,
                  landingPageId,
                  role: message.role as 'user' | 'assistant' | 'system',
                  parts,
                  metadata: {
                    totalSteps: finalResult.steps?.length || 0,
                    finishReason: finalResult.finishReason,
                    totalUsage: finalResult.usage,
                    toolCallsCount,
                    toolResultsCount,
                  },
                },
              });

              logger.info('AI message persisted to database', {
                conversationId,
                messageRole: message.role,
                partsCount: parts.length,
                toolCallsCount,
                toolResultsCount,
                savedPartsTypes: parts.map((p: any) => p.type),
              });
            }
          }
        } catch (persistError) {
          logger.error('Failed to persist AI message', {
            conversationId,
            error:
              persistError instanceof Error
                ? persistError.message
                : String(persistError),
          });
        }

        // Complete reasoning step
        reasoningTransparencyService.completeReasoningStep(
          conversationId,
          analysisStepId
        );

        // Add completion reasoning step
        reasoningTransparencyService.addReasoningStep(
          conversationId,
          ReasoningStepType.VALIDATION,
          'Task Completed',
          'Successfully completed your request and validated the results.'
        );

        // Finalize conversation state
        await conversationStateManager.finalizeConversationState(
          conversationId,
          finalResult
        );

        // Complete execution metrics
        const initialState = conversationStateManager.getConversationState(conversationId);
        if (initialState) {
          await executionMetricsTracker.completeExecutionMetrics(
            conversationId,
            initialState.startTime,
            finalResult
          );
        }

        // End reasoning session
        reasoningTransparencyService.endReasoningSession(conversationId);

        logger.info('Agentic chat processing completed', {
          conversationId,
          totalSteps: finalResult.steps?.length || 0,
          finishReason: finalResult.finishReason,
          totalUsage: finalResult.usage,
          responseLength: finalResult.text?.length || 0,
        });

        // Log all tool calls from all steps
        const allToolCalls =
          finalResult.steps?.flatMap(step => step.toolCalls || []) || [];
        if (allToolCalls.length > 0) {
          logger.info('Total tool calls in conversation', {
            conversationId,
            totalToolCalls: allToolCalls.length,
            toolNames: allToolCalls.map(tc => tc.toolName),
          });
        }

        // Generate analytics summary
        const analytics = await analyticsGenerator.generateAnalyticsSummary(conversationId);
        if (analytics) {
          logger.info('Conversation analytics', analytics);
        }
      },
    });

    return result;
  }

  /**
   * Handle streaming errors with recovery strategies
   */
  private async handleStreamError(
    error: unknown,
    context: any,
    conversationId: string
  ): Promise<void> {
    logger.error('Stream error occurred', {
      conversationId,
      errorType: error?.constructor?.name || 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      stepNumber: context.stepNumber,
      taskComplexity: context.taskComplexity,
    });

    // Classify error type and determine recovery strategy
    const errorType = errorClassifier.classifyError(error);
    const recoveryStrategy = errorRecoveryStrategyManager.selectRecoveryStrategy(
      errorType,
      context
    );

    logger.info('Selected error recovery strategy', {
      conversationId,
      errorType,
      recoveryStrategy,
      previousAttempts: context.previousAttempts,
    });

    // Execute recovery strategy
    await errorRecoveryStrategyManager.executeRecoveryStrategy(
      recoveryStrategy,
      error,
      context,
      conversationId
    );
  }

  /**
   * Track progress for complex workflows
   */
  private trackComplexWorkflowProgress(
    stepResult: any,
    currentStep: number,
    maxSteps: number
  ) {
    const milestones = taskConfigurationManager.getComplexWorkflowMilestones(maxSteps);
    const currentMilestone = milestones.find(m => currentStep <= m.step);

    if (currentMilestone) {
      logger.info('Complex workflow milestone', {
        currentStep,
        maxSteps,
        milestone: currentMilestone.name,
        toolsUsed: stepResult.toolCalls?.map((tc: any) => tc.toolName) || [],
      });
    }
  }

  /**
   * Create user-friendly error messages for different error types
   */
  createUserFriendlyErrorMessage(error: unknown): string {
    return errorClassifier.createUserFriendlyErrorMessage(error);
  }

  /**
   * Get conversation state for monitoring
   */
  getConversationState(conversationId: string) {
    return conversationStateManager.getConversationState(conversationId);
  }

  /**
   * Get execution metrics for monitoring
   */
  getExecutionMetrics(conversationId: string) {
    return executionMetricsTracker.getExecutionMetrics(conversationId);
  }

  /**
   * Clean up old conversation states (call periodically)
   */
  cleanupOldStates(maxAgeHours: number = 24): void {
    conversationStateManager.cleanupOldStates(maxAgeHours);
    // Also cleanup metrics for old conversations
    const allStates = conversationStateManager.getAllConversationStates();
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    for (const [conversationId, state] of allStates.entries()) {
      if (state.lastActivity < cutoffTime) {
        executionMetricsTracker.deleteExecutionMetrics(conversationId);
        errorRecoveryStrategyManager.clearAttempts(conversationId);
      }
    }
  }

  /**
   * Get execution statistics for monitoring
   */
  getExecutionStats() {
    return {
      service: 'AgenticAIService',
      version: '3.0.0',
      capabilities: [
        'adaptive-multi-step-execution',
        'complexity-aware-planning',
        'tool-chaining',
        'advanced-error-recovery',
        'context-awareness',
        'progress-tracking',
        'user-feedback-integration',
        'state-management',
        'execution-analytics',
        'conversation-tracking',
      ],
      taskComplexityLevels: Object.values(TaskComplexity),
      maxStepsRange: {
        min: 3,
        max: 25,
      },
      supportedModels: ['gpt-4', 'gpt-4o-mini'],
      errorRecoveryConfig: errorRecoveryStrategyManager.getErrorRecoveryConfig(),
      activeConversations: conversationStateManager.getAllConversationStates().size,
      totalMetricsTracked: executionMetricsTracker.getAllExecutionMetrics().size,
    };
  }
}

// Export singleton instance
export const agenticAIService = new AgenticAIService();
