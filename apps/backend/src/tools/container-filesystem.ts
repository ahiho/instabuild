/**
 * Container-based filesystem operations
 *
 * All file operations execute inside isolated Docker containers via SandboxShellRunner.
 * This ensures complete isolation - the agent cannot access the host filesystem.
 *
 * Phase 3.5: Security - All filesystem tools must use container execution when sandboxId is available.
 */

import { logger } from '../lib/logger.js';
import { sandboxManager } from '../services/sandboxManager.js';

export interface ContainerFileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedTime?: Date;
}

/**
 * Container filesystem operations - all operations are isolated to a sandbox container
 * Uses sandboxManager.executeCommand() to run operations inside Docker containers
 */
export class ContainerFilesystem {
  /**
   * Read file content from container
   * @param sandboxId - Container sandbox ID
   * @param filePath - Absolute path inside container
   * @param encoding - File encoding: 'utf8' (default) or 'base64'
   * @param userId - User ID for authentication
   * @returns File content as string (base64 encoded if encoding='base64')
   */
  async readFile(
    sandboxId: string,
    filePath: string,
    encoding: 'utf8' | 'base64' = 'utf8',
    userId?: string
  ): Promise<string> {
    logger.info('Reading file from container', {
      sandboxId,
      filePath,
      encoding,
      userId,
    });

    if (encoding === 'base64') {
      // Use base64 encoding for binary files
      const result = await sandboxManager.executeCommand({
        sandboxId,
        command: 'cat',
        args: [filePath, '|', 'base64'],
        userId,
      });

      if (!result.success) {
        throw new Error(
          `Failed to read file as base64: ${result.error || result.stderr}`
        );
      }

      return result.stdout;
    } else {
      // Default UTF-8 encoding for text files
      const result = await sandboxManager.executeCommand({
        sandboxId,
        command: 'cat',
        args: [filePath],
        userId,
      });

      if (!result.success) {
        throw new Error(
          `Failed to read file: ${result.error || result.stderr}`
        );
      }

      return result.stdout;
    }
  }

  /**
   * Write file content to container
   * @param sandboxId - Container sandbox ID
   * @param filePath - Absolute path inside container
   * @param content - File content to write
   * @param userId - User ID for authentication
   */
  async writeFile(
    sandboxId: string,
    filePath: string,
    content: string,
    userId?: string
  ): Promise<void> {
    logger.info('Writing file to container', {
      sandboxId,
      filePath,
      contentLength: content.length,
      userId,
    });

    // Use tee to write file content via stdin
    const result = await sandboxManager.executeCommand({
      sandboxId,
      command: 'tee',
      args: [filePath],
      stdin: content, // Pass file content via stdin
      userId,
    });

    if (!result.success) {
      throw new Error(`Failed to write file: ${result.error || result.stderr}`);
    }
  }

  /**
   * List directory contents in container
   * @param sandboxId - Container sandbox ID
   * @param dirPath - Absolute path to directory inside container
   * @param userId - User ID for authentication
   * @returns Array of file entries
   */
  async listDirectory(
    sandboxId: string,
    dirPath: string,
    userId?: string
  ): Promise<ContainerFileEntry[]> {
    logger.info('Listing directory in container', {
      sandboxId,
      dirPath,
      userId,
    });

    // Use ls -la to get detailed file information
    // This is simpler and more reliable than find -exec
    const result = await sandboxManager.executeCommand({
      sandboxId,
      command: 'ls',
      args: ['-la', dirPath],
      userId,
    });

    if (!result.success) {
      throw new Error(
        `Failed to list directory: ${result.error || result.stderr}`
      );
    }

    // Parse ls output into file entries
    const entries: ContainerFileEntry[] = [];
    const lines = result.stdout.split('\n').filter(line => line.trim());

    for (const line of lines) {
      // Skip the total line and empty lines
      if (line.startsWith('total') || !line.trim()) continue;

      const parts = line.split(/\s+/);
      if (parts.length < 9) continue;

      // Skip . and .. entries
      const name = parts.slice(8).join(' ');
      if (name === '.' || name === '..') continue;

      const isDir = parts[0].startsWith('d');
      const size = parseInt(parts[4], 10);
      const path = `${dirPath}/${name}`.replace(/\/\/+/g, '/');

      entries.push({
        name,
        path,
        isDirectory: isDir,
        size: isDir ? 0 : size,
      });
    }

    return entries;
  }

  /**
   * Check if file/directory exists in container
   * @param sandboxId - Container sandbox ID
   * @param path - Absolute path inside container
   * @param userId - User ID for authentication
   * @returns True if exists
   */
  async exists(
    sandboxId: string,
    path: string,
    userId?: string
  ): Promise<boolean> {
    logger.debug('ContainerFilesystem.exists - checking path', {
      sandboxId,
      path,
      userId,
    });

    const result = await sandboxManager.executeCommand({
      sandboxId,
      command: 'test',
      args: ['-e', path],
      userId,
    });

    logger.debug('ContainerFilesystem.exists - result', {
      sandboxId,
      path,
      success: result.success,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
    });

    return result.success;
  }

  /**
   * Check if path is a directory in container
   * @param sandboxId - Container sandbox ID
   * @param path - Absolute path inside container
   * @param userId - User ID for authentication
   * @returns True if directory
   */
  async isDirectory(
    sandboxId: string,
    path: string,
    userId?: string
  ): Promise<boolean> {
    logger.info('Checking if path is directory in container', {
      sandboxId,
      path,
      userId,
    });

    const result = await sandboxManager.executeCommand({
      sandboxId,
      command: 'test',
      args: ['-d', path],
      userId,
    });

    return result.success;
  }

