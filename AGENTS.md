# InstaBuild Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-28

## Current Project Goal: Agentic Landing Page Builder

We are building an **agentic AI system** that operates like a human developer, capable of multi-step reasoning and execution for landing page development. The system uses filesystem-based tools and a ReAct (Reason, Act, Observe) loop to decompose complex user requests into sequences of tool calls.

### What We're Building

An AI-powered landing page builder that:

- **Thinks like a developer**: Uses real files (HTML, CSS, JS) instead of abstract DOM manipulation
- **Plans multi-step workflows**: Breaks down complex requests into logical sequences
- **Executes safely**: Runs in isolated Docker containers with gVisor security
- **Provides transparency**: Shows reasoning process and progress to users
- **Recovers from errors**: Handles failures gracefully with alternative approaches

## Active Technologies

### Core Stack

- **TypeScript (strict mode)** - All code with full type safety
- **pnpm workspaces** - Monorepo package management (ALWAYS use `pnpm`, never `npm` or `yarn`)
- **Vercel AI SDK v5.0** - Agentic multi-step execution with tool calling
- **Docker + gVisor** - Secure sandbox architecture for code execution

### Backend (apps/backend/)

- **Fastify** - High-performance web framework
- **Prisma** - Database ORM with PostgreSQL
- **Dockerode** - Docker container management
- **Zod** - Runtime type validation for tool schemas
- **Sharp** - Image processing and optimization

#### Fastify TypeScript Type System

**CRITICAL: Proper Type Extension Pattern**

All Fastify request types are extended globally in `apps/backend/src/types/fastify.d.ts`. This prevents TypeScript from incorrectly inferring WebSocket types in HTTP handlers.

**Global Type Extension:**

```typescript
// apps/backend/src/types/fastify.d.ts
import 'fastify';
import type { AuthenticatedUser } from '../middleware/auth.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
    project?: {
      /* project properties */
    };
  }
}

export {}; // REQUIRED - Makes this a module for augmentation to work
```

**Middleware Must Return `preHandlerHookHandler`:**

```typescript
import { preHandlerHookHandler } from 'fastify';

// ✅ CORRECT - Prevents WebSocket type inference
requireAuth(): preHandlerHookHandler {
  return async (request, reply) => {
    // No explicit types on parameters
    // TypeScript infers them from preHandlerHookHandler
  };
}

// ❌ WRONG - Causes TypeScript to match WebSocket overload
requireAuth() {
  return async (
    request: AuthenticatedRequest,
    reply: FastifyReply
  ): Promise<void> => {
    // ...
  };
}
```

**Route Handlers - Direct Property Access:**

```typescript
// ✅ CORRECT - Uses global type extension
async (request, reply) => {
  const { user, project } = request;
  if (!user) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
  // user.id, project.id are properly typed
};

// ❌ WRONG - Excessive type assertions
async (request, reply) => {
  const user = (request as AuthorizedRequest).user;
  const project = (request as AuthorizedRequest).project;
};
```

**Common Errors Without This Pattern:**

Without proper middleware return types, TypeScript incorrectly matches Fastify's WebSocket handler overload:

- `Property 'params' does not exist on type 'WebSocket'`
- `Property 'user' does not exist on type 'WebSocket'`
- `Property 'body' does not exist on type 'WebSocket'`

The solution: Global type extension + `preHandlerHookHandler` return type = No type assertions needed.

### Frontend (apps/frontend/)

- **Vite + React 19** - Modern build tooling and UI framework
- **shadcn/ui + Radix UI** - Accessible component library
- **TanStack Query v5** - Server state management
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Animations and interactions
- **React Three Fiber** - 3D graphics and visualizations

### Infrastructure

- **PostgreSQL** - Primary database via Prisma
- **MinIO/S3** - Asset storage and management
- **GitHub API** - Source code integration
- **WebSocket** - Real-time communication

## Project Structure

```
apps/
├── backend/           # Fastify API server
│   ├── src/
│   │   ├── tools/     # Agentic filesystem tools
│   │   ├── services/  # Core business logic
│   │   ├── routes/    # API endpoints
│   │   └── __tests__/ # Test suites
├── frontend/          # React application
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── pages/     # Route components
│   │   ├── hooks/     # Custom React hooks
│   │   └── services/  # API integration
packages/
├── shared/            # Shared types and utilities
sandbox-template/      # Base Docker image for user code
gvisor/               # Security configuration
tools_example_gemini/ # Reference tool implementations
```

## Environment Variables

### Required for GitHub Integration

```bash
# Backend (.env)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx  # Personal access token with 'repo' scope
GITHUB_REPOS_DIR=/tmp/instabuild-github-repos  # Optional: local clone directory (defaults to /tmp/instabuild-github-repos)
```

