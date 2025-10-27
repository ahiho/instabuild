import { logger } from '../lib/logger.js';

/**
 * Tool categories for safety constraint grouping
 */
export enum ToolCategory {
  FILE_SYSTEM = 'file_system',
  LANDING_PAGE = 'landing_page',
  UPLOAD = 'upload',
  UTILITY = 'utility',
  EXTERNAL_API = 'external_api',
  ANALYTICS = 'analytics',
}

/**
 * Operation types for safety validation
 */
export enum OperationType {
  READ = 'read',
  WRITE = 'write',
  EXECUTE = 'execute',
  DELETE = 'delete',
  ADMIN = 'admin',
}

/**
 * Safety constraint definition
 */
export interface SafetyConstraint {
  toolCategory: ToolCategory;
  toolName?: string; // Specific tool name, or undefined for category-wide
  operationType: OperationType;
  resourcePattern?: string; // e.g., 'files:src/**', 'pages:*'
  validationRules: ValidationRule[];
  enabled: boolean;
}

/**
 * Validation rule for safety constraints
 */
export interface ValidationRule {
  type:
    | 'path_validation'
    | 'size_limit'
    | 'rate_limit'
    | 'content_filter'
    | 'custom';
  parameters: Record<string, any>;
  errorMessage?: string;
}

/**
 * Execution context for safety validation
 */
export interface ExecutionContext {
  userId: string;
  conversationId: string;
  toolCallId: string;
  resourcePath?: string;
  inputData?: any;
}

/**
 * Safety validation result
 */
export interface SafetyResult {
  allowed: boolean;
  reason?: string;
  violatedConstraints?: string[];
  suggestions?: string[];
}

/**
 * Security System for internal safety constraints on tool execution
 */
export class SecuritySystem {
  private constraints: SafetyConstraint[] = [];
  private executionContextCache = new Map<string, ExecutionContext>();
  private rateLimitTracker = new Map<
    string,
    { count: number; resetTime: number }
  >();

  constructor() {
    this.initializeDefaultConstraints();
  }

  /**
   * Initialize default safety constraints
   */
  private initializeDefaultConstraints(): void {
    // File system safety constraints
    this.addConstraint({
      toolCategory: ToolCategory.FILE_SYSTEM,
      operationType: OperationType.READ,
      validationRules: [
        {
          type: 'path_validation',
          parameters: { allowedPaths: ['src/**', 'docs/**', 'public/**'] },
          errorMessage: 'File access restricted to allowed directories',
        },
      ],
      enabled: true,
    });

    this.addConstraint({
      toolCategory: ToolCategory.FILE_SYSTEM,
      operationType: OperationType.WRITE,
      validationRules: [
        {
          type: 'path_validation',
          parameters: {
            allowedPaths: ['src/**', 'docs/**'],
            blockedPaths: ['node_modules/**', '.git/**'],
          },
          errorMessage: 'File write restricted to safe directories',
        },
        {
          type: 'size_limit',
          parameters: { maxSizeBytes: 1048576 }, // 1MB
          errorMessage: 'File size exceeds maximum allowed limit',
        },
      ],
      enabled: true,
    });

    this.addConstraint({
      toolCategory: ToolCategory.FILE_SYSTEM,
      operationType: OperationType.DELETE,
      validationRules: [
        {
          type: 'path_validation',
          parameters: {
            allowedPaths: ['src/**', 'docs/**'],
            blockedPaths: ['src/core/**', 'package.json', 'package-lock.json'],
          },
          errorMessage:
            'File deletion restricted to safe directories and files',
        },
      ],
      enabled: true,
    });

    // Upload safety constraints
    this.addConstraint({
      toolCategory: ToolCategory.UPLOAD,
      operationType: OperationType.EXECUTE,
      validationRules: [
        {
          type: 'size_limit',
          parameters: { maxSizeBytes: 10485760 }, // 10MB
          errorMessage: 'Upload size exceeds maximum allowed limit',
        },
        {
          type: 'content_filter',
          parameters: {
            allowedTypes: [
              'image/jpeg',
              'image/png',
              'image/gif',
              'image/webp',
              'text/plain',
              'application/json',
            ],
          },
          errorMessage: 'File type not allowed for upload',
        },
      ],
      enabled: true,
    });

    // Rate limiting for all operations
    this.addConstraint({
      toolCategory: ToolCategory.FILE_SYSTEM,
      operationType: OperationType.EXECUTE,
      validationRules: [
        {
          type: 'rate_limit',
          parameters: { maxRequestsPerMinute: 60 },
          errorMessage: 'Rate limit exceeded for file operations',
        },
      ],
      enabled: true,
    });

    logger.info('Default safety constraints initialized', {
      constraintCount: this.constraints.length,
    });
  }

