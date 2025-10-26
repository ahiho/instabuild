# Quickstart: InstaBuild Monorepo

This guide walks you through setting up and working with the InstaBuild monorepo structure.

## Prerequisites

- Node.js 18+
- pnpm 8+ (`npm install -g pnpm`)
- Git

## Initial Setup

1. **Clone and setup the repository**:

   ```bash
   git clone <repository-url>
   cd InstaBuild
   pnpm install
   ```

2. **Verify the setup**:

   ```bash
   # Check workspace structure
   pnpm list --depth=0

   # Run type checking across all packages
   pnpm type-check

   # Run linting across all packages
   pnpm lint
   ```

## Development Workflow

### Working with the Backend

```bash
# Start backend development server
cd apps/backend
pnpm dev

# Run backend tests
pnpm test

# Build backend for production
pnpm build
```

### Working with the Frontend

```bash
# Start frontend development server
cd apps/frontend
pnpm dev

# Run frontend tests
pnpm test

# Build frontend for production
pnpm build
```

### Working with Shared Package

```bash
# Build shared types and utilities
cd packages/shared
pnpm build

# Watch for changes during development
pnpm dev
```

## Workspace Commands

Run commands across all packages from the root:

```bash
# Install dependencies for all packages
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Start all development servers in parallel
pnpm dev

# Lint all code
pnpm lint

# Format all code
pnpm format
```

## Adding Dependencies

### External Dependencies

```bash
# Add to specific package
pnpm --filter @instabuild/backend add fastify
pnpm --filter @instabuild/frontend add react

# Add dev dependency
pnpm --filter @instabuild/backend add -D @types/node
```

### Workspace Dependencies

```bash
# Add shared package to backend
pnpm --filter @instabuild/backend add @instabuild/shared@workspace:*

# Add shared package to frontend
pnpm --filter @instabuild/frontend add @instabuild/shared@workspace:*
```

## Project Structure

```
InstaBuild/
├── package.json              # Root workspace config
├── pnpm-workspace.yaml       # Workspace definition
├── tsconfig.json             # Shared TypeScript config
├── .eslintrc.js              # Shared ESLint config
├── .prettierrc               # Shared Prettier config
├── apps/
│   ├── backend/              # Fastify API server
│   │   ├── src/
│   │   │   ├── index.ts      # Server entry point
│   │   │   ├── routes/       # API routes
│   │   │   ├── services/     # Business logic
│   │   │   └── models/       # Data models
│   │   └── tests/            # Backend tests
│   └── frontend/             # React application
│       ├── src/
│       │   ├── main.tsx      # App entry point
│       │   ├── App.tsx       # Root component
│       │   ├── components/   # UI components
│       │   └── pages/        # Route components
│       └── tests/            # Frontend tests
└── packages/
    └── shared/               # Shared types and utilities
        ├── src/
        │   ├── types/        # TypeScript types
        │   └── utils/        # Utility functions
        └── tests/            # Shared package tests
```

## Code Quality

The monorepo enforces code quality through:

- **TypeScript**: Strict mode enabled across all packages
- **ESLint**: Consistent linting rules with package-specific overrides
- **Prettier**: Automated code formatting
- **Husky**: Pre-commit hooks for quality gates
- **lint-staged**: Only lint changed files for performance

## Common Tasks

### Adding a New Package

1. Create directory in `apps/` or `packages/`
2. Add `package.json` with workspace dependencies
3. Add `tsconfig.json` extending root config
4. Update `pnpm-workspace.yaml` if needed
5. Run `pnpm install` to link workspace

### Sharing Types Between Packages

1. Define types in `packages/shared/src/types/`
2. Export from `packages/shared/src/index.ts`
3. Import in other packages: `import { Type } from '@instabuild/shared'`

### Running Package-Specific Commands

```bash
# Run command in specific package
pnpm --filter @instabuild/backend <command>

# Run command in multiple packages
pnpm --filter "@instabuild/*" <command>

# Run command in packages matching pattern
pnpm --filter "./apps/*" <command>
```

## Troubleshooting

### Dependency Issues

```bash
# Clear all node_modules and reinstall
pnpm clean:all
pnpm install

# Check for dependency conflicts
pnpm why <package-name>
```

### Type Checking Issues

```bash
# Check types across all packages
pnpm type-check

# Build shared package first if types are missing
cd packages/shared && pnpm build
```

### Linting Issues

```bash
# Fix auto-fixable issues
pnpm lint:fix

# Check specific file
pnpm eslint path/to/file.ts
```

## Next Steps

1. Implement your first API endpoint in `apps/backend/src/routes/`
2. Create your first React component in `apps/frontend/src/components/`
3. Add shared types in `packages/shared/src/types/`
4. Set up your database and add models
5. Configure deployment pipelines
