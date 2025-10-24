# Implementation Plan: EditorPage UI/UX Overhaul

**Branch**: `005-editor-page-redesign` | **Date**: 2025-10-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-editor-page-redesign/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

The EditorPage UI/UX overhaul replaces the current 3-column layout with a minimalist 2-column resizable design featuring chat (left) and preview (right) panels. The redesign moves version history and asset uploader to modal/sheet overlays, implements dark theme styling consistent with HomePage (#0a0e27 background, purple-300 accents), and ensures responsive behavior on mobile viewports. The technical approach uses shadcn/ui Resizable components for the 2-column layout, Dialog/Sheet components for modals, and Tailwind CSS dark theme utilities matching the existing HomePage design patterns.

## Technical Context

**Language/Version**: TypeScript 5.9.3 (strict mode enabled)
**Primary Dependencies**:

- Frontend: Vite 7.1.10, React 19, React Router 6.0, @tanstack/react-query 5.90.5
- UI: react-resizable-panels 3.0.6, @radix-ui components, Tailwind CSS 3.4.18
- Animation: Framer Motion 12.23.24
  **Storage**: N/A (feature is UI-only, uses existing API endpoints)
  **Testing**: Vitest 1.0.0 (unit tests), @testing-library/react 16.3.0 (component tests)
  **Target Platform**: Web browser (Chrome, Firefox, Safari, Edge - modern browsers supporting ES2020+)
  **Project Type**: Frontend (apps/frontend workspace)
  **Performance Goals**:
- Initial render <100ms for layout components
- Smooth 60fps panel resizing with no jank
- No layout shift during panel resize operations
  **Constraints**:
- Must maintain existing EditorPage functionality (no breaking changes to ChatPanel, PreviewPanel, or data fetching)
- Must match HomePage dark theme exactly (#0a0e27 background, purple-300 accents)
- Minimum panel widths: 20% (chat), 30% (preview)
- Mobile breakpoint at 768px (tailwind md: breakpoint)
  **Scale/Scope**:
- Single page component (EditorPage.tsx)
- 2-3 new UI components (ResizablePanels wrapper, VersionHistorySheet, AssetUploaderDialog)
- ~300-500 lines of new/modified code

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [x] **Monorepo Architecture**: Feature fits within pnpm workspace structure (apps/frontend workspace)
- [x] **TypeScript-First**: All code will use TypeScript 5.9.3 with strict mode enabled
- [x] **Shared Configuration**: Will inherit from root ESLint/Prettier/TypeScript configs (no local overrides needed)
- [x] **Full-Stack Integration**: Frontend uses Vite+React (backend not applicable for this UI-only feature)
- [x] **Code Quality Standards**: Plan includes Vitest unit tests, React Testing Library component tests, and pre-commit linting/type-checking hooks

**Constitution Compliance**: ✅ PASS - All principles satisfied. No violations or exceptions required.

**Post-Design Re-evaluation** (2025-10-24):

- [x] **Monorepo Architecture**: Confirmed - All code in apps/frontend workspace, no new packages required
- [x] **TypeScript-First**: Confirmed - All new components use strict TypeScript with comprehensive type definitions (see data-model.md)
- [x] **Shared Configuration**: Confirmed - No local overrides needed, inherits root ESLint/Prettier/TypeScript configs
- [x] **Full-Stack Integration**: Confirmed - Frontend-only feature, uses Vite+React as required
- [x] **Code Quality Standards**: Confirmed - Unit tests planned for EditorLayout, VersionHistorySheet, AssetUploaderDialog

**Final Verdict**: ✅ Constitution compliance maintained after design phase. No deviations detected.

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
apps/frontend/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── card.tsx (existing)
│   │   │   ├── button.tsx (existing)
│   │   │   ├── dialog.tsx (TO BE ADDED - shadcn/ui Dialog component)
│   │   │   ├── sheet.tsx (TO BE ADDED - shadcn/ui Sheet component)
│   │   │   └── resizable.tsx (TO BE ADDED - shadcn/ui Resizable component)
│   │   ├── layout/
│   │   │   ├── ThreeColumnLayout.tsx (TO BE REMOVED)
│   │   │   ├── CollapsibleSidebar.tsx (TO BE REMOVED)
│   │   │   ├── ResizablePreview.tsx (TO BE REMOVED/REPLACED)
│   │   │   └── EditorLayout.tsx (NEW - 2-column resizable layout)
│   │   ├── editor/
│   │   │   ├── VersionHistorySheet.tsx (NEW - version history modal)
│   │   │   └── AssetUploaderDialog.tsx (NEW - asset uploader modal)
│   │   ├── ChatPanel.tsx (existing, no changes)
│   │   └── PreviewPanel.tsx (existing, no changes)
│   ├── pages/
│   │   └── EditorPage.tsx (MODIFIED - use new layout)
│   └── lib/
│       └── utils.ts (existing - no changes expected)
└── tests/
    └── unit/
        └── components/
            └── editor/
                ├── EditorLayout.test.tsx (NEW)
                ├── VersionHistorySheet.test.tsx (NEW)
                └── AssetUploaderDialog.test.tsx (NEW)
```

**Structure Decision**: Frontend-only feature within the `apps/frontend` workspace. The implementation will:

1. Add 3 new shadcn/ui components (Dialog, Sheet, Resizable) to `components/ui/`
2. Create a new `components/editor/` directory for feature-specific components
3. Create a new `EditorLayout.tsx` component in `components/layout/` to replace `ThreeColumnLayout.tsx`
4. Remove obsolete layout components (ThreeColumnLayout, CollapsibleSidebar)
5. Modify `EditorPage.tsx` to use the new 2-column layout
6. Add unit tests for new components in `tests/unit/components/editor/`

## Complexity Tracking

_No violations detected. This section is empty._
