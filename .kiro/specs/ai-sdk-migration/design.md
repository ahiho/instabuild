# Design Document

## Overview

This design outlines the migration from the current custom WebSocket-based chat implementation to the Vercel AI SDK's standardized patterns. The migration will replace custom chat logic with AI SDK's `useChat` hook, streaming utilities, and tool calling infrastructure while preserving the existing UI components that provide unique value.

The current system uses:

- Custom WebSocket connections for real-time chat
- Custom message state management in `useChat.ts`
- Custom streaming implementation
- AI Elements components for UI rendering

The new system will use:

- AI SDK's `useChat` hook for message management
- AI SDK's streaming protocols and transport
- AI SDK's tool calling patterns
- Preserved AI Elements components for UI consistency

## Architecture

### Current Architecture

```
Frontend:
├── Custom useChat hook (WebSocket-based)
├── ChatPanel component
├── AI Elements UI components
└── Custom message state management

Backend:
├── WebSocket routes (/api/v1/chat/ws)
├── REST chat routes (/api/v1/chat)
├── Custom streaming implementation
└── Database persistence
```

### Target Architecture

```
Frontend:
├── AI SDK useChat hook (@ai-sdk/react)
├── ChatPanel component (updated)
├── AI Elements UI components (preserved)
└── AI SDK message state management

Backend:
├── AI SDK compatible routes (/api/v1/chat)
├── AI SDK streaming protocols
├── Tool calling infrastructure
└── Database persistence (enhanced)
```

## Components and Interfaces

### Frontend Components

#### 1. Updated ChatPanel Component

- **Purpose**: Main chat interface using AI SDK patterns
- **Changes**:
  - Replace custom `useChat` with AI SDK's `useChat`
  - Update message handling to use AI SDK message format
  - Preserve existing UI components and styling
- **Dependencies**: `@ai-sdk/react`, existing AI Elements

#### 2. Message Rendering System

- **Purpose**: Render different message types using existing components
- **Components Preserved**:
  - `Message`, `MessageContent`, `MessageAvatar` - Core message display
  - `Response` - Markdown/text rendering with Streamdown
  - `CodeBlock` - Code syntax highlighting
  - `Tool` - Tool execution display
  - `Artifact` - Rich content artifacts
- **Integration**: Map AI SDK message parts to appropriate UI components

#### 3. Tool Calling Integration

- **Purpose**: Handle AI tool execution using AI SDK patterns
- **Implementation**:
  - Use AI SDK's tool calling infrastructure
  - Map tool states to existing Tool component states
  - Preserve existing tool UI components

#### 4. Conversation Management

- **Purpose**: Maintain conversation state and history
- **Components Preserved**:
  - `Conversation`, `ConversationContent` - Layout and scrolling
  - `ConversationEmptyState` - Empty state display
- **Integration**: Work with AI SDK's message persistence

### Backend Components

#### 1. AI SDK Compatible Chat Route

- **Purpose**: Handle chat requests using AI SDK protocols
- **Current**: `/api/v1/chat` (already partially compatible)
- **Enhancements**:
  - Full AI SDK message format support
  - Tool calling integration
  - Enhanced streaming response format

#### 2. Message Persistence Layer

- **Purpose**: Save and retrieve chat messages
- **Current**: Database models for conversations and messages
- **Enhancements**:
  - Support AI SDK message format with parts
  - Tool call result storage
  - Message metadata handling

#### 3. Tool Registry System

- **Purpose**: Register and execute AI tools
- **Implementation**:
  - Tool definition registry
  - Tool execution handlers
  - Result formatting for UI components

## Data Models

### AI SDK Message Format

```typescript
interface UIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: MessagePart[];
  metadata?: MessageMetadata;
}

interface MessagePart {
  type: 'text' | 'tool-call' | 'tool-result' | 'data';
  // Type-specific properties
}
```

### Tool Call Integration

```typescript
interface ToolCallPart {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  args: Record<string, any>;
  state:
    | 'input-streaming'
    | 'input-available'
    | 'output-available'
    | 'output-error';
  result?: any;
  errorText?: string;
}
```

