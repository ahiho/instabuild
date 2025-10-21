# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript (strict mode required)
**Primary Dependencies**: [e.g., Fastify (backend), Vite+React (frontend), or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, Redis, files or N/A]  
**Testing**: [e.g., Vitest (unit), Playwright (E2E) or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Node.js server, Web browser, or NEEDS CLARIFICATION]
**Project Type**: [backend/frontend/fullstack/package - determines workspace structure]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, <100ms response, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [ ] **Monorepo Architecture**: Feature fits within pnpm workspace structure
- [ ] **TypeScript-First**: All code will use TypeScript with strict mode
- [ ] **Shared Configuration**: Will inherit from root ESLint/Prettier/TypeScript configs
- [ ] **Full-Stack Integration**: Backend uses Fastify, frontend uses Vite+React (if applicable)
- [ ] **Code Quality Standards**: Plan includes linting, testing, and quality gates

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
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```
# [REMOVE IF UNUSED] Option 1: Backend service (Fastify + TypeScript)
apps/backend/
├── src/
│   ├── models/
│   ├── services/
│   ├── routes/
│   └── lib/
└── tests/
    ├── contract/
    ├── integration/
    └── unit/

# [REMOVE IF UNUSED] Option 2: Frontend application (Vite + React + TypeScript)
apps/frontend/
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── lib/
└── tests/
    ├── e2e/
    ├── integration/
    └── unit/

# [REMOVE IF UNUSED] Option 3: Shared package
packages/shared/
├── src/
│   ├── types/
│   ├── utils/
│   └── lib/
└── tests/

# [REMOVE IF UNUSED] Option 4: Full-stack application
apps/backend/ (Fastify + TypeScript)
apps/frontend/ (Vite + React + TypeScript)
packages/shared/ (shared types and utilities)
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

