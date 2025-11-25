import { PrismaClient } from '@prisma/client';

/**
 * Service to ensure data isolation between projects
 * This service provides utilities to validate and enforce project-based access control
 */
export class ProjectDataIsolationService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Validate that a conversation belongs to the specified project and user
   */
  async validateConversationAccess(
    conversationId: string,
    projectId: string,
    userId: string
  ): Promise<boolean> {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        projectId,
        userId,
      },
    });

    return !!conversation;
  }

  /**
   * Validate that a landing page belongs to the specified project and user
   */
  async validateLandingPageAccess(
    landingPageId: string,
    projectId: string,
    userId: string
  ): Promise<boolean> {
    const landingPage = await this.prisma.landingPage.findFirst({
      where: {
        id: landingPageId,
        projectId,
        userId,
      },
    });

    return !!landingPage;
  }

  /**
   * Get all conversations for a project with user validation
   */
  async getProjectConversations(
    projectId: string,
    userId: string,
    options?: {
      includeArchived?: boolean;
      limit?: number;
      offset?: number;
    }
  ) {
    const { includeArchived = false, limit, offset } = options || {};

    // First validate project access
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!project) {
      throw new Error('Project not found or access denied');
    }

    return this.prisma.conversation.findMany({
      where: {
        projectId,
        userId,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      orderBy: {
        lastAccessedAt: 'desc',
      },
      take: limit,
      skip: offset,
      include: {
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });
  }

  /**
   * Get all landing pages for a project with user validation
   */
  async getProjectLandingPages(
    projectId: string,
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ) {
    const { limit, offset } = options || {};

    // First validate project access
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!project) {
      throw new Error('Project not found or access denied');
    }

    return this.prisma.landingPage.findMany({
      where: {
        projectId,
        userId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: limit,
      skip: offset,
      include: {
        currentVersion: true,
        _count: {
          select: {
            versions: true,
          },
        },
      },
    });
  }

  /**
   * Create a conversation within a project with proper isolation
   */
  async createProjectConversation(
    projectId: string,
    userId: string,
    data: {
      title?: string;
    }
  ) {
    // First validate project access
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!project) {
      throw new Error('Project not found or access denied');
    }

    return this.prisma.conversation.create({
      data: {
        projectId,
        userId,
        title: data.title || 'New Conversation',
      },
    });
  }

  /**
   * Create a landing page within a project with proper isolation
   */
  async createProjectLandingPage(
    projectId: string,
    userId: string,
    data: {
      title: string;
      description?: string;
      githubRepoUrl: string;
    }
  ) {
    // First validate project access
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!project) {
      throw new Error('Project not found or access denied');
    }

    return this.prisma.landingPage.create({
      data: {
        projectId,
        userId,
        title: data.title,
        description: data.description,
        githubRepoUrl: data.githubRepoUrl,
      },
    });
  }

  /**
   * Move a conversation to a different project (with validation)
   */
  async moveConversationToProject(
    conversationId: string,
    targetProjectId: string,
    userId: string
  ) {
    // Validate user owns the conversation
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    // Validate user owns the target project
    const targetProject = await this.prisma.project.findFirst({
      where: {
        id: targetProjectId,
        userId,
      },
    });

    if (!targetProject) {
      throw new Error('Target project not found or access denied');
    }

    // Move conversation
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        projectId: targetProjectId,
        lastUpdateTime: new Date(),
      },
    });
  }

  /**
   * Move a landing page to a different project (with validation)
   */
  async moveLandingPageToProject(
    landingPageId: string,
    targetProjectId: string,
    userId: string
  ) {
    // Validate user owns the landing page
    const landingPage = await this.prisma.landingPage.findFirst({
      where: {
        id: landingPageId,
        userId,
      },
    });

    if (!landingPage) {
      throw new Error('Landing page not found or access denied');
    }

    // Validate user owns the target project
    const targetProject = await this.prisma.project.findFirst({
      where: {
        id: targetProjectId,
        userId,
      },
    });

    if (!targetProject) {
      throw new Error('Target project not found or access denied');
    }

    // Move landing page
    return this.prisma.landingPage.update({
      where: { id: landingPageId },
      data: {
        projectId: targetProjectId,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get project usage statistics with data isolation
   */
  async getProjectUsageStats(projectId: string, userId: string) {
    // First validate project access
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!project) {
      throw new Error('Project not found or access denied');
    }

    // Get conversation count
    const conversationCount = await this.prisma.conversation.count({
      where: {
        projectId,
        userId,
      },
    });

    // Get active conversation count (not archived)
    const activeConversationCount = await this.prisma.conversation.count({
      where: {
        projectId,
        userId,
        isArchived: false,
      },
    });

    // Get landing page count
    const landingPageCount = await this.prisma.landingPage.count({
      where: {
        projectId,
        userId,
      },
    });

    // Get total message count
    const messageCount = await this.prisma.chatMessage.count({
      where: {
        userId,
        conversation: {
          projectId,
        },
      },
    });

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentMessageCount = await this.prisma.chatMessage.count({
      where: {
        userId,
        createdAt: {
          gte: sevenDaysAgo,
        },
        conversation: {
          projectId,
        },
      },
    });

    return {
      projectId,
      conversationCount,
      activeConversationCount,
      landingPageCount,
      messageCount,
      recentMessageCount,
      lastActivity: await this.getLastProjectActivity(projectId, userId),
    };
  }

  /**
   * Get last activity timestamp for a project
   */
  private async getLastProjectActivity(
    projectId: string,
    userId: string
  ): Promise<Date | null> {
    // Get most recent message in any conversation in this project
    const lastMessage = await this.prisma.chatMessage.findFirst({
      where: {
        userId,
        conversation: {
          projectId,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        createdAt: true,
      },
    });

    // Get most recent conversation update
    const lastConversationUpdate = await this.prisma.conversation.findFirst({
      where: {
        projectId,
        userId,
      },
      orderBy: {
        lastUpdateTime: 'desc',
      },
      select: {
        lastUpdateTime: true,
      },
    });

    // Get most recent landing page update
    const lastLandingPageUpdate = await this.prisma.landingPage.findFirst({
      where: {
        projectId,
        userId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        updatedAt: true,
      },
    });

    // Return the most recent of all activities
    const activities = [
      lastMessage?.createdAt,
      lastConversationUpdate?.lastUpdateTime,
      lastLandingPageUpdate?.updatedAt,
    ].filter(Boolean) as Date[];

    if (activities.length === 0) {
      return null;
    }

    return new Date(Math.max(...activities.map(date => date.getTime())));
  }

  /**
   * Cleanup orphaned data (conversations/landing pages without valid projects)
   */
  async cleanupOrphanedData(userId: string) {
    // Find conversations that reference non-existent projects
    const allConversations = await this.prisma.conversation.findMany({
      where: { userId },
      include: { project: true },
    });
    const orphanedConversations = allConversations.filter(c => !c.project);

    // Find landing pages that reference non-existent projects
    const allLandingPages = await this.prisma.landingPage.findMany({
      where: { userId },
      include: { project: true },
    });
    const orphanedLandingPages = allLandingPages.filter(lp => !lp.project);

    // Get or create default project
    let defaultProject = await this.prisma.project.findFirst({
      where: {
        userId,
        isDefault: true,
      },
    });

    if (!defaultProject) {
      defaultProject = await this.prisma.project.create({
        data: {
          userId,
          name: 'My First Project',
          description: 'Default project for getting started',
          isDefault: true,
        },
      });
    }

    // Move orphaned conversations to default project
    if (orphanedConversations.length > 0) {
      await this.prisma.conversation.updateMany({
        where: {
          id: {
            in: orphanedConversations.map(c => c.id),
          },
        },
        data: {
          projectId: defaultProject.id,
        },
      });
    }

    // Move orphaned landing pages to default project
    if (orphanedLandingPages.length > 0) {
      await this.prisma.landingPage.updateMany({
        where: {
          id: {
            in: orphanedLandingPages.map(lp => lp.id),
          },
        },
        data: {
          projectId: defaultProject.id,
        },
      });
    }

    return {
      movedConversations: orphanedConversations.length,
      movedLandingPages: orphanedLandingPages.length,
      defaultProjectId: defaultProject.id,
    };
  }
}
