// Common types used across the monorepo
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
}

// Export additional common types
export * from './common.js';

// Export AI Landing Page Editor types
export * from './landing-page.js';
export * from './modification.js';
export * from './asset.js';
export * from './element.js';
export * from './errors.js';
export * from './ai-models.js';

// Re-export with explicit naming to avoid conflicts
export type { LandingPageVersion as PageVersion } from './version.js';
export type {
  ChatMessage,
  ChatMessageRequest,
  ChatStreamResponse,
} from './chat.js';
export type {
  ToolCall as AIToolCall,
  RequestAssetTool,
  ModifyElementTool,
} from './tool-call.js';
