# API Contracts: EditorPage UI/UX Overhaul

**Feature**: EditorPage UI/UX Overhaul
**Date**: 2025-10-24

---

## Overview

This feature is **UI-only** and does not introduce new API endpoints or modify existing API contracts. The EditorPage redesign uses existing API endpoints for fetching page data, versions, and assets.

---

## Existing API Endpoints (Used by Feature)

### 1. Get Page by ID

**Endpoint**: `GET /pages/:pageId`

**Description**: Fetch a landing page by its ID (already implemented and in use)

**Request**:

```
GET /pages/123e4567-e89b-12d3-a456-426614174000
```

**Response**:

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "My Landing Page",
  "description": "A beautiful landing page",
  "currentVersion": {
    "id": "version-456",
    "versionNumber": 1,
    "htmlContent": "<html>...</html>",
    "cssContent": "body { ... }",
    "createdAt": "2025-10-24T10:00:00Z"
  },
  "createdAt": "2025-10-24T09:00:00Z",
  "updatedAt": "2025-10-24T10:00:00Z"
}
```

**Usage**: Called in `EditorPage.tsx` via `@tanstack/react-query`

**Changes Required**: None

---

### 2. Get Version History (Assumed)

**Endpoint**: `GET /pages/:pageId/versions` (assumed, may not exist yet)

**Description**: Fetch all versions for a page

**Request**:

```
GET /pages/123e4567-e89b-12d3-a456-426614174000/versions
```

**Response**:

```json
{
  "versions": [
    {
      "id": "version-456",
      "versionNumber": 2,
      "htmlContent": "<html>...</html>",
      "cssContent": "body { ... }",
      "createdAt": "2025-10-24T11:00:00Z",
      "notes": "Updated hero section"
    },
    {
      "id": "version-123",
      "versionNumber": 1,
      "htmlContent": "<html>...</html>",
      "cssContent": "body { ... }",
      "createdAt": "2025-10-24T10:00:00Z",
      "notes": "Initial version"
    }
  ]
}
```

**Usage**: Will be called in `VersionHistorySheet.tsx` via `@tanstack/react-query`

**Changes Required**:

- **If endpoint doesn't exist**: Backend implementation required (out of scope for this UI redesign)
- **If endpoint exists**: No changes needed

**NOTE**: The spec states that version history functionality may already exist or will be implemented separately. This redesign only provides UI access via a Sheet component.

---

### 3. Upload Asset (Assumed)

**Endpoint**: `POST /pages/:pageId/assets` (assumed, may not exist yet)

**Description**: Upload an asset (image, logo, etc.) for a page

**Request**:

```
POST /pages/123e4567-e89b-12d3-a456-426614174000/assets
Content-Type: multipart/form-data

{
  "file": <binary file data>
}
```

**Response**:

```json
{
  "id": "asset-789",
  "filename": "logo.png",
  "mimeType": "image/png",
  "sizeBytes": 45231,
  "url": "https://cdn.example.com/assets/logo.png",
  "uploadedAt": "2025-10-24T12:00:00Z"
}
```

**Usage**: Will be called in `AssetUploaderDialog.tsx`

**Changes Required**:

- **If endpoint doesn't exist**: Backend implementation required (out of scope for this UI redesign)
- **If endpoint exists**: No changes needed

**NOTE**: The spec states that asset uploader functionality may already exist or will be implemented separately. This redesign only provides UI access via a Dialog component.

---

## No New Contracts Required

This feature does not require:

- New API endpoints
- Modified request/response schemas
- New authentication/authorization rules
- New database migrations (backend schema unchanged)

---

## Frontend Service Layer

The feature will use existing service patterns in `apps/frontend/src/services/` (if they exist) or implement inline fetch calls in component hooks.

**Example** (VersionHistorySheet.tsx):

```typescript
import { useQuery } from '@tanstack/react-query';

function useVersionHistory(pageId: string) {
  return useQuery({
    queryKey: ['versions', pageId],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/pages/${pageId}/versions`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch versions');
      }
      return response.json();
    },
    enabled: !!pageId,
  });
}
```

---

## Summary

- **New Endpoints**: None
- **Modified Endpoints**: None
- **Contract Changes**: None
- **Backend Work Required**: Only if version history or asset upload endpoints don't exist yet (out of scope for this UI redesign)

This directory is intentionally minimal because the feature is UI-only and relies on existing (or future) backend APIs.
