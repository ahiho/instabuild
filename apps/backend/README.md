# InstaBuild Backend

Fastify-based TypeScript API server for the InstaBuild platform.

## Features

- **Fastify**: High-performance web framework
- **TypeScript**: Full type safety
- **Security**: CORS and Helmet middleware
- **Health Checks**: Built-in health and status endpoints
- **Shared Types**: Type-safe communication with frontend

## Development

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint
```

## API Endpoints

### Health Check

- `GET /health` - Basic health check
- `GET /status` - Detailed status with version and uptime

## Project Structure

```
src/
├── index.ts          # Server entry point
├── routes/           # API route handlers
│   └── health.ts     # Health check routes
├── services/         # Business logic
├── models/           # Data models
└── lib/              # Utilities
```

## Configuration

Environment variables:

- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)
- `NODE_ENV` - Environment (development/production)

## Adding New Routes

1. Create route file in `src/routes/`
2. Export async function that accepts `FastifyInstance`
3. Register routes using `fastify.get()`, `fastify.post()`, etc.
4. Import and register in `src/index.ts`

Example:

```typescript
// src/routes/users.ts
import { FastifyInstance } from 'fastify';

export async function userRoutes(fastify: FastifyInstance) {
  fastify.get('/users', async (request, reply) => {
    return { users: [] };
  });
}

// src/index.ts
import { userRoutes } from './routes/users.js';
await fastify.register(userRoutes);
```
