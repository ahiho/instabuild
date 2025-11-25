import { prisma } from '../server.js';
import { logger } from '../lib/logger.js';

/**
 * Service for persisting chat messages and conversations
 * Enhanced to support project-based architecture with multiple conversations per project
 */
export class ChatPersistenceService {
  /**
   * Create a new conversation
   * @param userId - Required user ID for authentication
   * @param projectId - Required project ID for project-based architecture
   * @param title - Optional conversation title
   * @returns The created conversation
   */
  async createConversation(userId: string, projectId: string, title?: string) {
    if (!userId) {
      throw new Error('User ID is required to create conversation');
    }

    if (!projectId) {
      throw new Error('Project ID is required to create conversation');
    }

    // Create landing page for GitHub code backup
    // This ensures all conversations have a landing page for code persistence
    const landingPage = await prisma.landingPage.create({
      data: {
        projectId,
        userId,
        title: title || 'New Landing Page',
        description: 'Auto-created for conversation code backup',
      },
    });

    logger.info('Landing page created for conversation', {
      landingPageId: landingPage.id,
      projectId,
      userId,
    });

    const conversation = await prisma.conversation.create({
      data: {
        userId,
        projectId,
        landingPageId: landingPage.id, // Link the landing page for GitHub sync
        title: title || 'New Conversation',
        startTime: new Date(),
        lastUpdateTime: new Date(),
        lastAccessedAt: new Date(),
      },
    });

    // Enforce sandbox limits for this user
    // This happens in the background to avoid blocking conversation creation
    // Import dynamically to avoid circular dependencies
    setImmediate(async () => {
      try {
        const { getSandboxLimitService } = await import(
          './sandboxLimitService.js'
        );
        const sandboxLimitService = getSandboxLimitService();

        logger.info('Enforcing sandbox limits for user', {
          conversationId: conversation.id,
          userId,
        });

        // This will destroy old sandboxes if the user exceeds their limit
        const destroyedSandboxes =
          await sandboxLimitService.enforceLimit(userId);

        if (destroyedSandboxes.length > 0) {
          logger.info('Destroyed sandboxes due to user limit', {
            conversationId: conversation.id,
            userId,
            destroyedCount: destroyedSandboxes.length,
            sandboxIds: destroyedSandboxes,
          });
        }
      } catch (error) {
        logger.warn('Failed to enforce sandbox limits', {
          conversationId: conversation.id,
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Don't throw - this is non-critical
      }
    });

    // Trigger background sandbox provisioning (non-blocking)
    // Import dynamically to avoid circular dependencies
    setImmediate(async () => {
      try {
        const { sandboxManager } = await import('./sandboxManager.js');
        logger.info('Starting background sandbox provisioning', {
          conversationId: conversation.id,
          userId,
          projectId,
        });

        // Check if the project already has a READY sandbox
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: {
            sandboxId: true,
            sandboxStatus: true,
            sandboxPort: true,
            sandboxPublicUrl: true,
            sandboxCreatedAt: true,
          },
        });

        // If a sandbox already exists for the project, no need to provision
        if (project?.sandboxStatus === 'READY' && project.sandboxId) {
          logger.info(
            'Project already has a ready sandbox from background provisioning',
            {
              conversationId: conversation.id,
              sandboxId: project.sandboxId,
              projectId,
            }
          );
          return;
        }

        // Check if a sandbox is currently being provisioned for this project
        if (project?.sandboxStatus === 'PENDING') {
          logger.info(
            'Sandbox is being provisioned for this project, waiting',
            {
              conversationId: conversation.id,
              projectId,
            }
          );
          // Skip provisioning - will reuse when it completes
          return;
        }

        // Fire-and-forget: provision sandbox in background without waiting
        sandboxManager
          .createSandbox({
            userId,
            projectId,
            conversationId: conversation.id,
          })
          .then(() => {
            logger.info('Background sandbox provisioning completed', {
              conversationId: conversation.id,
            });
          })
          .catch(error => {
            logger.warn('Background sandbox provisioning failed', {
              conversationId: conversation.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            // Don't throw - failure is non-critical, user can retry manually
          });
      } catch (error) {
        logger.warn('Failed to start background sandbox provisioning', {
          conversationId: conversation.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    return conversation;
  }

  /**
   * Generate automatic conversation title based on first user message
   * @param conversationId - The conversation ID
   * @param userId - Required user ID for access validation
   * @returns Updated conversation with generated title
   */
  async generateConversationTitle(conversationId: string, userId: string) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Validate user has access to the conversation
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: {
          where: { role: 'user' },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    // Only generate title if it's still the default and we have a user message
    if (
      conversation.title !== 'New Conversation' ||
      conversation.messages.length === 0
    ) {
      return conversation;
    }

    const firstMessage = conversation.messages[0];
    let generatedTitle = 'New Conversation';

    // Extract text from message parts
    if (firstMessage.parts && Array.isArray(firstMessage.parts)) {
      const textParts = firstMessage.parts
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join(' ');

      if (textParts.trim()) {
        // Generate title from first 50 characters of the message
        generatedTitle = textParts.trim().substring(0, 50);
        if (textParts.length > 50) {
          generatedTitle += '...';
        }
        // Clean up the title
        generatedTitle = generatedTitle.replace(/\n/g, ' ').trim();
      }
    }

    return prisma.conversation.update({
      where: { id: conversationId },
      data: {
        title: generatedTitle,
        lastUpdateTime: new Date(),
      },
    });
  }

  /**
   * Get conversation statistics for a project
   * @param projectId - The project ID
   * @param userId - Required user ID for access validation
   * @returns Conversation statistics
   */
  async getConversationStats(projectId: string, userId: string) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Validate user has access to the project
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new Error('Project not found or access denied');
    }

    const [totalCount, activeCount, archivedCount] = await Promise.all([
      prisma.conversation.count({
        where: { projectId, userId },
      }),
      prisma.conversation.count({
        where: { projectId, userId, isArchived: false },
      }),
      prisma.conversation.count({
        where: { projectId, userId, isArchived: true },
      }),
    ]);

    return {
      total: totalCount,
      active: activeCount,
      archived: archivedCount,
    };
  }

  /**
   * Get a conversation by ID with user access validation
   * @param conversationId - The conversation ID
   * @param userId - Optional user ID for access validation
   * @returns The conversation with messages
   */
  async getConversation(conversationId: string, userId?: string) {
    const whereClause = userId
      ? { id: conversationId, userId }
      : { id: conversationId };

    return prisma.conversation.findUnique({
      where: whereClause,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * Save a user message to a conversation
   * @param conversationId - The conversation ID
   * @param userId - Required user ID
   * @param content - The message content or parts array
   * @param parts - Optional parts array (if content is string, it will be converted to parts)
   * @returns The created message
   */
  async saveUserMessage(
    conversationId: string,
    userId: string,
    content: string | any[],
    parts?: any[]
  ) {
    if (!userId) {
      throw new Error('User ID is required to save message');
    }

    // Handle both string content and parts array
    const messageParts =
      parts ||
      (typeof content === 'string'
        ? [{ type: 'text', text: content }]
        : content);

    const message = await prisma.chatMessage.create({
      data: {
        conversationId,
        userId,
        role: 'user',
        parts: messageParts,
      },
    });

    // Auto-generate conversation title if this is the first user message
    try {
      await this.generateConversationTitle(conversationId, userId);
    } catch (error) {
      // Don't fail message saving if title generation fails
      console.warn('Failed to generate conversation title:', error);
    }

    // Update conversation timestamp
    await this.updateConversationTimestamp(conversationId);

    return message;
  }

  /**
   * Save an AI response message to a conversation
   * @param conversationId - The conversation ID
   * @param userId - Required user ID
   * @param content - The message content or parts array
   * @param parts - Optional parts array (if content is string, it will be converted to parts)
   * @param metadata - Optional metadata
   * @returns The created message
   */
  async saveAIMessage(
    conversationId: string,
    userId: string,
    content: string | any[],
    parts?: any[],
    metadata?: any
  ) {
    if (!userId) {
      throw new Error('User ID is required to save message');
    }

    // Validate user has access to the conversation
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    // Handle both string content and parts array
    const messageParts =
      parts ||
      (typeof content === 'string'
        ? [{ type: 'text', text: content }]
        : content);

    const message = await prisma.chatMessage.create({
      data: {
        conversationId,
        userId,
        role: 'assistant',
        parts: messageParts,
        metadata,
      },
    });

    // Update conversation timestamp
    await this.updateConversationTimestamp(conversationId);

    return message;
  }

  /**
   * Save a message with custom role and parts
   * @param conversationId - The conversation ID
   * @param userId - Required user ID
   * @param role - Message role (user, assistant, system, tool)
   * @param parts - Message parts array
   * @param metadata - Optional metadata
   * @returns The created message
   */
  async saveMessage(
    conversationId: string,
    userId: string,
    role: string,
    parts: any[],
    metadata?: any
  ) {
    if (!userId) {
      throw new Error('User ID is required to save message');
    }

    // Validate user has access to the conversation
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    const message = await prisma.chatMessage.create({
      data: {
        conversationId,
        userId,
        role,
        parts,
        metadata,
      },
    });

    // Auto-generate conversation title if this is the first user message
    if (role === 'user') {
      try {
        await this.generateConversationTitle(conversationId, userId);
      } catch (error) {
        // Don't fail message saving if title generation fails
        console.warn('Failed to generate conversation title:', error);
      }
    }

    // Update conversation timestamp
    await this.updateConversationTimestamp(conversationId);

    return message;
  }

  /**
   * Get a specific message by ID with access validation
   * @param messageId - The message ID
   * @param userId - Required user ID for access validation
   * @returns The message or null if not found/no access
   */
  async getMessage(messageId: string, userId: string) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    return prisma.chatMessage.findFirst({
      where: {
        id: messageId,
        userId,
      },
      include: {
        conversation: {
          select: {
            id: true,
            title: true,
            projectId: true,
          },
        },
      },
    });
  }

  /**
   * Update message metadata
   * @param messageId - The message ID
   * @param userId - Required user ID for access validation
   * @param metadata - New metadata to merge
   * @returns Updated message
   */
  async updateMessageMetadata(
    messageId: string,
    userId: string,
    metadata: any
  ) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Validate user has access to the message
    const message = await this.getMessage(messageId, userId);
    if (!message) {
      throw new Error('Message not found or access denied');
    }

    // Merge metadata
    const existingMetadata = (message.metadata as Record<string, any>) || {};
    const mergedMetadata = { ...existingMetadata, ...metadata };

    return prisma.chatMessage.update({
      where: { id: messageId },
      data: { metadata: mergedMetadata },
    });
  }

  /**
   * Get conversation history with optional limit and user access validation
   * @param conversationId - The conversation ID
   * @param limit - Optional limit on number of messages to retrieve
   * @param userId - Required user ID for access validation
   * @param includeMetadata - Whether to include message metadata
   * @returns Array of messages
   */
  async getConversationHistory(
    conversationId: string,
    limit?: number,
    userId?: string,
    includeMetadata: boolean = false
  ) {
    // Validate user has access to the conversation
    if (userId) {
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId },
      });

      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        conversationId,
        ...(userId && { userId }),
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: {
        id: true,
        role: true,
        parts: true,
        createdAt: true,
        ...(includeMetadata && { metadata: true }),
      },
    });

    return messages;
  }

  /**
   * Get message count for a conversation
   * @param conversationId - The conversation ID
   * @param userId - Required user ID for access validation
   * @returns Message count
   */
  async getMessageCount(conversationId: string, userId: string) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Validate user has access to the conversation
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    return prisma.chatMessage.count({
      where: { conversationId, userId },
    });
  }

  /**
   * Delete a message
   * @param messageId - The message ID
   * @param userId - Required user ID for access validation
   */
  async deleteMessage(messageId: string, userId: string) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Validate user has access to the message
    const message = await this.getMessage(messageId, userId);
    if (!message) {
      throw new Error('Message not found or access denied');
    }

    await prisma.chatMessage.delete({
      where: { id: messageId },
    });

    // Update conversation timestamp
    await this.updateConversationTimestamp(message.conversation.id);
  }

