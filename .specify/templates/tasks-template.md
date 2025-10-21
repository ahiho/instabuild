---
description: 'Task list template for feature implementation'
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The examples below include test tasks. Tests are OPTIONAL - only include them if explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend service**: `apps/backend/src/`, `apps/backend/tests/`
- **Frontend app**: `apps/frontend/src/`, `apps/frontend/tests/`
- **Shared package**: `packages/shared/src/`, `packages/shared/tests/`
- **Full-stack**: `apps/backend/`, `apps/frontend/`, `packages/shared/`
- Paths shown below assume backend service - adjust based on plan.md structure

<!--
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.

  The /speckit.tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/

  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment

  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create workspace structure per implementation plan (apps/, packages/)
- [ ] T002 Initialize pnpm workspace with TypeScript and strict mode
- [ ] T003 [P] Configure shared ESLint, Prettier, and TypeScript configurations
- [ ] T004 [P] Setup Fastify backend workspace (if applicable)
- [ ] T005 [P] Setup Vite + React frontend workspace (if applicable)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

Examples of foundational tasks (adjust based on your project):

- [ ] T006 Setup database schema and migrations framework (if applicable)
- [ ] T007 [P] Implement authentication/authorization framework
- [ ] T008 [P] Setup Fastify routing and middleware structure (backend)
- [ ] T009 [P] Setup React routing and component structure (frontend)
- [ ] T010 Create base TypeScript types and interfaces in shared package
- [ ] T011 Configure error handling and logging infrastructure
- [ ] T012 Setup environment configuration management
- [ ] T013 [P] Configure Vitest for unit testing
- [ ] T014 [P] Configure Playwright for E2E testing (if applicable)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 1 (OPTIONAL - only if tests requested) ⚠️

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T015 [P] [US1] Contract test for [endpoint] in apps/backend/tests/contract/test\_[name].ts
- [ ] T016 [P] [US1] Integration test for [user journey] in apps/frontend/tests/integration/test\_[name].ts

### Implementation for User Story 1

- [ ] T017 [P] [US1] Create [Entity1] type in packages/shared/src/types/[entity1].ts
- [ ] T018 [P] [US1] Create [Entity2] type in packages/shared/src/types/[entity2].ts
- [ ] T019 [US1] Implement [Service] in apps/backend/src/services/[service].ts (depends on T017, T018)
- [ ] T020 [US1] Implement [endpoint/route] in apps/backend/src/routes/[route].ts
- [ ] T021 [US1] Implement [component/page] in apps/frontend/src/[location]/[file].tsx (if applicable)
- [ ] T022 [US1] Add validation and error handling with TypeScript types
- [ ] T023 [US1] Add logging for user story 1 operations

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 2 (OPTIONAL - only if tests requested) ⚠️

- [ ] T024 [P] [US2] Contract test for [endpoint] in apps/backend/tests/contract/test\_[name].ts
- [ ] T025 [P] [US2] Integration test for [user journey] in apps/frontend/tests/integration/test\_[name].ts

### Implementation for User Story 2

- [ ] T026 [P] [US2] Create [Entity] type in packages/shared/src/types/[entity].ts
- [ ] T027 [US2] Implement [Service] in apps/backend/src/services/[service].ts
- [ ] T028 [US2] Implement [endpoint/route] in apps/backend/src/routes/[route].ts
- [ ] T029 [US2] Implement [component/page] in apps/frontend/src/[location]/[file].tsx (if applicable)
- [ ] T030 [US2] Integrate with User Story 1 components (if needed)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 3 (OPTIONAL - only if tests requested) ⚠️

- [ ] T031 [P] [US3] Contract test for [endpoint] in apps/backend/tests/contract/test\_[name].ts
- [ ] T032 [P] [US3] Integration test for [user journey] in apps/frontend/tests/integration/test\_[name].ts

### Implementation for User Story 3

- [ ] T033 [P] [US3] Create [Entity] type in packages/shared/src/types/[entity].ts
- [ ] T034 [US3] Implement [Service] in apps/backend/src/services/[service].ts
- [ ] T035 [US3] Implement [endpoint/route] in apps/backend/src/routes/[route].ts
- [ ] T036 [US3] Implement [component/page] in apps/frontend/src/[location]/[file].tsx (if applicable)

**Checkpoint**: All user stories should now be independently functional

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] TXXX [P] Documentation updates in docs/
- [ ] TXXX Code cleanup and refactoring
- [ ] TXXX Performance optimization across all stories
- [ ] TXXX [P] Additional unit tests (if requested) in tests/unit/
- [ ] TXXX Security hardening
- [ ] TXXX Run quickstart.md validation

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

- Tests (if included) MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (if tests requested):
Task: "Contract test for [endpoint] in apps/backend/tests/contract/test_[name].ts"
Task: "Integration test for [user journey] in apps/frontend/tests/integration/test_[name].ts"

# Launch all types for User Story 1 together:
Task: "Create [Entity1] type in packages/shared/src/types/[entity1].ts"
Task: "Create [Entity2] type in packages/shared/src/types/[entity2].ts"
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

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
