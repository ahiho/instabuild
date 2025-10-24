# Data Model: EditorPage UI/UX Overhaul

**Feature**: EditorPage UI/UX Overhaul
**Date**: 2025-10-24
**Purpose**: Define entities, types, and state structures for the 2-column resizable editor layout.

---

## Overview

This feature is **UI-only** and does not introduce new database entities or API models. The data model focuses on **component props**, **local state types**, and **UI configuration interfaces** needed for the resizable layout, modals, and dark theme styling.

All entities below are **TypeScript interfaces/types** used within React components. No backend models or database schemas are required.

---

## 1. Panel Configuration Types

### `PanelConfig`

Defines configuration for resizable panels.

```typescript
/**
 * Configuration for a resizable panel in the editor layout
 */
interface PanelConfig {
  /** Default size as percentage (0-100) */
  defaultSize: number;

  /** Minimum size as percentage (0-100) */
  minSize: number;

  /** Maximum size as percentage (0-100), optional */
  maxSize?: number;

  /** Panel identifier (e.g., 'chat', 'preview') */
  id: string;
}
```

**Usage**: Configure chat and preview panels in `EditorLayout.tsx`

**Example**:

```typescript
const chatPanelConfig: PanelConfig = {
  id: 'chat',
  defaultSize: 30,
  minSize: 20,
  maxSize: 80,
};

const previewPanelConfig: PanelConfig = {
  id: 'preview',
  defaultSize: 70,
  minSize: 30,
};
```

---

## 2. Version History Types

### `Version`

Represents a version of the landing page (already exists in backend models).

```typescript
/**
 * Landing page version entity
 * NOTE: This type already exists in the backend/shared package.
 * Documented here for completeness.
 */
interface Version {
  /** Unique version identifier */
  id: string;

  /** Version number (e.g., 1, 2, 3) */
  versionNumber: number;

  /** HTML content of this version */
  htmlContent: string;

  /** CSS content of this version */
  cssContent: string;

  /** Timestamp when version was created */
  createdAt: Date;

  /** Optional description/notes for this version */
  notes?: string;
}
```

**Usage**: Display version list in `VersionHistorySheet.tsx`

**State Management**: Fetched from API via `@tanstack/react-query` (already in use in `EditorPage.tsx`)

---

### `VersionHistorySheetProps`

Props for the VersionHistorySheet component.

```typescript
/**
 * Props for VersionHistorySheet component
 */
interface VersionHistorySheetProps {
  /** ID of the current page being edited */
  pageId: string;

  /** Current version number for highlighting */
  currentVersionNumber: number;

  /** Callback when user selects a different version */
  onVersionSelect?: (version: Version) => void;

  /** Optional: Trigger element for opening the sheet */
  children?: React.ReactNode;
}
```

**Validation Rules**:

- `pageId` must be a non-empty string
- `currentVersionNumber` must be a positive integer

**State Transitions**:

1. **Closed** → **Opening** (user clicks trigger button)
2. **Opening** → **Open** (sheet animation completes)
3. **Open** → **Closing** (user clicks close/outside)
4. **Closing** → **Closed** (sheet animation completes)

---

## 3. Asset Uploader Types

### `Asset`

Represents an uploaded asset (image, logo, etc.).

```typescript
/**
 * Uploaded asset entity
 * NOTE: This type may already exist in the backend/shared package.
 * Documented here for reference.
 */
interface Asset {
  /** Unique asset identifier */
  id: string;

  /** Asset filename */
  filename: string;

  /** File MIME type (e.g., 'image/png') */
  mimeType: string;

  /** File size in bytes */
  sizeBytes: number;

  /** Public URL to access the asset */
  url: string;

  /** Timestamp when asset was uploaded */
  uploadedAt: Date;
}
```

**Usage**: Display uploaded assets in `AssetUploaderDialog.tsx`

---

### `AssetUploaderDialogProps`

Props for the AssetUploaderDialog component.

```typescript
/**
 * Props for AssetUploaderDialog component
 */
interface AssetUploaderDialogProps {
  /** ID of the page to upload assets for */
  pageId: string;

  /** Callback when assets are successfully uploaded */
  onUploadComplete?: (assets: Asset[]) => void;

  /** Callback when upload fails */
  onUploadError?: (error: Error) => void;

  /** Optional: Trigger element for opening the dialog */
  children?: React.ReactNode;
}
```

**Validation Rules**:

- `pageId` must be a non-empty string
- Uploaded files must be valid image types (png, jpg, jpeg, gif, svg, webp)
- Maximum file size: 5MB per file (enforced client-side and server-side)

**State Transitions**:

1. **Closed** → **Opening** (user clicks trigger button)
2. **Opening** → **Open** (dialog animation completes)
3. **Open** → **Uploading** (user selects files and confirms)
4. **Uploading** → **Success** (upload completes successfully)
5. **Uploading** → **Error** (upload fails)
6. **Success** → **Closed** (dialog auto-closes or user closes)
7. **Error** → **Open** (user can retry or cancel)

---

## 4. Editor Layout Types

### `EditorLayoutProps`

Props for the EditorLayout component.

```typescript
/**
 * Props for EditorLayout component (2-column resizable layout)
 */
interface EditorLayoutProps {
  /** Content for the left panel (chat) */
  chatPanel: React.ReactNode;

  /** Content for the right panel (preview) */
  previewPanel: React.ReactNode;

  /** Optional custom class name for styling */
  className?: string;

  /** Optional: Default chat panel size (0-100) */
  defaultChatSize?: number;

  /** Optional: Callback when panels are resized */
  onResize?: (chatSize: number, previewSize: number) => void;
}
```

