/**
 * Utility for loading conversation memory into the conversation context
 * This replaces the need for the read_memory tool by loading memory upfront
 */

import { logger } from './logger.js';
import { containerFilesystem } from '../tools/container-filesystem.js';

export interface MemoryLoadResult {
  content: string;
  isEmpty: boolean;
  exists: boolean;
}

/**
 * Load memory content from MEMORY.md file in the sandbox
 * @param sandboxId - Docker container ID for sandbox isolation
 * @param userId - User ID for authentication
 * @returns Memory content or empty string if file doesn't exist
 */
export async function loadMemory(
  sandboxId: string | undefined,
  userId: string
): Promise<MemoryLoadResult> {
  // If no sandbox, return empty memory
  if (!sandboxId) {
    logger.debug('No sandbox context - skipping memory load');
    return {
      content: '',
      isEmpty: true,
      exists: false,
    };
  }

  const memoryPath = '/workspace/MEMORY.md';

  try {
    // Check if MEMORY.md exists
    const exists = await containerFilesystem.exists(
      sandboxId,
      memoryPath,
      userId
    );

    if (!exists) {
      logger.debug('Memory file does not exist', { sandboxId });
      return {
        content: '',
        isEmpty: true,
        exists: false,
      };
    }

    // Read memory content
    const content = await containerFilesystem.readFile(
      sandboxId,
      memoryPath,
      'utf8',
      userId
    );

    const isEmpty = content.trim() === '';
    const lineCount = content.split('\n').length;

    logger.info('Memory loaded successfully', {
      sandboxId,
      lineCount,
      isEmpty,
      contentLength: content.length,
    });

    return {
      content,
      isEmpty,
      exists: true,
    };
  } catch (error) {
    logger.error('Failed to load memory', {
      sandboxId,
      error: error instanceof Error ? error.message : String(error),
    });

    // Return empty memory on error (graceful degradation)
    return {
      content: '',
      isEmpty: true,
      exists: false,
    };
  }
}

/**
 * Format memory content as a system message for injection into conversation
 * @param memoryContent - Content from MEMORY.md
 * @returns Formatted message object
 */
export function formatMemoryAsMessage(memoryContent: string): {
  role: 'system';
  content: string;
} {
  if (!memoryContent.trim()) {
    return {
      role: 'system',
      content:
        '# Conversation Memory\n\nNo prior context available. This is a fresh conversation.',
    };
  }

  return {
    role: 'system',
    content: `# Conversation Memory (Auto-loaded)\n\nThe following memory has been automatically loaded from MEMORY.md:\n\n${memoryContent}\n\n---\n\nUse this context to inform your responses. Update memory using write_memory when significant changes occur.`,
  };
}
