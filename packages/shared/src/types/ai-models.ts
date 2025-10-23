export interface AIModelConfig {
  strongModel: string;
  weakModel: string;
  fallbackModel: string;
  complexityThreshold: number;
  responseTimeout: number;
}

export interface TaskComplexity {
  score: number;
  factors: string[];
}

export interface ModelSelectionResult {
  selectedModel: string;
  complexity: TaskComplexity;
  reasoning: string;
  timestamp: string;
}

export interface ModelUsageMetrics {
  modelName: string;
  requestCount: number;
  totalTokens: number;
  averageResponseTime: number;
  errorCount: number;
  lastUsed: string;
}

export type ModelType = 'strong' | 'weak' | 'fallback';

export interface ModelSelectionContext {
  message: string;
  selectedElementId?: string;
  previousMessages?: number;
  userIntent?: string;
  requiresToolCalling?: boolean;
}
