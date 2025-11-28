import { FastifyInstance } from 'fastify';
import { consumeStream } from 'ai';
import { logger } from '../lib/logger.js';
import { prisma } from '../server.js';
import { agenticAIService } from '../services/agentic/index.js';
import { chatPersistenceService } from '../services/chatPersistence.js';
import { sanitizeMessagesForClient } from '../lib/message-conversion.js';

export async function chatRoutes(fastify: FastifyInstance) {
  /**
   * AI SDK compatible chat endpoint with agentic multi-step execution
   * @route POST /api/v1/chat
   */
  fastify.post(
    '/chat',
    {
      preHandler: [
        fastify.middleware.auth.requireAuth(),
        fastify.middleware.projectContext.requireProjectContext,
      ],
    },
    async (request, reply) => {
      const user = (request as any).user;
      const { messages, conversationId, maxSteps } = request.body as any;

      if (!conversationId) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'conversationId is required',
        });
      }

      // Validate conversation exists and include project with sandbox fields
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          project: {
            select: {
              sandboxId: true,
              sandboxStatus: true,
              sandboxPort: true,
              sandboxPublicUrl: true,
            },
          },
        },
      });

      if (!conversation) {
        return reply.code(404).send({ error: 'Conversation not found' });
      }

      // Ensure conversation has a landingPage for GitHub code backup
      if (!conversation.landingPageId) {
        logger.warn('Conversation missing landingPageId, creating one now', {
          conversationId: conversation.id,
        });

        // Create landing page for existing conversation
        const landingPage = await prisma.landingPage.create({
          data: {
            projectId: conversation.projectId,
            userId: conversation.userId,
            title: conversation.title || 'Landing Page',
            description: 'Auto-created for code backup',
          },
        });

        // Update conversation with landingPageId
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { landingPageId: landingPage.id },
        });

        // Update the conversation object for later use
        conversation.landingPageId = landingPage.id;

        logger.info('Created landing page for existing conversation', {
          conversationId: conversation.id,
          landingPageId: landingPage.id,
        });
      }

      // Validate messages array is not empty (AI SDK requirement)
      if (!messages || messages.length === 0) {
        return reply
          .code(400)
          .send({ error: 'Messages array cannot be empty' });
      }

      // Validate sandbox is ready before executing agent tools
      if (conversation.project.sandboxStatus !== 'READY') {
        logger.warn('Chat request received but sandbox not ready', {
          conversationId: conversation.id,
          sandboxStatus: conversation.project.sandboxStatus,
        });

        return reply.code(503).send({
          error: 'Sandbox not ready',
          message:
            conversation.project.sandboxStatus === 'PENDING'
              ? 'Sandbox is being provisioned. Please wait a moment and try again.'
              : 'Sandbox environment is not available. Please refresh the page.',
        });
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

      // Log detailed message structure for debugging tool call issues
      logger.info('Processing agentic chat request', {
        conversationId: conversation.id,
        messageCount: messages.length,
        projectId: conversation.projectId,
        maxSteps: maxSteps || 10,
        userMessageContent: messageContent.substring(0, 100),
        userMessageLength: messageContent.length,
        messageRoles: messages.map((m: any) => m.role),
        messageStructure: messages.map((m: any, idx: number) => ({
          index: idx,
          role: m.role,
          partsCount: m.parts?.length || 0,
          partTypes: m.parts?.map((p: any) => p.type) || [],
          toolCallIds:
            m.parts
              ?.filter((p: any) => p.type === 'tool-call')
              .map((p: any) => p.toolCallId) || [],
          toolResultIds:
            m.parts
              ?.filter((p: any) => p.type === 'tool-result')
              .map((p: any) => p.toolCallId) || [],
        })),
      });

      // Update lastAccessedAt to prevent container cleanup during processing
      await chatPersistenceService.updateConversationAccess(
        conversation.id,
        user.id
      );

      // Save user message to database immediately
      let updatedConversationTitle: string | null = null;

      if (latestUserMessage && messageContent.trim()) {
        try {
          await prisma.chatMessage.create({
            data: {
              conversationId: conversation.id,
              userId: user.id,
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

          // Generate conversation title from first message using AI (non-blocking)
          // Fire and forget - don't wait for this to complete
          chatPersistenceService
            .generateConversationTitle(conversation.id, user.id)
            .then(updatedConv => {
              updatedConversationTitle = updatedConv.title;
              logger.info('Conversation title generated', {
                conversationId: conversation.id,
                newTitle: updatedConv.title,
              });
            })
            .catch(error => {
              logger.warn('Failed to generate conversation title', {
                conversationId: conversation.id,
                error: error instanceof Error ? error.message : String(error),
              });
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
        userId: user.id,
        landingPageId: conversation.landingPageId || undefined, // For GitHub code backup
        // sandboxId should be the conversation ID, not the Docker container ID
        // The sandboxService will look up the container ID using the conversation ID
        sandboxId: conversation.id,
        maxSteps: maxSteps || 80, // High limit to allow thinking + validation iterations (read → think → write → think → validate → think → fix → think × N)
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

          // Update lastAccessedAt to prevent container cleanup during tool execution
          await chatPersistenceService.updateConversationAccess(
            conversation.id,
            user.id
          );
        },
        onReasoningUpdate: async reasoning => {
          // Log reasoning updates for transparency
          logger.info('Reasoning update', {
            conversationId: conversation.id,
            reasoningLength: reasoning.length,
          });
          // In a real implementation, this could be sent via WebSocket to the frontend
        },
        onAbort: async ({ steps, response }) => {
          // Handle stream abort (user clicked stop)
          // Save partial response before abort finishes
          logger.info('Chat stream aborted by user', {
            conversationId: conversation.id,
            stepsCompleted: steps?.length || 0,
          });

          // Persist partial messages from the aborted stream
          if (response?.messages && response.messages.length > 0) {
            try {
              for (const message of response.messages) {
                if (['assistant', 'user', 'system', 'tool'].includes(message.role)) {
                  let parts: any = [];

                  if (Array.isArray(message.content)) {
                    parts = [...message.content];
                  } else if (typeof message.content === 'string') {
                    parts = [{ type: 'text', text: message.content }];
                  }

                  await prisma.chatMessage.create({
                    data: {
                      conversationId: conversation.id,
                      userId: user.id,
                      role: message.role as 'user' | 'assistant' | 'system' | 'tool',
                      parts,
                      metadata: {
                        finishReason: 'abort',
                        stepsCompleted: steps?.length || 0,
                        abortedByUser: true,
                      },
                    },
                  });
                }
              }

              logger.info('Saved partial messages from aborted stream', {
                conversationId: conversation.id,
                messageCount: response.messages.length,
              });
            } catch (persistError) {
              logger.error('Failed to persist partial messages on abort', {
                conversationId: conversation.id,
                error: persistError instanceof Error ? persistError.message : String(persistError),
              });
            }
          }
        },
      });

      // Return the streaming response
      // Message persistence is now handled in agenticAIService.onFinish callback
      // SECURITY: Sanitize message history to remove sensitive data (source code, technical details)
      // Only userFeedback is exposed to prevent data leakage via Chrome DevTools
      const sanitizedMessages = sanitizeMessagesForClient(messages);

      return result.toUIMessageStreamResponse({
        originalMessages: sanitizedMessages,
        onError: error => {
          // Use the agentic service's user-friendly error messages
          return agenticAIService.createUserFriendlyErrorMessage(error);
        },
        messageMetadata: ({ part }) => {
          // Include usage metadata when generation finishes
          if (part.type === 'finish') {
            const metadata: any = {
              totalUsage: part.totalUsage,
              conversationId: conversation.id,
              taskComplexity: 'moderate', // This would be determined by the service
              timestamp: new Date().toISOString(),
            };

            // Include updated conversation title if it was generated
            if (updatedConversationTitle) {
              metadata.updatedConversationTitle = updatedConversationTitle;
            }

            return metadata;
          }
        },
        // CRITICAL: Use consumeStream to ensure onFinish is called even when client aborts
        // This prevents message loss when user clicks stop button
        consumeSseStream: consumeStream,
      });
    }
  );
}
