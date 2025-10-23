import { FastifyInstance } from 'fastify';
import { PageService } from '../services/page.js';
import { prisma } from '../server.js';
import {
  CreateLandingPageRequest,
  UpdateLandingPageRequest,
} from '@instabuild/shared';

export async function pagesRoutes(fastify: FastifyInstance) {
  const pageService = new PageService();

  // Create new landing page
  fastify.post<{
    Body: CreateLandingPageRequest;
  }>('/api/v1/pages', async (request, reply) => {
    const page = await pageService.createPage(request.body);
    return reply.status(201).send(page);
  });

  // Get landing page details
  fastify.get<{
    Params: { pageId: string };
  }>('/api/v1/pages/:pageId', async (request, reply) => {
    const page = await pageService.getPage(request.params.pageId);
    return reply.send(page);
  });

  // Update landing page metadata
  fastify.patch<{
    Params: { pageId: string };
    Body: UpdateLandingPageRequest;
  }>('/api/v1/pages/:pageId', async (request, reply) => {
    const page = await pageService.updatePage(
      request.params.pageId,
      request.body
    );
    return reply.send(page);
  });

  // Get page version history
  fastify.get<{
    Params: { pageId: string };
  }>('/api/v1/pages/:pageId/versions', async (request, reply) => {
    const versions = await prisma.landingPageVersion.findMany({
      where: { landingPageId: request.params.pageId },
      orderBy: { versionNumber: 'desc' },
    });
    return reply.send({ versions });
  });
}
