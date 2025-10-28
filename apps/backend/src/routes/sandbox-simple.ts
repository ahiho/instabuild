import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { logger } from '../lib/logger';
import { sandboxManager } from '../services/sandboxManager';

// Request schemas
const CreateSandboxSchema = z.object({
  userId: z.string(),
  projectId: z.string(),
  baseImage: z.string().optional(),
  useGVisor: z.boolean().default(false),
  resourceLimits: z
    .object({
      cpuLimit: z.string().optional(),
      memoryLimit: z.string().optional(),
      executionTimeout: z.number().optional(),
      diskQuota: z.string().optional(),
      pidsLimit: z.number().optional(),
    })
    .optional(),
});

const ExecuteCommandSchema = z.object({
  sandboxId: z.string(),
  command: z.string(),
  args: z.array(z.string()).optional(),
  workingDir: z.string().optional(),
  timeout: z.number().min(1).max(300).optional(),
  env: z.record(z.string(), z.string()).optional(),
});

const SandboxIdSchema = z.object({
  sandboxId: z.string(),
});

const KillProcessSchema = z.object({
  sandboxId: z.string(),
  pid: z.number(),
});

export async function sandboxRoutes(fastify: FastifyInstance) {
  // Create a new sandbox
  fastify.post('/sandbox', async (request, reply) => {
    try {
      const body = CreateSandboxSchema.parse(request.body);

      logger.info('Creating sandbox', {
        userId: body.userId,
        projectId: body.projectId,
      });

      const result = await sandboxManager.createSandbox(body);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      logger.error('Failed to create sandbox', { error });

      reply.status(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Execute command in sandbox
  fastify.post('/sandbox/execute', async (request, reply) => {
    try {
      const body = ExecuteCommandSchema.parse(request.body);

      logger.info('Executing command', {
        sandboxId: body.sandboxId,
        command: body.command,
      });

      const result = await sandboxManager.executeCommand(body);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      logger.error('Failed to execute command', { error });

      reply.status(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Get sandbox information
  fastify.get('/sandbox/:sandboxId', async (request, reply) => {
    try {
      const { sandboxId } = SandboxIdSchema.parse(request.params);

      const sandbox = sandboxManager.getSandboxInfo(sandboxId);

      if (!sandbox) {
        reply.status(404);
        return {
          success: false,
          error: 'Sandbox not found',
        };
      }

      return {
        success: true,
        data: {
          ...sandbox,
          createdAt: sandbox.createdAt.toISOString(),
          lastActivity: sandbox.lastActivity.toISOString(),
        },
      };
    } catch (error) {
      logger.error('Failed to get sandbox info', { error });

      reply.status(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Destroy sandbox
  fastify.delete('/sandbox/:sandboxId', async (request, reply) => {
    try {
      const { sandboxId } = SandboxIdSchema.parse(request.params);

      logger.info('Destroying sandbox', { sandboxId });

      const result = await sandboxManager.destroySandbox(sandboxId);

      return {
        success: result,
        message: result
          ? 'Sandbox destroyed successfully'
          : 'Failed to destroy sandbox',
      };
    } catch (error) {
      logger.error('Failed to destroy sandbox', { error });

      reply.status(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Get user sandboxes
  fastify.get('/sandbox/user/:userId', async (request, reply) => {
    try {
      const { userId } = z.object({ userId: z.string() }).parse(request.params);

      const sandboxes = sandboxManager.getUserSandboxes(userId);

      return {
        success: true,
        data: sandboxes.map(sandbox => ({
          ...sandbox,
          createdAt: sandbox.createdAt.toISOString(),
          lastActivity: sandbox.lastActivity.toISOString(),
        })),
      };
    } catch (error) {
      logger.error('Failed to get user sandboxes', { error });

      reply.status(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Get resource usage
  fastify.get('/sandbox/:sandboxId/stats', async (request, reply) => {
    try {
      const { sandboxId } = SandboxIdSchema.parse(request.params);

      const stats = await sandboxManager.getResourceUsage(sandboxId);

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      logger.error('Failed to get resource usage', { error });

      reply.status(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // List processes
  fastify.get('/sandbox/:sandboxId/processes', async (request, reply) => {
    try {
      const { sandboxId } = SandboxIdSchema.parse(request.params);

      const processes = await sandboxManager.listProcesses(sandboxId);

      return {
        success: true,
        data: processes,
      };
    } catch (error) {
      logger.error('Failed to list processes', { error });

      reply.status(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Kill process
  fastify.post('/sandbox/kill-process', async (request, reply) => {
    try {
      const { sandboxId, pid } = KillProcessSchema.parse(request.body);

      logger.info('Killing process', { sandboxId, pid });

      const result = await sandboxManager.killProcess(sandboxId, pid);

      return {
        success: result,
        message: result
          ? 'Process killed successfully'
          : 'Failed to kill process',
      };
    } catch (error) {
      logger.error('Failed to kill process', { error });

      reply.status(500);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Health check
  fastify.get('/sandbox/health', async (_request, reply) => {
    try {
      const health = await sandboxManager.healthCheck();

      if (health.status === 'unhealthy') {
        reply.status(503);
      }

      return {
        success: health.status === 'healthy',
        status: health.status,
        details: health.details,
      };
    } catch (error) {
      logger.error('Health check failed', { error });

      reply.status(503);
      return {
        success: false,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
}
