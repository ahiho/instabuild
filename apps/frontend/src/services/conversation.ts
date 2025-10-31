/**
 * Conversation service for managing chat conversations
 */

import type { UIMessage } from 'ai';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export interface Conversation {
  id: string;
  userId?: string;
  landingPageId?: string;
  startTime: string;
  lastUpdateTime: string;
}

/**
 * Get or create a conversation for a landing page
 */
export async function getOrCreateConversation(pageId: string): Promise<string> {
  try {
    console.log(
      '[Conversation Service] Creating conversation for pageId:',
      pageId
    );
    console.log('[Conversation Service] API_BASE_URL:', API_BASE_URL);

    const response = await fetch(`${API_BASE_URL}/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        landingPageId: pageId,
      }),
    });

    if (!response.ok) {
      console.error(
        '[Conversation Service] Failed to create conversation. Status:',
        response.status
      );
      const errorText = await response.text();
      console.error('[Conversation Service] Error response:', errorText);
      throw new Error('Failed to create conversation');
    }

    const conversation: Conversation = await response.json();
    console.log(
      '[Conversation Service] Created/retrieved conversation:',
      conversation
    );
    console.log(
      '[Conversation Service] Returning conversationId:',
      conversation.id
    );
    return conversation.id;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
}

/**
 * Convert database message format to UIMessage format
 * Uses parts array as single source of truth
 * Note: Backend now merges tool-result messages into assistant messages,
 * so we don't need to handle role='tool' anymore
 */
interface DatabaseMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: any[];
  createdAt: string;
}

function convertToUIMessages(dbMessages: DatabaseMessage[]): UIMessage[] {
  // Backend already merged tool-results into assistant messages,
  // so just convert each message as-is
  return dbMessages.map(msg => ({
    id: msg.id,
    role: msg.role,
    parts: msg.parts || [],
  }));
}

/**
 * Fetch chat messages for a conversation
 */
export async function getConversationMessages(
  conversationId: string
): Promise<UIMessage[]> {
  try {
    console.log(
      '[Conversation Service] Fetching messages for conversationId:',
      conversationId
    );

    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}/messages`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      // If endpoint doesn't exist yet, return empty array (graceful fallback)
      if (response.status === 404) {
        console.log(
          '[Conversation Service] Messages endpoint not found, starting fresh'
        );
        return [];
      }
      throw new Error(`Failed to fetch messages: ${response.status}`);
    }

    const dbMessages: DatabaseMessage[] = await response.json();
    const uiMessages = convertToUIMessages(dbMessages);
    console.log(
      '[Conversation Service] Fetched and converted messages:',
      uiMessages.length
    );
    return uiMessages;
  } catch (error) {
    console.error('[Conversation Service] Error fetching messages:', error);
    // Return empty array on error - don't block chat
    return [];
  }
}
