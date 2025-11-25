/**
 * Text replacement utilities for file editing tools
 * Provides safe, validated text replacement operations
 */

/**
 * Safely replace text in content, handling special regex characters
 * This prevents issues with $ sequences and other regex special chars
 */
export function safeLiteralReplace(
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
 * Count occurrences of a string in content
 */
export function countOccurrences(
  content: string,
  searchString: string
): number {
  if (searchString === '') {
    return 0;
  }
  const escapedString = searchString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapedString, 'g');
  const matches = content.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Apply replacement to content with validation
 * @throws Error if content is null/undefined and not a new file
 */
export function applyReplacement(
  currentContent: string | null,
  oldString: string,
  newString: string,
  isNewFile: boolean
): string {
  // Case 1: Creating a new file
  if (isNewFile) {
    return newString;
  }

  // Case 2: Content should never be null for existing files
  // This is a safety check - if we reach here with null content, something went wrong
  if (currentContent === null || currentContent === undefined) {
    throw new Error(
      'Cannot apply replacement: file content is null or undefined. This should not happen for existing files.'
    );
  }

  // Case 3: Trying to create a file with old_string !== '' (invalid operation)
  if (oldString === '' && !isNewFile) {
    // Empty old_string with existing file means no changes
    return currentContent;
  }

  // Case 4: Normal replacement operation
  return safeLiteralReplace(currentContent, oldString, newString);
}

/**
 * Result of calculating a replacement operation
 */
export interface ReplacementCalculation {
  success: boolean;
  newContent: string;
  occurrences: number;
  error?: {
    /** Short, user-friendly error message */
    display: string;
    /** Detailed error message with context and suggestions for LLM */
    raw: string;
    code: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Calculate and validate a replacement operation without modifying any files
 * This allows us to validate the operation before writing to disk
 *
 * @param currentContent The current content of the file (null if file doesn't exist)
 * @param oldString The string to replace
 * @param newString The replacement string
 * @param expectedReplacements Expected number of replacements (default: 1)
 * @param isNewFile Whether this is a new file creation
 * @returns Calculation result with validation status
 */
export function calculateReplacement(
  currentContent: string | null,
  oldString: string,
  newString: string,
  expectedReplacements: number = 1,
  isNewFile: boolean = false
): ReplacementCalculation {
  // Handle new file creation
  if (isNewFile) {
    if (oldString !== '') {
      return {
        success: false,
        newContent: '',
        occurrences: 0,
        error: {
          display: 'Cannot create new file with non-empty old_string',
          raw: 'Cannot create new file with non-empty old_string. When creating a new file, old_string must be empty.',
          code: 'INVALID_NEW_FILE_PARAMS',
          details: { oldString, expectedEmpty: true },
        },
      };
    }
    return {
      success: true,
      newContent: newString,
      occurrences: 0,
    };
  }

  // Validate that we have content for existing files
  if (currentContent === null || currentContent === undefined) {
    return {
      success: false,
      newContent: '',
      occurrences: 0,
      error: {
        display: 'File content is null or undefined',
        raw: 'File content is null or undefined. Cannot perform replacement on non-existent file content.',
        code: 'INVALID_CONTENT',
      },
    };
  }

  // Handle attempt to create file that already exists
  if (oldString === '') {
    return {
      success: false,
      newContent: currentContent,
      occurrences: 0,
      error: {
        display:
          'Failed to edit. Attempted to create a file that already exists.',
        raw: 'Failed to edit. File already exists, cannot create. Use read_file to examine current content before editing.',
        code: 'FILE_ALREADY_EXISTS',
      },
    };
  }

  // Count occurrences of the old string
  const occurrences = countOccurrences(currentContent, oldString);

  // Validate occurrence count
  if (occurrences === 0) {
    return {
      success: false,
      newContent: currentContent,
      occurrences: 0,
      error: {
        display: 'Failed to edit, could not find the string to replace.',
        raw: "Failed to edit, 0 occurrences found for old_string. No edits made. The exact text in old_string was not found. Ensure you're not escaping content incorrectly and check whitespace, indentation, and context. Use read_file tool to verify current content.",
        code: 'STRING_NOT_FOUND',
        details: {
          searchString: oldString.substring(0, 100),
          fileLength: currentContent.length,
        },
      },
    };
  }

  if (occurrences !== expectedReplacements) {
    const occurrenceTerm =
      expectedReplacements === 1 ? 'occurrence' : 'occurrences';
    return {
      success: false,
      newContent: currentContent,
      occurrences,
      error: {
        display: `Failed to edit, expected ${expectedReplacements} ${occurrenceTerm} but found ${occurrences}.`,
        raw: `Failed to edit. Expected ${expectedReplacements} ${occurrenceTerm} but found ${occurrences} for old_string. The old_string must uniquely identify the text to change. Include more context lines (at least 3 before and after) to ensure uniqueness. Check whitespace and indentation match exactly.`,
        code: 'OCCURRENCE_MISMATCH',
        details: {
          expected: expectedReplacements,
          found: occurrences,
        },
      },
    };
  }

  // Check if old and new strings are identical
  if (oldString === newString) {
    return {
      success: false,
      newContent: currentContent,
      occurrences,
      error: {
        display:
          'No changes to apply. The old_string and new_string are identical.',
        raw: 'No changes to apply. The old_string and new_string are identical. Check your replacement parameters.',
        code: 'NO_CHANGE_NEEDED',
      },
    };
  }

  // Apply the replacement
  let newContent: string;
  try {
    newContent = applyReplacement(currentContent, oldString, newString, false);
  } catch (error) {
    return {
      success: false,
      newContent: currentContent,
      occurrences,
      error: {
        display: 'Failed to apply replacement.',
        raw:
          error instanceof Error
            ? `Replacement error: ${error.message}`
            : 'Unknown error during replacement',
        code: 'REPLACEMENT_ERROR',
      },
    };
  }

  // Validate that content actually changed
  if (currentContent === newContent) {
    return {
      success: false,
      newContent: currentContent,
      occurrences,
      error: {
        display:
          'No changes to apply. The new content is identical to the current content.',
        raw: 'No changes to apply. The new content is identical to the current content. Verify your old_string and new_string parameters are correct.',
        code: 'NO_CONTENT_CHANGE',
      },
    };
  }

  return {
    success: true,
    newContent,
    occurrences,
  };
}
