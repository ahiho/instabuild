---
description: 'Task list for EditorPage UI/UX Overhaul implementation'
---

# Tasks: EditorPage UI/UX Overhaul

**Input**: Design documents from `/specs/005-editor-page-redesign/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are NOT required for this UI-only feature per the specification

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend app**: `apps/frontend/src/`, `apps/frontend/tests/`
- All tasks are frontend-only (UI redesign)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install required shadcn/ui components and create types

- [X] T001 Install shadcn/ui resizable, dialog, and sheet components using `npx shadcn@latest add resizable dialog sheet` in apps/frontend
- [X] T002 [P] Create TypeScript types file at apps/frontend/src/types/editor.ts with EditorLayoutProps, VersionHistorySheetProps, AssetUploaderDialogProps, and THEME_CONFIG
- [X] T003 Verify shadcn/ui components installed correctly (check apps/frontend/src/components/ui/resizable.tsx, dialog.tsx, sheet.tsx)
- [X] T004 Run type-check to ensure TypeScript configuration is correct: `pnpm run type-check:frontend`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create core layout component that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create EditorLayout component at apps/frontend/src/components/layout/EditorLayout.tsx with ResizablePanelGroup, ResizablePanel, and ResizableHandle
- [X] T006 Implement responsive layout detection in EditorLayout (useEffect hook to detect window width <768px and switch between horizontal/vertical direction)
- [X] T007 Add dark theme styling to EditorLayout (bg-[#0a0e27], purple-500/50 hover on resize handle, border-gray-800)
- [X] T008 Configure panel constraints in EditorLayout (chat minSize: 20%, defaultSize: 30%; preview minSize: 30%, defaultSize: 70%)
- [X] T009 Hide ResizableHandle on mobile viewports (<768px) in EditorLayout

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Live Preview While Chatting (Priority: P1) 🎯 MVP

**Goal**: Enable users to see chat and preview panels simultaneously on desktop viewports with a 2-column resizable layout

**Independent Test**: Open an existing page in the editor on desktop viewport and verify that (a) chat panel is visible on the left at 30% width, (b) preview iframe is visible on the right at 70% width, and (c) both panels are visible simultaneously without scrolling

### Implementation for User Story 1

- [X] T010 [US1] Update EditorPage.tsx to replace old layout imports with EditorLayout import (remove ThreeColumnLayout, CollapsibleSidebar, ResizablePreview imports)
- [X] T011 [US1] Modify EditorPage.tsx render method to use EditorLayout component with chatPanel and previewPanel props
- [X] T012 [US1] Wrap ChatPanel in Card component with dark theme styling (bg-black/40, backdrop-blur-sm, border-gray-800) in EditorPage.tsx
- [X] T013 [US1] Wrap PreviewPanel in Card component with dark theme styling (bg-black/40, backdrop-blur-sm, border-gray-800) in EditorPage.tsx
- [X] T014 [US1] Add panel headers to chat and preview Cards (text-white, border-b border-gray-800, px-4 py-2) in EditorPage.tsx
- [X] T015 [US1] Update loading state in EditorPage.tsx with dark theme styling (text-white on bg-[#0a0e27])
- [X] T016 [US1] Update error state in EditorPage.tsx with dark theme styling (text-red-400 on bg-[#0a0e27])
- [X] T017 [US1] Remove obsolete layout component files: apps/frontend/src/components/layout/ThreeColumnLayout.tsx
- [X] T018 [US1] Remove obsolete layout component files: apps/frontend/src/components/layout/CollapsibleSidebar.tsx
- [X] T019 [US1] Remove obsolete layout component files: apps/frontend/src/components/layout/ResizablePreview.tsx
- [X] T020 [US1] Update apps/frontend/src/components/layout/index.ts to export EditorLayout and remove old layout exports
- [X] T021 [US1] Manual test: Verify 2-column layout displays correctly on desktop with chat left (30%) and preview right (70%)

**Checkpoint**: At this point, User Story 1 should be fully functional - users can see both panels simultaneously on desktop

---

## Phase 4: User Story 2 - Resize Panels for Custom Workspace (Priority: P2)

**Goal**: Allow users to adjust the relative sizes of chat and preview panels by dragging a resize handle

**Independent Test**: Drag the resize handle between chat and preview panels and verify both panels resize smoothly without breaking layout or functionality

### Implementation for User Story 2

- [X] T022 [US2] Verify ResizableHandle is visible and discoverable in EditorLayout (w-2, bg-gray-800 styling applied)
- [X] T023 [US2] Add hover state to ResizableHandle in EditorLayout (hover:bg-purple-500/50 transition-colors)
- [X] T024 [US2] Test panel resizing enforces minimum width constraints (chat 20%, preview 30%)
- [X] T025 [US2] Verify resize state does not persist across page refreshes (panels reset to default 30/70 split)
- [X] T026 [US2] Manual test: Drag resize handle and verify smooth 60fps resizing with no jank or layout shift

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - users can resize panels smoothly

---

## Phase 5: User Story 3 - Access Version History Without Clutter (Priority: P2)

**Goal**: Provide access to version history via an icon button that opens a slide-out Sheet panel

**Independent Test**: Click version history icon button in chat panel header and verify (a) Sheet opens from right displaying version history, (b) main editor layout unchanged, (c) Sheet can be closed

### Implementation for User Story 3

- [X] T027 [P] [US3] Create VersionHistorySheet component at apps/frontend/src/components/editor/VersionHistorySheet.tsx
- [X] T028 [US3] Import Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger from @/components/ui/sheet in VersionHistorySheet
- [X] T029 [US3] Implement Sheet trigger as History icon button (lucide-react) with ghost variant and icon size in VersionHistorySheet
- [X] T030 [US3] Configure SheetContent to slide from right with 400px width in VersionHistorySheet
- [X] T031 [US3] Apply dark theme styling to SheetContent (bg-black/95, border-gray-800, text-white) in VersionHistorySheet
- [X] T032 [US3] Add SheetHeader with "Version History" title (text-white) in VersionHistorySheet
- [X] T033 [US3] Display current version number (currentVersionNumber prop) in VersionHistorySheet
- [X] T034 [US3] Add placeholder text for version list ("Version history will be displayed here...") in VersionHistorySheet
- [X] T035 [US3] Add VersionHistorySheet to chat panel header in EditorPage.tsx (pass pageId and currentVersionNumber props)
- [X] T036 [US3] Manual test: Click version history icon and verify Sheet opens from right with current version number displayed

**Checkpoint**: User Story 3 complete - version history is accessible via icon button without cluttering main editor view

---

## Phase 6: User Story 4 - Upload Assets On-Demand (Priority: P3)

**Goal**: Provide asset upload functionality via an icon button that opens a centered Dialog modal

**Independent Test**: Click asset uploader icon button in chat panel header and verify (a) Dialog opens with upload interface, (b) files can be selected, (c) Dialog can be closed

### Implementation for User Story 4

- [X] T037 [P] [US4] Create AssetUploaderDialog component at apps/frontend/src/components/editor/AssetUploaderDialog.tsx
- [X] T038 [US4] Import Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger from @/components/ui/dialog in AssetUploaderDialog
- [X] T039 [US4] Implement Dialog trigger as Upload icon button (lucide-react) with ghost variant and icon size in AssetUploaderDialog
- [X] T040 [US4] Apply dark theme styling to DialogContent (bg-black/95, border-gray-800, text-white) in AssetUploaderDialog
- [X] T041 [US4] Add DialogHeader with "Upload Assets" title (text-white) in AssetUploaderDialog
- [X] T042 [US4] Create file input with accept="image/\*" multiple attributes in AssetUploaderDialog
- [X] T043 [US4] Style file input with dark theme (file:bg-purple-600 file:text-white hover:file:bg-purple-700) in AssetUploaderDialog
- [X] T044 [US4] Add helper text below file input ("Upload images (PNG, JPG, SVG, WebP). Max 5MB per file.") in AssetUploaderDialog
- [X] T045 [US4] Implement handleFileSelect function to log selected files (TODO: actual upload implementation) in AssetUploaderDialog
- [X] T046 [US4] Add AssetUploaderDialog to chat panel header in EditorPage.tsx (pass pageId prop)
- [X] T047 [US4] Manual test: Click asset uploader icon and verify Dialog opens with file input, files can be selected, Dialog can be closed

**Checkpoint**: User Story 4 complete - asset uploader is accessible on-demand without permanent screen space

---

## Phase 7: User Story 5 - Use Editor on Mobile Devices (Priority: P3)

**Goal**: Enable mobile users to access both chat and preview panels via vertical stacking on small viewports

**Independent Test**: Access editor on mobile viewport (width <768px) and verify (a) panels stack vertically, (b) both chat and preview are accessible via scrolling, (c) interface remains functional

### Implementation for User Story 5

- [X] T048 [US5] Verify EditorLayout switches to vertical direction when isMobile is true (already implemented in T006)
- [X] T049 [US5] Verify ResizableHandle is hidden on mobile viewports (already implemented in T009)
- [X] T050 [US5] Test vertical stacking behavior by resizing browser window to <768px width
- [X] T051 [US5] Verify chat panel appears on top, preview panel appears below in vertical layout
- [X] T052 [US5] Test scrolling functionality on mobile - verify both panels are accessible
- [X] T053 [US5] Test chat interaction on mobile (typing message, sending) works without layout issues
- [X] T054 [US5] Manual test: Open editor on actual mobile device or use browser dev tools mobile emulation to verify vertical layout and functionality

**Checkpoint**: All user stories complete - editor is fully functional on desktop and mobile viewports

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, cleanup, and documentation

- [ ] T055 [P] Create unit test for EditorLayout component at apps/frontend/tests/unit/components/editor/EditorLayout.test.tsx (verify panels render, default sizes)
- [ ] T056 [P] Create unit test for VersionHistorySheet component at apps/frontend/tests/unit/components/editor/VersionHistorySheet.test.tsx (verify Sheet opens, displays version)
- [ ] T057 [P] Create unit test for AssetUploaderDialog component at apps/frontend/tests/unit/components/editor/AssetUploaderDialog.test.tsx (verify Dialog opens, file input works)
- [ ] T058 Run full type-check across frontend: `pnpm run type-check:frontend`
- [X] T059 Run build to verify no build errors: `pnpm run build:frontend`
- [ ] T060 Run unit tests: `pnpm test` (from apps/frontend)
- [X] T061 Manual accessibility check: Verify color contrast ratios meet WCAG AA (white on #0a0e27: 17.8:1, purple-300 on #0a0e27: 10.5:1)
- [X] T062 Manual performance check: Verify panel resizing is smooth at 60fps with no jank
- [ ] T063 Cross-browser testing: Verify editor works on Chrome, Firefox, Safari, Edge
- [X] T064 Code cleanup: Remove any console.log statements, unused imports, or commented code
- [X] T065 Update components/editor/index.ts to export VersionHistorySheet and AssetUploaderDialog (if index file exists)
- [X] T066 Verify all tasks in quickstart.md are functional and accurate
- [X] T067 Final validation: Complete all manual tests from User Stories 1-5

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed) OR sequentially in priority order (US1 → US2 → US3 → US4 → US5)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories ✅ MVP
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Enhances US1 but independently testable
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Independently testable (requires US1 for chat panel header)
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Independently testable (requires US1 for chat panel header)
- **User Story 5 (P3)**: Can start after Foundational (Phase 2) - Tests US1 on mobile, requires US1 complete

### Within Each User Story

- Layout components before page integration
- Component creation before integration into EditorPage
- Implementation before manual testing
- Story complete before moving to next priority

### Parallel Opportunities

- T002 (types) can run in parallel with T001 (component installation) once installation completes
- T027 (VersionHistorySheet) and T037 (AssetUploaderDialog) can be created in parallel (different files)
- T055, T056, T057 (unit tests) can run in parallel (different files)
- User Stories 3 and 4 can be worked on in parallel by different developers (both depend only on US1)

---

## Parallel Example: User Story 3 & 4

```bash
# These tasks can run together (different files, no dependencies):
Task T027: "Create VersionHistorySheet component at apps/frontend/src/components/editor/VersionHistorySheet.tsx"
Task T037: "Create AssetUploaderDialog component at apps/frontend/src/components/editor/AssetUploaderDialog.tsx"

