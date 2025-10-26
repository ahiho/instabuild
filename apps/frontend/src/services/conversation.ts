/**
 * Conversation service for managing chat conversations
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

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
    console.log('[Conversation Service] Creating conversation for pageId:', pageId);
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
      console.error('[Conversation Service] Failed to create conversation. Status:', response.status);
      const errorText = await response.text();
      console.error('[Conversation Service] Error response:', errorText);
      throw new Error('Failed to create conversation');
    }

    const conversation: Conversation = await response.json();
    console.log('[Conversation Service] Created/retrieved conversation:', conversation);
    console.log('[Conversation Service] Returning conversationId:', conversation.id);
    return conversation.id;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
}