  /**
   * Add a safety constraint
   */
  addConstraint(constraint: SafetyConstraint): void {
    this.constraints.push(constraint);
    logger.debug('Safety constraint added', { constraint });
  }

  /**
   * Remove safety constraints matching criteria
   */
  removeConstraints(criteria: Partial<SafetyConstraint>): number {
    const initialCount = this.constraints.length;
    this.constraints = this.constraints.filter(
      constraint => !this.matchesConstraint(constraint, criteria)
    );
    const removedCount = initialCount - this.constraints.length;

    logger.debug('Safety constraints removed', { removedCount, criteria });
    return removedCount;
  }

  /**
   * Validate if a tool operation is safe to execute
   */
  validateToolSafety(
    toolName: string,
    toolCategory: ToolCategory,
    operationType: OperationType,
    context: ExecutionContext
  ): SafetyResult {
    try {
      // Check for specific tool constraints first
      const specificConstraints = this.constraints.filter(
        constraint =>
          constraint.toolName === toolName &&
          constraint.operationType === operationType &&
          constraint.enabled
      );

      if (specificConstraints.length > 0) {
        const result = this.evaluateConstraints(specificConstraints, context);
        if (!result.allowed) {
          return result;
        }
      }

      // Check category-wide constraints
      const categoryConstraints = this.constraints.filter(
        constraint =>
          constraint.toolCategory === toolCategory &&
          constraint.operationType === operationType &&
          !constraint.toolName &&
          constraint.enabled
      );

      const result = this.evaluateConstraints(categoryConstraints, context);

      logger.debug('Tool safety validation', {
        toolName,
        toolCategory,
        operationType,
        userId: context.userId,
        allowed: result.allowed,
        reason: result.reason,
      });

      return result;
    } catch (error) {
      logger.error('Error validating tool safety', {
        toolName,
        toolCategory,
        operationType,
        userId: context.userId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        allowed: false,
        reason: 'Safety validation error',
      };
    }
  }

  /**
   * Evaluate a set of safety constraints
   */
  private evaluateConstraints(
    constraints: SafetyConstraint[],
    context: ExecutionContext
  ): SafetyResult {
    if (constraints.length === 0) {
      return { allowed: true }; // No constraints means allowed
    }

    const violatedConstraints: string[] = [];
    const suggestions: string[] = [];

    for (const constraint of constraints) {
      for (const rule of constraint.validationRules) {
        const ruleResult = this.evaluateValidationRule(rule, context);
        if (!ruleResult.allowed) {
          violatedConstraints.push(
            rule.errorMessage || `${rule.type} validation failed`
          );
          if (ruleResult.suggestion) {
            suggestions.push(ruleResult.suggestion);
          }
        }
      }
    }

    if (violatedConstraints.length > 0) {
      return {
        allowed: false,
        reason: violatedConstraints[0], // Return first violation
        violatedConstraints,
        suggestions,
      };
    }

    return { allowed: true };
  }

  /**
   * Evaluate a single validation rule
   */
  private evaluateValidationRule(
    rule: ValidationRule,
    context: ExecutionContext
  ): { allowed: boolean; suggestion?: string } {
    switch (rule.type) {
      case 'path_validation':
        return this.validatePath(rule.parameters, context.resourcePath);

      case 'size_limit':
        return this.validateSize(rule.parameters, context.inputData);

      case 'rate_limit':
        return this.validateRateLimit(rule.parameters, context);

      case 'content_filter':
        return this.validateContent(rule.parameters, context.inputData);

      case 'custom':
        return this.validateCustom(rule.parameters, context);

      default:
        logger.warn('Unknown validation rule type', { rule });
        return { allowed: true }; // Unknown rules are allowed by default
    }
  }

  /**
   * Validate file path against allowed/blocked patterns
   */
  private validatePath(
    parameters: Record<string, any>,
    resourcePath?: string
  ): { allowed: boolean; suggestion?: string } {
    if (!resourcePath) {
      return { allowed: true }; // No path to validate
    }

    const { allowedPaths, blockedPaths } = parameters;

    // Check blocked paths first
    if (blockedPaths && Array.isArray(blockedPaths)) {
      for (const blockedPattern of blockedPaths) {
        if (this.matchesPattern(resourcePath, blockedPattern)) {
          return {
            allowed: false,
            suggestion: `Avoid accessing blocked path: ${blockedPattern}`,
          };
        }
      }
    }

    // Check allowed paths
    if (allowedPaths && Array.isArray(allowedPaths)) {
      for (const allowedPattern of allowedPaths) {
        if (this.matchesPattern(resourcePath, allowedPattern)) {
          return { allowed: true };
        }
      }
      return {
        allowed: false,
        suggestion: `Use allowed paths: ${allowedPaths.join(', ')}`,
      };
    }

    return { allowed: true };
  }

  /**
   * Validate size limits
   */
  private validateSize(
    parameters: Record<string, any>,
    inputData?: any
  ): { allowed: boolean; suggestion?: string } {
    const { maxSizeBytes } = parameters;

    if (!inputData || !maxSizeBytes) {
      return { allowed: true };
    }

    let size = 0;
    if (typeof inputData === 'string') {
      size = Buffer.byteLength(inputData, 'utf8');
    } else if (inputData instanceof Buffer) {
      size = inputData.length;
    } else {
      size = Buffer.byteLength(JSON.stringify(inputData), 'utf8');
    }

    if (size > maxSizeBytes) {
      return {
        allowed: false,
        suggestion: `Reduce size to under ${Math.round(maxSizeBytes / 1024)}KB`,
      };
    }

    return { allowed: true };
  }

  /**
   * Validate rate limits
   */
  private validateRateLimit(
    parameters: Record<string, any>,
    context: ExecutionContext
  ): { allowed: boolean; suggestion?: string } {
    const { maxRequestsPerMinute } = parameters;

    if (!maxRequestsPerMinute) {
      return { allowed: true };
    }

    const rateLimitKey = `${context.userId}:${context.toolCallId.split('-')[0]}`;
    const now = Date.now();
    const windowMs = 60000; // 1 minute

    const entry = this.rateLimitTracker.get(rateLimitKey);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.rateLimitTracker.set(rateLimitKey, {
        count: 1,
        resetTime: now + windowMs,
      });
      return { allowed: true };
    }

    if (entry.count >= maxRequestsPerMinute) {
      const resetInSeconds = Math.ceil((entry.resetTime - now) / 1000);
      return {
        allowed: false,
        suggestion: `Wait ${resetInSeconds} seconds before retrying`,
      };
    }

    // Increment counter
    entry.count++;
    return { allowed: true };
  }

