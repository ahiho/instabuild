import { PrismaClient } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { AuthMiddleware } from './auth.js';
import { AuthorizationMiddleware } from './authorization.js';
import { ProjectContextMiddleware } from './projectContext.js';

export interface MiddlewareInstances {
  auth: AuthMiddleware;
  authorization: AuthorizationMiddleware;
  projectContext: ProjectContextMiddleware;
}

/**
 * Initialize and register all middleware instances
 */
export function initializeMiddleware(
  fastify: FastifyInstance,
  prisma: PrismaClient
): MiddlewareInstances {
  // Create middleware instances
  const auth = new AuthMiddleware(prisma);
  const authorization = new AuthorizationMiddleware(prisma);
  const projectContext = new ProjectContextMiddleware(prisma);

  // Register global middleware for user context injection
  // This will attempt to authenticate users on all requests but won't fail if no auth
  fastify.addHook('preHandler', auth.injectUserContext());

  // Register project context injection for authenticated users
  fastify.addHook('preHandler', projectContext.injectProjectContext);

  return {
    auth,
    authorization,
    projectContext,
  };
}

export { AuthMiddleware } from './auth.js';
export type { AuthenticatedRequest, AuthenticatedUser } from './auth.js';
export { AuthorizationMiddleware } from './authorization.js';
export type { AuthorizedRequest, UserRole } from './authorization.js';
export { ProjectContextMiddleware } from './projectContext.js';
export type { ProjectContextRequest } from './projectContext.js';
