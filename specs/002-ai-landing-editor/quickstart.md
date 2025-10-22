# Quickstart: AI-Powered Landing Page Editor

**Feature**: 002-ai-landing-editor  
**Date**: 2025-10-22  
**Phase**: 1 - Implementation Guide

## Prerequisites

- Node.js 18+ installed
- pnpm package manager
- PostgreSQL database running
- MinIO or S3-compatible storage
- GitHub personal access token
- Vercel API token
- OpenAI API key (or compatible LLM API)

## Environment Setup

1. **Clone and install dependencies**:

   ```bash
   git checkout 002-ai-landing-editor
   pnpm install
   ```

2. **Environment variables** (create `.env` files):

   **Backend** (`apps/backend/.env`):

   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/instabuild"
   MINIO_ENDPOINT="localhost:9000"
   MINIO_ACCESS_KEY="minioadmin"
   MINIO_SECRET_KEY="minioadmin"
   GITHUB_TOKEN="ghp_xxxxxxxxxxxx"
   VERCEL_TOKEN="xxxxxxxxxx"
   OPENAI_API_KEY="sk-xxxxxxxxxxxx"
   PORT=3000
   ```

   **Frontend** (`apps/frontend/.env`):

   ```env
   VITE_API_BASE_URL="http://localhost:3000/api/v1"
   ```

3. **Database setup**:

   ```bash
   cd apps/backend
   pnpm prisma generate
   pnpm prisma db push
   ```

4. **MinIO setup** (local development):
   ```bash
   docker run -p 9000:9000 -p 9001:9001 \
     -e MINIO_ROOT_USER=minioadmin \
     -e MINIO_ROOT_PASSWORD=minioadmin \
     minio/minio server /data --console-address ":9001"
   ```

## Development Workflow

### 1. Start Development Servers

**Terminal 1 - Backend**:

```bash
cd apps/backend
pnpm dev
```

**Terminal 2 - Frontend**:

```bash
cd apps/frontend
pnpm dev
```

### 2. Core Development Flow

1. **Create Landing Page**:
   - POST `/api/v1/pages` with title and description
   - System creates GitHub repository and initial commit
   - Returns page ID for subsequent operations

2. **Edit via Chat**:
   - POST `/api/v1/pages/{pageId}/chat` with natural language command
   - System processes command and generates/modifies React code
   - Creates new version with commit SHA and preview URL

3. **Element Selection**:
   - Frontend activates select mode
   - User clicks element in preview iframe
   - Element ID sent with next chat message for context

4. **Asset Upload**:
   - POST `/api/v1/pages/{pageId}/assets` with multipart form data
   - File stored in MinIO/S3 with unique URL
   - Asset available for AI to reference in code generation

5. **Version Management**:
   - GET `/api/v1/pages/{pageId}/versions` for history
   - POST `/api/v1/pages/{pageId}/versions/{versionId}/rollback` to revert

## Key Implementation Points

### Backend Architecture

**Fastify Server** (`apps/backend/src/server.ts`):

```typescript
import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';

const fastify = Fastify({ logger: true });
const prisma = new PrismaClient();

// Register plugins
await fastify.register(import('@fastify/multipart'));
await fastify.register(import('@fastify/cors'));

// Register routes
await fastify.register(import('./routes/pages'));
await fastify.register(import('./routes/chat'));
await fastify.register(import('./routes/assets'));
```

**Chat Service** (`apps/backend/src/services/chat.ts`):

```typescript
import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';

export async function processChatMessage(pageId: string, message: string) {
  const result = await streamText({
    model: openai('gpt-4'),
    messages: [{ role: 'user', content: message }],
    tools: {
      requestAsset: tool({
        description: 'Request file upload from user',
        parameters: z.object({
          type: z.enum(['image', 'logo']),
          description: z.string(),
        }),
      }),
      modifyElement: tool({
        description: 'Modify page element',
        parameters: z.object({
          elementId: z.string(),
          changes: z.object({}),
        }),
      }),
    },
  });

  return result.toAIStreamResponse();
}
```

### Frontend Architecture

**Editor Page** (`apps/frontend/src/pages/EditorPage.tsx`):

```typescript
import { useChat } from 'ai/react'
import { useQuery } from '@tanstack/react-query'

export function EditorPage({ pageId }: { pageId: string }) {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: `/api/v1/pages/${pageId}/chat`
  })

  const { data: page } = useQuery({
    queryKey: ['page', pageId],
    queryFn: () => fetchPage(pageId)
  })

  return (
    <div className="flex h-screen">
      <div className="w-1/2">
        <PreviewPanel pageId={pageId} />
      </div>
      <div className="w-1/2">
        <ChatPanel
          messages={messages}
          input={input}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  )
}
```

**Preview Component** (`apps/frontend/src/components/PreviewPanel.tsx`):

```typescript
export function PreviewPanel({ pageId }: { pageId: string }) {
  const [selectMode, setSelectMode] = useState(false)
  const [selectedElement, setSelectedElement] = useState<string | null>(null)

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'elementSelected') {
        setSelectedElement(event.data.elementId)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <div className="h-full">
      <div className="mb-4">
        <button
          onClick={() => setSelectMode(!selectMode)}
          className={selectMode ? 'bg-blue-500' : 'bg-gray-500'}
        >
          Select Mode
        </button>
      </div>
      <iframe
        src={`/preview/${pageId}`}
        className="w-full h-full border"
      />
    </div>
  )
}
```

## Testing Strategy

### Unit Tests

```bash
# Backend
cd apps/backend && pnpm test

# Frontend
cd apps/frontend && pnpm test
```

### Integration Tests

```bash
# API contract tests
cd apps/backend && pnpm test:integration

# Component integration
cd apps/frontend && pnpm test:integration
```

### End-to-End Tests

```bash
# Full user workflows
pnpm test:e2e
```

## Deployment

### Development

- Backend: `pnpm dev` (localhost:3000)
- Frontend: `pnpm dev` (localhost:5173)

### Production

- Backend: Deploy to Node.js hosting (Railway, Render, etc.)
- Frontend: Deploy to Vercel/Netlify
- Database: PostgreSQL (Supabase, Neon, etc.)
- Storage: AWS S3 or compatible service

## Troubleshooting

**Common Issues**:

1. **Database connection**: Verify PostgreSQL is running and DATABASE_URL is correct
2. **MinIO access**: Check MinIO server is running and credentials match
3. **GitHub API**: Verify token has repo creation permissions
4. **Vercel API**: Ensure token has deployment permissions
5. **CORS errors**: Check frontend/backend URLs match environment variables

**Debug Commands**:

```bash
# Check database connection
cd apps/backend && pnpm prisma studio

# Verify MinIO
curl http://localhost:9000/minio/health/live

# Test API endpoints
curl http://localhost:3000/api/v1/health
```
