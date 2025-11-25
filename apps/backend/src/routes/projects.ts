import { ApiResponse, createApiResponse } from '@instabuild/shared';
import { PrismaClient } from '@prisma/client';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AuthMiddleware } from '../middleware/auth.js';
import {
  CreateProjectRequest,
  Project,
  ProjectService,
  UpdateProjectRequest,
} from '../services/projectService.js';

// Request/Response type definitions
interface CreateProjectBody {
  name: string;
  description?: string;
}

interface UpdateProjectBody {
  name?: string;
  description?: string;
}

interface ProjectParams {
  projectId: string;
}

interface ProjectListResponse {
  projects: Project[];
  totalCount: number;
  activeProject: Project | null;
}

interface ProjectStatsResponse {
  totalProjects: number;
  totalConversations: number;
  totalLandingPages: number;
  activeProject: Project | null;
}

// Validation schemas
const createProjectSchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
    },
    description: {
      type: 'string',
      maxLength: 500,
    },
  },
  additionalProperties: false,
};

const updateProjectSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
    },
    description: {
      type: 'string',
      maxLength: 500,
    },
  },
  additionalProperties: false,
};

const projectParamsSchema = {
  type: 'object',
  required: ['projectId'],
  properties: {
    projectId: {
      type: 'string',
      minLength: 1,
    },
  },
};

