import {
  CreateLandingPageRequest,
  UpdateLandingPageRequest,
} from '@instabuild/shared';
import { FastifyInstance } from 'fastify';
import { prisma } from '../server.js';
import { PageService } from '../services/page.js';

export async function pagesRoutes(fastify: FastifyInstance) {
  const pageService = new PageService();

  // Create new landing page
  fastify.post<{
    Body: CreateLandingPageRequest;
  }>(
    '/api/v1/pages',
    {
      preHandler: [
        fastify.middleware.auth.requireAuth(),
        fastify.middleware.projectContext.requireProjectContext,
      ],
    },
    async (request, reply) => {
      const { user, project } = request;

      if (!user || !project) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const page = await pageService.createPage(
        request.body,
        user.id,
        project.id
      );
      return reply.status(201).send(page);
    }
  );

  // Get landing page details
  fastify.get<{
    Params: { pageId: string };
  }>(
    '/api/v1/pages/:pageId',
    {
      preHandler: [
        fastify.middleware.auth.requireAuth(),
        fastify.middleware.authorization.requireLandingPageAccess('pageId'),
      ],
    },
    async (request, reply) => {
      const { user } = request;

      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const page = await pageService.getPage(request.params.pageId, user.id);
      return reply.send(page);
    }
  );

  // Update landing page metadata
  fastify.patch<{
    Params: { pageId: string };
    Body: UpdateLandingPageRequest;
  }>(
    '/api/v1/pages/:pageId',
    {
      preHandler: [
        fastify.middleware.auth.requireAuth(),
        fastify.middleware.authorization.requireLandingPageAccess('pageId'),
        fastify.middleware.authorization.requireResourcePermission(
          'landing_page',
          'write'
        ),
      ],
    },
    async (request, reply) => {
      const { user } = request;

      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const page = await pageService.updatePage(
        request.params.pageId,
        request.body,
        user.id
      );
      return reply.send(page);
    }
  );

  // Get page version history (old DB-based versions - kept for backward compatibility)
  fastify.get<{
    Params: { pageId: string };
  }>(
    '/api/v1/pages/:pageId/versions',
    {
      preHandler: [
        fastify.middleware.auth.requireAuth(),
        fastify.middleware.authorization.requireLandingPageAccess('pageId'),
      ],
    },
    async (request, reply) => {
      const versions = await prisma.landingPageVersion.findMany({
        where: { landingPageId: request.params.pageId },
        orderBy: { versionNumber: 'desc' },
      });
      return reply.send({ versions });
    }
  );

  // List GitHub version tags (semantic versioned saved versions)
  fastify.get<{
    Params: { pageId: string };
  }>(
    '/api/v1/pages/:pageId/git-versions',
    {
      preHandler: [
        fastify.middleware.auth.requireAuth(),
        fastify.middleware.authorization.requireLandingPageAccess('pageId'),
      ],
    },
    async (request, reply) => {
      const { user } = request;

      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      try {
        const { getGitHubVersionService } = await import(
          '../services/githubVersion.js'
        );
        const versionService = getGitHubVersionService();

        const versions = await versionService.listVersions(
          request.params.pageId,
          user.id
        );
        const currentVersion = await versionService.getCurrentVersion(
          request.params.pageId,
          user.id
        );

        return reply.send({
          currentVersion,
          versions,
        });
      } catch (error) {
        return reply.code(500).send({
          error: 'Failed to list versions',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Create a new semantic version (save current commit as v1, v2, v3, etc.)
  fastify.post<{
    Params: { pageId: string };
  }>(
    '/api/v1/pages/:pageId/git-versions',
    {
      preHandler: [
        fastify.middleware.auth.requireAuth(),
        fastify.middleware.authorization.requireLandingPageAccess('pageId'),
        fastify.middleware.authorization.requireResourcePermission(
          'landing_page',
          'write'
        ),
      ],
    },
    async (request, reply) => {
      const { user } = request;

      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      try {
        const { getGitHubVersionService } = await import(
          '../services/githubVersion.js'
        );
        const versionService = getGitHubVersionService();

        const versionTag = await versionService.createVersion(
          request.params.pageId,
          user.id
        );

        return reply.code(201).send({
          success: true,
          versionTag,
          message: `Created version ${versionTag}`,
        });
      } catch (error) {
        return reply.code(500).send({
          error: 'Failed to create version',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Restore a specific version (checkout tag and restore to container)
  fastify.post<{
    Params: { pageId: string; versionTag: string };
  }>(
    '/api/v1/pages/:pageId/git-versions/:versionTag/restore',
    {
      preHandler: [
        fastify.middleware.auth.requireAuth(),
        fastify.middleware.authorization.requireLandingPageAccess('pageId'),
        fastify.middleware.authorization.requireResourcePermission(
          'landing_page',
          'write'
        ),
      ],
    },
    async (request, reply) => {
      const { user } = request;
      const { pageId, versionTag } = request.params;

      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      try {
        const { getGitHubSyncService } = await import(
          '../services/githubSync.js'
        );
        const syncService = getGitHubSyncService();

        // Restore to workspace (this would be used by container on next provision)
        // For now, just restore to a staging area
        const workspacePath = '/tmp/restore-staging';
        await syncService.restoreToWorkspace(pageId, workspacePath, versionTag);

        return reply.send({
          success: true,
          message: `Restored version ${versionTag}`,
          versionTag,
          note: 'Code restored. Next container provision will use this version.',
        });
      } catch (error) {
        return reply.code(500).send({
          error: 'Failed to restore version',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Get current version info
  fastify.get<{
    Params: { pageId: string };
  }>(
    '/api/v1/pages/:pageId/current-version',
    {
      preHandler: [
        fastify.middleware.auth.requireAuth(),
        fastify.middleware.authorization.requireLandingPageAccess('pageId'),
      ],
    },
    async (request, reply) => {
      const { user } = request;

      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      try {
        const { getGitHubVersionService } = await import(
          '../services/githubVersion.js'
        );
        const versionService = getGitHubVersionService();

        const currentVersion = await versionService.getCurrentVersion(
          request.params.pageId,
          user.id
        );

        return reply.send(currentVersion);
      } catch (error) {
        return reply.code(500).send({
          error: 'Failed to get current version',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );
}
