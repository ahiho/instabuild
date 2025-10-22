# Implementation Plan: AI-Powered Landing Page Editor

**Branch**: `002-ai-landing-editor` | **Date**: 2025-10-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-ai-landing-editor/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a full-stack web application providing AI-powered conversational editing of landing pages with real-time preview, element selection, version control, and asset management. The system uses a monorepo architecture with Fastify backend orchestrating AI chat, GitHub version control, Vercel deployment, and asset storage, while the React frontend provides the editor interface with live preview and chat panel.

## Technical Context

**Language/Version**: TypeScript (strict mode required)
**Primary Dependencies**: Fastify (backend), Vite+React (frontend), Prisma (ORM), TanStack Query v5, Vercel AI SDK
**Storage**: PostgreSQL (via Prisma), MinIO/S3 (assets), GitHub API (source code), Vercel API (deployment)
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Node.js server, Web browser
**Project Type**: fullstack - determines workspace structure
**Performance Goals**: <30s page modifications, <10s version rollback, 50 concurrent elements
**Constraints**: Real-time preview updates, streaming chat responses, iframe communication
**Scale/Scope**: Single-user editing sessions, version history per page, asset upload handling

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [x] **Monorepo Architecture**: Feature fits within pnpm workspace structure (apps/backend + apps/frontend)
- [x] **TypeScript-First**: All code will use TypeScript with strict mode
- [x] **Shared Configuration**: Will inherit from root ESLint/Prettier/TypeScript configs
- [x] **Full-Stack Integration**: Backend uses Fastify, frontend uses Vite+React
- [x] **Code Quality Standards**: Plan includes linting, testing, and quality gates

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
# Full-stack application
apps/backend/
├── src/
│   ├── models/           # Prisma models (LandingPage, LandingPageVersion, Asset)
│   ├── services/         # Core business logic (chat, generation, deployment)
│   ├── routes/           # API endpoints (/api/v1/chat, /api/v1/pages)
│   └── lib/              # Utilities (GitHub API, Vercel API, MinIO)
└── tests/
    ├── contract/         # API contract tests
    ├── integration/      # Service integration tests
    └── unit/             # Unit tests for services

apps/frontend/
├── src/
│   ├── components/       # UI components (Editor, Preview, Chat, VersionHistory)
│   ├── pages/            # Route components (/, /pages/:id)
│   ├── services/         # API clients (TanStack Query hooks)
│   └── lib/              # Utilities (element selection, iframe communication)
└── tests/
    ├── e2e/              # Playwright end-to-end tests
    ├── integration/      # Component integration tests
    └── unit/             # Component unit tests

packages/shared/
├── src/
│   ├── types/            # Shared TypeScript interfaces
│   ├── utils/            # Common utilities
│   └── lib/              # Shared business logic
└── tests/
```

**Structure Decision**: Full-stack monorepo with separate backend (Fastify) and frontend (Vite+React) applications, plus shared package for common types and utilities. This enables independent deployment while maintaining type safety across the stack.

## Complexity Tracking

_Fill ONLY if Constitution Check has violations that must be justified_

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
