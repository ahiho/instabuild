import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import type { LanguageModel } from 'ai';
import { globalLoggingFetch } from './openai-logging-fetch.js';

export interface AIModelConfig {
  strongModel: string;
  weakModel: string;
  fallbackModel: string;
  complexityThreshold: number;
  responseTimeout: number;
  useHybridClassification?: boolean; // Enable LLM-based classification for ambiguous cases
}

export interface TaskComplexity {
  score: number;
  factors: string[];
  classificationMethod?: 'regex' | 'llm-weak' | 'hybrid';
}

// Simple in-memory cache for LLM classifications (TTL: 1 hour)
const classificationCache = new Map<
  string,
  { complexity: TaskComplexity; timestamp: number }
>();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

export const defaultConfig: AIModelConfig = {
  strongModel: process.env.OPENAI_STRONG_MODEL || 'gpt-4',
  weakModel: process.env.OPENAI_WEAK_MODEL || 'gpt-4o-mini',
  fallbackModel: process.env.OPENAI_FALLBACK_MODEL || 'gpt-3.5-turbo',
  complexityThreshold: parseFloat(
    process.env.MODEL_COMPLEXITY_THRESHOLD || '0.7'
  ),
  responseTimeout: parseInt(process.env.MODEL_RESPONSE_TIMEOUT || '30000'),
  useHybridClassification: process.env.USE_HYBRID_CLASSIFICATION === 'true',
};

/**
 * OpenAI client with logging enabled for debugging
 * Logs all raw HTTP requests and responses to logs/tool-loop-debug.log
 */
export const openaiWithLogging = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // Use custom fetch that logs all requests/responses
  fetch: globalLoggingFetch,
});

/**
 * Use weak LLM to classify task complexity for ambiguous cases
 * This is cheap (~$0.0001) and fast (~200-500ms)
 */
async function classifyWithLLM(
  message: string,
  config: AIModelConfig
): Promise<TaskComplexity> {
  try {
    const { text } = await generateText({
      model: openaiWithLogging(config.weakModel),
      prompt: `Classify this task's complexity level:

Task: "${message}"

Complexity Levels:
- SIMPLE (0.2): Simple text changes, single color updates, basic property modifications
- MEDIUM (0.5): Layout adjustments, basic styling, simple edits
- HIGH (0.9): Component creation, bug fixing, theme updates, refactoring
- VERY_HIGH (1.0): Planning, custom components, landing pages, architecture changes

STRONG MODEL REQUIRED (score 0.9+):
- Planning/strategy tasks
- Bug fixing and debugging
- Theme/color system updates (not single color changes)
- Creating new/custom components
- Landing page creation
- Refactoring/rebuilding

WEAK MODEL OK (score <0.7):
- Simple text changes
- Single color changes (not theme)
- Basic styling (font, size, spacing)
- Minor tweaks

Respond with ONLY the complexity level (SIMPLE, MEDIUM, HIGH, or VERY_HIGH) and a 2-3 word reason.
Format: LEVEL: reason
Example: HIGH: custom component creation`,
      maxOutputTokens: 20,
      temperature: 0, // Deterministic
    });

    // Parse response
    const response = text.trim().toUpperCase();
    let score = 0.5; // Default to medium
    const factors = ['llm-classified'];

    if (response.includes('VERY_HIGH') || response.includes('VERY HIGH')) {
      score = 1.0;
      factors.push('llm-very-high');
    } else if (response.includes('HIGH')) {
      score = 0.9;
      factors.push('llm-high');
    } else if (response.includes('MEDIUM')) {
      score = 0.5;
      factors.push('llm-medium');
    } else if (response.includes('SIMPLE') || response.includes('LOW')) {
      score = 0.2;
      factors.push('llm-simple');
    }

    // Extract reason if provided
    const reasonMatch = response.match(/:\s*(.+)$/);
    if (reasonMatch) {
      factors.push(reasonMatch[1].toLowerCase().trim());
    }

    return { score, factors, classificationMethod: 'llm-weak' };
  } catch (error) {
    // Fallback to regex if LLM fails
    console.error('LLM classification failed, falling back to regex:', error);
    return {
      score: 0.5,
      factors: ['llm-fallback-error'],
      classificationMethod: 'regex',
    };
  }
}

/**
 * Analyze task complexity using regex patterns (synchronous, fast)
 * This is the fast path for obvious cases
 */
