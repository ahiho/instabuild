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
