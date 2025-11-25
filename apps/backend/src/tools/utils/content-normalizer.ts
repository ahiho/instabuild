import { logger } from '../../lib/logger.js';

/**
 * Normalizes escape sequences in LLM-generated content.
 *
 * LLMs sometimes over-escape content when generating tool parameters,
 * producing literal "\n" instead of actual newlines. This function
 * corrects common escaping issues.
 *
 * Based on Google Gemini's editCorrector.ts implementation.
 *
 * @param content - Raw content from LLM
 * @param context - Optional context for logging (tool name, file path)
 * @returns Content with normalized escape sequences
 */
export function normalizeEscapeSequences(
  content: string,
  context?: { toolName?: string; filePath?: string }
): string {
  // Check cache first
  const cached = normalizationCache.get(content);
  if (cached !== undefined) {
    return cached;
  }

  // Regex explanation:
  // \\+ : Matches one or more backslash characters
  // (n|t|r|'|"|`|\\|\n) : Capturing group matching the escaped character
  // g : Global flag to replace all occurrences

  const normalized = content.replace(
    /\\+(n|t|r|'|"|`|\\|\n)/g,
    (match, capturedChar) => {
      switch (capturedChar) {
        case 'n':
          return '\n'; // newline
        case 't':
          return '\t'; // tab
        case 'r':
          return '\r'; // carriage return
        case "'":
          return "'"; // single quote
        case '"':
          return '"'; // double quote
        case '`':
          return '`'; // backtick
        case '\\':
          return '\\'; // backslash
        case '\n':
          return '\n'; // actual newline (handles \\\n)
        default:
          return match; // fallback
      }
    }
  );

  // Log if content was changed (for monitoring LLM behavior)
  if (normalized !== content) {
    logger.info('Content normalization applied', {
      toolName: context?.toolName,
      filePath: context?.filePath,
      originalLength: content.length,
      normalizedLength: normalized.length,
      changesMade: true,
    });
  }

  // Cache result
  normalizationCache.set(content, normalized);

  return normalized;
}

// LRU Cache for performance (avoid re-processing same content)
class LruCache<K, V> {
  private cache: Map<K, V>;

  constructor(private maxSize: number = 100) {
    this.cache = new Map();
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove oldest (first) entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

const normalizationCache = new LruCache<string, string>(100);
