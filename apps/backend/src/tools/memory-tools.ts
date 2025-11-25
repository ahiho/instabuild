/**
 * Memory management tools for maintaining conversation context
 * Provides tools for reading, writing, and updating MEMORY.md
 */

import type {
  EnhancedToolDefinition,
  ToolExecutionContext,
} from '@instabuild/shared/types';
import { ToolCategory } from '@instabuild/shared/types';
import { z } from 'zod';
import { logger } from '../lib/logger.js';
import { toolRegistry } from '../services/toolRegistry.js';
import { containerFilesystem } from './container-filesystem.js';

/**
 * Validate sandbox context for memory operations
 */
function validateSandboxContext(context: ToolExecutionContext): {
  success: false;
  userFeedback: string;
  previewRefreshNeeded: false;
  technicalDetails: { error: string };
} | null {
  if (!context.sandboxId) {
    logger.warn('Memory tool execution attempted without sandbox context', {
      toolCallId: context.toolCallId,
    });
    return {
      success: false,
      userFeedback:
        'Memory operations require a sandbox environment. Sandbox is not available for this conversation.',
      previewRefreshNeeded: false,
      technicalDetails: {
        error: 'Sandbox context required - sandboxId is missing',
      },
    };
  }
  return null;
}

/**
 * NOTE: read_memory tool has been removed.
 * Memory is now automatically loaded at conversation start via loadMemory() in AgenticAIService.
 * This eliminates the unnecessary tool call overhead and improves performance.
 */

/**
 * Tool for writing/updating memory (MEMORY.md)
 */
const writeMemoryTool: EnhancedToolDefinition = {
  name: 'write_memory',
  displayName: 'WriteMemory',
  description:
    'Writes or updates the conversation memory in MEMORY.md. Use this to record important information, decisions, preferences, and context that should be remembered across the conversation. This helps maintain consistency and avoid repeating questions.',
  userDescription:
    'save important context, decisions, and information to conversation memory',
  category: ToolCategory.FILE_SYSTEM,
  safetyLevel: 'safe',
  inputSchema: z.object({
    content: z
      .string()
      .describe(
        'The memory content to write. Should be well-structured markdown with clear sections. Include key decisions, user preferences, project context, and important information.'
      ),
    mode: z
      .enum(['overwrite', 'append'])
      .optional()
      .describe(
        'How to write the memory: "overwrite" replaces entire file (default), "append" adds to existing content'
      ),
  }),

  async execute(
    input: {
      content: string;
      mode?: 'overwrite' | 'append';
    },
    context: ToolExecutionContext
  ) {
    try {
      // Validate sandbox context
      const sandboxError = validateSandboxContext(context);
      if (sandboxError) {
        return sandboxError;
      }

      const { content, mode = 'overwrite' } = input;
      const memoryPath = '/workspace/MEMORY.md';

      logger.info('Memory write requested', {
        mode,
        contentLength: content.length,
        toolCallId: context.toolCallId,
        sandboxId: context.sandboxId,
      });

      let finalContent = content;

      if (mode === 'append') {
        // Read existing content if file exists
        const exists = await containerFilesystem.exists(
          context.sandboxId!,
          memoryPath,
          context.userId
        );

        if (exists) {
          const existingContent = await containerFilesystem.readFile(
            context.sandboxId!,
            memoryPath,
            'utf8',
            context.userId
          );

          // Append with proper spacing
          finalContent = existingContent.trim()
            ? `${existingContent.trim()}\n\n---\n\n${content}`
            : content;
        }
      }

      // Write memory file
      await containerFilesystem.writeFile(
        context.sandboxId!,
        memoryPath,
        finalContent,
        context.userId
      );

      const lineCount = finalContent.split('\n').length;
      const action = mode === 'append' ? 'Updated' : 'Saved';

      return {
        success: true,
        data: {
          path: memoryPath,
          contentLength: finalContent.length,
          lineCount,
          mode,
        },
        userFeedback: `${action} conversation memory (${lineCount} lines)`,
        previewRefreshNeeded: false,
        technicalDetails: {
          path: memoryPath,
          mode,
          contentLength: finalContent.length,
          lineCount,
          message: `${action} memory successfully`,
        },
      };
    } catch (error) {
      logger.error('Error writing memory', {
        error: error instanceof Error ? error.message : String(error),
        toolCallId: context.toolCallId,
      });

      return {
        success: false,
        userFeedback: 'Failed to write conversation memory',
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
    tags: ['memory', 'context', 'conversation', 'save'],
    examples: [
      {
        description: 'Save initial project context',
        input: {
          content: `# Project Memory

## User Preferences
- Prefers dark mode styling
- Minimalist design approach

## Project Context
- Building a SaaS landing page
- Target audience: developers
- Primary CTA: Sign up for beta`,
          mode: 'overwrite',
        },
      },
      {
        description: 'Append new decision to memory',
        input: {
          content: `## New Decision (2024-01-15)
User chose to use pricing toggle variant for pricing section.`,
          mode: 'append',
        },
      },
    ],
  },
};

/**
 * NOTE: read_guidelines tool has been REMOVED (as of 2025-11-20)
 *
 * Reason: Guidelines are now embedded directly in the system prompt to prevent
 * them from being pruned when using pruneMessages() for token optimization.
 *
 * Component APIs, TypeScript patterns, and Tailwind rules are now part of the
 * "COMPONENT API REFERENCE" section in SystemPromptBuilder.ts, ensuring they're
 * always available regardless of message history length.
 *
 * This eliminates:
 * - Tool call overhead
 * - Risk of guidelines being pruned from context
 * - Need to re-call read_guidelines() in long conversations
 */

/**
 * Register memory management tools
 * NOTE: read_memory tool has been removed - memory is now auto-loaded
 * NOTE: read_guidelines tool has been removed - guidelines are now in system prompt
 */
export function registerMemoryTools() {
  try {
    toolRegistry.registerEnhancedTool(writeMemoryTool);
    logger.info(
      'Memory management tools registered successfully (read_memory and read_guidelines removed - now auto-loaded/embedded in system prompt)'
    );
  } catch (error) {
    logger.error('Failed to register memory tools', { error });
    throw error;
  }
}
