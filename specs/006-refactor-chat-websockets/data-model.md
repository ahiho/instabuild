# Data Model: Refactor Chat to WebSockets

## Entities

### Chat Message

Represents a single message within a chat conversation, originating from either a user or the AI.

- **id**: Unique identifier for the message (e.g., UUID).
- **conversationId**: Identifier linking the message to a specific conversation.
- **senderType**: Indicates the origin of the message (e.g., `User`, `AI`).
- **content**: The textual content of the message.
- **timestamp**: The time and date when the message was created.

### Conversation

Represents a continuous chat session between a user and the AI.

- **id**: Unique identifier for the conversation (e.g., UUID).
- **userId**: Identifier of the user participating in the conversation.
- **startTime**: The time and date when the conversation began.
- **lastUpdateTime**: The time and date of the most recent activity in the conversation.