**GitHub Token Setup**:

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `repo` scope (full control of private repositories)
3. Copy token and add to `apps/backend/.env`

**Permissions Required**:

- `repo` - Full control of private repositories (for creating and pushing to repos)

## Commands

**IMPORTANT: This project uses pnpm. Always use `pnpm` commands, never `npm` or `yarn`.**

```bash
pnpm dev              # Start all services in development
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm lint             # Lint all code
pnpm type-check       # TypeScript validation
pnpm add <package>    # Install a package (NOT npm install)
```

## Code Style

- **TypeScript strict mode** - All code must pass strict type checking
- **ESLint + Prettier** - Automated code formatting and linting
- **Conventional commits** - Structured commit messages
- **Husky pre-commit hooks** - Automated quality checks

## Sandbox Template - Theme System & Animations (NEW - ✅ IMPLEMENTED)

**Purpose**: Help AI generate distinctive landing pages instead of generic defaults.

**Location**: `/sandbox-template/`

### 10 Pre-Built Themes (Prevents AI Laziness)
- **Professional/SaaS**: Minimal, Tech, B2B, Fintech, Education
- **Startup/Creative**: Vibrant, Portfolio
- **Premium**: Luxury
- **Commerce**: E-commerce
- **Health**: Wellness

Each theme includes:
- Color palettes (primary, secondary, accent) with light/dark variants
- Component variant recommendations (which hero/navbar/footer pairs well together)
- Animation style (subtle, energetic, smooth, playful, enterprise)
- Usage guidelines for AI decision-making

**Files**:
- `src/lib/themes.ts` - 1000+ lines with 10 complete theme definitions
- `src/contexts/ThemeContext.tsx` - Theme provider + useTheme hook
- `sandbox-template/AGENTS.md` - Complete theme selection guide + anti-patterns

### 40+ Animation Patterns (Organized by Use Case)
Expanded from 15 basic animations:
- **Entrance** (15+): fadeInUp, scaleIn, bounceIn, flipInY, zoomIn, etc.
- **Text Effects** (5): textCharacterReveal, textEmphasisPulse, highlightBgReveal, etc.
- **Scroll-Triggered** (5): progressiveSlideInUp, cascadeUp, gridMeshReveal, etc.
- **Hover** (5): hoverLift, hoverGlow, hoverScale, hoverBorderPulse
- **Container** (3): cardShineEffect, cardShadowGrow, cardBorderGradientPulse
- **Stagger** (3+): staggerContainer, staggerContainerFast, staggerContainerSlow
- **Transitions** (8+): smooth, spring, bouncy, fast, slow, etc.

**File**: `src/lib/animations.ts` - 550+ lines with copy-paste examples

### 10 Anti-Patterns (How to Avoid "AI Slop")
Documented in `sandbox-template/AGENTS.md`:
1. No theme selected → Use theme system (Minimal, Vibrant, Luxury, etc.)
2. Same component variants everywhere → Mix variants for visual variety
3. No animations → Add entrance/scroll/hover animations
4. No hover effects → Use hoverLift, hoverGlow on interactive elements
5. Broken/placeholder images → Use Unsplash URLs or PlaceholderImage component
6. Inconsistent typography → Use clear heading hierarchy
7. Wrong component variants for theme → Use theme's recommended variants
8. No whitespace/breathing room → Use generous section spacing
9. Unclear CTAs → Make primary CTA larger and more prominent
10. Repetitive layouts → Vary section structures (full-width → split → grid → timeline)

**Reference**: `sandbox-template/AGENTS.md` - Full anti-patterns guide with before/after examples

---

## Current Implementation Status

### ✅ Completed Features

#### 1. Authentication & User Management System

- **Email/password authentication** with bcrypt hashing and JWT tokens
- **OAuth integration** for Google and GitHub providers
- **Session management** with refresh tokens (7-day expiry) and access tokens (15-min expiry)
- **Protected routes** with middleware-based authorization
- **Toast notifications** using `sonner` library for user feedback
- **User menu dropdown** with profile, settings, and logout options

#### 2. Project & Conversation Management

- **Multi-tenant architecture** with projects as organizational units
- **Project CRUD operations** with dashboard interface
- **Conversation management** within projects
- **Hero query persistence** - stores user queries in localStorage before authentication
- **Automatic project creation** - creates project + conversation after login with stored query
- **Dashboard pages** for project and conversation management

#### 3. Agentic AI System (Vercel AI SDK Integration)

- **Multi-step execution** with `stepCountIs()` limits and `onStepFinish` callbacks
- **ReAct loop pattern** for reasoning, acting, and observing
- **Automatic state management** through AI SDK message history
- **Error recovery strategies** with retry and alternative approaches
- **Reasoning transparency** service for user-friendly explanations

