import type {
  EnhancedToolDefinition,
  ToolExecutionContext,
} from '@instabuild/shared/types';
import { ToolCategory } from '@instabuild/shared/types';
import * as path from 'node:path';
import { z } from 'zod';
import { logger } from '../lib/logger.js';
import { toolRegistry } from '../services/toolRegistry.js';
import { containerFilesystem } from './container-filesystem.js';
import { sandboxManager } from '../services/sandboxManager.js';

/**
 * Enforce sandbox context requirement
 * ALL validation tools MUST execute within isolated containers.
 */
function validateSandboxContext(context: ToolExecutionContext): {
  success: false;
  userFeedback: string;
  previewRefreshNeeded: false;
  technicalDetails: { error: string };
} | null {
  if (!context.sandboxId) {
    logger.warn('Tool execution attempted without sandbox context', {
      toolCallId: context.toolCallId,
    });
    return {
      success: false,
      userFeedback:
        'This operation requires a sandbox environment. Sandbox is not available for this conversation.',
      previewRefreshNeeded: false,
      technicalDetails: {
        error: 'Sandbox context required - sandboxId is missing',
      },
    };
  }
  return null;
}

/**
 * Validation error details
 */
interface ValidationError {
  file?: string;
  line?: number;
  column?: number;
  message: string;
  type: 'syntax' | 'reference' | 'semantic';
  severity: 'error' | 'warning';
}

/**
 * Parse TypeScript compiler (tsc) output
 * Handles two different error formats:
 * 1. TSC direct output: filename(line,col): error TSxxxx: message
 * 2. Build tools output: filename:line:col - error TSxxxx: message
 */
