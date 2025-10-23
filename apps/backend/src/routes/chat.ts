import { FastifyInstance } from 'fastify';
import { ChatService } from '../services/chat.js';
import { ChatMessageRequest } from '@instabuild/shared';

export async function chatRoutes(fastify: FastifyInstance) {
  const chatService = new ChatService();

  // Send chat message for page editing
  fastify.post<{
    Params: { pageId: string };
    Body: ChatMessageRequest;
  }>('/api/v1/pages/:pageId/chat', async (request, reply) => {
    const { pageId } = request.params;
    const { content, selectedElementId } = request.body;

    const stream = await chatService.processChatMessage(
      pageId,
      content,
      selectedElementId
    );

    reply.header('Content-Type', 'text/event-stream');
    reply.header('Cache-Control', 'no-cache');
    reply.header('Connection', 'keep-alive');

    return stream;
  });
}
