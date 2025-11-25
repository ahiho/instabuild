import { stepCountIs } from 'ai';
import { logger } from '../../lib/logger.js';
import { TaskComplexity, TaskTypeConfig } from './types.js';

/**
 * Task configuration manager for handling complexity analysis and step limits
 */
export class TaskConfigurationManager {
  private taskConfigurations: Map<TaskComplexity, TaskTypeConfig> = new Map([
    [
      TaskComplexity.SIMPLE,
      {
        maxSteps: 8, // Increased from 3 to allow search + action
        stopConditions: [stepCountIs(8)],
        description: 'Simple single-file operations or basic queries',
      },
    ],
    [
      TaskComplexity.MODERATE,
      {
        maxSteps: 12, // Increased from 7 to allow more thorough work
        stopConditions: [stepCountIs(12)],
        description: 'Multi-file changes, analysis followed by modifications',
      },
    ],
    [
      TaskComplexity.COMPLEX,
      {
        maxSteps: 25, // Increased from 20 to allow full landing page workflow
        stopConditions: [
          stepCountIs(25),
          // Removed hasToolCall('write_file') to allow AI to iterate (write → validate → fix)
        ],
        description: 'Full feature implementation, significant refactoring',
      },
    ],
    [
      TaskComplexity.ADVANCED,
      {
        maxSteps: 30, // Increased from 25 for complex workflows
        stopConditions: [
          stepCountIs(30),
          // Removed hasToolCall('write_file') to allow AI to iterate (write → validate → fix)
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

  /**
   * Analyze task complexity based on message content
   */
  analyzeTaskComplexity(message: string): TaskComplexity {
    const complexityIndicators = {
      [TaskComplexity.ADVANCED]: [
        /refactor|restructure|rebuild|architecture|migrate/i,
        /multiple.*(?:pages?|components?|sections?)/i,
        /complete.*(?:overhaul|redesign|rewrite)/i,
        /implement.*(?:system|framework|infrastructure)/i,
      ],
      [TaskComplexity.COMPLEX]: [
        /(?:create|generate).*(?:new|multiple)?.*(?:pages?|components?|features?)/i,
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
  getTaskConfiguration(
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
   * Detect if a message requires tool calling based on content analysis
   */
  detectToolCallRequirement(message: string): boolean {
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
   * Get complexity-specific execution guidelines
   */
  getComplexitySpecificGuidelines(complexity?: TaskComplexity): string {
    switch (complexity) {
      case TaskComplexity.SIMPLE:
        return `- Focus on direct, single-step solutions
- Minimize tool usage to essential operations only
- Provide immediate, clear results`;

      case TaskComplexity.MODERATE:
        return `- Break task into 2-4 logical phases
- Use analysis tools before making changes
- AFTER writing code: Run validate_code tool to check for errors
- Fix any validation errors immediately before proceeding`;

      case TaskComplexity.COMPLEX:
        return `- Plan your approach with 3-5 major phases
- Start with comprehensive analysis of existing code
- Make incremental changes and validate after EACH change using validate_code
- Fix validation errors immediately - don't accumulate technical debt
- Document your progress and reasoning at each step`;

      case TaskComplexity.ADVANCED:
        return `- Develop a detailed multi-phase execution plan
- Conduct thorough analysis and research first
- Implement changes in small, testable increments
- Run validate_code after EVERY file write/edit operation
- Fix validation errors immediately and re-validate to confirm
- Provide detailed progress updates and explanations
- Consider rollback strategies for major changes`;

      default:
        return `- Adapt your approach based on task requirements
- Use appropriate analysis before making changes
- Provide clear explanations of your process`;
    }
  }

  /**
   * Track progress for complex workflows
   */
  getComplexWorkflowMilestones(maxSteps: number) {
    return [
      { step: Math.floor(maxSteps * 0.25), name: 'Analysis Phase' },
      { step: Math.floor(maxSteps * 0.5), name: 'Implementation Phase' },
      { step: Math.floor(maxSteps * 0.75), name: 'Integration Phase' },
      { step: maxSteps, name: 'Completion Phase' },
    ];
  }

  /**
   * Get recommended context window size based on task complexity
   * Returns { triggerAt, keepCount } where:
   * - triggerAt: message count threshold to trigger trimming
   * - keepCount: number of recent messages to keep (excluding system message)
   *
   * Updated thresholds for aggressive token reduction (2024-01):
   * - Reduced triggerAt thresholds by ~33%
   * - Reduced keepCount by ~40%
   * - Combined with AI SDK pruneMessages() for optimal context management
   */
  getContextWindowConfig(complexity: TaskComplexity) {
    let config;
    switch (complexity) {
      case TaskComplexity.SIMPLE:
        config = { triggerAt: 10, keepCount: 6 }; // Was 15/10 - small tasks need minimal context
        break;
      case TaskComplexity.MODERATE:
        config = { triggerAt: 15, keepCount: 10 }; // Was 25/15 - medium context window
        break;
      case TaskComplexity.COMPLEX:
        config = { triggerAt: 20, keepCount: 12 }; // Was 30/20 - larger context for complex tasks
        break;
      case TaskComplexity.ADVANCED:
        config = { triggerAt: 25, keepCount: 15 }; // Was 40/25 - maximum context for advanced tasks
        break;
      default:
        config = { triggerAt: 15, keepCount: 10 }; // Default to moderate
    }

    logger.debug('[TASK CONFIG] Context window config retrieved', {
      complexity,
      triggerAt: config.triggerAt,
      keepCount: config.keepCount,
      note: 'Aggressive pruning enabled to reduce token usage',
    });

    return config;
  }
}

export const taskConfigurationManager = new TaskConfigurationManager();
