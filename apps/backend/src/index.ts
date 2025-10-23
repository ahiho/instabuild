import { fastify } from './server.js';

const start = async (): Promise<void> => {
  try {
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
