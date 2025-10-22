---
description: Execute the implementation planning workflow using the plan template to generate design artifacts.
---

## User Input

```text
The system is designed as a full-stack monorepo application, separating the backend services from the frontend user interface.

1. High-Level Architecture
The project will be structured as a pnpm workspace (monorepo) containing two primary packages: backend and frontend. This approach allows for shared configurations (ESLint, Prettier, TypeScript) while maintaining a clear separation of concerns.

The overall data flow is as follows:

The user interacts with the Frontend (React SPA).

The Frontend communicates with the Backend via a RESTful API and a streaming chat endpoint.

The Backend orchestrates the core logic, communicating with external services:

PostgreSQL Database (via Prisma) for state persistence.

MinIO/S3 for asset storage.

GitHub API for version control (source code storage).

Vercel API for deployment.

LLM API for chat and code generation logic.

2. Backend Architecture (packages/backend)
Framework: Fastify will be used for its high performance and extensible plugin architecture. It will be set up with TypeScript.

Database & ORM: Prisma will manage all database interactions with a PostgreSQL database. The schema will include three core models: LandingPage, LandingPageVersion, and Asset, with relationships defined to manage versions and assets for each page.

Agentic Workflow (Core Logic):

Chat & Tool Calling: The chat endpoints (/api/v1/chat and /api/v1/pages/:id/chat) will be the primary entry point. They will manage the conversation state and handle Tool Calling to request structured user input.

Generation & Versioning: Upon a successful generation or edit command, a service will:

Generate/modify React source code in a temporary environment.

Use the GitHub API to commit the changes to a dedicated private repository for that landing page.

Create a LandingPageVersion record in the database, linking it to the new commit SHA.

Deployment: The deployment service will use the Vercel API to trigger deployments from the GitHub repository, targeting specific commit SHAs for new versions or rollbacks.

Asset Handling: File uploads will be handled by @fastify/multipart and streamed directly to a MinIO bucket (for local development) or an S3-compatible service.

3. Frontend Architecture (packages/frontend)
Framework: A Vite-powered React application will be used for a fast development experience and optimized builds. The entire codebase will be in TypeScript (.tsx).

State Management Strategy:

Server State: TanStack Query v5 is the exclusive choice for managing all server state. It will handle fetching page details, version history, and polling for status updates with refetchInterval, eliminating manual setInterval logic.

Chat & UI State: The Vercel AI SDK's useChat hook will manage the entire lifecycle of the conversational interface, including message history, pending states, and handling streaming responses and tool calls.

Routing: React Router v6 will manage application routing, with two primary routes: / for the initial creation flow and /pages/:id for the main editor workspace.

Component & Styling:

Tailwind CSS will be used for all styling.

shadcn/ui will be used to generate the base UI components (buttons, inputs, cards), ensuring consistency and accessibility. These will be customized as needed.

Custom Build Process (Vite Plugin):

A custom Vite plugin (vite-plugin-agent-enhancer.ts) will be developed.

Using Babel for AST transformation, this plugin will be responsible for:

Injecting Metadata: Automatically adding a structured data-agent-id attribute to every significant JSX element. This ID will contain a coordinate (filePath:componentStack:elementType) that provides precise context to the backend agent.

Injecting Communication Script: Adding an inline script to the final index.html to enable postMessage communication between the EditorPage and the preview iframe for the element selection feature.
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Setup**: Run `.specify/scripts/bash/setup-plan.sh --json` from repo root and parse JSON for FEATURE_SPEC, IMPL_PLAN, SPECS_DIR, BRANCH. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

2. **Load context**: Read FEATURE_SPEC and `.specify/memory/constitution.md`. Load IMPL_PLAN template (already copied).

3. **Execute plan workflow**: Follow the structure in IMPL_PLAN template to:
   - Fill Technical Context (mark unknowns as "NEEDS CLARIFICATION")
   - Fill Constitution Check section from constitution
   - Evaluate gates (ERROR if violations unjustified)
   - Phase 0: Generate research.md (resolve all NEEDS CLARIFICATION)
   - Phase 1: Generate data-model.md, contracts/, quickstart.md
   - Phase 1: Update agent context by running the agent script
   - Re-evaluate Constitution Check post-design

4. **Stop and report**: Command ends after Phase 2 planning. Report branch, IMPL_PLAN path, and generated artifacts.

## Phases

### Phase 0: Outline & Research

1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:

   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

### Phase 1: Design & Contracts

**Prerequisites:** `research.md` complete

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Agent context update**:
   - Run `.specify/scripts/bash/update-agent-context.sh q`
   - These scripts detect which AI agent is in use
   - Update the appropriate agent-specific context file
   - Add only new technology from current plan
   - Preserve manual additions between markers

**Output**: data-model.md, /contracts/\*, quickstart.md, agent-specific file

## Key rules

- Use absolute paths
- ERROR on gate failures or unresolved clarifications
