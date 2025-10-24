import { FastifyInstance } from 'fastify';
import { ChatService } from '../services/chat.js';

export async function chatRoutes(fastify: FastifyInstance) {
  const chatService = new ChatService();

  // Send chat message for page editing (AI SDK format)
  fastify.post<{
    Params: { pageId: string };
    Body: {
      messages: Array<{ role: string; content: string }>;
      data?: { selectedElementId?: string };
    };
  }>('/api/v1/pages/:pageId/chat', async (request, reply) => {
    const { pageId } = request.params;
    const { messages, data } = request.body;

    // Get the latest user message
    const latestMessage = messages[messages.length - 1];
    const content = latestMessage?.content || '';
    const selectedElementId = data?.selectedElementId;

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
