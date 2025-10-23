interface TaskComplexity {
  codeLines: number;
  logicBranches: number;
  contextTokens: number;
  taskType: 'generation' | 'analysis' | 'formatting' | 'ui-update';
  userIntent: 'creative' | 'factual' | 'technical';
}

interface ModelConfig {
  strongModel: string;
  weakModel: string;
  fallbackModel: string;
  complexityThreshold: number;
  responseTimeout: number;
}

export class ModelSelectionService {
  private config: ModelConfig;

  constructor() {
    this.config = {
      strongModel: process.env.OPENAI_STRONG_MODEL || 'gpt-4',
      weakModel: process.env.OPENAI_WEAK_MODEL || 'gpt-4o-mini',
      fallbackModel: process.env.OPENAI_FALLBACK_MODEL || 'gpt-4o-mini',
      complexityThreshold: parseFloat(
        process.env.MODEL_COMPLEXITY_THRESHOLD || '0.7'
      ),
      responseTimeout: parseInt(process.env.MODEL_RESPONSE_TIMEOUT || '30000'),
    };
  }

  selectModel(task: TaskComplexity): string {
    const complexityScore = this.calculateComplexityScore(task);

    if (complexityScore >= this.config.complexityThreshold) {
      return this.config.strongModel;
    }

    return this.config.weakModel;
  }

  private calculateComplexityScore(task: TaskComplexity): number {
    let score = 0;

    // Code complexity factor (0-0.3)
    if (task.codeLines > 50) score += 0.3;
    else if (task.codeLines > 20) score += 0.2;
    else if (task.codeLines > 5) score += 0.1;

    // Logic branches factor (0-0.2)
    if (task.logicBranches > 5) score += 0.2;
    else if (task.logicBranches > 2) score += 0.1;

    // Context size factor (0-0.2)
    if (task.contextTokens > 2000) score += 0.2;
    else if (task.contextTokens > 1000) score += 0.1;

    // Task type factor (0-0.2)
    switch (task.taskType) {
      case 'generation':
        score += 0.2;
        break;
      case 'analysis':
        score += 0.15;
        break;
      case 'formatting':
        score += 0.05;
        break;
      case 'ui-update':
        score += 0.1;
        break;
    }

    // User intent factor (0-0.1)
    switch (task.userIntent) {
      case 'creative':
        score += 0.1;
        break;
      case 'technical':
        score += 0.08;
        break;
      case 'factual':
        score += 0.05;
        break;
    }

    return Math.min(score, 1.0);
  }

  getModelConfig(): ModelConfig {
    return { ...this.config };
  }
}
