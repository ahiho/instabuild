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
import { calculateReplacement } from './utils/text-replacement.js';
import {
  isBinaryFile,
  processFileContent,
} from './utils/file-reading.js';

/**
 * File entry returned by list_directory tool
 */
interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedTime: Date;
}

/**
 * Phase 3.5: Enforce sandbox context requirement
 * ALL filesystem tools MUST execute within isolated containers.
 * NO fallback to host filesystem - this is a critical security requirement.
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
 * Check if a filename matches any of the ignore patterns
 */
function shouldIgnore(filename: string, patterns?: string[]): boolean {
  if (!patterns || patterns.length === 0) {
    return false;
  }

  for (const pattern of patterns) {
    // Convert glob pattern to RegExp
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);
    if (regex.test(filename)) {
      return true;
    }
  }
  return false;
}

/**
 * Tool for listing directory contents
 */
const listDirectoryTool: EnhancedToolDefinition = {
  name: 'list_directory',
  displayName: 'ReadFolder',
  description:
    'Lists the names of files and subdirectories directly within a specified directory path. Can optionally ignore entries matching provided glob patterns.',
  userDescription: 'explore and list files and folders in a directory',
  category: ToolCategory.FILE_SYSTEM,
  safetyLevel: 'safe', // Reading directory contents is safe
  inputSchema: z.object({
    path: z
      .string()
      .describe(
        'The absolute path to the directory to list (must be absolute, not relative)'
      ),
    ignore: z
      .array(z.string())
      .optional()
      .describe(
        'List of glob patterns to ignore (e.g., ["*.log", "node_modules"])'
      ),
  }),

  async execute(
    input: {
      path: string;
      ignore?: string[];
    },
    context: ToolExecutionContext
  ) {
    try {
      // Phase 3.5: Validate sandbox context - REQUIRED for container execution
      const sandboxError = validateSandboxContext(context);
      if (sandboxError) {
        return sandboxError;
      }

      const { path: dirPath, ignore } = input;

      logger.info('Directory listing requested', {
        path: dirPath,
        ignore,
        toolCallId: context.toolCallId,
        sandboxId: context.sandboxId,
      });

      // Validate path is absolute
      if (!path.isAbsolute(dirPath)) {
        return {
          success: false,
          userFeedback: `Path must be absolute: ${dirPath}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Path must be absolute',
            providedPath: dirPath,
          },
        };
      }

      // Phase 3.5: Check if directory exists INSIDE CONTAINER
      const isDir = await containerFilesystem.isDirectory(
        context.sandboxId!,
        dirPath
      );
      if (!isDir) {
        const exists = await containerFilesystem.exists(
          context.sandboxId!,
          dirPath
        );
        if (!exists) {
          return {
            success: false,
            userFeedback: `Directory not found or inaccessible: ${dirPath}`,
            previewRefreshNeeded: false,
            technicalDetails: {
              error: 'Directory not found or inaccessible',
              path: dirPath,
            },
          };
        }
        return {
          success: false,
          userFeedback: `Path is not a directory: ${dirPath}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Path is not a directory',
            path: dirPath,
          },
        };
      }

      // Phase 3.5: Read directory contents from container
      const containerEntries = await containerFilesystem.listDirectory(
        context.sandboxId!,
        dirPath
      );

      if (containerEntries.length === 0) {
        return {
          success: true,
          data: { entries: [], count: 0 },
          userFeedback: `Directory ${dirPath} is empty.`,
          previewRefreshNeeded: false,
          technicalDetails: {
            path: dirPath,
            entryCount: 0,
          },
        };
      }

      // Process entries and apply ignore patterns
      const entries: FileEntry[] = [];
      let ignoredCount = 0;

      for (const entry of containerEntries) {
        // Check if file should be ignored
        if (shouldIgnore(entry.name, ignore)) {
          ignoredCount++;
          continue;
        }

        entries.push({
          name: entry.name,
          path: entry.path,
          isDirectory: entry.isDirectory,
          size: entry.size,
          modifiedTime: entry.modifiedTime || new Date(),
        });
      }

      // Sort entries (directories first, then alphabetically)
      entries.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      // Create formatted content for display
      const directoryContent = entries
        .map(entry => `${entry.isDirectory ? '[DIR] ' : ''}${entry.name}`)
        .join('\n');

      let resultMessage = `Directory listing for ${dirPath}:\n${directoryContent}`;
      if (ignoredCount > 0) {
        resultMessage += `\n\n(${ignoredCount} ignored)`;
      }

      let displayMessage = `Listed ${entries.length} item(s).`;
      if (ignoredCount > 0) {
        displayMessage += ` (${ignoredCount} ignored)`;
      }

      return {
        success: true,
        data: {
          entries,
          count: entries.length,
          ignoredCount,
          formattedListing: directoryContent,
        },
        userFeedback: displayMessage,
        previewRefreshNeeded: false,
        technicalDetails: {
          path: dirPath,
          entryCount: entries.length,
          ignoredCount,
          fullListing: resultMessage,
        },
      };
    } catch (error) {
      logger.error('Error listing directory', {
        error: error instanceof Error ? error.message : String(error),
        toolCallId: context.toolCallId,
        sandboxId: context.sandboxId,
      });

      return {
        success: false,
        userFeedback: 'Failed to list directory contents',
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
    tags: ['filesystem', 'directory', 'list', 'explore'],
    examples: [
      {
        description: 'List files in a directory',
        input: {
          path: '/home/user/project',
        },
      },
      {
        description: 'List files ignoring certain patterns',
        input: {
          path: '/home/user/project',
          ignore: ['*.log', '.git', 'node_modules'],
        },
      },
    ],
  },
};

// Binary file detection and MIME type functions moved to utils/file-reading.js

/**
 * Tool for reading file contents
 */
const readFileTool: EnhancedToolDefinition = {
  name: 'read_file',
  displayName: 'ReadFile',
  description:
    'Reads and returns the content of a specified file. If the file is large, the content will be truncated. Handles text, images (PNG, JPG, GIF, WEBP, SVG, BMP), and PDF files. For text files, it can read specific line ranges.',
  userDescription: 'read and examine the contents of a file',
  category: ToolCategory.FILE_SYSTEM,
  safetyLevel: 'safe', // Reading files is safe
  inputSchema: z.object({
    absolute_path: z
      .string()
      .describe(
        "The absolute path to the file to read (e.g., '/home/user/project/file.txt'). Relative paths are not supported. You must provide an absolute path."
      ),
    offset: z
      .number()
      .optional()
      .describe(
        "Optional: For text files, the 0-based line number to start reading from. Requires 'limit' to be set. Use for paginating through large files."
      ),
    limit: z
      .number()
      .optional()
      .describe(
        "Optional: For text files, maximum number of lines to read. Use with 'offset' to paginate through large files. If omitted, reads the entire file (if feasible, up to a default limit)."
      ),
  }),

  async execute(
    input: {
      absolute_path: string;
      offset?: number;
      limit?: number;
    },
    context: ToolExecutionContext
  ) {
    try {
      // Phase 3: Validate sandbox context
      const sandboxError = validateSandboxContext(context);
      if (sandboxError) {
        return sandboxError;
      }

      const { absolute_path: filePath, offset, limit } = input;

      logger.info('File read requested', {
        path: filePath,
        offset,
        limit,
        toolCallId: context.toolCallId,
        sandboxId: context.sandboxId,
      });

      // Validate path is absolute
      if (!path.isAbsolute(filePath)) {
        return {
          success: false,
          userFeedback: `File path must be absolute, but was relative: ${filePath}. You must provide an absolute path.`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Path must be absolute',
            providedPath: filePath,
          },
        };
      }

      // Validate offset and limit parameters
      if (offset !== undefined && offset < 0) {
        return {
          success: false,
          userFeedback: 'Offset must be a non-negative number',
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Invalid offset',
            offset,
          },
        };
      }

      if (limit !== undefined && limit <= 0) {
        return {
          success: false,
          userFeedback: 'Limit must be a positive number',
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Invalid limit',
            limit,
          },
        };
      }

      // Phase 3.5: Check if file exists INSIDE CONTAINER
      const isFile = !(await containerFilesystem.isDirectory(
        context.sandboxId!,
        filePath
      ));

      if (!isFile) {
        const exists = await containerFilesystem.exists(
          context.sandboxId!,
          filePath
        );
        if (!exists) {
          return {
            success: false,
            userFeedback: `File not found or inaccessible: ${filePath}`,
            previewRefreshNeeded: false,
            technicalDetails: {
              error: 'File not found or inaccessible',
              path: filePath,
            },
          };
        }
        return {
          success: false,
          userFeedback: `Path is a directory, not a file: ${filePath}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Path is a directory',
            path: filePath,
          },
        };
      }

      // Get file information
      const fileSize = await containerFilesystem.getFileSize(
        context.sandboxId!,
        filePath
      );
      const isBinary = isBinaryFile(filePath);

      // Read file content from container
      const encoding = isBinary ? 'base64' : 'utf8';
      let fileContent: string;

      try {
        fileContent = await containerFilesystem.readFile(
          context.sandboxId!,
          filePath,
          encoding
        );
      } catch (error) {
        return {
          success: false,
          userFeedback: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: error instanceof Error ? error.message : String(error),
            path: filePath,
          },
        };
      }

      // Process file content using utility function
      const result = await processFileContent(
        fileContent,
        filePath,
        fileSize,
        isBinary,
        offset,
        limit
      );

      // Handle processing errors
      if (!result.success) {
        return {
          success: false,
          userFeedback: result.error!.message,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: result.error!.message,
            errorCode: result.error!.code,
            path: filePath,
            ...result.error!.details,
          },
        };
      }

      // Build user feedback message
      const fileName = path.basename(filePath);
      let userMessage: string;

      if (isBinary) {
        userMessage = `Successfully read binary file: ${fileName} (${fileSize} bytes, ${result.mimeType})`;
      } else if (result.isTruncated && result.linesShown) {
        const [start, end] = result.linesShown;
        userMessage = `File content truncated. Showing lines ${start}-${end} of ${result.totalLines} total lines.`;
      } else {
        userMessage = `Successfully read file: ${fileName} (${result.totalLines} lines, ${fileSize} bytes)`;
      }

      return {
        success: true,
        data: {
          content: result.content,
          encoding: result.encoding,
          mimeType: result.mimeType,
          fileSize: result.fileSize,
          totalLines: result.totalLines,
          isBinary: result.isBinary,
          isTruncated: result.isTruncated,
          linesShown: result.linesShown,
        },
        userFeedback: userMessage,
        previewRefreshNeeded: false,
        technicalDetails: {
          path: filePath,
          fileSize: result.fileSize,
          mimeType: result.mimeType,
          totalLines: result.totalLines,
          isTruncated: result.isTruncated,
          linesShown: result.linesShown,
          encoding: result.encoding,
          contentLength: result.content?.length,
        },
      };
    } catch (error) {
      logger.error('Error reading file', {
        error: error instanceof Error ? error.message : String(error),
        toolCallId: context.toolCallId,
      });

      return {
        success: false,
        userFeedback: 'Failed to read file',
        previewRefreshNeeded: false,
        technicalDetails: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },

  estimatedDuration: 2000,
  metadata: {
    version: '1.0.0',
    tags: ['filesystem', 'file', 'read', 'content'],
    examples: [
      {
        description: 'Read a text file',
        input: {
          absolute_path: '/home/user/project/README.md',
        },
      },
      {
        description: 'Read specific lines from a large file',
        input: {
          absolute_path: '/home/user/project/large-file.txt',
          offset: 100,
          limit: 50,
        },
      },
    ],
  },
};

/**
 * Create a simple diff display for file changes
 */
function createSimpleDiff(
  originalContent: string,
  newContent: string,
  fileName: string
): string {
  const originalLines = originalContent.split('\n');
  const newLines = newContent.split('\n');

  if (originalContent === '') {
    return `+++ New file: ${fileName}\n${newLines.map(line => `+ ${line}`).join('\n')}`;
  }

  if (newContent === '') {
    return `--- Deleted file: ${fileName}\n${originalLines.map(line => `- ${line}`).join('\n')}`;
  }

  // Simple line-by-line comparison
  const maxLines = Math.max(originalLines.length, newLines.length);
  const diffLines: string[] = [];

  for (let i = 0; i < maxLines; i++) {
    const oldLine = originalLines[i] || '';
    const newLine = newLines[i] || '';

    if (oldLine !== newLine) {
      if (oldLine) diffLines.push(`- ${oldLine}`);
      if (newLine) diffLines.push(`+ ${newLine}`);
    }
  }

  return `=== ${fileName} ===\n${diffLines.join('\n')}`;
}

/**
 * Tool for writing file contents
 */
const writeFileTool: EnhancedToolDefinition = {
  name: 'write_file',
  displayName: 'WriteFile',
  description:
    'Writes content to a specified file in the local filesystem. The user has the ability to modify content. If modified, this will be stated in the response.',
  userDescription:
    'create a new file or completely replace the contents of an existing file',
  category: ToolCategory.FILE_SYSTEM,
  safetyLevel: 'potentially_destructive', // Writing files can overwrite existing content
  inputSchema: z.object({
    file_path: z
      .string()
      .describe(
        "The absolute path to the file to write to (e.g., '/home/user/project/file.txt'). Relative paths are not supported."
      ),
    content: z.string().describe('The content to write to the file.'),
  }),

  async execute(
    input: {
      file_path: string;
      content: string;
    },
    context: ToolExecutionContext
  ) {
    try {
      // Phase 3: Validate sandbox context
      const sandboxError = validateSandboxContext(context);
      if (sandboxError) {
        return sandboxError;
      }

      const { file_path: filePath, content } = input;

      logger.info('File write requested', {
        path: filePath,
        contentLength: content.length,
        toolCallId: context.toolCallId,
        sandboxId: context.sandboxId,
      });

      // Validate path is absolute
      if (!path.isAbsolute(filePath)) {
        return {
          success: false,
          userFeedback: `File path must be absolute: ${filePath}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Path must be absolute',
            providedPath: filePath,
          },
        };
      }

      // Phase 3.5: Check if target is a directory INSIDE CONTAINER
      let isNewFile = false;
      let originalContent = '';

      const isDir = await containerFilesystem.isDirectory(
        context.sandboxId!,
        filePath
      );

      if (isDir) {
        return {
          success: false,
          userFeedback: `Path is a directory, not a file: ${filePath}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Path is a directory',
            path: filePath,
          },
        };
      }

      // File exists check
      const fileExists = await containerFilesystem.exists(
        context.sandboxId!,
        filePath
      );

      if (fileExists) {
        // File exists, read current content for diff
        try {
          originalContent = await containerFilesystem.readFile(
            context.sandboxId!,
            filePath,
            'utf8'
          );
        } catch (readError) {
          // File exists but can't read it (binary file or permission issue)
          originalContent = '[Binary or unreadable content]';
        }
      } else {
        // File doesn't exist, this will be a new file
        isNewFile = true;
      }

      // Phase 3.5: Create directory if it doesn't exist INSIDE CONTAINER
      const dirName = path.dirname(filePath);
      try {
        await containerFilesystem.mkdir(context.sandboxId!, dirName);
      } catch (error) {
        return {
          success: false,
          userFeedback: `Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: error instanceof Error ? error.message : String(error),
            directory: dirName,
          },
        };
      }

      // Phase 3.5: Write the file INSIDE CONTAINER
      try {
        await containerFilesystem.writeFile(
          context.sandboxId!,
          filePath,
          content
        );
      } catch (error) {
        return {
          success: false,
          userFeedback: `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: error instanceof Error ? error.message : String(error),
            path: filePath,
          },
        };
      }

      // Generate diff for display
      const fileName = path.basename(filePath);
      const fileDiff = createSimpleDiff(originalContent, content, fileName);

      const successMessage = isNewFile
        ? `Successfully created and wrote to new file: ${filePath}.`
        : `Successfully overwrote file: ${filePath}.`;

      const userMessage = isNewFile
        ? `Created new file: ${fileName} with ${content.split('\n').length} lines`
        : `Updated file: ${fileName} with ${content.split('\n').length} lines`;

      return {
        success: true,
        data: {
          filePath,
          isNewFile,
          contentLength: content.length,
          lineCount: content.split('\n').length,
          diff: fileDiff,
        },
        userFeedback: userMessage,
        previewRefreshNeeded: true, // File changes may affect preview
        changedFiles: [filePath],
        technicalDetails: {
          path: filePath,
          isNewFile,
          contentLength: content.length,
          lineCount: content.split('\n').length,
          diff: fileDiff,
          message: successMessage,
        },
      };
    } catch (error) {
      logger.error('Error writing file', {
        error: error instanceof Error ? error.message : String(error),
        toolCallId: context.toolCallId,
      });

      return {
        success: false,
        userFeedback: 'Failed to write file',
        previewRefreshNeeded: false,
        technicalDetails: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },

  estimatedDuration: 2000,
  metadata: {
    version: '1.0.0',
    tags: ['filesystem', 'file', 'write', 'create'],
    examples: [
      {
        description: 'Create a new HTML file',
        input: {
          file_path: '/home/user/project/index.html',
          content:
            '<!DOCTYPE html>\n<html>\n<head>\n    <title>My Page</title>\n</head>\n<body>\n    <h1>Hello World</h1>\n</body>\n</html>',
        },
      },
      {
        description: 'Write CSS styles',
        input: {
          file_path: '/home/user/project/styles.css',
          content:
            'body {\n    font-family: Arial, sans-serif;\n    margin: 0;\n    padding: 20px;\n}',
        },
      },
    ],
  },
};

/**
 * Tool for precise text replacement in files
 */
const replaceTool: EnhancedToolDefinition = {
  name: 'replace',
  displayName: 'Edit',
  description:
    "Replaces text within a file. By default, replaces a single occurrence, but can replace multiple occurrences when expected_replacements is specified. This tool requires providing significant context around the change to ensure precise targeting. Always use the read_file tool to examine the file's current content before attempting a text replacement.",
  userDescription:
    'make precise edits to existing files by replacing specific text',
  category: ToolCategory.FILE_SYSTEM,
  safetyLevel: 'potentially_destructive', // Text replacement can be destructive
  inputSchema: z.object({
    file_path: z
      .string()
      .describe(
        "The absolute path to the file to modify (e.g., '/home/user/project/file.txt'). Must be an absolute path."
      ),
    old_string: z
      .string()
      .describe(
        'The exact literal text to replace, preferably unescaped. For single replacements (default), include at least 3 lines of context BEFORE and AFTER the target text, matching whitespace and indentation precisely. For multiple replacements, specify expected_replacements parameter. If this string is not the exact literal text (i.e. you escaped it) or does not match exactly, the tool will fail.'
      ),
    new_string: z
      .string()
      .describe(
        'The exact literal text to replace old_string with, preferably unescaped. Provide the EXACT text. Ensure the resulting code is correct and idiomatic.'
      ),
    expectedReplacements: z
      .number()
      .min(1)
      .optional()
      .describe(
        'Number of replacements expected. Defaults to 1 if not specified. Use when you want to replace multiple occurrences.'
      ),
  }),

  async execute(
    input: {
      file_path: string;
      old_string: string;
      new_string: string;
      expectedReplacements?: number;
    },
    context: ToolExecutionContext
  ) {
    try {
      // Phase 3: Validate sandbox context
      const sandboxError = validateSandboxContext(context);
      if (sandboxError) {
        return sandboxError;
      }

      const {
        file_path: filePath,
        old_string: oldString,
        new_string: newString,
        expectedReplacements = 1,
      } = input;

      logger.info('Text replacement requested', {
        path: filePath,
        oldStringLength: oldString.length,
        newStringLength: newString.length,
        expectedReplacements,
        toolCallId: context.toolCallId,
        sandboxId: context.sandboxId,
      });

      // Validate path is absolute
      if (!path.isAbsolute(filePath)) {
        return {
          success: false,
          userFeedback: `File path must be absolute: ${filePath}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Path must be absolute',
            providedPath: filePath,
          },
        };
      }

      // Phase 3.5: Read current file content INSIDE CONTAINER
      let currentContent: string | null = null;
      let fileExists = false;
      let isNewFile = false;

      try {
        fileExists = await containerFilesystem.exists(
          context.sandboxId!,
          filePath
        );

        if (fileExists) {
          currentContent = await containerFilesystem.readFile(
            context.sandboxId!,
            filePath,
            'utf8'
          );
          // Normalize line endings to LF for consistent processing
          currentContent = currentContent.replace(/\r\n/g, '\n');
        } else {
          // File doesn't exist - check if this is a new file creation
          isNewFile = oldString === '';
          if (!isNewFile) {
            return {
              success: false,
              userFeedback:
                'File not found. Cannot apply edit. Use an empty old_string to create a new file.',
              previewRefreshNeeded: false,
              technicalDetails: {
                error: 'File not found',
                path: filePath,
              },
            };
          }
        }
      } catch (error: any) {
        return {
          success: false,
          userFeedback: `Error reading file: ${error.message}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: error.message,
            path: filePath,
          },
        };
      }

      // Calculate and validate the replacement WITHOUT modifying the file
      // This ensures we catch all errors BEFORE writing to disk
      const replacementResult = calculateReplacement(
        currentContent,
        oldString,
        newString,
        expectedReplacements,
        isNewFile
      );

      // If validation failed, return error WITHOUT touching the file
      if (!replacementResult.success) {
        return {
          success: false,
          userFeedback: replacementResult.error!.message,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: replacementResult.error!.message,
            errorCode: replacementResult.error!.code,
            path: filePath,
            ...replacementResult.error!.details,
          },
        };
      }

      // Validation succeeded - safe to proceed with file write
      const { newContent, occurrences } = replacementResult;

      // Phase 3.5: Create directory if needed INSIDE CONTAINER
      const dirName = path.dirname(filePath);
      try {
        await containerFilesystem.mkdir(context.sandboxId!, dirName);
      } catch (error) {
        return {
          success: false,
          userFeedback: `Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: error instanceof Error ? error.message : String(error),
            directory: dirName,
          },
        };
      }

      // Phase 3.5: Write the modified content INSIDE CONTAINER
      try {
        await containerFilesystem.writeFile(
          context.sandboxId!,
          filePath,
          newContent
        );
      } catch (error) {
        return {
          success: false,
          userFeedback: `Error writing file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: error instanceof Error ? error.message : String(error),
            path: filePath,
          },
        };
      }

      // Generate diff for display
      const fileName = path.basename(filePath);
      const fileDiff = createSimpleDiff(
        currentContent || '',
        newContent,
        fileName
      );

      const successMessage = isNewFile
        ? `Created new file: ${filePath} with provided content.`
        : `Successfully modified file: ${filePath} (${occurrences} replacements).`;

      const userMessage = isNewFile
        ? `Created new file: ${fileName}`
        : `Updated ${fileName} with ${occurrences} replacement${occurrences === 1 ? '' : 's'}`;

      return {
        success: true,
        data: {
          filePath,
          isNewFile,
          occurrences,
          contentLength: newContent.length,
          lineCount: newContent.split('\n').length,
          diff: fileDiff,
        },
        userFeedback: userMessage,
        previewRefreshNeeded: true, // File changes may affect preview
        changedFiles: [filePath],
        technicalDetails: {
          path: filePath,
          isNewFile,
          occurrences,
          expectedReplacements,
          contentLength: newContent.length,
          lineCount: newContent.split('\n').length,
          diff: fileDiff,
          message: successMessage,
        },
      };
    } catch (error) {
      logger.error('Error in text replacement', {
        error: error instanceof Error ? error.message : String(error),
        toolCallId: context.toolCallId,
      });

      return {
        success: false,
        userFeedback: 'Failed to perform text replacement',
        previewRefreshNeeded: false,
        technicalDetails: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },

  estimatedDuration: 2000,
  metadata: {
    version: '1.0.0',
    tags: ['filesystem', 'file', 'edit', 'replace'],
    examples: [
      {
        description: 'Replace a function in JavaScript',
        input: {
          file_path: '/home/user/project/script.js',
          old_string: 'function oldFunction() {\n    return "old";\n}',
          new_string: 'function newFunction() {\n    return "new";\n}',
        },
      },
      {
        description: 'Replace multiple occurrences',
        input: {
          file_path: '/home/user/project/config.js',
          old_string: 'localhost',
          new_string: 'production.example.com',
          expectedReplacements: 3,
        },
      },
    ],
  },
};

/**
 * Search result for a single match
 */
interface SearchMatch {
  filePath: string;
  lineNumber: number;
  line: string;
}

/**
 * Tool for searching text content across files
 */
const searchFileContentTool: EnhancedToolDefinition = {
  name: 'search_file_content',
  displayName: 'SearchText',
  description:
    'Searches for a regular expression pattern within the content of files in a specified directory (or current working directory). Can filter files by a glob pattern. Returns the lines containing matches, along with their file paths and line numbers.',
  userDescription:
    'search for text patterns across multiple files in a directory',
  category: ToolCategory.FILE_SYSTEM,
  safetyLevel: 'safe', // Searching files is safe
  inputSchema: z.object({
    pattern: z
      .string()
      .describe(
        "The regular expression (regex) pattern to search for within file contents (e.g., 'function\\\\s+myFunction', 'import\\\\s+\\\\{.*\\\\}\\\\s+from\\\\s+.*'). Use literal text for simple word searches (e.g., 'background' to find the word 'background')."
      ),
    path: z
      .string()
      .optional()
      .describe(
        'IMPORTANT: The absolute path to search within - can be a directory or a single file (e.g., /workspace/src, /workspace/apps/frontend, /workspace/src/App.css). If omitted, defaults to /workspace (the sandbox root). Do NOT use relative paths like "src/" or "./src" - always provide absolute paths starting with /workspace. To search the entire project, omit this parameter.'
      ),
    include: z
      .string()
      .optional()
      .describe(
        "Optional: A glob pattern to filter which files are searched (e.g., '*.js', '*.{ts,tsx}', '*.css', 'src/**/*.tsx'). If omitted, searches all text files in the directory (respecting common ignores like node_modules, .git, dist)."
      ),
  }),

  async execute(
    input: {
      pattern: string;
      path?: string;
      include?: string;
    },
    context: ToolExecutionContext
  ) {
    try {
      // Phase 3: Validate sandbox context
      const sandboxError = validateSandboxContext(context);
      if (sandboxError) {
        return sandboxError;
      }

      const { pattern, path: searchPath, include } = input;

      logger.info('File content search requested', {
        pattern,
        searchPath,
        include,
        toolCallId: context.toolCallId,
        sandboxId: context.sandboxId,
      });

      // Validate regex pattern
      try {
        // eslint-disable-next-line no-new
        new RegExp(pattern);
      } catch (error) {
        return {
          success: false,
          userFeedback: `Invalid regular expression pattern: ${pattern}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Invalid regex pattern',
            pattern,
            regexError: error instanceof Error ? error.message : String(error),
          },
        };
      }

      // Phase 3.5: Default to /workspace if no path provided (sandbox root)
      const searchDir = searchPath || '/workspace';

      // Validate search directory
      if (!path.isAbsolute(searchDir)) {
        return {
          success: false,
          userFeedback: `Search path must be absolute: ${searchDir}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Path must be absolute',
            providedPath: searchDir,
          },
        };
      }

      // Phase 3.5: Check if search path exists INSIDE CONTAINER
      const exists = await containerFilesystem.exists(
        context.sandboxId!,
        searchDir
      );

      if (!exists) {
        return {
          success: false,
          userFeedback: `Search path not found: ${searchDir}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Path not found',
            path: searchDir,
          },
        };
      }

      // Phase 3.5: Search for pattern in files INSIDE CONTAINER using containerFilesystem
      let allMatches: SearchMatch[] = [];

      try {
        const isDir = await containerFilesystem.isDirectory(
          context.sandboxId!,
          searchDir
        );

        if (isDir) {
          // Search within a directory
          const containerMatches = await containerFilesystem.searchPattern(
            context.sandboxId!,
            pattern,
            searchDir,
            include
          );

          // Convert container search results to SearchMatch format
          allMatches = containerMatches.map(match => ({
            filePath: match.filePath,
            lineNumber: match.lineNumber,
            line: match.line,
          }));
        } else {
          // Search within a single file
          const fileContent = await containerFilesystem.readFile(
            context.sandboxId!,
            searchDir
          );

          const lines = fileContent.split('\n');
          const regex = new RegExp(pattern, 'gm');

          lines.forEach((line, index) => {
            if (regex.test(line)) {
              allMatches.push({
                filePath: searchDir,
                lineNumber: index + 1,
                line,
              });
            }
          });
        }
      } catch (error) {
        // If search fails (e.g., pattern not found), return empty results
        const message = include
          ? `No matches found for pattern "${pattern}" in ${searchDir} (filter: "${include}")`
          : `No matches found for pattern "${pattern}" in ${searchDir}`;

        return {
          success: true,
          data: { matches: [], fileCount: 0, matchCount: 0 },
          userFeedback: message,
          previewRefreshNeeded: false,
          technicalDetails: {
            searchDir,
            pattern,
            include,
            fileCount: 0,
            matchCount: 0,
          },
        };
      }

      if (allMatches.length === 0) {
        const searchLocation = searchPath
          ? `in path "${searchPath}"`
          : 'in the current directory';
        const filterText = include ? ` (filter: "${include}")` : '';
        const message = `No matches found for pattern "${pattern}" ${searchLocation}${filterText}.`;

        return {
          success: true,
          data: { matches: [], fileCount: 0, matchCount: 0 },
          userFeedback: message,
          previewRefreshNeeded: false,
          technicalDetails: {
            searchDir,
            pattern,
            include,
            fileCount: 0,
            matchCount: 0,
          },
        };
      }

      // Group matches by file
      const matchesByFile = allMatches.reduce(
        (acc, match) => {
          const relativePath = path.relative(searchDir, match.filePath);
          const fileKey = relativePath || path.basename(match.filePath);

          if (!acc[fileKey]) {
            acc[fileKey] = [];
          }
          acc[fileKey].push(match);
          return acc;
        },
        {} as Record<string, SearchMatch[]>
      );

      // Sort matches within each file by line number
      Object.values(matchesByFile).forEach(matches => {
        matches.sort((a, b) => a.lineNumber - b.lineNumber);
      });

      const matchCount = allMatches.length;
      const fileCount = Object.keys(matchesByFile).length;
      const matchTerm = matchCount === 1 ? 'match' : 'matches';
      const fileTerm = fileCount === 1 ? 'file' : 'files';

      // Create formatted output
      let formattedResults = `Found ${matchCount} ${matchTerm} in ${fileCount} ${fileTerm} for pattern "${pattern}":\n---\n`;

      for (const [filePath, matches] of Object.entries(matchesByFile)) {
        formattedResults += `File: ${filePath}\n`;
        matches.forEach(match => {
          formattedResults += `L${match.lineNumber}: ${match.line}\n`;
        });
        formattedResults += '---\n';
      }

      const userMessage = `Found ${matchCount} ${matchTerm} in ${fileCount} ${fileTerm}`;

      return {
        success: true,
        data: {
          matches: allMatches,
          matchesByFile,
          fileCount,
          matchCount,
          formattedResults: formattedResults.trim(),
        },
        userFeedback: userMessage,
        previewRefreshNeeded: false,
        technicalDetails: {
          searchDir,
          pattern,
          include,
          filesWithMatches: fileCount,
          totalMatches: matchCount,
          formattedResults: formattedResults.trim(),
        },
      };
    } catch (error) {
      logger.error('Error searching file content', {
        error: error instanceof Error ? error.message : String(error),
        toolCallId: context.toolCallId,
      });

      return {
        success: false,
        userFeedback: 'Failed to search file content',
        previewRefreshNeeded: false,
        technicalDetails: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },

  estimatedDuration: 3000,
  metadata: {
    version: '1.0.0',
    tags: ['filesystem', 'search', 'grep', 'content'],
    examples: [
      {
        description: 'Search for a simple word pattern across entire project',
        input: {
          pattern: 'background',
          include: '*.css',
        },
      },
      {
        description: 'Search for regex pattern in specific directory',
        input: {
          pattern: 'function\\s+\\w+',
          path: '/workspace/src',
          include: '*.js',
        },
      },
      {
        description: 'Search for import statements across all TypeScript files',
        input: {
          pattern: 'import.*from',
          path: '/workspace/apps/frontend',
          include: '*.{ts,tsx}',
        },
      },
      {
        description: 'Search for CSS class names in entire project',
        input: {
          pattern: 'className',
          include: '*.{tsx,jsx}',
        },
      },
    ],
  },
};

