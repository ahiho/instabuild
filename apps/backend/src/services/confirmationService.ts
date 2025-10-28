import { logger } from '../lib/logger.js';

/**
 * Types of confirmations that can be requested
 */
export enum ConfirmationType {
  FILE_WRITE = 'file_write',
  FILE_REPLACE = 'file_replace',
  DESTRUCTIVE_ACTION = 'destructive_action',
  MULTI_FILE_CHANGE = 'multi_file_change',
}

/**
 * Diff line types for visualization
 */
export enum DiffLineType {
  UNCHANGED = 'unchanged',
  ADDED = 'added',
  REMOVED = 'removed',
  CONTEXT = 'context',
}

/**
 * Individual line in a diff
 */
export interface DiffLine {
  type: DiffLineType;
  lineNumber?: number;
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

/**
 * File diff information
 */
export interface FileDiff {
  filePath: string;
  fileName: string;
  isNewFile: boolean;
  isDeleted: boolean;
  oldContent: string;
  newContent: string;
  lines: DiffLine[];
  addedLines: number;
  removedLines: number;
  contextLines: number;
}

/**
 * Confirmation request
 */
export interface ConfirmationRequest {
  id: string;
  conversationId: string;
  type: ConfirmationType;
  title: string;
  description: string;
  fileDiffs: FileDiff[];
  toolName: string;
  toolInput: any;
  timestamp: Date;
  expiresAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Confirmation response
 */
export interface ConfirmationResponse {
  requestId: string;
  approved: boolean;
  modifiedContent?: Record<string, string>; // filePath -> modified content
  userFeedback?: string;
  timestamp: Date;
}

/**
 * Confirmation and diff display service for user interaction
 */
export class ConfirmationService {
  private pendingConfirmations: Map<string, ConfirmationRequest> = new Map();
  private confirmationCallbacks: Map<
    string,
    (response: ConfirmationResponse) => void
  > = new Map();

  /**
   * Create a detailed diff between two text contents
   */
  createDetailedDiff(
    oldContent: string,
    newContent: string,
    filePath: string,
    contextLines: number = 3
  ): FileDiff {
    const fileName = filePath.split('/').pop() || filePath;
    const isNewFile = oldContent === '';
    const isDeleted = newContent === '';

    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    const diffLines: DiffLine[] = [];

    if (isNewFile) {
      // New file - all lines are additions
      newLines.forEach((line, index) => {
        diffLines.push({
          type: DiffLineType.ADDED,
          content: line,
          newLineNumber: index + 1,
        });
      });
    } else if (isDeleted) {
      // Deleted file - all lines are removals
      oldLines.forEach((line, index) => {
        diffLines.push({
          type: DiffLineType.REMOVED,
          content: line,
          oldLineNumber: index + 1,
        });
      });
    } else {
      // Modified file - compute line-by-line diff
      this.computeLineDiff(oldLines, newLines, diffLines, contextLines);
    }

    const addedLines = diffLines.filter(
      line => line.type === DiffLineType.ADDED
    ).length;
    const removedLines = diffLines.filter(
      line => line.type === DiffLineType.REMOVED
    ).length;
    const contextLinesCount = diffLines.filter(
      line => line.type === DiffLineType.CONTEXT
    ).length;

    return {
      filePath,
      fileName,
      isNewFile,
      isDeleted,
      oldContent,
      newContent,
      lines: diffLines,
      addedLines,
      removedLines,
      contextLines: contextLinesCount,
    };
  }

  /**
   * Compute line-by-line diff using a simple algorithm
   */
  private computeLineDiff(
    oldLines: string[],
    newLines: string[],
    diffLines: DiffLine[],
    contextLines: number
  ): void {
    // const maxLines = Math.max(oldLines.length, newLines.length);
    const changes: Array<{
      type: 'add' | 'remove' | 'same';
      oldIndex?: number;
      newIndex?: number;
      line: string;
    }> = [];

    // Simple line-by-line comparison
    let oldIndex = 0;
    let newIndex = 0;

    while (oldIndex < oldLines.length || newIndex < newLines.length) {
      const oldLine = oldLines[oldIndex] || '';
      const newLine = newLines[newIndex] || '';

      if (oldIndex >= oldLines.length) {
        // Only new lines remaining
        changes.push({ type: 'add', newIndex, line: newLine });
        newIndex++;
      } else if (newIndex >= newLines.length) {
        // Only old lines remaining
        changes.push({ type: 'remove', oldIndex, line: oldLine });
        oldIndex++;
      } else if (oldLine === newLine) {
        // Lines are the same
        changes.push({ type: 'same', oldIndex, newIndex, line: oldLine });
        oldIndex++;
        newIndex++;
      } else {
        // Lines are different - look ahead to see if we can find a match
        let foundMatch = false;
        const lookAhead = Math.min(
          5,
          Math.max(oldLines.length - oldIndex, newLines.length - newIndex)
        );

        for (let i = 1; i <= lookAhead; i++) {
          if (
            oldIndex + i < oldLines.length &&
            oldLines[oldIndex + i] === newLine
          ) {
            // Found matching line in old content - mark intermediate lines as removed
            for (let j = 0; j < i; j++) {
              changes.push({
                type: 'remove',
                oldIndex: oldIndex + j,
                line: oldLines[oldIndex + j],
              });
            }
            changes.push({
              type: 'same',
              oldIndex: oldIndex + i,
              newIndex,
              line: newLine,
            });
            oldIndex += i + 1;
            newIndex++;
            foundMatch = true;
            break;
          } else if (
            newIndex + i < newLines.length &&
            newLines[newIndex + i] === oldLine
          ) {
            // Found matching line in new content - mark intermediate lines as added
            for (let j = 0; j < i; j++) {
              changes.push({
                type: 'add',
                newIndex: newIndex + j,
                line: newLines[newIndex + j],
              });
            }
            changes.push({
              type: 'same',
              oldIndex,
              newIndex: newIndex + i,
              line: oldLine,
            });
            oldIndex++;
            newIndex += i + 1;
            foundMatch = true;
            break;
          }
        }

        if (!foundMatch) {
          // No match found - treat as replacement
          changes.push({ type: 'remove', oldIndex, line: oldLine });
          changes.push({ type: 'add', newIndex, line: newLine });
          oldIndex++;
          newIndex++;
        }
      }
    }

    // Convert changes to diff lines with context
    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];

