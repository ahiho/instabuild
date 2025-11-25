import { ApiResponse, createApiResponse } from '@instabuild/shared';
import { PrismaClient } from '@prisma/client';
import {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  preHandlerHookHandler,
} from 'fastify';
import { AuthenticationService } from '../services/authentication.js';

// Request/Response type definitions
interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: string;
  emailVerified: boolean;
  provider: string;
  createdAt: Date;
  lastLoginAt: Date | null;
  preferences?: any;
}

interface UpdateProfileBody {
  displayName?: string;
  preferences?: any;
}

interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

interface UsageStats {
  conversationsCount: number;
  projectsCount: number;
  messagesCount: number;
  lastActivity: Date | null;
  accountAge: number; // days since account creation
}

// Validation schemas
const updateProfileSchema = {
  type: 'object',
  properties: {
    displayName: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
    },
    preferences: {
      type: 'object',
    },
  },
  additionalProperties: false,
};

const changePasswordSchema = {
  type: 'object',
  required: ['currentPassword', 'newPassword'],
  properties: {
    currentPassword: {
      type: 'string',
      minLength: 1,
      maxLength: 128,
    },
    newPassword: {
      type: 'string',
      minLength: 8,
      maxLength: 128,
    },
  },
  additionalProperties: false,
};

// Authentication middleware
function requireAuth(): preHandlerHookHandler {
  return async (request, reply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response = createApiResponse(
        false,
        null,
        'Authentication required'
      );
      return reply.code(401).send(response);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const prisma = (request.server as any).prisma as PrismaClient;
    const authService = new AuthenticationService(prisma);

    const user = await authService.validateSession(token);
    if (!user) {
      const response = createApiResponse(
        false,
        null,
        'Invalid or expired token'
      );
      return reply.code(401).send(response);
    }

    // Add user to request context
    (request as any).user = user;
  };
}

