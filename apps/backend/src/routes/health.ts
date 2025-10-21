import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ApiResponse, HealthStatus } from '@instabuild/shared';
import { createApiResponse } from '@instabuild/shared';

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{
    Reply: ApiResponse<HealthStatus>;
  }>('/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    const healthData: HealthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };

    const response = createApiResponse(true, healthData);
    return reply.code(200).send(response);
  });

  fastify.get<{
    Reply: ApiResponse<{ version: string; uptime: number }>;
  }>('/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    const statusData = {
      version: '0.1.0',
      uptime: process.uptime(),
    };

    const response = createApiResponse(true, statusData);
    return reply.code(200).send(response);
  });
}
