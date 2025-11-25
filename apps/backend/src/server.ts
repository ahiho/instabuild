import fastifyWebsocket from '@fastify/websocket';
import { PrismaClient } from '@prisma/client';
import Fastify from 'fastify';
import { initializeStorage } from './lib/storage.js';
import { errorHandler } from './middleware/error.js';
import { initializeMiddleware } from './middleware/index.js';
import { authRoutes } from './routes/auth.js';
import { chatRoutes } from './routes/chat.js';
import { conversationRoutes } from './routes/conversation.js';
import { deploymentAccountRoutes } from './routes/deploymentAccounts.js';
import { deploymentConfigRoutes } from './routes/deploymentConfigs.js';
import { deploymentRoutes } from './routes/deployments.js';
import { healthRoutes } from './routes/health.js';
import { internalRoutes } from './routes/internal.js';
import { pagesRoutes } from './routes/pages.js';
import { projectRoutes } from './routes/projects.js';
import { usersRoutes } from './routes/users.js';
import { websocketRoutes } from './routes/websocket.js';
import { sandboxCleanupService } from './services/sandboxCleanupService.js';
import { sandboxHealthCheckService } from './services/sandboxHealthCheckService.js';
import { sandboxManager } from './services/sandboxManager.js';
import { initializeSandboxLimitService } from './services/sandboxLimitService.js';
import { initializeGitHubSyncService } from './services/githubSync.js';
import { initializeGitHubVersionService } from './services/githubVersion.js';
import { registerAllTools } from './tools/index.js';

const fastify = Fastify({
  logger: true,
  disableRequestLogging: false,
});

const prisma = new PrismaClient();

// Register error handler
fastify.setErrorHandler(errorHandler);

// Configure JSON content-type parser to allow empty bodies
fastify.addContentTypeParser(
  'application/json',
  { parseAs: 'string' },
  async (_request: any, body: string) => {
    // Allow empty bodies for JSON content-type
    if (body === '' || body.length === 0) {
      return {};
    }
    try {
      return JSON.parse(body);
    } catch (err) {
      throw new Error(
        `Invalid JSON: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }
);

// Register plugins
await fastify.register(import('@fastify/cors'), {
  origin: true,
  credentials: true,
});

await fastify.register(import('@fastify/multipart'), {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

await fastify.register(import('@fastify/cookie'), {
  secret: process.env.COOKIE_SECRET || 'your-cookie-secret-key',
});

// Register WebSocket plugin
await fastify.register(fastifyWebsocket, {
  options: {
    maxPayload: 1024 * 1024, // 1MB max message size
  },
});

// Initialize middleware
const middleware = initializeMiddleware(fastify, prisma);

// Make middleware and prisma available on fastify instance for route handlers
fastify.decorate('middleware', middleware);
fastify.decorate('prisma', prisma);

// Register routes with /api/v1 prefix
await fastify.register(healthRoutes, { prefix: '/api/v1' });
await fastify.register(authRoutes, { prefix: '/api/v1' });
await fastify.register(usersRoutes, { prefix: '/api/v1' });
await fastify.register(projectRoutes, { prefix: '/api/v1' });
await fastify.register(pagesRoutes, { prefix: '/api/v1' });
await fastify.register(chatRoutes, { prefix: '/api/v1' });
await fastify.register(websocketRoutes, { prefix: '/api/v1' });
await fastify.register(conversationRoutes, { prefix: '/api/v1' });
await fastify.register(internalRoutes, { prefix: '/api/v1' });
await fastify.register(deploymentAccountRoutes, { prefix: '/api/v1' });
await fastify.register(deploymentConfigRoutes, { prefix: '/api/v1' });
await fastify.register(deploymentRoutes, { prefix: '/api/v1' });

// Initialize storage and tools on startup
fastify.addHook('onReady', async () => {
  try {
    await initializeStorage();
  } catch (error) {
    console.warn(
      '⚠️  Storage initialization failed (MinIO not available):',
      error instanceof Error ? error.message : error
    );
  }

  // Initialize sandbox limit service (for per-user concurrency limits)
  try {
    initializeSandboxLimitService(prisma);
    console.log('✅ Sandbox Limit Service initialized successfully');
  } catch (error) {
    console.error(
      '❌ Sandbox Limit Service initialization failed:',
      error instanceof Error ? error.message : error
    );
    throw error; // This is critical, don't continue
  }

  // Initialize GitHub sync service (for auto-committing code changes)
  try {
    initializeGitHubSyncService();
    console.log('✅ GitHub Sync Service initialized successfully');
  } catch (error) {
    console.warn(
      '⚠️  GitHub Sync Service initialization failed (GitHub may not be available):',
      error instanceof Error ? error.message : error
    );
    // Don't throw - GitHub integration is optional
  }

  // Initialize GitHub version service (for version management)
  try {
    initializeGitHubVersionService();
    console.log('✅ GitHub Version Service initialized successfully');
  } catch (error) {
    console.warn(
      '⚠️  GitHub Version Service initialization failed:',
      error instanceof Error ? error.message : error
    );
    // Don't throw - GitHub integration is optional
  }

  // Initialize sandbox manager
  try {
    await sandboxManager.initialize();
    // Phase 2: Start sandbox cleanup service (4 hour idle timeout)
    await sandboxCleanupService.start();
    // Phase 3: Start sandbox health check service (5 minute intervals)
    await sandboxHealthCheckService.start();
    console.log('✅ Sandbox Manager initialized successfully');
  } catch (error) {
    console.warn(
      '⚠️  Sandbox manager initialization failed (Docker not available):',
      error instanceof Error ? error.message : error
    );
  }

  // Register all tools (filesystem, validation, asset management, etc.)
  console.log('🔧 ABOUT TO CALL registerAllTools()');
  registerAllTools();
  console.log('🔧 registerAllTools() COMPLETED');
});

// Graceful shutdown
fastify.addHook('onClose', async () => {
  // Phase 2: Stop cleanup service on shutdown
  await sandboxCleanupService.stop();
  // Phase 3: Stop health check service on shutdown
  await sandboxHealthCheckService.stop();
  await sandboxManager.shutdown();
  await prisma.$disconnect();
});

export { fastify, prisma };
