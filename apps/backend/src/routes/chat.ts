import { FastifyInstance } from 'fastify';
import { logger } from '../lib/logger.js';
import { prisma } from '../server.js';
import { agenticAIService } from '../services/agenticAIService.js';

export async function chatRoutes(fastify: FastifyInstance) {
  /**
   * AI SDK compatible chat endpoint with agentic multi-step execution
   * @route POST /api/v1/chat
   */
  fastify.post('/api/v1/chat', async (request, reply) => {
    const { messages, conversationId, maxSteps } = request.body as any;

    let conversation;

    if (conversationId) {
      // Validate conversation exists if ID is provided
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) {
        return reply.code(404).send({ error: 'Conversation not found' });
      }
    } else {
      // Create a new conversation if none provided
      conversation = await prisma.conversation.create({
        data: {
          userId: 'system', // TODO: Get from authentication context
          landingPageId: null, // Will be set when a landing page is created
          startTime: new Date(),
          lastUpdateTime: new Date(),
        },
      });
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

    logger.info('Processing agentic chat request', {
      conversationId: conversation.id,
      messageCount: messages.length,
      landingPageId: conversation.landingPageId,
      maxSteps: maxSteps || 10,
    });

    // Save user message to database
    if (latestUserMessage && messageContent) {
      await prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
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

    // Use agentic AI service for multi-step execution
    const result = await agenticAIService.processAgenticChat({
      messages,
      conversationId: conversation.id,
      userId: 'system', // TODO: Get from authentication context
      landingPageId: conversation.landingPageId,
      maxSteps: maxSteps || 10,
      onStepFinish: async stepResult => {
        // Log step completion for monitoring
        logger.info('Agentic step completed', {
          conversationId: conversation.id,
          stepType: stepResult.stepType,
          finishReason: stepResult.finishReason,
          toolCallsCount: stepResult.toolCalls?.length || 0,
        });
      },
      onToolCall: async toolCall => {
        // Log individual tool calls
        logger.info('Tool executed in agentic flow', {
          conversationId: conversation.id,
          toolName: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
        });
      },
      onReasoningUpdate: async reasoning => {
        // Log reasoning updates for transparency
        logger.info('Reasoning update', {
          conversationId: conversation.id,
          reasoningLength: reasoning.length,
        });
        // In a real implementation, this could be sent via WebSocket to the frontend
      },
    });

    // Set up onFinish callback to save assistant message
    const originalOnFinish = result.onFinish;
    result.onFinish = async finalResult => {
      // Call original onFinish if it exists
      if (originalOnFinish) {
        await originalOnFinish(finalResult);
      }

      // Save assistant message to database
      await prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          landingPageId: conversation.landingPageId,
          senderType: 'AI',
          role: 'assistant',
          content: finalResult.text || '',
          metadata: {
            totalSteps: finalResult.steps?.length || 0,
            finishReason: finalResult.finishReason,
            totalUsage: finalResult.usage,
            toolCallsCount:
              finalResult.steps?.flatMap(s => s.toolCalls || []).length || 0,
          },
        },
      });

      // Update conversation timestamp
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastUpdateTime: new Date() },
      });

      logger.info('Agentic chat response completed', {
        conversationId: conversation.id,
        responseLength: finalResult.text?.length || 0,
        totalSteps: finalResult.steps?.length || 0,
      });
    };

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      onError: error => {
        // Use the agentic service's user-friendly error messages
        return agenticAIService.createUserFriendlyErrorMessage(error);
      },
      messageMetadata: ({ part }) => {
        // Include usage metadata when generation finishes
        if (part.type === 'finish') {
          return {
            totalUsage: part.totalUsage,
            conversationId: conversation.id,
            taskComplexity: 'moderate', // This would be determined by the service
            timestamp: new Date().toISOString(),
          };
        }
      },
    });
  });
}
