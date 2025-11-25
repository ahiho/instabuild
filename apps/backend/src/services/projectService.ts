import { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger.js';

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
  isDefault: boolean;
  conversationCount: number;
  landingPageCount: number;
  githubRepoUrl?: string | null;
}

export interface CreateProjectRequest {
  name: string;
  description?: string | null;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string | null;
}

export interface ProjectContextSession {
  userId: string;
  activeProjectId: string;
  updatedAt: Date;
}

export class ProjectService {
  private prisma: PrismaClient;
  private activeProjectSessions: Map<string, string> = new Map(); // userId -> projectId

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a new project for a user
   * Automatically creates a GitHub repository for code persistence
   */
  async createProject(
    userId: string,
    request: CreateProjectRequest
  ): Promise<Project> {
    const { name, description } = request;

    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Create project
    const project = await this.prisma.project.create({
      data: {
        userId,
        name,
        description,
        isDefault: false,
      },
      include: {
        _count: {
          select: {
            conversations: true,
            landingPages: true,
          },
        },
      },
    });

    // Create GitHub repository asynchronously (fire-and-forget)
    // Don't block project creation if GitHub repo creation fails
    this.createGitHubRepoAsync(project.id, project.name, userId).catch(
      error => {
        logger.error('Failed to create GitHub repository for project', {
          projectId: project.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    );

    return {
      id: project.id,
      userId: project.userId,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      isDefault: project.isDefault,
      conversationCount: project._count.conversations,
      landingPageCount: project._count.landingPages,
      githubRepoUrl: project.githubRepoUrl,
    };
  }

  /**
   * Create GitHub repository for project asynchronously
   * Private helper method
   */
  private async createGitHubRepoAsync(
    projectId: string,
    projectName: string,
    _userId: string
  ): Promise<void> {
    try {
      // GitHub repository creation is deferred until first sync
      // This avoids creating empty repos and reduces API calls
      logger.info('GitHub repository will be created on first sync', {
        projectId,
        projectName,
      });
    } catch (error) {
      logger.error('Error initializing GitHub sync for project', {
        projectId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get all projects for a user
   */
  async getUserProjects(userId: string): Promise<Project[]> {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const projects = await this.prisma.project.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            conversations: true,
            landingPages: true,
          },
        },
      },
      orderBy: [
        { isDefault: 'desc' }, // Default project first
        { updatedAt: 'desc' }, // Then by most recently updated
      ],
    });

    return projects.map(project => ({
      id: project.id,
      userId: project.userId,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      isDefault: project.isDefault,
      conversationCount: project._count.conversations,
      landingPageCount: project._count.landingPages,
    }));
  }

  /**
   * Get a specific project by ID with authorization check
   */
  async getProject(projectId: string, userId: string): Promise<Project | null> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        userId, // Ensures user owns the project
      },
      include: {
        _count: {
          select: {
            conversations: true,
            landingPages: true,
          },
        },
      },
    });

    if (!project) {
      return null;
    }

    return {
      id: project.id,
      userId: project.userId,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      isDefault: project.isDefault,
      conversationCount: project._count.conversations,
      landingPageCount: project._count.landingPages,
    };
  }

  /**
   * Update a project with ownership validation
   */
  async updateProject(
    projectId: string,
    userId: string,
    updates: UpdateProjectRequest
  ): Promise<Project> {
    // First verify ownership
    const existingProject = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!existingProject) {
      throw new Error('Project not found or access denied');
    }

    // Update project
    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
      include: {
        _count: {
          select: {
            conversations: true,
            landingPages: true,
          },
        },
      },
    });

    return {
      id: project.id,
      userId: project.userId,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      isDefault: project.isDefault,
      conversationCount: project._count.conversations,
      landingPageCount: project._count.landingPages,
    };
  }

  /**
   * Delete a project with ownership validation
   */
  async deleteProject(projectId: string, userId: string): Promise<void> {
    // First verify ownership and that it's not a default project
    const existingProject = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!existingProject) {
      throw new Error('Project not found or access denied');
    }

    if (existingProject.isDefault) {
      throw new Error('Cannot delete default project');
    }

    // Check if this is the active project and clear it if so
    if (this.activeProjectSessions.get(userId) === projectId) {
      this.activeProjectSessions.delete(userId);
    }

    // Delete project (cascade will handle related data)
    await this.prisma.project.delete({
      where: { id: projectId },
    });
  }

  /**
   * Set active project for a user session
   */
  async setActiveProject(userId: string, projectId: string): Promise<void> {
    // Verify user owns the project
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!project) {
      throw new Error('Project not found or access denied');
    }

    // Set active project in memory
    this.activeProjectSessions.set(userId, projectId);
  }

  /**
   * Get active project for a user
   */
  async getActiveProject(userId: string): Promise<Project | null> {
    let activeProjectId = this.activeProjectSessions.get(userId);

    // If no active project set, try to get the default project
    if (!activeProjectId) {
      const defaultProject = await this.prisma.project.findFirst({
        where: {
          userId,
          isDefault: true,
        },
      });

      if (defaultProject) {
        activeProjectId = defaultProject.id;
        this.activeProjectSessions.set(userId, activeProjectId);
      } else {
        // If no default project, get the most recently updated project
        const recentProject = await this.prisma.project.findFirst({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
        });

        if (recentProject) {
          activeProjectId = recentProject.id;
          this.activeProjectSessions.set(userId, activeProjectId);
        }
      }
    }

    if (!activeProjectId) {
      return null;
    }

    return this.getProject(activeProjectId, userId);
  }

  /**
   * Validate project access for conversations and landing pages
   */
  async validateProjectAccess(
    projectId: string,
    userId: string
  ): Promise<boolean> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    return !!project;
  }

  /**
   * Get project context for conversations
   */
  async getProjectForConversation(
    conversationId: string,
    userId: string
  ): Promise<Project | null> {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      include: {
        project: {
          include: {
            _count: {
              select: {
                conversations: true,
                landingPages: true,
              },
            },
          },
        },
      },
    });

    if (!conversation || !conversation.project) {
      return null;
    }

    const project = conversation.project;
    return {
      id: project.id,
      userId: project.userId,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      isDefault: project.isDefault,
      conversationCount: project._count.conversations,
      landingPageCount: project._count.landingPages,
    };
  }

  /**
   * Get project context for landing pages
   */
  async getProjectForLandingPage(
    landingPageId: string,
    userId: string
  ): Promise<Project | null> {
    const landingPage = await this.prisma.landingPage.findFirst({
      where: {
        id: landingPageId,
        userId,
      },
      include: {
        project: {
          include: {
            _count: {
              select: {
                conversations: true,
                landingPages: true,
              },
            },
          },
        },
      },
    });

    if (!landingPage || !landingPage.project) {
      return null;
    }

    const project = landingPage.project;
    return {
      id: project.id,
      userId: project.userId,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      isDefault: project.isDefault,
      conversationCount: project._count.conversations,
      landingPageCount: project._count.landingPages,
    };
  }

  /**
   * Ensure user has a default project (used during user creation)
   */
  async ensureDefaultProject(userId: string): Promise<Project> {
    // Check if user already has a default project
    let defaultProject = await this.prisma.project.findFirst({
      where: {
        userId,
        isDefault: true,
      },
      include: {
        _count: {
          select: {
            conversations: true,
            landingPages: true,
          },
        },
      },
    });

    if (!defaultProject) {
      // Create default project
      defaultProject = await this.prisma.project.create({
        data: {
          userId,
          name: 'My First Project',
          description: 'Default project for getting started',
          isDefault: true,
        },
        include: {
          _count: {
            select: {
              conversations: true,
              landingPages: true,
            },
          },
        },
      });
    }

    // Set as active project
    this.activeProjectSessions.set(userId, defaultProject.id);

    return {
      id: defaultProject.id,
      userId: defaultProject.userId,
      name: defaultProject.name,
      description: defaultProject.description,
      createdAt: defaultProject.createdAt,
      updatedAt: defaultProject.updatedAt,
      isDefault: defaultProject.isDefault,
      conversationCount: defaultProject._count.conversations,
      landingPageCount: defaultProject._count.landingPages,
    };
  }

  /**
   * Get project statistics for a user
   */
  async getProjectStatistics(userId: string): Promise<{
    totalProjects: number;
    totalConversations: number;
    totalLandingPages: number;
    activeProject: Project | null;
  }> {
    const projects = await this.getUserProjects(userId);
    const activeProject = await this.getActiveProject(userId);

    const totalConversations = projects.reduce(
      (sum, project) => sum + project.conversationCount,
      0
    );
    const totalLandingPages = projects.reduce(
      (sum, project) => sum + project.landingPageCount,
      0
    );

    return {
      totalProjects: projects.length,
      totalConversations,
      totalLandingPages,
      activeProject,
    };
  }

  /**
   * Clear active project session (used during logout)
   */
  clearActiveProjectSession(userId: string): void {
    this.activeProjectSessions.delete(userId);
  }
}
