# Sandbox Isolation Fix Plan

**Status**: Planning
**Priority**: Critical Security Issue
**Date Started**: 2025-10-28
**Last Updated**: 2025-10-28

## Problem Statement

The agent is accessing the entire host filesystem instead of being isolated to sandbox containers. This is a **critical security vulnerability** where:

- User agents can read ANY file from host (e.g., `/Users/markng/...`)
- No sandbox isolation is enforced
- Tools operate directly on host filesystem via `node:fs/promises`
- SandboxManager exists but is never invoked by chat endpoints

**Evidence**: In the chat example, agent tried to access `/Users/markng/Documents/Code/...` directly from the host.

---

## Root Causes Identified

### 1. Type System Gap
- `ToolExecutionContext` missing `sandboxId` field
- No way for tools to know which sandbox to operate in

### 2. No Sandbox Provisioning
- `agenticAIService.processAgenticChat()` never creates sandboxes
- Chat route (`chat.ts`) doesn't provision containers for conversations
- Disconnected infrastructure: SandboxManager exists but unused

### 3. Direct Filesystem Access
- All tools use `node:fs/promises` without sandbox validation
- Path checks only validate `path.isAbsolute()` - allows ANY host path
- No sandbox boundary enforcement

### 4. Unsafe Path Resolution
- `process.cwd()` used as fallback (lines 1393, 1823 in filesystem-tools.ts)
- Exposes entire filesystem when relative paths used
- No path normalization or escape prevention

### 5. Database Incomplete
- `Conversation` model doesn't track `sandboxId`
- Can't correlate conversations to their sandboxes

---

## Detailed Fix Plan

### Phase 1: Type System & Database Foundation + Preview URL Generation
**Priority**: CRITICAL | Complexity**: MEDIUM | Files: 3

#### Task 1.1: Extend ToolExecutionContext
**File**: `packages/shared/src/types/tool-registry.ts`

Add sandbox field to interface:
```typescript
export interface ToolExecutionContext {
  userId: string;
  conversationId: string;
  toolCallId: string;
  pageId?: string;
  selectedElementId?: string;
  // NEW: Sandbox isolation context
  sandboxId?: string;  // Docker container ID - presence indicates sandboxed execution
}
```

**Note**: The presence of `sandboxId` indicates the tool runs in a sandbox. Absence means no sandbox.

**Validation**: Ensure backward compatibility - all fields optional

#### Task 1.2: Update Conversation Schema
**File**: `apps/backend/prisma/schema.prisma`

Add fields to Conversation model:
```prisma
model Conversation {
  // ... existing fields
  sandboxId         String?   // Docker container ID (URL-safe alphanumeric + hyphens)
  sandboxStatus     String?   @db.VarChar(50)  // Status: pending, ready, failed, terminated
  sandboxCreatedAt  DateTime? // Timestamp when sandbox was provisioned
  sandboxPublicUrl  String?   // Public preview URL (generated on sandbox creation)

  @@index([sandboxId])  // For fast lookups
}
```

**After change**: Run `npx prisma migrate dev --name add_sandbox_isolation_context`

#### Task 1.3: Create Preview URL Generation Utility
**File**: `apps/backend/src/lib/preview-url.ts` (NEW)

```typescript
/**
 * Generate public preview URL for sandbox
 * Uses subdomain routing in production, port-based in development
 */
export function generateSandboxPreviewUrl(sandboxId: string): string {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    // Development: Use port-based routing
    // sandboxId format: url-safe (alphanumeric + hyphens)
    const portOffset = hashSandboxId(sandboxId) % 10000;
    const port = 30000 + portOffset;
    return `http://localhost:${port}`;
  } else {
    // Production: Use subdomain-based routing
    const previewDomain = process.env.PREVIEW_DOMAIN || 'vusercontent.net';
    return `https://preview-${sandboxId}.${previewDomain}`;
  }
}

/**
 * Hash sandboxId to generate deterministic port offset
 */
function hashSandboxId(sandboxId: string): number {
  let hash = 0;
  for (let i = 0; i < sandboxId.length; i++) {
    hash += sandboxId.charCodeAt(i);
  }
  return hash;
}

/**
 * Validate sandboxId is URL-safe
 * Allows: alphanumeric, hyphens
 */
