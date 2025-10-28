import type { ToolExecutionContext } from '@instabuild/shared/types';
import { logger } from '../lib/logger.js';

/**
 * Reasoning step types for transparency
 */
export enum ReasoningStepType {
  ANALYSIS = 'analysis',
  PLANNING = 'planning',
  EXECUTION = 'execution',
  VALIDATION = 'validation',
  ERROR_RECOVERY = 'error_recovery',
}

/**
 * Individual reasoning step
 */
export interface ReasoningStep {
  id: string;
  type: ReasoningStepType;
  title: string;
  description: string;
  timestamp: Date;
  duration?: number;
  metadata?: Record<string, any>;
}

/**
 * Progress update for multi-step tasks
 */
export interface ProgressUpdate {
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
  stepDescription: string;
  progressPercentage: number;
  estimatedTimeRemaining?: number;
  completedSteps: ReasoningStep[];
}

/**
 * Reasoning transparency service for providing clear explanations of AI thought processes
 */
export class ReasoningTransparencyService {
  private activeReasoningSessions: Map<string, ReasoningStep[]> = new Map();
  private progressCallbacks: Map<string, (update: ProgressUpdate) => void> =
    new Map();

  /**
   * Start a new reasoning session
   */
  startReasoningSession(conversationId: string): void {
    this.activeReasoningSessions.set(conversationId, []);
    logger.info('Started reasoning session', { conversationId });
  }

  /**
   * Add a reasoning step to the current session
   */
  addReasoningStep(
    conversationId: string,
    type: ReasoningStepType,
    title: string,
    description: string,
    metadata?: Record<string, any>
  ): string {
    const stepId = `${conversationId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const step: ReasoningStep = {
      id: stepId,
      type,
      title,
      description,
      timestamp: new Date(),
      metadata,
    };

    const steps = this.activeReasoningSessions.get(conversationId) || [];
    steps.push(step);
    this.activeReasoningSessions.set(conversationId, steps);

    logger.info('Added reasoning step', {
      conversationId,
      stepId,
      type,
      title,
    });

    return stepId;
  }

  /**
   * Complete a reasoning step with duration
   */
  completeReasoningStep(
    conversationId: string,
    stepId: string,
    duration?: number
  ): void {
    const steps = this.activeReasoningSessions.get(conversationId) || [];
    const step = steps.find(s => s.id === stepId);

    if (step) {
      step.duration = duration || Date.now() - step.timestamp.getTime();

      logger.info('Completed reasoning step', {
        conversationId,
        stepId,
        duration: step.duration,
      });
    }
  }

  /**
   * Register a progress callback for a conversation
   */
  registerProgressCallback(
    conversationId: string,
    callback: (update: ProgressUpdate) => void
  ): void {
    this.progressCallbacks.set(conversationId, callback);
  }

  /**
   * Send progress update to registered callback
   */
  sendProgressUpdate(
    conversationId: string,
    currentStep: number,
    totalSteps: number,
    stepTitle: string,
    stepDescription: string,
    estimatedTimeRemaining?: number
  ): void {
    const callback = this.progressCallbacks.get(conversationId);
    if (!callback) return;

    const completedSteps =
      this.activeReasoningSessions.get(conversationId) || [];
    const progressPercentage = Math.round((currentStep / totalSteps) * 100);

    const update: ProgressUpdate = {
      currentStep,
      totalSteps,
      stepTitle,
      stepDescription,
      progressPercentage,
      estimatedTimeRemaining,
      completedSteps: completedSteps.filter(
        step => step.duration !== undefined
      ),
    };

    callback(update);

    logger.info('Sent progress update', {
      conversationId,
      currentStep,
      totalSteps,
      progressPercentage,
    });
  }

  /**
   * Generate user-friendly explanation of reasoning process
   */
  generateReasoningExplanation(conversationId: string): string {
    const steps = this.activeReasoningSessions.get(conversationId) || [];

    if (steps.length === 0) {
      return "I'm thinking about your request...";
    }

    const explanations: string[] = [];

    for (const step of steps) {
      let explanation = '';

      switch (step.type) {
        case ReasoningStepType.ANALYSIS:
          explanation = `🔍 **Analyzing**: ${step.description}`;
          break;
        case ReasoningStepType.PLANNING:
          explanation = `📋 **Planning**: ${step.description}`;
          break;
        case ReasoningStepType.EXECUTION:
          explanation = `⚡ **Executing**: ${step.description}`;
          break;
        case ReasoningStepType.VALIDATION:
          explanation = `✅ **Validating**: ${step.description}`;
          break;
        case ReasoningStepType.ERROR_RECOVERY:
          explanation = `🔧 **Recovering**: ${step.description}`;
          break;
        default:
          explanation = `💭 **${step.title}**: ${step.description}`;
      }

      if (step.duration) {
        const durationText =
          step.duration < 1000
            ? `${step.duration}ms`
            : `${(step.duration / 1000).toFixed(1)}s`;
        explanation += ` *(${durationText})*`;
      }

      explanations.push(explanation);
    }

    return explanations.join('\n\n');
  }

  /**
   * Generate planned steps explanation before execution
   */
  generatePlannedStepsExplanation(
    conversationId: string,
    plannedSteps: Array<{
      title: string;
      description: string;
      estimatedDuration?: number;
    }>
  ): string {
    const totalEstimatedTime = plannedSteps.reduce(
      (sum, step) => sum + (step.estimatedDuration || 2000),
      0
    );

    let explanation = `I'll approach this task in ${plannedSteps.length} steps:\n\n`;

    plannedSteps.forEach((step, index) => {
      const stepNumber = index + 1;
      const duration = step.estimatedDuration
        ? ` (~${(step.estimatedDuration / 1000).toFixed(1)}s)`
        : '';

      explanation += `**${stepNumber}. ${step.title}**${duration}\n`;
      explanation += `   ${step.description}\n\n`;
    });

    const totalTimeText =
      totalEstimatedTime < 10000
        ? `${(totalEstimatedTime / 1000).toFixed(1)} seconds`
        : `${Math.round(totalEstimatedTime / 60000)} minutes`;

    explanation += `*Estimated total time: ${totalTimeText}*`;

    logger.info('Generated planned steps explanation', {
      conversationId,
      stepCount: plannedSteps.length,
      estimatedTime: totalEstimatedTime,
    });

    return explanation;
  }

