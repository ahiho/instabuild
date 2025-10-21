# Research: Monorepo Structure

**Feature**: Monorepo Structure  
**Date**: 2025-10-21  
**Status**: Complete

## Research Tasks Completed

### 1. pnpm Workspace Configuration Best Practices

**Decision**: Use `pnpm-workspace.yaml` with apps/_ and packages/_ patterns

**Rationale**:

- pnpm workspaces provide efficient dependency management with hard links
- apps/\* pattern clearly separates deployable applications
- packages/\* pattern organizes shared libraries and utilities
- Supports workspace protocol for internal dependencies

**Alternatives considered**:

- npm workspaces: Less efficient, no workspace protocol
- Yarn workspaces: Good but pnpm has better performance and features
- Lerna: Adds complexity, pnpm workspaces sufficient for our needs

### 2. TypeScript Configuration Strategy

**Decision**: Base tsconfig.json at root with package-specific extensions

**Rationale**:

- Shared base configuration ensures consistency
- Package-specific configs can override for specific needs (e.g., DOM types for frontend)
- Enables cross-package type checking and imports
- Supports strict mode enforcement across all packages

**Alternatives considered**:

- Separate configs per package: Would lead to inconsistency
- Single monolithic config: Too rigid for different package needs

### 3. ESLint and Prettier Shared Configuration

**Decision**: Root-level configs with package inheritance

**Rationale**:

- Ensures consistent code style across all packages
- Reduces configuration duplication
- Enables centralized rule updates
- Supports package-specific overrides when needed

**Alternatives considered**:

- Package-specific configs: Would fragment code style standards
- External shared config package: Overkill for single monorepo

### 4. Fastify Backend Structure

**Decision**: Standard Fastify project structure with TypeScript

**Rationale**:

- routes/ for endpoint definitions
- services/ for business logic
- models/ for data structures
- lib/ for utilities
- Follows Fastify best practices and TypeScript conventions

**Alternatives considered**:

- Express: Fastify has better TypeScript support and performance
- NestJS: Too heavyweight for our needs

### 5. Vite + React Frontend Structure

**Decision**: Standard Vite React-TS template with organized folders

**Rationale**:

- components/ for reusable UI components
- pages/ for route-level components
- services/ for API calls and business logic
- lib/ for utilities
- Follows React and Vite best practices

**Alternatives considered**:

- Create React App: Vite has better performance and flexibility
- Next.js: Overkill for SPA needs, adds complexity

### 6. Testing Strategy

**Decision**: Vitest for unit tests, Playwright for E2E tests

**Rationale**:

- Vitest integrates well with Vite and has excellent TypeScript support
- Playwright provides reliable cross-browser E2E testing
- Both tools align with our TypeScript-first approach

**Alternatives considered**:

- Jest: Vitest has better ESM and TypeScript support
- Cypress: Playwright has better performance and reliability

### 7. Pre-commit Hooks with Husky

**Decision**: Husky for Git hooks with lint-staged for performance

**Rationale**:

- Enforces code quality before commits
- lint-staged only processes changed files for speed
- Integrates well with pnpm workspaces

**Alternatives considered**:

- Manual enforcement: Too error-prone
- CI-only checks: Feedback too late in development cycle

## Implementation Notes

- All packages will use workspace protocol for internal dependencies
- Shared types package enables type safety across frontend/backend boundary
- Configuration inheritance reduces maintenance overhead
- Pre-commit hooks ensure quality gates are enforced locally
