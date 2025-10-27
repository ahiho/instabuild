import { ToolCategory } from '@instabuild/shared/types';
import { z } from 'zod';
import { logger } from '../lib/logger.js';
import { toolRegistry } from '../services/toolRegistry.js';

/**
 * Text transformation tool for basic text operations
 */
const textTransformTool = {
  name: 'text_transform',
  displayName: 'Transform Text',
  description:
    'Transform text by converting to uppercase, lowercase, or title case',
  userDescription: 'change the case of text (uppercase, lowercase, title case)',
  category: ToolCategory.UTILITY,
  safetyLevel: 'safe' as const, // Text transformation is safe
  inputSchema: z.object({
    text: z.string().describe('The text to transform'),
    operation: z
      .enum(['uppercase', 'lowercase', 'titlecase'])
      .describe('The transformation operation to perform'),
  }),
  execute: async (input: {
    text: string;
    operation: 'uppercase' | 'lowercase' | 'titlecase';
  }) => {
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
      logger.error('Error transforming text', { error });
      return {
        success: false,
        userFeedback: 'Failed to transform text',
        previewRefreshNeeded: false,
      };
    }
  },
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
 * Word count tool for analyzing text
 */
const wordCountTool = {
  name: 'word_count',
  displayName: 'Count Words',
  description: 'Count words, characters, and lines in text',
  userDescription:
    'analyze text statistics like word count and character count',
  category: ToolCategory.UTILITY,
  safetyLevel: 'safe' as const, // Text analysis is safe
  inputSchema: z.object({
    text: z.string().describe('The text to analyze'),
  }),
  execute: async (input: { text: string }) => {
    try {
      const { text } = input;

      const words = text
        .trim()
        .split(/\s+/)
        .filter((word: string) => word.length > 0);
      const characters = text.length;
      const charactersNoSpaces = text.replace(/\s/g, '').length;
      const lines = text.split('\n').length;
      const averageWordsPerLine =
        lines > 0 ? Math.round((words.length / lines) * 100) / 100 : 0;

      const stats = {
        words: words.length,
        characters,
        charactersNoSpaces,
        lines,
        averageWordsPerLine,
      };

      return {
        success: true,
        data: stats,
        userFeedback: `Text analysis complete: ${stats.words} words, ${stats.characters} characters, ${stats.lines} lines`,
        previewRefreshNeeded: false,
        technicalDetails: stats,
      };
    } catch (error) {
      logger.error('Error analyzing text', { error });
      return {
        success: false,
        userFeedback: 'Failed to analyze text',
        previewRefreshNeeded: false,
      };
    }
  },
  metadata: {
    version: '1.0.0',
    tags: ['text', 'analysis', 'utility'],
    examples: [
      {
        description: 'Analyze text statistics',
        input: {
          text: 'Hello world! This is a sample text.',
        },
      },
    ],
  },
};

/**
 * Register all text tools
 */
export function registerTextTools() {
  try {
    toolRegistry.registerTool(textTransformTool);
    toolRegistry.registerTool(wordCountTool);

    logger.info('Text tools registered successfully', {
      toolCount: 2,
      tools: ['text_transform', 'word_count'],
    });
  } catch (error) {
    logger.error('Failed to register text tools', { error });
    throw error;
  }
}
