# Feature Specification: Refactor Chat to WebSockets

**Feature Branch**: `001-refactor-chat-websockets`
**Created**: Friday, October 24, 2025
**Status**: Draft
**Input**: User description: "Refactor the chat feature to use WebSockets for real-time communication, as the current HTTP streaming implementation is broken and incomplete. Functional & Technical Requirements: 1. **Backend Refactor (WebSocket Server):** * Integrate a WebSocket library (e.g., `fastify-websocket`) into the Fastify server. * Create a new WebSocket endpoint: `/api/v1/chat/ws`. * Move the core AI response logic (currently in `apps/backend/src/services/chat.ts`) into the new WebSocket connection handler. * The handler must listen for incoming messages from the client's WebSocket. 2. **Fix AI Service Connection (Critical):** * Inside the new WebSocket handler, ensure the AI model is called correctly. * The system **must** be configured to load the AI provider's API key from an environment variable (e.g., `OPENAI_API_KEY`). * Verify that the `modelSelector.getModel()` service is correctly configured and returns a valid, working model instance. 3. **Backend Streaming (WebSocket):** * When the AI call is successful, the backend must stream the response (text chunks) back to the client over the **same WebSocket connection**. * Messages from the user **must still be saved to the database** as they are received. 4. **Frontend Refactor (WebSocket Client):** * Update the frontend's `useChat` hook (from the Vercel AI SDK) to connect to the new `/api/v1/chat/ws` endpoint instead of the old HTTP endpoint."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Real-time Chat Communication (Priority: P1)

Users can engage in real-time conversations with the AI, sending messages and receiving streaming responses instantly via a WebSocket connection.

**Why this priority**: This is the core functionality of the chat feature and directly addresses the current broken and incomplete HTTP streaming implementation. It provides immediate value to the user.

**Independent Test**: The user can send a message in the chat interface and observe a streaming AI response appearing in real-time.

**Acceptance Scenarios**:

1. **Given** a user is on the chat page and a real-time communication channel is established, **When** the user sends a message, **Then** the message is displayed instantly in the chat interface and a streaming AI response begins to appear.
2. **Given** a user is receiving a streaming AI response, **When** the AI response is complete, **Then** the full AI response is displayed in the chat interface.

---

### Edge Cases

- What happens if the real-time communication channel drops during an active chat session?
- How does the system handle large AI responses that might exceed typical message size limits?
- What if the AI service becomes temporarily unavailable or returns an error during a conversation?
- How does the system ensure message order and integrity over the real-time communication channel?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The backend MUST establish a real-time communication channel for chat.
- **FR-002**: The backend MUST expose a dedicated endpoint for real-time chat communication.
- **FR-003**: The backend MUST process AI responses within the real-time communication handler.
- **FR-004**: The real-time communication handler MUST receive and process incoming messages from the client.
- **FR-005**: The real-time communication handler MUST invoke the AI model with user input.
- **FR-006**: The system MUST securely manage and access credentials for the AI provider.
- **FR-007**: The AI model selection mechanism MUST provide a functional AI model instance.
- **FR-008**: Upon successful AI model invocation, the backend MUST stream the AI's response in chunks back to the client over the established real-time channel.
- **FR-009**: All user messages MUST be persistently stored in the database upon receipt.
- **FR-010**: The frontend chat interface MUST connect to the new real-time communication endpoint for chat interactions.

### Key Entities *(include if feature involves data)*

- **Chat Message**: Represents a single message in the chat conversation, including user input and AI responses.
  - Key Attributes: `id`, `conversationId`, `senderType` (User/AI), `content`, `timestamp`.
- **Conversation**: Represents a continuous chat session between a user and the AI.
  - Key Attributes: `id`, `userId`, `startTime`, `lastUpdateTime`.

## Dependencies and Assumptions

- **Dependencies**:
  - Existing Fastify server infrastructure.
  - Existing AI model selection and invocation services.
  - Existing database for message persistence.
  - Frontend chat UI components.
- **Assumptions**:
  - A suitable real-time communication library can be integrated with the backend server.
  - The AI provider's API is stable and performs within expected latency limits.
  - Environment variables for API keys are securely managed and accessible.
  - The existing database schema can accommodate new chat message and conversation data without significant refactoring.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 99% of user messages receive a first AI response chunk within 1 second over the real-time communication channel.
- **SC-002**: The average end-to-end latency for a complete AI response (from user message sent to full AI response received) is under 3 seconds.
- **SC-003**: The real-time chat system can support 100 concurrent active users with no more than 5% message loss or connection drops.
- **SC-004**: All user-generated chat messages are successfully persisted in the database within 500ms of being sent.
- **SC-005**: User satisfaction with the real-time chat experience, as measured by in-app feedback, increases by 15%.