#### 4. Developer Filesystem Tools (Complete Set)

- **`list_directory`** - Directory listing with ignore patterns and git support
- **`read_file`** - File reading with offset/limit and binary detection
- **`write_file`** - File writing with directory creation and diff display
- **`replace`** - Precise text replacement with context matching
- **`search_file_content`** - Regex pattern searching across files
- **`glob`** - File discovery with glob patterns and sorting

**NOTE**: `read_guidelines` tool removed (2025-11-20) - guidelines now embedded in system prompt for better context preservation

#### 5. Secure Sandbox Architecture - ENHANCED with Health Checks

- **Docker containerization** with gVisor kernel isolation
- **Resource limits** (CPU, RAM, execution time)
- **Multi-tenant isolation** preventing cross-user access
- **On-demand provisioning** with Vite + React TypeScript base image
- **Automatic cleanup** and timeout handling

**✅ NEW - Health Check System**:

- **Docker HEALTHCHECK** in `Dockerfile.sandbox` (2-second interval, 5-second grace period)
- **Backend health polling** with `waitForContainerHealth()` method (30-second timeout)
- **Smart container reuse** - only reuses healthy containers
- **Health validation** during container reuse checks
- **Reconciliation job** - detects unhealthy containers and marks as FAILED

**✅ NEW - Sandbox Sharing & Cleanup**:

- **Project-level sandbox sharing** - all conversations in a project reuse same container
- **Smart deletion** - only removes container when last conversation using it is deleted
- **Conversation cleanup** - checks shared sandbox before deleting
- **Project cleanup** - finds unique sandboxes and removes each only once
- **Graceful error handling** - deletion proceeds even if sandbox cleanup fails

#### 6. Docker Health Checks & Sandbox Cleanup (NEW - ✅ IMPLEMENTED)

**Docker container health verification and smart cleanup**:

- **`Dockerfile.sandbox`**: HEALTHCHECK instruction
  - Verifies dev server on port 5173 responds within 1 second
  - Checks every 2 seconds during runtime
  - 5-second startup grace period
  - Marks container unhealthy after 3 consecutive failures

- **`sandboxProvisioning.ts` enhancements**:
  - `waitForContainerHealth()`: Polls container health status for up to 30 seconds
  - `destroySandbox()`: Only removes Docker container if last conversation using it
  - `handleExistingContainer()`: Checks health before reusing containers
  - Reconciliation: Detects unhealthy containers and marks as FAILED

- **Route handlers updated**:
  - Conversation deletion: Checks for shared sandbox before cleanup
  - Project deletion: Finds unique sandboxes and removes each only once
  - Both handle cleanup failures gracefully

**Status**: Code complete, Docker image rebuild pending

#### 7. Enhanced Tool Registry System

- **AI SDK v5.0 compatibility** with proper `inputSchema` format
- **Enhanced tool definitions** with user-friendly metadata
- **Safety constraint system** with validation and confirmation
- **Progress tracking** and execution monitoring
- **Tool validation** and parameter checking

#### 8. Asset Management & Validation

- **Image optimization** with Sharp and ImageMagick support
- **Asset organization** with automatic reference updating
- **Code validation** for HTML, CSS, and JavaScript syntax
- **Build tool integration** for asset processing

### ✅ Recently Completed

#### Project-Level GitHub Integration (1 Project = 1 Repository)

**Implementation Date**: 2025-11-20

**Architecture**: Automatic code persistence to GitHub after every agentic loop completion

- **Database Schema Updates**:
  - Added `githubRepoUrl` and `commitSha` fields to Project model
  - Migration: `20251120033654_add_github_fields_to_project`

- **GitHubSyncService Enhancements** (`apps/backend/src/services/githubSync.ts`):
  - **NEW: `syncProjectToGitHub()`** - Project-level batch sync method
  - **NEW: `ensureGitHubRepoForProject()`** - Creates GitHub repo per project (naming: `instabuild-{projectId}`)
  - **NEW: `commitAllChanges()`** - Batch commit all files in one transaction
  - **NEW: `syncWorkspaceToRepo()`** - Syncs entire sandbox workspace to Git repo
  - Ignores: `node_modules`, `.git`, `dist`, `build`, `.next`, `.cache`, `coverage`

- **Agentic AI Integration** (`apps/backend/src/services/agentic/AgenticAIService.ts`):
  - **NEW: `syncProjectToGitHubAsync()`** - Fires after successful loop completion
  - Triggers on `finishReason === 'stop' || finishReason === 'end-turn'`
  - Extracts files from Docker container via `tar | base64` encoding
  - Fire-and-forget execution - doesn't block user response
  - Commit message format: `"AI changes from: {conversationTitle} - {timestamp}"`