/**
 * Register filesystem tools
 */
export function registerFilesystemTools() {
  try {
    toolRegistry.registerEnhancedTool(listDirectoryTool);
    toolRegistry.registerEnhancedTool(readFileTool);
    toolRegistry.registerEnhancedTool(writeFileTool);
    toolRegistry.registerEnhancedTool(replaceTool);
    toolRegistry.registerEnhancedTool(searchFileContentTool);
    toolRegistry.registerEnhancedTool(globTool);
  } catch (error) {
    logger.error('Failed to register filesystem tools', { error });
    throw error;
  }
}
/**
 * Tool for finding files using glob patterns
 */
const globTool: EnhancedToolDefinition = {
  name: 'glob',
  displayName: 'FindFiles',
  description:
    'Efficiently finds files matching specific glob patterns (e.g., `src/**/*.ts`, `**/*.md`), returning absolute paths sorted by modification time (newest first). Ideal for quickly locating files based on their name or path structure, especially in large codebases.',
  userDescription: 'find files using glob patterns like *.js or src/**/*.ts',
  category: ToolCategory.FILE_SYSTEM,
  safetyLevel: 'safe', // Finding files is safe
  inputSchema: z.object({
    pattern: z
      .string()
      .describe(
        "The glob pattern to match against (e.g., '**/*.ts', '**/*.md', 'src/**/*.tsx'). Use * to match any characters, ** to match across directories, and ? to match single characters."
      ),
    path: z
      .string()
      .optional()
      .describe(
        'IMPORTANT: The absolute path to the directory to search within (e.g., /workspace/src, /workspace/apps/frontend). If omitted, defaults to /workspace (the sandbox root). Do NOT use relative paths - always provide absolute paths starting with /workspace.'
      ),
    caseSensitive: z
      .boolean()
      .optional()
      .describe(
        'Optional: Whether the search should be case-sensitive. Defaults to false (case-insensitive).'
      ),
    respectGitIgnore: z
      .boolean()
      .optional()
      .describe(
        'Optional: Whether to respect .gitignore patterns when finding files. Defaults to true (ignores node_modules, .git, dist, build, .next).'
      ),
  }),

  async execute(
    input: {
      pattern: string;
      path?: string;
      caseSensitive?: boolean;
      respectGitIgnore?: boolean;
    },
    context: ToolExecutionContext
  ) {
    try {
      // Phase 3.5: Validate sandbox context - REQUIRED for isolation
      const sandboxError = validateSandboxContext(context);
      if (sandboxError) {
        return sandboxError;
      }

      const { pattern, path: searchPath } = input;

      // Validate pattern
      if (!pattern || pattern.trim() === '') {
        return {
          success: false,
          userFeedback: 'The pattern parameter cannot be empty.',
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Empty pattern',
          },
        };
      }

      // Phase 3.5: Default to /workspace if no path provided (sandbox root)
      const searchDir = searchPath || '/workspace';

      // Validate search directory is absolute
      if (!path.isAbsolute(searchDir)) {
        return {
          success: false,
          userFeedback: `Search path must be absolute: ${searchDir}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Path must be absolute',
            providedPath: searchDir,
          },
        };
      }

      // Phase 3.5: Find files matching glob pattern INSIDE CONTAINER
      const matchingFiles = await containerFilesystem.findGlob(
        context.sandboxId!,
        searchDir,
        pattern
      );

      if (matchingFiles.length === 0) {
        const message = `No files found matching pattern "${pattern}" within ${searchDir}`;

        return {
          success: true,
          data: { files: [], count: 0 },
          userFeedback: message,
          previewRefreshNeeded: false,
          technicalDetails: {
            searchDir,
            pattern,
            fileCount: 0,
          },
        };
      }

      const fileCount = matchingFiles.length;
      const fileListDescription = matchingFiles.join('\n');

      const resultMessage = `Found ${fileCount} file(s) matching "${pattern}" within ${searchDir}:\n${fileListDescription}`;

      const userMessage = `Found ${fileCount} matching file(s)`;

      return {
        success: true,
        data: {
          files: matchingFiles,
          count: fileCount,
          formattedList: fileListDescription,
        },
        userFeedback: userMessage,
        previewRefreshNeeded: false,
        technicalDetails: {
          searchDir,
          pattern,
          fileCount,
          fullListing: resultMessage,
        },
      };
    } catch (error) {
      logger.error('Error in glob file search', {
        error: error instanceof Error ? error.message : String(error),
        toolCallId: context.toolCallId,
        sandboxId: context.sandboxId,
      });

      return {
        success: false,
        userFeedback: `Failed to search for files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        previewRefreshNeeded: false,
        technicalDetails: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },

  estimatedDuration: 2000,
  metadata: {
    version: '1.0.0',
    tags: ['filesystem', 'glob', 'find', 'pattern'],
    examples: [
      {
        description: 'Find all TypeScript files across entire project',
        input: {
          pattern: '**/*.ts',
        },
      },
      {
        description: 'Find all React component files in frontend app',
        input: {
          pattern: '**/*.tsx',
          path: '/workspace/apps/frontend',
        },
      },
      {
        description: 'Find all markdown files in docs directory',
        input: {
          pattern: 'docs/**/*.md',
        },
      },
      {
        description: 'Find specific file by name',
        input: {
          pattern: '**/package.json',
        },
      },
      {
        description: 'Find all CSS files in specific directory',
        input: {
          pattern: '**/*.css',
          path: '/workspace/apps/frontend/src',
        },
      },
    ],
  },
};