function parseTscOutput(output: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const lines = output.split('\n');

  // Format 1 - TSC direct output: filename(line,col): error TSxxxx: message
  const tscFormatRegex =
    /([^(]+)\((\d+),(\d+)\):\s+(error|warning)\s+TS(\d+):\s+(.+)/;

  // Format 2 - Build tools output: filename:line:col - error TSxxxx: message
  const buildFormatRegex =
    /([^:]+):(\d+):(\d+)\s+-\s+(error|warning)\s+TS(\d+):\s+(.+)/;

  lines.forEach(line => {
    // Try tsc format first (more common for direct tsc execution)
    let match = line.match(tscFormatRegex);
    if (match) {
      const [, file, lineStr, columnStr, severity, , message] = match;
      errors.push({
        file,
        line: parseInt(lineStr, 10),
        column: parseInt(columnStr, 10),
        message,
        type: 'syntax',
        severity: severity === 'error' ? 'error' : 'warning',
      });
      return;
    }

    // Try build format (used by vite build and other build tools)
    match = line.match(buildFormatRegex);
    if (match) {
      const [, file, lineStr, columnStr, severity, , message] = match;
      errors.push({
        file,
        line: parseInt(lineStr, 10),
        column: parseInt(columnStr, 10),
        message,
        type: 'syntax',
        severity: severity === 'error' ? 'error' : 'warning',
      });
    }
  });

  return errors;
}

/**
 * Parse Vite build output for errors
 */
function parseBuildOutput(output: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const lines = output.split('\n');

  // Match common error patterns from Vite/esbuild
  // Pattern: Error: message at file.tsx:line:column
  const buildErrorRegex = /error\s+(\w+):\s+(.+?)\s+at\s+(.+?):(\d+):(\d+)/i;
  // Pattern: ✖ [ERROR] message
  const viteErrorRegex = /✖\s+\[ERROR\]\s+(.+)/;

  lines.forEach(line => {
    const buildMatch = line.match(buildErrorRegex);
    if (buildMatch) {
      const [, type, message, , lineNum, colNum] = buildMatch;
      errors.push({
        line: parseInt(lineNum, 10),
        column: parseInt(colNum, 10),
        message: `[${type}] ${message}`,
        type: 'syntax',
        severity: 'error',
      });
    }

    const viteMatch = line.match(viteErrorRegex);
    if (viteMatch) {
      errors.push({
        message: viteMatch[1],
        type: 'syntax',
        severity: 'error',
      });
    }
  });

  return errors;
}

/**
 * Tool for validating code syntax and file references
 */
const validateCodeTool: EnhancedToolDefinition = {
  name: 'validate_code',
  displayName: 'ValidateCode',
  description:
    'Validates the entire TypeScript/JavaScript project using type checking and build. Runs full TypeScript type check (tsc --noEmit) using project tsconfig.json settings, then runs Vite build to ensure the project compiles successfully. This validates all files in the project with proper JSX configuration, strict mode, and import path validation.',
  userDescription:
    'validate entire project with TypeScript type checking and build',
  category: ToolCategory.VALIDATION,
  safetyLevel: 'safe',
  inputSchema: z.object({}),

  async execute(_input: Record<string, never>, context: ToolExecutionContext) {
    try {
      // Validate sandbox context
      const sandboxError = validateSandboxContext(context);
      if (sandboxError) {
        return sandboxError;
      }

      logger.info('Project-wide validation requested', {
        toolCallId: context.toolCallId,
        sandboxId: context.sandboxId,
      });

      const errors: ValidationError[] = [];
      let buildOutput = '';
      let tscOutput = '';
      let buildSuccess = false;

      // Stage 1: Run TypeScript compiler
      logger.info('Running TypeScript compiler', {
        mode: 'project-wide',
        sandboxId: context.sandboxId,
      });

      try {
        // Use --project flag to ensure tsconfig.json is respected
        // This ensures proper JSX configuration, strict mode, and import path validation
        const tscArgs = [
          'tsc',
          '--noEmit',
          '--project',
          '/workspace/tsconfig.json',
        ];

        const tscResult = await sandboxManager.executeCommand({
          sandboxId: context.sandboxId!,
          command: 'npx',
          args: tscArgs,
          workingDir: '/workspace',
          timeout: 300000, // 5 minutes for type checking
          userId: context.userId,
        });

        // Combine stdout and stderr for error parsing
        tscOutput = tscResult.stdout + (tscResult.stderr || '');

        // Parse tsc output for errors
        const tscErrors = parseTscOutput(tscOutput);

        if (tscErrors.length > 0) {
          errors.push(...tscErrors);
          logger.info('TypeScript compilation errors found', {
            errorCount: tscErrors.length,
          });
        } else {
          logger.info('TypeScript compilation passed');
        }
      } catch (tscError) {
        // tsc errors are expected if there are type issues
        // Continue to parse output
        tscOutput =
          tscError instanceof Error ? tscError.message : String(tscError);
        const tscErrors = parseTscOutput(tscOutput);
        if (tscErrors.length > 0) {
          errors.push(...tscErrors);
          logger.info('TypeScript compilation errors found', {
            errorCount: tscErrors.length,
          });
        }
      }

      // Stage 2: Run build if tsc passed
      if (errors.length === 0) {
        logger.info('tsc passed, proceeding to build', {
          sandboxId: context.sandboxId,
        });

        try {
          const buildResult = await sandboxManager.executeCommand({
            sandboxId: context.sandboxId!,
            command: 'npm',
            args: ['run', 'build'],
            workingDir: '/workspace',
            timeout: 300000, // 5 minutes for build
            userId: context.userId,
          });

          buildOutput = buildResult.stdout + (buildResult.stderr || '');
          buildSuccess = buildResult.success;

          if (!buildSuccess) {
            const buildErrors = parseBuildOutput(buildOutput);
            if (buildErrors.length > 0) {
              errors.push(...buildErrors);
              logger.info('Build errors found', {
                errorCount: buildErrors.length,
              });
            } else {
              // If we couldn't parse specific errors, return generic build error
              errors.push({
                message: 'Build failed - check output for details',
                type: 'syntax',
                severity: 'error',
              });
            }
          } else {
            logger.info('Build completed successfully');
          }
        } catch (buildError) {
          // Build may have failed, parse the output
          buildOutput =
            buildError instanceof Error
              ? buildError.message
              : String(buildError);
          const buildErrors = parseBuildOutput(buildOutput);
          if (buildErrors.length > 0) {
            errors.push(...buildErrors);
            logger.info('Build errors found', {
              errorCount: buildErrors.length,
            });
          } else {
            // If we couldn't parse specific errors, return generic build error
            errors.push({
              message: 'Build failed - check output for details',
              type: 'syntax',
              severity: 'error',
            });
          }
        }
      }

      // Format results
      const isValid = errors.length === 0;

      let resultMessage = 'Full project validation complete:\n';

      if (isValid && buildSuccess) {
        resultMessage +=
          '✅ All checks passed: TypeScript compilation and build succeeded';
      } else if (errors.length > 0) {
        resultMessage += `❌ ${errors.length} error(s) found:\n`;
        errors.forEach(error => {
          const fileInfo = error.file ? `${error.file}` : '';
          const location = error.line ? `:${error.line}:${error.column}` : '';
          const fullLocation = fileInfo + location;
          resultMessage += `  • ${fullLocation ? `${fullLocation} - ` : ''}${error.message}\n`;
        });
      }

      const userMessage = isValid
        ? 'Full project validation passed - TypeScript and build succeeded'
        : `Found ${errors.length} validation error(s)`;

      return {
        success: isValid,
        data: {
          validation: {
            isValid,
            errors,
            warnings: [],
            scope: 'project',
          },
          summary: {
            isValid,
            errorCount: errors.length,
            warningCount: 0,
            tscPassed:
              errors.filter(
                e => e.type === 'syntax' && !e.message.includes('Build')
              ).length === 0,
            buildPassed: buildSuccess,
          },
          output: {
            tsc: tscOutput.substring(0, 1000), // Truncate to 1000 chars
            build: buildOutput.substring(0, 1000),
          },
        },
        userFeedback: userMessage,
        previewRefreshNeeded: false,
        technicalDetails: {
          scope: 'project',
          isValid,
          errorCount: errors.length,
          errors,
          formattedResults: resultMessage.trim(),
        },
      };
    } catch (error) {
      logger.error('Error validating code', {
        error: error instanceof Error ? error.message : String(error),
        toolCallId: context.toolCallId,
      });

      return {
        success: false,
        userFeedback: 'Failed to validate code',
        previewRefreshNeeded: false,
        technicalDetails: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },

  estimatedDuration: 30000,
  timeout: 480000, // 8 minutes total (5min tsc + 5min build, running sequentially)
  metadata: {
    version: '5.0.0',
    tags: [
      'validation',
      'typescript',
      'build',
      'code-quality',
      'tsc',
      'vite',
      'project-wide',
    ],
    examples: [
      {
        description: 'Validate entire project with full type check and build',
        input: {},
      },
    ],
  },
};

/**
 * Tool for automatically fixing common code issues
 */
const fixCodeTool: EnhancedToolDefinition = {
  name: 'fix_code',
  displayName: 'FixCode',
  description:
    'Automatically fixes common code issues found during validation, such as missing semicolons, unclosed tags, and basic syntax errors. Creates a backup of the original file before making changes.',
  userDescription: 'automatically fix common code syntax and style issues',
  category: ToolCategory.VALIDATION,
  safetyLevel: 'potentially_destructive',
  inputSchema: z.object({
    file_path: z.string().describe('The absolute path to the file to fix'),
    create_backup: z
      .boolean()
      .optional()
      .describe('Whether to create a backup file (default: true)'),
    fix_types: z
      .array(z.enum(['syntax', 'style', 'references']))
      .optional()
      .describe('Types of issues to fix (default: all)'),
  }),

  async execute(
    input: {
      file_path: string;
      create_backup?: boolean;
      fix_types?: ('syntax' | 'style' | 'references')[];
    },
    context: ToolExecutionContext
  ) {
    try {
      // Validate sandbox context
      const sandboxError = validateSandboxContext(context);
      if (sandboxError) {
        return sandboxError;
      }

      const {
        file_path: filePath,
        create_backup: createBackup = true,
        fix_types: fixTypes = ['syntax', 'style'],
      } = input;

      logger.info('Code fixing requested', {
        path: filePath,
        createBackup,
        fixTypes,
        toolCallId: context.toolCallId,
        sandboxId: context.sandboxId,
      });

      // Validate path is absolute
      if (!path.isAbsolute(filePath)) {
        return {
          success: false,
          userFeedback: `Path must be absolute: ${filePath}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Path must be absolute',
            providedPath: filePath,
          },
        };
      }

      // Check if file exists in container
      const exists = await containerFilesystem.exists(
        context.sandboxId!,
        filePath,
        context.userId
      );
      if (!exists) {
        return {
          success: false,
          userFeedback: `File not found: ${filePath}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'File not found',
            path: filePath,
          },
        };
      }

      // Read original content from container
      const originalContent = await containerFilesystem.readFile(
        context.sandboxId!,
        filePath,
        'utf8',
        context.userId
      );
      let fixedContent = originalContent;
      const fixes: string[] = [];

      const fileExtension = path.extname(filePath).toLowerCase();

      // Create backup if requested
      if (createBackup) {
        const backupPath = `${filePath}.backup`;
        await containerFilesystem.writeFile(
          context.sandboxId!,
          backupPath,
          originalContent,
          context.userId
        );
        fixes.push(`Created backup at ${backupPath}`);
      }

      // Apply fixes based on file type and requested fix types
      if (fixTypes.includes('style')) {
        if (fileExtension === '.css') {
          // Fix missing semicolons in CSS
          fixedContent = fixedContent.replace(
            /([^;{}])\s*\n\s*([a-zA-Z-]+\s*:)/g,
            '$1;\n  $2'
          );
          if (fixedContent !== originalContent) {
            fixes.push('Added missing semicolons in CSS properties');
          }
        }

        if (['.js', '.jsx', '.ts', '.tsx'].includes(fileExtension)) {
          // Fix var to let/const
          const varCount = (fixedContent.match(/\bvar\s+/g) || []).length;
          fixedContent = fixedContent.replace(/\bvar\s+/g, 'let ');
          if (varCount > 0) {
            fixes.push(`Replaced ${varCount} 'var' declarations with 'let'`);
          }

          // Fix == to ===
          const eqCount = (fixedContent.match(/[^=!]==(?!=)/g) || []).length;
          fixedContent = fixedContent.replace(/([^=!])==(?!=)/g, '$1===');
          if (eqCount > 0) {
            fixes.push(`Replaced ${eqCount} '==' with '==='`);
          }
        }
      }

      if (fixTypes.includes('syntax')) {
        if (fileExtension === '.html') {
          // Add missing alt attributes to images
          const imgMatches = fixedContent.match(/<img[^>]*>/g);
          if (imgMatches) {
            imgMatches.forEach(img => {
              if (!img.includes('alt=')) {
                const fixedImg = img.replace('>', ' alt="">');
                fixedContent = fixedContent.replace(img, fixedImg);
                fixes.push('Added missing alt attributes to images');
              }
            });
          }
        }
      }

      // Write fixed content if changes were made
      if (fixedContent !== originalContent) {
        await containerFilesystem.writeFile(
          context.sandboxId!,
          filePath,
          fixedContent,
          context.userId
        );

        const fixCount = fixes.length - (createBackup ? 1 : 0);
        const userMessage = `Applied ${fixCount} fix(es) to ${path.basename(filePath)}`;

        return {
          success: true,
          data: {
            fixes,
            fixCount,
            hasBackup: createBackup,
            originalLength: originalContent.length,
            fixedLength: fixedContent.length,
          },
          userFeedback: userMessage,
          previewRefreshNeeded: true,
          changedFiles: [filePath],
          technicalDetails: {
            path: filePath,
            fixes,
            fixCount,
            hasBackup: createBackup,
          },
        };
      } else {
        return {
          success: true,
          data: {
            fixes: [],
            fixCount: 0,
            hasBackup: createBackup,
            originalLength: originalContent.length,
            fixedLength: fixedContent.length,
          },
          userFeedback: 'No fixes needed - file is already in good shape',
          previewRefreshNeeded: false,
          technicalDetails: {
            path: filePath,
            message: 'No fixes applied',
          },
        };
      }
    } catch (error) {
      logger.error('Error fixing code', {
        error: error instanceof Error ? error.message : String(error),
        toolCallId: context.toolCallId,
      });

      return {
        success: false,
        userFeedback: 'Failed to fix code',
        previewRefreshNeeded: false,
        technicalDetails: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },

  estimatedDuration: 4000,
  metadata: {
    version: '1.0.0',
    tags: ['validation', 'fix', 'auto-repair', 'code-quality'],
    examples: [
      {
        description: 'Fix syntax and style issues in a JavaScript file',
        input: {
          file_path: '/home/user/project/script.js',
          create_backup: true,
          fix_types: ['syntax', 'style'],
        },
      },
      {
        description: 'Fix only style issues without backup',
        input: {
          file_path: '/home/user/project/styles.css',
          create_backup: false,
          fix_types: ['style'],
        },
      },
    ],
  },
};

/**
 * Register validation tools
 */
export function registerValidationTools() {
  try {
    toolRegistry.registerEnhancedTool(validateCodeTool);
    toolRegistry.registerEnhancedTool(fixCodeTool);

    logger.info('Validation tools registered successfully', {
      toolCount: 2,
      tools: ['validate_code', 'fix_code'],
    });
  } catch (error) {
    logger.error('Failed to register validation tools', { error });
    throw error;
  }
}
