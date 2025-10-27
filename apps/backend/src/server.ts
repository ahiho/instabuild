import fastifyWebsocket from '@fastify/websocket';
import { PrismaClient } from '@prisma/client';
import Fastify from 'fastify';
import { initializeStorage } from './lib/storage.js';
import { errorHandler } from './middleware/error.js';
import { chatRoutes } from './routes/chat.js';
import { conversationRoutes } from './routes/conversation.js';
import { pagesRoutes } from './routes/pages.js';
import { websocketRoutes } from './routes/websocket.js';
import { registerTextTools } from './tools/text-tools.js';

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

// Health check endpoint
fastify.get('/api/v1/health', async () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  };
});

// Initialize storage and tools on startup
fastify.addHook('onReady', async () => {
  await initializeStorage();
  registerTextTools();
});

// Graceful shutdown
fastify.addHook('onClose', async () => {
  await prisma.$disconnect();
});

export { fastify, prisma };
