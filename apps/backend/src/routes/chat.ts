import { FastifyInstance } from 'fastify';
import { logger } from '../lib/logger.js';
import { generateSandboxPreviewUrl } from '../lib/preview-url.js';
import { prisma } from '../server.js';
import { agenticAIService } from '../services/agentic/index.js';
import { sandboxManager } from '../services/sandboxManager.js';

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
          lastAccessedAt: new Date(), // Phase 2: Initialize for cleanup tracking
          sandboxStatus: 'PENDING', // Phase 2: Sandbox provisioning
        },
      });

      // Phase 2: Provision sandbox for this conversation
      try {
        const sandboxRequest = {
          userId: conversation.userId || 'system',
          projectId: conversation.id,
        };

        const sandboxResponse =
          await sandboxManager.createSandbox(sandboxRequest);

        if (sandboxResponse && sandboxResponse.status === 'READY') {
          // Phase 3.5: Store allocated port for reverse proxy routing
          const sandboxPort = sandboxResponse.port;

          // Generate preview URL using actual allocated port
          const previewUrl = sandboxPort
            ? `http://localhost:${sandboxPort}`
            : generateSandboxPreviewUrl(conversation.id);

          // Update conversation with sandbox info + port
          conversation = await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              sandboxId: sandboxResponse.containerId,
              sandboxPort, // Phase 3.5: Store for reverse proxy
              sandboxStatus: 'READY',
              sandboxCreatedAt: new Date(),
              sandboxPublicUrl: previewUrl,
            },
          });

          logger.info('Sandbox provisioned successfully', {
            conversationId: conversation.id,
            sandboxId: sandboxResponse.containerId,
            previewUrl,
          });
        } else {
          logger.warn('Sandbox provisioning returned non-ready status', {
            conversationId: conversation.id,
            status: sandboxResponse?.status,
            error: sandboxResponse?.error,
          });

          // Update conversation to mark sandbox as failed
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              sandboxStatus: 'FAILED',
            },
          });

          return reply.code(500).send({
            error: 'Failed to provision sandbox environment',
            details: sandboxResponse?.error,
          });
        }
      } catch (error) {
        logger.error('Error provisioning sandbox', {
          conversationId: conversation.id,
          error: error instanceof Error ? error.message : String(error),
        });

        // Update conversation to mark sandbox as failed
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            sandboxStatus: 'FAILED',
          },
        });

        return reply.code(500).send({
          error: 'Failed to create execution environment',
        });
      }
    }

    // Validate messages array is not empty (AI SDK requirement)
    if (!messages || messages.length === 0) {
      return reply.code(400).send({ error: 'Messages array cannot be empty' });
    }

    // Phase 3.5: Validate sandbox is ready before executing agent tools
    // If sandbox failed or is in an unknown state, attempt to recover it
    if (conversation.sandboxStatus !== 'READY') {
      logger.warn('Chat request received but sandbox not ready', {
        conversationId: conversation.id,
        sandboxStatus: conversation.sandboxStatus,
        isNull: conversation.sandboxStatus === null,
      });

      // If sandbox is in a failed state, null, or unknown, attempt to initialize/reinitialize it
      if (
        conversation.sandboxStatus === 'FAILED' ||
        conversation.sandboxStatus === null ||
        conversation.sandboxStatus === undefined
      ) {
        logger.info('Attempting to recover failed sandbox', {
          conversationId: conversation.id,
          currentStatus: conversation.sandboxStatus,
        });

        try {
          const sandboxRequest = {
            userId: conversation.userId || 'system',
            projectId: conversation.id,
          };

          const sandboxResponse =
            await sandboxManager.createSandbox(sandboxRequest);

          if (sandboxResponse && sandboxResponse.status === 'READY') {
            const sandboxPort = sandboxResponse.port;
            const previewUrl = sandboxPort
              ? `http://localhost:${sandboxPort}`
              : generateSandboxPreviewUrl(conversation.id);

            // Update conversation with recovered sandbox info
            conversation = await prisma.conversation.update({
              where: { id: conversation.id },
              data: {
                sandboxId: sandboxResponse.containerId,
                sandboxPort,
                sandboxStatus: 'READY',
                sandboxCreatedAt: new Date(),
                sandboxPublicUrl: previewUrl,
              },
            });

            logger.info('Sandbox successfully recovered', {
              conversationId: conversation.id,
              sandboxId: sandboxResponse.containerId,
            });

            // Continue with chat execution
          } else {
            logger.warn('Sandbox recovery failed - non-ready status', {
              conversationId: conversation.id,
              status: sandboxResponse?.status,
              error: sandboxResponse?.error,
            });

            return reply.code(503).send({
              error: 'Sandbox not ready',
              message:
                'Sandbox initialization is in progress. Please wait a moment and try again.',
            });
          }
        } catch (error) {
          logger.error('Error attempting to recover sandbox', {
            conversationId: conversation.id,
            error: error instanceof Error ? error.message : String(error),
          });

          return reply.code(503).send({
            error: 'Sandbox not ready',
            message:
              'Unable to initialize sandbox environment. Please refresh the page and try again.',
          });
        }
      } else if (conversation.sandboxStatus === 'PENDING') {
        // Sandbox is still provisioning
        return reply.code(503).send({
          error: 'Sandbox not ready',
          message:
            'Sandbox is provisioning. Please wait a moment and try again.',
        });
      } else {
        // Unknown state
        return reply.code(503).send({
          error: 'Sandbox not ready',
          message: 'Sandbox status is unknown. Please refresh the page.',
        });
      }
    }

    // Log all messages for debugging
    // Get the latest user message for context (AI SDK v5.0 uses parts array)
    const latestUserMessage = messages
      .filter((m: any) => m.role === 'user')
      .slice(-1)[0];

    logger.debug('Latest user message found', {
      conversationId: conversation.id,
      found: !!latestUserMessage,
      partsCount: latestUserMessage?.parts?.length,
    });

    // Extract text content from the message parts array (AI SDK v5.0 format)
    let messageContent = '';
    if (latestUserMessage?.parts && Array.isArray(latestUserMessage.parts)) {
      const textParts = latestUserMessage.parts
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text);
      messageContent = textParts.join(' ');
      logger.debug('Message content extracted from parts', {
        conversationId: conversation.id,
        partsCount: latestUserMessage.parts.length,
        textPartsCount: textParts.length,
        contentLength: messageContent.length,
      });
    }

    logger.info('Processing agentic chat request', {
      conversationId: conversation.id,
      messageCount: messages.length,
      landingPageId: conversation.landingPageId,
      maxSteps: maxSteps || 10,
      userMessageContent: messageContent.substring(0, 100),
      userMessageLength: messageContent.length,
    });

    // Save user message to database immediately
    if (latestUserMessage && messageContent.trim()) {
      try {
        await prisma.chatMessage.create({
          data: {
            conversationId: conversation.id,
            landingPageId: conversation.landingPageId,
            role: 'user',
            parts: [
              {
                type: 'text',
                text: messageContent,
              },
            ],
            metadata: {
              messageId: latestUserMessage.id,
            },
          },
        });

        logger.info('User message persisted to database', {
          conversationId: conversation.id,
          messageLength: messageContent.length,
        });
      } catch (error) {
        logger.error('Failed to persist user message', {
          conversationId: conversation.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Use agentic AI service for multi-step execution
    const result = await agenticAIService.processAgenticChat({
      messages,
      conversationId: conversation.id,
      userId: 'system', // TODO: Get from authentication context
      landingPageId: conversation.landingPageId || undefined,
      sandboxId: conversation.sandboxId || undefined, // Phase 2: Pass sandbox context
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

    // Return the streaming response
    // Message persistence is now handled in agenticAIService.onFinish callback
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
