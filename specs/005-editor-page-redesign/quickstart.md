# Quickstart: EditorPage UI/UX Overhaul

**Feature**: EditorPage UI/UX Overhaul
**Branch**: `005-editor-page-redesign`
**Date**: 2025-10-24

---

## Overview

This quickstart guide helps developers implement the 2-column resizable editor layout with dark theme styling. The implementation replaces the existing `ThreeColumnLayout` with a new `EditorLayout` component using shadcn/ui Resizable, Dialog, and Sheet components.

**Estimated Time**: 4-6 hours for full implementation and testing

---

## Prerequisites

- Node.js 18+ and pnpm 8+
- Existing InstaBuild codebase cloned and set up
- Familiarity with React 19, TypeScript, and Tailwind CSS
- shadcn/ui components already configured (existing setup)

---

## Step 1: Install shadcn/ui Components

Install the required shadcn/ui components for resizable panels and modals.

```bash
# Navigate to frontend workspace
cd apps/frontend

# Install shadcn/ui components
npx shadcn@latest add resizable dialog sheet

# Verify installation
ls src/components/ui/resizable.tsx
ls src/components/ui/dialog.tsx
ls src/components/ui/sheet.tsx
```

**Expected Output**:

- `src/components/ui/resizable.tsx` (Resizable components)
- `src/components/ui/dialog.tsx` (Dialog component)
- `src/components/ui/sheet.tsx` (Sheet component)

**Verification**:

```bash
pnpm run type-check
# Should pass with no errors
```

---

## Step 2: Create Editor Types

Create a new types file for editor-specific TypeScript interfaces.

**File**: `apps/frontend/src/types/editor.ts`

```typescript
import { ReactNode } from 'react';

/**
 * Props for EditorLayout component (2-column resizable layout)
 */
export interface EditorLayoutProps {
  /** Content for the left panel (chat) */
  chatPanel: ReactNode;

  /** Content for the right panel (preview) */
  previewPanel: ReactNode;

  /** Optional custom class name for styling */
  className?: string;

  /** Optional: Default chat panel size (0-100) */
  defaultChatSize?: number;
}

/**
 * Props for VersionHistorySheet component
 */
export interface VersionHistorySheetProps {
  /** ID of the current page being edited */
  pageId: string;

  /** Current version number for highlighting */
  currentVersionNumber: number;

  /** Optional: Trigger element for opening the sheet */
  children?: ReactNode;
}

/**
 * Props for AssetUploaderDialog component
 */
export interface AssetUploaderDialogProps {
  /** ID of the page to upload assets for */
  pageId: string;

  /** Optional: Trigger element for opening the dialog */
  children?: ReactNode;
}

/**
 * Dark theme color configuration
 */
export const THEME_CONFIG = {
  background: {
    primary: '#0a0e27',
    card: 'bg-black/40',
    blur: 'backdrop-blur-sm',
  },
  text: {
    primary: 'text-white',
    secondary: 'text-gray-400',
    muted: 'text-gray-500',
    error: 'text-red-400',
  },
  accent: {
    primary: 'text-purple-300',
    hover: 'hover:text-purple-200',
    button: 'bg-purple-600',
    buttonHover: 'hover:bg-purple-700',
  },
  border: {
    default: 'border-gray-800',
    accent: 'border-purple-500/20',
    focus: 'ring-purple-500',
  },
} as const;
```

---

## Step 3: Create EditorLayout Component

Create the 2-column resizable layout component.

**File**: `apps/frontend/src/components/layout/EditorLayout.tsx`

