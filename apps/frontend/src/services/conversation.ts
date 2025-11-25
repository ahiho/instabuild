/**
 * Conversation service for managing chat conversations
 * Enhanced to support project-based architecture with multiple conversations per project
 */

import type { UIMessage } from 'ai';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export interface Conversation {
  id: string;
  userId: string;
  projectId: string;
  title: string;
  startTime: string;
  lastUpdateTime: string;
  lastAccessedAt: string;
  sandboxId?: string;
  sandboxStatus?: string;
  sandboxPort?: number;
  sandboxPublicUrl?: string;
  isArchived: boolean;
  _count?: {
    messages: number;
  };
}

export interface ConversationStats {
  total: number;
  active: number;
  archived: number;
}

/**
 * Get authentication headers
 */
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

/**
 * Create a new conversation within a project
 */
export async function createConversation(
  projectId: string,
  title?: string
): Promise<Conversation> {
  try {
    console.log(
      '[Conversation Service] Creating conversation for project:',
      projectId
    );

    if (!projectId) {
      throw new Error('Project ID is required to create conversation');
    }

    const response = await fetch(`${API_BASE_URL}/conversations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        projectId,
        title,
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
    console.log('[Conversation Service] Created conversation:', conversation);
    return conversation;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
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

    const response = await fetch(`${API_BASE_URL}/conversations`, {
      method: 'POST',
      headers: getAuthHeaders(),
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
    return conversation.id;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
}

/**
 * Get conversations for a project
 */
export async function getProjectConversations(
  projectId: string,
  includeArchived: boolean = false
): Promise<Conversation[]> {
  try {
    console.log(
      '[Conversation Service] Fetching conversations for project:',
      projectId
    );

    const url = new URL(`${API_BASE_URL}/projects/${projectId}/conversations`);
    if (includeArchived) {
      url.searchParams.set('includeArchived', 'true');
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch conversations: ${response.status}`);
    }

    const result = await response.json();
    // Handle ApiResponse format where conversations are wrapped in data.conversations
    const conversations: Conversation[] = result.data?.conversations || result;
    console.log(
      '[Conversation Service] Fetched conversations:',
      conversations.length
    );
    return conversations;
  } catch (error) {
    console.error(
      '[Conversation Service] Error fetching conversations:',
      error
    );
    return [];
  }
}

/**
 * Get a specific conversation
 */
export async function getConversation(
  conversationId: string
): Promise<Conversation | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch conversation: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[Conversation Service] Error fetching conversation:', error);
    return null;
  }
}

/**
 * Update conversation details
 */
export async function updateConversation(
  conversationId: string,
  updates: { title?: string; isArchived?: boolean }
): Promise<Conversation> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}`,
      {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update conversation: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[Conversation Service] Error updating conversation:', error);
    throw error;
  }
}

/**
 * Archive a conversation
 */
export async function archiveConversation(
  conversationId: string
): Promise<Conversation> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}/archive`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to archive conversation: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(
      '[Conversation Service] Error archiving conversation:',
      error
    );
    throw error;
  }
}

/**
 * Restore an archived conversation
 */
export async function restoreConversation(
  conversationId: string
): Promise<Conversation> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}/restore`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to restore conversation: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(
      '[Conversation Service] Error restoring conversation:',
      error
    );
    throw error;
  }
}

/**
 * Delete a conversation
 */
export async function deleteConversation(
  conversationId: string
): Promise<void> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to delete conversation: ${response.status}`);
    }
  } catch (error) {
    console.error('[Conversation Service] Error deleting conversation:', error);
    throw error;
  }
}

/**
 * Get conversation statistics for a project
 */
