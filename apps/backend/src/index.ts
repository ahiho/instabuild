import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { healthRoutes } from './routes/health.js';

const fastify = Fastify({
  logger: true,
});

// Start server
const start = async (): Promise<void> => {
  try {
    // Register plugins with error boundaries
    try {
      await fastify.register(helmet);
      console.log('✓ Helmet security middleware registered');
    } catch (err) {
      console.error('✗ Failed to register helmet middleware:', err);
      throw err;
    }

    try {
      await fastify.register(cors, {
        origin: true,
      });
      console.log('✓ CORS middleware registered');
    } catch (err) {
      console.error('✗ Failed to register CORS middleware:', err);
      throw err;
    }

    // Register routes with error boundaries
    try {
      await fastify.register(healthRoutes);
      console.log('✓ Health routes registered');
    } catch (err) {
      console.error('✗ Failed to register health routes:', err);
      throw err;
    }

    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`🚀 Server listening on http://${host}:${port}`);
  } catch (err) {
    console.error('💥 Error starting server:', err);
    process.exit(1);
  }
};

start();