  /**
   * Get file size in container
   * @param sandboxId - Container sandbox ID
   * @param filePath - Absolute path inside container
   * @param userId - User ID for authentication
   * @returns File size in bytes
   */
  async getFileSize(
    sandboxId: string,
    filePath: string,
    userId?: string
  ): Promise<number> {
    logger.info('Getting file size from container', {
      sandboxId,
      filePath,
      userId,
    });

    // Use 'wc -c' instead of 'stat' for BusyBox compatibility
    // stat has different syntax across platforms (macOS, GNU, BusyBox)
    // wc -c works consistently across all Unix-like systems
    const result = await sandboxManager.executeCommand({
      sandboxId,
      command: 'wc',
      args: ['-c', filePath],
      userId,
    });

    if (!result.success) {
      throw new Error(
        `Failed to get file size: ${result.error || result.stderr}`
      );
    }

    // wc output format: "number filename"
    // Extract just the number (first field)
    const sizeStr = result.stdout.trim().split(/\s+/)[0];
    return parseInt(sizeStr, 10);
  }

  /**
   * Search for pattern in files within container directory
   * @param sandboxId - Container sandbox ID
   * @param pattern - Search pattern (regex)
   * @param dirPath - Directory to search in
   * @param filePattern - Optional glob pattern for files to include
   * @param userId - User ID for authentication
   * @returns Array of matches with file paths and line numbers
   */
  async searchPattern(
    sandboxId: string,
    pattern: string,
    dirPath: string,
    filePattern?: string,
    userId?: string
  ): Promise<Array<{ filePath: string; lineNumber: number; line: string }>> {
    logger.info('Searching for pattern in container', {
      sandboxId,
      pattern,
      dirPath,
      filePattern,
      userId,
    });

    // Use ripgrep (rg) for fast recursive search with automatic .gitignore support
    // rg automatically ignores node_modules, .git, dist, build, etc.
    const args = ['-n', pattern];

    if (filePattern) {
      // Add glob pattern filter
      args.push('-g', filePattern);
    }

    args.push(dirPath);

    const result = await sandboxManager.executeCommand({
      sandboxId,
      command: 'rg',
      args,
      userId,
    });

    // Parse ripgrep output: file:line:content
    const matches: Array<{
      filePath: string;
      lineNumber: number;
      line: string;
    }> = [];

    // rg returns exit code 1 if no matches (not an error)
    if (!result.success && result.exitCode !== 1) {
      throw new Error(`Search failed: ${result.error || result.stderr}`);
    }

    const lines = result.stdout.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const match = line.match(/^([^:]+):(\d+):(.*)$/);
      if (match) {
        matches.push({
          filePath: match[1],
          lineNumber: parseInt(match[2], 10),
          line: match[3],
        });
      }
    }

    return matches;
  }

  /**
   * Create directory in container
   * @param sandboxId - Container sandbox ID
   * @param dirPath - Absolute path to create
   * @param recursive - Create parent directories if needed
   * @param userId - User ID for authentication
   */
  async mkdir(
    sandboxId: string,
    dirPath: string,
    recursive: boolean = true,
    userId?: string
  ): Promise<void> {
    logger.info('Creating directory in container', {
      sandboxId,
      dirPath,
      recursive,
      userId,
    });

    const args = recursive ? ['-p', dirPath] : [dirPath];
    const result = await sandboxManager.executeCommand({
      sandboxId,
      command: 'mkdir',
      args,
      userId,
    });

    if (!result.success) {
      throw new Error(
        `Failed to create directory: ${result.error || result.stderr}`
      );
    }
  }

  /**
   * Find files matching glob pattern in container
   * @param sandboxId - Container sandbox ID
   * @param dirPath - Directory to search in
   * @param pattern - Glob pattern
   * @param userId - User ID for authentication
   * @param caseSensitive - Whether the search should be case-sensitive (defaults to false)
   * @param respectGitIgnore - Whether to respect .gitignore patterns (defaults to true)
   * @returns Array of absolute file paths
   */
  async findGlob(
    sandboxId: string,
    dirPath: string,
    pattern: string,
    userId?: string,
    caseSensitive?: boolean,
    respectGitIgnore?: boolean
  ): Promise<string[]> {
    logger.info('Finding files with glob pattern in container', {
      sandboxId,
      dirPath,
      pattern,
      userId,
      caseSensitive,
      respectGitIgnore,
    });

    // Use ripgrep (rg) for fast, glob-aware file searching
    // rg --files matches files and supports glob patterns natively
    // Convert glob patterns for rg:
    // *.tsx -> *.tsx (already correct)
    // **/*.tsx -> *.tsx (rg searches recursively by default)
    const rgPattern = pattern.replace(/^\*\*\//, '').replace(/\*\*/g, '');

    // Build ripgrep args based on options
    const args = ['--files', '-g', rgPattern];

    // Add case sensitivity flag
    if (caseSensitive) {
      args.push('--case-sensitive');
    } else {
      args.push('-i'); // case-insensitive
    }

    // Add gitignore flag (default is to respect .gitignore)
    if (respectGitIgnore === false) {
      args.push('--no-ignore');
    }

    args.push(dirPath);

    const result = await sandboxManager.executeCommand({
      sandboxId,
      command: 'rg',
      args,
      userId,
    });

    if (!result.success) {
      // rg returns exit code 1 if no matches found (not an error)
      if (result.exitCode === 1) {
        return [];
      }
      throw new Error(`Failed to find files: ${result.error || result.stderr}`);
    }

    return result.stdout
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.trim());
  }
}

// Export singleton instance
export const containerFilesystem = new ContainerFilesystem();
