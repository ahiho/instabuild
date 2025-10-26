# Tasks: Refactor Chat to WebSockets

**Feature Branch**: `001-refactor-chat-websockets` | **Date**: Friday, October 24, 2025 | **Spec**: ./spec.md

## Summary

This document outlines the tasks required to refactor the chat feature to use WebSockets for real-time communication. Tasks are organized into phases, with a primary focus on enabling real-time chat interactions between users and the AI.

## Implementation Strategy

This feature will be delivered incrementally, prioritizing the core real-time chat communication (User Story 1) as the Minimum Viable Product (MVP). Subsequent phases will focus on polish and cross-cutting concerns.

## Phase 1: Setup

- [X] T001 Install `@fastify/websocket` and `@types/ws` in `apps/backend/package.json`
- [X] T002 Configure Fastify to register the `@fastify/websocket` plugin in `apps/backend/src/server.ts`

## Phase 2: Foundational

- [X] T003 Define `ChatMessage` and `Conversation` Prisma models in `apps/backend/prisma/schema.prisma`
- [X] T004 Implement a service for persisting `ChatMessage` and `Conversation` data in `apps/backend/src/services/chatPersistence.ts`
- [X] T005 Ensure AI model selection and invocation services are accessible within the backend `apps/backend/src/services/aiModel.ts`
- [X] T006 Implement secure management and access of AI provider credentials (e.g., environment variables) in `apps/backend/src/config/env.ts`

## Phase 3: User Story 1 - Real-time Chat Communication [US1]

**Goal**: Users can engage in real-time conversations with the AI, sending messages and receiving streaming responses instantly via a WebSocket connection.

**Independent Test**: The user can send a message in the chat interface and observe a streaming AI response appearing in real-time.

### Backend Implementation

- [X] T007 [P] [US1] Create WebSocket endpoint `/api/v1/chat/ws` in `apps/backend/src/routes/websocket.ts`
- [X] T008 [US1] Implement WebSocket handler to receive `UserMessage` from client in `apps/backend/src/routes/websocket.ts`
- [X] T009 [US1] Integrate AI model invocation with user input within the WebSocket handler in `apps/backend/src/routes/websocket.ts`
- [X] T010 [US1] Stream `AIResponseChunk` back to the client over the WebSocket connection in `apps/backend/src/routes/websocket.ts`
- [X] T011 [US1] Save `UserMessage` to the database using `chatPersistence.ts` in `apps/backend/src/routes/websocket.ts`

### Frontend Implementation

- [X] T012 [P] [US1] Update `useChat` hook to establish WebSocket connection to `/api/v1/chat/ws` in `apps/frontend/src/hooks/useChat.ts`
- [X] T013 [US1] Implement sending user messages over WebSocket in `apps/frontend/src/hooks/useChat.ts`
- [X] T014 [US1] Implement handling and displaying streaming `AIResponseChunk` from WebSocket in `apps/frontend/src/hooks/useChat.ts`

## Phase 4: Polish & Cross-Cutting Concerns

- [X] T015 Implement robust error handling for WebSocket connections (backend and frontend) in `apps/backend/src/routes/websocket.ts` and `apps/frontend/src/hooks/useChat.ts`
- [X] T016 Implement WebSocket reconnection logic for improved user experience in `apps/frontend/src/hooks/useChat.ts`
- [X] T017 Add comprehensive logging for chat events and WebSocket activity in `apps/backend/src/lib/logger.ts`
- [X] T018 Write unit and integration tests for backend WebSocket logic in `apps/backend/src/__tests__/websocket.test.ts`
- [X] T019 Write integration tests for frontend WebSocket integration in `apps/frontend/src/__tests__/useChat.test.ts`

## Dependency Graph (User Story Completion Order)

- Phase 1 (Setup) -> Phase 2 (Foundational) -> Phase 3 (User Story 1) -> Phase 4 (Polish)

## Parallel Execution Examples

- **During User Story 1**: Tasks T007 (Backend WebSocket endpoint) and T012 (Frontend `useChat` update) can be worked on in parallel once foundational tasks are complete.

## Suggested MVP Scope

- Completion of all tasks in Phase 1 (Setup), Phase 2 (Foundational), and Phase 3 (User Story 1).
