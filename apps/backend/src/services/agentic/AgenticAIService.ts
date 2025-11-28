import type {
  ModelSelectionContext,
  ToolExecutionContext,
} from '@instabuild/shared/types';
import {
  convertToModelMessages,
  pruneMessages,
  stepCountIs,
  streamText,
} from 'ai';
import { logger } from '../../lib/logger.js';
import { formatMemoryAsMessage, loadMemory } from '../../lib/memory-loader.js';
import { optimizeMessagesForLLM } from '../../lib/message-conversion.js';
import { modelSelector } from '../model-selector.js';
import {
  ReasoningStepType,
  reasoningTransparencyService,
} from '../reasoningTransparencyService.js';
import { toolRegistry } from '../toolRegistry.js';
import { errorClassifier } from './errorRecovery/ErrorClassifier.js';
import { errorRecoveryStrategyManager } from './errorRecovery/ErrorRecoveryStrategy.js';
import { toolCallRepairManager } from './errorRecovery/ToolCallRepair.js';
import { systemPromptBuilder } from './prompts/SystemPromptBuilder.js';
import { conversationStateManager } from './stateManagement/ConversationStateManager.js';
import { executionMetricsTracker } from './stateManagement/ExecutionMetricsTracker.js';
import { tokenRateLimiter } from './stateManagement/TokenRateLimiter.js';
import { taskConfigurationManager } from './taskConfiguration.js';
import {
  FinishContext,
  PrepareStepContext,
  StepFinishContext,
  TaskComplexity,
  ToolExecutionError,
} from './types.js';

/**
 * Agentic AI Service that leverages Vercel AI SDK's built-in multi-step capabilities
 * for complex task decomposition and execution
 */
export class AgenticAIService {
  // Rate limiting configuration: delay between steps to avoid OpenAI API rate limits
  private readonly STEP_DELAY_MS = 3000;

  /**
   * Sleep helper to add delay between steps
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get max tokens budget based on task complexity
   */
  private getMaxTokensForComplexity(complexity: TaskComplexity): number {
    const limits = {
      [TaskComplexity.SIMPLE]: 2000,
      [TaskComplexity.MODERATE]: 3000,
      [TaskComplexity.COMPLEX]: 4000,
      [TaskComplexity.ADVANCED]: 5000,
    };
    const maxTokens = limits[complexity] || 3000;

    logger.debug('[MAX TOKENS] Determined token budget', {
      complexity,
      maxTokens,
    });

    return maxTokens;
  }

  /**
   * Get base delay between steps based on task complexity
   */
  private getComplexityDelay(complexity: TaskComplexity): number {
    const delays = {
      [TaskComplexity.SIMPLE]: 2000,
      [TaskComplexity.MODERATE]: 3000,
      [TaskComplexity.COMPLEX]: 4000,
      [TaskComplexity.ADVANCED]: 5000,
    };
    const delayMs = delays[complexity] || 3000;

    logger.debug('[COMPLEXITY DELAY] Determined base delay', {
      complexity,
      delayMs,
    });

    return delayMs;
  }

  /**
   * Extract text content from message (handle both string and array formats)
   */
  private extractMessageContent(message: any): string {
    if (!message?.content) {
      return '';
    }

    if (typeof message.content === 'string') {
      return message.content;
    }

    if (Array.isArray(message.content)) {
      const textParts = message.content
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text);
      return textParts.join(' ');
    }

