/**
 * Thinking and reflection tools for agentic AI system
 * Provides explicit reflection capabilities to prevent task abandonment
 * and ensure 100% completion for no-code users.
 *
 * 
 */

import type {
  EnhancedToolDefinition,
  ToolExecutionContext,
} from '@instabuild/shared/types';
import { ToolCategory } from '@instabuild/shared/types';
import { z } from 'zod';
import { logger } from '../lib/logger.js';
import { toolRegistry } from '../services/toolRegistry.js';

/**
 * Completion checklist schema for task validation
 */
const completionChecklistSchema = z.object({
  all_features_implemented: z
    .boolean()
    .describe('Are all requested features fully implemented?'),
  validation_passing: z
    .boolean()
    .describe('Is the code passing all validation checks (no errors)?'),
  no_todos_or_placeholders: z
    .boolean()
    .describe('Are there no TODOs, placeholders, or incomplete sections?'),
  user_can_use_immediately: z
    .boolean()
    .describe('Can the no-code user use this immediately without fixes?'),
});

/**
 * Input schema for the think tool
 */
const thinkInputSchema = z.object({
  observation: z
    .string()
    .min(10)
    .describe(
      'What was learned from the previous tool execution? Be specific about what worked, what failed, or what was discovered. Example: "The file has 3 import errors from missing @/components/ui imports"'
    ),
  next_step: z
    .string()
    .min(10)
    .describe(
      'What concrete action will you take next and why? Example: "Fix import paths by using relative imports instead of aliases, then re-validate"'
    ),
  task_progress: z
    .string()
    .describe(
      'Honest assessment of progress as percentage and status. Format: "XX% - [status]". Example: "60% - Implementation done, validation pending"'
    ),
  completion_checklist: completionChecklistSchema
    .optional()
    .describe(
      'REQUIRED when task is near completion. Validates all criteria are met before marking task complete.'
    ),
});

type ThinkInput = z.infer<typeof thinkInputSchema>;

/**
 * Tool for AI to reflect on progress and plan next steps
 *
 * This tool implements explicit reflection to prevent task abandonment,
 * a critical feature for no-code users who cannot fix incomplete implementations.
 *
 * Key benefits:
 * - Forces AI to assess what was learned from each action
 * - Requires concrete next step planning (prevents vague "continuing...")
 * - Honest progress tracking
 * - Completion checklist prevents premature "done" state
 *
 * Usage: Call this tool between major actions (after file operations,
 * validation, API calls, etc.) to maintain context and ensure completion.
 */
