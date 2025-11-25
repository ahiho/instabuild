/**
 * Converts database chat message records to AI SDK message format
 * This allows the frontend to reconstruct the full conversation with parts
 */

export interface DatabaseChatMessage {
  id: string;
  conversationId: string;
  landingPageId?: string | null;
  senderType: 'User' | 'AI';
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  parts?: any[] | null;
  toolCalls?: any[] | null;
  toolResults?: any[] | null;
  metadata?: any;
  createdAt: Date;
}

export interface AISDKMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: any[];
}

/**
 * Convert a database chat message to AI SDK format
 * If parts are stored, use those directly (preferred format)
 * Otherwise, reconstruct from content/toolCalls/toolResults fields
 */
export function convertDatabaseMessageToAISDK(
  dbMessage: DatabaseChatMessage
): AISDKMessage {
  // If parts are stored, use them directly (this is the primary format)
  // Parts array includes: text, tool-call, tool-result, reasoning, file, source-url, source-document, etc.
  if (dbMessage.parts && Array.isArray(dbMessage.parts)) {
    return {
      role: dbMessage.role as 'user' | 'assistant' | 'system' | 'tool',
      content: dbMessage.parts,
    };
  }

  // Fallback: reconstruct from legacy fields
  const content: any[] = [];

  // Add text content
  if (dbMessage.content && dbMessage.content.trim()) {
    content.push({
      type: 'text',
      text: dbMessage.content,
    });
  }

  // Add tool calls if present
  if (dbMessage.toolCalls && Array.isArray(dbMessage.toolCalls)) {
    for (const toolCall of dbMessage.toolCalls) {
      content.push({
        type: 'tool-call',
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        input: toolCall.input || toolCall.args || {},
      });
    }
  }

  // Add tool results if present
  // Tool results can be inline in the same message as tool calls (AI SDK v5 format)
  // or in a separate message with role='tool'
  if (dbMessage.toolResults && Array.isArray(dbMessage.toolResults)) {
    for (const toolResult of dbMessage.toolResults) {
      const resultPart: any = {
        type: 'tool-result',
        toolCallId: toolResult.toolCallId,
      };

      // Add content if available (successful result)
      if (toolResult.content) {
        resultPart.content = toolResult.content;
      }

      // Add error if available (failed result)
      if (toolResult.error) {
        resultPart.error = toolResult.error;
      }

      content.push(resultPart);
    }
  }

  return {
    role: dbMessage.role as 'user' | 'assistant' | 'system' | 'tool',
    content: content.length > 0 ? content : [{ type: 'text', text: '' }],
  };
}

/**
 * Convert database messages to AI SDK format for use in useChat hook
 */
export function convertDatabaseMessagesToAISDK(
  dbMessages: DatabaseChatMessage[]
): AISDKMessage[] {
  return dbMessages.map(msg => convertDatabaseMessageToAISDK(msg));
}

/**
 * Optimize messages for LLM by stripping unnecessary data from tool results
 * This reduces context size while preserving all data for UI display
 *
 * - Transforms tool-result parts to only include the .data field
 * - Keeps userFeedback, technicalDetails, etc. out of LLM context
 * - Original messages remain unchanged for database storage and UI
 */
export function optimizeMessagesForLLM(messages: any[]): any[] {
  return messages.map(msg => {
    // Skip if no parts array (shouldn't happen with AI SDK messages)
    if (!Array.isArray(msg.parts) && !Array.isArray(msg.content)) {
      return msg;
    }

    // Work with either parts or content array (AI SDK uses both formats)
    const partsArray = msg.parts || msg.content;

    // Transform tool-result parts
    const optimizedParts = partsArray.map((part: any) => {
      // Only optimize tool-result parts
      if (part.type !== 'tool-result') {
        return part;
      }

      // Check if output is a ToolExecutionResult (has success, data, userFeedback structure)
      const output = part.output;
      if (
        output &&
        typeof output === 'object' &&
        'success' in output &&
        'data' in output &&
        'userFeedback' in output
      ) {
        // Return only the data field for LLM
        return {
          ...part,
          output: output.data,
        };
      }

      // Return as-is if not a ToolExecutionResult
      return part;
    });

    // Return message with optimized parts
    if (msg.parts) {
      return {
        ...msg,
        parts: optimizedParts,
      };
    } else {
      return {
        ...msg,
        content: optimizedParts,
      };
    }
  });
}

// Check if debug mode is enabled (shows full tool details to client)
const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

/**
 * Sanitize messages for client by removing sensitive data from tool results
 * SECURITY: Only exposes userFeedback to prevent source code leakage via DevTools
 * DEBUG: When DEBUG_MODE=true, includes full tool details for debugging
 *
 * Production mode:
 * - Strips data, technicalDetails, changedFiles from tool results
 * - Only keeps: success, userFeedback, error, previewRefreshNeeded
 * - Prevents sensitive information exposure in browser
 *
 * Debug mode (DEBUG_MODE=true):
 * - Includes all fields: data, technicalDetails, changedFiles
 * - Useful for troubleshooting tool execution issues
 * - Should ONLY be enabled in development/staging environments
 */
