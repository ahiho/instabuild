import type {
  EnhancedToolDefinition,
  ToolExecutionContext,
} from '@instabuild/shared/types';
import { ToolCategory } from '@instabuild/shared/types';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';
import { logger } from '../lib/logger.js';
import { toolRegistry } from '../services/toolRegistry.js';

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
 * Phase 3: Check if sandbox context is available
 * Ensures all file operations execute within isolated containers
 */
function validateSandboxContext(context: ToolExecutionContext) {
  if (!context.sandboxId) {
    return {
      success: false,
      userFeedback:
        'This operation requires a sandbox environment. Please try again.',
      previewRefreshNeeded: false,
      technicalDetails: {
        error: 'Missing sandbox context - sandboxId is required',
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
      .describe('List of glob patterns to ignore'),
    respectGitIgnore: z
      .boolean()
      .optional()
      .describe(
        'Whether to respect .gitignore patterns when listing files. Defaults to true.'
      ),
  }),

  async execute(
    input: {
      path: string;
      ignore?: string[];
      respectGitIgnore?: boolean;
    },
    context: ToolExecutionContext
  ) {
    try {
      // Phase 3: Validate sandbox context
      const sandboxError = validateSandboxContext(context);
      if (sandboxError) {
        return sandboxError;
      }

      const { path: dirPath, ignore, respectGitIgnore = true } = input;

      logger.info('Directory listing requested', {
        path: dirPath,
        ignore,
        respectGitIgnore,
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

      // Check if directory exists and is accessible
      let stats;
      try {
        stats = await fs.stat(dirPath);
      } catch (error) {
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

      if (!stats.isDirectory()) {
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

      // Read directory contents
      const files = await fs.readdir(dirPath);

      if (files.length === 0) {
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

      // Process each file/directory entry
      const entries: FileEntry[] = [];
      let ignoredCount = 0;

      for (const file of files) {
        const fullPath = path.join(dirPath, file);

        // Check if file should be ignored
        if (shouldIgnore(file, ignore)) {
          ignoredCount++;
          continue;
        }

        try {
          const fileStats = await fs.stat(fullPath);
          const isDir = fileStats.isDirectory();

          entries.push({
            name: file,
            path: fullPath,
            isDirectory: isDir,
            size: isDir ? 0 : fileStats.size,
            modifiedTime: fileStats.mtime,
          });
        } catch (error) {
          // Log error but don't fail the whole listing
          logger.debug(`Error accessing ${fullPath}`, { error });
        }
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

/**
 * Detect if a file is binary based on its extension
 */
function isBinaryFile(filePath: string): boolean {
  const binaryExtensions = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.bmp',
    '.webp',
    '.svg',
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    '.zip',
    '.tar',
    '.gz',
    '.rar',
    '.7z',
    '.exe',
    '.dll',
    '.so',
    '.dylib',
    '.mp3',
    '.mp4',
    '.avi',
    '.mov',
    '.wav',
  ];

  const ext = path.extname(filePath).toLowerCase();
  return binaryExtensions.includes(ext);
}

/**
 * Get specific MIME type for a file
 */
function getSpecificMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.ts': 'application/typescript',
    '.json': 'application/json',
    '.md': 'text/markdown',
    '.txt': 'text/plain',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

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

      // Check if file exists and is accessible
      let stats;
      try {
        stats = await fs.stat(filePath);
      } catch (error) {
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

      if (stats.isDirectory()) {
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

      const fileSize = stats.size;
      const mimeType = getSpecificMimeType(filePath);
      const isBinary = isBinaryFile(filePath);

      // Handle binary files (images, PDFs, etc.)
      if (isBinary) {
        try {
          const buffer = await fs.readFile(filePath);
          const base64Content = buffer.toString('base64');

          return {
            success: true,
            data: {
              content: base64Content,
              encoding: 'base64',
              mimeType,
              fileSize,
              isBinary: true,
            },
            userFeedback: `Successfully read binary file: ${path.basename(filePath)} (${fileSize} bytes, ${mimeType})`,
            previewRefreshNeeded: false,
            technicalDetails: {
              path: filePath,
              fileSize,
              mimeType,
              encoding: 'base64',
              contentLength: base64Content.length,
            },
          };
        } catch (error) {
          return {
            success: false,
            userFeedback: `Failed to read binary file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            previewRefreshNeeded: false,
            technicalDetails: {
              error: error instanceof Error ? error.message : String(error),
              path: filePath,
            },
          };
        }
      }

      // Handle text files
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.split('\n');
        const totalLines = lines.length;

        let processedContent = content;
        let isTruncated = false;
        let linesShown: [number, number] | undefined;

        // Handle offset and limit for text files
        if (offset !== undefined || limit !== undefined) {
          const startLine = offset || 0;
          const endLine = limit ? startLine + limit : totalLines;

          if (startLine >= totalLines) {
            return {
              success: false,
              userFeedback: `Offset ${startLine} is beyond the file length (${totalLines} lines)`,
              previewRefreshNeeded: false,
              technicalDetails: {
                error: 'Offset beyond file length',
                offset: startLine,
                totalLines,
              },
            };
          }

          const selectedLines = lines.slice(
            startLine,
            Math.min(endLine, totalLines)
          );
          processedContent = selectedLines.join('\n');
          isTruncated = endLine < totalLines;
          linesShown = [startLine + 1, Math.min(endLine, totalLines)]; // 1-based for user display
        } else {
          // Check if file is too large and needs truncation
          const maxLines = 2000; // Default limit
          if (totalLines > maxLines) {
            const selectedLines = lines.slice(0, maxLines);
            processedContent = selectedLines.join('\n');
            isTruncated = true;
            linesShown = [1, maxLines];
          }
        }

        let userMessage = `Successfully read file: ${path.basename(filePath)} (${totalLines} lines, ${fileSize} bytes)`;
        let llmContent = processedContent;

        if (isTruncated && linesShown) {
          const [start, end] = linesShown;
          const nextOffset = offset ? offset + (end - start + 1) : end;

          userMessage = `File content truncated. Showing lines ${start}-${end} of ${totalLines} total lines.`;
          llmContent = `IMPORTANT: The file content has been truncated.
Status: Showing lines ${start}-${end} of ${totalLines} total lines.
Action: To read more of the file, you can use the 'offset' and 'limit' parameters in a subsequent 'read_file' call. For example, to read the next section of the file, use offset: ${nextOffset}.

--- FILE CONTENT (truncated) ---
${processedContent}`;
        }

        return {
          success: true,
          data: {
            content: llmContent,
            encoding: 'utf8',
            mimeType,
            fileSize,
            totalLines,
            isBinary: false,
            isTruncated,
            linesShown,
          },
          userFeedback: userMessage,
          previewRefreshNeeded: false,
          technicalDetails: {
            path: filePath,
            fileSize,
            mimeType,
            totalLines,
            isTruncated,
            linesShown,
            contentLength: processedContent.length,
          },
        };
      } catch (error) {
        return {
          success: false,
          userFeedback: `Failed to read text file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: error instanceof Error ? error.message : String(error),
            path: filePath,
          },
        };
      }
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

      // Check if target is a directory
      let isNewFile = false;
      let originalContent = '';

      try {
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) {
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

        // File exists, read current content for diff
        try {
          originalContent = await fs.readFile(filePath, 'utf8');
        } catch (readError) {
          // File exists but can't read it (binary file or permission issue)
          originalContent = '[Binary or unreadable content]';
        }
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          // File doesn't exist, this will be a new file
          isNewFile = true;
        } else {
          return {
            success: false,
            userFeedback: `Error accessing file path: ${error.message}`,
            previewRefreshNeeded: false,
            technicalDetails: {
              error: error.message,
              path: filePath,
            },
          };
        }
      }

      // Create directory if it doesn't exist
      const dirName = path.dirname(filePath);
      try {
        await fs.mkdir(dirName, { recursive: true });
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

      // Write the file
      try {
        await fs.writeFile(filePath, content, 'utf8');
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
 * Safely replace text in content, handling special regex characters
 */
function safeLiteralReplace(
  content: string,
  oldString: string,
  newString: string
): string {
  // Escape special regex characters in the old string
  const escapedOldString = oldString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapedOldString, 'g');
  return content.replace(regex, newString);
}

/**
 * Apply replacement to content
 */
function applyReplacement(
  currentContent: string | null,
  oldString: string,
  newString: string,
  isNewFile: boolean
): string {
  if (isNewFile) {
    return newString;
  }

  if (currentContent === null) {
    return oldString === '' ? newString : '';
  }

  // If oldString is empty and it's not a new file, do not modify the content
  if (oldString === '' && !isNewFile) {
    return currentContent;
  }

  // Use safe literal replacement
  return safeLiteralReplace(currentContent, oldString, newString);
}

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

      let currentContent: string | null = null;
      let fileExists = false;
      let isNewFile = false;

      // Try to read the current file content
      try {
        currentContent = await fs.readFile(filePath, 'utf8');
        // Normalize line endings to LF for consistent processing
        currentContent = currentContent.replace(/\r\n/g, '\n');
        fileExists = true;
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
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
        fileExists = false;
      }

      // Handle new file creation
      if (oldString === '' && !fileExists) {
        isNewFile = true;
      } else if (!fileExists) {
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

      let occurrences = 0;
      const finalOldString = oldString;
      const finalNewString = newString;

      // For existing files, count occurrences and validate
      if (currentContent !== null) {
        if (oldString === '') {
          return {
            success: false,
            userFeedback:
              'Failed to edit. Attempted to create a file that already exists.',
            previewRefreshNeeded: false,
            technicalDetails: {
              error: 'File already exists, cannot create',
              path: filePath,
            },
          };
        }

        // Count occurrences of the old string
        const escapedOldString = oldString.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&'
        );
        const regex = new RegExp(escapedOldString, 'g');
        const matches = currentContent?.match(regex);
        occurrences = matches ? matches.length : 0;

        if (occurrences === 0) {
          return {
            success: false,
            userFeedback:
              'Failed to edit, could not find the string to replace.',
            previewRefreshNeeded: false,
            technicalDetails: {
              error: 'No occurrences found',
              path: filePath,
              searchString: oldString,
            },
          };
        }

        if (occurrences !== expectedReplacements) {
          const occurrenceTerm =
            expectedReplacements === 1 ? 'occurrence' : 'occurrences';
          return {
            success: false,
            userFeedback: `Failed to edit, expected ${expectedReplacements} ${occurrenceTerm} but found ${occurrences}.`,
            previewRefreshNeeded: false,
            technicalDetails: {
              error: 'Occurrence count mismatch',
              expected: expectedReplacements,
              found: occurrences,
              path: filePath,
            },
          };
        }

        if (finalOldString === finalNewString) {
          return {
            success: false,
            userFeedback:
              'No changes to apply. The old_string and new_string are identical.',
            previewRefreshNeeded: false,
            technicalDetails: {
              error: 'No change needed',
              path: filePath,
            },
          };
        }
      }

      // Apply the replacement
      const newContent = applyReplacement(
        currentContent,
        finalOldString,
        finalNewString,
        isNewFile
      );

      // Check if content actually changed
      if (!isNewFile && fileExists && currentContent === newContent) {
        return {
          success: false,
          userFeedback:
            'No changes to apply. The new content is identical to the current content.',
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'No change in content',
            path: filePath,
          },
        };
      }

      // Create directory if needed
      const dirName = path.dirname(filePath);
      try {
        await fs.mkdir(dirName, { recursive: true });
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

      // Write the modified content
      try {
        await fs.writeFile(filePath, newContent, 'utf8');
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
 * Check if a file should be included based on glob pattern
 */
function matchesIncludePattern(
  filePath: string,
  includePattern?: string
): boolean {
  if (!includePattern) return true;

  // Simple glob pattern matching
  const pattern = includePattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');

  const regex = new RegExp(`^${pattern}$`);
  const fileName = path.basename(filePath);
  const relativePath = filePath;

  return regex.test(fileName) || regex.test(relativePath);
}

/**
 * Recursively search for files in a directory
 */
async function findFilesRecursively(
  dirPath: string,
  includePattern?: string
): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      // Skip common directories that should be ignored
      if (entry.isDirectory()) {
        const dirName = entry.name;
        if (
          dirName === 'node_modules' ||
          dirName === '.git' ||
          dirName === '.next' ||
          dirName === 'dist' ||
          dirName === 'build'
        ) {
          continue;
        }

        // Recursively search subdirectories
        const subFiles = await findFilesRecursively(fullPath, includePattern);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        // Check if file matches include pattern
        if (matchesIncludePattern(fullPath, includePattern)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    // Skip directories we can't read
    logger.debug(`Cannot read directory ${dirPath}`, { error });
  }

  return files;
}

/**
 * Search for pattern in a single file
 */
async function searchInFile(
  filePath: string,
  pattern: string
): Promise<SearchMatch[]> {
  const matches: SearchMatch[] = [];

  try {
    // Skip binary files
    if (isBinaryFile(filePath)) {
      return matches;
    }

    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    const regex = new RegExp(pattern, 'i'); // Case-insensitive search

    lines.forEach((line: string, index: number) => {
      if (regex.test(line)) {
        matches.push({
          filePath,
          lineNumber: index + 1, // 1-based line numbers
          line: line.trim(),
        });
      }
    });
  } catch (error) {
    // Skip files we can't read
    logger.debug(`Cannot read file ${filePath}`, { error });
  }

  return matches;
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
        "The regular expression (regex) pattern to search for within file contents (e.g., 'function\\\\s+myFunction', 'import\\\\s+\\\\{.*\\\\}\\\\s+from\\\\s+.*')."
      ),
    path: z
      .string()
      .optional()
      .describe(
        'Optional: The absolute path to the directory to search within. If omitted, searches the current working directory.'
      ),
    include: z
      .string()
      .optional()
      .describe(
        "Optional: A glob pattern to filter which files are searched (e.g., '*.js', '*.{ts,tsx}', 'src/**'). If omitted, searches all files (respecting potential global ignores)."
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

      // Phase 3: Require explicit path - no process.cwd() fallback in sandbox
      if (!searchPath) {
        return {
          success: false,
          userFeedback:
            'Search path is required. Please provide an absolute path to search within.',
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Search path is required in sandbox environment',
          },
        };
      }

      // Determine search directory
      const searchDir = searchPath;

      // Validate search directory
      if (searchPath && !path.isAbsolute(searchPath)) {
        return {
          success: false,
          userFeedback: `Search path must be absolute: ${searchPath}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Path must be absolute',
            providedPath: searchPath,
          },
        };
      }

      // Check if search directory exists
      try {
        const stats = await fs.stat(searchDir);
        if (!stats.isDirectory()) {
          return {
            success: false,
            userFeedback: `Search path is not a directory: ${searchDir}`,
            previewRefreshNeeded: false,
            technicalDetails: {
              error: 'Path is not a directory',
              path: searchDir,
            },
          };
        }
      } catch (error) {
        return {
          success: false,
          userFeedback: `Search directory not found: ${searchDir}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Directory not found',
            path: searchDir,
          },
        };
      }

      // Find all files to search
      const filesToSearch = await findFilesRecursively(searchDir, include);

      if (filesToSearch.length === 0) {
        const message = include
          ? `No files found matching pattern "${include}" in ${searchDir}`
          : `No files found in ${searchDir}`;

        return {
          success: true,
          data: { matches: [], fileCount: 0, matchCount: 0 },
          userFeedback: message,
          previewRefreshNeeded: false,
          technicalDetails: {
            searchDir,
            include,
            fileCount: 0,
            matchCount: 0,
          },
        };
      }

      // Search for pattern in all files
      const allMatches: SearchMatch[] = [];

      for (const filePath of filesToSearch) {
        const matches = await searchInFile(filePath, pattern);
        allMatches.push(...matches);
      }

      if (allMatches.length === 0) {
        const searchLocation = searchPath
          ? `in path "${searchPath}"`
          : 'in the current directory';
        const filterText = include ? ` (filter: "${include}")` : '';
        const message = `No matches found for pattern "${pattern}" ${searchLocation}${filterText}.`;

        return {
          success: true,
          data: { matches: [], fileCount: filesToSearch.length, matchCount: 0 },
          userFeedback: message,
          previewRefreshNeeded: false,
          technicalDetails: {
            searchDir,
            pattern,
            include,
            fileCount: filesToSearch.length,
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
          fileCount: filesToSearch.length,
          matchCount,
          formattedResults: formattedResults.trim(),
        },
        userFeedback: userMessage,
        previewRefreshNeeded: false,
        technicalDetails: {
          searchDir,
          pattern,
          include,
          filesSearched: filesToSearch.length,
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
        description: 'Search for function definitions',
        input: {
          pattern: 'function\\s+\\w+',
          path: '/home/user/project/src',
          include: '*.js',
        },
      },
      {
        description: 'Search for import statements',
        input: {
          pattern: 'import.*from',
          include: '*.{ts,tsx,js,jsx}',
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

    logger.info('Filesystem tools registered successfully', {
      toolCount: 6,
      tools: [
        'list_directory',
        'read_file',
        'write_file',
        'replace',
        'search_file_content',
        'glob',
      ],
    });
  } catch (error) {
    logger.error('Failed to register filesystem tools', { error });
    throw error;
  }
}
/**
 * File entry with modification time for sorting
 */
interface FileEntryWithTime {
  path: string;
  modifiedTime: Date;
}

/**
 * Convert glob pattern to regex
 */
function globToRegex(pattern: string, caseSensitive: boolean = false): RegExp {
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
    .replace(/\*\*/g, '§DOUBLESTAR§') // Temporarily replace **
    .replace(/\*/g, '[^/]*') // * matches anything except /
    .replace(/§DOUBLESTAR§/g, '.*') // ** matches anything including /
    .replace(/\?/g, '[^/]'); // ? matches single char except /

  const flags = caseSensitive ? '' : 'i';
  return new RegExp(`^${regexPattern}$`, flags);
}

/**
 * Find files matching glob pattern recursively
 */
async function findFilesWithGlob(
  searchDir: string,
  pattern: string,
  caseSensitive: boolean = false,
  respectGitIgnore: boolean = true
): Promise<FileEntryWithTime[]> {
  const files: FileEntryWithTime[] = [];
  const regex = globToRegex(pattern, caseSensitive);

  async function searchRecursively(
    currentDir: string,
    relativePath: string = ''
  ) {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const entryRelativePath = relativePath
          ? path.join(relativePath, entry.name)
          : entry.name;

        // Skip common ignored directories
        if (entry.isDirectory()) {
          const dirName = entry.name;
          if (
            respectGitIgnore &&
            (dirName === '.git' ||
              dirName === 'node_modules' ||
              dirName === '.next' ||
              dirName === 'dist' ||
              dirName === 'build')
          ) {
            continue;
          }

          // Check if directory path matches pattern
          if (
            regex.test(entryRelativePath + '/') ||
            regex.test(entryRelativePath)
          ) {
            try {
              const stats = await fs.stat(fullPath);
              files.push({
                path: fullPath,
                modifiedTime: stats.mtime,
              });
            } catch (error) {
              // Skip if we can't stat the directory
            }
          }

          // Recursively search subdirectory
          await searchRecursively(fullPath, entryRelativePath);
        } else if (entry.isFile()) {
          // Check if file path matches pattern
          if (regex.test(entryRelativePath)) {
            try {
              const stats = await fs.stat(fullPath);
              files.push({
                path: fullPath,
                modifiedTime: stats.mtime,
              });
            } catch (error) {
              // Skip if we can't stat the file
            }
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
      logger.debug(`Cannot read directory ${currentDir}`, { error });
    }
  }

  await searchRecursively(searchDir);
  return files;
}

/**
 * Sort files by modification time (newest first) with recent files prioritized
 */
function sortFilesByTime(files: FileEntryWithTime[]): string[] {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const sortedFiles = [...files].sort((a, b) => {
    const aTime = a.modifiedTime.getTime();
    const bTime = b.modifiedTime.getTime();
    const aIsRecent = now - aTime < oneDayMs;
    const bIsRecent = now - bTime < oneDayMs;

    // Recent files first (within 24 hours), sorted by newest first
    if (aIsRecent && bIsRecent) {
      return bTime - aTime; // Newest first
    } else if (aIsRecent) {
      return -1; // a is recent, b is not
    } else if (bIsRecent) {
      return 1; // b is recent, a is not
    } else {
      // Both are old, sort alphabetically
      return a.path.localeCompare(b.path);
    }
  });

  return sortedFiles.map(file => file.path);
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
        "The glob pattern to match against (e.g., '**/*.py', 'docs/*.md')."
      ),
    path: z
      .string()
      .optional()
      .describe(
        'Optional: The absolute path to the directory to search within. If omitted, searches the root directory.'
      ),
    caseSensitive: z
      .boolean()
      .optional()
      .describe(
        'Optional: Whether the search should be case-sensitive. Defaults to false.'
      ),
    respectGitIgnore: z
      .boolean()
      .optional()
      .describe(
        'Optional: Whether to respect .gitignore patterns when finding files. Only available in git repositories. Defaults to true.'
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
      // Phase 3: Validate sandbox context
      const sandboxError = validateSandboxContext(context);
      if (sandboxError) {
        return sandboxError;
      }

      const {
        pattern,
        path: searchPath,
        caseSensitive = false,
        respectGitIgnore = true,
      } = input;

      logger.info('Glob file search requested', {
        pattern,
        searchPath,
        caseSensitive,
        respectGitIgnore,
        toolCallId: context.toolCallId,
        sandboxId: context.sandboxId,
      });

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

      // Phase 3: Require explicit path - no process.cwd() fallback in sandbox
      if (!searchPath) {
        return {
          success: false,
          userFeedback:
            'Search path is required. Please provide an absolute path to search within.',
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Search path is required in sandbox environment',
          },
        };
      }

      // Determine search directory
      const searchDir = searchPath;

      // Validate search directory
      if (searchPath && !path.isAbsolute(searchPath)) {
        return {
          success: false,
          userFeedback: `Search path must be absolute: ${searchPath}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Path must be absolute',
            providedPath: searchPath,
          },
        };
      }

      // Check if search directory exists
      try {
        const stats = await fs.stat(searchDir);
        if (!stats.isDirectory()) {
          return {
            success: false,
            userFeedback: `Search path is not a directory: ${searchDir}`,
            previewRefreshNeeded: false,
            technicalDetails: {
              error: 'Path is not a directory',
              path: searchDir,
            },
          };
        }
      } catch (error) {
        return {
          success: false,
          userFeedback: `Search directory does not exist: ${searchDir}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: 'Directory not found',
            path: searchDir,
          },
        };
      }

      // Find files matching the glob pattern
      const matchingFiles = await findFilesWithGlob(
        searchDir,
        pattern,
        caseSensitive,
        respectGitIgnore
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
            caseSensitive,
            respectGitIgnore,
            fileCount: 0,
          },
        };
      }

      // Sort files by modification time (newest first)
      const sortedFilePaths = sortFilesByTime(matchingFiles);

      const fileCount = sortedFilePaths.length;
      const fileListDescription = sortedFilePaths.join('\n');

      const resultMessage = `Found ${fileCount} file(s) matching "${pattern}" within ${searchDir}, sorted by modification time (newest first):\n${fileListDescription}`;

      const userMessage = `Found ${fileCount} matching file(s)`;

      return {
        success: true,
        data: {
          files: sortedFilePaths,
          count: fileCount,
          formattedList: fileListDescription,
        },
        userFeedback: userMessage,
        previewRefreshNeeded: false,
        technicalDetails: {
          searchDir,
          pattern,
          caseSensitive,
          respectGitIgnore,
          fileCount,
          fullListing: resultMessage,
        },
      };
    } catch (error) {
      logger.error('Error in glob file search', {
        error: error instanceof Error ? error.message : String(error),
        toolCallId: context.toolCallId,
      });

      return {
        success: false,
        userFeedback: 'Failed to search for files',
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
        description: 'Find all TypeScript files',
        input: {
          pattern: '**/*.ts',
          path: '/home/user/project',
        },
      },
      {
        description: 'Find all markdown files in docs',
        input: {
          pattern: 'docs/*.md',
        },
      },
      {
        description: 'Case-sensitive search for specific files',
        input: {
          pattern: '**/README.*',
          caseSensitive: true,
        },
      },
    ],
  },
};
