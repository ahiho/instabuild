import { logger } from '../lib/logger.js';

/**
 * Environment configuration with validation
 */
export interface EnvironmentConfig {
  // Database
  databaseUrl: string;

  // Storage (MinIO)
  minioEndpoint: string;
  minioAccessKey: string;
  minioSecretKey: string;

  // External services
  githubToken: string;
  vercelToken: string;

  // AI Provider
  openaiApiKey: string;

  // AI Model Configuration
  openaiStrongModel: string;
  openaiWeakModel: string;
  openaiFallbackModel: string;
  modelComplexityThreshold: number;
  modelResponseTimeout: number;

  // Server
  port: number;

  // Node environment
  nodeEnv: string;
}

/**
 * Validate required environment variable
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. Please check your .env file.`
    );
  }
  return value;
}

/**
 * Get optional environment variable with default
 */
function getEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Parse environment variable as number
 */
function parseEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    logger.warn(`Invalid number for ${key}, using default: ${defaultValue}`);
    return defaultValue;
  }
  return parsed;
}

/**
 * Validate OpenAI API key format
 */
function validateOpenAIKey(key: string): boolean {
  return key.startsWith('sk-') && key.length > 20;
}

/**
 * Load and validate environment configuration
 */
function loadEnvironmentConfig(): EnvironmentConfig {
  // Load required variables
  const openaiApiKey = requireEnv('OPENAI_API_KEY');

  // Validate OpenAI API key
  if (!validateOpenAIKey(openaiApiKey)) {
    logger.warn(
      'OpenAI API key format appears invalid. Expected format: sk-...'
    );
  }

  // Build configuration
  const config: EnvironmentConfig = {
    // Database
    databaseUrl: requireEnv('DATABASE_URL'),

    // Storage
    minioEndpoint: getEnv('MINIO_ENDPOINT', 'localhost:9000'),
    minioAccessKey: getEnv('MINIO_ACCESS_KEY', 'minioadmin'),
    minioSecretKey: getEnv('MINIO_SECRET_KEY', 'minioadmin'),

    // External services
    githubToken: getEnv('GITHUB_TOKEN', ''),
    vercelToken: getEnv('VERCEL_TOKEN', ''),

    // AI Provider
    openaiApiKey,

    // AI Model Configuration
    openaiStrongModel: getEnv('OPENAI_STRONG_MODEL', 'gpt-4'),
    openaiWeakModel: getEnv('OPENAI_WEAK_MODEL', 'gpt-4o-mini'),
    openaiFallbackModel: getEnv('OPENAI_FALLBACK_MODEL', 'gpt-3.5-turbo'),
    modelComplexityThreshold: parseEnvNumber('MODEL_COMPLEXITY_THRESHOLD', 0.7),
    modelResponseTimeout: parseEnvNumber('MODEL_RESPONSE_TIMEOUT', 30000),

    // Server
    port: parseEnvNumber('PORT', 3000),

    // Node environment
    nodeEnv: getEnv('NODE_ENV', 'development'),
  };

  // Log configuration (without sensitive values)
  logger.info('Environment configuration loaded', {
    nodeEnv: config.nodeEnv,
    port: config.port,
    openaiStrongModel: config.openaiStrongModel,
    openaiWeakModel: config.openaiWeakModel,
    modelComplexityThreshold: config.modelComplexityThreshold,
    hasOpenAIKey: !!config.openaiApiKey,
    hasGithubToken: !!config.githubToken,
    hasVercelToken: !!config.vercelToken,
  });

  return config;
}

// Export singleton configuration
export const env = loadEnvironmentConfig();

// Export helper to check if running in production
export const isProduction = () => env.nodeEnv === 'production';
export const isDevelopment = () => env.nodeEnv === 'development';
export const isTest = () => env.nodeEnv === 'test';
