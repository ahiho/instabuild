interface AIRequest {
  prompt: string;
  context?: string;
  taskType: 'generation' | 'analysis' | 'formatting' | 'ui-update';
  complexity?: 'low' | 'medium' | 'high';
}

interface AIResponse {
  content: string;
  model: string;
  tokensUsed: number;
}

class AIService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL;
  }

  async makeRequest(request: AIRequest): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: request.prompt,
          context: request.context,
          taskType: request.taskType,
          complexity: request.complexity || this.inferComplexity(request),
        }),
      });

      if (!response.ok) {
        throw new Error(`AI request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('AI service error:', error);
      throw error;
    }
  }

  // Layout-specific AI requests
  async analyzeLayoutChange(
    description: string,
    currentLayout?: string
  ): Promise<AIResponse> {
    return this.makeRequest({
      prompt: `Analyze this layout change request: ${description}`,
      context: currentLayout,
      taskType: 'analysis',
      complexity: 'low', // Layout analysis is typically simple
    });
  }

  async generateLayoutSuggestions(requirements: string): Promise<AIResponse> {
    return this.makeRequest({
      prompt: `Generate layout suggestions for: ${requirements}`,
      taskType: 'generation',
      complexity: 'medium', // Layout generation requires some complexity
    });
  }

  async optimizeLayoutPerformance(layoutCode: string): Promise<AIResponse> {
    return this.makeRequest({
      prompt: `Optimize this layout code for performance: ${layoutCode}`,
      taskType: 'analysis',
      complexity: 'high', // Performance optimization is complex
    });
  }

  private inferComplexity(request: AIRequest): 'low' | 'medium' | 'high' {
    const promptLength = request.prompt.length;
    const contextLength = request.context?.length || 0;

    if (promptLength > 500 || contextLength > 1000) {
      return 'high';
    } else if (promptLength > 200 || contextLength > 500) {
      return 'medium';
    }

    return 'low';
  }
}

export const aiService = new AIService();