export async function usersRoutes(fastify: FastifyInstance): Promise<void> {
  const prisma = fastify.prisma as PrismaClient;
  const authService = new AuthenticationService(prisma);

  /**
   * GET /api/v1/users/profile
   * Get current user's profile information
   */
  fastify.get<{
    Reply: ApiResponse<UserProfile>;
  }>(
    '/users/profile',
    {
      preHandler: requireAuth(),
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  displayName: { type: 'string' },
                  role: { type: 'string' },
                  emailVerified: { type: 'boolean' },
                  provider: { type: 'string' },
                  createdAt: { type: 'string' },
                  lastLoginAt: { type: ['string', 'null'] },
                  preferences: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;

        // Get full user profile from database
        const userProfile = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
            emailVerified: true,
            provider: true,
            createdAt: true,
            lastLoginAt: true,
            preferences: true,
          },
        });

        if (!userProfile) {
          const response = createApiResponse(false, null, 'User not found');
          return reply.code(404).send(response);
        }

        const response = createApiResponse(true, userProfile as UserProfile);
        return reply.code(200).send(response);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to get user profile';
        const response = createApiResponse(false, null, errorMessage);
        return reply.code(500).send(response);
      }
    }
  );

  /**
   * PATCH /api/v1/users/profile
   * Update current user's profile information
   */
  fastify.patch<{
    Body: UpdateProfileBody;
    Reply: ApiResponse<UserProfile>;
  }>(
    '/users/profile',
    {
      preHandler: requireAuth(),
      schema: {
        body: updateProfileSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  displayName: { type: 'string' },
                  role: { type: 'string' },
                  emailVerified: { type: 'boolean' },
                  provider: { type: 'string' },
                  createdAt: { type: 'string' },
                  lastLoginAt: { type: ['string', 'null'] },
                  preferences: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: UpdateProfileBody }>,
      reply: FastifyReply
    ) => {
      try {
        const user = (request as any).user;
        const { displayName, preferences } = request.body;

        // Build update data
        const updateData: any = {};
        if (displayName !== undefined) {
          updateData.displayName = displayName.trim();
        }
        if (preferences !== undefined) {
          updateData.preferences = preferences;
        }

        // Update user profile
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
            emailVerified: true,
            provider: true,
            createdAt: true,
            lastLoginAt: true,
            preferences: true,
          },
        });

        const response = createApiResponse(true, updatedUser as UserProfile);
        return reply.code(200).send(response);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to update user profile';
        const response = createApiResponse(false, null, errorMessage);
        return reply.code(400).send(response);
      }
    }
  );

  /**
   * POST /api/v1/users/change-password
   * Change user's password (for local accounts only)
   */
  fastify.post<{
    Body: ChangePasswordBody;
    Reply: ApiResponse<{ message: string }>;
  }>(
    '/users/change-password',
    {
      preHandler: requireAuth(),
      schema: {
        body: changePasswordSchema,
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
      request: FastifyRequest<{ Body: ChangePasswordBody }>,
      reply: FastifyReply
    ) => {
      try {
        const user = (request as any).user;
        const { currentPassword, newPassword } = request.body;

        // Check if user has a local account (not OAuth)
        const userRecord = await prisma.user.findUnique({
          where: { id: user.id },
          select: { provider: true, passwordHash: true },
        });

        if (!userRecord) {
          const response = createApiResponse(false, null, 'User not found');
          return reply.code(404).send(response);
        }

        if (userRecord.provider !== 'local' || !userRecord.passwordHash) {
          const response = createApiResponse(
            false,
            null,
            'Password change not available for OAuth accounts'
          );
          return reply.code(400).send(response);
        }

        // Change password using authentication service
        await authService.changePassword(user.id, currentPassword, newPassword);

        const response = createApiResponse(true, {
          message: 'Password changed successfully',
        });
        return reply.code(200).send(response);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to change password';

        if (errorMessage.includes('Current password is incorrect')) {
          const response = createApiResponse(
            false,
            null,
            'Current password is incorrect'
          );
          return reply.code(400).send(response);
        }

        const response = createApiResponse(false, null, errorMessage);
        return reply.code(400).send(response);
      }
    }
  );

  /**
   * GET /api/v1/users/usage
   * Get current user's usage statistics
   */
  fastify.get<{
    Reply: ApiResponse<UsageStats>;
  }>(
    '/users/usage',
    {
      preHandler: requireAuth(),
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  conversationsCount: { type: 'number' },
                  projectsCount: { type: 'number' },
                  messagesCount: { type: 'number' },
                  lastActivity: { type: ['string', 'null'] },
                  accountAge: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;

        // Get user's usage statistics
        const [conversationsCount, projectsCount, messagesCount, userRecord] =
          await Promise.all([
            prisma.conversation.count({
              where: { userId: user.id },
            }),
            prisma.project.count({
              where: { userId: user.id },
            }),
            prisma.chatMessage.count({
              where: { userId: user.id },
            }),
            prisma.user.findUnique({
              where: { id: user.id },
              select: { createdAt: true, lastLoginAt: true },
            }),
          ]);

        if (!userRecord) {
          const response = createApiResponse(false, null, 'User not found');
          return reply.code(404).send(response);
        }

        // Calculate account age in days
        const accountAge = Math.floor(
          (Date.now() - userRecord.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        const usageStats: UsageStats = {
          conversationsCount,
          projectsCount,
          messagesCount,
          lastActivity: userRecord.lastLoginAt,
          accountAge,
        };

        const response = createApiResponse(true, usageStats);
        return reply.code(200).send(response);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to get usage statistics';
        const response = createApiResponse(false, null, errorMessage);
        return reply.code(500).send(response);
      }
    }
  );

  /**
   * DELETE /api/v1/users/account
   * Delete current user's account and all associated data
   */
  fastify.delete<{
    Reply: ApiResponse<{ message: string }>;
  }>(
    '/users/account',
    {
      preHandler: requireAuth(),
      schema: {
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
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;

        // Delete user account and all associated data (cascading deletes handled by Prisma)
        await prisma.user.delete({
          where: { id: user.id },
        });

        const response = createApiResponse(true, {
          message: 'Account deleted successfully',
        });
        return reply.code(200).send(response);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to delete account';
        const response = createApiResponse(false, null, errorMessage);
        return reply.code(500).send(response);
      }
    }
  );
}
