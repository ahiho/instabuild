# InstaBuild Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-21

## Active Technologies

- TypeScript (strict mode required) + Vite+React (frontend), shadcn/ui components, TanStack Query v5, Vercel AI SDK (003-ui-ux-refinement)
- N/A (UI/UX refinement only) (003-ui-ux-refinement)
- N/A (UI/UX changes only) (004-home-page-overhaul)

- TypeScript (strict mode required) + Fastify (backend), Vite+React (frontend), Prisma (ORM), TanStack Query v5, Vercel AI SDK (002-ai-landing-editor)
- PostgreSQL (via Prisma), MinIO/S3 (assets), GitHub API (source code), Vercel API (deployment) (002-ai-landing-editor)

- TypeScript (strict mode required) + pnpm (workspaces), Fastify (backend), Vite+React (frontend) (001-monorepo-structure)

## Project Structure

```
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript (strict mode required): Follow standard conventions

## Recent Changes

- 004-home-page-overhaul: Added TypeScript (strict mode required) + Vite+React (frontend), shadcn/ui components, TanStack Query v5, Vercel AI SDK
- 003-ui-ux-refinement: Added TypeScript (strict mode required) + Vite+React (frontend), shadcn/ui components, TanStack Query v5, Vercel AI SDK

- 002-ai-landing-editor: Added TypeScript (strict mode required) + Fastify (backend), Vite+React (frontend), Prisma (ORM), TanStack Query v5, Vercel AI SDK

<!-- MANUAL ADDITIONS START -->

## API Guidelines

### Frontend API Base URL Convention

**IMPORTANT**: The `VITE_API_BASE_URL` environment variable already includes the API version path.

- **Configured in**: `apps/frontend/.env.example`
- **Default value**: `http://localhost:3000/api/v1`
- **Usage pattern**: When making API calls, **DO NOT** include `/api/v1` in the path

#### ✅ Correct Usage

```typescript
// VITE_API_BASE_URL = "http://localhost:3000/api/v1"
fetch(`${import.meta.env.VITE_API_BASE_URL}/pages`);
// Results in: http://localhost:3000/api/v1/pages ✓

fetch(`${import.meta.env.VITE_API_BASE_URL}/pages/${pageId}`);
// Results in: http://localhost:3000/api/v1/pages/123 ✓
```

#### ❌ Incorrect Usage

```typescript
// VITE_API_BASE_URL = "http://localhost:3000/api/v1"
fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/pages`);
// Results in: http://localhost:3000/api/v1/api/v1/pages ❌ (duplicate path)
```

#### Reference Examples

- See `apps/frontend/src/pages/EditorPage.tsx:12` for correct pattern
- See `apps/frontend/src/components/layout/Hero.tsx:69` for correct pattern

### Backend API Routes

All backend routes are registered with the `/api/v1` prefix via Fastify.

- **Pages API**: `/api/v1/pages` (apps/backend/src/routes/pages.ts)
- **Chat API**: `/api/v1/chat` (apps/backend/src/routes/chat.ts)
- **Health Check**: `/api/v1/health` (apps/backend/src/server.ts:35)

### API Request/Response Conventions

#### Creating a Page

**Endpoint**: `POST /api/v1/pages`

**Request Body**:

```typescript
{
  title?: string;       // Optional - auto-generated from description if not provided
  description?: string; // Optional - but at least one of title/description required
}
```

**Response**:

```typescript
{
  id: string;
  title: string;        // Generated from description if not provided
  description?: string;
  githubRepoUrl: string;
  currentVersionId?: string;
  createdAt: string;
  updatedAt: string;
}
```

**Title Generation Logic**: When `title` is not provided, the backend extracts:

1. First sentence (if ≤100 chars), OR
2. First 50 chars at word boundary with "..."

See `apps/backend/src/services/page.ts:129` for implementation.

#### Fetching a Page

**Endpoint**: `GET /api/v1/pages/:pageId`

**Response**: Returns `LandingPageWithVersions` (includes version history)

### Common Pitfalls

1. **Duplicate API path**: Always check if base URL includes version path before adding endpoint path
2. **Missing error handling**: Always wrap fetch calls in try/catch blocks
3. **Loading states**: Implement loading states for better UX during API calls
4. **Type safety**: Use shared types from `packages/shared/src/types/` for request/response

## TanStack Query Setup

### QueryClientProvider Configuration

**Location**: `apps/frontend/src/main.tsx`

TanStack Query (v5) is configured with the following defaults:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Don't refetch when user focuses window
      retry: 1, // Retry failed requests once
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    },
  },
});
```

The `QueryClientProvider` wraps the entire app in `main.tsx`, enabling `useQuery`, `useMutation`, and other TanStack Query hooks throughout the application.

### Using Queries

When fetching data with TanStack Query:

```typescript
import { useQuery } from '@tanstack/react-query';

const { data, isLoading, error } = useQuery({
  queryKey: ['page', pageId],
  queryFn: () => fetchPage(pageId!),
  enabled: !!pageId, // Only run query when pageId exists
});
```

**Best Practices**:

- Use descriptive `queryKey` arrays for cache management
- Use `enabled` option to conditionally run queries
- Handle loading and error states in UI
- See `apps/frontend/src/pages/EditorPage.tsx` for reference implementation

<!-- MANUAL ADDITIONS END -->
