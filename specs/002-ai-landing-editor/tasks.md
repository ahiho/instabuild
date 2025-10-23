# Tasks: AI Model Selection Enhancement

**Input**: Design documents from `/specs/002-ai-landing-editor/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Feature Enhancement**: Currently using gpt-4. We should automatically select weak-model (ex. gpt-4o-mini) for simple tasks. Models should be config via env.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create workspace structure per implementation plan (apps/backend, apps/frontend, packages/shared)
- [x] T002 Initialize pnpm workspace with TypeScript strict mode configuration
- [x] T003 [P] Configure shared ESLint, Prettier, and TypeScript configurations in root
- [x] T004 [P] Setup Fastify backend workspace in apps/backend
- [x] T005 [P] Setup Vite + React frontend workspace in apps/frontend
- [x] T006 [P] Setup shared package workspace in packages/shared

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Setup Prisma database schema and migrations in apps/backend/prisma/schema.prisma
- [x] T008 [P] Configure environment variables structure in apps/backend/.env.example
- [x] T009 [P] Setup Fastify server with plugins in apps/backend/src/server.ts
- [x] T010 [P] Setup React routing and base components in apps/frontend/src
- [x] T011 Create base TypeScript types in packages/shared/src/types/index.ts
- [x] T012 [P] Configure error handling middleware in apps/backend/src/middleware/error.ts
- [x] T013 [P] Setup logging infrastructure in apps/backend/src/lib/logger.ts
- [x] T014 [P] Configure Vitest for unit testing in apps/backend and apps/frontend
- [x] T015 [P] Configure Playwright for E2E testing in apps/frontend
- [x] T016 Setup AI model configuration system in apps/backend/src/lib/ai-config.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Conversational Page Editing (Priority: P1) 🎯 MVP

**Goal**: Enable users to modify landing pages through natural language commands with intelligent model selection

**Independent Test**: Load a basic page template, type a modification command, verify change appears in live preview with appropriate model used

### Implementation for User Story 1

- [x] T017 [P] [US1] Create LandingPage entity types in packages/shared/src/types/landing-page.ts
- [x] T018 [P] [US1] Create ChatMessage entity types in packages/shared/src/types/chat.ts
- [x] T019 [P] [US1] Create AI model selection types in packages/shared/src/types/ai-models.ts
- [x] T020 [US1] Implement AI model selector service in apps/backend/src/services/model-selector.ts
- [x] T021 [US1] Implement chat processing service in apps/backend/src/services/chat.ts
- [x] T022 [US1] Implement page generation service in apps/backend/src/services/page-generator.ts
- [x] T023 [US1] Create chat API endpoints in apps/backend/src/routes/chat.ts
- [x] T024 [US1] Create pages API endpoints in apps/backend/src/routes/pages.ts
- [x] T025 [US1] Implement chat interface component in apps/frontend/src/components/ChatPanel.tsx
- [x] T026 [US1] Implement preview panel component in apps/frontend/src/components/PreviewPanel.tsx
- [x] T027 [US1] Create editor page layout in apps/frontend/src/pages/EditorPage.tsx
- [x] T028 [US1] Add model selection validation and error handling
- [x] T029 [US1] Add logging for AI model usage and performance metrics

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Direct Element Selection and Context (Priority: P2)

**Goal**: Enable precise element targeting through click selection with optimized model usage for selection tasks

**Independent Test**: Activate select mode, click on a specific element, give a command that applies only to that selected element

### Implementation for User Story 2

- [ ] T030 [P] [US2] Create element selection types in packages/shared/src/types/element-selection.ts
- [ ] T031 [US2] Implement element selection service in apps/backend/src/services/element-selector.ts
- [ ] T032 [US2] Extend chat service for element context in apps/backend/src/services/chat.ts
- [ ] T033 [US2] Add element selection endpoints in apps/backend/src/routes/elements.ts
- [ ] T034 [US2] Implement element selection mode in apps/frontend/src/components/PreviewPanel.tsx
- [ ] T035 [US2] Add element highlighting functionality in apps/frontend/src/lib/element-highlighter.ts
- [ ] T036 [US2] Integrate element context with chat interface in apps/frontend/src/components/ChatPanel.tsx
- [ ] T037 [US2] Add iframe communication for element selection in apps/frontend/src/lib/iframe-communication.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - AI-Driven Asset and Information Requests (Priority: P2)

**Goal**: Enable AI to proactively request additional information and assets with appropriate model selection for different request types

**Independent Test**: Give a command like "Add our company logo" and verify the AI requests a file upload using appropriate model

### Implementation for User Story 3

- [ ] T038 [P] [US3] Create asset management types in packages/shared/src/types/assets.ts
- [ ] T039 [P] [US3] Create tool calling types in packages/shared/src/types/tools.ts
- [ ] T040 [US3] Implement asset upload service in apps/backend/src/services/asset-manager.ts
- [ ] T041 [US3] Implement tool calling system in apps/backend/src/services/tool-handler.ts
- [ ] T042 [US3] Extend AI model selector for tool calling tasks in apps/backend/src/services/model-selector.ts
- [ ] T043 [US3] Add asset upload endpoints in apps/backend/src/routes/assets.ts
- [ ] T044 [US3] Implement file upload component in apps/frontend/src/components/FileUpload.tsx
- [ ] T045 [US3] Add tool calling UI in apps/frontend/src/components/ToolCallPanel.tsx
- [ ] T046 [US3] Integrate asset requests with chat flow in apps/frontend/src/components/ChatPanel.tsx

**Checkpoint**: All core user stories should now be independently functional

---

## Phase 6: User Story 4 - Version History and Rollback (Priority: P3)

**Goal**: Provide version control with rollback capability, using efficient models for version comparison tasks

**Independent Test**: Make several modifications, access version history, successfully roll back to an earlier state

### Implementation for User Story 4

- [ ] T047 [P] [US4] Create version control types in packages/shared/src/types/versions.ts
- [ ] T048 [US4] Implement version management service in apps/backend/src/services/version-manager.ts
- [ ] T049 [US4] Implement GitHub integration service in apps/backend/src/services/github-client.ts
- [ ] T050 [US4] Add version control endpoints in apps/backend/src/routes/versions.ts
- [ ] T051 [US4] Implement version history component in apps/frontend/src/components/VersionHistory.tsx
- [ ] T052 [US4] Add rollback functionality in apps/frontend/src/components/RollbackPanel.tsx
- [ ] T053 [US4] Integrate version control with editor interface in apps/frontend/src/pages/EditorPage.tsx

**Checkpoint**: All user stories should now be independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T054 [P] Add comprehensive error handling for AI model failures across all services
- [ ] T055 [P] Implement model usage analytics and cost tracking in apps/backend/src/services/analytics.ts
- [ ] T056 [P] Add model performance monitoring and automatic fallback logic
- [ ] T057 [P] Create environment configuration documentation in docs/configuration.md
- [ ] T058 [P] Add unit tests for model selection logic in apps/backend/tests/unit/model-selector.test.ts
- [ ] T059 [P] Add integration tests for chat functionality in apps/backend/tests/integration/chat.test.ts
- [ ] T060 [P] Add E2E tests for complete editing workflow in apps/frontend/tests/e2e/editor.spec.ts
- [ ] T061 Code cleanup and TypeScript strict mode compliance
- [ ] T062 Performance optimization for model switching and response times
- [ ] T063 Security hardening for AI API key management
- [ ] T064 Run quickstart.md validation with new model selection features

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Integrates with US1 but independently testable
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Integrates with US1 but independently testable
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - May integrate with all previous stories but independently testable

### Within Each User Story

- Types before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Types within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all types for User Story 1 together:
Task: "Create LandingPage entity types in packages/shared/src/types/landing-page.ts"
Task: "Create ChatMessage entity types in packages/shared/src/types/chat.ts"
Task: "Create AI model selection types in packages/shared/src/types/ai-models.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Conversational Page Editing with Smart Model Selection)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP with smart model selection!)
3. Add User Story 2 → Test independently → Deploy/Demo (+ Element Selection)
4. Add User Story 3 → Test independently → Deploy/Demo (+ Asset Management)
5. Add User Story 4 → Test independently → Deploy/Demo (+ Version Control)
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Core chat + model selection)
   - Developer B: User Story 2 (Element selection)
   - Developer C: User Story 3 (Asset management)
3. Stories complete and integrate independently

---

## Model Selection Strategy

### Environment Configuration

```env
# Primary models
OPENAI_STRONG_MODEL=gpt-4
OPENAI_WEAK_MODEL=gpt-4o-mini

# Fallback models
OPENAI_FALLBACK_MODEL=gpt-3.5-turbo

# Model selection thresholds
MODEL_COMPLEXITY_THRESHOLD=0.7
MODEL_RESPONSE_TIMEOUT=30000
```

### Task Classification

- **Simple tasks** (use weak model): Text changes, color updates, basic styling
- **Complex tasks** (use strong model): Layout restructuring, component generation, complex logic
- **Tool calling** (use strong model): Asset requests, form generation, API integrations
- **Element selection** (use weak model): Element identification, simple context parsing

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Model selection should be transparent to users but logged for analytics
- Environment variables must be validated on startup
- Fallback mechanisms required for model failures
- Cost optimization through intelligent model selection is a key success metric
