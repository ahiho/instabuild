import { ApiResponse, createApiResponse } from '@instabuild/shared';
import { PrismaClient, DeploymentAccount } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { AuthMiddleware } from '../middleware/auth.js';
import { DeploymentAccountService } from '../services/deploymentAccountService.js';

// Request/Response type definitions
interface ConnectGitHubBody {
  code: string;
  state: string;
}

interface ConnectCloudflareBody {
  apiToken: string;
}

interface AccountParams {
  accountId: string;
}

interface AccountListResponse {
  accounts: DeploymentAccount[];
}

// Validation schemas
const connectGitHubSchema = {
  type: 'object',
  required: ['code', 'state'],
  properties: {
    code: {
      type: 'string',
      minLength: 1,
    },
    state: {
      type: 'string',
      minLength: 1,
    },
  },
  additionalProperties: false,
};

const connectCloudflareSchema = {
  type: 'object',
  required: ['apiToken'],
  properties: {
    apiToken: {
      type: 'string',
      minLength: 1,
    },
  },
  additionalProperties: false,
};

const accountParamsSchema = {
  type: 'object',
  required: ['accountId'],
  properties: {
    accountId: {
      type: 'string',
      minLength: 1,
    },
  },
};

export async function deploymentAccountRoutes(
  fastify: FastifyInstance
): Promise<void> {
  const prisma = fastify.prisma as PrismaClient;
  const authMiddleware = new AuthMiddleware(prisma);
  const accountService = new DeploymentAccountService(prisma);

  /**
   * POST /api/v1/deployment-accounts/github/connect
   * Connect GitHub account via OAuth
   */
  fastify.post<{
    Body: ConnectGitHubBody;
    Reply: ApiResponse<DeploymentAccount>;
  }>(
    '/deployment-accounts/github/connect',
    {
      preHandler: authMiddleware.requireAuth(),
      schema: {
        body: connectGitHubSchema,
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

        const { code, state } = request.body;

        const account = await accountService.connectGitHubAccount(
          user.id,
          code,
          state
        );

        return reply.code(201).send(createApiResponse(true, account));
      } catch (error) {
        console.error('Error connecting GitHub account:', error);
        return reply
          .code(500)
          .send(
            createApiResponse(
              false,
              undefined,
              error instanceof Error
                ? error.message
                : 'Failed to connect GitHub account'
            )
          );
      }
    }
  );

  /**
   * POST /api/v1/deployment-accounts/cloudflare/connect
   * Connect Cloudflare account via API token
   */
  fastify.post<{
    Body: ConnectCloudflareBody;
    Reply: ApiResponse<DeploymentAccount>;
  }>(
    '/deployment-accounts/cloudflare/connect',
    {
      preHandler: authMiddleware.requireAuth(),
      schema: {
        body: connectCloudflareSchema,
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

        const { apiToken } = request.body;

        const account = await accountService.connectCloudflareAccount(
          user.id,
          apiToken
        );

        return reply.code(201).send(createApiResponse(true, account));
      } catch (error) {
        console.error('Error connecting Cloudflare account:', error);
        return reply
          .code(500)
          .send(
            createApiResponse(
              false,
              undefined,
              error instanceof Error
                ? error.message
                : 'Failed to connect Cloudflare account'
            )
          );
      }
    }
  );

  /**
   * GET /api/v1/deployment-accounts
   * List all connected deployment accounts
   */
  fastify.get<{
    Reply: ApiResponse<AccountListResponse>;
  }>(
    '/deployment-accounts',
    {
      preHandler: authMiddleware.requireAuth(),
    },
    async (request, reply) => {
      try {
        const { user } = request;
        if (!user) {
          return reply
            .code(401)
            .send(createApiResponse(false, undefined, 'Unauthorized'));
        }

        const accounts = await accountService.getAccounts(user.id);

        return reply.send(createApiResponse(true, { accounts }));
      } catch (error) {
        console.error('Error listing deployment accounts:', error);
        return reply
          .code(500)
          .send(
            createApiResponse(
              false,
              undefined,
              error instanceof Error ? error.message : 'Failed to list accounts'
            )
          );
      }
    }
  );

  /**
   * DELETE /api/v1/deployment-accounts/:accountId
   * Disconnect a deployment account
   */
  fastify.delete<{
    Params: AccountParams;
    Reply: ApiResponse<{ message: string }>;
  }>(
    '/deployment-accounts/:accountId',
    {
      preHandler: authMiddleware.requireAuth(),
      schema: {
        params: accountParamsSchema,
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

        const { accountId } = request.params;

        await accountService.disconnectAccount(user.id, accountId);

        return reply.send(
          createApiResponse(true, {
            message: 'Account disconnected successfully',
          })
        );
      } catch (error) {
        console.error('Error disconnecting deployment account:', error);
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
                : 'Failed to disconnect account'
            )
          );
      }
    }
  );
}
