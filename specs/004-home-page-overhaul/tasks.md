# Tasks: Home Page UI/UX Overhaul

**Input**: Design documents from `/specs/004-home-page-overhaul/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are NOT explicitly requested in the feature specification, so no test tasks are included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependencies for home page overhaul

- [x] T001 Install Framer Motion for animations in apps/frontend/package.json
- [x] T002 [P] Create home components directory structure in apps/frontend/src/components/home/
- [x] T003 [P] Create animations utility directory in apps/frontend/src/lib/animations/
- [x] T004 [P] Create showcase assets directory in apps/frontend/src/assets/showcase/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types and utilities that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create TypeScript interfaces in apps/frontend/src/types/home.ts
- [x] T006 [P] Create animation configuration utilities in apps/frontend/src/lib/animations/config.ts
- [x] T007 [P] Create performance monitoring utilities in apps/frontend/src/lib/animations/performance.ts
- [x] T008 [P] Setup reduced motion detection in apps/frontend/src/lib/animations/accessibility.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Immediate AI Product Engagement (Priority: P1) 🎯 MVP

**Goal**: Professional dynamic background and hero section with direct prompt input for immediate AI engagement

**Independent Test**: Visit home page, see dynamic background and professional design, type in hero prompt, click generate to see immediate AI functionality

### Implementation for User Story 1

- [x] T009 [P] [US1] Create DynamicBackground component in apps/frontend/src/components/home/DynamicBackground.tsx
- [x] T010 [P] [US1] Create HeroSection component in apps/frontend/src/components/home/HeroSection.tsx
- [x] T011 [US1] Integrate DynamicBackground into HomePage in apps/frontend/src/pages/HomePage.tsx
- [x] T012 [US1] Integrate HeroSection into HomePage in apps/frontend/src/pages/HomePage.tsx
- [x] T013 [US1] Remove backend health status component from HomePage in apps/frontend/src/pages/HomePage.tsx
- [x] T014 [US1] Add CSS animations for dynamic background in apps/frontend/src/components/home/DynamicBackground.tsx
- [x] T015 [US1] Implement hero prompt validation and submission in apps/frontend/src/components/home/HeroSection.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Product Capability Validation (Priority: P2)

**Goal**: Auto-scrolling showcase carousel displaying high-quality example pages for social proof

**Independent Test**: Scroll to showcase section and view auto-scrolling carousel of example pages without needing to generate anything

### Implementation for User Story 2

- [x] T016 [P] [US2] Create ShowcaseCarousel component in apps/frontend/src/components/home/ShowcaseCarousel.tsx
- [x] T017 [P] [US2] Create example showcase data in apps/frontend/src/data/showcase-examples.ts
- [x] T018 [US2] Add showcase example images to apps/frontend/src/assets/showcase/
- [x] T019 [US2] Implement auto-scroll logic in ShowcaseCarousel component
- [x] T020 [US2] Integrate ShowcaseCarousel into HomePage in apps/frontend/src/pages/HomePage.tsx
- [x] T021 [US2] Add image optimization and lazy loading in ShowcaseCarousel component
- [x] T022 [US2] Implement accessibility features for carousel in ShowcaseCarousel component

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Feature Understanding and Trust Building (Priority: P3)

**Goal**: Polished feature cards with custom icons and hover effects for professional presentation

**Independent Test**: View redesigned feature cards with icons and hover effects to understand product capabilities

### Implementation for User Story 3

- [x] T023 [P] [US3] Create FeatureCards component in apps/frontend/src/components/home/FeatureCards.tsx
- [x] T024 [P] [US3] Create feature cards data in apps/frontend/src/data/feature-cards.ts
- [x] T025 [P] [US3] Add custom icons for features in apps/frontend/src/components/ui/icons/
- [x] T026 [US3] Implement hover effects with Framer Motion in FeatureCards component
- [x] T027 [US3] Integrate FeatureCards into HomePage in apps/frontend/src/pages/HomePage.tsx
- [x] T028 [US3] Add responsive design for feature cards in FeatureCards component

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T029 [P] Create home components index file in apps/frontend/src/components/home/index.ts
- [x] T030 [P] Optimize performance across all animations for 60fps target
- [x] T031 [P] Add error boundaries for home page components in apps/frontend/src/components/home/ErrorBoundary.tsx
- [x] T032 [P] Implement responsive design optimizations across all components
- [x] T033 Add final integration and layout adjustments in apps/frontend/src/pages/HomePage.tsx
- [x] T034 Validate quickstart.md requirements and performance criteria

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
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent of US1
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Independent of US1/US2

### Within Each User Story

- Component creation before integration
- Data/assets before component implementation
- Core functionality before accessibility features
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Component creation tasks within each story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch component creation for User Story 1 together:
Task: "Create DynamicBackground component in apps/frontend/src/components/home/DynamicBackground.tsx"
Task: "Create HeroSection component in apps/frontend/src/components/home/HeroSection.tsx"
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
   - Developer A: User Story 1 (Dynamic background + Hero section)
   - Developer B: User Story 2 (Showcase carousel)
   - Developer C: User Story 3 (Feature cards)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- No tests included as not explicitly requested in specification
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Focus on performance: <2s page load, 60fps animations, <100ms hover response
- Maintain accessibility compliance throughout implementation
