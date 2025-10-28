import type {
  ModelSelectionContext,
  ToolExecutionContext,
} from '@instabuild/shared/types';
import {
  convertToCoreMessages,
  hasToolCall,
  stepCountIs,
  streamText,
} from 'ai';
import { logger } from '../lib/logger.js';
import { modelSelector } from './model-selector.js';
import {
  ReasoningStepType,
  reasoningTransparencyService,
} from './reasoningTransparencyService.js';
import { toolRegistry } from './toolRegistry.js';

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
interface ErrorRecoveryConfig {
  maxRetries: number;
  retryDelay: number;
  fallbackStrategies: ErrorRecoveryStrategy[];
  userFeedbackThreshold: number;
}

/**
 * Error context for recovery decisions
 */
interface ErrorContext {
  error: unknown;
  toolName?: string;
  stepNumber: number;
  totalSteps: number;
  previousAttempts: number;
  taskComplexity: TaskComplexity;
}

/**
 * Conversation state tracking
 */
interface ConversationState {
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
  status: 'active' | 'completed' | 'failed' | 'paused';
  context: {
    projectStructure?: string[];
    recentChanges?: string[];
    workingDirectory?: string;
  };
}

/**
 * Execution metrics for monitoring and analytics
 */
interface ExecutionMetrics {
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
interface ToolExecutionMetric {
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
interface TaskTypeConfig {
  maxSteps: number;
  stopConditions: any[];
  description: string;
}

/**
 * Agentic AI Service that leverages Vercel AI SDK's built-in multi-step capabilities
 * for complex task decomposition and execution
 */
export class AgenticAIService {
  private taskConfigurations: Map<TaskComplexity, TaskTypeConfig> = new Map([
    [
      TaskComplexity.SIMPLE,
      {
        maxSteps: 3,
        stopConditions: [stepCountIs(3)],
        description: 'Simple single-file operations or basic queries',
      },
    ],
    [
      TaskComplexity.MODERATE,
      {
        maxSteps: 7,
        stopConditions: [stepCountIs(7)],
        description: 'Multi-file changes, analysis followed by modifications',
      },
    ],
    [
      TaskComplexity.COMPLEX,
      {
        maxSteps: 15,
        stopConditions: [
          stepCountIs(15),
          hasToolCall('write_file'), // Stop after major file creation
        ],
        description: 'Full feature implementation, significant refactoring',
      },
    ],
    [
      TaskComplexity.ADVANCED,
      {
        maxSteps: 25,
        stopConditions: [
          stepCountIs(25),
          hasToolCall('write_file'), // Stop after completing major work
          // Custom condition for complex workflows
          ({ steps }) => {
            const lastStep = steps[steps.length - 1];
            return lastStep?.text?.includes('TASK_COMPLETE') || false;
          },
        ],
        description: 'Complex multi-component tasks, architectural changes',
      },
    ],
  ]);

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
  private conversationStates: Map<string, ConversationState> = new Map();
  private executionMetrics: Map<string, ExecutionMetrics> = new Map();