- **Workflow**:
  1. User creates a project → GitHub repo created on first sync (lazy initialization)
  2. AI modifies files in sandbox container during agentic loop
  3. Loop completes successfully → All workspace files extracted from container
  4. Files synced to local Git repo clone → Committed and pushed to GitHub
  5. Database updated with latest `commitSha`

- **Benefits**:
  - Every project has persistent version control on GitHub
  - Code survives container deletion/recreation
  - Full history of AI-generated changes
  - Easy collaboration and code review
  - Automatic backup without user intervention

**Status**: ✅ Code complete, type-checked, database migrated

#### GitHub Sync Restore Fix (NEW - ✅ IMPLEMENTED)

**Implementation Date**: 2025-11-20

**Problem Solved**: Code successfully pushed to GitHub when conversations ended, but did NOT restore when sandboxes were recreated (e.g., after cleanup/idle timeout). This caused user code to be lost from workspace view even though it still existed in GitHub.

**Root Cause**: Commit 54507e4 implemented project-level PUSH but completely missed project-level RESTORE. The restore logic only checked for landing page repos, not project repos.

**Solution Implemented**:

- **GitHubSyncService Enhancements** (`apps/backend/src/services/githubSync.ts`):
  - **NEW: `restoreProjectToWorkspace()`** - Project-level restore method (lines 305-355)
    - Mirrors landing page restore logic but uses `project.githubRepoUrl`
    - Clones/pulls latest code from GitHub to local cache
    - Copies all files to container workspace at `/workspace`
    - Non-blocking: container starts even if restore fails
    - Supports version tags for future rollback functionality

- **SandboxProvisioning Enhancements** (`apps/backend/src/services/sandboxProvisioning.ts`):
  - **UPDATED: Restore Logic** in `provisionSandbox()` (lines 317-403)
    - **Priority 1**: Check `project.githubRepoUrl` first (project-level sync)
    - **Priority 2**: Fall back to landing page restore (legacy compatibility)
    - Maintains backward compatibility with existing landing pages
    - Graceful error handling - logs warnings but continues provisioning

- **Restore Workflow** (New Container Creation):
  1. Container created and health check passes ✓
  2. Git initialized in `/workspace` ✓
  3. Check if project has `githubRepoUrl` (project-level sync)
     - If YES → Call `restoreProjectToWorkspace(projectId, '/workspace')`
     - If NO → Fall back to landing page restore (legacy)
  4. Files restored to `/workspace` from GitHub
  5. Container marked READY with restored code ✓

- **Benefits**:
  - ✅ Project code now automatically restores when sandboxes are recreated
  - ✅ Code persists across container lifecycle (create → use → cleanup → recreate)
  - ✅ Backward compatible with existing landing page restore
  - ✅ Non-breaking change with graceful error handling
  - ✅ No database migrations required
  - ✅ Comprehensive logging for debugging

- **Commit**: a12c649 "Fix GitHub sync: Restore project code when sandboxes recreated"

**Status**: ✅ Code complete, tested, committed, and pushed

#### Automatic Dependency Installation After Restore (NEW - ✅ IMPLEMENTED)

**Implementation Date**: 2025-11-20

