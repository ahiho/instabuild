import '@fastify/cookie';
import type { PrismaClient } from '@prisma/client';
import 'fastify';
import type { AuthenticatedUser } from '../middleware/auth.js';
import type { MiddlewareInstances } from '../middleware/index.js';

declare module 'fastify' {
  interface FastifyInstance {
    middleware: MiddlewareInstances;
    prisma: PrismaClient;
  }

  interface FastifyRequest {
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
}

export {};