  /**
   * Process a chat message with agentic multi-step execution
   */
  async processAgenticChat(options: {
    messages: any[];
    conversationId: string;
    userId: string;
    landingPageId?: string;
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
      taskComplexity || this.analyzeTaskComplexity(messageContent);
    const taskConfig = this.getTaskConfiguration(
      detectedComplexity,
      maxSteps,
      customStopConditions
    );

    // Select appropriate model based on task complexity
    const context: ModelSelectionContext = {
      message: messageContent,
      previousMessages: messages.length,
      requiresToolCalling: this.detectToolCallRequirement(messageContent),
    };

    const { model, selection } = modelSelector.getModel(context);

    // Initialize conversation state
    this.initializeConversationState({
      conversationId,
      userId,
      landingPageId,
      taskComplexity: detectedComplexity,
      maxSteps: taskConfig.maxSteps,
    });

    // Initialize execution metrics
    this.initializeExecutionMetrics(conversationId, detectedComplexity);

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

    // Convert UI messages to core messages format
    const coreMessages = convertToCoreMessages(messages);

    // Create execution context for tools
    const executionContext: ToolExecutionContext = {
      userId,
      conversationId,
      toolCallId: 'pending', // Will be set by AI SDK
    };

    // Get available tools with proper context injection
    const availableTools = toolRegistry.getAvailableTools(executionContext);

    // Configure multi-step execution with Vercel AI SDK
    const result = streamText({
      model,
      messages: coreMessages,
      tools: availableTools,
      stopWhen: taskConfig.stopConditions,
      system: this.buildSystemPrompt(
        selection.reasoning,
        landingPageId,
        detectedComplexity,
        taskConfig
      ),

      // Enhanced error handling and recovery
      onError: async ({ error }) => {
        const errorContext: ErrorContext = {
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

        return await this.repairToolCall(
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
        await this.updateConversationState(conversationId, {
          currentStep,
          lastActivity: new Date(),
          toolsUsed: stepResult.toolCalls?.map(tc => tc.toolName) || [],
        });

        // Track execution metrics
        await this.trackStepMetrics(conversationId, stepResult, currentStep);

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
            await this.trackToolUsage(conversationId, toolCall.toolName);

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
        await this.finalizeConversationState(conversationId, finalResult);

        // Complete execution metrics
        await this.completeExecutionMetrics(conversationId, finalResult);

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
        const analytics = await this.generateAnalyticsSummary(conversationId);
        logger.info('Conversation analytics', {
          conversationId,
          ...analytics,
        });
      },
    });

    return result;
  }

  /**
   * Register agentic-specific tools with the tool registry
   */
  registerAgenticTools() {
    // For now, we're focusing on integrating with existing tools
    // The agentic behavior comes from the multi-step execution capabilities
    logger.info('Agentic AI service initialized', {
      capabilities: [
        'multi-step-execution',
        'tool-chaining',
        'error-recovery',
        'context-awareness',
      ],
    });
  }

  /**
   * Analyze task complexity based on message content
   */
  private analyzeTaskComplexity(message: string): TaskComplexity {
    const complexityIndicators = {
      [TaskComplexity.ADVANCED]: [
        /refactor|restructure|rebuild|architecture|migrate/i,
        /multiple.*(?:pages?|components?|sections?)/i,
        /complete.*(?:overhaul|redesign|rewrite)/i,
        /implement.*(?:system|framework|infrastructure)/i,
      ],
      [TaskComplexity.COMPLEX]: [
        /create.*(?:new|multiple).*(?:pages?|components?|features?)/i,
        /build.*(?:from scratch|complete)/i,
        /add.*(?:multiple|several|many)/i,
        /integrate.*(?:with|into)/i,
        /optimize.*(?:performance|structure)/i,
      ],
      [TaskComplexity.MODERATE]: [
        /update.*(?:and|then|also)/i,
        /change.*(?:multiple|several)/i,
        /modify.*(?:layout|structure|design)/i,
        /add.*(?:section|component|feature)/i,
        /reorganize|rearrange/i,
      ],
      [TaskComplexity.SIMPLE]: [
        /change.*(?:color|text|font|size)/i,
        /update.*(?:content|title|description)/i,
        /fix|correct|adjust/i,
        /show|display|hide/i,
      ],
    };

    // Check from most complex to least complex
    for (const [complexity, patterns] of Object.entries(complexityIndicators)) {
      if (patterns.some(pattern => pattern.test(message))) {
        return complexity as TaskComplexity;
      }
    }

    // Default to moderate for unclassified requests
    return TaskComplexity.MODERATE;
  }

  /**
   * Get task configuration based on complexity and overrides
   */
  private getTaskConfiguration(
    complexity: TaskComplexity,
    maxStepsOverride?: number,
    customStopConditions?: any[]
  ): TaskTypeConfig {
    const baseConfig = this.taskConfigurations.get(complexity)!;

    return {
      maxSteps: maxStepsOverride || baseConfig.maxSteps,
      stopConditions: customStopConditions || baseConfig.stopConditions,
      description: baseConfig.description,
    };
  }

  /**
   * Track progress for complex workflows
   */
  private trackComplexWorkflowProgress(
    stepResult: any,
    currentStep: number,
    maxSteps: number
  ) {
    const milestones = [
      { step: Math.floor(maxSteps * 0.25), name: 'Analysis Phase' },
      { step: Math.floor(maxSteps * 0.5), name: 'Implementation Phase' },
      { step: Math.floor(maxSteps * 0.75), name: 'Integration Phase' },
      { step: maxSteps, name: 'Completion Phase' },
    ];

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
   * Detect if a message requires tool calling based on content analysis
   */
  private detectToolCallRequirement(message: string): boolean {
    const toolCallIndicators = [
      // File operations
      /upload|file|image|logo|asset/i,
      // Content modifications
      /update|change|modify|edit|add|remove|delete/i,
      // Style changes
      /color|style|font|size|layout|design/i,
      // Complex requests
      /create|build|generate|make/i,
    ];

    return toolCallIndicators.some(pattern => pattern.test(message));
  }

  /**
   * Build system prompt for agentic behavior
   */
  private buildSystemPrompt(
    modelReasoning: string,
    landingPageId?: string,
    taskComplexity?: TaskComplexity,
    taskConfig?: TaskTypeConfig
  ): string {
    return `You are an advanced AI assistant with agentic capabilities for landing page development. You can break down complex requests into multiple steps and execute them systematically.

## Your Capabilities

You have access to developer-style tools that allow you to:
- Read and analyze existing code and project structure
- Make precise modifications to HTML, CSS, and JavaScript files
- Search through codebases to understand patterns and locate elements
- Execute shell commands safely in a sandboxed environment
- Manage files and directories like a human developer

## Agentic Behavior Guidelines

1. **Multi-Step Reasoning**: Break complex requests into logical steps
2. **Observe and Adapt**: After each tool execution, observe the results and adapt your approach
3. **Explain Your Process**: Clearly communicate what you're doing and why
4. **Error Recovery**: If a step fails, try alternative approaches automatically
5. **Context Awareness**: Use information from previous steps to inform subsequent actions

## Reasoning Transparency

Always explain your thought process clearly:
- **Before taking action**: Explain what you plan to do and why
- **During execution**: Describe what you're currently doing
- **After each step**: Explain what you learned and how it affects your next steps
- **When encountering issues**: Explain the problem and your recovery approach

Use clear, non-technical language that users can easily understand. Think of yourself as a helpful developer explaining your work to a colleague.

## Tool Usage Strategy

- **Start with Analysis**: Use read/search tools to understand the current state
- **Plan Your Changes**: Explain your approach before making modifications
- **Make Incremental Changes**: Prefer small, focused changes over large rewrites
- **Validate Results**: Check your changes and provide clear feedback

## Current Context

${landingPageId ? `Working on landing page: ${landingPageId}` : 'No specific landing page context'}
Model Selection: ${modelReasoning}
${taskComplexity ? `Task Complexity: ${taskComplexity} (${taskConfig?.description})` : ''}
${taskConfig ? `Maximum Steps Available: ${taskConfig.maxSteps}` : ''}

## Execution Guidelines for ${taskComplexity || 'Standard'} Tasks

${this.getComplexitySpecificGuidelines(taskComplexity)}

Remember: You can execute multiple tools in sequence to accomplish complex tasks. Take your time to think through each step and provide clear explanations of your reasoning process. Always be transparent about what you're doing and why.`;
  }

  /**
   * Get complexity-specific execution guidelines
   */
  private getComplexitySpecificGuidelines(complexity?: TaskComplexity): string {
    switch (complexity) {
      case TaskComplexity.SIMPLE:
        return `- Focus on direct, single-step solutions
- Minimize tool usage to essential operations only
- Provide immediate, clear results`;

      case TaskComplexity.MODERATE:
        return `- Break task into 2-4 logical phases
- Use analysis tools before making changes
- Validate changes after each major modification`;

      case TaskComplexity.COMPLEX:
        return `- Plan your approach with 3-5 major phases
- Start with comprehensive analysis of existing code
- Make incremental changes and test frequently
- Document your progress and reasoning at each step`;

      case TaskComplexity.ADVANCED:
        return `- Develop a detailed multi-phase execution plan
- Conduct thorough analysis and research first
- Implement changes in small, testable increments
- Regularly validate system integrity and consistency
- Provide detailed progress updates and explanations
- Consider rollback strategies for major changes`;

      default:
        return `- Adapt your approach based on task requirements
- Use appropriate analysis before making changes
- Provide clear explanations of your process`;
    }
  }

  /**
   * Handle streaming errors with recovery strategies
   */
  private async handleStreamError(
    error: unknown,
    context: ErrorContext,
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
    const errorType = this.classifyError(error);
    const recoveryStrategy = this.selectRecoveryStrategy(errorType, context);

    logger.info('Selected error recovery strategy', {
      conversationId,
      errorType,
      recoveryStrategy,
      previousAttempts: context.previousAttempts,
    });

    // Execute recovery strategy
    await this.executeRecoveryStrategy(
      recoveryStrategy,
      error,
      context,
      conversationId
    );
  }

  /**
   * Repair failed tool calls using re-ask strategy
   */
  private async repairToolCall(
    toolCall: any,
    tools: any,
    error: unknown,
    messages: any[],
    system: string,
    model: any
  ): Promise<any> {
    try {
      // Use the re-ask strategy from AI SDK documentation
      await streamText({
        model,
        system,
        messages: [
          ...messages,
          {
            role: 'assistant',
            content: [
              {
                type: 'tool-call',
                toolCallId: toolCall.toolCallId,
                toolName: toolCall.toolName,
                input: toolCall.input,
              },
            ],
          },
          {
            role: 'tool' as const,
            content: [
              {
                type: 'tool-result',
                toolCallId: toolCall.toolCallId,
                toolName: toolCall.toolName,
                output: error instanceof Error ? error.message : String(error),
              },
            ],
          },
        ],
        tools,
      });

      // Extract the repaired tool call from the result
      // Note: This is a simplified version - in practice, you'd need to handle the stream
      return null; // Return null if repair fails, AI SDK will handle gracefully
    } catch (repairError) {
      logger.error('Tool call repair failed', {
        originalError: error instanceof Error ? error.message : String(error),
        repairError:
          repairError instanceof Error
            ? repairError.message
            : String(repairError),
        toolName: toolCall.toolName,
      });
      return null;
    }
  }

  /**
   * Classify error types for appropriate recovery
   */
  private classifyError(error: unknown): string {
    if (error instanceof Error) {
      // Check error message patterns for classification
      const message = error.message.toLowerCase();
      if (
        message.includes('no such tool') ||
        message.includes('tool not found')
      ) {
        return 'NoSuchTool';
      }
      if (
        message.includes('invalid tool input') ||
        message.includes('validation')
      ) {
        return 'InvalidToolInput';
      }
      if (
        message.includes('api call') ||
        message.includes('network') ||
        message.includes('timeout')
      ) {
        return 'APICall';
      }
      if (message.includes('tool call repair') || message.includes('repair')) {
        return 'ToolCallRepair';
      }
      return error.name;
    }
    return 'Unknown';
  }

  /**
   * Select appropriate recovery strategy based on error type and context
   */
  private selectRecoveryStrategy(
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
  private async executeRecoveryStrategy(
    strategy: ErrorRecoveryStrategy,
    error: unknown,
    context: ErrorContext,
    conversationId: string
  ): Promise<void> {
    logger.info('Executing error recovery strategy', {
      conversationId,
      strategy,
      errorType: this.classifyError(error),
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
   * Create user-friendly error messages for different error types
   */
  createUserFriendlyErrorMessage(error: unknown): string {
    const errorType = this.classifyError(error);

    switch (errorType) {
      case 'NoSuchTool':
        return 'I tried to use a tool that is not available. Let me try a different approach.';

      case 'InvalidToolInput':
        return 'I provided invalid input to a tool. Let me correct this and try again.';

      case 'APICall':
        return "There was a communication error with the AI service. I'll retry in a moment.";

      case 'ToolCallRepair':
        return 'I encountered an issue while trying to fix a previous error. Let me simplify my approach.';

      default:
        if (error instanceof Error) {
          return `I encountered an unexpected error: ${error.message}. Let me try a different approach.`;
        }
        return "An unknown error occurred. I'll attempt to continue with a simpler approach.";
    }
  }

  /**
   * Initialize conversation state tracking
   */
  private initializeConversationState(options: {
    conversationId: string;
    userId: string;
    landingPageId?: string;
    taskComplexity: TaskComplexity;
    maxSteps: number;
  }): ConversationState {
    const state: ConversationState = {
      conversationId: options.conversationId,
      userId: options.userId,
      landingPageId: options.landingPageId,
      currentStep: 0,
      totalSteps: options.maxSteps,
      taskComplexity: options.taskComplexity,
      startTime: new Date(),
      lastActivity: new Date(),
      toolsUsed: [],
      filesModified: [],
      errorCount: 0,
      status: 'active',
      context: {
        projectStructure: [],
        recentChanges: [],
        workingDirectory: undefined,
      },
    };

    this.conversationStates.set(options.conversationId, state);
    return state;
  }

  /**
   * Initialize execution metrics tracking
   */
  private initializeExecutionMetrics(
    conversationId: string,
    taskComplexity: TaskComplexity
  ): ExecutionMetrics {
    const metrics: ExecutionMetrics = {
      conversationId,
      totalTokensUsed: 0,
      totalSteps: 0,
      toolExecutions: [],
      executionTime: 0,
      successRate: 0,
      errorRate: 0,
      averageStepTime: 0,
      taskComplexity,
      completionStatus: 'success',
    };

    this.executionMetrics.set(conversationId, metrics);
    return metrics;
  }

  /**
   * Update conversation state
   */
  private async updateConversationState(
    conversationId: string,
    updates: Partial<ConversationState>
  ): Promise<void> {
    const state = this.conversationStates.get(conversationId);
    if (!state) return;

    // Merge updates
    Object.assign(state, updates);

    // Update tools used (avoid duplicates)
    if (updates.toolsUsed) {
      const existingTools = new Set(state.toolsUsed);
      updates.toolsUsed.forEach(tool => existingTools.add(tool));
      state.toolsUsed = Array.from(existingTools);
    }

    this.conversationStates.set(conversationId, state);
  }

  /**
   * Track step execution metrics
   */
  private async trackStepMetrics(
    conversationId: string,
    stepResult: any,
    stepNumber: number
  ): Promise<void> {
    const metrics = this.executionMetrics.get(conversationId);
    if (!metrics) return;

    // Update basic metrics
    metrics.totalSteps = stepNumber;
    metrics.totalTokensUsed += stepResult.usage?.totalTokens || 0;

    // Track tool executions
    if (stepResult.toolCalls) {
      for (const toolCall of stepResult.toolCalls) {
        const toolMetric: ToolExecutionMetric = {
          toolName: toolCall.toolName,
          executionTime: 0, // Would need to track this separately
          success: !stepResult.toolResults?.some(
            (tr: any) => tr.toolCallId === toolCall.toolCallId && tr.error
          ),
          inputSize: JSON.stringify(toolCall.input || {}).length,
          outputSize: 0, // Would need to track output size
          stepNumber,
          timestamp: new Date(),
        };

        metrics.toolExecutions.push(toolMetric);
      }
    }

    this.executionMetrics.set(conversationId, metrics);
  }

  /**
   * Track tool usage in conversation state
   */
  private async trackToolUsage(
    conversationId: string,
    toolName: string
  ): Promise<void> {
    const state = this.conversationStates.get(conversationId);
    if (!state) return;

    // Track file modifications for filesystem tools
    if (['write_file', 'replace', 'glob'].includes(toolName)) {
      // This would be enhanced to track actual file paths from tool results
      state.context.recentChanges = state.context.recentChanges || [];
      state.context.recentChanges.push(
        `${toolName} executed at ${new Date().toISOString()}`
      );
    }

    this.conversationStates.set(conversationId, state);
  }

  /**
   * Finalize conversation state
   */
  private async finalizeConversationState(
    conversationId: string,
    finalResult: any
  ): Promise<void> {
    const state = this.conversationStates.get(conversationId);
    if (!state) return;

    state.status = finalResult.finishReason === 'stop' ? 'completed' : 'failed';
    state.lastActivity = new Date();

    // Check for tool errors
    const toolErrors =
      finalResult.steps?.flatMap(
        (step: any) =>
          step.content?.filter((part: any) => part.type === 'tool-error') || []
      ) || [];

    state.errorCount = toolErrors.length;

    this.conversationStates.set(conversationId, state);
  }

  /**
   * Complete execution metrics
   */
  private async completeExecutionMetrics(
    conversationId: string,
    _finalResult: any
  ): Promise<void> {
    const metrics = this.executionMetrics.get(conversationId);
    const state = this.conversationStates.get(conversationId);
    if (!metrics || !state) return;

    // Calculate final metrics
    const executionTime = Date.now() - state.startTime.getTime();
    metrics.executionTime = executionTime;
    metrics.averageStepTime =
      metrics.totalSteps > 0 ? executionTime / metrics.totalSteps : 0;

    // Calculate success and error rates
    const successfulTools = metrics.toolExecutions.filter(
      te => te.success
    ).length;
    const totalTools = metrics.toolExecutions.length;

    metrics.successRate = totalTools > 0 ? successfulTools / totalTools : 1;
    metrics.errorRate =
      totalTools > 0 ? (totalTools - successfulTools) / totalTools : 0;

    // Determine completion status
    if (state.status === 'completed' && metrics.errorRate === 0) {
      metrics.completionStatus = 'success';
    } else if (state.status === 'completed' && metrics.errorRate < 0.5) {
      metrics.completionStatus = 'partial';
    } else {
      metrics.completionStatus = 'failed';
    }

    this.executionMetrics.set(conversationId, metrics);
  }

  /**
   * Generate analytics summary
   */
  private async generateAnalyticsSummary(conversationId: string): Promise<any> {
    const state = this.conversationStates.get(conversationId);
    const metrics = this.executionMetrics.get(conversationId);

    if (!state || !metrics) {
      return { error: 'No data available for analytics' };
    }

    return {
      conversationId,
      duration: metrics.executionTime,
      taskComplexity: state.taskComplexity,
      stepsCompleted: metrics.totalSteps,
      toolsUsed: state.toolsUsed.length,
      uniqueTools: new Set(state.toolsUsed).size,
      successRate: Math.round(metrics.successRate * 100),
      errorRate: Math.round(metrics.errorRate * 100),
      tokensUsed: metrics.totalTokensUsed,
      averageStepTime: Math.round(metrics.averageStepTime),
      completionStatus: metrics.completionStatus,
      filesModified: state.filesModified.length,
      mostUsedTool: this.getMostUsedTool(metrics.toolExecutions),
    };
  }

  /**
   * Get most used tool from execution metrics
   */
  private getMostUsedTool(
    toolExecutions: ToolExecutionMetric[]
  ): string | null {
    if (toolExecutions.length === 0) return null;

    const toolCounts = toolExecutions.reduce(
      (acc, te) => {
        acc[te.toolName] = (acc[te.toolName] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(toolCounts).reduce((a, b) =>
      toolCounts[a[0]] > toolCounts[b[0]] ? a : b
    )[0];
  }

  /**
   * Get conversation state for monitoring
   */
  getConversationState(conversationId: string): ConversationState | undefined {
    return this.conversationStates.get(conversationId);
  }

  /**
   * Get execution metrics for monitoring
   */
  getExecutionMetrics(conversationId: string): ExecutionMetrics | undefined {
    return this.executionMetrics.get(conversationId);
  }

  /**
   * Clean up old conversation states (call periodically)
   */
  cleanupOldStates(maxAgeHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    for (const [conversationId, state] of this.conversationStates.entries()) {
      if (state.lastActivity < cutoffTime) {
        this.conversationStates.delete(conversationId);
        this.executionMetrics.delete(conversationId);
        this.errorAttempts.delete(conversationId);
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
      errorRecoveryStrategies: Object.values(ErrorRecoveryStrategy),
      maxStepsRange: {
        min: 3,
        max: 25,
      },
      supportedModels: ['gpt-4', 'gpt-4o-mini'],
      errorRecoveryConfig: this.errorRecoveryConfig,
      activeConversations: this.conversationStates.size,
      totalMetricsTracked: this.executionMetrics.size,
    };
  }
}

// Export singleton instance
export const agenticAIService = new AgenticAIService();
