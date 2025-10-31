/**
 * File reading utilities for file system tools
 * Provides safe file content processing for text and binary files
 */

import * as path from 'node:path';

/**
 * Result of file content processing
 */
export interface FileReadResult {
  success: boolean;
  content?: string;
  encoding?: 'utf8' | 'base64';
  mimeType?: string;
  fileSize?: number;
  totalLines?: number;
  isBinary?: boolean;
  isTruncated?: boolean;
  linesShown?: [number, number];
  error?: {
    message: string;
    code: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Detect if a file is binary based on its extension
 */
export function isBinaryFile(filePath: string): boolean {
  const binaryExtensions = [
    // Images
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.bmp',
    '.webp',
    '.svg',
    '.ico',
    '.tiff',
    '.tif',
    // Documents
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    // Archives
    '.zip',
    '.tar',
    '.gz',
    '.rar',
    '.7z',
    '.bz2',
    // Executables
    '.exe',
    '.dll',
    '.so',
    '.dylib',
    '.app',
    // Media
    '.mp3',
    '.mp4',
    '.avi',
    '.mov',
    '.wav',
    '.flac',
    '.ogg',
    '.webm',
    // Fonts
    '.woff',
    '.woff2',
    '.ttf',
    '.otf',
    '.eot',
  ];

  const ext = path.extname(filePath).toLowerCase();
  return binaryExtensions.includes(ext);
}

/**
 * Get specific MIME type for a file based on extension
 */
export function getSpecificMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    // Text
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    // Web
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.ts': 'application/typescript',
    '.jsx': 'application/javascript',
    '.tsx': 'application/typescript',
    // Data
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.yaml': 'application/yaml',
    '.yml': 'application/yaml',
    // Images
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    // Documents
    '.pdf': 'application/pdf',
    // Archives
    '.zip': 'application/zip',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Process text file content with truncation support
 */
export function processTextFileContent(
  content: string,
  filePath: string,
  fileSize: number,
  offset?: number,
  limit?: number
): FileReadResult {
  const lines = content.split('\n');
  const totalLines = lines.length;
  const mimeType = getSpecificMimeType(filePath);

  let processedContent = content;
  let isTruncated = false;
  let linesShown: [number, number] | undefined;

  // Handle offset and limit for pagination
  if (offset !== undefined || limit !== undefined) {
    const startLine = offset || 0;
    const endLine = limit ? startLine + limit : totalLines;

    // Validate offset is within bounds
    if (startLine >= totalLines) {
      return {
        success: false,
        error: {
          message: `Offset ${startLine} is beyond the file length (${totalLines} lines)`,
          code: 'OFFSET_OUT_OF_BOUNDS',
          details: {
            offset: startLine,
            totalLines,
          },
        },
      };
    }

    const selectedLines = lines.slice(startLine, Math.min(endLine, totalLines));
    processedContent = selectedLines.join('\n');
    isTruncated = endLine < totalLines;
    linesShown = [startLine + 1, Math.min(endLine, totalLines)]; // 1-based for display
  } else {
    // Check if file needs automatic truncation
    const maxLines = 2000; // Default limit for large files
    if (totalLines > maxLines) {
      const selectedLines = lines.slice(0, maxLines);
      processedContent = selectedLines.join('\n');
      isTruncated = true;
      linesShown = [1, maxLines];
    }
  }

  // Build content for LLM with truncation notice if needed
  let llmContent = processedContent;
  if (isTruncated && linesShown) {
    const [start, end] = linesShown;
    const nextOffset = offset ? offset + (end - start + 1) : end;

    llmContent = `IMPORTANT: The file content has been truncated.
Status: Showing lines ${start}-${end} of ${totalLines} total lines.
Action: To read more of the file, you can use the 'offset' and 'limit' parameters in a subsequent 'read_file' call. For example, to read the next section of the file, use offset: ${nextOffset}.

--- FILE CONTENT (truncated) ---
${processedContent}`;
  }

  return {
    success: true,
    content: llmContent,
    encoding: 'utf8',
    mimeType,
    fileSize,
    totalLines,
    isBinary: false,
    isTruncated,
    linesShown,
  };
}

/**
 * Process binary file content
 */
export function processBinaryFileContent(
  base64Content: string,
  filePath: string,
  fileSize: number
): FileReadResult {
  const mimeType = getSpecificMimeType(filePath);

  return {
    success: true,
    content: base64Content,
    encoding: 'base64',
    mimeType,
    fileSize,
    isBinary: true,
  };
}

/**
 * Centralized file content processing
 * Determines file type and processes accordingly
 */
export async function processFileContent(
  fileContent: string,
  filePath: string,
  fileSize: number,
  isBinary: boolean,
  offset?: number,
  limit?: number
): Promise<FileReadResult> {
  if (isBinary) {
    return processBinaryFileContent(fileContent, filePath, fileSize);
  }

  return processTextFileContent(fileContent, filePath, fileSize, offset, limit);
}
