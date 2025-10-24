# Quickstart: Refactor Chat to WebSockets

This document provides a quick guide to setting up and interacting with the new WebSocket-based chat feature.

## Backend Setup

1.  **Install Dependencies**: Ensure all backend dependencies, including `@fastify/websocket`, are installed.
2.  **Environment Variables**: Verify that `OPENAI_API_KEY` (or equivalent AI provider API key) is configured in your environment variables.
3.  **Start Backend**: Launch the backend server as usual.

## Frontend Usage

1.  **Access Chat Interface**: Navigate to the chat page in the frontend application.
2.  **Send Message**: Type a message in the input field and send it.
3.  **Observe Real-time Response**: The AI's response should stream in real-time via the WebSocket connection.

## API Endpoint

- **WebSocket Endpoint**: `ws://localhost:[PORT]/api/v1/chat/ws` (replace `[PORT]` with your backend port)

## Example WebSocket Message Structure

### Client to Server (User Message)

```json
{
  "type": "userMessage",
  "conversationId": "<UUID_OF_CONVERSATION>",
  "content": "Hello AI!"
}
```

### Server to Client (AI Response Chunk)

```json
{
  "type": "aiResponseChunk",
  "conversationId": "<UUID_OF_CONVERSATION>",
  "content": "This is a streaming AI response...",
  "isLastChunk": false
}
```
