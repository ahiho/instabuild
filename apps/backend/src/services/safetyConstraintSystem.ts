import { logger } from '../lib/logger.js';

/**
 * Safety levels for tool operations
 */
export enum SafetyLevel {
  SAFE = 'safe',
  POTENTIALLY_DESTRUCTIVE = 'potentially_destructive',
}

/**
 * Types of destructive actions that can be detected
 */
export enum DestructiveActionType {
  DELETE_SECTION = 'delete_section',
  CLEAR_ALL_CONTENT = 'clear_all_content',
  REMOVE_ALL_STYLING = 'remove_all_styling',
  REPLACE_ENTIRE_PAGE = 'replace_entire_page',
  DELETE_MULTIPLE_SECTIONS = 'delete_multiple_sections',
  CLEAR_NAVIGATION = 'clear_navigation',
  REMOVE_ALL_IMAGES = 'remove_all_images',
}

/**
 * Execution context for safety evaluation
 */
export interface SafetyExecutionContext {
  userId: string;
  conversationId: string;
  toolCallId: string;
  timestamp: Date;
}

/**
 * Reference to elements that might be affected by an action
 */
export interface ElementReference {
  type: 'section' | 'content' | 'styling' | 'component';
  identifier: string;
  description: string;
}

/**
 * Analysis of a potentially destructive action
 */
export interface DestructiveActionAnalysis {
  actionType: DestructiveActionType;
  confidence: number; // 0-1 confidence that this is destructive
  affectedElements: ElementReference[];
  reversibility: 'easily_reversible' | 'difficult_to_reverse' | 'irreversible';
  severity: 'low' | 'medium' | 'high';
}

/**
 * Safety evaluation result
 */
export interface SafetyEvaluation {
  safetyLevel: SafetyLevel;
  requiresConfirmation: boolean;
  warningMessage?: string;
  affectedElements?: ElementReference[];
  reversible: boolean;
  analysis?: DestructiveActionAnalysis;
}

/**
 * ActionAnalyzer - Detects potentially destructive actions
 */
class ActionAnalyzer {
  private destructivePatterns = new Map<string, DestructiveActionType[]>();

  constructor() {
    this.initializeDestructivePatterns();
  }

  private initializeDestructivePatterns(): void {
    this.destructivePatterns.set('clearAllContent', [
      DestructiveActionType.CLEAR_ALL_CONTENT,
    ]);
    this.destructivePatterns.set('deleteSection', [
      DestructiveActionType.DELETE_SECTION,
    ]);
    this.destructivePatterns.set('removeAllStyling', [
      DestructiveActionType.REMOVE_ALL_STYLING,
    ]);
  }

  analyzeAction(toolName: string, _parameters: any): DestructiveActionAnalysis {
    const destructiveTypes = this.getDestructiveTypes(toolName, _parameters);

    if (destructiveTypes.length === 0) {
      return {
        actionType: DestructiveActionType.DELETE_SECTION,
        confidence: 0,
        affectedElements: [],
        reversibility: 'easily_reversible',
        severity: 'low',
      };
    }

    const primaryType = destructiveTypes[0];
    const confidence = this.calculateConfidence(
      toolName,
      _parameters,
      primaryType
    );
    const affectedElements = this.identifyAffectedElements(
      toolName,
      _parameters
    );
    const reversibility = this.assessReversibility(primaryType);
    const severity = this.assessSeverity(primaryType, affectedElements.length);

    return {
      actionType: primaryType,
      confidence,
      affectedElements,
      reversibility,
      severity,
    };
  }

  isDestructive(analysis: DestructiveActionAnalysis): boolean {
    return analysis.confidence > 0.5;
  }

  generateWarningMessage(analysis: DestructiveActionAnalysis): string {
    const actionDescriptions = {
      [DestructiveActionType.DELETE_SECTION]: 'delete a section',
      [DestructiveActionType.CLEAR_ALL_CONTENT]: 'clear all content',
      [DestructiveActionType.REMOVE_ALL_STYLING]: 'remove all styling',
      [DestructiveActionType.REPLACE_ENTIRE_PAGE]: 'replace the entire page',
      [DestructiveActionType.DELETE_MULTIPLE_SECTIONS]:
        'delete multiple sections',
      [DestructiveActionType.CLEAR_NAVIGATION]: 'clear navigation',
      [DestructiveActionType.REMOVE_ALL_IMAGES]: 'remove all images',
    };

    const actionDescription =
      actionDescriptions[analysis.actionType] || 'make significant changes';
    return `This action will ${actionDescription}`;
  }