    return '';
  }

  /**
   * Initialize conversation context (state, metrics, reasoning)
   */
  private initializeConversationContext(options: {
    conversationId: string;
    userId: string;
    landingPageId?: string;
    detectedComplexity: TaskComplexity;
    maxSteps: number;
    messageContent: string;
  }): string {
    const {
      conversationId,
      userId,
      landingPageId,
      detectedComplexity,
      maxSteps,
      messageContent,
    } = options;

    // Initialize conversation state
    conversationStateManager.initializeConversationState({
      conversationId,
      userId,
      landingPageId,
      taskComplexity: detectedComplexity,
      maxSteps,
    });

    // Initialize execution metrics
    executionMetricsTracker.initializeExecutionMetrics(
      conversationId,
      detectedComplexity
    );

    // Start reasoning transparency session
    reasoningTransparencyService.startReasoningSession(conversationId);

    // Add initial reasoning step
    const analysisStepId = reasoningTransparencyService.addReasoningStep(
      conversationId,
      ReasoningStepType.ANALYSIS,
      'Understanding Request',
      `Analyzing your request: "${messageContent.substring(0, 100)}${messageContent.length > 100 ? '...' : ''}"`
    );

    return analysisStepId;
  }

  /**
   * Load conversation memory and inject it into messages
   */
  private async loadConversationMemory(
    messages: any[],
    sandboxId?: string,
    userId?: string
  ): Promise<any[]> {
    // loadMemory requires defined parameters, so check first
    if (!sandboxId || !userId) {
      return messages;
    }

    const memoryResult = await loadMemory(sandboxId, userId);

    if (!memoryResult.exists || memoryResult.isEmpty) {
      return messages;
    }

    const memoryMessage = formatMemoryAsMessage(memoryResult.content);

    // Insert memory after the first message (usually user's initial message)
    // to ensure it's in context but doesn't override system prompt
    return [
      messages[0], // Keep first message (usually user message)
      memoryMessage as any, // Add memory as system message
      ...messages.slice(1), // Rest of the messages
    ];
  }

  /**
   * Create onFinish handler for final result processing
   * Handles: message persistence, reasoning completion, state finalization, metrics completion
   */
  private createOnFinishHandler(
    context: FinishContext
  ): (finalResult: any) => Promise<void> {
    return async finalResult => {
      try {
        // Save assistant message to database BEFORE finishing
        const { prisma } = await import('../../server.js');

        // Save all response messages from AI SDK
        if (finalResult.response && finalResult.response.messages) {
          // AI SDK v5.0 provides messages in the correct format:
          // - Assistant messages contain tool-call parts
          // - Separate tool messages (role='tool') contain tool-result parts
          // - Each tool-result references its tool-call via toolCallId
          // We must preserve this structure for the SDK to work correctly

          const processedMessages: any[] = [];

          for (const message of finalResult.response.messages) {
            // Save assistant, user, system, AND tool messages
            // Tool messages are required - they contain tool-result parts
            if (
              ['assistant', 'user', 'system', 'tool'].includes(message.role)
            ) {
              processedMessages.push({
                role: message.role as 'assistant' | 'user' | 'system' | 'tool',
                content: message.content,
              });
            }
          }

          // Now save all messages (including tool messages)
          for (const message of processedMessages) {
            // ⚠️ DEDUPLICATION: Skip system messages already saved in prepareStep
            // Error recovery messages are saved immediately in prepareStep
            // to ensure they're persisted even if the SDK doesn't include them
            if (message.role === 'system') {
              const messageText =
                typeof message.content === 'string'
                  ? message.content
                  : Array.isArray(message.content) &&
                      message.content[0]?.type === 'text'
                    ? message.content[0].text
                    : '';

              // Check if this is an error recovery message (by content marker)
              const isErrorRecoveryMessage =
                messageText.includes('🚨 CRITICAL') ||
                messageText.includes('Multiple error recovery attempts failed');

              if (isErrorRecoveryMessage) {
                // Double-check: Query DB to confirm this message already exists
                const existingMessage = await prisma.chatMessage.findFirst({
                  where: {
                    conversationId: context.conversationId,
                    role: 'system',
                    metadata: {
                      path: ['injectedInPrepareStep'],
                      equals: true,
                    },
                  },
                  orderBy: {
                    createdAt: 'desc',
                  },
                  take: 1,
                });

                if (existingMessage) {
                  continue; // Skip duplicate
                }
              }
            }

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
                conversationId: context.conversationId,
                userId: context.userId,
                role: message.role as 'user' | 'assistant' | 'system' | 'tool',
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
          }
        }
      } catch (persistError) {
        // Failed to persist AI message - log error to prevent silent data loss
        logger.error('Failed to persist AI messages onFinish', {
          conversationId: context.conversationId,
          error:
            persistError instanceof Error
              ? persistError.message
              : String(persistError),
        });
      }

      // Complete reasoning step
      reasoningTransparencyService.completeReasoningStep(
        context.conversationId,
        context.analysisStepId
      );

      // Add completion reasoning step
      reasoningTransparencyService.addReasoningStep(
        context.conversationId,
        ReasoningStepType.VALIDATION,
        'Task Completed',
        'Successfully completed your request and validated the results.'
      );

      // Finalize conversation state
      await conversationStateManager.finalizeConversationState(
        context.conversationId,
        finalResult
      );

      // Complete execution metrics
      const initialState = conversationStateManager.getConversationState(
        context.conversationId
      );
      if (initialState) {
        await executionMetricsTracker.completeExecutionMetrics(
          context.conversationId,
          initialState.startTime,
          finalResult
        );
      }

      // Log token usage summary
      if (finalResult.usage) {
        const totalRate = tokenRateLimiter.getCurrentRate(
          context.conversationId
        );
        const percentOfLimit = ((totalRate / 90000) * 100).toFixed(1);

        logger.info('[ON FINISH] Conversation token usage summary', {
          conversationId: context.conversationId,
          totalSteps: finalResult.steps?.length || 0,
          promptTokens: finalResult.usage.promptTokens,
          completionTokens: finalResult.usage.completionTokens,
          totalTokens: finalResult.usage.totalTokens,
          currentRatePerMinute: totalRate,
          percentOfLimit: percentOfLimit + '%',
          finishReason: finalResult.finishReason,
          status:
            totalRate > 80000
              ? 'CRITICAL - Very high token rate'
              : totalRate > 70000
                ? 'WARNING - High token rate'
                : 'NORMAL - Healthy token rate',
        });

        // Clear token usage data for this conversation
        tokenRateLimiter.clearConversation(context.conversationId);
      }

      // End reasoning session
      reasoningTransparencyService.endReasoningSession(context.conversationId);

      // Sync project code to GitHub after successful completion
      // Only sync if the loop completed with code changes (not errors or max steps)
      if (
        finalResult.finishReason === 'stop' ||
        finalResult.finishReason === 'end-turn'
      ) {
        await this.syncProjectToGitHubAsync(context);
      }
    };
  }

  /**
   * Sync project code to GitHub after agentic loop completion
   * Uses sandbox git CLI for direct commit and push operations
   */
  private async syncProjectToGitHubAsync(
    context: FinishContext
  ): Promise<void> {
    try {
      const { prisma } = await import('../../server.js');

      // Get conversation and project details
      const conversation = await prisma.conversation.findUnique({
        where: { id: context.conversationId },
        select: {
          projectId: true,
          project: {
            select: {
              sandboxId: true,
            },
          },
        },
      });

      if (!conversation || !conversation.project?.sandboxId) {
        logger.info('No sandbox found for GitHub sync', {
          conversationId: context.conversationId,
        });
        return;
      }

      const projectId = conversation.projectId;
      const sandboxId = conversation.project.sandboxId;

      // Dynamically import GitHub sync service
      const { getGitHubSyncService } = await import('../githubSync.js');
      const githubSync = getGitHubSyncService();

      // Sync project to GitHub using sandbox git CLI
      await githubSync.syncProjectToGitHub(
        projectId,
        context.conversationId,
        sandboxId
      );

      logger.info('Successfully synced project to GitHub after agentic loop', {
        conversationId: context.conversationId,
        projectId,
      });
    } catch (error) {
      // Don't throw - GitHub sync failures shouldn't affect user experience
      logger.error('Failed to sync project to GitHub after agentic loop', {
        conversationId: context.conversationId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Create onStepFinish handler for step completion processing
   * Handles: error detection, reasoning tracking, progress updates, metrics tracking
   */
  private createOnStepFinishHandler(
    context: StepFinishContext
  ): (stepResult: any) => Promise<void> {
    return async stepResult => {
      const currentStep = stepResult.response?.messages?.length || 0;

      // ✅ ERROR DETECTION: Check for failed tools in this step
      const failedTools: ToolExecutionError[] = [];

      // 1. Check SDK's native tool-error parts in content
      if (stepResult.content && stepResult.content.length > 0) {
        for (const contentPart of stepResult.content) {
          if (contentPart.type === 'tool-error') {
            const toolError = contentPart as any;
            const errorMessage =
              typeof toolError.error === 'string'
                ? toolError.error
                : toolError.error?.message ||
                  JSON.stringify(toolError.error) ||
                  'Tool execution failed';

            failedTools.push({
              toolName: toolError.toolName,
              toolCallId: toolError.toolCallId,
              error: String(errorMessage),
              args: toolError.input as Record<string, any>,
              stepNumber: currentStep,
              timestamp: new Date(),
            });
          }
        }
      }

      // 2. Check tool results for application-level errors
      if (stepResult.toolResults && stepResult.toolResults.length > 0) {
        for (const toolResult of stepResult.toolResults) {
          const output = toolResult.output as any;

          // Skip if already detected as tool-error in content
          if (failedTools.some(f => f.toolCallId === toolResult.toolCallId)) {
            continue;
          }

          // Detect application-level error conditions
          const hasError =
            output?.error ||
            output?.success === false ||
            output?.status === 'error';

          if (hasError) {
            const errorMessage =
              output?.error ||
              output?.message ||
              output?.errorMessage ||
              'Tool execution failed';

            failedTools.push({
              toolName: toolResult.toolName,
              toolCallId: toolResult.toolCallId,
              error: String(errorMessage),
              args: toolResult.input as Record<string, any>,
              stepNumber: currentStep,
              timestamp: new Date(),
            });
          }
        }
      }

      // Store errors in conversation state for prepareStep to handle
      if (failedTools.length > 0) {
        const currentState = conversationStateManager.getConversationState(
          context.conversationId
        );

        await conversationStateManager.updateConversationState(
          context.conversationId,
          {
            pendingErrors: failedTools,
            errorCount: (currentState?.errorCount || 0) + failedTools.length,
          }
        );
      }

      // Add reasoning step for tool execution
      if (stepResult.toolCalls && stepResult.toolCalls.length > 0) {
        for (const toolCall of stepResult.toolCalls) {
          // Special handling for think tool - track as reflection
          if (toolCall.toolName === 'think') {
            const input = toolCall.input as any;
            const reflectionDescription = [
              `**Observation**: ${input.observation}`,
              `**Next Step**: ${input.next_step}`,
              `**Progress**: ${input.task_progress}`,
            ].join('\n\n');

            reasoningTransparencyService.addReasoningStep(
              context.conversationId,
              ReasoningStepType.REFLECTION,
              'Agent Thinking',
              reflectionDescription
            );
          } else {
            // Regular tool execution reasoning
            const reasoning =
              reasoningTransparencyService.createToolExecutionReasoning(
                toolCall.toolName,
                toolCall.input,
                context.executionContext
              );

            reasoningTransparencyService.addReasoningStep(
              context.conversationId,
              ReasoningStepType.EXECUTION,
              `Using ${toolCall.toolName}`,
              reasoning
            );
          }
        }
      }

      // Provide progress updates
      if (context.onProgress) {
        const action =
          stepResult.toolCalls?.length > 0
            ? `Executing ${stepResult.toolCalls.map((tc: any) => tc.toolName).join(', ')}`
            : 'Processing response';

        await context.onProgress({
          currentStep,
          totalSteps: context.taskConfig.maxSteps,
          action,
        });

        // Send reasoning transparency update
        reasoningTransparencyService.sendProgressUpdate(
          context.conversationId,
          currentStep,
          context.taskConfig.maxSteps,
          action,
          'Working on your request...'
        );
      }

      // Update conversation state
      await conversationStateManager.updateConversationState(
        context.conversationId,
        {
          currentStep,
          lastActivity: new Date(),
          toolsUsed: stepResult.toolCalls?.map((tc: any) => tc.toolName) || [],
        }
      );

      // Track execution metrics
      await executionMetricsTracker.trackStepMetrics(
        context.conversationId,
        stepResult,
        currentStep
      );

      // Track token usage for adaptive rate limiting
      if (stepResult.usage) {
        const tokens =
          stepResult.usage.totalTokens ||
          (stepResult.usage.promptTokens || 0) +
            (stepResult.usage.completionTokens || 0);

        logger.debug('[ON STEP FINISH] Token usage from AI SDK', {
          conversationId: context.conversationId,
          currentStep,
          promptTokens: stepResult.usage.promptTokens,
          completionTokens: stepResult.usage.completionTokens,
          totalTokens: tokens,
        });

        // Add to rate limiter's sliding window
        tokenRateLimiter.addTokenUsage(context.conversationId, tokens);

        // Log current rate after update
        const currentRate = tokenRateLimiter.getCurrentRate(
          context.conversationId
        );
        const percentOfLimit = ((currentRate / 90000) * 100).toFixed(1);

        logger.debug('[ON STEP FINISH] Updated token rate', {
          conversationId: context.conversationId,
          currentStep,
          tokensPerMinute: currentRate,
          percentOfLimit: percentOfLimit + '%',
          status:
            currentRate > 80000
              ? 'CRITICAL'
              : currentRate > 70000
                ? 'WARNING'
                : 'NORMAL',
        });
      }

      // Track tool calls
      if (stepResult.toolCalls && stepResult.toolCalls.length > 0) {
        for (const toolCall of stepResult.toolCalls) {
          // Track tool usage in conversation state
          await conversationStateManager.trackToolUsage(
            context.conversationId,
            toolCall.toolName
          );

          // Notify about tool call if callback provided
          if (context.onToolCall) {
            await context.onToolCall(toolCall);
          }
        }
      }

      // Call custom step finish callback if provided
      if (context.onStepFinish) {
        await context.onStepFinish(stepResult);
      }
    };
  }

  /**
   * Create prepareStep handler for step-level processing
   * Handles: rate limiting, dynamic model switching, error recovery, context management
   */
  private createPrepareStepHandler(
    context: PrepareStepContext
  ): (params: { messages: any[]; stepNumber: number }) => Promise<any> {
    return async ({ messages, stepNumber }) => {
      // ⏱️ ADAPTIVE RATE LIMITING: Add delay between steps to avoid OpenAI API rate limits
      // Skip delay on first step (stepNumber === 0)
      if (stepNumber > 0) {
        // Get base delay from task complexity
        const baseDelay = this.getComplexityDelay(context.detectedComplexity);

        logger.debug('[PREPARE STEP] Base delay determined', {
          stepNumber,
          complexity: context.detectedComplexity,
          baseDelay,
          conversationId: context.conversationId,
        });

        // Check if we need to increase delay based on token usage rate
        const rateCheck = tokenRateLimiter.shouldIncreaseDelay(
          context.conversationId
        );

        let finalDelay = baseDelay;
        if (rateCheck.shouldDelay) {
          finalDelay = Math.max(baseDelay, baseDelay + rateCheck.delayMs);

          logger.warn('[PREPARE STEP] Adaptive rate limiting activated', {
            conversationId: context.conversationId,
            stepNumber,
            baseDelay,
            additionalDelay: rateCheck.delayMs,
            finalDelay,
            currentRate: rateCheck.currentRate,
            percentOfLimit: ((rateCheck.currentRate / 90000) * 100).toFixed(1),
            reason: rateCheck.reason,
            message: 'Approaching OpenAI token rate limit - increasing delay',
          });
        } else {
          logger.debug('[PREPARE STEP] Using base delay (rate normal)', {
            conversationId: context.conversationId,
            stepNumber,
            finalDelay,
            currentRate: rateCheck.currentRate,
            percentOfLimit: ((rateCheck.currentRate / 90000) * 100).toFixed(1),
          });
        }

        // Apply the delay
        await this.sleep(finalDelay);

        logger.debug('[PREPARE STEP] Delay completed', {
          conversationId: context.conversationId,
          stepNumber,
          delayMs: finalDelay,
        });
      }

      // 🔄 DYNAMIC MODEL SWITCHING: Use stronger model for complex reasoning after initial steps
      // Switch to strong model if:
      // 1. We're past the first 2 steps (initial exploration phase)
      // 2. AND message count is growing (complex conversation)
      // 3. AND task complexity is MODERATE or higher
      let dynamicModel: any;

      if (
        stepNumber > 2 &&
        messages.length > 10 &&
        (context.detectedComplexity === TaskComplexity.MODERATE ||
          context.detectedComplexity === TaskComplexity.COMPLEX ||
          context.detectedComplexity === TaskComplexity.ADVANCED)
      ) {
        // Get strong model for complex reasoning
        const strongModelContext: ModelSelectionContext = {
          message: context.messageContent,
          previousMessages: messages.length,
          requiresToolCalling: true, // Complex tasks always need tools
        };

        const { model: strongModel } = await modelSelector.getModel({
          ...strongModelContext,
          // Force strong model selection by overriding complexity
          message: 'complex multi-step task requiring advanced reasoning',
        });

        dynamicModel = strongModel;
      }

      const messageCount = messages.length;

      // Get complexity-aware context window configuration
      const contextConfig = taskConfigurationManager.getContextWindowConfig(
        context.detectedComplexity
      );

      logger.debug('[PREPARE STEP] Pre-pruning message state', {
        conversationId: context.conversationId,
        stepNumber,
        messageCount,
        contextTriggerAt: contextConfig.triggerAt,
        contextKeepCount: contextConfig.keepCount,
        willPrune: messageCount > contextConfig.triggerAt,
      });

      // Keep context manageable (prevent token overflow)
      // For complex tasks with many tool calls, trim to recent history
      // Use complexity-aware thresholds for better context management
      if (messageCount > contextConfig.triggerAt) {
        // STEP 1: Use AI SDK's pruneMessages to intelligently remove old content
        // System messages (with embedded guidelines) are NEVER pruned
        // Strategy: Keep recent reasoning + tool history, remove old intermediate steps
        const beforePruneCount = messages.length;
        const prunedMessages = pruneMessages({
          messages,
          reasoning: 'before-last-message', // Remove reasoning except in last message
          toolCalls: 'before-last-10-messages', // Keep tool context for last 5 messages (more conservative)
          emptyMessages: 'remove', // Remove any messages that become empty after pruning
        });

        const removedCount = beforePruneCount - prunedMessages.length;
        const reductionPercent =
          beforePruneCount > 0
            ? ((removedCount / beforePruneCount) * 100).toFixed(1)
            : '0.0';

        logger.info('[PREPARE STEP] Message pruning applied', {
          conversationId: context.conversationId,
          stepNumber,
          beforeCount: beforePruneCount,
          afterCount: prunedMessages.length,
          removedCount,
          reductionPercent: `${reductionPercent}%`,
          strategy: {
            reasoning: 'before-last-message',
            toolCalls: 'before-last-5-messages',
            emptyMessages: 'remove',
          },
          note: 'System messages with guidelines are preserved (never pruned)',
        });

        // The fragile manual pruning logic has been removed.
        // We now directly return the result from the AI SDK's pruneMessages function.
        return {
          messages: prunedMessages,
          ...(dynamicModel && { model: dynamicModel }),
        };
      }

      // Return dynamic model if set, otherwise no modifications
      return dynamicModel ? { model: dynamicModel } : {};
    };
  }

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
    const messageContent = this.extractMessageContent(latestUserMessage);

    // Determine task complexity and execution parameters
    const detectedComplexity =
      taskComplexity ||
      taskConfigurationManager.analyzeTaskComplexity(messageContent);
    const taskConfig = taskConfigurationManager.getTaskConfiguration(
      detectedComplexity,
      maxSteps,
      customStopConditions
    );

    // Select appropriate model based on task complexity
    const context: ModelSelectionContext = {
      message: messageContent,
      previousMessages: messages.length,
      requiresToolCalling:
        taskConfigurationManager.detectToolCallRequirement(messageContent),
    };

    const { model, selection } = await modelSelector.getModel(context);

    // Initialize conversation context (state, metrics, reasoning)
    const analysisStepId = this.initializeConversationContext({
      conversationId,
      userId,
      landingPageId,
      detectedComplexity,
      maxSteps: taskConfig.maxSteps,
      messageContent,
    });

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

    // Starting agentic chat processing

    // Validate user authentication
    if (!userId || userId === 'system') {
      throw new Error(
        'Valid user authentication required for AI service access'
      );
    }

    // Create execution context for tools
    const executionContext: ToolExecutionContext = {
      userId,
      conversationId,
      toolCallId: 'pending', // Will be set by AI SDK
      sandboxId, // Docker container ID - presence indicates sandboxed execution
      landingPageId, // For GitHub code backup integration
    };

    // Get available tools with dynamic filtering based on task complexity
    const availableTools = toolRegistry.getAvailableToolsFiltered(
      executionContext,
      detectedComplexity,
      messageContent
    );

    logger.debug('[PROCESS AGENTIC CHAT] Tool filtering applied', {
      conversationId,
      taskComplexity: detectedComplexity,
      totalToolsRegistered: toolRegistry.getStats().totalTools,
      filteredToolCount: Object.keys(availableTools).length,
      toolNames: Object.keys(availableTools),
      filtered: detectedComplexity === TaskComplexity.SIMPLE,
    });

    // Optimize messages for LLM by stripping unnecessary data from tool results
    // This reduces context size while keeping full data in database for UI
    const optimizedMessages = optimizeMessagesForLLM(messages);

    // Load memory for context (if sandbox exists) and inject into messages
    const messagesWithMemory = await this.loadConversationMemory(
      optimizedMessages,
      sandboxId,
      userId
    );

    // Determine final step limit (override takes precedence)
    const finalMaxSteps = maxSteps || taskConfig.maxSteps;

    // Configure stop conditions based on step count
    // In AI SDK 5.0, maxSteps was replaced with stopWhen
    const finalStopConditions = maxSteps
      ? [stepCountIs(finalMaxSteps)] // Override stop condition to match requested maxSteps
      : taskConfig.stopConditions; // Use task complexity stop conditions

    // Get maxTokens budget based on task complexity
    // Note: maxTokens is set at model level (openai/anthropic), not streamText level
    const maxTokensBudget = this.getMaxTokensForComplexity(detectedComplexity);

    // Log stream configuration
    logger.debug('[PROCESS AGENTIC CHAT] Stream configuration', {
      conversationId,
      taskComplexity: detectedComplexity,
      maxSteps: finalMaxSteps,
      maxTokensBudget,
      note: 'maxTokens should be configured at model level (e.g., openai(..., { maxTokens }))',
      toolCount: Object.keys(availableTools).length,
      messageCount: messagesWithMemory.length,
      modelInfo: selection.reasoning,
    });

    // ✅ FIXED: Pass complete message history including tool messages
    // AI SDK v5.0+ fully supports 'tool' role messages (previously incorrect assumption)
    // Tool messages contain tool-result parts that are ESSENTIAL for the agentic loop
    // convertToModelMessages() properly handles all message roles including 'tool'

    // Configure multi-step execution with Vercel AI SDK 5.0
    const result = streamText({
      model,
      messages: convertToModelMessages(messagesWithMemory),
      tools: availableTools,
      // AI SDK 5.0: Use stopWhen instead of maxSteps
      stopWhen: finalStopConditions,
      maxOutputTokens: maxTokensBudget, // Limit output token generation
      system: systemPromptBuilder.buildSystemPrompt(
        selection.reasoning,
        landingPageId,
        detectedComplexity,
        taskConfig
      ),

      // Context management: Prevent token overflow by trimming old messages
      // CRITICAL: Preserve tool-call/tool-result pairs!
      prepareStep: this.createPrepareStepHandler({
        conversationId,
        userId,
        messageContent,
        detectedComplexity,
        taskConfig,
        model,
        STEP_DELAY_MS: this.STEP_DELAY_MS,
      }),

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
        return await toolCallRepairManager.repairToolCall(
          toolCall,
          tools,
          error,
          messages,
          system || '',
          model
        );
      },

      onStepFinish: this.createOnStepFinishHandler({
        conversationId,
        userId,
        taskConfig,
        executionContext,
        analysisStepId,
        onProgress,
        onToolCall,
        onStepFinish,
      }),

      onFinish: this.createOnFinishHandler({
        conversationId,
        userId,
        analysisStepId,
      }),
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
    // Classify error type and determine recovery strategy
    const errorType = errorClassifier.classifyError(error);
    const recoveryStrategy =
      errorRecoveryStrategyManager.selectRecoveryStrategy(errorType, context);

    // Execute recovery strategy
    await errorRecoveryStrategyManager.executeRecoveryStrategy(
      recoveryStrategy,
      error,
      context,
      conversationId
    );
  }

  /**
   * Create user-friendly error messages for different error types
   */
  createUserFriendlyErrorMessage(error: unknown): string {
    return errorClassifier.createUserFriendlyErrorMessage(error);
  }
}

// Export singleton instance
export const agenticAIService = new AgenticAIService();