      switch (change.type) {
        case 'same': // Include context lines around changes
        {
          const hasChangesBefore = i > 0 && changes[i - 1].type !== 'same';
          const hasChangesAfter =
            i < changes.length - 1 && changes[i + 1].type !== 'same';
          const isNearChange = hasChangesBefore || hasChangesAfter;

          if (isNearChange || contextLines === 0) {
            diffLines.push({
              type: DiffLineType.CONTEXT,
              content: change.line,
              oldLineNumber: (change.oldIndex || 0) + 1,
              newLineNumber: (change.newIndex || 0) + 1,
            });
          }
          break;
        }

        case 'remove':
          diffLines.push({
            type: DiffLineType.REMOVED,
            content: change.line,
            oldLineNumber: (change.oldIndex || 0) + 1,
          });
          break;

        case 'add':
          diffLines.push({
            type: DiffLineType.ADDED,
            content: change.line,
            newLineNumber: (change.newIndex || 0) + 1,
          });
          break;
      }
    }
  }

  /**
   * Format diff for display in chat
   */
  formatDiffForDisplay(fileDiff: FileDiff): string {
    const { fileName, isNewFile, isDeleted, addedLines, removedLines, lines } =
      fileDiff;

    let header = '';
    if (isNewFile) {
      header = `📄 **New file**: ${fileName} (+${addedLines} lines)`;
    } else if (isDeleted) {
      header = `🗑️ **Deleted file**: ${fileName} (-${removedLines} lines)`;
    } else {
      const changes = [];
      if (addedLines > 0) changes.push(`+${addedLines}`);
      if (removedLines > 0) changes.push(`-${removedLines}`);
      header = `📝 **Modified**: ${fileName} (${changes.join(', ')} lines)`;
    }

    const diffContent = lines
      .map(line => {
        // const lineNum = line.oldLineNumber || line.newLineNumber || '';
        const prefix = this.getDiffLinePrefix(line.type);
        return `${prefix} ${line.content}`;
      })
      .join('\n');

    return `${header}\n\`\`\`diff\n${diffContent}\n\`\`\``;
  }

  /**
   * Get prefix for diff line type
   */
  private getDiffLinePrefix(type: DiffLineType): string {
    switch (type) {
      case DiffLineType.ADDED:
        return '+';
      case DiffLineType.REMOVED:
        return '-';
      case DiffLineType.CONTEXT:
      case DiffLineType.UNCHANGED:
        return ' ';
      default:
        return ' ';
    }
  }

