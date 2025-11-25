import type {
  EnhancedToolDefinition,
  ToolExecutionContext,
} from '@instabuild/shared/types';
import { ToolCategory } from '@instabuild/shared/types';
import { z } from 'zod';
import { logger } from '../lib/logger.js';
import { toolRegistry } from '../services/toolRegistry.js';
import { sandboxManager } from '../services/sandboxManager.js';
import {
  ALLOWED_SANDBOX_COMMANDS,
  SAFE_PACKAGE_SUBCOMMANDS,
  DANGEROUS_FLAGS,
  ALLOWED_GIT_SUBCOMMANDS,
} from '../config/sandboxSecurity.js';

/**
 * Validate command and arguments for security
 */
function validateCommand(
  command: string,
  args: string[]
): { valid: boolean; error?: string } {
  // Check if command is allowed
  if (!ALLOWED_SANDBOX_COMMANDS.has(command)) {
    return {
      valid: false,
      error: `Command '${command}' is not allowed. Allowed commands: ${Array.from(ALLOWED_SANDBOX_COMMANDS).join(', ')}`,
    };
  }

  // For pnpm, npm, and yarn, validate the subcommand and arguments
  if (['pnpm', 'npm', 'yarn'].includes(command) && args.length > 0) {
    const firstArg = args[0];

    // If first arg is not a subcommand (doesn't start with -), validate it
    if (!firstArg.startsWith('-')) {
      if (!SAFE_PACKAGE_SUBCOMMANDS.has(firstArg)) {
        return {
          valid: false,
          error: `Subcommand '${firstArg}' is not allowed. Allowed subcommands: ${Array.from(SAFE_PACKAGE_SUBCOMMANDS).join(', ')}`,
        };
      }
    }

    // Check for dangerous flags
    for (const arg of args) {
      if (DANGEROUS_FLAGS.has(arg)) {
        return {
          valid: false,
          error: `Flag '${arg}' is not allowed for security reasons`,
        };
      }
    }
  }

  // For git, validate subcommands
  if (command === 'git' && args.length > 0) {
    const firstArg = args[0];
    if (!firstArg.startsWith('-') && !ALLOWED_GIT_SUBCOMMANDS.has(firstArg)) {
      return {
        valid: false,
        error: `Git subcommand '${firstArg}' is not allowed`,
      };
    }
  }

  return { valid: true };
}

/**
 * Tool for executing shell commands in sandbox
 */