export function isValidSandboxId(sandboxId: string): boolean {
  return /^[a-zA-Z0-9-]+$/.test(sandboxId) && sandboxId.length > 0;
}
```

**Environment variables needed**:
- `PREVIEW_DOMAIN` (production only) - e.g., `vusercontent.net`
- `NODE_ENV` - `development` or `production`

---

### Phase 2: Remove Unnecessary Sandbox Utilities
**Priority**: LOW | Complexity**: LOW | Files: 0 (REMOVED)

**Note**: With Docker container isolation as the security boundary, we don't need path validation utilities. The container itself prevents escape attempts. Tools just need to validate `sandboxId` exists.

---

### Phase 3: Sandbox Integration in Chat Flow
**Priority**: CRITICAL | Complexity**: HIGH | Files: 1

#### Task 3.1: Update AgenticAIService
**File**: `apps/backend/src/services/agenticAIService.ts`

**Changes**:
1. Import sandbox utilities
   ```typescript
   import { sandboxManager } from './sandboxManager.js';
   import { validateSandboxPath } from '../lib/sandbox-utils.js';
   ```

2. In `processAgenticChat()` method, after receiving sandboxId from context:
   ```typescript
   // Get sandbox info passed from route
   const sandboxInfo = options.sandboxId ?
     sandboxManager.getSandboxInfo(options.sandboxId) : null;

   if (!sandboxInfo && options.requiresSandbox) {
     throw new Error('Sandbox required but not provisioned');
   }
   ```

3. When creating ToolExecutionContext (line 315-319):
   ```typescript
   const executionContext: ToolExecutionContext = {
     userId,
     conversationId,
     toolCallId: 'pending',
     sandboxId: options.sandboxId,        // NEW - presence indicates sandboxed
   };
   ```

4. Add error recovery for sandbox failures
5. Add cleanup in error handling

---

### Phase 4: Chat Route Integration
**Priority**: CRITICAL | Complexity**: MEDIUM | Files: 1

#### Task 4.1: Update Chat Route to Provision Sandboxes
**File**: `apps/backend/src/routes/chat.ts`

**Changes**:
1. Import sandbox manager
   ```typescript
   import { sandboxManager } from '../services/sandboxManager.js';
   ```

2. After creating Conversation (around line 27-34), add:
   ```typescript
   // Create sandbox for this conversation
   const sandboxRequest: SandboxProvisionRequest = {
     userId: 'system', // TODO: from auth context
     projectId: conversation.id,
   };

   try {
     const sandboxResponse = await sandboxManager.createSandbox(sandboxRequest);

     // Update conversation with sandbox info
     if (sandboxResponse.status === 'ready') {
       await prisma.conversation.update({
         where: { id: conversation.id },
         data: {
           sandboxId: sandboxResponse.containerId,
           sandboxStatus: 'ready'
         }
      });
     } else {
       throw new Error(`Sandbox provisioning failed: ${sandboxResponse.error}`);
     }
   } catch (error) {
     logger.error('Failed to provision sandbox', { error, conversationId: conversation.id });
     return reply.code(500).send({ error: 'Failed to create execution environment' });
   }
   ```

3. Pass sandboxId to agenticAIService:
   ```typescript
   const result = await agenticAIService.processAgenticChat({
     messages,
     conversationId: conversation.id,
     userId: 'system',
     sandboxId: conversation.sandboxId,    // NEW
     // ... rest of options
   });
   ```

4. Add cleanup on chat completion/error:
   ```typescript
   // Add to onFinish callback
   await sandboxManager.destroySandbox(conversation.sandboxId);
   ```

---

### Phase 5: Filesystem Tools - Path Validation
**Priority**: CRITICAL | Complexity**: VERY HIGH | Files: 1

#### Task 5.1: Update All Filesystem Tools
**File**: `apps/backend/src/tools/filesystem-tools.ts`

**Pattern for each tool** (apply to all 6 tools):

1. **Early sandbox validation** (first line of execute function):
   ```typescript
   // Validate sandbox context exists
   if (!context.sandboxId) {
     return {
       success: false,
       userFeedback: 'This operation requires a sandbox environment. Please try again.',
       previewRefreshNeeded: false,
       technicalDetails: {
         error: 'Missing sandbox context - sandboxId required',
       },
     };
   }
   ```

**Note**: With `sandboxId` present, the Docker container isolation ensures all file operations stay within that container. No additional path validation needed - the container boundary is the security mechanism.

**Specific updates per tool**:

For each tool, add the sandbox check at the beginning of the execute function:

**Tool: list_directory** (line 74)
- Add sandbox validation check

**Tool: read_file** (line 351)
- Add sandbox validation check

**Tool: write_file** (line 671)
- Add sandbox validation check

**Tool: replace** (line 925)
- Add sandbox validation check

**Tool: search_file_content** (line 1357)
- Add sandbox validation check
- Replace `process.cwd()` fallback with `context.sandboxId` check (ensures execution in sandbox)

**Tool: glob** (line 1785)
- Add sandbox validation check
- Replace `process.cwd()` fallback with `context.sandboxId` check (ensures execution in sandbox)

**Remove these dangerous patterns**:
- Remove `process.cwd()` fallbacks (lines 1393, 1823) - should fail if sandboxId missing

---

### Phase 4: Testing & Validation
**Priority**: HIGH | Complexity**: MEDIUM | Files: 2 (NEW)

#### Task 4.1: Tool Integration Tests
**File**: `apps/backend/src/__tests__/filesystem-tools-sandbox.test.ts` (NEW)

```typescript
describe('Filesystem Tools - Sandbox Isolation', () => {
  let context: ToolExecutionContext;

  beforeEach(() => {
    context = {
      userId: 'test-user',
      conversationId: 'test-conv',
      toolCallId: 'test-call',
      sandboxId: 'sandbox-123',  // Presence of sandboxId indicates sandboxed execution
    };
  });

  test('list_directory succeeds with sandbox context', async () => {
    const result = await listDirectoryTool.execute(
      { path: '/workspace' },
      context
    );
    expect(result.success).toBe(true);
  });

  test('read_file succeeds with sandbox context', async () => {
    const result = await readFileTool.execute(
      { absolute_path: '/workspace/test.txt' },
      context
    );
    // Result depends on file existing in container
  });

  test('tools fail without sandbox context', async () => {
    const noSandboxContext = { ...context, sandboxId: undefined };
    const result = await listDirectoryTool.execute(
      { path: '/workspace' },
      noSandboxContext
    );
    expect(result.success).toBe(false);
    expect(result.userFeedback).toContain('sandbox environment');
  });
});
```

#### Task 4.2: End-to-End Integration Test
**File**: `apps/backend/src/__tests__/sandbox-isolation-e2e.test.ts` (NEW)

```typescript
describe('Sandbox Isolation E2E', () => {
  test('conversation → sandbox → tool execution flow', async () => {
    // 1. Create conversation
    const conversation = await prisma.conversation.create({
      data: { userId: 'test' }
    });

    // 2. Provision sandbox
    const sandboxResponse = await sandboxManager.createSandbox({
      userId: 'test',
      projectId: conversation.id,
    });

    // 3. Update conversation
    const updated = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        sandboxId: sandboxResponse.containerId,
        sandboxStatus: 'ready'
      }
    });

    // 4. Execute tool with sandbox context
    const context: ToolExecutionContext = {
      userId: 'test',
      conversationId: conversation.id,
      toolCallId: 'call-1',
      sandboxId: updated.sandboxId,  // Presence indicates sandboxed
    };

    // 5. Verify tool works with sandbox
    const result = await readFileTool.execute(
      { absolute_path: '/workspace' },
      context
    );

    expect(result.success).toBe(true);

    // 6. Cleanup
    await sandboxManager.destroySandbox(updated.sandboxId!);
  });
});
```

---

### Phase 5: Error Handling & Cleanup
**Priority**: HIGH | Complexity**: MEDIUM | Files: 1

#### Task 5.1: Add Sandbox-Specific Errors
**File**: `apps/backend/src/tools/filesystem-tools.ts` (updates to execute functions)

Add consistent error response:
```typescript
const SANDBOX_ERROR = {
  success: false,
  userFeedback: 'This operation requires a sandbox environment. Please refresh and try again.',
  previewRefreshNeeded: false,
  technicalDetails: {
    error: 'Sandbox context missing - sandboxId is required',
  },
};
```

---

## Implementation Checklist

### Phase 1: Foundation (Type System + Preview URLs)
- [ ] Add `sandboxId` to ToolExecutionContext
- [ ] Update Conversation schema with sandbox fields (sandboxId, sandboxStatus, sandboxCreatedAt, sandboxPublicUrl)
- [ ] Create preview-url.ts utility with URL generation logic
- [ ] Create Prisma migration: `add_sandbox_isolation_context`
- [ ] Commit: "feat(types): add sandbox isolation context and preview URL generation"

### Phase 2: Sandbox Integration
- [ ] Update `agenticAIService.ts` to use sandbox context
- [ ] Update `chat.ts` route to provision sandboxes
- [ ] Add sandbox cleanup logic
- [ ] Commit: "feat(sandbox): integrate sandbox provisioning in chat flow"

### Phase 3: Filesystem Tools (Add sandbox validation)
- [ ] Update `list_directory` tool - check sandboxId exists
- [ ] Update `read_file` tool - check sandboxId exists
- [ ] Update `write_file` tool - check sandboxId exists
- [ ] Update `replace` tool - check sandboxId exists
- [ ] Update `search_file_content` tool - check sandboxId exists, remove `process.cwd()` fallback
- [ ] Update `glob` tool - check sandboxId exists, remove `process.cwd()` fallback
- [ ] Test each tool individually
- [ ] Commit: "feat(tools): enforce sandbox isolation in filesystem tools"

### Phase 4: Testing
- [ ] Create tool sandbox tests
- [ ] Create E2E integration test
- [ ] Run full test suite
- [ ] Commit: "test(sandbox): add sandbox isolation tests"

### Phase 5: Finalization
- [ ] Run `pnpm type-check` - should have 0 errors
- [ ] Run `pnpm lint` - should have 0 errors
- [ ] Manual testing: verify sandbox isolation with chat example
- [ ] Update AGENTS.md documentation
- [ ] Verify no breaking changes

---

## Risk Assessment

### High Risk Items
- **Backward compatibility**: Optional fields minimize risk
- **Migration**: Test Prisma migration thoroughly
- **Performance**: Path validation on every tool call (minimal overhead)

### Edge Cases to Handle
- [ ] Symlinks pointing outside sandbox - resolve and validate
- [ ] Special characters in paths - encode/decode safely
- [ ] Concurrent access to same sandbox - concurrent safety in utils
- [ ] Sandbox creation fails - graceful fallback
- [ ] Container runs out of disk - resource limits already set
- [ ] Cleanup on process crash - use finally blocks

### Security Validation
- [ ] No `../` sequences allowed
- [ ] No absolute paths escaping sandbox
- [ ] No `~` home directory expansion
- [ ] No `process.cwd()` outside sandbox
- [ ] No environment variable expansion in paths

---

## Progress Tracking

| Phase | Task | Status | Priority | Est. Time |
|-------|------|--------|----------|-----------|
| 1 | Extend ToolExecutionContext with sandboxId | ✅ DONE | CRITICAL | 15 min |
| 1 | Update Conversation schema with sandbox fields | ✅ DONE | CRITICAL | 15 min |
| 1 | Create preview-url.ts utility | Pending | CRITICAL | 20 min |
| 1 | Create Prisma migration | Pending | CRITICAL | 10 min |
| 1 | Commit Phase 1 changes | Pending | CRITICAL | 5 min |
| 2 | Update agenticAIService | Pending | CRITICAL | 1.5 hours |
| 2 | Update chat route | Pending | CRITICAL | 1 hour |
| 3 | Update list_directory tool | Pending | CRITICAL | 45 min |
| 3 | Update read_file tool | Pending | CRITICAL | 45 min |
| 3 | Update write_file tool | Pending | CRITICAL | 45 min |
| 3 | Update replace tool | Pending | CRITICAL | 45 min |
| 3 | Update search_file_content tool | Pending | CRITICAL | 1 hour |
| 3 | Update glob tool | Pending | CRITICAL | 1 hour |
| 4 | Tool sandbox tests | Pending | HIGH | 1.5 hours |
| 4 | E2E integration test | Pending | HIGH | 1 hour |
| 5 | Error handling & documentation | Pending | HIGH | 1 hour |

**Estimated Total Time**: ~11.5 hours (Phase 1 now includes preview URL generation)

---

## Architecture Notes

- **Sandbox Isolation**: The Docker container (with gVisor) IS the security boundary
- **sandboxId Presence**: Indicates execution within a sandbox. Absence means not sandboxed
- **No Path Validation Needed**: Container filesystem isolation handles escape prevention
- **All Changes Backward Compatible**: sandboxId is optional - existing code continues to work
- **Simple & Secure**: Just check `if (!context.sandboxId) return error;` in each tool

## Preview URL Strategy

- **sandboxId Format**: URL-safe (alphanumeric + hyphens only)
- **Development**: Port-based URLs (`http://localhost:30000-40000`)
  - Deterministic port from hash of sandboxId (30000 + hash % 10000)
  - Works without DNS setup
- **Production**: Subdomain-based URLs (`https://preview-{sandboxId}.vusercontent.net`)
  - Scalable, no port conflicts
  - Requires wildcard DNS: `*.vusercontent.net → backend IP`
  - Requires reverse-proxy middleware to extract subdomain and route to container
- **Inside Container**: Vite dev server runs on `localhost:5173`
- **Frontend Preview**: Iframe connects to public preview URL with WebSocket HMR enabled

## Future Optimizations

- Container reuse for faster startup
- Metrics to track sandbox usage per user
- WebSocket progress updates for long operations
- Subdomain routing middleware for production

