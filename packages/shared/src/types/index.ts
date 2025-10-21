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