**Default Values**:

- `defaultChatSize`: 30 (30% width)
- Chat panel `minSize`: 20 (20% width)
- Preview panel `minSize`: 30 (30% width)

---

## 5. Responsive Layout State

### `ResponsiveLayoutState`

Local state for managing responsive layout behavior.

```typescript
/**
 * State for managing responsive layout behavior
 */
interface ResponsiveLayoutState {
  /** Is the current viewport mobile-sized? (<768px) */
  isMobile: boolean;

  /** Panel direction based on viewport */
  direction: 'horizontal' | 'vertical';
}
```

**Usage**: Track viewport size and switch between horizontal (desktop) and vertical (mobile) layouts

**State Updates**:

- On component mount: Detect initial viewport size
- On window resize: Update `isMobile` and `direction`
- Debounced to avoid excessive re-renders (100ms debounce recommended)

---

## 6. Theme Configuration

### `ThemeConfig`

Configuration for dark theme styling (constants, not state).

```typescript
/**
 * Dark theme color configuration
 * NOTE: These are constant values, not runtime state
 */
const THEME_CONFIG = {
  /** Background colors */
  background: {
    primary: '#0a0e27', // Main background (dark navy)
    card: 'bg-black/40', // Card/panel backgrounds
    blur: 'backdrop-blur-sm', // Blur effect for cards
  },

  /** Text colors */
  text: {
    primary: 'text-white', // Primary text (#ffffff)
    secondary: 'text-gray-400', // Secondary text (#9ca3af)
    muted: 'text-gray-500', // Muted text (#6b7280)
    error: 'text-red-400', // Error messages (#f87171)
  },

  /** Accent colors */
  accent: {
    primary: 'text-purple-300', // Primary accent (#d8b4fe)
    hover: 'hover:text-purple-200', // Hover state
    button: 'bg-purple-600', // Button background
    buttonHover: 'hover:bg-purple-700',
  },

  /** Border colors */
  border: {
    default: 'border-gray-800', // Default borders (#1f2937)
    accent: 'border-purple-500/20', // Accent borders (purple with opacity)
    focus: 'ring-purple-500', // Focus rings
  },
} as const;
```

**Usage**: Reference in component class names for consistent dark theme styling

---

## 7. Component State Summary

| Component             | Local State                                 | Props                                               | External State                 |
| --------------------- | ------------------------------------------- | --------------------------------------------------- | ------------------------------ |
| `EditorLayout`        | `isMobile`, `direction`                     | `chatPanel`, `previewPanel`, `defaultChatSize`      | None                           |
| `VersionHistorySheet` | `isOpen` (managed by Sheet)                 | `pageId`, `currentVersionNumber`, `onVersionSelect` | Version list (via react-query) |
| `AssetUploaderDialog` | `isOpen`, `uploadProgress`, `selectedFiles` | `pageId`, `onUploadComplete`, `onUploadError`       | Asset list (via react-query)   |

---

## 8. Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        EditorPage.tsx                        │
│  - Fetches page data via useQuery                           │
│  - Passes pageId, version to child components               │
└────────────────┬────────────────────────────┬────────────────┘
                 │                            │
                 ▼                            ▼
    ┌────────────────────────┐   ┌────────────────────────┐
    │   EditorLayout.tsx     │   │  VersionHistorySheet   │
    │  - Manages panels      │   │  - Fetches versions    │
    │  - Responsive state    │   │  - Displays list       │
    └───┬────────────────┬───┘   └────────────────────────┘
        │                │
        ▼                ▼
┌──────────────┐ ┌──────────────┐
│  ChatPanel   │ │ PreviewPanel │
│  (existing)  │ │  (existing)  │
└──────────────┘ └──────────────┘
```

---

## 9. Validation Rules Summary

| Field/Prop                             | Validation Rule                                   | Error Handling          |
| -------------------------------------- | ------------------------------------------------- | ----------------------- |
| `pageId` (all components)              | Non-empty string                                  | Throw error if invalid  |
| `currentVersionNumber`                 | Positive integer                                  | Default to 1 if invalid |
| Panel sizes (`defaultSize`, `minSize`) | 0-100 (percentage)                                | Clamp to valid range    |
| Uploaded file types                    | Image types only (png, jpg, jpeg, gif, svg, webp) | Display error message   |
| File size                              | Max 5MB                                           | Display error message   |

---

## 10. Entity Relationships

```
Page (1) ──< (many) Version
 │
 └──< (many) Asset
```

- A **Page** has many **Versions**
- A **Page** has many **Assets**
- Versions and Assets are independent (no direct relationship)

**NOTE**: These relationships already exist in the backend schema. This feature only adds UI components to display and interact with these entities.

---

## Summary

This data model defines **UI-only types** for the EditorPage redesign. No new database entities or API models are introduced. The implementation will:

1. Create TypeScript interfaces for component props (`EditorLayoutProps`, `VersionHistorySheetProps`, `AssetUploaderDialogProps`)
2. Define local state types for responsive layout (`ResponsiveLayoutState`)
3. Document existing backend entities used by the UI (`Version`, `Asset`)
4. Establish theme configuration constants (`THEME_CONFIG`)

All types will be defined in the component files or in a new `apps/frontend/src/types/editor.ts` file if shared across multiple components.