function analyzeTaskComplexityRegex(
  message: string,
  context?: any
): TaskComplexity {
  const factors: string[] = [];
  let score = 0;

  // ===== STRONG MODEL REQUIRED TASKS (High Priority Patterns) =====

  // Planning tasks (VERY high complexity - requires strong reasoning)
  if (
    /plan|planning|strategy|approach|how to|steps to|roadmap/i.test(message)
  ) {
    score = Math.max(score, 0.95);
    factors.push('planning-task');
  }

  // Bug fixing (HIGH complexity - requires debugging and analysis)
  if (/fix.*bug|debug|error|issue|problem|not working|broken/i.test(message)) {
    score = Math.max(score, 0.9);
    factors.push('bug-fixing');
  }

  // Theme/color system changes (HIGH complexity - affects entire design system)
  if (
    /theme|color scheme|palette|design system|rebrand|color.*(theme|system)|update.*(theme|colors)/i.test(
      message
    )
  ) {
    score = Math.max(score, 0.9);
    factors.push('theme-update');
  }

  // Custom component creation (VERY high complexity - requires architecture)
  if (
    /custom.*component|new.*component|build.*component|component from scratch/i.test(
      message
    )
  ) {
    score = Math.max(score, 0.95);
    factors.push('custom-component');
  }

  // Component generation (high complexity)
  if (/create.*component|add.*component|generate.*component/i.test(message)) {
    score = Math.max(score, 0.9);
    factors.push('component-generation');
  }

  // Landing page/full page creation (VERY high complexity)
  if (
    /landing page|create.*(page|site|website|app)|build.*(page|site|website)/i.test(
      message
    )
  ) {
    score = Math.max(score, 1.0);
    factors.push('landing-page-creation');
  }

  // Refactoring/rebuilding (high complexity)
  if (/refactor|rebuild|restructure|rewrite|migrate/i.test(message)) {
    score = Math.max(score, 0.9);
    factors.push('refactoring');
  }

  // ===== MEDIUM COMPLEXITY TASKS =====

  // Layout restructuring (high complexity)
  if (/layout|structure|reorganize|rearrange|grid|flex/i.test(message)) {
    score = Math.max(score, 0.8);
    factors.push('layout-change');
  }

  // Tool calling requirements (high complexity)
  if (/upload|file|image|logo|asset/i.test(message)) {
    score = Math.max(score, 0.8);
    factors.push('tool-calling');
  }

  // Multiple sections/features (high complexity)
  if (
    /multiple.*(sections?|components?|features?)|several.*(sections?|components?|features?)/i.test(
      message
    )
  ) {
    score = Math.max(score, 0.8);
    factors.push('multiple-features');
  }

  // Full implementation keywords (high complexity)
  if (/implement|integrate|complete|full|entire/i.test(message)) {
    score = Math.max(score, 0.7);
    factors.push('full-implementation');
  }

  // Multiple elements (medium complexity)
  if (/all.*buttons|every.*text|multiple.*elements/i.test(message)) {
    score = Math.max(score, 0.6);
    factors.push('multiple-elements');
  }

  // ===== LOW COMPLEXITY TASKS (Weak Model OK) =====

  // Simple color changes (LOW complexity - single property update)
  // Only if NOT a theme/color system change (checked above)
  if (
    /change.*color|update.*color|modify.*color/i.test(message) &&
    !/theme|scheme|palette|system/i.test(message)
  ) {
    score = Math.max(score, 0.3);
    factors.push('simple-color-change');
  }

  // Simple text changes (low complexity)
  if (/change.*text|update.*text|modify.*text/i.test(message)) {
    score = Math.max(score, 0.2);
    factors.push('text-change');
  }

  // Basic styling (low complexity) - if not part of theme system
  if (
    /font|size|padding|margin|spacing/i.test(message) &&
    !/theme|system/i.test(message)
  ) {
    score = Math.max(score, 0.3);
    factors.push('styling');
  }

  // Element selection context (low complexity)
  if (context?.selectedElementId) {
    score = Math.max(score, 0.1);
    factors.push('element-context');
  }

  return {
    score: Math.min(score, 1.0),
    factors,
    classificationMethod: 'regex',
  };
}

/**
 * Hybrid approach: Use regex for obvious cases, LLM for ambiguous ones
 * @param message - The task message to analyze
 * @param context - Optional context (selected elements, etc.)
 * @param config - Model configuration
 * @returns TaskComplexity with score and factors
 */
export async function analyzeTaskComplexity(
  message: string,
  context?: any,
  config: AIModelConfig = defaultConfig
): Promise<TaskComplexity> {
  // Check cache first
  const cacheKey = `${message}-${JSON.stringify(context || {})}`;
  const cached = classificationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return {
      ...cached.complexity,
      factors: [...cached.complexity.factors, 'cached'],
    };
  }

  // Fast path: Use regex first
  const regexResult = analyzeTaskComplexityRegex(message, context);
  console.log('[Task Complexity] Regex result:', regexResult);

  // If hybrid classification is disabled, or score is clearly high/low, use regex result
  if (!config.useHybridClassification) {
    classificationCache.set(cacheKey, {
      complexity: regexResult,
      timestamp: Date.now(),
    });
    return regexResult;
  }

  // HYBRID LOGIC: Use LLM for ambiguous cases (score 0.4-0.6 or score 0)
  const isAmbiguous =
    (regexResult.score >= 0.4 && regexResult.score <= 0.6) ||
    regexResult.score === 0;

  if (isAmbiguous) {
    // Use weak LLM to classify (cheap & fast)
    const llmResult = await classifyWithLLM(message, config);
    const hybridResult = {
      ...llmResult,
      factors: [
        ...regexResult.factors,
        ...llmResult.factors,
        'hybrid-classified',
      ],
      classificationMethod: 'hybrid' as const,
    };
    console.log('[Task Complexity] Hybrid result:', hybridResult);
    classificationCache.set(cacheKey, {
      complexity: hybridResult,
      timestamp: Date.now(),
    });
    return hybridResult;
  }

  // Clear case: use regex result (fast path)
  classificationCache.set(cacheKey, {
    complexity: regexResult,
    timestamp: Date.now(),
  });
  return regexResult;
}

/**
 * Synchronous version for backward compatibility
 * Use this when you can't use async/await
 */
export function analyzeTaskComplexitySync(
  message: string,
  context?: any
): TaskComplexity {
  return analyzeTaskComplexityRegex(message, context);
}

export function selectModel(
  complexity: TaskComplexity,
  config = defaultConfig
): LanguageModel {
  if (complexity.score >= config.complexityThreshold) {
    return openaiWithLogging(config.strongModel);
  }
  return openaiWithLogging(config.weakModel);
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
