/**
 * Dev server log viewer tool
 * Retrieves container logs from Vite dev server using Docker API
 */

import type {
  EnhancedToolDefinition,
  ToolExecutionContext,
} from '@instabuild/shared/types';
import { ToolCategory } from '@instabuild/shared/types';
import { z } from 'zod';
import { logger } from '../lib/logger.js';
import { toolRegistry } from '../services/toolRegistry.js';
import { sandboxManager } from '../services/sandboxManager.js';

/**
 * Validate sandbox context for dev server operations
 */
function validateSandboxContext(context: ToolExecutionContext): {
  success: false;
  userFeedback: string;
  previewRefreshNeeded: false;
  technicalDetails: { error: string };
} | null {
  if (!context.sandboxId) {
    logger.warn('Dev server check attempted without sandbox context', {
      toolCallId: context.toolCallId,
    });
    return {
      success: false,
      userFeedback:
        'Dev server operations require a sandbox environment. Sandbox is not available for this conversation.',
      previewRefreshNeeded: false,
      technicalDetails: {
        error: 'Sandbox context required - sandboxId is missing',
      },
    };
  }
  return null;
}

/**
 * Tool for checking dev server status and logs
 */
const checkDevServerTool: EnhancedToolDefinition = {
  name: 'check_dev_server',
  displayName: 'CheckDevServer',
  description:
    'Retrieves the stdout/stderr logs from the Vite development server container using Docker API. Returns raw logs from the running dev server process. Use this to view server output, check if the server started successfully, or troubleshoot compilation errors.',
  userDescription: 'view dev server logs and troubleshoot issues',
  category: ToolCategory.UTILITY,
  safetyLevel: 'safe',
  inputSchema: z.object({
    lines: z
      .number()
      .optional()
      .describe(
        'Number of recent log lines to retrieve. Defaults to 100. Maximum 500.'
      ),
  }),

  async execute(
    input: {
      lines?: number;
    },
    context: ToolExecutionContext
  ) {
    try {
      // Validate sandbox context
      const sandboxError = validateSandboxContext(context);
      if (sandboxError) {
        return sandboxError;
      }

      const { lines = 100 } = input;
      const maxLines = Math.min(lines, 500);

      logger.info('Dev server logs requested', {
        lines: maxLines,
        toolCallId: context.toolCallId,
        sandboxId: context.sandboxId,
      });

      // Get container logs directly from Docker API
      const logsResult = await sandboxManager.getContainerLogs(
        context.sandboxId!,
        {
          tail: maxLines,
          timestamps: true,
        }
      );

      if (!logsResult.success || !logsResult.logs) {
        return {
          success: false,
          userFeedback: `Failed to retrieve dev server logs: ${logsResult.error || 'Unknown error'}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: logsResult.error || 'Unknown error',
          },
        };
      }

      // Return raw logs - let LLM interpret the output
      return {
        success: true,
        data: {
          logs: logsResult.logs,
          lineCount: logsResult.logs.split('\n').length,
        },
        userFeedback: `Dev Server Logs (last ${maxLines} lines):\n\n${logsResult.logs}`,
        previewRefreshNeeded: false,
        technicalDetails: {
          lineCount: logsResult.logs.split('\n').length,
          requestedLines: maxLines,
        },
      };
    } catch (error) {
      logger.error('Error retrieving dev server logs', {
        error: error instanceof Error ? error.message : String(error),
        toolCallId: context.toolCallId,
      });

      return {
        success: false,
        userFeedback: 'Failed to retrieve dev server logs',
        previewRefreshNeeded: false,
        technicalDetails: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },

  estimatedDuration: 2000,
  metadata: {
    version: '2.0.0',
    tags: ['dev-server', 'vite', 'logs', 'debugging', 'docker'],
    examples: [
      {
        description: 'Get dev server logs with default settings (100 lines)',
        input: {},
      },
      {
        description: 'Get more logs (200 lines)',
        input: {
          lines: 200,
        },
      },
      {
        description: 'Get fewer logs for quick check (50 lines)',
        input: {
          lines: 50,
        },
      },
    ],
  },
};

/**
 * Register dev server tool
 */
export function registerDevServerTool() {
  try {
    toolRegistry.registerEnhancedTool(checkDevServerTool);
    logger.info('Dev server tool registered successfully');
  } catch (error) {
    logger.error('Failed to register dev server tool', { error });
    throw error;
  }
}
