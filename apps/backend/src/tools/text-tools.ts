import type {
  ToolDefinition,
  ToolExecutionContext,
} from '@instabuild/shared/types';
import { z } from 'zod';
import { toolRegistry } from '../services/toolRegistry.js';

/**
 * Text transformation tool for basic text operations
 */
const textTransformTool: ToolDefinition = {
  name: 'text_transform',
  description:
    'Transform text by converting to uppercase, lowercase, or title case',
  inputSchema: z.object({
    text: z.string().describe('The text to transform'),
    operation: z
      .enum(['uppercase', 'lowercase', 'titlecase'])
      .describe('The transformation operation to perform'),
  }),
  async execute(input, context: ToolExecutionContext) {
    const { text, operation } = input;

    switch (operation) {
      case 'uppercase':
        return { transformedText: text.toUpperCase() };
      case 'lowercase':
        return { transformedText: text.toLowerCase() };
      case 'titlecase':
        return {
          transformedText: text.replace(
            /\w\S*/g,
            txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
          ),
        };
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  },
  timeout: 5000,
};

/**
 * Word count tool for analyzing text
 */
const wordCountTool: ToolDefinition = {
  name: 'word_count',
  description: 'Count words, characters, and lines in text',
  inputSchema: z.object({
    text: z.string().describe('The text to analyze'),
  }),
  async execute(input, context: ToolExecutionContext) {
    const { text } = input;

    const words = text
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0);
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, '').length;
    const lines = text.split('\n').length;

    return {
      words: words.length,
      characters,
      charactersNoSpaces,
      lines,
      averageWordsPerLine:
        lines > 0 ? Math.round((words.length / lines) * 100) / 100 : 0,
    };
  },
  timeout: 5000,
};

/**
 * Register all text tools
 */
export function registerTextTools() {
  toolRegistry.registerTool(textTransformTool);
  toolRegistry.registerTool(wordCountTool);
}
