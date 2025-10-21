<!--
Sync Impact Report:
- Version change: Initial → 1.0.0
- Added principles: Monorepo Architecture, TypeScript-First, Shared Configuration, Full-Stack Integration, Code Quality Standards
- Added sections: Technology Stack, Development Workflow
- Templates requiring updates: ✅ updated plan-template.md, spec-template.md, tasks-template.md
- Follow-up TODOs: None - all placeholders filled
-->

# InstaBuild Constitution

## Core Principles

### I. Monorepo Architecture
All applications and packages MUST be organized within a single repository using pnpm workspaces. Each workspace package MUST be independently buildable, testable, and deployable. Workspace dependencies MUST be explicitly declared and versioned. No circular dependencies between workspace packages are permitted.

**Rationale**: Monorepo structure enables shared tooling, consistent versioning, and simplified dependency management while maintaining clear boundaries between components.

### II. TypeScript-First
All code MUST be written in TypeScript with strict type checking enabled. No `any` types are permitted without explicit justification and approval. Type definitions MUST be comprehensive and exported for reusability across workspace packages.

**Rationale**: TypeScript provides compile-time safety, better developer experience, and enables reliable refactoring across the entire codebase.

### III. Shared Configuration
ESLint, Prettier, and TypeScript configurations MUST be centralized and shared across all workspace packages. Local overrides are permitted only for package-specific requirements and MUST be documented with justification. All packages MUST inherit from the root configuration.

**Rationale**: Consistent code style and quality standards across the entire monorepo reduce cognitive load and ensure maintainability.

### IV. Full-Stack Integration
Backend services MUST use Fastify with TypeScript. Frontend applications MUST use Vite + React + TypeScript. API contracts MUST be type-safe and shared between frontend and backend through generated types or shared schema definitions.

**Rationale**: Standardized technology stack reduces complexity, enables code sharing, and ensures consistent development patterns across all applications.

### V. Code Quality Standards
All code MUST pass linting, formatting, and type checking before commit. Unit tests are required for business logic. Integration tests are required for API endpoints and critical user flows. Code coverage MUST be maintained above 80% for new code.

**Rationale**: Automated quality gates prevent regressions and ensure consistent code quality across all contributors.

## Technology Stack

**Package Manager**: pnpm (required for workspace support)
**Backend Framework**: Fastify + TypeScript
**Frontend Framework**: Vite + React + TypeScript
**Code Quality**: ESLint + Prettier + TypeScript strict mode
**Testing**: Vitest for unit tests, Playwright for E2E tests
**Build System**: Native TypeScript compilation + Vite bundling

## Development Workflow

**Workspace Structure**: Packages organized by domain (apps/, packages/, tools/)
**Branching**: Feature branches with PR-based reviews
**Quality Gates**: Pre-commit hooks for linting/formatting, CI/CD for tests
**Dependency Management**: Centralized through pnpm workspace protocol
**Release Process**: Conventional commits with automated versioning

## Governance

This constitution supersedes all other development practices and guidelines. All pull requests MUST verify compliance with these principles. Any deviation requires explicit justification and approval from project maintainers. 

Amendments to this constitution require:
1. Documented rationale for the change
2. Impact assessment on existing code and processes
3. Migration plan for affected components
4. Approval from all active maintainers

**Version**: 1.0.0 | **Ratified**: 2025-10-21 | **Last Amended**: 2025-10-21