  /**
   * Create reasoning explanation for tool execution
   */
  createToolExecutionReasoning(
    toolName: string,
    input: any,
    _context: ToolExecutionContext
  ): string {
    const toolDisplayNames: Record<string, string> = {
      list_directory: 'exploring directory structure',
      read_file: 'examining file contents',
      write_file: 'creating/updating file',
      replace: 'making precise edits',
      search_file_content: 'searching through code',
      glob: 'finding files by pattern',
    };

    const displayName = toolDisplayNames[toolName] || `using ${toolName}`;

    let reasoning = `I'm ${displayName}`;

    // Add context-specific details
    switch (toolName) {
      case 'list_directory':
        reasoning += ' to understand the project structure';
        if (input.path) {
          reasoning += ` in ${input.path}`;
        }
        break;

      case 'read_file':
        reasoning += " to see what's currently in the file";
        if (input.absolute_path) {
          const fileName = input.absolute_path.split('/').pop();
          reasoning += ` (${fileName})`;
        }
        break;

      case 'write_file':
        reasoning += ' to implement the requested changes';
        if (input.file_path) {
          const fileName = input.file_path.split('/').pop();
          reasoning += ` in ${fileName}`;
        }
        break;

      case 'replace':
        reasoning += ' to modify specific parts of the code';
        if (input.file_path) {
          const fileName = input.file_path.split('/').pop();
          reasoning += ` in ${fileName}`;
        }
        break;

      case 'search_file_content':
        reasoning += ' to locate relevant code patterns';
        if (input.pattern) {
          reasoning += ` matching "${input.pattern}"`;
        }
        break;

      case 'glob':
        reasoning += ' to find files matching the pattern';
        if (input.pattern) {
          reasoning += ` "${input.pattern}"`;
        }
        break;
    }

    return reasoning + '.';
  }

  /**
   * Get current reasoning session steps
   */
  getReasoningSteps(conversationId: string): ReasoningStep[] {
    return this.activeReasoningSessions.get(conversationId) || [];
  }

  /**
   * End reasoning session and cleanup
   */
  endReasoningSession(conversationId: string): void {
    this.activeReasoningSessions.delete(conversationId);
    this.progressCallbacks.delete(conversationId);

    logger.info('Ended reasoning session', { conversationId });
  }

  /**
   * Clean up old reasoning sessions
   */
  cleanupOldSessions(maxAgeHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    for (const [
      conversationId,
      steps,
    ] of this.activeReasoningSessions.entries()) {
      const lastStepTime =
        steps.length > 0 ? steps[steps.length - 1].timestamp : new Date(0);

      if (lastStepTime < cutoffTime) {
        this.endReasoningSession(conversationId);
      }
    }
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    return {
      service: 'ReasoningTransparencyService',
      version: '1.0.0',
      activeSessions: this.activeReasoningSessions.size,
      registeredCallbacks: this.progressCallbacks.size,
      capabilities: [
        'step-by-step-reasoning',
        'progress-tracking',
        'planned-steps-explanation',
        'tool-execution-reasoning',
        'user-friendly-explanations',
      ],
    };
  }
}

// Export singleton instance
export const reasoningTransparencyService = new ReasoningTransparencyService();
