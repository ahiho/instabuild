import { FastifyInstance } from 'fastify';
import { chatPersistenceService } from '../services/chatPersistence.js';
import { logger } from '../lib/logger.js';

/**
 * Conversation routes for managing chat conversations
 */
export async function conversationRoutes(fastify: FastifyInstance) {
  /**
   * Create or get a conversation for a landing page
   */
  fastify.post<{
    Body: {
      landingPageId?: string;
      userId?: string;
    };
  }>('/api/v1/conversations', async (request, reply) => {
    const { landingPageId, userId } = request.body;

    try {
      let conversation;

      if (landingPageId) {
        // Get or create conversation for this page
        conversation = await chatPersistenceService.getOrCreatePageConversation(
          landingPageId,
          userId
        );
      } else {
        // Create a standalone conversation
        conversation = await chatPersistenceService.createConversation(userId);
      }

      logger.info('Conversation created/retrieved', {
        conversationId: conversation.id,
        landingPageId,
        userId,
      });

      return conversation;
    } catch (error) {
      logger.error('Error creating conversation', { error });
      reply.status(500).send({
        error: 'Failed to create conversation',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Get conversation by ID
   */
  fastify.get<{
    Params: { conversationId: string };
  }>('/api/v1/conversations/:conversationId', async (request, reply) => {
    const { conversationId } = request.params;

    try {
      const conversation =
        await chatPersistenceService.getConversation(conversationId);

      if (!conversation) {
        reply.status(404).send({ error: 'Conversation not found' });
        return;
      }

      return conversation;
    } catch (error) {
      logger.error('Error fetching conversation', { error, conversationId });
      reply.status(500).send({
        error: 'Failed to fetch conversation',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Get conversation history
   */
  fastify.get<{
    Params: { conversationId: string };
    Querystring: { limit?: string };
  }>(
    '/api/v1/conversations/:conversationId/messages',
    async (request, reply) => {
      const { conversationId } = request.params;
      const limit = request.query.limit
        ? parseInt(request.query.limit, 10)
        : undefined;

      try {
        const messages = await chatPersistenceService.getConversationHistory(
          conversationId,
          limit
        );

        return messages;
      } catch (error) {
        logger.error('Error fetching conversation history', {
          error,
          conversationId,
        });
        reply.status(500).send({
          error: 'Failed to fetch conversation history',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );
}