export async function getConversationStats(
  projectId: string
): Promise<ConversationStats> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/conversations/stats`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch conversation stats: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(
      '[Conversation Service] Error fetching conversation stats:',
      error
    );
    return { total: 0, active: 0, archived: 0 };
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
  parts: unknown[];
  createdAt: string;
}

function convertToUIMessages(dbMessages: DatabaseMessage[]): UIMessage[] {
  // Backend already merged tool-results into assistant messages,
  // so just convert each message as-is
  return dbMessages.map(msg => ({
    id: msg.id,
    role: msg.role,
    parts: (msg.parts || []) as UIMessage['parts'],
  }));
}

/**
 * Fetch chat messages for a conversation
 */
export async function getConversationMessages(
  conversationId: string,
  limit?: number
): Promise<UIMessage[]> {
  try {
    console.log(
      '[Conversation Service] Fetching messages for conversationId:',
      conversationId
    );

    const url = new URL(
      `${API_BASE_URL}/conversations/${conversationId}/messages`
    );
    if (limit) {
      url.searchParams.set('limit', limit.toString());
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: getAuthHeaders(),
    });

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

/**
 * Add a message to a conversation
 */
export async function addMessage(
  conversationId: string,
  role: string,
  parts: unknown[],
  metadata?: Record<string, unknown>
): Promise<unknown> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          role,
          parts,
          metadata,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to add message: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[Conversation Service] Error adding message:', error);
    throw error;
  }
}

/**
 * Provision sandbox for a conversation
 */
export async function provisionSandbox(conversationId: string): Promise<{
  status: string;
  sandboxId?: string;
  sandboxPublicUrl?: string;
  sandboxPort?: number;
  message?: string;
}> {
  try {
    console.log(
      '[Conversation Service] Provisioning sandbox for conversationId:',
      conversationId
    );

    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}/provision-sandbox`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({}), // Empty body but valid JSON
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        '[Conversation Service] Sandbox provisioning failed:',
        errorText
      );
      throw new Error('Failed to provision sandbox');
    }

    const result = await response.json();
    console.log('[Conversation Service] Sandbox provisioning result:', result);
    return result;
  } catch (error) {
    console.error('[Conversation Service] Error provisioning sandbox:', error);
    throw error;
  }
}

/**
 * Provision sandbox with automatic polling until READY or timeout
 * Polls every 2 seconds for up to 30 seconds
 */
export async function provisionSandboxWithRetry(
  conversationId: string,
  options: {
    maxAttempts?: number; // 15 attempts * 2 seconds = 30 seconds max wait
    pollIntervalMs?: number;
    onStatusChange?: (status: string, message?: string) => void;
  } = {}
): Promise<{
  status: string;
  sandboxId?: string;
  sandboxPublicUrl?: string;
  sandboxPort?: number;
}> {
  const { maxAttempts = 15, pollIntervalMs = 2000, onStatusChange } = options;
  console.log(
    '[Conversation Service] Starting sandbox provisioning with retry for:',
    conversationId
  );

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await provisionSandbox(conversationId);

      if (result.status === 'READY') {
        console.log(
          '[Conversation Service] Sandbox is READY after',
          attempt,
          'attempts'
        );
        onStatusChange?.('READY', 'Sandbox is ready!');
        return result;
      }

      if (result.status === 'PENDING') {
        console.log(
          '[Conversation Service] Sandbox still PENDING, attempt',
          attempt,
          'of',
          maxAttempts
        );
        onStatusChange?.(
          'PENDING',
          `Provisioning sandbox... (${attempt}/${maxAttempts})`
        );

        // Don't wait on the last attempt
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        }
        continue;
      }

      if (result.status === 'FAILED') {
        throw new Error('Sandbox provisioning failed');
      }

      // Unknown status
      throw new Error(`Unknown sandbox status: ${result.status}`);
    } catch (error) {
      console.error(
        '[Conversation Service] Error during provisioning attempt',
        attempt,
        ':',
        error
      );

      // If it's the last attempt, throw the error
      if (attempt === maxAttempts) {
        throw error;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
  }

  throw new Error('Sandbox provisioning timeout: max attempts exceeded');
}

/**
 * Get or create a conversation for a landing page (legacy support)
 */
export async function getOrCreatePageConversation(
  landingPageId: string,
  projectId: string
): Promise<Conversation> {
  try {
    console.log(
      '[Conversation Service] Creating conversation for pageId:',
      landingPageId,
      'in project:',
      projectId
    );

    const response = await fetch(`${API_BASE_URL}/conversations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        projectId,
        landingPageId,
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
    return conversation;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
}
