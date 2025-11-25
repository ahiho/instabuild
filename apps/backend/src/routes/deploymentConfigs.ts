import { ApiResponse, createApiResponse } from '@instabuild/shared';
import { PrismaClient, DeploymentConfig } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { AuthMiddleware } from '../middleware/auth.js';
import {
  DeploymentConfigService,
  CreateConfigDto,
  UpdateConfigDto,
} from '../services/deploymentConfigService.js';

// Request/Response type definitions
interface ProjectParams {
  projectId: string;
}

interface ConfigParams {
  projectId: string;
  configId: string;
}

interface ConfigListResponse {
  configs: DeploymentConfig[];
}

// Validation schemas
const createConfigSchema = {
  type: 'object',
  required: ['accountId', 'type'],
  properties: {
    accountId: {
      type: 'string',
      minLength: 1,
    },
    type: {
      type: 'string',
      enum: ['GITHUB_PAGES', 'CLOUDFLARE_PAGES'],
    },
    githubRepo: {
      type: 'string',
    },
    githubBranch: {
      type: 'string',
    },
    cloudflareProjectName: {
      type: 'string',
    },
    cloudflareBranch: {
      type: 'string',
    },
  },
  additionalProperties: false,
};

const updateConfigSchema = {
  type: 'object',
  properties: {
    githubRepo: {
      type: 'string',
    },
    githubBranch: {
      type: 'string',
    },
    cloudflareProjectName: {
      type: 'string',
    },
    cloudflareBranch: {
      type: 'string',
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

const configParamsSchema = {
  type: 'object',
  required: ['projectId', 'configId'],
  properties: {
    projectId: {
      type: 'string',
      minLength: 1,
    },
    configId: {
      type: 'string',
      minLength: 1,
    },
  },
};

export async function deploymentConfigRoutes(
  fastify: FastifyInstance
): Promise<void> {
  const prisma = fastify.prisma as PrismaClient;
  const authMiddleware = new AuthMiddleware(prisma);
  const configService = new DeploymentConfigService(prisma);

  /**
   * GET /api/v1/projects/:projectId/deployments
   * List deployment configurations for a project
   */
  fastify.get<{
    Params: ProjectParams;
    Reply: ApiResponse<ConfigListResponse>;
  }>(
    '/projects/:projectId/deployments',
    {
      preHandler: authMiddleware.requireAuth(),
      schema: {
        params: projectParamsSchema,
      },
    },
    async (request, reply) => {
      try {
        const { user } = request;
        if (!user) {
          return reply
            .code(401)
            .send(createApiResponse(false, undefined, 'Unauthorized'));
        }

        const { projectId } = request.params;

        const configs = await configService.getConfigs(projectId, user.id);

        return reply.send(createApiResponse(true, { configs }));
      } catch (error) {
        console.error('Error listing deployment configs:', error);
        const statusCode =
          error instanceof Error && error.message.includes('not found')
            ? 404
            : 500;
        return reply
          .code(statusCode)
          .send(
            createApiResponse(
              false,
              undefined,
              error instanceof Error
                ? error.message
                : 'Failed to list deployment configurations'
            )
          );
      }
    }
  );

  /**
   * POST /api/v1/projects/:projectId/deployments
   * Create a new deployment configuration
   */
  fastify.post<{
    Params: ProjectParams;
    Body: CreateConfigDto;
    Reply: ApiResponse<DeploymentConfig>;
  }>(
    '/projects/:projectId/deployments',
    {
      preHandler: authMiddleware.requireAuth(),
      schema: {
        params: projectParamsSchema,
        body: createConfigSchema,
      },
    },
    async (request, reply) => {
      try {
        const { user } = request;
        if (!user) {
          return reply
            .code(401)
            .send(createApiResponse(false, undefined, 'Unauthorized'));
        }

        const { projectId } = request.params;
        const configData = request.body;

        const config = await configService.createConfig(
          projectId,
          user.id,
          configData
        );

        return reply.code(201).send(createApiResponse(true, config));
      } catch (error) {
        console.error('Error creating deployment config:', error);
        const statusCode =
          error instanceof Error && error.message.includes('not found')
            ? 404
            : 400;
        return reply
          .code(statusCode)
          .send(
            createApiResponse(
              false,
              undefined,
              error instanceof Error
                ? error.message
                : 'Failed to create deployment configuration'
            )
          );
      }
    }
  );

  /**
   * PATCH /api/v1/projects/:projectId/deployments/:configId
   * Update a deployment configuration
   */
  fastify.patch<{
    Params: ConfigParams;
    Body: UpdateConfigDto;
    Reply: ApiResponse<DeploymentConfig>;
  }>(
    '/projects/:projectId/deployments/:configId',
    {
      preHandler: authMiddleware.requireAuth(),
      schema: {
        params: configParamsSchema,
        body: updateConfigSchema,
      },
    },
    async (request, reply) => {
      try {
        const { user } = request;
        if (!user) {
          return reply
            .code(401)
            .send(createApiResponse(false, undefined, 'Unauthorized'));
        }

        const { configId } = request.params;
        const updateData = request.body;

        const config = await configService.updateConfig(
          configId,
          user.id,
          updateData
        );

        return reply.send(createApiResponse(true, config));
      } catch (error) {
        console.error('Error updating deployment config:', error);
        const statusCode =
          error instanceof Error && error.message.includes('not found')
            ? 404
            : 400;
        return reply
          .code(statusCode)
          .send(
            createApiResponse(
              false,
              undefined,
              error instanceof Error
                ? error.message
                : 'Failed to update deployment configuration'
            )
          );
      }
    }
  );

  /**
   * DELETE /api/v1/projects/:projectId/deployments/:configId
   * Delete a deployment configuration
   */
  fastify.delete<{
    Params: ConfigParams;
    Reply: ApiResponse<{ message: string }>;
  }>(
    '/projects/:projectId/deployments/:configId',
    {
      preHandler: authMiddleware.requireAuth(),
      schema: {
        params: configParamsSchema,
      },
    },
    async (request, reply) => {
      try {
        const { user } = request;
        if (!user) {
          return reply
            .code(401)
            .send(createApiResponse(false, undefined, 'Unauthorized'));
        }

        const { configId } = request.params;

        await configService.deleteConfig(configId, user.id);

        return reply.send(
          createApiResponse(true, {
            message: 'Deployment configuration deleted',
          })
        );
      } catch (error) {
        console.error('Error deleting deployment config:', error);
        const statusCode =
          error instanceof Error && error.message.includes('not found')
            ? 404
            : 500;
        return reply
          .code(statusCode)
          .send(
            createApiResponse(
              false,
              undefined,
              error instanceof Error
                ? error.message
                : 'Failed to delete deployment configuration'
            )
          );
      }
    }
  );
}
