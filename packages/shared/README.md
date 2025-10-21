# InstaBuild Shared

Shared TypeScript types and utilities for the InstaBuild monorepo.

## Purpose

This package provides common types, interfaces, and utility functions that are used across both the backend and frontend applications, ensuring type safety and consistency.

## Development

```bash
# Build the package
pnpm build

# Watch for changes during development
pnpm dev

# Run tests
pnpm test

# Lint code
pnpm lint
```

## Exports

### Types

- `ApiResponse<T>` - Standard API response wrapper
- `HealthStatus` - Health check status interface

### Utilities

- `formatTimestamp()` - Format dates to ISO strings
- `createApiResponse()` - Create standardized API responses

## Usage

Import types and utilities in other packages:

```typescript
// In backend (apps/backend)
import {
  ApiResponse,
  HealthStatus,
  createApiResponse,
} from '@instabuild/shared';

// In frontend (apps/frontend)
import { ApiResponse, HealthStatus } from '@instabuild/shared';
```

## Adding New Types

1. Create type definitions in `src/types/`
2. Export from `src/types/index.ts`
3. Re-export from `src/index.ts`

Example:

```typescript
// src/types/user.ts
export interface User {
  id: string;
  name: string;
  email: string;
}

// src/types/index.ts
export * from './user.js';

// src/index.ts
export * from './types/index.js';
```

## Adding New Utilities

1. Create utility functions in `src/utils/`
2. Export from `src/utils/index.ts`
3. Re-export from `src/index.ts`

Example:

```typescript
// src/utils/validation.ts
export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// src/utils/index.ts
export * from './validation.js';

// src/index.ts
export * from './utils/index.js';
```

## Build Output

The package builds to `dist/` with:

- Compiled JavaScript files
- TypeScript declaration files (`.d.ts`)
- Source maps for debugging
