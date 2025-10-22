---
description: 'Task list for monorepo structure implementation'
---

# Tasks: Monorepo Structure

**Input**: Design documents from `/specs/001-monorepo-structure/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create root directory structure (apps/, packages/)
- [x] T002 [P] Create backend directory structure (apps/backend/src/, apps/backend/tests/)
- [x] T003 [P] Create frontend directory structure (apps/frontend/src/, apps/frontend/tests/)
- [x] T004 [P] Create shared package directory structure (packages/shared/src/, packages/shared/tests/)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create pnpm workspace configuration file (pnpm-workspace.yaml)
- [x] T006 Create root package.json with workspace scripts and dependencies
- [x] T007 [P] Create shared TypeScript configuration (tsconfig.json)
- [x] T008 [P] Create shared ESLint configuration (.eslintrc.js)
- [x] T009 [P] Create shared Prettier configuration (.prettierrc)
- [x] T010 [P] Create Node.js gitignore file (.gitignore)
- [x] T011 Setup Husky pre-commit hooks (.husky/pre-commit)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Project Initialization (Priority: P1) 🎯 MVP

**Goal**: Developer can initialize a new InstaBuild monorepo with proper workspace structure, shared configurations, and package scaffolding

**Independent Test**: Can be fully tested by running `pnpm install` and verifying all packages build successfully with shared configurations applied

### Implementation for User Story 1

- [x] T012 [P] [US1] Create backend package.json in apps/backend/package.json
- [x] T013 [P] [US1] Create frontend package.json in apps/frontend/package.json
- [x] T014 [P] [US1] Create shared package.json in packages/shared/src/package.json
- [x] T015 [P] [US1] Create backend TypeScript config extending root in apps/backend/tsconfig.json
- [x] T016 [P] [US1] Create frontend TypeScript config extending root in apps/frontend/tsconfig.json
- [x] T017 [P] [US1] Create shared TypeScript config extending root in packages/shared/tsconfig.json
- [x] T018 [P] [US1] Create backend Fastify entry point in apps/backend/src/index.ts
- [x] T019 [P] [US1] Create frontend React entry point in apps/frontend/src/main.tsx
- [x] T020 [P] [US1] Create frontend React App component in apps/frontend/src/App.tsx
- [x] T021 [P] [US1] Create frontend HTML template in apps/frontend/index.html
- [x] T022 [P] [US1] Create frontend Vite configuration in apps/frontend/vite.config.ts
- [x] T023 [P] [US1] Create shared package index file in packages/shared/src/index.ts
- [x] T024 [US1] Install all dependencies using pnpm install
- [x] T025 [US1] Verify workspace linking with pnpm list --depth=0
- [x] T026 [US1] Test shared configuration inheritance with pnpm lint
- [x] T027 [US1] Test code formatting with pnpm format

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Development Workflow (Priority: P2)

**Goal**: Developer can work on backend and frontend packages independently while maintaining shared standards and cross-package type safety

**Independent Test**: Can be tested by making changes in one package and verifying other packages can consume shared types/utilities

### Implementation for User Story 2

- [x] T028 [P] [US2] Create shared types directory structure in packages/shared/src/types/
- [x] T029 [P] [US2] Create shared utilities directory structure in packages/shared/src/utils/
- [x] T030 [P] [US2] Create backend routes directory structure in apps/backend/src/routes/
- [x] T031 [P] [US2] Create backend services directory structure in apps/backend/src/services/
- [x] T032 [P] [US2] Create backend models directory structure in apps/backend/src/models/
- [x] T033 [P] [US2] Create frontend components directory structure in apps/frontend/src/components/
- [x] T034 [P] [US2] Create frontend pages directory structure in apps/frontend/src/pages/
- [x] T035 [P] [US2] Create frontend services directory structure in apps/frontend/src/services/
- [x] T036 [US2] Add shared package as workspace dependency to backend package.json
- [x] T037 [US2] Add shared package as workspace dependency to frontend package.json
- [x] T038 [US2] Create sample shared type in packages/shared/src/types/common.ts
- [x] T039 [US2] Create sample backend route using shared types in apps/backend/src/routes/health.ts
- [x] T040 [US2] Create sample frontend component using shared types in apps/frontend/src/components/Health.tsx
- [x] T041 [US2] Test cross-package type sharing with TypeScript compilation
- [x] T042 [US2] Test pre-commit hooks with sample code changes

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Build and Deploy (Priority: P3)

**Goal**: Developer can build and deploy backend and frontend packages independently or together with proper dependency resolution

**Independent Test**: Can be tested by building each package and verifying output artifacts are correct and deployable

### Implementation for User Story 3

- [x] T043 [P] [US3] Create backend build configuration in apps/backend/tsconfig.json
- [x] T044 [P] [US3] Create frontend build optimization in apps/frontend/vite.config.ts
- [x] T045 [P] [US3] Create shared package build configuration in packages/shared/tsconfig.json
- [x] T046 [US3] Test backend build process with pnpm --filter @instabuild/backend build
- [x] T047 [US3] Test frontend build process with pnpm --filter @instabuild/frontend build
- [x] T048 [US3] Test shared package build process with pnpm --filter @instabuild/shared build
- [x] T049 [US3] Test full workspace build with pnpm build
- [x] T050 [US3] Verify build artifacts in apps/backend/dist/
- [x] T051 [US3] Verify build artifacts in apps/frontend/dist/
- [x] T052 [US3] Verify build artifacts in packages/shared/dist/
- [x] T053 [US3] Test production backend startup with node apps/backend/dist/index.js
- [x] T054 [US3] Test frontend preview with pnpm --filter @instabuild/frontend preview

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T055 [P] Create comprehensive README.md with setup instructions
- [x] T056 [P] Add package-specific README files for each workspace
- [x] T057 [P] Create development scripts for common workflows
- [x] T058 [P] Add VS Code workspace configuration (.vscode/settings.json)
- [x] T059 [P] Create Docker configuration for development environment
- [x] T060 Run quickstart.md validation to ensure all steps work

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Package configurations before source files
- Directory structures before file creation
- Dependency installation after all package.json files are created
- Build configurations before build testing
- Core implementation before integration testing

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All package configurations within a story marked [P] can run in parallel
- Directory creation tasks within a story marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all package configurations for User Story 1 together:
Task: "Create backend package.json in apps/backend/package.json"
Task: "Create frontend package.json in apps/frontend/package.json"
Task: "Create shared package.json in packages/shared/src/package.json"

# Launch all TypeScript configs for User Story 1 together:
Task: "Create backend TypeScript config extending root in apps/backend/tsconfig.json"
Task: "Create frontend TypeScript config extending root in apps/frontend/tsconfig.json"
Task: "Create shared TypeScript config extending root in packages/shared/tsconfig.json"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Shell Command Breakdown

### Phase 1: Setup Commands

```bash
mkdir -p apps packages
mkdir -p apps/backend/src apps/backend/tests/{contract,integration,unit}
mkdir -p apps/frontend/src apps/frontend/tests/{e2e,integration,unit}
mkdir -p packages/shared/src packages/shared/tests
```

### Phase 2: Foundational Commands

```bash
# Copy configuration files from contracts/
cp specs/001-monorepo-structure/contracts/workspace-config.yaml pnpm-workspace.yaml
cp specs/001-monorepo-structure/contracts/root-package.json package.json
cp specs/001-monorepo-structure/contracts/tsconfig.json tsconfig.json
cp specs/001-monorepo-structure/contracts/eslintrc.js .eslintrc.js
cp specs/001-monorepo-structure/contracts/prettierrc.json .prettierrc

# Setup git hooks
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

### Phase 3: User Story 1 Commands

```bash
# Create package configurations
cp specs/001-monorepo-structure/contracts/backend-package.json apps/backend/package.json
cp specs/001-monorepo-structure/contracts/frontend-package.json apps/frontend/package.json
cp specs/001-monorepo-structure/contracts/shared-package.json packages/shared/package.json

# Install dependencies
pnpm install

# Verify setup
pnpm list --depth=0
pnpm lint
pnpm format
```

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Shell commands are provided for rapid execution
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Focus on actionable shell commands as requested by user
