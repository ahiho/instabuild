import { FastifyInstance } from 'fastify';
import { streamText, convertToCoreMessages } from 'ai';
import { prisma } from '../server.js';
import { modelSelector } from '../services/model-selector.js';
import type { ModelSelectionContext } from '@instabuild/shared/types';
import { logger } from '../lib/logger.js';

export async function chatRoutes(fastify: FastifyInstance) {
  /**
   * AI SDK compatible chat endpoint
   * @route POST /api/v1/chat
   */
  fastify.post<{
    Body: {
      conversationId: string;
      messages: Array<{
        id: string;
        role: 'user' | 'assistant' | 'system';
        parts: Array<{ type: 'text'; text: string }>;
      }>;
    };
  }>('/api/v1/chat', async (request, reply) => {
    const { conversationId, messages } = request.body;

    // Validate conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return reply.code(404).send({ error: 'Conversation not found' });
    }

    // Get the latest user message for context
    const latestUserMessage = messages.filter(m => m.role === 'user').slice(-1)[0];
    // Extract text from parts array (AI SDK format)
    const messageContent = latestUserMessage?.parts
      ?.filter(part => part.type === 'text')
      .map(part => part.text)
      .join('') || '';

    // Select appropriate model based on task complexity
    const context: ModelSelectionContext = {
      message: messageContent,
      previousMessages: messages.length,
      requiresToolCalling: /upload|file|image|logo|asset/i.test(messageContent),
    };

    const { model, selection } = modelSelector.getModel(context);

    logger.info('Processing chat request', {
      conversationId,
      messageCount: messages.length,
      modelSelection: selection.selectedModel,
    });

    // Save user message to database
    if (latestUserMessage && messageContent) {
      await prisma.chatMessage.create({
        data: {
          conversationId,
          landingPageId: conversation.landingPageId,
          senderType: 'User',
          role: 'user',
          content: messageContent,
        },
      });
    }

    // Stream response from AI with selected model
    const result = streamText({
      model,
      messages: convertToCoreMessages(messages),
      system: `You are an AI assistant that helps users edit landing pages through natural language commands.

When modifying elements:
- Use CSS properties for styling
- Be specific about changes
- Maintain responsive design principles

Model Selection: ${selection.reasoning}

Respond with helpful suggestions and acknowledge the changes you would make.`,
      async onFinish({ text }) {
        // Save assistant message to database
        await prisma.chatMessage.create({
          data: {
            conversationId,
            landingPageId: conversation.landingPageId,
            senderType: 'AI',
            role: 'assistant',
            content: text,
          },
        });

        // Update conversation timestamp
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { lastUpdateTime: new Date() },
        });

        logger.info('Chat response completed', {
          conversationId,
          responseLength: text.length,
        });
      },
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
    });
  });
}