export const thinkTool: EnhancedToolDefinition<ThinkInput> = {
  name: 'think',
  displayName: 'Think & Reflect',
  description:
    'Reflect on the previous action, assess progress, and plan the next concrete step. Use this between major actions to maintain context and ensure task completion. REQUIRED when approaching task completion to validate all criteria are met.',
  userDescription: 'AI is thinking about progress and planning the next step',
  category: ToolCategory.UTILITY,
  safetyLevel: 'safe',
  inputSchema: thinkInputSchema,

  async execute(input: ThinkInput, context: ToolExecutionContext) {
    try {
      // eslint-disable-next-line camelcase
      const { observation, next_step, task_progress, completion_checklist } =
        input;

      logger.info('Agent thinking step', {
        toolCallId: context.toolCallId,
        conversationId: context.conversationId,
        // eslint-disable-next-line camelcase
        progress: task_progress,
        // eslint-disable-next-line camelcase
        hasChecklist: !!completion_checklist,
      });

      // Analyze completion checklist if provided
      let checklistFeedback = '';
      let isComplete = false;

      // eslint-disable-next-line camelcase
      if (completion_checklist) {
        /* eslint-disable camelcase */
        const {
          all_features_implemented,
          validation_passing,
          no_todos_or_placeholders,
          user_can_use_immediately,
        } = completion_checklist;
        /* eslint-enable camelcase */

        // All criteria must be true for task to be complete
        /* eslint-disable camelcase */
        isComplete =
          all_features_implemented &&
          validation_passing &&
          no_todos_or_placeholders &&
          user_can_use_immediately;
        /* eslint-enable camelcase */

        const incomplete: string[] = [];
        if (isComplete) {
          checklistFeedback =
            '✅ All completion criteria met! Task is ready for user.';
        } else {
          /* eslint-disable camelcase */
          if (!all_features_implemented) {
            incomplete.push('Features not fully implemented');
          }
          if (!validation_passing) incomplete.push('Validation errors exist');
          if (!no_todos_or_placeholders) {
            incomplete.push('TODOs/placeholders remain');
          }
          if (!user_can_use_immediately) {
            incomplete.push('Not ready for user use');
          }
          /* eslint-enable camelcase */

          checklistFeedback = `⚠️ Task NOT complete. Issues: ${incomplete.join(', ')}. Continue working to resolve these.`;
        }

        logger.info('Completion checklist evaluated', {
          toolCallId: context.toolCallId,
          isComplete,
          incomplete,
        });
      }

      // Build feedback message for AI
      const feedbackParts = [
        '💭 Thinking captured successfully.',
        checklistFeedback,
      ];

      // Structured reflection data for analytics and reasoning transparency
      const reflectionData = {
        observation,
        // eslint-disable-next-line camelcase
        next_step,
        // eslint-disable-next-line camelcase
        task_progress,
        // eslint-disable-next-line camelcase
        completion_checklist,
        is_complete: isComplete,
        timestamp: new Date().toISOString(),
      };

      return {
        success: true,
        data: reflectionData,
        userFeedback: feedbackParts.filter(Boolean).join('\n\n'),
        previewRefreshNeeded: false,
        technicalDetails: {
          observation,
          // eslint-disable-next-line camelcase
          next_step,
          // eslint-disable-next-line camelcase
          progress: task_progress,
          // eslint-disable-next-line camelcase
          checklist: completion_checklist,
          is_complete: isComplete,
          message: 'Reflection recorded',
        },
      };
    } catch (error) {
      logger.error('Error in think tool execution', {
        error: error instanceof Error ? error.message : String(error),
        toolCallId: context.toolCallId,
      });

      return {
        success: false,
        userFeedback: 'Failed to process thinking step',
        previewRefreshNeeded: false,
        technicalDetails: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },

  estimatedDuration: 100, // Very fast - just logging and validation
  metadata: {
    version: '1.0.0',
    tags: ['thinking', 'reflection', 'progress', 'planning', 'completion'],
    examples: [
      {
        description: 'Reflect after file operation',
        input: {
          observation:
            'Successfully wrote Hero.tsx with props interface and component implementation',
          next_step:
            'Validate the component for TypeScript errors and test rendering',
          task_progress: '40% - Component created, validation pending',
        },
      },
      {
        description: 'Reflect after validation with errors',
        input: {
          observation:
            'Validation found 3 import errors - @/components/ui paths not resolving',
          next_step:
            'Fix imports by changing to relative paths (../../components/ui), then re-validate',
          task_progress: '60% - Implementation done, fixing import errors',
        },
      },
      {
        description: 'Check completion before finishing',
        input: {
          observation: 'All files created and validation passes with no errors',
          next_step: 'Verify user can use the landing page immediately',
          task_progress: '95% - All implementation and validation complete',
          completion_checklist: {
            all_features_implemented: true,
            validation_passing: true,
            no_todos_or_placeholders: true,
            user_can_use_immediately: true,
          },
        },
      },
      {
        description: 'Incomplete task caught by checklist',
        input: {
          observation: 'Main features implemented but validation has errors',
          next_step: 'Fix validation errors before completing',
          task_progress: '85% - Features done, validation failing',
          completion_checklist: {
            all_features_implemented: true,
            validation_passing: false, // This prevents premature completion
            no_todos_or_placeholders: true,
            user_can_use_immediately: false,
          },
        },
      },
    ],
  },
};

/**
 * Register thinking tools with the tool registry
 */
export function registerThinkingTools() {
  try {
    toolRegistry.registerEnhancedTool(thinkTool);
    logger.info('Thinking tools registered successfully');
  } catch (error) {
    logger.error('Failed to register thinking tools', { error });
    throw error;
  }
}
