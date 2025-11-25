import { PrismaClient } from '@prisma/client';
import { preHandlerHookHandler } from 'fastify';
import { ProjectService } from '../services/projectService.js';
import {
  AuthenticatedRequest,
  AuthenticatedUser,
  AuthErrorCode,
} from './auth.js';

export type UserRole = 'admin' | 'user' | 'guest';

export interface AuthorizedRequest extends AuthenticatedRequest {
  user: AuthenticatedUser; // Required for authorization
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

export interface AuthorizationError extends Error {
  code: AuthErrorCode;
  statusCode: number;
  details?: any;
}

export class AuthorizationMiddleware {
  private projectService: ProjectService;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.projectService = new ProjectService(prisma);
  }

  /**
   * Require specific user role
   */
  requireRole(requiredRole: UserRole): preHandlerHookHandler {
    return async (request, reply) => {
      if (!request.user) {
        reply.code(401).send({
          error: AuthErrorCode.UNAUTHORIZED_ACCESS,
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const userRole = request.user.role as UserRole;

      // Role hierarchy: admin > user > guest
      const roleHierarchy: Record<UserRole, number> = {
        admin: 3,
        user: 2,
        guest: 1,
      };

      const userRoleLevel = roleHierarchy[userRole] || 0;
      const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

      if (userRoleLevel < requiredRoleLevel) {
        reply.code(403).send({
          error: AuthErrorCode.INSUFFICIENT_PERMISSIONS,
          message: `${requiredRole} role required`,
          details: { userRole, requiredRole },
          timestamp: new Date().toISOString(),
        });
      }
    };
  }

  /**
   * Require admin role
   */
  requireAdmin() {
    return this.requireRole('admin');
  }

  /**
   * Require user role or higher (excludes guests)
   */
  requireUser() {
    return this.requireRole('user');
  }

  /**
   * Validate project access by project ID parameter
   */
  requireProjectAccess(
    projectIdParam: string = 'projectId'
  ): preHandlerHookHandler {
    return async (request, reply) => {
      if (!request.user) {
        reply.code(401).send({
          error: AuthErrorCode.UNAUTHORIZED_ACCESS,
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const projectId = (request.params as any)[projectIdParam];
      if (!projectId) {
        reply.code(400).send({
          error: 'BAD_REQUEST',
          message: `Missing ${projectIdParam} parameter`,
          timestamp: new Date().toISOString(),
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
            error: AuthErrorCode.PROJECT_NOT_FOUND,
            message: 'Project not found or access denied',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Inject project into request for downstream handlers
        (request as AuthorizedRequest).project = project;
      } catch (error) {
        console.error('Failed to validate project access:', error);
        reply.code(500).send({
          error: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to validate project access',
          timestamp: new Date().toISOString(),
        });
      }
    };
  }

  /**
   * Validate conversation ownership and inject project context
   */
  requireConversationAccess(
    conversationIdParam: string = 'conversationId'
  ): preHandlerHookHandler {
    return async (request, reply) => {
      if (!request.user) {
        reply.code(401).send({
          error: AuthErrorCode.UNAUTHORIZED_ACCESS,
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const conversationId = (request.params as any)[conversationIdParam];
      if (!conversationId) {
        reply.code(400).send({
          error: 'BAD_REQUEST',
          message: `Missing ${conversationIdParam} parameter`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      try {
        // First, verify the conversation exists and belongs to the user
        const conversation = await this.prisma.conversation.findFirst({
          where: {
            id: conversationId,
            userId: request.user.id,
          },
          include: {
            project: true,
          },
        });

        if (!conversation) {
          reply.code(404).send({
            error: AuthErrorCode.CONVERSATION_NOT_FOUND,
            message: 'Conversation not found or access denied',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Get project details with counts
        const project = await this.projectService.getProject(
          conversation.projectId,
          request.user.id
        );

        if (!project) {
          reply.code(404).send({
            error: AuthErrorCode.PROJECT_NOT_FOUND,
            message: 'Associated project not found or access denied',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Inject project context
        (request as AuthorizedRequest).project = project;
      } catch (error) {
        console.error('Failed to validate conversation access:', error);
        reply.code(500).send({
          error: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to validate conversation access',
          timestamp: new Date().toISOString(),
        });
      }
    };
  }

  /**
   * Validate landing page access and inject project context
   */
  requireLandingPageAccess(
    landingPageIdParam: string = 'landingPageId'
  ): preHandlerHookHandler {
    return async (request, reply) => {
      if (!request.user) {
        reply.code(401).send({
          error: AuthErrorCode.UNAUTHORIZED_ACCESS,
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const landingPageId =
        (request.params as any)[landingPageIdParam] ||
        (request.params as any).pageId;
      if (!landingPageId) {
        reply.code(400).send({
          error: 'BAD_REQUEST',
          message: `Missing ${landingPageIdParam} or pageId parameter`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      try {
        // First, verify the landing page exists and belongs to the user
        const landingPage = await this.prisma.landingPage.findFirst({
          where: {
            id: landingPageId,
            userId: request.user.id,
          },
          include: {
            project: true,
          },
        });

        if (!landingPage) {
          reply.code(404).send({
            error: 'LANDING_PAGE_NOT_FOUND',
            message: 'Landing page not found or access denied',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Get project details with counts
        const project = await this.projectService.getProject(
          landingPage.projectId,
          request.user.id
        );

        if (!project) {
          reply.code(404).send({
            error: AuthErrorCode.PROJECT_NOT_FOUND,
            message: 'Associated project not found or access denied',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Inject project context
        (request as AuthorizedRequest).project = project;
      } catch (error) {
        console.error('Failed to validate landing page access:', error);
        reply.code(500).send({
          error: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to validate landing page access',
          timestamp: new Date().toISOString(),
        });
      }
    };
  }

  /**
   * Validate message access (through conversation ownership)
   */
  requireMessageAccess(
    messageIdParam: string = 'messageId'
  ): preHandlerHookHandler {
    return async (request, reply) => {
      if (!request.user) {
        reply.code(401).send({
          error: AuthErrorCode.UNAUTHORIZED_ACCESS,
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const messageId = (request.params as any)[messageIdParam];
      if (!messageId) {
        reply.code(400).send({
          error: 'BAD_REQUEST',
          message: `Missing ${messageIdParam} parameter`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      try {
        // Verify the message exists and belongs to the user
        const message = await this.prisma.chatMessage.findFirst({
          where: {
            id: messageId,
            userId: request.user.id,
          },
          include: {
            conversation: {
              include: {
                project: true,
              },
            },
          },
        });

        if (!message) {
          reply.code(404).send({
            error: 'MESSAGE_NOT_FOUND',
            message: 'Message not found or access denied',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Get project details with counts
        const project = await this.projectService.getProject(
          message.conversation.projectId,
          request.user.id
        );

        if (!project) {
          reply.code(404).send({
            error: AuthErrorCode.PROJECT_NOT_FOUND,
            message: 'Associated project not found or access denied',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Inject project context
        (request as AuthorizedRequest).project = project;
      } catch (error) {
        console.error('Failed to validate message access:', error);
        reply.code(500).send({
          error: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to validate message access',
          timestamp: new Date().toISOString(),
        });
      }
    };
  }

  /**
   * Resource-level authorization check
   * Validates that user can perform specific action on resource
   */
  requireResourcePermission(
    resourceType: 'project' | 'conversation' | 'landing_page' | 'message',
    action: 'read' | 'write' | 'delete' | 'admin'
  ): preHandlerHookHandler {
    return async (request, reply) => {
      if (!request.user) {
        reply.code(401).send({
          error: AuthErrorCode.UNAUTHORIZED_ACCESS,
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const userRole = request.user.role as UserRole;

      // Admin users can perform any action
      if (userRole === 'admin') {
        return;
      }

      // Define permission matrix
      const permissions: Record<UserRole, Record<string, string[]>> = {
        admin: {
          project: ['read', 'write', 'delete', 'admin'],
          conversation: ['read', 'write', 'delete', 'admin'],
          landing_page: ['read', 'write', 'delete', 'admin'],
          message: ['read', 'write', 'delete', 'admin'],
        },
        user: {
          project: ['read', 'write', 'delete'], // Users can manage their own projects
          conversation: ['read', 'write', 'delete'], // Users can manage their own conversations
          landing_page: ['read', 'write', 'delete'], // Users can manage their own landing pages
          message: ['read', 'write', 'delete'], // Users can manage their own messages
        },
        guest: {
          project: ['read'], // Guests can only read (if shared)
          conversation: ['read'], // Guests can only read (if shared)
          landing_page: ['read'], // Guests can only read (if shared)
          message: ['read'], // Guests can only read (if shared)
        },
      };

      const allowedActions = permissions[userRole]?.[resourceType] || [];

      if (!allowedActions.includes(action)) {
        reply.code(403).send({
          error: AuthErrorCode.INSUFFICIENT_PERMISSIONS,
          message: `Insufficient permissions to ${action} ${resourceType}`,
          details: { userRole, resourceType, action, allowedActions },
          timestamp: new Date().toISOString(),
        });
      }
    };
  }

  /**
   * Validate user owns the resource (for user-level resources)
   */
  requireOwnership(
    _resourceType: 'project' | 'conversation' | 'landing_page'
  ): preHandlerHookHandler {
    return async (request, reply) => {
      if (!request.user) {
        reply.code(401).send({
          error: AuthErrorCode.UNAUTHORIZED_ACCESS,
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Admin users bypass ownership checks
      if (request.user.role === 'admin') {
        // Admins have access to all resources
      }

      // For other resource types, ownership is validated by the specific access middleware
      // This middleware is mainly for additional ownership validation if needed
    };
  }

  /**
   * Get project service instance
   */
  getProjectService(): ProjectService {
    return this.projectService;
  }
}
