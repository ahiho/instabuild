import { PrismaClient } from '@prisma/client';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ProjectService } from '../services/projectService.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  emailVerified: boolean;
}

export interface ProjectContextRequest extends FastifyRequest {
  user?: AuthenticatedUser;
  project?: {
    id: string;
    userId: string;
    name: string;
    description?: string | null;
    createdAt: Date;
    updatedAt: Date;
    isDefault: boolean;
    conversationCount: number;
    landingPageCount: number;
  };
}

export class ProjectContextMiddleware {
  private projectService: ProjectService;

  constructor(prisma: PrismaClient) {
    this.projectService = new ProjectService(prisma);
  }

  /**
   * Middleware to inject active project context into request (returns bound function)
   */
  injectProjectContext = async (
    request: ProjectContextRequest,
    _reply: FastifyReply
  ): Promise<void> => {
    if (!request.user) {
      // No authenticated user, skip project context
      return;
    }

    try {
      const activeProject = await this.projectService.getActiveProject(
        request.user.id
      );

      if (activeProject) {
        request.project = activeProject;
      }
    } catch (error) {
      // Log error but don't fail the request
      console.error('Failed to inject project context:', error);
    }
  };

  /**
   * Middleware to require project context (returns bound function)
   */
  requireProjectContext = async (
    request: ProjectContextRequest,
    reply: FastifyReply
  ): Promise<void> => {
    if (!request.user) {
      reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    try {
      const activeProject = await this.projectService.getActiveProject(
        request.user.id
      );

      if (!activeProject) {
        reply.code(404).send({
          error: 'No Active Project',
          message:
            'No active project found. Please create or select a project.',
        });
        return;
      }

      request.project = activeProject;
    } catch (error) {
      console.error('Failed to get project context:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve project context',
      });
    }
  };

  /**
   * Middleware to validate project access by project ID
   */
  requireProjectAccess(projectIdParam: string = 'projectId') {
    return async (
      request: ProjectContextRequest,
      reply: FastifyReply
    ): Promise<void> => {
      if (!request.user) {
        reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      const projectId = (request.params as any)[projectIdParam];
      if (!projectId) {
        reply.code(400).send({
          error: 'Bad Request',
          message: `Missing ${projectIdParam} parameter`,
        });
        return;
      }

      try {
        const project = await this.projectService.getProject(
          projectId,
          request.user.id
        );

        if (!project) {
          reply.code(404).send({
            error: 'Project Not Found',
            message: 'Project not found or access denied',
          });
          return;
        }

        request.project = project;
      } catch (error) {
        console.error('Failed to validate project access:', error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to validate project access',
        });
      }
    };
  }

  /**
   * Middleware to validate conversation access and inject project context (returns bound function)
   */
  requireConversationAccess = async (
    request: ProjectContextRequest,
    reply: FastifyReply
  ): Promise<void> => {
    if (!request.user) {
      reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const conversationId = (request.params as any).conversationId;
    if (!conversationId) {
      reply.code(400).send({
        error: 'Bad Request',
        message: 'Missing conversationId parameter',
      });
      return;
    }

    try {
      const project = await this.projectService.getProjectForConversation(
        conversationId,
        request.user.id
      );

      if (!project) {
        reply.code(404).send({
          error: 'Conversation Not Found',
          message: 'Conversation not found or access denied',
        });
        return;
      }

      request.project = project;
    } catch (error) {
      console.error('Failed to validate conversation access:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to validate conversation access',
      });
    }
  };

  /**
   * Middleware to validate landing page access and inject project context (returns bound function)
   */
  requireLandingPageAccess = async (
    request: ProjectContextRequest,
    reply: FastifyReply
  ): Promise<void> => {
    if (!request.user) {
      reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const landingPageId =
      (request.params as any).landingPageId || (request.params as any).pageId;
    if (!landingPageId) {
      reply.code(400).send({
        error: 'Bad Request',
        message: 'Missing landingPageId or pageId parameter',
      });
      return;
    }

    try {
      const project = await this.projectService.getProjectForLandingPage(
        landingPageId,
        request.user.id
      );

      if (!project) {
        reply.code(404).send({
          error: 'Landing Page Not Found',
          message: 'Landing page not found or access denied',
        });
        return;
      }

      request.project = project;
    } catch (error) {
      console.error('Failed to validate landing page access:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to validate landing page access',
      });
    }
  };

  /**
   * Get project service instance
   */
  getProjectService(): ProjectService {
    return this.projectService;
  }
}
