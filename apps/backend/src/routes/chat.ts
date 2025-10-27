import type { ModelSelectionContext } from '@instabuild/shared/types';
import { convertToCoreMessages, streamText } from 'ai';
import { FastifyInstance } from 'fastify';
import { logger } from '../lib/logger.js';
import { prisma } from '../server.js';
import { modelSelector } from '../services/model-selector.js';
import { toolRegistry } from '../services/toolRegistry.js';

export async function chatRoutes(fastify: FastifyInstance) {
  /**
   * AI SDK compatible chat endpoint
   * @route POST /api/v1/chat
   */
  fastify.post('/api/v1/chat', async (request, reply) => {
    const { messages, conversationId } = request.body as any;

    // Validate conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return reply.code(404).send({ error: 'Conversation not found' });
    }

    // Validate messages array is not empty (AI SDK requirement)
    if (!messages || messages.length === 0) {
      return reply.code(400).send({ error: 'Messages array cannot be empty' });
    }

    // Get the latest user message for context
    const latestUserMessage = messages
      .filter((m: any) => m.role === 'user')
      .slice(-1)[0];

    // Extract text content from the message
    const messageContent = latestUserMessage?.content || '';

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
          metadata: {
            messageId: latestUserMessage.id,
          },
        },
      });
    }

    // Get available tools from registry
    const availableTools = toolRegistry.getTools();

    // Debug: Log messages before conversion
    logger.info('Messages before conversion', {
      messages,
      messageCount: messages?.length,
    });

    // Convert UI messages to core messages format
    const coreMessages = convertToCoreMessages(messages);

    const result = streamText({
      model,
      messages: coreMessages,
      tools: availableTools,
      system: `You are an AI assistant that helps users edit landing pages through natural language commands.

You have access to these tools:
- update_content: Change text content of elements
- update_style: Modify CSS styles and visual appearance
- add_element: Add new elements like buttons, headings, sections
- text_transform: Transform text (uppercase, lowercase, titlecase)
- word_count: Analyze text statistics

When users ask to modify their landing page:
1. Use the appropriate tools to make the actual changes
2. Be specific about element IDs when possible
3. Provide user-friendly feedback about what was changed
4. Maintain responsive design principles

Model Selection: ${selection.reasoning}

Always use tools to make actual changes rather than just describing what you would do.`,
      async onFinish({ text }) {
        // Save assistant message to database
        await prisma.chatMessage.create({
          data: {
            conversationId,
            landingPageId: conversation.landingPageId,
            senderType: 'AI',
            role: 'assistant',
            content: text || '',
            metadata: {
              modelSelection: selection.selectedModel,
            },
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

    return result.toUIMessageStreamResponse();
  });
}