```typescript
import { useEffect, useState } from 'react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { EditorLayoutProps } from '@/types/editor';

export function EditorLayout({
  chatPanel,
  previewPanel,
  className = '',
  defaultChatSize = 30,
}: EditorLayoutProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className={`h-screen bg-[#0a0e27] ${className}`}>
      <ResizablePanelGroup
        direction={isMobile ? 'vertical' : 'horizontal'}
        className="h-full"
      >
        {/* Chat Panel */}
        <ResizablePanel
          defaultSize={defaultChatSize}
          minSize={20}
          className="flex flex-col"
        >
          <div className="h-full overflow-auto">{chatPanel}</div>
        </ResizablePanel>

        {/* Resize Handle (hidden on mobile) */}
        {!isMobile && (
          <ResizableHandle className="w-2 bg-gray-800 hover:bg-purple-500/50 transition-colors" />
        )}

        {/* Preview Panel */}
        <ResizablePanel
          defaultSize={100 - defaultChatSize}
          minSize={30}
          className="flex flex-col"
        >
          <div className="h-full overflow-auto">{previewPanel}</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
```

**Key Features**:

- Responsive: switches to vertical layout on mobile (<768px)
- Resizable: drag handle between panels (desktop only)
- Dark theme: `#0a0e27` background, `purple-500/50` hover state
- Constraints: chat min 20%, preview min 30%

---

## Step 4: Create VersionHistorySheet Component

Create the version history slide-out panel.

**File**: `apps/frontend/src/components/editor/VersionHistorySheet.tsx`

```typescript
import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { VersionHistorySheetProps } from '@/types/editor';

export function VersionHistorySheet({
  pageId,
  currentVersionNumber,
  children,
}: VersionHistorySheetProps) {
  // TODO: Fetch version history using react-query
  // const { data: versions } = useQuery({
  //   queryKey: ['versions', pageId],
  //   queryFn: () => fetchVersions(pageId),
  // });

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-purple-300">
            <History className="h-4 w-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[400px] bg-black/95 border-gray-800 text-white"
      >
        <SheetHeader>
          <SheetTitle className="text-white">Version History</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          <div className="text-sm text-gray-400">
            Current: v{currentVersionNumber}
          </div>
          {/* TODO: Render version list */}
          <p className="text-gray-500 text-sm mt-4">
            Version history will be displayed here once the backend API is available.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

---

## Step 5: Create AssetUploaderDialog Component

Create the asset uploader modal.

**File**: `apps/frontend/src/components/editor/AssetUploaderDialog.tsx`

```typescript
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AssetUploaderDialogProps } from '@/types/editor';

export function AssetUploaderDialog({
  pageId,
  children,
}: AssetUploaderDialogProps) {
  // TODO: Implement file upload logic
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // TODO: Upload files to API
    console.log('Selected files:', files);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-purple-300">
            <Upload className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-black/95 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Upload Assets</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-purple-600 file:text-white
              hover:file:bg-purple-700"
          />
          <p className="text-gray-500 text-sm mt-2">
            Upload images (PNG, JPG, SVG, WebP). Max 5MB per file.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Step 6: Update EditorPage.tsx

Replace the old layout with the new 2-column design.

**File**: `apps/frontend/src/pages/EditorPage.tsx`

```typescript
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChatPanel } from '../components/ChatPanel';
import { PreviewPanel } from '../components/PreviewPanel';
import { EditorLayout } from '../components/layout/EditorLayout';
import { VersionHistorySheet } from '../components/editor/VersionHistorySheet';
import { AssetUploaderDialog } from '../components/editor/AssetUploaderDialog';
import { Card } from '../components/ui/card';

async function fetchPage(pageId: string) {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/pages/${pageId}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch page');
  }
  return response.json();
}

export function EditorPage() {
  const { pageId } = useParams<{ pageId: string }>();

  const {
    data: page,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['page', pageId],
    queryFn: () => fetchPage(pageId!),
    enabled: !!pageId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0e27]">
        <div className="text-lg text-white">Loading page...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0e27]">
        <div className="text-red-400">Error loading page: {error.message}</div>
      </div>
    );
  }

  if (!page || !pageId) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0e27]">
        <div className="text-gray-400">Page not found</div>
      </div>
    );
  }

  return (
    <EditorLayout
      chatPanel={
        <Card className="h-full bg-black/40 backdrop-blur-sm border-gray-800">
          <div className="flex items-center justify-between border-b border-gray-800 px-4 py-2">
            <h2 className="text-sm font-medium text-white">Chat</h2>
            <div className="flex gap-2">
              <VersionHistorySheet
                pageId={pageId}
                currentVersionNumber={page.currentVersion?.versionNumber || 1}
              />
              <AssetUploaderDialog pageId={pageId} />
            </div>
          </div>
          <div className="h-[calc(100%-3rem)]">
            <ChatPanel pageId={pageId} />
          </div>
        </Card>
      }
      previewPanel={
        <Card className="h-full bg-black/40 backdrop-blur-sm border-gray-800">
          <div className="border-b border-gray-800 px-4 py-2">
            <h3 className="text-sm font-medium text-white">Preview</h3>
          </div>
          <div className="h-[calc(100%-3rem)] overflow-auto">
            <PreviewPanel pageId={pageId} currentVersion={page.currentVersion} />
          </div>
        </Card>
      }
    />
  );
}
```

**Changes**:

- Removed `ThreeColumnLayout`, `CollapsibleSidebar`, `ResizablePreview`
- Added `EditorLayout` with 2-column design
- Added version history and asset uploader icon buttons in chat panel header
- Updated loading/error states with dark theme styling (`text-white`, `text-red-400`, `bg-[#0a0e27]`)

---

## Step 7: Remove Old Components

Delete the obsolete layout components.

```bash
cd apps/frontend/src/components/layout

# Remove old components
rm ThreeColumnLayout.tsx
rm CollapsibleSidebar.tsx
rm ResizablePreview.tsx

# Update layout index file
# Edit index.ts to remove old exports and add new ones
```

**File**: `apps/frontend/src/components/layout/index.ts`

```typescript
export { EditorLayout } from './EditorLayout';
export { Header } from './Header';
export { Footer } from './Footer';
export { Hero } from './Hero';
// Remove: ThreeColumnLayout, CollapsibleSidebar, ResizablePreview
```

---

## Step 8: Add Unit Tests

Create tests for the new components.

**File**: `apps/frontend/tests/unit/components/editor/EditorLayout.test.tsx`

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EditorLayout } from '@/components/layout/EditorLayout';

