import { ApiResponse, createApiResponse } from '@instabuild/shared';
import { PrismaClient, DeploymentHistory } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { AuthMiddleware } from '../middleware/auth.js';
import {
  DeploymentExecutionService,
  DeploymentProgress,
} from '../services/deploymentExecutionService.js';

// Request/Response type definitions
interface TriggerDeploymentParams {
  projectId: string;
  configId: string;
}

interface DeploymentParams {
  deploymentId: string;
}

interface HistoryParams {
  projectId: string;
}

interface HistoryQuery {
  limit?: number;
  offset?: number;
}

interface HistoryResponse {
  deployments: DeploymentHistory[];
  total: number;
}

// Validation schemas
const triggerDeploymentParamsSchema = {
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

const deploymentParamsSchema = {
  type: 'object',
  required: ['deploymentId'],
  properties: {
    deploymentId: {
      type: 'string',
      minLength: 1,
    },
  },
};

const historyParamsSchema = {
  type: 'object',
  required: ['projectId'],
  properties: {
    projectId: {
      type: 'string',
      minLength: 1,
    },
  },
};

const historyQuerySchema = {
  type: 'object',
  properties: {
    limit: {
      type: 'number',
      minimum: 1,
      maximum: 100,
      default: 20,
    },
    offset: {
      type: 'number',
      minimum: 0,
      default: 0,
    },
  },
};

export async function deploymentRoutes(
  fastify: FastifyInstance
): Promise<void> {
  const prisma = fastify.prisma as PrismaClient;
  const authMiddleware = new AuthMiddleware(prisma);
  const executionService = new DeploymentExecutionService(prisma);

  /**
   * POST /api/v1/projects/:projectId/deployments/:configId/deploy
   * Trigger a new deployment
   */
  fastify.post<{
    Params: TriggerDeploymentParams;
    Reply: ApiResponse<DeploymentHistory>;
  }>(
    '/projects/:projectId/deployments/:configId/deploy',
    {
      preHandler: authMiddleware.requireAuth(),
      schema: {
        params: triggerDeploymentParamsSchema,
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

        const { projectId, configId } = request.params;

        const deployment = await executionService.triggerDeployment(
          projectId,
          configId,
          user.id
        );

        return reply.code(202).send(createApiResponse(true, deployment));
      } catch (error) {
        console.error('Error triggering deployment:', error);
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
                : 'Failed to trigger deployment'
            )
          );
      }
    }
  );

  /**
   * GET /api/v1/deployments/:deploymentId/status
   * Get real-time deployment status
   */
  fastify.get<{
    Params: DeploymentParams;
    Reply: ApiResponse<DeploymentProgress>;
  }>(
    '/deployments/:deploymentId/status',
    {
      preHandler: authMiddleware.requireAuth(),
      schema: {
        params: deploymentParamsSchema,
      },
    },
    async (request, reply) => {
      try {
        const { deploymentId } = request.params;

        const status = await executionService.getStatus(deploymentId);

        return reply.send(createApiResponse(true, status));
      } catch (error) {
        console.error('Error getting deployment status:', error);
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
                : 'Failed to get deployment status'
            )
          );
      }
    }
  );

  /**
   * GET /api/v1/deployments/:deploymentId/logs
   * Get deployment logs (for now, returns all logs - could be upgraded to SSE)
   */
  fastify.get<{
    Params: DeploymentParams;
    Reply: ApiResponse<{ logs: string }>;
  }>(
    '/deployments/:deploymentId/logs',
    {
      preHandler: authMiddleware.requireAuth(),
      schema: {
        params: deploymentParamsSchema,
      },
    },
    async (request, reply) => {
      try {
        const { deploymentId } = request.params;

        const deployment = await prisma.deploymentHistory.findUnique({
          where: { id: deploymentId },
          select: { buildLogs: true },
        });

        if (!deployment) {
          return reply
            .code(404)
            .send(createApiResponse(false, undefined, 'Deployment not found'));
        }

        return reply.send(
          createApiResponse(true, { logs: deployment.buildLogs })
        );
      } catch (error) {
        console.error('Error getting deployment logs:', error);
        return reply
          .code(500)
          .send(
            createApiResponse(
              false,
              undefined,
              error instanceof Error
                ? error.message
                : 'Failed to get deployment logs'
            )
          );
      }
    }
  );

  /**
   * GET /api/v1/projects/:projectId/deployments/history
   * Get deployment history for a project
   */
  fastify.get<{
    Params: HistoryParams;
    Querystring: HistoryQuery;
    Reply: ApiResponse<HistoryResponse>;
  }>(
    '/projects/:projectId/deployments/history',
    {
      preHandler: authMiddleware.requireAuth(),
      schema: {
        params: historyParamsSchema,
        querystring: historyQuerySchema,
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
        const { limit = 20, offset = 0 } = request.query;

        const result = await executionService.getHistory(
          projectId,
          user.id,
          limit,
          offset
        );

        return reply.send(createApiResponse(true, result));
      } catch (error) {
        console.error('Error getting deployment history:', error);
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
                : 'Failed to get deployment history'
            )
          );
      }
    }
  );

  /**
   * POST /api/v1/deployments/:deploymentId/retry
   * Retry a failed deployment
   */
  fastify.post<{
    Params: DeploymentParams;
    Reply: ApiResponse<DeploymentHistory>;
  }>(
    '/deployments/:deploymentId/retry',
    {
      preHandler: authMiddleware.requireAuth(),
      schema: {
        params: deploymentParamsSchema,
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

        const { deploymentId } = request.params;

        const newDeployment = await executionService.retryDeployment(
          deploymentId,
          user.id
        );

        return reply.code(202).send(createApiResponse(true, newDeployment));
      } catch (error) {
        console.error('Error retrying deployment:', error);
        const statusCode =
          error instanceof Error && error.message.includes('not found')
            ? 404
            : error instanceof Error && error.message.includes('Unauthorized')
              ? 403
              : 400;
        return reply
          .code(statusCode)
          .send(
            createApiResponse(
              false,
              undefined,
              error instanceof Error
                ? error.message
                : 'Failed to retry deployment'
            )
          );
      }
    }
  );
}
