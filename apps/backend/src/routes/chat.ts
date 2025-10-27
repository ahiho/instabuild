import type {
  AISDKMessage,
  ChatRequest,
  MessagePart,
  ModelSelectionContext,
} from '@instabuild/shared/types';
import { streamText } from 'ai';
import { FastifyInstance } from 'fastify';
import { logger } from '../lib/logger.js';
import { prisma } from '../server.js';
import { modelSelector } from '../services/model-selector.js';

/**
 * Extract text content from message parts array
 */
function extractTextFromParts(parts: MessagePart[]): string {
  return parts
    .filter(part => part.type === 'text' && part.text)
    .map(part => part.text)
    .join('');
}

/**
 * Convert AI SDK messages to core messages for AI processing
 */
function convertAISDKToCoreMessages(messages: AISDKMessage[]) {
  return messages.map(message => ({
    role: message.role,
    content: extractTextFromParts(message.parts),
  }));
}

export async function chatRoutes(fastify: FastifyInstance) {
  /**
   * AI SDK compatible chat endpoint
   * @route POST /api/v1/chat
   */
  fastify.post<{
    Body: ChatRequest;
  }>('/api/v1/chat', async (request, reply) => {
    const { conversationId, messages } = request.body as ChatRequest;

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
      .filter((m: AISDKMessage) => m.role === 'user')
      .slice(-1)[0];

    // Extract text from parts array (AI SDK format)
    const messageContent = extractTextFromParts(latestUserMessage?.parts || []);

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
          parts: latestUserMessage.parts,
          metadata: {
            messageId: latestUserMessage.id,
          },
        },
      });
    }

    // Get available tools from registry (disabled for now due to schema conversion issues)
    // const availableTools = toolRegistry.getTools();

    // Stream response from AI with selected model
    const result = streamText({
      model,
      messages: convertAISDKToCoreMessages(messages),
      // tools: availableTools, // Disabled until proper schema conversion is implemented
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
            content: text || '',
            parts: [{ type: 'text', text: text || '' }],
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

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
    });
  });
}