**Enhancement**: Automatically install npm dependencies when code is restored from GitHub to ensure `node_modules/` is populated (since it's in `.gitignore`).

**Problem**: After restoring code from GitHub, `node_modules/` was missing because it's gitignored. This meant projects wouldn't run until dependencies were manually installed.

**Solution Implemented**:

- **SandboxProvisioning Enhancements** (`apps/backend/src/services/sandboxProvisioning.ts`):
  - **NEW: `installDependenciesInContainer()`** - Automatic dependency installation (lines 984-1077)
    - Checks if `package.json` exists in `/workspace`
    - Runs `pnpm install --prefer-offline` if found
    - Uses `--prefer-offline` flag for faster installs from cache
    - Non-blocking: container starts even if install fails
    - Filters out pnpm progress output from logs
  - **Integration**: Called after both restore paths
    - After project code restore (lines 350-368)
    - After landing page code restore (lines 403-421)

- **Workflow** (After Code Restore):
  1. Code restored from GitHub to `/workspace` ✓
  2. Check if `package.json` exists
  3. If YES → Run `pnpm install --prefer-offline`
  4. Dependencies installed → Container fully functional ✓
  5. If NO or install fails → Container still ready (non-blocking)

- **Benefits**:
  - ✅ Projects work immediately after restore - no manual `pnpm install` needed
  - ✅ AI can run `pnpm dev` without dependency errors
  - ✅ Non-blocking: container ready even if install fails
  - ✅ Uses pnpm cache for faster installs
  - ✅ Comprehensive logging for debugging

- **Trade-offs**:
  - Adds 30-60 seconds to container provisioning time (one-time cost)
  - Requires network access during provisioning (for missing packages)
  - Container takes longer to reach READY status

- **Commit**: f1649dc "Add automatic dependency installation after code restore"

**Status**: ✅ Code complete, tested, committed, and pushed

#### System Prompt Optimization for Message Pruning (NEW - ✅ IMPLEMENTED)

**Implementation Date**: 2025-11-20

**Purpose**: Enable safe use of `pruneMessages()` from Vercel AI SDK without losing critical component reference information.

**Changes**:

- **Removed `read_guidelines` tool**:
  - Tool previously read `/workspace/AGENTS.md` (500 lines) from sandbox container
  - Risk: Could be pruned from message history in long conversations
  - Overhead: Extra tool call at start of each substantial task

- **Embedded guidelines in system prompt** (`SystemPromptBuilder.ts`):
  - **TEMPLATE STACK & STRUCTURE** section - Import paths, 9 core components, 27+ variants
  - **COMPONENT API REFERENCE** section - Complete API docs for all 9 section components
  - **LUCIDE ICONS USAGE** section - Critical pattern for icon imports (common error source)
  - Updated CORE WORKFLOW to reference embedded guidelines instead of tool call

- **Benefits**:
  - ✅ Guidelines **always available** - never pruned by `pruneMessages()`
  - ✅ No tool call overhead - saves ~2 seconds per conversation
  - ✅ Token efficiency - guidelines counted once in system prompt, not duplicated in history
  - ✅ Enables safe message pruning for long conversations (20+ messages)
  - ✅ Component APIs preserved even after aggressive pruning

**Implementation Details**:

```typescript
// Before: Guidelines loaded via tool call
"3. Load template guidelines (read_guidelines())"

// After: Guidelines embedded in system prompt
## COMPONENT API REFERENCE
### 1. Navbar
<Navbar brandName="..." links={[...]} ctaButton={{...}} />
### 2. HeroSection
<HeroSection title="..." description="..." primaryCta={{...}} />
// ... all 9 components
```

**Files Modified**:

- `apps/backend/src/services/agentic/prompts/SystemPromptBuilder.ts` - Added component reference section
- `apps/backend/src/tools/memory-tools.ts` - Removed `readGuidelinesTool` definition and registration

**Status**: ✅ Complete, type-checked, ready for `pruneMessages()` integration

#### System Prompt Update - Theme System & Animations Integration (NEW - ✅ IMPLEMENTED)

**Implementation Date**: 2025-11-28

**Purpose**: Keep system prompt in sync with sandbox template improvements for distinctive AI-generated landing pages.

**Updates to `SystemPromptBuilder.ts`**:

1. **New Theme System Section** - Guides AI to pick a specific theme first
   - Lists all 10 themes with use cases
   - Explains theme selection process (call `think` to match context to theme)
   - Notes that themes provide color palettes, component recommendations, and animation styles
   - Removes manual `index.css` color editing (themes handle it automatically)

2. **Updated Core Workflow** - Theme selection now step 3
   - Step 1: Reason first
   - Step 2: Assess if request is complete
   - **Step 3: Theme selection (CRITICAL)** - Pick specific theme first to prevent AI laziness
   - Steps 4-8: Continue with planning, images, implementation, validation

3. **Expanded Animation Patterns Section** - 40+ patterns with organization
   - 7 categories listed (Entrance, Text, Scroll-Triggered, Hover, Container, Stagger, Transitions)
   - Copy-paste ready code examples
   - Animation themes matched to design themes
   - Reference to sandbox-template/AGENTS.md for complete 40+ list

4. **New Anti-Patterns Checklist** - 10 concrete items to avoid
   - Brief, actionable guidance for each anti-pattern
   - Quick mental checklist format
   - Prevents "AI slop" (generic designs)

**Token Efficiency**:
- Used bullet points instead of prose
- One-liners for anti-patterns
- Cross-references to AGENTS.md (avoid duplication)
- Copy-paste code for animations
- ~40% more concise than previous version

**Files Modified**:
- `apps/backend/src/services/agentic/prompts/SystemPromptBuilder.ts` - Theme system section, updated workflow, animation patterns, anti-patterns

**Status**: ✅ Complete, verified to compile without errors

**Impact**: Backend AI now has up-to-date guidance for using 10 themes and 40+ animations, preventing lazy defaults and generic designs.

### 🚧 In Progress

#### 1. Frontend Chat Interface Enhancement

- **Real-time streaming** with WebSocket integration
- **Progress visualization** showing AI reasoning steps
- **Confirmation dialogs** for destructive operations
- **Diff display** for file changes
- **Message persistence** with conversation history

#### 2. Sandbox Shell Integration

- **Secure command execution** within containers
- **Command validation** and security filtering
- **Output streaming** with structured responses

#### 3. User Experience Improvements

- **Project templates** for quick start
- **Conversation search** and filtering
- **Project sharing** and collaboration features
- **Usage analytics** and billing integration

### 📋 Remaining Tasks

#### 1. Performance Optimization

- **Container reuse** mechanisms for faster startup
- **File content caching** for frequently accessed files
- **State serialization** optimization

#### 2. Monitoring & Analytics

- **Tool execution metrics** and performance tracking
- **Resource usage monitoring** and optimization recommendations
- **Error pattern analysis** for improved recovery

#### 3. Testing & Quality Assurance

- **Unit tests** for core agentic components
- **Integration tests** for multi-step workflows
- **End-to-end tests** for complete user scenarios

## Agentic System Architecture

### Core Components

#### 1. AgenticAIService (`apps/backend/src/services/agentic/`)

The AgenticAIService has been refactored into a modular architecture with 10 focused modules:

**Core Orchestrator** (`AgenticAIService.ts`):

- **Multi-step execution** with Vercel AI SDK
- **Progress tracking** and callback management
- **Public API** for integration with routes
- **Lifecycle management** for conversations

**Supporting Modules**:

- **TaskConfiguration** - Task complexity analysis (Simple → Advanced), step limits, guidelines
- **ErrorRecovery** - Error classification, strategy selection, tool call repair
- **StateManagement** - Conversation state tracking, execution metrics collection
- **SystemPromptBuilder** - Dynamic system prompt generation with complexity-aware guidelines
- **AnalyticsGenerator** - Analytics summary generation and performance statistics

**Key Benefits**:

- Single-responsibility modules for better maintainability
- Independent unit testing of each component
- Easier to extend with new recovery strategies or metrics
- Reduced cognitive load (580 lines per file vs. 1,441 monolithic)

#### 2. Tool Registry (`apps/backend/src/services/toolRegistry.ts`)

- **Enhanced tool definitions** with metadata
- **AI SDK integration** with proper schema conversion
- **Safety validation** and constraint checking
- **Execution context** management

#### 3. Sandbox Manager (`apps/backend/src/services/sandboxManager.ts`)

- **Container lifecycle** management
- **Resource monitoring** and enforcement
- **Security isolation** with gVisor
- **Shell command execution** in secure environment

#### 3a. Sandbox Provisioning & Health Checks (`apps/backend/src/services/sandboxProvisioning.ts`)

**✅ IMPLEMENTED: Health Check System**

- **Docker HEALTHCHECK** in `Dockerfile.sandbox`:
  - Verifies port 5173 responds every 2 seconds
  - 5-second startup grace period
  - Fails after 3 consecutive check failures

- **`waitForContainerHealth()`** method:
  - Polls container health status after container.start()
  - Waits up to 30 seconds with 500ms polling interval
  - Only marks sandbox READY when Docker reports `health.status === 'healthy'`
  - Throws error if container becomes unhealthy or timeout expires
  - Falls back gracefully if no health check configured

- **`extractPortFromContainer()`** method (NEW):
  - Extracts actual port bindings from Docker container inspect data
  - Reads NetworkSettings.Ports to get host port for 5173/tcp
  - Returns actual port that container is bound to
  - Prevents port mismatches between database and Docker reality

**✅ IMPLEMENTED: Sandbox Sharing at Project Level**

- All conversations in a project share the same Docker container to optimize resource usage
- When checking for existing containers, verifies health before reusing
- Unhealthy shared containers are marked as FAILED and not reused
- `handleExistingContainer()` now:
  - Checks health status before reusing containers
  - Extracts and returns actual port from reused containers
  - Ensures database stores correct Docker port bindings
  - Prevents port mismatches when containers are reused

**✅ IMPLEMENTED: Smart Deletion Logic**

- `destroySandbox()` method (UPDATED):
  - Checks if other conversations in the project use the same sandbox
  - **Only removes Docker container** if this is the last conversation using it
  - If other conversations share the sandbox:
    - Only marks current conversation's status as FAILED
    - Leaves Docker container running for other conversations
    - Logs "Skipped Docker container removal" with explanation
  - Always marks conversation as FAILED regardless of container removal

**✅ IMPLEMENTED: Reconciliation & Recovery**

- **Startup Port Validation** in `recoverExistingSandboxes()`:
  - Extracts actual port from each recovered container
  - Compares with database port on backend startup
  - Automatically syncs database if mismatch detected
  - Logs all port corrections for debugging
  - Ensures port accuracy after server restarts

- **Periodic Reconciliation** (every 60 seconds) in `reconcileContainerStates()`:
  - Detects unhealthy containers and marks as FAILED
  - Detects orphaned containers not in database and cleans them up
  - Ensures database consistency with actual container states
  - Fixes stale DB entries

- **Health Check Service** (`sandboxHealthCheckService.ts`):
  - Runs every 5 minutes to verify READY sandboxes still exist
  - Queries sandboxes by conversation ID (not sandbox/container ID)
  - Marks containers as FAILED if not found in Docker
  - Automatically recovers from stale sandbox states

**✅ IMPLEMENTED: Project & Conversation Cleanup**

- **Conversation Deletion**: `DELETE /conversations/:id` now:
  - Checks if other conversations share the same sandbox before cleanup
  - Only calls `destroySandbox()` if this is the last one using it
  - Logs cleanup status appropriately
  - Proceeds with deletion even if sandbox cleanup fails

- **Project Deletion**: `DELETE /projects/:id` now:
  - Finds all unique sandboxes in the project
  - Destroys each unique sandbox only once
  - `destroySandbox()` handles shared sandbox logic automatically
  - Proceeds with deletion even if sandbox cleanup fails

**Status**: ✅ All health check infrastructure COMPLETED

- Port synchronization on container reuse ✅
- Startup port validation ✅
- Health check service conversation ID fix ✅
- Code compiles successfully ✅

**Pending**: Docker image rebuild needed to activate health checks in running containers

#### 4. Reasoning Transparency (`apps/backend/src/services/reasoningTransparencyService.ts`)

- **Step-by-step explanations** of AI thought process
- **Progress updates** during multi-step tasks
- **User-friendly error messages** and recovery suggestions

### Tool Categories

#### Filesystem Tools (`apps/backend/src/tools/filesystem-tools.ts`)

- **Developer-centric** approach using real files
- **Git integration** for ignore patterns and history
- **Diff visualization** for change confirmation
- **Context-aware** editing with precise replacements

#### Asset Management (`apps/backend/src/tools/asset-management-tools.ts`)

- **Image optimization** with multiple backends
- **File organization** with reference updating
- **Build tool execution** in secure environment

#### Validation Tools (`apps/backend/src/tools/validation-tools.ts`)

- **Syntax validation** for web technologies
- **Code quality** checking and suggestions
- **Automatic error** detection and correction

## API Guidelines

### Authentication API

**Base Path**: `/api/v1/auth`

**Key Endpoints**:

- `POST /auth/register` - Create new user account
  - Body: `{ email, password, displayName }`
  - Returns: `{ user, accessToken, refreshToken, expiresIn }`
  - Sets HTTP-only cookie with refresh token

- `POST /auth/login` - Email/password login
  - Body: `{ email, password }`
  - Returns: `{ user, accessToken, refreshToken, expiresIn }`
  - Sets HTTP-only cookie with refresh token

- `POST /auth/refresh` - Refresh access token
  - Body: `{ refreshToken }` (optional, can use cookie)
  - Returns: New access token and refresh token

- `POST /auth/logout` - End user session
  - Clears refresh token cookie
  - Deactivates session in database

- `GET /auth/oauth/:provider` - Initiate OAuth flow
  - Providers: `google`, `github`
  - Returns: `{ authUrl, state }`

- `GET /auth/oauth/:provider/callback` - OAuth callback handler
  - Query: `{ code, state }`
  - Returns: `{ user, accessToken, refreshToken }`

### Project Management API

**Base Path**: `/api/v1/projects`

**Key Endpoints**:

- `GET /projects` - List user's projects
- `POST /projects` - Create new project
  - Body: `{ name, description? }`
- `GET /projects/:id` - Get project details
- `PATCH /projects/:id` - Update project
  - Body: `{ name?, description? }`
- `DELETE /projects/:id` - Delete project
  - **Note**: Automatically cleans up all unique sandboxes in the project
  - Finds all distinct Docker containers used by project conversations
  - Removes each container only once
  - Gracefully handles cleanup failures - deletion proceeds regardless
- `POST /projects/:id/activate` - Set as active project
- `GET /projects/:id/conversations` - List project conversations

**Sandbox Cleanup on Project Deletion**:

1. Queries database for all conversations with sandboxes in the project
2. Identifies unique sandboxes (may be shared across multiple conversations)
3. For each unique sandbox:
   - Calls `destroySandbox()` which handles shared sandbox logic
   - Only removes Docker container if no other conversations use it
4. Project deletion proceeds with cascade delete to conversations and landing pages
5. All conversation database records are deleted regardless of sandbox cleanup status

### Conversation API

**Base Path**: `/api/v1/conversations`

**Key Endpoints**:

- `POST /conversations` - Create new conversation
  - Body: `{ projectId, title?, landingPageId? }`
- `GET /conversations/:id` - Get conversation details
- `GET /conversations/:id/messages` - Get conversation messages
  - Query: `{ limit? }`
- `POST /conversations/:id/messages` - Add message to conversation
  - Body: `{ role, parts, metadata? }`
- `PATCH /conversations/:id` - Update conversation
  - Body: `{ title?, isArchived? }`
- `DELETE /conversations/:id` - Delete conversation
  - **Note**: Automatically cleans up sandbox if this is the last conversation using it
  - Other conversations sharing the sandbox are unaffected
- `POST /conversations/:id/archive` - Archive conversation
- `POST /conversations/:id/restore` - Restore archived conversation
- `POST /conversations/:id/provision-sandbox` - Provision sandbox for conversation
  - Creates or reuses existing project sandbox
  - Waits for health check to pass (up to 30 seconds)
  - Returns preview URL when ready

**Sandbox Management**:

When deleting a conversation with a shared sandbox:

1. Checks if other conversations in the project use the same sandbox
2. If others exist: Only marks conversation as FAILED, leaves sandbox running
3. If last one: Removes Docker container and marks as FAILED

### Agentic Chat API

**Endpoint**: `POST /api/v1/chat`

**Request Body**:

```typescript
{
  messages: Array<{
    role: 'user' | 'assistant';
    content: string | Array<{type: 'text', text: string}>;
  }>;
  conversationId?: string;  // Optional - creates new if not provided
  maxSteps?: number;        // Optional - defaults to 10
}
```

**Response**: Server-Sent Events stream with:

```typescript
data: {"type":"start"}
data: {"type":"start-step"}
data: {"type":"text-delta","delta":"AI reasoning..."}
data: {"type":"tool-call","toolName":"read_file","args":{...}}
data: {"type":"tool-result","result":{...}}
data: {"type":"finish","finishReason":"stop"}
```

### Sandbox API

**Endpoint**: `POST /api/v1/sandbox`

- Creates new isolated container for user code execution

**Endpoint**: `POST /api/v1/sandbox/execute`

- Executes shell commands in secure environment

### Frontend API Base URL Convention

**IMPORTANT**: The `VITE_API_BASE_URL` environment variable already includes the API version path.

- **Configured in**: `apps/frontend/.env.example`
- **Default value**: `http://localhost:3000/api/v1`
- **Usage pattern**: When making API calls, **DO NOT** include `/api/v1` in the path

#### ✅ Correct Usage

```typescript
// VITE_API_BASE_URL = "http://localhost:3000/api/v1"
fetch(`${import.meta.env.VITE_API_BASE_URL}/chat`);
// Results in: http://localhost:3000/api/v1/chat ✓

// For auth endpoints
fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/login`);
// Results in: http://localhost:3000/api/v1/auth/login ✓
```

### Authentication in Frontend

**Using AuthContext**:

```typescript
import { useAuth } from '../../contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, login, logout, register } = useAuth();

  // Check authentication
  if (!isAuthenticated) {
    return <LoginPrompt />;
  }

  // Use user data
  return <div>Welcome, {user.displayName}!</div>;
}
```

**Protected Routes**:

```typescript
<ProtectedRoute>
  <DashboardPage />
