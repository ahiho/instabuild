export interface ModelConfiguration {
  strongModel: string;
  weakModel: string;
  fallbackModel: string;
  complexityThreshold: number;
  responseTimeout: number;
  maxRetries: number;
}

export const modelConfig: ModelConfiguration = {
  strongModel: process.env.OPENAI_STRONG_MODEL || 'gpt-4',
  weakModel: process.env.OPENAI_WEAK_MODEL || 'gpt-4o-mini',
  fallbackModel: process.env.OPENAI_FALLBACK_MODEL || 'gpt-4o-mini',
  complexityThreshold: parseFloat(
    process.env.MODEL_COMPLEXITY_THRESHOLD || '0.7'
  ),
  responseTimeout: parseInt(process.env.MODEL_RESPONSE_TIMEOUT || '30000'),
  maxRetries: parseInt(process.env.MODEL_MAX_RETRIES || '3'),
};

export const validateModelConfig = (): void => {
  const required = ['OPENAI_API_KEY'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  if (
    modelConfig.complexityThreshold < 0 ||
    modelConfig.complexityThreshold > 1
  ) {
    throw new Error('MODEL_COMPLEXITY_THRESHOLD must be between 0 and 1');
  }

  if (modelConfig.responseTimeout < 1000) {
    throw new Error('MODEL_RESPONSE_TIMEOUT must be at least 1000ms');
  }
};