  private getDestructiveTypes(
    toolName: string,
    _parameters: any
  ): DestructiveActionType[] {
    const directMatch = this.destructivePatterns.get(toolName);
    if (directMatch) {
      return directMatch;
    }

    const destructiveTypes: DestructiveActionType[] = [];
    const lowerToolName = toolName.toLowerCase();

    if (lowerToolName.includes('clear') && lowerToolName.includes('all')) {
      destructiveTypes.push(DestructiveActionType.CLEAR_ALL_CONTENT);
    }

    if (lowerToolName.includes('delete') && lowerToolName.includes('section')) {
      destructiveTypes.push(DestructiveActionType.DELETE_SECTION);
    }

    return destructiveTypes;
  }

  private calculateConfidence(
    _toolName: string,
    _parameters: any,
    _actionType: DestructiveActionType
  ): number {
    let confidence = 0.6;
    const lowerToolName = _toolName.toLowerCase();

    if (
      lowerToolName.includes('clear') ||
      lowerToolName.includes('delete') ||
      lowerToolName.includes('remove')
    ) {
      confidence += 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  private identifyAffectedElements(
    _toolName: string,
    parameters: any
  ): ElementReference[] {
    const elements: ElementReference[] = [];

    if (parameters && typeof parameters === 'object') {
      if (parameters.sectionId || parameters.section) {
        elements.push({
          type: 'section',
          identifier: parameters.sectionId || parameters.section,
          description: `Section: ${parameters.sectionId || parameters.section}`,
        });
      }
    }

    if (elements.length === 0) {
      elements.push({
        type: 'component',
        identifier: 'page-element',
        description: 'Page element',
      });
    }

    return elements;
  }

  private assessReversibility(
    actionType: DestructiveActionType
  ): 'easily_reversible' | 'difficult_to_reverse' | 'irreversible' {
    const reversibilityMap = {
      [DestructiveActionType.DELETE_SECTION]: 'difficult_to_reverse' as const,
      [DestructiveActionType.CLEAR_ALL_CONTENT]:
        'difficult_to_reverse' as const,
      [DestructiveActionType.REMOVE_ALL_STYLING]: 'easily_reversible' as const,
      [DestructiveActionType.REPLACE_ENTIRE_PAGE]:
        'difficult_to_reverse' as const,
      [DestructiveActionType.DELETE_MULTIPLE_SECTIONS]:
        'difficult_to_reverse' as const,
      [DestructiveActionType.CLEAR_NAVIGATION]: 'easily_reversible' as const,
      [DestructiveActionType.REMOVE_ALL_IMAGES]:
        'difficult_to_reverse' as const,
    };

    return reversibilityMap[actionType] || 'easily_reversible';
  }

  private assessSeverity(
    actionType: DestructiveActionType,
    _elementsCount: number
  ): 'low' | 'medium' | 'high' {
    const baseSeverity = {
      [DestructiveActionType.DELETE_SECTION]: 'medium' as const,
      [DestructiveActionType.CLEAR_ALL_CONTENT]: 'high' as const,
      [DestructiveActionType.REMOVE_ALL_STYLING]: 'low' as const,
      [DestructiveActionType.REPLACE_ENTIRE_PAGE]: 'high' as const,
      [DestructiveActionType.DELETE_MULTIPLE_SECTIONS]: 'high' as const,
      [DestructiveActionType.CLEAR_NAVIGATION]: 'medium' as const,
      [DestructiveActionType.REMOVE_ALL_IMAGES]: 'medium' as const,
    };

    return baseSeverity[actionType] || 'low';
  }
}

/**
 * SafetyLevelEvaluator - Determines if confirmation is needed
 */
class SafetyLevelEvaluator {
  private actionAnalyzer: ActionAnalyzer;

  constructor(actionAnalyzer: ActionAnalyzer) {
    this.actionAnalyzer = actionAnalyzer;
  }

  evaluateSafetyLevel(
    toolName: string,
    parameters: any,
    toolSafetyLevel?: SafetyLevel
  ): SafetyEvaluation {
    if (toolSafetyLevel === SafetyLevel.SAFE) {
      return {
        safetyLevel: SafetyLevel.SAFE,
        requiresConfirmation: false,
        reversible: true,
      };
    }

    const analysis = this.actionAnalyzer.analyzeAction(toolName, parameters);
    const isDestructive = this.actionAnalyzer.isDestructive(analysis);

    if (!isDestructive) {
      return {
        safetyLevel: SafetyLevel.SAFE,
        requiresConfirmation: false,
        reversible: true,
        analysis,
      };
    }

    const warningMessage = this.actionAnalyzer.generateWarningMessage(analysis);
    const reversible = analysis.reversibility !== 'irreversible';

    return {
      safetyLevel: SafetyLevel.POTENTIALLY_DESTRUCTIVE,
      requiresConfirmation: true,
      warningMessage,
      affectedElements: analysis.affectedElements,
      reversible,
      analysis,
    };
  }
}

/**
 * ContextAnalyzer - Considers action parameters and current page state
 */
class ContextAnalyzer {
  analyzeContext(
    _toolName: string,
    parameters: any,
    _context: SafetyExecutionContext
  ): {
    contextualRisk: 'low' | 'medium' | 'high';
    recommendations: string[];
    additionalWarnings: string[];
  } {
    const recommendations: string[] = [];
    const additionalWarnings: string[] = [];
    let contextualRisk: 'low' | 'medium' | 'high' = 'low';

    if (parameters && typeof parameters === 'object') {
      const paramString = JSON.stringify(parameters).toLowerCase();

      if (paramString.includes('all') || paramString.includes('entire')) {
        contextualRisk = 'high';
        additionalWarnings.push(
          'This action affects the entire page or all elements'
        );
      }
    }

    return {
      contextualRisk,
      recommendations,
      additionalWarnings,
    };
  }
}

/**
 * Main SafetyConstraintSystem class
 */
export class SafetyConstraintSystem {
  private actionAnalyzer: ActionAnalyzer;
  private safetyLevelEvaluator: SafetyLevelEvaluator;
  private contextAnalyzer: ContextAnalyzer;

  constructor() {
    this.actionAnalyzer = new ActionAnalyzer();
    this.safetyLevelEvaluator = new SafetyLevelEvaluator(this.actionAnalyzer);
    this.contextAnalyzer = new ContextAnalyzer();

    logger.info('Safety Constraint System initialized');
  }

  async evaluateAction(
    toolName: string,
    parameters: any,
    context: SafetyExecutionContext,
    toolSafetyLevel?: SafetyLevel,
    overrideOptions?: {
      forceConfirmation?: boolean;
      skipConfirmation?: boolean;
      customWarning?: string;
    }
  ): Promise<SafetyEvaluation> {
    try {
      const evaluation = this.safetyLevelEvaluator.evaluateSafetyLevel(
        toolName,
        parameters,
        toolSafetyLevel
      );

      // Apply overrides if provided
      if (overrideOptions) {
        if (overrideOptions.forceConfirmation) {
          evaluation.requiresConfirmation = true;
          evaluation.safetyLevel = SafetyLevel.POTENTIALLY_DESTRUCTIVE;
        }

        if (overrideOptions.skipConfirmation) {
          evaluation.requiresConfirmation = false;
        }

        if (overrideOptions.customWarning) {
          evaluation.warningMessage = overrideOptions.customWarning;
        }
      }

      if (evaluation.requiresConfirmation) {
        const contextAnalysis = this.contextAnalyzer.analyzeContext(
          toolName,
          parameters,
          context
        );

        if (contextAnalysis.additionalWarnings.length > 0) {
          evaluation.warningMessage = [
            evaluation.warningMessage,
            ...contextAnalysis.additionalWarnings,
          ]
            .filter(Boolean)
            .join(' ');
        }
      }

      logger.debug('Safety evaluation completed', {
        toolName,
        safetyLevel: evaluation.safetyLevel,
        requiresConfirmation: evaluation.requiresConfirmation,
        warningMessage: evaluation.warningMessage,
        overrideApplied: !!overrideOptions,
      });

      return evaluation;
    } catch (error) {
      logger.error('Error during safety evaluation', {
        toolName,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        safetyLevel: SafetyLevel.SAFE,
        requiresConfirmation: false,
        reversible: true,
      };
    }
  }

  /**
   * Check if a tool with given safety level would require confirmation
   */
  wouldRequireConfirmation(
    toolName: string,
    parameters: any,
    toolSafetyLevel?: SafetyLevel
  ): boolean {
    if (toolSafetyLevel === SafetyLevel.SAFE) {
      return false;
    }

    const analysis = this.actionAnalyzer.analyzeAction(toolName, parameters);
    return this.actionAnalyzer.isDestructive(analysis);
  }
}

// Export singleton instance
export const safetyConstraintSystem = new SafetyConstraintSystem();
