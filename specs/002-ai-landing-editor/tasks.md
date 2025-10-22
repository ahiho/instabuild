# Tasks: AI-Powered Landing Page Editor

**Input**: Design documents from `/specs/002-ai-landing-editor/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL - not explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend app**: `apps/backend/src/`, `apps/backend/tests/`
- **Frontend app**: `apps/frontend/src/`, `apps/frontend/tests/`
- **Shared package**: `packages/shared/src/`, `packages/shared/tests/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create monorepo workspace structure with apps/backend, apps/frontend, packages/shared directories
- [ ] T002 Initialize pnpm workspace configuration in package.json with TypeScript strict mode
- [ ] T003 [P] Configure shared ESLint, Prettier, and TypeScript configurations in root directory
- [ ] T004 [P] Setup Fastify backend workspace in apps/backend/package.json
- [ ] T005 [P] Setup Vite + React frontend workspace in apps/frontend/package.json
- [ ] T006 [P] Setup shared package workspace in packages/shared/package.json
- [ ] T007 Install core dependencies: Fastify, Prisma, TanStack Query v5, Vercel AI SDK

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T008 Setup Prisma schema with LandingPage, LandingPageVersion, Asset, ChatMessage, ModificationCommand models in apps/backend/prisma/schema.prisma
- [ ] T009 [P] Configure PostgreSQL database connection and environment variables in apps/backend/.env
- [ ] T010 [P] Setup MinIO/S3 client configuration in apps/backend/src/lib/storage.ts
- [ ] T011 [P] Configure GitHub API client in apps/backend/src/lib/github.ts
- [ ] T012 [P] Configure Vercel API client in apps/backend/src/lib/vercel.ts
- [ ] T013 Setup Fastify server with CORS, multipart, and logging in apps/backend/src/server.ts
- [ ] T014 [P] Configure React Router and base layout in apps/frontend/src/App.tsx
- [ ] T015 [P] Setup TanStack Query client configuration in apps/frontend/src/lib/query.ts
- [ ] T016 [P] Create shared TypeScript types in packages/shared/src/types/index.ts
- [ ] T017 Configure error handling middleware in apps/backend/src/middleware/error.ts
- [ ] T018 [P] Setup Vitest configuration for backend testing in apps/backend/vitest.config.ts
- [ ] T019 [P] Setup Vitest configuration for frontend testing in apps/frontend/vitest.config.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Conversational Page Editing (Priority: P1) 🎯 MVP

**Goal**: Users can modify landing pages using natural language commands with real-time preview updates

**Independent Test**: Load a basic page template, type "Change the header text to 'Welcome'", verify change appears in live preview

### Implementation for User Story 1

- [ ] T020 [P] [US1] Create LandingPage model interface in packages/shared/src/types/landing-page.ts
- [ ] T021 [P] [US1] Create ChatMessage model interface in packages/shared/src/types/chat.ts
- [ ] T022 [P] [US1] Create ModificationCommand model interface in packages/shared/src/types/modification.ts
- [ ] T023 [US1] Implement ChatService with OpenAI integration in apps/backend/src/services/chat.ts
- [ ] T024 [US1] Implement PageService for page management in apps/backend/src/services/page.ts
- [ ] T025 [US1] Implement ModificationService for command processing in apps/backend/src/services/modification.ts
- [ ] T026 [US1] Create POST /api/v1/pages endpoint in apps/backend/src/routes/pages.ts
- [ ] T027 [US1] Create POST /api/v1/pages/:pageId/chat endpoint in apps/backend/src/routes/chat.ts
- [ ] T028 [US1] Create GET /api/v1/pages/:pageId endpoint in apps/backend/src/routes/pages.ts
- [ ] T029 [US1] Implement EditorPage component in apps/frontend/src/pages/EditorPage.tsx
- [ ] T030 [US1] Implement ChatPanel component in apps/frontend/src/components/ChatPanel.tsx
- [ ] T031 [US1] Implement PreviewPanel component in apps/frontend/src/components/PreviewPanel.tsx
- [ ] T032 [US1] Setup useChat hook integration with Vercel AI SDK in apps/frontend/src/hooks/useChat.ts
- [ ] T033 [US1] Implement real-time preview updates with iframe communication in apps/frontend/src/lib/preview.ts
- [ ] T034 [US1] Add basic page template generation in apps/backend/src/services/template.ts

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Direct Element Selection and Context (Priority: P2)

**Goal**: Users can click on preview elements to provide precise context for commands

**Independent Test**: Activate select mode, click on a specific button, give command "Change this to red", verify only selected element changes

### Implementation for User Story 2