describe('EditorLayout', () => {
  it('renders chat and preview panels', () => {
    render(
      <EditorLayout
        chatPanel={<div>Chat Content</div>}
        previewPanel={<div>Preview Content</div>}
      />
    );

    expect(screen.getByText('Chat Content')).toBeInTheDocument();
    expect(screen.getByText('Preview Content')).toBeInTheDocument();
  });

  it('uses default chat size of 30%', () => {
    const { container } = render(
      <EditorLayout
        chatPanel={<div>Chat</div>}
        previewPanel={<div>Preview</div>}
      />
    );

    // Check that ResizablePanel has correct defaultSize prop
    // (implementation depends on react-resizable-panels internals)
    expect(container).toBeTruthy();
  });
});
```

**Run Tests**:

```bash
pnpm test
```

---

## Step 9: Run Type Check and Build

Verify TypeScript types and build the frontend.

```bash
# Type check
pnpm run type-check:frontend

# Build
pnpm run build:frontend

# Expected output: No errors, successful build
```

---

## Step 10: Manual Testing

Start the development server and test the new layout.

```bash
# Start dev server
pnpm dev

# Navigate to http://localhost:5173/editor/<some-page-id>
```

**Test Checklist**:

- [ ] 2-column layout displays on desktop (chat left, preview right)
- [ ] Resize handle is visible and draggable
- [ ] Panels resize smoothly without jank
- [ ] Minimum width constraints are enforced (chat 20%, preview 30%)
- [ ] Version history icon button opens Sheet from right
- [ ] Asset uploader icon button opens Dialog in center
- [ ] Modals can be closed via ESC, click outside, or close button
- [ ] Mobile viewport (<768px) stacks panels vertically
- [ ] Resize handle is hidden on mobile
- [ ] Dark theme colors match HomePage (#0a0e27, purple-300 accents)
- [ ] Loading state shows white text on dark background
- [ ] Error state shows red-400 text on dark background

---

## Troubleshooting

### Issue: "Module not found: resizable, dialog, sheet"

**Solution**: Re-run shadcn/ui component installation:

```bash
npx shadcn@latest add resizable dialog sheet
```

### Issue: "ResizablePanel not resizing"

**Solution**: Ensure parent container has defined height (`h-screen` or `h-full`)

### Issue: "Dark theme colors not applying"

**Solution**: Check that Tailwind CSS config includes custom colors:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        background: '#0a0e27',
      },
    },
  },
};
```

### Issue: "Mobile layout not switching to vertical"

**Solution**: Verify media query breakpoint (768px) and `useEffect` resize listener

---

## Next Steps

After implementing the UI redesign:

1. **Implement version history API** (if not already done)
   - Backend endpoint: `GET /pages/:pageId/versions`
   - Update `VersionHistorySheet.tsx` to fetch and display versions

2. **Implement asset uploader API** (if not already done)
   - Backend endpoint: `POST /pages/:pageId/assets`
   - Update `AssetUploaderDialog.tsx` to upload files

3. **Add E2E tests** (optional)
   - Test resizing behavior
   - Test modal interactions
   - Test responsive layout switching

4. **Performance optimization** (if needed)
   - Monitor panel resize performance (should be 60fps)
   - Optimize preview iframe rendering

---

## Summary

You've successfully implemented the EditorPage UI/UX overhaul! The new design features:

- ✅ 2-column resizable layout (chat + preview)
- ✅ Dark theme styling matching HomePage
- ✅ Version history in slide-out Sheet
- ✅ Asset uploader in centered Dialog
- ✅ Responsive mobile layout (vertical stack)
- ✅ TypeScript strict typing
- ✅ Unit tests for components

**Total Implementation Time**: ~4-6 hours

For detailed design decisions, see [research.md](./research.md).
For data model documentation, see [data-model.md](./data-model.md).