export async function projectRoutes(fastify: FastifyInstance): Promise<void> {
  const prisma = fastify.prisma as PrismaClient;
  const authMiddleware = new AuthMiddleware(prisma);
  const projectService = new ProjectService(prisma);

  /**
   * POST /api/v1/projects
   * Create a new project for the authenticated user
   */
  fastify.post<{
    Body: CreateProjectBody;
    Reply: ApiResponse<Project>;
  }>(
    '/projects',
    {
      preHandler: authMiddleware.requireAuth(),
      schema: {
        body: createProjectSchema,
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  userId: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: ['string', 'null'] },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                  isDefault: { type: 'boolean' },
                  conversationCount: { type: 'number' },
                  landingPageCount: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: CreateProjectBody }>,
      reply: FastifyReply
    ) => {
      try {
        const { user } = request;
        if (!user) {
          const response = createApiResponse(
            false,
            undefined,
            'Authentication required'
          );
          return reply.code(401).send(response);
        }

        const { name, description } = request.body;

        const createRequest: CreateProjectRequest = {
          name: name.trim(),
          description: description?.trim() || null,
        };

        const project = await projectService.createProject(
          user.id,
          createRequest
        );

        const response = createApiResponse(true, project);
        return reply.code(201).send(response);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to create project';

        if (errorMessage.includes('User not found')) {
          const response = createApiResponse(
            false,
            undefined,
            'User not found'
          );
          return reply.code(404).send(response);
        }

        const response = createApiResponse(false, undefined, errorMessage);
        return reply.code(400).send(response);
      }
    }
  );

  /**
   * GET /api/v1/projects
   * Get all projects for the authenticated user
   */
  fastify.get<{
    Reply: ApiResponse<ProjectListResponse>;
  }>(
    '/projects',
    {
      preHandler: authMiddleware.requireAuth(),
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  projects: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        userId: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: ['string', 'null'] },
                        createdAt: { type: 'string' },
                        updatedAt: { type: 'string' },
                        isDefault: { type: 'boolean' },
                        conversationCount: { type: 'number' },
                        landingPageCount: { type: 'number' },
                      },
                    },
                  },
                  totalCount: { type: 'number' },
                  activeProject: {
                    type: ['object', 'null'],
                    properties: {
                      id: { type: 'string' },
                      userId: { type: 'string' },
                      name: { type: 'string' },
                      description: { type: ['string', 'null'] },
                      createdAt: { type: 'string' },
                      updatedAt: { type: 'string' },
                      isDefault: { type: 'boolean' },
                      conversationCount: { type: 'number' },
                      landingPageCount: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { user } = request;
        if (!user) {
          const response = createApiResponse(
            false,
            undefined,
            'Authentication required'
          );
          return reply.code(401).send(response);
        }

        const [projects, activeProject] = await Promise.all([
          projectService.getUserProjects(user.id),
          projectService.getActiveProject(user.id),
        ]);

        const responseData: ProjectListResponse = {
          projects,
          totalCount: projects.length,
          activeProject,
        };

        const response = createApiResponse(true, responseData);
        return reply.code(200).send(response);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to get projects';

        if (errorMessage.includes('User not found')) {
          const response = createApiResponse(
            false,
            undefined,
            'User not found'
          );
          return reply.code(404).send(response);
        }

        const response = createApiResponse(false, undefined, errorMessage);
        return reply.code(500).send(response);
      }
    }
  );

  /**
   * GET /api/v1/projects/:projectId
   * Get a specific project by ID with authorization check
   */
  fastify.get<{
    Params: ProjectParams;
    Reply: ApiResponse<Project>;
  }>(
    '/projects/:projectId',
    {
      preHandler: authMiddleware.requireAuth(),
      schema: {
        params: projectParamsSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  userId: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: ['string', 'null'] },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                  isDefault: { type: 'boolean' },
                  conversationCount: { type: 'number' },
                  landingPageCount: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: ProjectParams }>,
      reply: FastifyReply
    ) => {
      try {
        const { user } = request;
        if (!user) {
          const response = createApiResponse(
            false,
            undefined,
            'Authentication required'
          );
          return reply.code(401).send(response);
        }

        const { projectId } = request.params;

        const project = await projectService.getProject(projectId, user.id);

        if (!project) {
          const response = createApiResponse(
            false,
            undefined,
            'Project not found or access denied'
          );
          return reply.code(404).send(response);
        }

        const response = createApiResponse(true, project);
        return reply.code(200).send(response);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to get project';

        const response = createApiResponse(false, undefined, errorMessage);
        return reply.code(500).send(response);
      }
    }
  );

  /**
   * PATCH /api/v1/projects/:projectId
   * Update a project with ownership validation
   */
  fastify.patch<{
    Params: ProjectParams;
    Body: UpdateProjectBody;
    Reply: ApiResponse<Project>;
  }>(
    '/projects/:projectId',
    {
      preHandler: authMiddleware.requireAuth(),
      schema: {
        params: projectParamsSchema,
        body: updateProjectSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  userId: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: ['string', 'null'] },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                  isDefault: { type: 'boolean' },
                  conversationCount: { type: 'number' },
                  landingPageCount: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: ProjectParams;
        Body: UpdateProjectBody;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { user } = request;
        if (!user) {
          const response = createApiResponse(
            false,
            undefined,
            'Authentication required'
          );
          return reply.code(401).send(response);
        }

        const { projectId } = request.params;
        const { name, description } = request.body;

        // Build update request
        const updateRequest: UpdateProjectRequest = {};
        if (name !== undefined) {
          updateRequest.name = name.trim();
        }
        if (description !== undefined) {
          updateRequest.description = description?.trim() || null;
        }

        const project = await projectService.updateProject(
          projectId,
          user.id,
          updateRequest
        );

        const response = createApiResponse(true, project);
        return reply.code(200).send(response);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to update project';

        if (errorMessage.includes('Project not found or access denied')) {
          const response = createApiResponse(
            false,
            undefined,
            'Project not found or access denied'
          );
          return reply.code(404).send(response);
        }

        const response = createApiResponse(false, undefined, errorMessage);
        return reply.code(400).send(response);
      }
    }
  );

  /**
   * DELETE /api/v1/projects/:projectId
   * Delete a project with ownership validation
   */
  fastify.delete<{
    Params: ProjectParams;
    Reply: ApiResponse<{ message: string }>;
  }>(
    '/projects/:projectId',
    {
      preHandler: authMiddleware.requireAuth(),
      schema: {
        params: projectParamsSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: ProjectParams }>,
      reply: FastifyReply
    ) => {
      try {
        const { user } = request;
        if (!user) {
          const response = createApiResponse(
            false,
            undefined,
            'Authentication required'
          );
          return reply.code(401).send(response);
        }

        const { projectId } = request.params;

        // Clean up sandbox for this project before deletion
        try {
          const { sandboxManager } = await import(
            '../services/sandboxManager.js'
          );
          const { logger } = await import('../lib/logger.js');

          // Get the project to check if it has a sandbox
          const projectWithSandbox = await prisma.project.findUnique({
            where: { id: projectId },
            select: {
              sandboxId: true,
              sandboxStatus: true,
              conversations: {
                select: { id: true },
                take: 1,
              },
            },
          });

          // If project has a sandbox, destroy it using any conversation from the project
          if (
            projectWithSandbox?.sandboxId &&
            projectWithSandbox.conversations.length > 0
          ) {
            try {
              await sandboxManager.destroySandbox(
                projectWithSandbox.sandboxId,
                user.id
              );
              logger.info('Cleaned up project sandbox', {
                projectId,
                sandboxId: projectWithSandbox.sandboxId,
              });
            } catch (sandboxError) {
              logger.warn('Failed to cleanup project sandbox', {
                projectId,
                sandboxId: projectWithSandbox.sandboxId,
                error:
                  sandboxError instanceof Error
                    ? sandboxError.message
                    : String(sandboxError),
              });
              // Continue cleanup even if sandbox deletion fails
            }
          }
        } catch (sandboxCleanupError) {
          // Log but don't fail the project deletion
          console.warn(
            'Error during sandbox cleanup for project deletion',
            sandboxCleanupError
          );
        }

        await projectService.deleteProject(projectId, user.id);

        const response = createApiResponse(true, {
          message: 'Project deleted successfully',
        });
        return reply.code(200).send(response);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to delete project';

        if (errorMessage.includes('Project not found or access denied')) {
          const response = createApiResponse(
            false,
            undefined,
            'Project not found or access denied'
          );
          return reply.code(404).send(response);
        }

        if (errorMessage.includes('Cannot delete default project')) {
          const response = createApiResponse(
            false,
            undefined,
            'Cannot delete default project'
          );
          return reply.code(400).send(response);
        }

        const response = createApiResponse(false, undefined, errorMessage);
        return reply.code(400).send(response);
      }
    }
  );

  /**
   * POST /api/v1/projects/:projectId/activate
   * Set a project as the active project for the user session
   */
  fastify.post<{
    Params: ProjectParams;
    Reply: ApiResponse<{ message: string; activeProject: Project }>;
  }>(
    '/projects/:projectId/activate',
    {
      preHandler: authMiddleware.requireAuth(),
      schema: {
        params: projectParamsSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  activeProject: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      userId: { type: 'string' },
                      name: { type: 'string' },
                      description: { type: ['string', 'null'] },
                      createdAt: { type: 'string' },
                      updatedAt: { type: 'string' },
                      isDefault: { type: 'boolean' },
                      conversationCount: { type: 'number' },
                      landingPageCount: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: ProjectParams }>,
      reply: FastifyReply
    ) => {
      try {
        const { user } = request;
        if (!user) {
          const response = createApiResponse(
            false,
            undefined,
            'Authentication required'
          );
          return reply.code(401).send(response);
        }

        const { projectId } = request.params;

        // Set active project
        await projectService.setActiveProject(user.id, projectId);

        // Get the activated project details
        const activeProject = await projectService.getProject(
          projectId,
          user.id
        );

        if (!activeProject) {
          const response = createApiResponse(
            false,
            undefined,
            'Project not found after activation'
          );
          return reply.code(500).send(response);
        }

        const response = createApiResponse(true, {
          message: 'Project activated successfully',
          activeProject,
        });
        return reply.code(200).send(response);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to activate project';

        if (errorMessage.includes('Project not found or access denied')) {
          const response = createApiResponse(
            false,
            undefined,
            'Project not found or access denied'
          );
          return reply.code(404).send(response);
        }

        const response = createApiResponse(false, undefined, errorMessage);
        return reply.code(400).send(response);
      }
    }
  );

  /**
   * GET /api/v1/projects/active
   * Get the currently active project for the user
   */
  fastify.get<{
    Reply: ApiResponse<Project | null>;
  }>(
    '/projects/active',
    {
      preHandler: authMiddleware.requireAuth(),
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: ['object', 'null'],
                properties: {
                  id: { type: 'string' },
                  userId: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: ['string', 'null'] },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                  isDefault: { type: 'boolean' },
                  conversationCount: { type: 'number' },
                  landingPageCount: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { user } = request;
        if (!user) {
          const response = createApiResponse(
            false,
            undefined,
            'Authentication required'
          );
          return reply.code(401).send(response);
        }

        const activeProject = await projectService.getActiveProject(user.id);

        const response = createApiResponse(true, activeProject);
        return reply.code(200).send(response);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to get active project';

        const response = createApiResponse(false, undefined, errorMessage);
        return reply.code(500).send(response);
      }
    }
  );

  /**
   * GET /api/v1/projects/:projectId/conversations
   * Get all conversations for a specific project
   */
  fastify.get<{
    Params: ProjectParams;
    Reply: ApiResponse<{ conversations: any[]; totalCount: number }>;
  }>(
    '/projects/:projectId/conversations',
    {
      preHandler: authMiddleware.requireAuth(),
      schema: {
        params: projectParamsSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  conversations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        projectId: { type: 'string' },
                        userId: { type: 'string' },
                        title: { type: 'string' },
                        startTime: { type: 'string' },
                        lastUpdateTime: { type: 'string' },
                        lastAccessedAt: { type: 'string' },
                        isArchived: { type: 'boolean' },
                        messageCount: { type: 'number' },
                      },
                    },
                  },
                  totalCount: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: ProjectParams }>,
      reply: FastifyReply
    ) => {
      try {
        const { user } = request;
        if (!user) {
          const response = createApiResponse(
            false,
            undefined,
            'Authentication required'
          );
          return reply.code(401).send(response);
        }

        const { projectId } = request.params;

        // Verify project access
        const project = await projectService.getProject(projectId, user.id);
        if (!project) {
          const response = createApiResponse(
            false,
            undefined,
            'Project not found or access denied'
          );
          return reply.code(404).send(response);
        }

        // Get conversations for the project
        const conversations = await prisma.conversation.findMany({
          where: {
            projectId,
            userId: user.id,
          },
          include: {
            _count: {
              select: {
                messages: true,
              },
            },
          },
          orderBy: [
            { isArchived: 'asc' }, // Non-archived first
            { lastAccessedAt: 'desc' }, // Most recently accessed first
          ],
        });

        const conversationData = conversations.map(conv => ({
          id: conv.id,
          projectId: conv.projectId,
          userId: conv.userId,
          title: conv.title,
          startTime: conv.startTime,
          lastUpdateTime: conv.lastUpdateTime,
          lastAccessedAt: conv.lastAccessedAt,
          isArchived: conv.isArchived,
          messageCount: conv._count.messages,
        }));

        const response = createApiResponse(true, {
          conversations: conversationData,
          totalCount: conversations.length,
        });
        return reply.code(200).send(response);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to get project conversations';

        const response = createApiResponse(false, undefined, errorMessage);
        return reply.code(500).send(response);
      }
    }
  );

  /**
   * GET /api/v1/projects/:projectId/landing-pages
   * Get all landing pages for a specific project
   */
  fastify.get<{
    Params: ProjectParams;
    Reply: ApiResponse<{ landingPages: any[]; totalCount: number }>;
  }>(
    '/projects/:projectId/landing-pages',
    {
      preHandler: authMiddleware.requireAuth(),
      schema: {
        params: projectParamsSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  landingPages: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        projectId: { type: 'string' },
                        userId: { type: 'string' },
                        title: { type: 'string' },
                        description: { type: ['string', 'null'] },
                        githubRepoUrl: { type: 'string' },
                        currentVersionId: { type: ['string', 'null'] },
                        createdAt: { type: 'string' },
                        updatedAt: { type: 'string' },
                        versionCount: { type: 'number' },
                      },
                    },
                  },
                  totalCount: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: ProjectParams }>,
      reply: FastifyReply
    ) => {
      try {
        const { user } = request;
        if (!user) {
          const response = createApiResponse(
            false,
            undefined,
            'Authentication required'
          );
          return reply.code(401).send(response);
        }

        const { projectId } = request.params;

        // Verify project access
        const project = await projectService.getProject(projectId, user.id);
        if (!project) {
          const response = createApiResponse(
            false,
            undefined,
            'Project not found or access denied'
          );
          return reply.code(404).send(response);
        }

        // Get landing pages for the project
        const landingPages = await prisma.landingPage.findMany({
          where: {
            projectId,
            userId: user.id,
          },
          include: {
            _count: {
              select: {
                versions: true,
              },
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
        });

        const landingPageData = landingPages.map(page => ({
          id: page.id,
          projectId: page.projectId,
          userId: page.userId,
          title: page.title,
          description: page.description,
          githubRepoUrl: page.githubRepoUrl,
          currentVersionId: page.currentVersionId,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
          versionCount: page._count.versions,
        }));

        const response = createApiResponse(true, {
          landingPages: landingPageData,
          totalCount: landingPages.length,
        });
        return reply.code(200).send(response);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to get project landing pages';

        const response = createApiResponse(false, undefined, errorMessage);
        return reply.code(500).send(response);
      }
    }
  );

  /**
   * POST /api/v1/projects/:projectId/revert
   * Revert project to a specific commit
   */
  fastify.post<{
    Params: ProjectParams;
    Body: { commitSha: string; conversationId: string };
    Reply: ApiResponse<{
      success: boolean;
      message: string;
      hasConflicts: boolean;
    }>;
  }>(
    '/projects/:projectId/revert',
    {
      preHandler: authMiddleware.requireAuth(),
      schema: {
        params: projectParamsSchema,
        body: {
          type: 'object',
          required: ['commitSha', 'conversationId'],
          properties: {
            commitSha: { type: 'string' },
            conversationId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  message: { type: 'string' },
                  hasConflicts: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: ProjectParams;
        Body: { commitSha: string; conversationId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { user } = request;
        if (!user) {
          const response = createApiResponse(
            false,
            undefined,
            'Authentication required'
          );
          return reply.code(401).send(response);
        }

        const { projectId } = request.params;
        const { commitSha, conversationId } = request.body;

        // Verify project access
        const project = await projectService.getProject(projectId, user.id);
        if (!project) {
          const response = createApiResponse(
            false,
            undefined,
            'Project not found or access denied'
          );
          return reply.code(404).send(response);
        }

        // Revert project using GitHub sync service
        const { getGitHubSyncService } = await import(
          '../services/githubSync.js'
        );
        const githubSync = getGitHubSyncService();
        const result = await githubSync.revertProjectToCommit(
          projectId,
          commitSha,
          conversationId
        );

        const response = createApiResponse(true, result);
        return reply.code(200).send(response);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to revert project';

        const response = createApiResponse(false, undefined, errorMessage);
        return reply.code(500).send(response);
      }
    }
  );

  /**
   * GET /api/v1/projects/:projectId/commits
   * Get git commit history for a project
   */
  fastify.get<{
    Params: ProjectParams;
    Reply: ApiResponse<{
      commits: Array<{
        sha: string;
        message: string;
        author: string;
        date: string;
        timestamp: number;
      }>;
    }>;
  }>(
    '/projects/:projectId/commits',
    {
      preHandler: authMiddleware.requireAuth(),
      schema: {
        params: projectParamsSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  commits: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        sha: { type: 'string' },
                        message: { type: 'string' },
                        author: { type: 'string' },
                        date: { type: 'string' },
                        timestamp: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: ProjectParams }>,
      reply: FastifyReply
    ) => {
      try {
        const { user } = request;
        if (!user) {
          const response = createApiResponse(
            false,
            undefined,
            'Authentication required'
          );
          return reply.code(401).send(response);
        }

        const { projectId } = request.params;

        // Verify project access
        const project = await projectService.getProject(projectId, user.id);
        if (!project) {
          const response = createApiResponse(
            false,
            undefined,
            'Project not found or access denied'
          );
          return reply.code(404).send(response);
        }

        // Get commit history from GitHub sync service
        const { getGitHubSyncService } = await import(
          '../services/githubSync.js'
        );
        const githubSync = getGitHubSyncService();
        const commits = await githubSync.getProjectCommitHistory(projectId);

        const response = createApiResponse(true, { commits });
        return reply.code(200).send(response);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to get commit history';

        const response = createApiResponse(false, undefined, errorMessage);
        return reply.code(500).send(response);
      }
    }
  );

  /**
   * GET /api/v1/projects/statistics
   * Get project statistics and summary for the user
   */
  fastify.get<{
    Reply: ApiResponse<ProjectStatsResponse>;
  }>(
    '/projects/statistics',
    {
      preHandler: authMiddleware.requireAuth(),
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  totalProjects: { type: 'number' },
                  totalConversations: { type: 'number' },
                  totalLandingPages: { type: 'number' },
                  activeProject: {
                    type: ['object', 'null'],
                    properties: {
                      id: { type: 'string' },
                      userId: { type: 'string' },
                      name: { type: 'string' },
                      description: { type: ['string', 'null'] },
                      createdAt: { type: 'string' },
                      updatedAt: { type: 'string' },
                      isDefault: { type: 'boolean' },
                      conversationCount: { type: 'number' },
                      landingPageCount: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { user } = request;
        if (!user) {
          const response = createApiResponse(
            false,
            undefined,
            'Authentication required'
          );
          return reply.code(401).send(response);
        }

        const statistics = await projectService.getProjectStatistics(user.id);

        const response = createApiResponse(true, statistics);
        return reply.code(200).send(response);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to get project statistics';

        const response = createApiResponse(false, undefined, errorMessage);
        return reply.code(500).send(response);
      }
    }
  );
}