# These tasks can run together (different test files):
Task T055: "Create unit test for EditorLayout"
Task T056: "Create unit test for VersionHistorySheet"
Task T057: "Create unit test for AssetUploaderDialog"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup ✅
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories) ✅
3. Complete Phase 3: User Story 1 ✅
4. **STOP and VALIDATE**: Test User Story 1 independently (2-column layout with chat + preview)
5. Deploy/demo if ready (minimum viable editor experience)

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready ✅
2. Add User Story 1 → Test independently → Deploy/Demo (MVP! ✅)
3. Add User Story 2 → Test independently → Deploy/Demo (Resizable panels ✅)
4. Add User Story 3 → Test independently → Deploy/Demo (Version history access ✅)
5. Add User Story 4 → Test independently → Deploy/Demo (Asset upload access ✅)
6. Add User Story 5 → Test independently → Deploy/Demo (Mobile support ✅)
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (MUST complete first - others depend on it)
   - Once US1 is done:
     - Developer A: User Story 2 (enhances US1 panels)
     - Developer B: User Story 3 (version history sheet)
     - Developer C: User Story 4 (asset uploader dialog)
   - Developer A or B or C: User Story 5 (test mobile, requires US1)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- User Story 1 is the foundation for US3, US4, US5 (they add features to the base layout)
- User Story 2 enhances US1 but doesn't block other stories
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- No backend work required - this is a UI-only feature
- Tests are optional per spec, but included in Phase 8 for quality assurance
- All manual tests should be performed on both desktop and mobile viewports where applicable