export function sanitizeMessagesForClient(messages: any[]): any[] {
  return messages.map(msg => {
    // Skip if no parts array (shouldn't happen with AI SDK messages)
    if (!Array.isArray(msg.parts) && !Array.isArray(msg.content)) {
      return msg;
    }

    // Work with either parts or content array (AI SDK uses both formats)
    const partsArray = msg.parts || msg.content;

    // Sanitize tool-result and tool-call parts
    const sanitizedParts = partsArray.map((part: any) => {
      // Sanitize tool-result parts - REMOVE ALL SENSITIVE DATA
      if (part.type === 'tool-result') {
        const output = part.output;

        // Handle nested structure: output.value contains the actual ToolExecutionResult
        // Format: { type: "json", value: { success, data, userFeedback, ... } }
        if (
          output &&
          typeof output === 'object' &&
          output.type === 'json' &&
          output.value &&
          typeof output.value === 'object' &&
          'userFeedback' in output.value
        ) {
          if (DEBUG_MODE) {
            // Debug mode: Include all fields
            return {
              ...part,
              output: {
                type: output.type,
                value: {
                  success: output.value.success,
                  userFeedback: output.value.userFeedback,
                  previewRefreshNeeded:
                    output.value.previewRefreshNeeded || false,
                  // Include debug information
                  data: output.value.data,
                  technicalDetails: output.value.technicalDetails,
                  changedFiles: output.value.changedFiles,
                  ...(output.value.error && { error: output.value.error }),
                },
              },
              toolName: part.toolName,
              toolCallId: part.toolCallId,
              type: part.type,
              _debug: true, // Flag to indicate debug mode
            };
          }

          // Production mode: Only user-facing info
          return {
            ...part,
            output: {
              type: output.type,
              value: {
                success: output.value.success,
                userFeedback: output.value.userFeedback,
                previewRefreshNeeded:
                  output.value.previewRefreshNeeded || false,
                ...(output.value.error && { error: output.value.error }),
              },
            },
            toolName: part.toolName,
            toolCallId: part.toolCallId,
            type: part.type,
          };
        }

        // Handle direct ToolExecutionResult (no wrapper)
        if (output && typeof output === 'object' && 'userFeedback' in output) {
          if (DEBUG_MODE) {
            // Debug mode: Include all fields
            return {
              ...part,
              output: {
                success: output.success,
                userFeedback: output.userFeedback,
                previewRefreshNeeded: output.previewRefreshNeeded || false,
                // Include debug information
                data: output.data,
                technicalDetails: output.technicalDetails,
                changedFiles: output.changedFiles,
                ...(output.error && { error: output.error }),
              },
              toolName: part.toolName,
              toolCallId: part.toolCallId,
              type: part.type,
              _debug: true, // Flag to indicate debug mode
            };
          }

          // Production mode: Only user-facing info
          return {
            ...part,
            output: {
              success: output.success,
              userFeedback: output.userFeedback,
              previewRefreshNeeded: output.previewRefreshNeeded || false,
              // Include error info if present
              ...(output.error && { error: output.error }),
            },
            // Remove any sensitive fields from the part itself
            toolName: part.toolName,
            toolCallId: part.toolCallId,
            type: part.type,
          };
        }

        // For non-ToolExecutionResult outputs, keep as-is (might be simple values)
        return part;
      }

      // Sanitize tool-call parts - keep input params but sanitize any embedded results
      if (part.type?.startsWith('tool-')) {
        const sanitizedPart: any = {
          type: part.type,
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          state: part.state,
        };

        // Keep input params (they're user-provided, so safe)
        if (part.input) {
          sanitizedPart.input = part.input;
        }

        // Sanitize output if present
        if (part.output) {
          const output = part.output;

          // Handle nested structure: output.value contains the actual ToolExecutionResult
          if (
            output &&
            typeof output === 'object' &&
            output.type === 'json' &&
            output.value &&
            typeof output.value === 'object' &&
            'userFeedback' in output.value
          ) {
            if (DEBUG_MODE) {
              // Debug mode: Include all fields
              sanitizedPart.output = {
                type: output.type,
                value: {
                  success: output.value.success,
                  userFeedback: output.value.userFeedback,
                  previewRefreshNeeded:
                    output.value.previewRefreshNeeded || false,
                  data: output.value.data,
                  technicalDetails: output.value.technicalDetails,
                  changedFiles: output.value.changedFiles,
                  ...(output.value.error && { error: output.value.error }),
                },
              };
              sanitizedPart._debug = true;
            } else {
              // Production mode: Only user-facing info
              sanitizedPart.output = {
                type: output.type,
                value: {
                  success: output.value.success,
                  userFeedback: output.value.userFeedback,
                  previewRefreshNeeded:
                    output.value.previewRefreshNeeded || false,
                  ...(output.value.error && { error: output.value.error }),
                },
              };
            }
          } else if (
            output &&
            typeof output === 'object' &&
            'userFeedback' in output
          ) {
            // Handle direct ToolExecutionResult
            if (DEBUG_MODE) {
              sanitizedPart.output = {
                success: output.success,
                userFeedback: output.userFeedback,
                previewRefreshNeeded: output.previewRefreshNeeded || false,
                data: output.data,
                technicalDetails: output.technicalDetails,
                changedFiles: output.changedFiles,
                ...(output.error && { error: output.error }),
              };
              sanitizedPart._debug = true;
            } else {
              sanitizedPart.output = {
                success: output.success,
                userFeedback: output.userFeedback,
                previewRefreshNeeded: output.previewRefreshNeeded || false,
                ...(output.error && { error: output.error }),
              };
            }
          } else {
            // Keep simple outputs
            sanitizedPart.output = output;
          }
        }

        // Keep error text if present
        if (part.errorText) {
          sanitizedPart.errorText = part.errorText;
        }

        return sanitizedPart;
      }

      // Keep all other parts as-is (text, reasoning, etc.)
      return part;
    });

    // Return message with sanitized parts
    if (msg.parts) {
      return {
        ...msg,
        parts: sanitizedParts,
      };
    } else {
      return {
        ...msg,
        content: sanitizedParts,
      };
    }
  });
}
