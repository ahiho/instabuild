import { prisma } from '../server.js';

/**
 * Service for persisting chat messages and conversations
 */
export class ChatPersistenceService {
  /**
   * Create a new conversation
   * @param userId - Optional user ID for future authentication
   * @param landingPageId - Optional landing page ID if chat is related to a page
   * @returns The created conversation
   */
  async createConversation(userId?: string, landingPageId?: string) {
    return prisma.conversation.create({
      data: {
        userId,
        landingPageId,
      },
    });
  }

  /**
   * Get a conversation by ID
   * @param conversationId - The conversation ID
   * @returns The conversation with messages
   */
  async getConversation(conversationId: string) {
    return prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * Save a user message to a conversation
   * @param conversationId - The conversation ID
   * @param content - The message content
   * @param landingPageId - Optional landing page ID
   * @returns The created message
   */
  async saveUserMessage(
    conversationId: string,
    content: string,
    landingPageId?: string
  ) {
    return prisma.chatMessage.create({
      data: {
        conversationId,
        landingPageId,
        senderType: 'User',
        role: 'user', // For backward compatibility
        content,
      },
    });
  }

  /**
   * Save an AI response message to a conversation
   * @param conversationId - The conversation ID
   * @param content - The message content
   * @param landingPageId - Optional landing page ID
   * @param metadata - Optional metadata
   * @returns The created message
   */
  async saveAIMessage(
    conversationId: string,
    content: string,
    landingPageId?: string,
    metadata?: any
  ) {
    return prisma.chatMessage.create({
      data: {
        conversationId,
        landingPageId,
        senderType: 'AI',
        role: 'assistant', // For backward compatibility
        content,
        metadata,
      },
    });
  }

  /**
   * Get conversation history with optional limit
   * @param conversationId - The conversation ID
   * @param limit - Optional limit on number of messages to retrieve
   * @returns Array of messages
   */
  async getConversationHistory(conversationId: string, limit?: number) {
    return prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  /**
   * Update conversation's last update time
   * @param conversationId - The conversation ID
   */
  async updateConversationTimestamp(conversationId: string) {
    return prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastUpdateTime: new Date(),
      },
    });
  }

  /**
   * Check if a conversation exists
   * @param conversationId - The conversation ID
   * @returns True if conversation exists
   */
  async conversationExists(conversationId: string): Promise<boolean> {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    return conversation !== null;
  }

  /**
   * Get or create a conversation for a landing page
   * @param landingPageId - The landing page ID
   * @param userId - Optional user ID
   * @returns The conversation
   */
  async getOrCreatePageConversation(landingPageId: string, userId?: string) {
    // Try to find existing conversation for this page
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        landingPageId,
        userId: userId || null,
      },
      orderBy: {
        lastUpdateTime: 'desc',
      },
    });

    if (existingConversation) {
      return existingConversation;
    }

    // Create new conversation if none exists
    return this.createConversation(userId, landingPageId);
  }
}

// Export singleton instance
export const chatPersistenceService = new ChatPersistenceService();
