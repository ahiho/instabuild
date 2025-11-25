/**
 * Stream Sanitizer - Removes sensitive data from AI SDK stream responses
 * SECURITY: Prevents source code and file contents from being exposed to client
 * DEBUG: When DEBUG_MODE=true, includes full tool details for debugging
 */

// Check if debug mode is enabled (shows full tool details to client)
const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

/**
 * Sanitize a single tool result part for client consumption
 * In production: Only exposes userFeedback, success status, and error info
 * In debug mode: Includes full tool call details (input, output, technicalDetails)
 */
function sanitizeToolResultPart(part: any): any {
  // Only sanitize tool-result and tool-* parts
  if (part.type === 'tool-result') {
    const output = part.output;

    // If output is a ToolExecutionResult, strip sensitive data (or include all in debug)
    if (output && typeof output === 'object' && 'userFeedback' in output) {
      if (DEBUG_MODE) {
        // Debug mode: Include everything for troubleshooting
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

      // Production mode: Only safe user-facing info
      return {
        ...part,
        output: {
          success: output.success,
          userFeedback: output.userFeedback,
          previewRefreshNeeded: output.previewRefreshNeeded || false,
          ...(output.error && { error: output.error }),
        },
        // Keep only necessary fields
        toolName: part.toolName,
        toolCallId: part.toolCallId,
        type: part.type,
      };
    }

    return part;
  }

  // Sanitize tool-call parts (tool-* types)
  if (part.type?.startsWith('tool-')) {
    const sanitizedPart: any = {
      type: part.type,
      toolCallId: part.toolCallId,
      toolName: part.toolName,
      state: part.state,
    };

    // Keep input params (user-provided, safe to show)
    if (part.input) {
      sanitizedPart.input = part.input;
    }

    // Sanitize output if present
    if (part.output) {
      const output = part.output;
      if (output && typeof output === 'object' && 'userFeedback' in output) {
        if (DEBUG_MODE) {
          // Debug mode: Include full output
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
          // Production mode: Only user-facing info
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
}

/**
 * Sanitize a stream data chunk from AI SDK
 * This intercepts SSE (Server-Sent Events) data and removes sensitive information
 */
export function sanitizeStreamChunk(data: any): any {
  // Handle different chunk types from AI SDK
  if (!data || typeof data !== 'object') {
    return data;
  }

  // If it's a message part (has parts array)
  if (data.parts && Array.isArray(data.parts)) {
    return {
      ...data,
      parts: data.parts.map(sanitizeToolResultPart),
    };
  }

  // If it's a single part (from streaming)
  if (data.type) {
    return sanitizeToolResultPart(data);
  }

  // Return as-is for other data types
  return data;
}

/**
 * Transform a Response stream to sanitize tool results in real-time
 * SECURITY: This ensures sensitive data never reaches the client browser
 */
export async function sanitizeStreamResponse(
  response: Response
): Promise<Response> {
  if (!response.body) {
    return response;
  }

  const originalBody = response.body;
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  // Create a TransformStream to process chunks
  const transformStream = new TransformStream({
    async transform(chunk, controller) {
      const text = decoder.decode(chunk, { stream: true });

      // SSE format: "data: {json}\n\n"
      // Split by SSE message boundaries
      const lines = text.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const dataStr = line.substring(6); // Remove "data: " prefix
            const data = JSON.parse(dataStr);

            // Sanitize the data
            const sanitized = sanitizeStreamChunk(data);

            // Re-encode as SSE
            const sanitizedLine = `data: ${JSON.stringify(sanitized)}\n`;
            controller.enqueue(encoder.encode(sanitizedLine));
          } catch (e) {
            // If parsing fails, pass through as-is (might be "[DONE]" or other control message)
            controller.enqueue(chunk);
          }
        } else {
          // Pass through non-data lines (empty lines, comments, etc.)
          controller.enqueue(encoder.encode(line + '\n'));
        }
      }
    },
  });

  // Create new response with transformed stream
  const sanitizedStream = originalBody.pipeThrough(transformStream);

  return new Response(sanitizedStream, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
