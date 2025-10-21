import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { healthRoutes } from './routes/health';

const fastify = Fastify({
  logger: true,
});

// Register plugins
await fastify.register(helmet);
await fastify.register(cors, {
  origin: true,
});

// Register routes
await fastify.register(healthRoutes);

// Start server
const start = async (): Promise<void> => {
  try {
    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`Server listening on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
