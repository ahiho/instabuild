# Data Model: AI-Powered Landing Page Editor

**Feature**: 002-ai-landing-editor  
**Date**: 2025-10-22  
**Phase**: 1 - Design & Contracts

## Core Entities

### LandingPage

Represents a landing page project with its metadata and current state.

**Fields**:

- `id`: Unique identifier (UUID)
- `title`: Page title for identification
- `description`: Optional page description
- `githubRepoUrl`: GitHub repository URL for version control
- `currentVersionId`: Reference to the active version
- `createdAt`: Creation timestamp
- `updatedAt`: Last modification timestamp

**Relationships**:

- Has many `LandingPageVersion` (one-to-many)
- Has many `Asset` through versions (many-to-many)

**Validation Rules**:

- Title must be 1-100 characters
- GitHub repo URL must be valid HTTPS URL
- Current version must exist and belong to this page

### LandingPageVersion

Represents a specific version/state of a landing page with its source code and metadata.

**Fields**:

- `id`: Unique identifier (UUID)
- `landingPageId`: Reference to parent page
- `versionNumber`: Sequential version number
- `commitSha`: GitHub commit SHA for this version
- `sourceCode`: Generated React component source code
- `previewUrl`: Vercel deployment URL for this version
- `changeDescription`: Description of changes made
- `createdAt`: Version creation timestamp

**Relationships**:

- Belongs to `LandingPage` (many-to-one)
- Has many `Asset` (one-to-many)

**Validation Rules**:

- Version number must be positive integer
- Commit SHA must be valid Git SHA format
- Source code must be valid React/TypeScript
- Preview URL must be valid HTTPS URL

**State Transitions**:

- Draft → Generating → Ready → Deployed → Failed

### Asset

Represents uploaded files (images, logos) associated with landing page versions.

**Fields**:

- `id`: Unique identifier (UUID)
- `landingPageVersionId`: Reference to version using this asset
- `filename`: Original filename
- `mimeType`: File MIME type
- `fileSize`: File size in bytes
- `storageUrl`: MinIO/S3 storage URL
- `uploadedAt`: Upload timestamp

**Relationships**:

- Belongs to `LandingPageVersion` (many-to-one)

**Validation Rules**:

- Filename must be 1-255 characters
- MIME type must be image/\* (PNG, JPG, SVG)
- File size must be ≤ 10MB
- Storage URL must be valid and accessible

### ChatMessage

Represents messages in the conversational editing interface.

**Fields**:

- `id`: Unique identifier (UUID)
- `landingPageId`: Reference to page being edited
- `role`: Message role (user, assistant, system)
- `content`: Message content
- `toolCalls`: JSON array of tool calls made
- `metadata`: Additional message metadata (JSON)
- `createdAt`: Message timestamp

**Relationships**:

- Belongs to `LandingPage` (many-to-one)

**Validation Rules**:

- Role must be one of: user, assistant, system
- Content must be 1-10000 characters
- Tool calls must be valid JSON array
- Metadata must be valid JSON object

### ModificationCommand

Represents a parsed user instruction with identified targets and changes.

**Fields**:

- `id`: Unique identifier (UUID)
- `chatMessageId`: Reference to originating chat message
- `targetElements`: JSON array of element selectors
- `requestedChanges`: JSON object describing changes
- `status`: Processing status
- `resultVersionId`: Reference to resulting version (if successful)
- `errorMessage`: Error details (if failed)
- `processedAt`: Processing timestamp

**Relationships**:

- Belongs to `ChatMessage` (many-to-one)
- May reference `LandingPageVersion` as result (many-to-one)

**Validation Rules**:

- Target elements must be valid CSS selectors or element IDs
- Requested changes must be valid JSON object
- Status must be one of: pending, processing, completed, failed

**State Transitions**:

- Pending → Processing → Completed/Failed

## Database Schema Relationships

```
LandingPage (1) ←→ (∞) LandingPageVersion
LandingPage (1) ←→ (∞) ChatMessage
LandingPageVersion (1) ←→ (∞) Asset
ChatMessage (1) ←→ (∞) ModificationCommand
ModificationCommand (∞) ←→ (1) LandingPageVersion [result]
```

## Indexes and Performance

**Primary Indexes**:

- `LandingPage.id` (primary key)
- `LandingPageVersion.id` (primary key)
- `Asset.id` (primary key)
- `ChatMessage.id` (primary key)
- `ModificationCommand.id` (primary key)

**Secondary Indexes**:

- `LandingPageVersion.landingPageId` (foreign key lookup)
- `LandingPageVersion.versionNumber` (version ordering)
- `Asset.landingPageVersionId` (foreign key lookup)
- `ChatMessage.landingPageId` (conversation history)
- `ChatMessage.createdAt` (chronological ordering)
- `ModificationCommand.chatMessageId` (command tracking)

## Data Consistency Rules

1. **Version Integrity**: Current version ID must always reference an existing version
2. **Asset Cleanup**: Orphaned assets should be cleaned up when versions are deleted
3. **Chat History**: Messages should be retained for session duration only
4. **Command Tracking**: Failed commands should retain error information for debugging
5. **Storage Sync**: Asset storage URLs must remain accessible and valid