</ProtectedRoute>
```

**Toast Notifications**:

```typescript
import { toast } from 'sonner';

// Success notification
toast.success('Account created!', {
  description: 'Welcome to InstaBuild',
});

// Error notification
toast.error('Login failed', {
  description: 'Invalid credentials',
});
```

## TanStack Query Setup

### QueryClientProvider Configuration

**Location**: `apps/frontend/src/main.tsx`

TanStack Query (v5) is configured with the following defaults:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Don't refetch when user focuses window
      retry: 1, // Retry failed requests once
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    },
  },
});
```

### Using Queries

When fetching data with TanStack Query:

```typescript
import { useQuery } from '@tanstack/react-query';

const { data, isLoading, error } = useQuery({
  queryKey: ['page', pageId],
  queryFn: () => fetchPage(pageId!),
  enabled: !!pageId, // Only run query when pageId exists
});
```

## Security & Safety Guidelines

### Sandbox Security

- **All user code** executes in isolated Docker containers
- **gVisor kernel isolation** prevents container escape
- **Resource limits** prevent abuse (CPU, RAM, time)
- **Network isolation** restricts external access
- **Automatic cleanup** after session timeout

### Tool Safety

- **Safety levels** (safe, potentially_destructive) for all tools
- **User confirmation** required for destructive operations
- **Validation** of all inputs and file operations
- **Error recovery** with graceful degradation
- **Audit logging** of all tool executions

### Best Practices

- **Validate all inputs** using Zod schemas
- **Handle errors gracefully** with user-friendly messages
- **Provide progress feedback** for long-running operations
- **Use TypeScript strict mode** for all code
- **Test thoroughly** with unit and integration tests
