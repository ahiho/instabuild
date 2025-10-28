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
- **pnpm workspaces** - Monorepo package management
- **Vercel AI SDK v5.0** - Agentic multi-step execution with tool calling
- **Docker + gVisor** - Secure sandbox architecture for code execution

### Backend (apps/backend/)

- **Fastify** - High-performance web framework
- **Prisma** - Database ORM with PostgreSQL
- **Dockerode** - Docker container management
- **Zod** - Runtime type validation for tool schemas
- **Sharp** - Image processing and optimization

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

## Commands

```bash
pnpm dev              # Start all services in development
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm lint             # Lint all code
pnpm type-check       # TypeScript validation
```

## Code Style

- **TypeScript strict mode** - All code must pass strict type checking
- **ESLint + Prettier** - Automated code formatting and linting
- **Conventional commits** - Structured commit messages
- **Husky pre-commit hooks** - Automated quality checks

## Current Implementation Status

### ✅ Completed Features

#### 1. Agentic AI System (Vercel AI SDK Integration)

- **Multi-step execution** with `stepCountIs()` limits and `onStepFinish` callbacks
- **ReAct loop pattern** for reasoning, acting, and observing
- **Automatic state management** through AI SDK message history
- **Error recovery strategies** with retry and alternative approaches
- **Reasoning transparency** service for user-friendly explanations

#### 2. Developer Filesystem Tools (Complete Set)

- **`list_directory`** - Directory listing with ignore patterns and git support
- **`read_file`** - File reading with offset/limit and binary detection
- **`write_file`** - File writing with directory creation and diff display
- **`replace`** - Precise text replacement with context matching
- **`search_file_content`** - Regex pattern searching across files
- **`glob`** - File discovery with glob patterns and sorting

#### 3. Secure Sandbox Architecture

- **Docker containerization** with gVisor kernel isolation
- **Resource limits** (CPU, RAM, execution time)
- **Multi-tenant isolation** preventing cross-user access
- **On-demand provisioning** with Vite + React TypeScript base image
- **Automatic cleanup** and timeout handling

#### 4. Enhanced Tool Registry System

- **AI SDK v5.0 compatibility** with proper `inputSchema` format
- **Enhanced tool definitions** with user-friendly metadata
- **Safety constraint system** with validation and confirmation
- **Progress tracking** and execution monitoring
- **Tool validation** and parameter checking

#### 5. Asset Management & Validation

- **Image optimization** with Sharp and ImageMagick support
- **Asset organization** with automatic reference updating
- **Code validation** for HTML, CSS, and JavaScript syntax
- **Build tool integration** for asset processing

### 🚧 In Progress

#### 1. Frontend Chat Interface

- **Real-time streaming** with WebSocket integration
- **Progress visualization** showing AI reasoning steps
- **Confirmation dialogs** for destructive operations
- **Diff display** for file changes

#### 2. Sandbox Shell Integration

- **Secure command execution** within containers
- **Command validation** and security filtering
- **Output streaming** with structured responses

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

#### 1. AgenticAIService (`apps/backend/src/services/agenticAIService.ts`)

- **Task complexity analysis** (Simple → Advanced)
- **Model selection** based on complexity and cost
- **Multi-step execution** with Vercel AI SDK
- **Error recovery** with multiple strategies
- **Progress tracking** and user feedback

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
- **Default value**: `http://localhost:3330/api/v1`
- **Usage pattern**: When making API calls, **DO NOT** include `/api/v1` in the path

#### ✅ Correct Usage

```typescript
// VITE_API_BASE_URL = "http://localhost:3330/api/v1"
fetch(`${import.meta.env.VITE_API_BASE_URL}/chat`);
// Results in: http://localhost:3330/api/v1/chat ✓
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