  /**
   * Validate content filters
   */
  private validateContent(
    parameters: Record<string, any>,
    inputData?: any
  ): { allowed: boolean; suggestion?: string } {
    const { allowedTypes, blockedPatterns } = parameters;

    if (!inputData) {
      return { allowed: true };
    }

    // Check file type if specified
    if (allowedTypes && Array.isArray(allowedTypes)) {
      const contentType = this.detectContentType(inputData);
      if (contentType && !allowedTypes.includes(contentType)) {
        return {
          allowed: false,
          suggestion: `Use allowed file types: ${allowedTypes.join(', ')}`,
        };
      }
    }

    // Check blocked patterns
    if (blockedPatterns && Array.isArray(blockedPatterns)) {
      const content =
        typeof inputData === 'string' ? inputData : JSON.stringify(inputData);
      for (const pattern of blockedPatterns) {
        if (content.includes(pattern)) {
          return {
            allowed: false,
            suggestion: `Remove blocked content pattern: ${pattern}`,
          };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Validate custom rules
   */
  private validateCustom(
    parameters: Record<string, any>,
    context: ExecutionContext
  ): { allowed: boolean; suggestion?: string } {
    // Custom validation logic would be implemented here
    // For now, return allowed
    return { allowed: true };
  }

  /**
   * Check if a path matches a pattern
   */
  private matchesPattern(path: string, pattern: string): boolean {
    // Simple pattern matching - in production, use a proper glob library
    if (pattern.includes('**')) {
      const basePattern = pattern.replace('**', '');
      return path.startsWith(basePattern.replace('*', ''));
    }

    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(path);
    }

    return path === pattern;
  }

  /**
   * Detect content type from input data
   */
  private detectContentType(inputData: any): string | null {
    if (typeof inputData === 'string') {
      // Simple content type detection
      if (inputData.startsWith('data:')) {
        const match = inputData.match(/^data:([^;]+)/);
        return match ? match[1] : null;
      }
      return 'text/plain';
    }

    if (inputData instanceof Buffer) {
      // Basic file type detection from buffer
      const header = inputData.slice(0, 4);
      if (header[0] === 0xff && header[1] === 0xd8) return 'image/jpeg';
      if (header[0] === 0x89 && header[1] === 0x50) return 'image/png';
      if (header[0] === 0x47 && header[1] === 0x49) return 'image/gif';
    }

    return null;
  }

  /**
   * Check if a constraint matches the given criteria
   */
  private matchesConstraint(
    constraint: SafetyConstraint,
    criteria: Partial<SafetyConstraint>
  ): boolean {
    for (const [key, value] of Object.entries(criteria)) {
      if (constraint[key as keyof SafetyConstraint] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Set execution context (for caching)
   */
  setExecutionContext(toolCallId: string, context: ExecutionContext): void {
    this.executionContextCache.set(toolCallId, context);
    logger.debug('Execution context cached', {
      toolCallId,
      userId: context.userId,
    });
  }

  /**
   * Get execution context from cache
   */
  getExecutionContext(toolCallId: string): ExecutionContext | undefined {
    return this.executionContextCache.get(toolCallId);
  }

  /**
   * Create a default execution context
   */
  createDefaultExecutionContext(
    userId: string,
    conversationId: string,
    toolCallId: string
  ): ExecutionContext {
    return {
      userId,
      conversationId,
      toolCallId,
    };
  }

  /**
   * Get all safety constraints (for debugging/admin purposes)
   */
  getAllConstraints(): SafetyConstraint[] {
    return [...this.constraints];
  }

  /**
   * Clear all safety constraints (for testing)
   */
  clearConstraints(): void {
    this.constraints = [];
    logger.debug('All safety constraints cleared');
  }

  /**
   * Get security statistics
   */
  getStats(): {
    totalConstraints: number;
    constraintsByCategory: Record<string, number>;
    constraintsByOperation: Record<string, number>;
    activeRateLimits: number;
  } {
    const constraintsByCategory: Record<string, number> = {};
    const constraintsByOperation: Record<string, number> = {};

    for (const constraint of this.constraints) {
      constraintsByCategory[constraint.toolCategory] =
        (constraintsByCategory[constraint.toolCategory] || 0) + 1;
      constraintsByOperation[constraint.operationType] =
        (constraintsByOperation[constraint.operationType] || 0) + 1;
    }

    return {
      totalConstraints: this.constraints.length,
      constraintsByCategory,
      constraintsByOperation,
      activeRateLimits: this.rateLimitTracker.size,
    };
  }

  /**
   * Clear rate limit entries (for testing/maintenance)
   */
  clearRateLimits(): void {
    this.rateLimitTracker.clear();
    logger.debug('All rate limits cleared');
  }
}

// Export singleton instance
export const securitySystem = new SecuritySystem();