const shellTool: EnhancedToolDefinition = {
  name: 'execute_command',
  displayName: 'Shell',
  description:
    'Executes a shell command in the secure sandbox environment. Use this to run build scripts, tests, package installations, git commands, and other development tools. Commands are validated for security and executed with proper isolation. IMPORTANT: This project uses pnpm as the package manager. Always use "pnpm" instead of "npm" or "yarn" for package management commands (e.g., "pnpm install", "pnpm dev", "pnpm build").',
  userDescription:
    'run shell commands like pnpm install, pnpm test, git status',
  category: ToolCategory.UTILITY,
  safetyLevel: 'potentially_destructive', // Commands can modify files
  inputSchema: z.object({
    command: z
      .string()
      .describe(
        'The shell command to execute (e.g., "pnpm", "git", "ls", "cat"). Only approved commands are allowed for security. IMPORTANT: Use "pnpm" not "npm" for package management.'
      ),
    args: z
      .array(z.string())
      .optional()
      .describe(
        'Optional array of arguments for the command (e.g., ["install", "lodash"] for npm install lodash)'
      ),
    working_dir: z
      .string()
      .optional()
      .describe(
        'Optional working directory for command execution. Defaults to /workspace if not specified.'
      ),
    timeout: z
      .number()
      .optional()
      .describe(
        'Optional timeout in seconds. Commands will be terminated if they exceed this duration. Defaults to 60 seconds.'
      ),
  }),

  async execute(
    input: {
      command: string;
      args?: string[];
      working_dir?: string;
      timeout?: number;
    },
    context: ToolExecutionContext
  ) {
    try {
      // Validate sandbox context
      if (!context.sandboxId) {
        logger.warn('Shell command attempted without sandbox context', {
          toolCallId: context.toolCallId,
        });
        return {
          success: false,
          userFeedback:
            'This command requires a sandbox environment. Sandbox is not available.',
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Sandbox context required - sandboxId is missing',
          },
        };
      }

      // eslint-disable-next-line camelcase
      const { command, args = [], working_dir, timeout = 60 } = input;

      // Build command string for logging
      const fullCommand =
        args.length > 0 ? `${command} ${args.join(' ')}` : command;

      logger.info('Shell command requested', {
        command,
        args,
        // eslint-disable-next-line camelcase
        workingDir: working_dir,
        timeout,
        toolCallId: context.toolCallId,
        sandboxId: context.sandboxId,
      });

      // Validate command and arguments
      const validation = validateCommand(command, args);
      if (!validation.valid) {
        logger.warn('Command validation failed', {
          command,
          args,
          error: validation.error,
          toolCallId: context.toolCallId,
        });

        return {
          success: false,
          userFeedback: `Command blocked: ${validation.error}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: validation.error,
            command,
            args,
          },
        };
      }

      // Execute command in sandbox
      const startTime = Date.now();
      const result = await sandboxManager.executeCommand({
        sandboxId: context.sandboxId,
        command,
        args,
        // eslint-disable-next-line camelcase
        workingDir: working_dir || '/workspace',
        timeout,
        userId: context.userId,
      });

      const executionTime = Date.now() - startTime;

      // Check if command was successful
      if (!result.success) {
        return {
          success: false,
          userFeedback: `Command failed: ${fullCommand}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            command: fullCommand,
            exitCode: result.exitCode,
            stdout: result.stdout,
            stderr: result.stderr,
            executionTime,
            error: result.error,
          },
        };
      }

      // Format output for display
      const hasStdout = result.stdout.length > 0;
      const hasStderr = result.stderr.length > 0;

      let outputSummary = `Command executed successfully: ${fullCommand}\n`;
      if (hasStdout) {
        outputSummary += `\nOutput:\n${result.stdout}`;
      }
      if (hasStderr) {
        outputSummary += `\nWarnings/Errors:\n${result.stderr}`;
      }

      // Determine if preview refresh is needed based on command
      const fileModifyingCommands = [
        'npm',
        'pnpm',
        'yarn',
        'git',
        'touch',
        'mkdir',
        'rm',
        'mv',
        'cp',
      ];
      const mayModifyFiles = fileModifyingCommands.includes(command);

      return {
        success: true,
        data: {
          command: fullCommand,
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
          executionTime: result.executionTime,
        },
        userFeedback: `Executed: ${fullCommand} (exit code: ${result.exitCode})`,
        previewRefreshNeeded: mayModifyFiles,
        technicalDetails: {
          command: fullCommand,
          exitCode: result.exitCode,
          executionTime: result.executionTime,
          stdoutLength: result.stdout.length,
          stderrLength: result.stderr.length,
          fullOutput: outputSummary,
        },
      };
    } catch (error) {
      logger.error('Error executing shell command', {
        error: error instanceof Error ? error.message : String(error),
        toolCallId: context.toolCallId,
      });

      return {
        success: false,
        userFeedback: 'Failed to execute shell command',
        previewRefreshNeeded: false,
        technicalDetails: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },

  estimatedDuration: 5000,
  metadata: {
    version: '1.0.0',
    tags: ['shell', 'command', 'execution', 'development'],
    examples: [
      {
        description: 'Install a package with pnpm',
        input: {
          command: 'pnpm',
          args: ['add', 'lodash'],
        },
      },
      {
        description: 'Run tests with pnpm',
        input: {
          command: 'pnpm',
          args: ['test'],
        },
      },
      {
        description: 'Start development server',
        input: {
          command: 'pnpm',
          args: ['dev'],
        },
      },
      {
        description: 'Check git status',
        input: {
          command: 'git',
          args: ['status'],
        },
      },
      {
        description: 'List files in directory',
        input: {
          command: 'ls',
          args: ['-la', '/workspace/src'],
        },
      },
      {
        description: 'Run build command with pnpm',
        input: {
          command: 'pnpm',
          args: ['build'],
          timeout: 120,
        },
      },
      {
        description: 'Type check with pnpm',
        input: {
          command: 'pnpm',
          args: ['type-check'],
        },
      },
    ],
  },
};

/**
 * Register shell tool
 */
export function registerShellTool() {
  try {
    toolRegistry.registerEnhancedTool(shellTool);
  } catch (error) {
    logger.error('Failed to register shell tool', { error });
    throw error;
  }
}
