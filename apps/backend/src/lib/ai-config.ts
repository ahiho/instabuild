import { openai } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

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

export const defaultConfig: AIModelConfig = {
  strongModel: process.env.OPENAI_STRONG_MODEL || 'gpt-4',
  weakModel: process.env.OPENAI_WEAK_MODEL || 'gpt-4o-mini',
  fallbackModel: process.env.OPENAI_FALLBACK_MODEL || 'gpt-3.5-turbo',
  complexityThreshold: parseFloat(
    process.env.MODEL_COMPLEXITY_THRESHOLD || '0.7'
  ),
  responseTimeout: parseInt(process.env.MODEL_RESPONSE_TIMEOUT || '30000'),
};

export function analyzeTaskComplexity(
  message: string,
  context?: any
): TaskComplexity {
  const factors: string[] = [];
  let score = 0;

  // Simple text changes (low complexity)
  if (/change.*text|update.*text|modify.*text/i.test(message)) {
    score += 0.2;
    factors.push('text-change');
  }

  // Color/style changes (low complexity)
  if (/color|background|font|size|style/i.test(message)) {
    score += 0.3;
    factors.push('styling');
  }

  // Layout restructuring (high complexity)
  if (/layout|structure|reorganize|rearrange|grid|flex/i.test(message)) {
    score += 0.8;
    factors.push('layout-change');
  }

  // Component generation (high complexity)
  if (/create.*component|add.*section|generate.*form/i.test(message)) {
    score += 0.9;
    factors.push('component-generation');
  }

  // Tool calling requirements (high complexity)
  if (/upload|file|image|logo|asset/i.test(message)) {
    score += 0.8;
    factors.push('tool-calling');
  }

  // Element selection context (low complexity)
  if (context?.selectedElementId) {
    score += 0.1;
    factors.push('element-context');
  }

  // Multiple elements (medium complexity)
  if (/all.*buttons|every.*text|multiple.*elements/i.test(message)) {
    score += 0.6;
    factors.push('multiple-elements');
  }

  return { score: Math.min(score, 1.0), factors };
}

export function selectModel(
  complexity: TaskComplexity,
  config = defaultConfig
): LanguageModel {
  if (complexity.score >= config.complexityThreshold) {
    return openai(config.strongModel);
  }
  return openai(config.weakModel);
}

export function validateConfig(config: AIModelConfig): string[] {
  const errors: string[] = [];

  if (!config.strongModel) errors.push('Strong model not configured');
  if (!config.weakModel) errors.push('Weak model not configured');
  if (!config.fallbackModel) errors.push('Fallback model not configured');
  if (config.complexityThreshold < 0 || config.complexityThreshold > 1) {
    errors.push('Complexity threshold must be between 0 and 1');
  }
  if (config.responseTimeout < 1000) {
    errors.push('Response timeout must be at least 1000ms');
  }

  return errors;
}
