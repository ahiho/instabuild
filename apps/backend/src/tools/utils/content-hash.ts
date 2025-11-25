/**
 * Content hashing utilities for detecting file modifications
 * Inspired by Google Gemini's smart-edit.ts implementation
 */

import * as crypto from 'node:crypto';

/**
 * Creates a SHA256 hash of the given content.
 * Used to detect if file content has changed since it was read.
 *
 * @param content The string content to hash
 * @returns A hex-encoded hash string (64 characters)
 *
 * @example
 * ```typescript
 * const hash1 = hashContent('Hello world');
 * const hash2 = hashContent('Hello world');
 * console.log(hash1 === hash2); // true
 *
 * const hash3 = hashContent('Hello world!');
 * console.log(hash1 === hash3); // false - content changed
 * ```
 */
export function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Compares two content hashes to detect if content has changed
 *
 * @param hash1 First content hash
 * @param hash2 Second content hash
 * @returns True if hashes are different (content changed)
 */
export function hasContentChanged(hash1: string, hash2: string): boolean {
  return hash1 !== hash2;
}

/**
 * Result of content staleness check
 */
export interface ContentStalenessCheck {
  /**
   * Whether the content has changed since initial read
   */
  isStale: boolean;

  /**
   * Hash of the initially read content
   */
  initialHash: string;

  /**
   * Hash of the current on-disk content
   */
  currentHash: string;

  /**
   * The current content from disk (if isStale is true)
   */
  currentContent?: string;

  /**
   * Error message if file couldn't be re-read
   */
  error?: string;
}

/**
 * Check if file content is stale (has changed since initial read)
 *
 * This is critical for multi-step AI operations where:
 * 1. AI reads file
 * 2. AI calculates changes
 * 3. AI writes file
 *
 * Between steps 1 and 3, the file might be modified by:
 * - User editing in parallel
 * - Another AI tool call
 * - External process
 *
 * @param initialContent The content that was initially read
 * @param readCurrentContent Function to re-read current content from disk
 * @returns Staleness check result
 *
 * @example
 * ```typescript
 * // Step 1: Initial read
 * const initialContent = await readFile('/workspace/file.tsx');
 *
 * // Step 2: AI calculates changes (takes time)
 * const newContent = await aiProcessContent(initialContent);
 *
 * // Step 3: Check if content is still fresh before writing
 * const staleCheck = await checkContentStaleness(
 *   initialContent,
 *   () => readFile('/workspace/file.tsx')
 * );
 *
 * if (staleCheck.isStale) {
 *   return {
 *     success: false,
 *     error: 'File has been modified since read. Please re-read and try again.'
 *   };
 * }
 *
 * // Safe to write
 * await writeFile('/workspace/file.tsx', newContent);
 * ```
 */
export async function checkContentStaleness(
  initialContent: string,
  readCurrentContent: () => Promise<string>
): Promise<ContentStalenessCheck> {
  // Normalize line endings before hashing for consistent comparison
  const normalizedInitial = initialContent.replace(/\r\n/g, '\n');
  const initialHash = hashContent(normalizedInitial);

  try {
    // Re-read file from disk
    const currentContent = await readCurrentContent();
    const normalizedCurrent = currentContent.replace(/\r\n/g, '\n');
    const currentHash = hashContent(normalizedCurrent);

    const isStale = hasContentChanged(initialHash, currentHash);

    return {
      isStale,
      initialHash,
      currentHash,
      currentContent: isStale ? normalizedCurrent : undefined,
    };
  } catch (error) {
    // If we can't re-read the file, treat it as potentially stale
    // Better to be safe and force a re-read than to overwrite
    return {
      isStale: true,
      initialHash,
      currentHash: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
