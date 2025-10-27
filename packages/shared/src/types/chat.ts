export interface ChatMessage {
  id: string;
  landingPageId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  parts?: MessagePart[];
  toolCalls?: ToolCall[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface MessagePart {
  type: 'text' | 'tool-call' | 'tool-result' | 'data';
  text?: string;
  toolCallId?: string;
  toolName?: string;
  args?: Record<string, any>;
  result?: any;
  data?: any;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatMessageRequest {
  content: string;
  selectedElementId?: string;
}

export interface ChatStreamResponse {
  type: 'message' | 'tool_call' | 'error' | 'done';
  content?: string;
  toolCall?: ToolCall;
  error?: string;
}
export interface AISDKMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: MessagePart[];
  metadata?: Record<string, unknown>;
}

export interface ChatRequest {
  conversationId: string;
  messages: AISDKMessage[];
}

export interface ToolCallPart extends MessagePart {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  args: Record<string, any>;
  state?:
    | 'input-streaming'
    | 'input-available'
    | 'output-available'
    | 'output-error';
}

export interface ToolResultPart extends MessagePart {
  type: 'tool-result';
  toolCallId: string;
  result: any;
  errorText?: string;
}