### Database Schema Updates

```sql
-- Enhanced message storage for AI SDK compatibility
ALTER TABLE chat_messages ADD COLUMN parts JSONB;
ALTER TABLE chat_messages ADD COLUMN metadata JSONB;
ALTER TABLE chat_messages ADD COLUMN tool_calls JSONB;

-- Tool execution tracking
CREATE TABLE tool_executions (
  id UUID PRIMARY KEY,
  message_id UUID REFERENCES chat_messages(id),
  tool_name VARCHAR NOT NULL,
  tool_call_id VARCHAR NOT NULL,
  input JSONB,
  output JSONB,
  error_text TEXT,
  status VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Error Handling

### Frontend Error Handling

- **AI SDK Integration**: Use AI SDK's built-in error handling
- **Fallback Mechanisms**: Graceful degradation to existing error states
- **User Feedback**: Preserve existing error UI components

### Backend Error Handling

- **Streaming Errors**: Handle AI SDK streaming errors
- **Tool Execution Errors**: Capture and format tool errors
- **Database Errors**: Enhanced error logging and recovery

### Error Recovery

- **Connection Issues**: AI SDK's automatic retry mechanisms
- **Message Failures**: Message queuing and retry logic
- **Tool Failures**: Graceful tool error display

## Testing Strategy

### Unit Tests

- **Frontend**: Test AI SDK integration with existing components
- **Backend**: Test AI SDK route compatibility
- **Components**: Verify UI component compatibility with new message format

### Integration Tests

- **End-to-End**: Full chat flow with AI SDK
- **Tool Calling**: Tool execution and result display
- **Message Persistence**: Database integration with AI SDK format

### Migration Tests

- **Data Migration**: Verify existing message format conversion
- **Backward Compatibility**: Ensure existing conversations work
- **Performance**: Compare performance before and after migration

### Component Tests

- **Message Rendering**: Test all message part types with existing components
- **Tool Display**: Verify tool states render correctly
- **Streaming**: Test real-time message updates

## Migration Strategy

### Phase 1: Backend Preparation

1. Enhance chat route for full AI SDK compatibility
2. Update database schema for AI SDK message format
3. Implement tool registry system
4. Add message format conversion utilities

### Phase 2: Frontend Integration

1. Replace custom `useChat` with AI SDK version
2. Update ChatPanel to use AI SDK patterns
3. Implement message part mapping to UI components
4. Add tool calling integration

### Phase 3: Component Preservation

1. Ensure all existing AI Elements work with new format
2. Implement tool state mapping
3. Preserve all existing UI behaviors and styling
4. Add any missing component integrations

### Phase 4: Testing and Optimization

1. Comprehensive testing of all chat features
2. Performance optimization
3. Error handling verification
4. User experience validation

## Performance Considerations

### Streaming Optimization

- **AI SDK Streaming**: Leverage optimized streaming protocols
- **Message Batching**: Efficient message part handling
- **UI Updates**: Minimize re-renders during streaming

### Memory Management

- **Message History**: Efficient message storage and retrieval
- **Component Lifecycle**: Proper cleanup of AI SDK resources
- **Tool Results**: Efficient tool result caching

### Network Efficiency

- **Transport Optimization**: Use AI SDK's optimized transport
- **Compression**: Message compression for large responses
- **Caching**: Intelligent message and tool result caching

## Security Considerations

### Input Validation

- **Message Sanitization**: Validate all user inputs
- **Tool Parameter Validation**: Secure tool parameter handling
- **Content Filtering**: Maintain existing content safety measures

### Authentication & Authorization

- **Session Management**: Integrate with existing auth system
- **Conversation Access**: Secure conversation access controls
- **Tool Permissions**: Implement tool execution permissions

### Data Protection

- **Message Encryption**: Secure message storage
- **Tool Result Security**: Secure tool execution results
- **Privacy Compliance**: Maintain data privacy standards