  /**
   * Request confirmation for a potentially destructive action
   */
  async requestConfirmation(
    conversationId: string,
    type: ConfirmationType,
    title: string,
    description: string,
    fileDiffs: FileDiff[],
    toolName: string,
    toolInput: any,
    timeoutMs: number = 300000, // 5 minutes default
    metadata?: Record<string, any>
  ): Promise<ConfirmationResponse> {
    const requestId = `${conversationId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const request: ConfirmationRequest = {
      id: requestId,
      conversationId,
      type,
      title,
      description,
      fileDiffs,
      toolName,
      toolInput,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + timeoutMs),
      metadata,
    };

    this.pendingConfirmations.set(requestId, request);

    logger.info('Created confirmation request', {
      requestId,
      conversationId,
      type,
      fileCount: fileDiffs.length,
      toolName,
    });

    // Return a promise that resolves when confirmation is received
    return new Promise((resolve, reject) => {
      // Set up callback for when confirmation is received
      this.confirmationCallbacks.set(requestId, resolve);

      // Set up timeout
      setTimeout(() => {
        if (this.pendingConfirmations.has(requestId)) {
          this.pendingConfirmations.delete(requestId);
          this.confirmationCallbacks.delete(requestId);

          logger.warn('Confirmation request timed out', { requestId });

          reject(new Error('Confirmation request timed out'));
        }
      }, timeoutMs);
    });
  }

  /**
   * Respond to a confirmation request
   */
  respondToConfirmation(
    requestId: string,
    approved: boolean,
    modifiedContent?: Record<string, string>,
    userFeedback?: string
  ): boolean {
    const request = this.pendingConfirmations.get(requestId);
    if (!request) {
      logger.warn('Confirmation request not found', { requestId });
      return false;
    }

    const callback = this.confirmationCallbacks.get(requestId);
    if (!callback) {
      logger.warn('Confirmation callback not found', { requestId });
      return false;
    }

    const response: ConfirmationResponse = {
      requestId,
      approved,
      modifiedContent,
      userFeedback,
      timestamp: new Date(),
    };

    // Clean up
    this.pendingConfirmations.delete(requestId);
    this.confirmationCallbacks.delete(requestId);

    // Call the callback
    callback(response);

    logger.info('Processed confirmation response', {
      requestId,
      approved,
      hasModifications: !!modifiedContent,
      hasFeedback: !!userFeedback,
    });

    return true;
  }

  /**
   * Get pending confirmation request
   */
  getPendingConfirmation(requestId: string): ConfirmationRequest | undefined {
    return this.pendingConfirmations.get(requestId);
  }

  /**
   * Get all pending confirmations for a conversation
   */
  getPendingConfirmationsForConversation(
    conversationId: string
  ): ConfirmationRequest[] {
    return Array.from(this.pendingConfirmations.values()).filter(
      request => request.conversationId === conversationId
    );
  }

  /**
   * Cancel a pending confirmation request
   */
  cancelConfirmation(requestId: string): boolean {
    const request = this.pendingConfirmations.get(requestId);
    if (!request) {
      return false;
    }

    const callback = this.confirmationCallbacks.get(requestId);
    if (callback) {
      // Reject the promise
      callback({
        requestId,
        approved: false,
        timestamp: new Date(),
      });
    }

    this.pendingConfirmations.delete(requestId);
    this.confirmationCallbacks.delete(requestId);

    logger.info('Cancelled confirmation request', { requestId });
    return true;
  }

  /**
   * Generate success message after confirmation
   */
  generateSuccessMessage(
    type: ConfirmationType,
    fileDiffs: FileDiff[],
    userModified: boolean = false
  ): string {
    const fileCount = fileDiffs.length;
    const fileTerm = fileCount === 1 ? 'file' : 'files';

    let message = '';

    switch (type) {
      case ConfirmationType.FILE_WRITE:
        message = `✅ Successfully created/updated ${fileCount} ${fileTerm}`;
        break;
      case ConfirmationType.FILE_REPLACE:
        message = `✅ Successfully modified ${fileCount} ${fileTerm}`;
        break;
      case ConfirmationType.DESTRUCTIVE_ACTION:
        message = `✅ Successfully completed the requested action on ${fileCount} ${fileTerm}`;
        break;
      case ConfirmationType.MULTI_FILE_CHANGE:
        message = `✅ Successfully updated ${fileCount} ${fileTerm}`;
        break;
      default:
        message = '✅ Successfully completed the requested changes';
    }

    if (userModified) {
      message += ' (with your modifications)';
    }

    // Add file summary
    if (fileCount <= 3) {
      const fileNames = fileDiffs.map(diff => diff.fileName).join(', ');
      message += `:\n${fileNames}`;
    }

    return message;
  }

  /**
   * Generate failure message
   */
  generateFailureMessage(
    type: ConfirmationType,
    reason: string = 'User declined'
  ): string {
    let message = '';

    switch (type) {
      case ConfirmationType.FILE_WRITE:
        message = '❌ File creation/update cancelled';
        break;
      case ConfirmationType.FILE_REPLACE:
        message = '❌ File modification cancelled';
        break;
      case ConfirmationType.DESTRUCTIVE_ACTION:
        message = '❌ Action cancelled';
        break;
      case ConfirmationType.MULTI_FILE_CHANGE:
        message = '❌ Multi-file changes cancelled';
        break;
      default:
        message = '❌ Operation cancelled';
    }

    if (reason !== 'User declined') {
      message += `: ${reason}`;
    }

    return message;
  }

  /**
   * Clean up expired confirmation requests
   */
  cleanupExpiredRequests(): void {
    const now = new Date();

    for (const [requestId, request] of this.pendingConfirmations.entries()) {
      if (request.expiresAt < now) {
        this.cancelConfirmation(requestId);
      }
    }
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    return {
      service: 'ConfirmationService',
      version: '1.0.0',
      pendingRequests: this.pendingConfirmations.size,
      activeCallbacks: this.confirmationCallbacks.size,
      capabilities: [
        'detailed-diff-generation',
        'user-confirmation-workflows',
        'file-modification-tracking',
        'timeout-handling',
        'user-content-modification',
      ],
    };
  }
}

// Export singleton instance
export const confirmationService = new ConfirmationService();
