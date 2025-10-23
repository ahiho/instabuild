import { openai } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import type {
  AIModelConfig,
  ModelSelectionResult,
  ModelSelectionContext,
  ModelType,
} from '@instabuild/shared/types';
import {
  analyzeTaskComplexity,
  defaultConfig,
  validateConfig,
} from '../lib/ai-config.js';
import { logger } from '../lib/logger.js';

export class ModelSelectorService {
  private config: AIModelConfig;
  private metrics: Map<string, any> = new Map();

  constructor(config: AIModelConfig = defaultConfig) {
    const errors = validateConfig(config);
    if (errors.length > 0) {
      throw new Error(`Invalid AI model configuration: ${errors.join(', ')}`);
    }
    this.config = config;
    logger.info('Model selector initialized', { config: this.config });
  }

  selectModel(context: ModelSelectionContext): ModelSelectionResult {
    const complexity = analyzeTaskComplexity(context.message, context);

    let selectedModel: string;
    let modelType: ModelType;
    let reasoning: string;

    if (complexity.score >= this.config.complexityThreshold) {
      selectedModel = this.config.strongModel;
      modelType = 'strong';
      reasoning = `High complexity (${complexity.score.toFixed(2)}) requires strong model. Factors: ${complexity.factors.join(', ')}`;
    } else {
      selectedModel = this.config.weakModel;
      modelType = 'weak';
      reasoning = `Low complexity (${complexity.score.toFixed(2)}) can use weak model. Factors: ${complexity.factors.join(', ')}`;
    }

    // Override for tool calling requirements
    if (context.requiresToolCalling) {
      selectedModel = this.config.strongModel;
      modelType = 'strong';
      reasoning += ' | Tool calling requires strong model';
    }

    const result: ModelSelectionResult = {
      selectedModel,
      complexity,
      reasoning,
      timestamp: new Date().toISOString(),
    };

    // Log model selection
    logger.info('Model selected', {
      selectedModel,
      modelType,
      complexity: complexity.score,
      factors: complexity.factors,
      reasoning,
      message: context.message.substring(0, 100), // First 100 chars for privacy
    });

    this.recordUsage(selectedModel, modelType);
    return result;
  }

  getModel(context: ModelSelectionContext): {
    model: LanguageModel;
    selection: ModelSelectionResult;
  } {
    const selection = this.selectModel(context);
    return {
      model: openai(selection.selectedModel),
      selection,
    };
  }

  getFallbackModel(): LanguageModel {
    logger.warn('Using fallback model', { model: this.config.fallbackModel });
    return openai(this.config.fallbackModel);
  }

  private recordUsage(modelName: string, modelType: ModelType) {
    const key = `${modelName}-${modelType}`;
    const current = this.metrics.get(key) || {
      modelName,
      requestCount: 0,
      totalTokens: 0,
      averageResponseTime: 0,
      errorCount: 0,
      lastUsed: new Date().toISOString(),
    };

    current.requestCount++;
    current.lastUsed = new Date().toISOString();
    this.metrics.set(key, current);
  }

  getMetrics() {
    return Array.from(this.metrics.values());
  }

  updateConfig(newConfig: Partial<AIModelConfig>) {
    const updatedConfig = { ...this.config, ...newConfig };
    const errors = validateConfig(updatedConfig);
    if (errors.length > 0) {
      throw new Error(`Invalid configuration update: ${errors.join(', ')}`);
    }
    this.config = updatedConfig;
    logger.info('Model configuration updated', { newConfig });
  }
}

export const modelSelector = new ModelSelectorService();
