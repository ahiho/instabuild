/// <reference path="../types/fastify.d.ts" />
import { FastifyInstance } from 'fastify';
import { logger } from '../lib/logger.js';
import { prisma } from '../server.js';
import { chatPersistenceService } from '../services/chatPersistence.js';
import { sanitizeMessagesForClient } from '../lib/message-conversion.js';

/**
 * Conversation routes for managing chat conversations
 */

// In-memory cache for idempotency keys (prevents duplicate conversation creation)
// Maps: `${userId}:${idempotencyKey}` -> { conversationId, timestamp }
const idempotencyCache = new Map<
  string,
  { conversationId: string; timestamp: number }
>();

// Cleanup old idempotency keys every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    for (const [key, value] of idempotencyCache.entries()) {
      if (value.timestamp < fiveMinutesAgo) {
        idempotencyCache.delete(key);
      }
    }
  },
  5 * 60 * 1000
);

export async function conversationRoutes(fastify: FastifyInstance) {
  /**
   * Create a new conversation within a project
   */
  fastify.post<{
    Body: {
      projectId: string;
      landingPageId?: string;
      title?: string;
      idempotencyKey?: string;
    };
  }>(
    '/conversations',
    {
      preHandler: [fastify.middleware.auth.requireAuth()],
    },
    async (request, reply) => {
      const { user } = request;

      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { projectId, landingPageId, title, idempotencyKey } = request.body;

      if (!projectId) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'projectId is required',
        });
      }

      try {
        // Validate user has access to the project
        const project = await prisma.project.findFirst({
          where: { id: projectId, userId: user.id },
        });

        if (!project) {
          return reply.code(404).send({
            error: 'Project not found or access denied',
          });
        }

        let conversation;

        if (landingPageId) {
          // Get or create conversation for this page within the project
          conversation =
            await chatPersistenceService.getOrCreatePageConversation(
              landingPageId,
              user.id
            );
        } else {
          // For standalone conversations with idempotency key, check if we've already created this
          if (idempotencyKey) {
            const cacheKey = `${user.id}:${idempotencyKey}`;
            const cached = idempotencyCache.get(cacheKey);

            if (cached) {
              logger.info('Returning cached conversation for idempotency key', {
                conversationId: cached.conversationId,
                idempotencyKey,
                userId: user.id,
                projectId,
              });

              // Return the cached conversation with project sandbox info
              conversation = await prisma.conversation.findUnique({
                where: { id: cached.conversationId },
                include: {
                  project: {
                    select: {
                      sandboxId: true,
                      sandboxStatus: true,
                      sandboxPort: true,
                      sandboxPublicUrl: true,
                      sandboxCreatedAt: true,
                    },
                  },
                },
              });

              if (conversation) {
                return conversation;
              }
            }
          }

          // Create a standalone conversation within the project
          conversation = await chatPersistenceService.createConversation(
            user.id,
            projectId,
            title
          );

          // Cache the idempotency key for future requests
          if (idempotencyKey) {
            const cacheKey = `${user.id}:${idempotencyKey}`;
            idempotencyCache.set(cacheKey, {
              conversationId: conversation.id,
              timestamp: Date.now(),
            });
          }
        }

        // Sandbox is now managed at the project level, no need to pre-populate conversation
        logger.info('Conversation created/retrieved', {
          conversationId: conversation.id,
          landingPageId,
          userId: user.id,
          projectId,
          idempotencyKey,
        });

        // Fetch conversation with project sandbox info for frontend
        const conversationWithProject = await prisma.conversation.findUnique({
          where: { id: conversation.id },
          include: {
            project: {
              select: {
                sandboxId: true,
                sandboxStatus: true,
                sandboxPort: true,
                sandboxPublicUrl: true,
                sandboxCreatedAt: true,
              },
            },
          },
        });

        return conversationWithProject;
      } catch (error) {
        logger.error('Error creating conversation', { error });
        reply.code(500).send({
          error: 'Failed to create conversation',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Get conversation by ID with project context validation
   */
  fastify.get<{
    Params: { conversationId: string };
  }>(
    '/conversations/:conversationId',
    {
      preHandler: [
        fastify.middleware.auth.requireAuth(),
        fastify.middleware.authorization.requireConversationAccess(),
      ],
    },
    async (request, reply) => {
      const { conversationId } = request.params;
      const { user, project } = request;

      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      try {
        const conversation = await chatPersistenceService.getConversation(
          conversationId,
          user.id
        );

        if (!conversation) {
          return reply
            .code(404)
            .send({ error: 'Conversation not found or access denied' });
        }

        // Validate conversation belongs to the project context
        if (project && conversation.projectId !== project.id) {
          return reply.code(403).send({
            error:
              'Conversation does not belong to the current project context',
          });
        }

        // Update last accessed time
        await chatPersistenceService.updateConversationAccess(
          conversationId,
          user.id
        );

        // Include project sandbox fields in response
        const conversationWithProject = await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: {
            project: {
              select: {
                sandboxId: true,
                sandboxStatus: true,
                sandboxPort: true,
                sandboxPublicUrl: true,
                sandboxCreatedAt: true,
              },
            },
          },
        });

        return conversationWithProject;
      } catch (error) {
        logger.error('Error fetching conversation', { error, conversationId });
        reply.code(500).send({
          error: 'Failed to fetch conversation',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Get conversation messages with project access validation
   */
  fastify.get<{
    Params: { conversationId: string };
    Querystring: { limit?: string };
  }>(
    '/conversations/:conversationId/messages',
    {
      preHandler: [
        fastify.middleware.auth.requireAuth(),
        fastify.middleware.authorization.requireConversationAccess(),
      ],
    },
    async (request, reply) => {
      const { conversationId } = request.params;
      const { user, project } = request;

      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const limit = request.query.limit
        ? parseInt(request.query.limit, 10)
        : undefined;

      try {
        // Validate conversation belongs to project context if provided
        const conversation = await prisma.conversation.findFirst({
          where: { id: conversationId, userId: user.id },
        });

        if (!conversation) {
          return reply.code(404).send({
            error: 'Conversation not found or access denied',
          });
        }

        if (project && conversation.projectId !== project.id) {
          return reply.code(403).send({
            error:
              'Conversation does not belong to the current project context',
          });
        }

        // Update last accessed time when fetching messages
        await chatPersistenceService.updateConversationAccess(
          conversationId,
          user.id
        );

        const messages = await chatPersistenceService.getConversationHistory(
          conversationId,
          limit,
          user.id
        );

        // SECURITY: Sanitize messages before sending to client
        // This prevents sensitive data (source code, technical details) from being exposed
        // via Chrome DevTools when inspecting message history
        const sanitizedMessages = sanitizeMessagesForClient(messages);

        return sanitizedMessages;
      } catch (error) {
        logger.error('Error fetching conversation history', {
          error,
          conversationId,
        });
        reply.code(500).send({
          error: 'Failed to fetch conversation history',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Get conversation statistics for a project
   */
  fastify.get<{
    Params: { projectId: string };
  }>(
    '/projects/:projectId/conversations/stats',
    {
      preHandler: [
        fastify.middleware.auth.requireAuth(),
        fastify.middleware.authorization.requireProjectAccess(),
      ],
    },
    async (request, reply) => {
      const { projectId } = request.params;
      const { user } = request;

      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      try {
        const stats = await chatPersistenceService.getConversationStats(
          projectId,
          user.id
        );

        return stats;
      } catch (error) {
        logger.error('Error fetching conversation statistics', {
          error,
          projectId,
        });
        reply.code(500).send({
          error: 'Failed to fetch conversation statistics',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Update conversation details
   */
  fastify.patch<{
    Params: { conversationId: string };
    Body: {
      title?: string;
      isArchived?: boolean;
    };
  }>(
    '/conversations/:conversationId',
    {
      preHandler: [
        fastify.middleware.auth.requireAuth(),
        fastify.middleware.authorization.requireConversationAccess(),
        fastify.middleware.authorization.requireResourcePermission(
          'conversation',
          'write'
        ),
      ],
    },
    async (request, reply) => {
      const { conversationId } = request.params;
      const { user } = request;

      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const updates = request.body;

      try {
        const conversation = await chatPersistenceService.updateConversation(
          conversationId,
          user.id,
          updates
        );

        logger.info('Conversation updated', {
          conversationId,
          userId: user.id,
          updates,
        });

        return conversation;
      } catch (error) {
        logger.error('Error updating conversation', {
          error,
          conversationId,
        });
        reply.code(500).send({
          error: 'Failed to update conversation',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Archive a conversation
   */
  fastify.post<{
    Params: { conversationId: string };
  }>(
    '/conversations/:conversationId/archive',
    {
      preHandler: [
        fastify.middleware.auth.requireAuth(),
        fastify.middleware.authorization.requireConversationAccess(),
        fastify.middleware.authorization.requireResourcePermission(
          'conversation',
          'write'
        ),
      ],
    },
    async (request, reply) => {
      const { conversationId } = request.params;
      const { user } = request;

      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      try {
        const conversation = await chatPersistenceService.archiveConversation(
          conversationId,
          user.id
        );

        logger.info('Conversation archived', {
          conversationId,
          userId: user.id,
        });

        return conversation;
      } catch (error) {
        logger.error('Error archiving conversation', {
          error,
          conversationId,
        });
        reply.code(500).send({
          error: 'Failed to archive conversation',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Restore an archived conversation
   */
  fastify.post<{
    Params: { conversationId: string };
  }>(
    '/conversations/:conversationId/restore',
    {
      preHandler: [
        fastify.middleware.auth.requireAuth(),
        fastify.middleware.authorization.requireConversationAccess(),
        fastify.middleware.authorization.requireResourcePermission(
          'conversation',
          'write'
        ),
      ],
    },
    async (request, reply) => {
      const { conversationId } = request.params;
      const { user } = request;

      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      try {
        const conversation = await chatPersistenceService.restoreConversation(
          conversationId,
          user.id
        );

        logger.info('Conversation restored', {
          conversationId,
          userId: user.id,
        });

        return conversation;
      } catch (error) {
        logger.error('Error restoring conversation', {
          error,
          conversationId,
        });
        reply.code(500).send({
          error: 'Failed to restore conversation',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Delete a conversation
   */
  fastify.delete<{
    Params: { conversationId: string };
  }>(
    '/conversations/:conversationId',
    {
      preHandler: [
        fastify.middleware.auth.requireAuth(),
        fastify.middleware.authorization.requireConversationAccess(),
        fastify.middleware.authorization.requireResourcePermission(
          'conversation',
          'delete'
        ),
      ],
    },
    async (request, reply) => {
      const { conversationId } = request.params;
      const { user } = request;

      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      try {
        // Clean up sandbox if this is the last conversation in the project
        try {
          const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            select: {
              projectId: true,
            },
          });

          if (conversation?.projectId) {
            // Get the project to check if it has a sandbox
            const project = await prisma.project.findUnique({
              where: { id: conversation.projectId },
              select: {
                sandboxId: true,
                sandboxStatus: true,
              },
            });

            if (project?.sandboxId) {
              // Check if any other conversations exist in this project
              const otherConversationsInProject =
                await prisma.conversation.count({
                  where: {
                    projectId: conversation.projectId,
                    id: { not: conversationId }, // Exclude current conversation
                  },
                });

              // Only destroy sandbox if this is the last conversation in the project
              if (otherConversationsInProject === 0) {
                const { sandboxManager } = await import(
                  '../services/sandboxManager.js'
                );
                await sandboxManager.destroySandbox(conversationId, user.id);

                logger.info(
                  'Cleaned up sandbox for deleted conversation (last one in project)',
                  {
                    conversationId,
                    projectId: conversation.projectId,
                    sandboxId: project.sandboxId,
                    userId: user.id,
                  }
                );
              } else {
                logger.info(
                  'Skipped sandbox cleanup - other conversations still in project',
                  {
                    conversationId,
                    projectId: conversation.projectId,
                    sandboxId: project.sandboxId,
                    otherConversationCount: otherConversationsInProject,
                  }
                );
              }
            }
          }
        } catch (sandboxError) {
          logger.warn('Failed to cleanup sandbox for deleted conversation', {
            conversationId,
            error:
              sandboxError instanceof Error
                ? sandboxError.message
                : String(sandboxError),
          });
          // Continue with conversation deletion even if sandbox cleanup fails
        }

        await chatPersistenceService.deleteConversation(
          conversationId,
          user.id
        );

        logger.info('Conversation deleted', {
          conversationId,
          userId: user.id,
        });

        return { success: true };
      } catch (error) {
        logger.error('Error deleting conversation', {
          error,
          conversationId,
        });
        reply.code(500).send({
          error: 'Failed to delete conversation',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Get a specific message
   */
  fastify.get<{
    Params: { messageId: string };
  }>(
    '/messages/:messageId',
    {
      preHandler: [
        fastify.middleware.auth.requireAuth(),
        fastify.middleware.authorization.requireMessageAccess(),
      ],
    },
    async (request, reply) => {
      const { messageId } = request.params;
      const { user } = request;

      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      try {
        const message = await chatPersistenceService.getMessage(
          messageId,
          user.id
        );

        if (!message) {
          return reply.code(404).send({
            error: 'Message not found',
            message: 'Message not found or access denied',
          });
        }

        // SECURITY: Sanitize message before sending to client
        const sanitizedMessage = sanitizeMessagesForClient([message])[0];

        return sanitizedMessage;
      } catch (error) {
        logger.error('Error fetching message', {
          error,
          messageId,
        });
        reply.code(500).send({
          error: 'Failed to fetch message',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Provision sandbox for a conversation
   * This endpoint triggers on-demand sandbox creation when user navigates to editor
   */
  fastify.post<{
    Params: { conversationId: string };
  }>(
    '/conversations/:conversationId/provision-sandbox',
    {
      preHandler: [
        fastify.middleware.auth.requireAuth(),
        fastify.middleware.authorization.requireConversationAccess(),
      ],
    },
    async (request, reply) => {
      const { conversationId } = request.params;
      const { user, project } = request;

      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      if (!project) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Project context is required',
        });
      }

      try {
        // Get conversation to verify access
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
        });

        if (!conversation) {
          return reply.code(404).send({ error: 'Conversation not found' });
        }

        // Get project with sandbox fields
        const projectWithSandbox = await prisma.project.findUnique({
          where: { id: project.id },
          select: {
            id: true,
            sandboxId: true,
            sandboxStatus: true,
            sandboxPort: true,
            sandboxPublicUrl: true,
            sandboxCreatedAt: true,
          },
        });

        if (!projectWithSandbox) {
          return reply.code(404).send({ error: 'Project not found' });
        }

        // Check if project already has a READY sandbox
        if (
          projectWithSandbox.sandboxStatus === 'READY' &&
          projectWithSandbox.sandboxId
        ) {
          logger.info('Project already has ready sandbox', {
            conversationId,
            projectId: projectWithSandbox.id,
            sandboxId: projectWithSandbox.sandboxId,
          });
          return {
            status: 'READY',
            sandboxId: projectWithSandbox.sandboxId,
            sandboxPublicUrl: projectWithSandbox.sandboxPublicUrl,
            sandboxPort: projectWithSandbox.sandboxPort,
          };
        }

        // Check for PENDING sandbox
        if (projectWithSandbox.sandboxStatus === 'PENDING') {
          logger.info('Sandbox is being provisioned for project', {
            conversationId,
            projectId: projectWithSandbox.id,
          });
          return {
            status: 'PENDING',
            message: 'Sandbox is being provisioned for this project',
          };
        }

        // Otherwise, provision new sandbox for project
        logger.info('Provisioning new sandbox for project', {
          conversationId,
          projectId: project.id,
          userId: user.id,
        });

        // Import sandboxManager dynamically to avoid circular dependencies
        const { sandboxManager } = await import(
          '../services/sandboxManager.js'
        );

        const sandboxRequest = {
          userId: user.id,
          projectId: project.id,
          conversationId: conversation.id,
        };

        const sandboxResponse =
          await sandboxManager.createSandbox(sandboxRequest);

        if (sandboxResponse && sandboxResponse.status === 'READY') {
          const sandboxPort = sandboxResponse.port;
          const sandboxId = sandboxResponse.containerId || project.id;
          const previewUrl = sandboxPort
            ? `http://localhost:${sandboxPort}`
            : null;

          // Update project with sandbox info
          await prisma.project.update({
            where: { id: project.id },
            data: {
              sandboxId,
              sandboxPort,
              sandboxStatus: 'READY',
              sandboxCreatedAt: new Date(),
              sandboxPublicUrl: previewUrl,
            },
          });

          logger.info('Sandbox provisioned successfully for project', {
            projectId: project.id,
            sandboxId,
            previewUrl,
          });

          return {
            status: 'READY',
            sandboxId,
            sandboxPublicUrl: previewUrl,
            sandboxPort,
          };
        } else {
          logger.warn('Sandbox provisioning returned non-ready status', {
            projectId: project.id,
            status: sandboxResponse?.status,
            error: sandboxResponse?.error,
          });

          // Mark project as failed
          await prisma.project.update({
            where: { id: project.id },
            data: { sandboxStatus: 'FAILED' },
          });

          return reply.code(500).send({
            error: 'Failed to provision sandbox',
            details: sandboxResponse?.error,
          });
        }
      } catch (error) {
        logger.error('Error provisioning sandbox', {
          conversationId,
          error: error instanceof Error ? error.message : String(error),
        });

        reply.code(500).send({
          error: 'Failed to provision sandbox',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Get user's current sandbox usage and limits
   */
  fastify.get(
    '/sandbox/usage',
    {
      preHandler: [fastify.middleware.auth.requireAuth()],
    },
    async (request, reply) => {
      const { user } = request;

      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      try {
        const { getSandboxLimitService } = await import(
          '../services/sandboxLimitService.js'
        );
        const sandboxLimitService = getSandboxLimitService();

        const usage = await sandboxLimitService.getUserSandboxUsage(user.id);

        return {
          activeSandboxCount: usage.activeSandboxCount,
          maxAllowed: usage.maxAllowed, // -1 means unlimited
          subscriptionTier: usage.subscriptionTier,
          remainingCapacity: usage.remainingCapacity, // -1 means unlimited
        };
      } catch (error) {
        logger.error('Error fetching sandbox usage', {
          error,
          userId: user.id,
        });
        reply.code(500).send({
          error: 'Failed to fetch sandbox usage',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Additional endpoints can be added here following the same pattern
}
