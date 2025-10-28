import fastifyWebsocket from '@fastify/websocket';
import { PrismaClient } from '@prisma/client';
import Fastify from 'fastify';
import { initializeStorage } from './lib/storage.js';
import { errorHandler } from './middleware/error.js';
import { chatRoutes } from './routes/chat.js';
import { conversationRoutes } from './routes/conversation.js';
import { pagesRoutes } from './routes/pages.js';
import { sandboxRoutes } from './routes/sandbox-simple.js';
import { websocketRoutes } from './routes/websocket.js';
import { sandboxManager } from './services/sandboxManager.js';
import { toolRegistry } from './services/toolRegistry.js';
import { registerAllTools } from './tools/index.js';
// import { registerVisualElementTools } from './tools/visual-element-tools.js';

const fastify = Fastify({
  logger: true,
  disableRequestLogging: false,
});

const prisma = new PrismaClient();

// Register error handler
fastify.setErrorHandler(errorHandler);

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

// Register WebSocket plugin
await fastify.register(fastifyWebsocket, {
  options: {
    maxPayload: 1024 * 1024, // 1MB max message size
  },
});

// Register routes
await fastify.register(pagesRoutes);
await fastify.register(chatRoutes);
await fastify.register(websocketRoutes);
await fastify.register(conversationRoutes);
await fastify.register(sandboxRoutes, { prefix: '/api/v1' });

// Health check endpoint
fastify.get('/api/v1/health', async () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  };
});

/**
 * Unregister deprecated abstract landing page tools
 */
function unregisterDeprecatedLandingPageTools() {
  const deprecatedTools = [
    'update_content',
    'update_style',
    'add_element',
    'remove_element',
    'clear_all_content',
    'read_landing_page',
    'update_landing_page',
    'update_landing_page_meta',
  ];

  let unregisteredCount = 0;
  for (const toolName of deprecatedTools) {
    if (toolRegistry.unregisterEnhancedTool(toolName)) {
      unregisteredCount++;
    }
  }

  console.log(
    `Unregistered ${unregisteredCount} deprecated landing page tools`
  );
}

// Initialize storage and tools on startup
fastify.addHook('onReady', async () => {
  await initializeStorage();

  // Initialize sandbox manager
  await sandboxManager.initialize();

  // Unregister deprecated abstract landing page tools
  unregisterDeprecatedLandingPageTools();

  // Register all tools (filesystem, validation, asset management, etc.)
  console.log('🔧 ABOUT TO CALL registerAllTools()');
  registerAllTools();
  console.log('🔧 registerAllTools() COMPLETED');
  // registerVisualElementTools();

  console.log('Sandbox Manager initialized successfully');
});

// Graceful shutdown
fastify.addHook('onClose', async () => {
  await sandboxManager.shutdown();
  await prisma.$disconnect();
});

export { fastify, prisma };
