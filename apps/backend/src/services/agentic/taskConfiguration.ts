import { hasToolCall, stepCountIs } from 'ai';
import { TaskComplexity, TaskTypeConfig } from './types.js';

/**
 * Task configuration manager for handling complexity analysis and step limits
 */
export class TaskConfigurationManager {
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
}

export const taskConfigurationManager = new TaskConfigurationManager();