  /**
   * Update conversation's last update time
   * @param conversationId - The conversation ID
   */
  async updateConversationTimestamp(conversationId: string) {
    return prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastUpdateTime: new Date(),
      },
    });
  }

  /**
   * Check if a conversation exists
   * @param conversationId - The conversation ID
   * @returns True if conversation exists
   */
  async conversationExists(conversationId: string): Promise<boolean> {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    return conversation !== null;
  }

  /**
   * Get conversations for a project with user access validation
   * @param projectId - The project ID
   * @param userId - Required user ID for access validation
   * @param includeArchived - Whether to include archived conversations
   * @returns Array of conversations ordered by last activity
   */
  async getProjectConversations(
    projectId: string,
    userId: string,
    includeArchived: boolean = false
  ) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Validate user has access to the project
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new Error('Project not found or access denied');
    }

    return prisma.conversation.findMany({
      where: {
        projectId,
        userId,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      orderBy: [{ lastAccessedAt: 'desc' }, { lastUpdateTime: 'desc' }],
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });
  }

  /**
   * Update conversation details (title, archived status)
   * @param conversationId - The conversation ID
   * @param userId - Required user ID for access validation
   * @param updates - Updates to apply
   * @returns Updated conversation
   */
  async updateConversation(
    conversationId: string,
    userId: string,
    updates: {
      title?: string;
      isArchived?: boolean;
    }
  ) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Validate user has access to the conversation
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    const updateData: any = {
      lastUpdateTime: new Date(),
    };

    if (updates.title !== undefined) {
      updateData.title = updates.title;
    }

    if (updates.isArchived !== undefined) {
      updateData.isArchived = updates.isArchived;
    }

    return prisma.conversation.update({
      where: { id: conversationId },
      data: updateData,
    });
  }

  /**
   * Archive a conversation
   * @param conversationId - The conversation ID
   * @param userId - Required user ID for access validation
   * @returns Updated conversation
   */
  async archiveConversation(conversationId: string, userId: string) {
    return this.updateConversation(conversationId, userId, {
      isArchived: true,
    });
  }

  /**
   * Restore an archived conversation
   * @param conversationId - The conversation ID
   * @param userId - Required user ID for access validation
   * @returns Updated conversation
   */
  async restoreConversation(conversationId: string, userId: string) {
    return this.updateConversation(conversationId, userId, {
      isArchived: false,
    });
  }

  /**
   * Delete a conversation and all its messages
   * @param conversationId - The conversation ID
   * @param userId - Required user ID for access validation
   */
  async deleteConversation(conversationId: string, userId: string) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Validate user has access to the conversation
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    // Delete conversation (messages will be cascade deleted)
    await prisma.conversation.delete({
      where: { id: conversationId },
    });
  }

  /**
   * Update conversation's last accessed time
   * @param conversationId - The conversation ID
   * @param userId - Optional user ID for access validation
   */
  async updateConversationAccess(conversationId: string, userId?: string) {
    if (userId) {
      // Validate user has access to the conversation
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId },
      });

      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }
    }

    return prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastAccessedAt: new Date(),
      },
    });
  }

  /**
   * Get or create a conversation for a landing page within a project
   * @param landingPageId - The landing page ID
   * @param userId - Required user ID
   * @returns The conversation
   */
  async getOrCreatePageConversation(landingPageId: string, userId: string) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get the landing page to find its project
    const landingPage = await prisma.landingPage.findFirst({
      where: {
        id: landingPageId,
        userId, // Ensure user owns the page
      },
    });

    if (!landingPage) {
      throw new Error('Landing page not found or access denied');
    }

    // First, check if the project has a ready sandbox
    const project = await prisma.project.findUnique({
      where: { id: landingPage.projectId },
      select: {
        sandboxStatus: true,
        sandboxId: true,
      },
    });

    // If project has a ready sandbox, find any active conversation in the project
    if (project?.sandboxStatus === 'READY' && project.sandboxId) {
      const readySandboxConversation = await prisma.conversation.findFirst({
        where: {
          projectId: landingPage.projectId,
          userId,
          isArchived: false, // Don't use archived conversations
        },
        orderBy: {
          startTime: 'desc',
        },
      });

      if (readySandboxConversation) {
        // Update last accessed time
        await this.updateConversationAccess(
          readySandboxConversation.id,
          userId
        );
        return readySandboxConversation;
      }
    }

    // Fallback: Try to find any existing active conversation in the project
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        projectId: landingPage.projectId,
        userId,
        isArchived: false,
      },
      orderBy: {
        lastUpdateTime: 'desc',
      },
    });

    if (existingConversation) {
      // Update last accessed time
      await this.updateConversationAccess(existingConversation.id, userId);
      return existingConversation;
    }

    // Create new conversation if none exists
    return this.createConversation(
      userId,
      landingPage.projectId,
      `${landingPage.title} Discussion`
    );
  }
}

// Export singleton instance
export const chatPersistenceService = new ChatPersistenceService();
