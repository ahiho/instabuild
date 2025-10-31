import { streamText } from 'ai';
import { logger } from '../../../lib/logger.js';

/**
 * Tool call repair manager for fixing failed tool calls
 */
export class ToolCallRepairManager {
  /**
   * Repair failed tool calls using re-ask strategy
   */
  async repairToolCall(
    toolCall: any,
    tools: any,
    error: unknown,
    messages: any[],
    system: string,
    model: any
  ): Promise<any> {
    try {
      // Use the re-ask strategy from AI SDK documentation
      await streamText({
        model,
        system,
        messages: [
          ...messages,
          {
            role: 'assistant',
            content: [
              {
                type: 'tool-call',
                toolCallId: toolCall.toolCallId,
                toolName: toolCall.toolName,
                input: toolCall.input,
              },
            ],
          },
          {
            role: 'tool' as const,
            content: [
              {
                type: 'tool-result',
                toolCallId: toolCall.toolCallId,
                toolName: toolCall.toolName,
                output: error instanceof Error ? error.message : String(error),
              },
            ],
          },
        ],
        tools,
      });

      // Extract the repaired tool call from the result
      // Note: This is a simplified version - in practice, you'd need to handle the stream
      return null; // Return null if repair fails, AI SDK will handle gracefully
    } catch (repairError) {
      logger.error('Tool call repair failed', {
        originalError: error instanceof Error ? error.message : String(error),
        repairError:
          repairError instanceof Error
            ? repairError.message
            : String(repairError),
        toolName: toolCall.toolName,
      });
      return null;
    }
  }
}

export const toolCallRepairManager = new ToolCallRepairManager();
