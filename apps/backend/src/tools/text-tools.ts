import type {
  EnhancedToolDefinition,
  ToolExecutionContext,
} from '@instabuild/shared/types';
import { ToolCategory } from '@instabuild/shared/types';
import { z } from 'zod';
import { logger } from '../lib/logger.js';
import { toolRegistry } from '../services/toolRegistry.js';

console.log('🔧 NEW TEXT TOOLS MODULE LOADED');

/**
 * Text transformation tool for basic text operations
 */
const textTransformTool: EnhancedToolDefinition = {
  name: 'text_transform',
  displayName: 'Transform Text',
  description:
    'Transform text by converting to uppercase, lowercase, or title case',
  userDescription: 'change the case of text (uppercase, lowercase, title case)',
  category: ToolCategory.UTILITY,
  safetyLevel: 'safe',
  inputSchema: z.object({
    text: z.string().describe('The text to transform'),
    operation: z
      .enum(['uppercase', 'lowercase', 'titlecase'])
      .describe('The transformation operation to perform'),
  }),

  async execute(
    input: {
      text: string;
      operation: 'uppercase' | 'lowercase' | 'titlecase';
    },
    context: ToolExecutionContext
  ) {
    try {
      const { text, operation } = input;

      let transformedText: string;
      switch (operation) {
        case 'uppercase':
          transformedText = text.toUpperCase();
          break;
        case 'lowercase':
          transformedText = text.toLowerCase();
          break;
        case 'titlecase':
          transformedText = text.replace(
            /\w\S*/g,
            (txt: string) =>
              txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
          );
          break;
        default:
          return {
            success: false,
            userFeedback: `Unknown operation: ${operation}`,
            previewRefreshNeeded: false,
          };
      }

      return {
        success: true,
        data: { transformedText },
        userFeedback: `Successfully transformed text to ${operation}: "${transformedText}"`,
        previewRefreshNeeded: false,
        technicalDetails: {
          originalText: text,
          operation,
          transformedText,
        },
      };
    } catch (error) {
      logger.error('Error transforming text', {
        error: error instanceof Error ? error.message : String(error),
        toolCallId: context.toolCallId,
      });

      return {
        success: false,
        userFeedback: 'Failed to transform text',
        previewRefreshNeeded: false,
        technicalDetails: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },

  estimatedDuration: 1000,
  metadata: {
    version: '1.0.0',
    tags: ['text', 'transform', 'utility'],
    examples: [
      {
        description: 'Convert text to uppercase',
        input: {
          text: 'hello world',
          operation: 'uppercase',
        },
      },
    ],
  },
};

/**
 * Register all text tools
 */
export function registerTextTools() {
  console.log('🔧 NEW REGISTER TEXT TOOLS CALLED');
  try {
    logger.info('Starting text tools registration...');

    logger.info('Registering text_transform tool...');
    toolRegistry.registerEnhancedTool(textTransformTool);
    logger.info('text_transform tool registered successfully');

    logger.info('Text tools registered successfully', {
      toolCount: 1,
      tools: ['text_transform'],
    });
  } catch (error) {
    console.error('🔧 NEW TEXT TOOLS REGISTRATION ERROR:', error);
    logger.error('Failed to register text tools', { error });
    throw error;
  }
}