- [ ] T035 [P] [US2] Create ElementSelection interface in packages/shared/src/types/element.ts
- [ ] T036 [US2] Implement element selection service in apps/backend/src/services/element.ts
- [ ] T037 [US2] Add selectedElementId parameter to chat endpoint in apps/backend/src/routes/chat.ts
- [ ] T038 [US2] Implement SelectModeProvider context in apps/frontend/src/contexts/SelectModeContext.tsx
- [ ] T039 [US2] Add element highlighting in PreviewPanel component in apps/frontend/src/components/PreviewPanel.tsx
- [ ] T040 [US2] Implement element click detection with postMessage in apps/frontend/src/lib/element-selection.ts
- [ ] T041 [US2] Add select mode toggle button in apps/frontend/src/components/SelectModeToggle.tsx
- [ ] T042 [US2] Update ChatPanel to show selected element context in apps/frontend/src/components/ChatPanel.tsx
- [ ] T043 [US2] Implement element metadata injection during code generation in apps/backend/src/services/code-generation.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - AI-Driven Asset and Information Requests (Priority: P2)

**Goal**: AI proactively requests missing information through interactive prompts in chat flow

**Independent Test**: Give command "Add our company logo", verify AI requests file upload through chat interface

### Implementation for User Story 3

- [ ] T044 [P] [US3] Create Asset model interface in packages/shared/src/types/asset.ts
- [ ] T045 [P] [US3] Create ToolCall interface for AI function calling in packages/shared/src/types/tool-call.ts
- [ ] T046 [US3] Implement AssetService for file upload handling in apps/backend/src/services/asset.ts
- [ ] T047 [US3] Create POST /api/v1/pages/:pageId/assets endpoint in apps/backend/src/routes/assets.ts
- [ ] T048 [US3] Add tool calling configuration to ChatService in apps/backend/src/services/chat.ts
- [ ] T049 [US3] Implement requestAsset tool function in apps/backend/src/tools/request-asset.ts
- [ ] T050 [US3] Implement modifyElement tool function in apps/backend/src/tools/modify-element.ts
- [ ] T051 [US3] Create FileUploadPrompt component in apps/frontend/src/components/FileUploadPrompt.tsx
- [ ] T052 [US3] Create InfoRequestPrompt component in apps/frontend/src/components/InfoRequestPrompt.tsx
- [ ] T053 [US3] Update ChatPanel to handle tool call responses in apps/frontend/src/components/ChatPanel.tsx
- [ ] T054 [US3] Implement asset upload handling in apps/frontend/src/hooks/useAssetUpload.ts
- [ ] T055 [US3] Add asset integration to code generation service in apps/backend/src/services/code-generation.ts

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: User Story 4 - Version History and Rollback (Priority: P3)

**Goal**: Users can view chronological history and restore to any previous state

**Independent Test**: Make several modifications, access version history, successfully roll back to earlier state

### Implementation for User Story 4

- [ ] T056 [P] [US4] Create LandingPageVersion interface in packages/shared/src/types/version.ts
- [ ] T057 [US4] Implement VersionService for history management in apps/backend/src/services/version.ts
- [ ] T058 [US4] Create GET /api/v1/pages/:pageId/versions endpoint in apps/backend/src/routes/versions.ts
- [ ] T059 [US4] Create POST /api/v1/pages/:pageId/versions/:versionId/rollback endpoint in apps/backend/src/routes/versions.ts
- [ ] T060 [US4] Implement VersionHistory component in apps/frontend/src/components/VersionHistory.tsx
- [ ] T061 [US4] Create VersionListItem component in apps/frontend/src/components/VersionListItem.tsx
- [ ] T062 [US4] Add version history panel to EditorPage in apps/frontend/src/pages/EditorPage.tsx
- [ ] T063 [US4] Implement version rollback functionality in apps/frontend/src/hooks/useVersionRollback.ts
- [ ] T064 [US4] Update PageService to create versions on modifications in apps/backend/src/services/page.ts
- [ ] T065 [US4] Add GitHub commit creation for each version in apps/backend/src/services/github.ts

**Checkpoint**: All user stories should now be independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T066 [P] Add comprehensive error handling across all services in apps/backend/src/middleware/
- [ ] T067 [P] Implement loading states for all async operations in apps/frontend/src/components/
- [ ] T068 [P] Add input validation for all API endpoints in apps/backend/src/validation/
- [ ] T069 [P] Implement proper TypeScript error types in packages/shared/src/types/errors.ts
- [ ] T070 [P] Add logging for all user operations in apps/backend/src/lib/logger.ts
- [ ] T071 [P] Optimize preview iframe performance in apps/frontend/src/components/PreviewPanel.tsx
- [ ] T072 [P] Add accessibility features to all UI components in apps/frontend/src/components/
- [ ] T073 Run quickstart.md validation and update documentation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P2 → P3)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Integrates with US1 but independently testable
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Integrates with US1 but independently testable
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Integrates with US1 but independently testable

### Within Each User Story

- Models/types before services
- Services before endpoints
- Backend endpoints before frontend components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all types for User Story 1 together:
Task: "Create LandingPage model interface in packages/shared/src/types/landing-page.ts"
Task: "Create ChatMessage model interface in packages/shared/src/types/chat.ts"
Task: "Create ModificationCommand model interface in packages/shared/src/types/modification.ts"
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
5. Add User Story 4 → Test independently → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Conversational Editing)
   - Developer B: User Story 2 (Element Selection)
   - Developer C: User Story 3 (Asset Requests)
   - Developer D: User Story 4 (Version History)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
