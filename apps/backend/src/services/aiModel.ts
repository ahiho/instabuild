import { streamText } from 'ai';
import { modelSelector } from './model-selector.js';
import type { ModelSelectionContext } from '@instabuild/shared/types';
import { logger } from '../lib/logger.js';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIStreamOptions {
  messages: ChatMessage[];
  systemPrompt?: string;
  context?: Partial<ModelSelectionContext>;
}

/**
 * Service for AI model invocation and streaming
 */
export class AIModelService {
  /**
   * Stream AI response for chat messages
   * @param options - Stream options including messages and context
   * @returns Async generator that yields response chunks
   */
  async *streamChatResponse(options: AIStreamOptions): AsyncGenerator<string> {
    const { messages, systemPrompt, context } = options;

    try {
      // Get the last user message for model selection
      const lastUserMessage =
        messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';

      // Build context for model selection
      const selectionContext: ModelSelectionContext = {
        message: lastUserMessage,
        previousMessages: messages.length,
        requiresToolCalling: false,
        ...context,
      };

      // Select appropriate model
      const { model, selection } = modelSelector.getModel(selectionContext);

      logger.info('Streaming AI response', {
        modelSelection: selection.selectedModel,
        reasoning: selection.reasoning,
        messageCount: messages.length,
      });

      // Prepare system message
      const systemMessage = systemPrompt || this.getDefaultSystemPrompt();

      // Stream response from AI
      const result = await streamText({
        model,
        messages: [{ role: 'system', content: systemMessage }, ...messages],
      });

      // Yield chunks as they arrive
      for await (const chunk of result.textStream) {
        yield chunk;
      }
    } catch (error) {
      logger.error('Error streaming AI response', { error });
      throw error;
    }
  }

  /**
   * Get a single AI response (non-streaming)
   * @param options - Stream options including messages and context
   * @returns Complete AI response text
   */
  async getChatResponse(options: AIStreamOptions): Promise<string> {
    const chunks: string[] = [];
    for await (const chunk of this.streamChatResponse(options)) {
      chunks.push(chunk);
    }
    return chunks.join('');
  }

  /**
   * Default system prompt for chat
   */
  private getDefaultSystemPrompt(): string {
    return `You are an AI assistant for InstaBuild, helping users create and modify landing pages.

You should:
- Be helpful, concise, and friendly
- Provide actionable suggestions
- Ask clarifying questions when needed
- Guide users through the landing page creation process
- Explain technical concepts in simple terms when relevant

Always maintain a professional and supportive tone.`;
  }

  /**
   * Validate if a conversation message is appropriate
   * @param content - Message content to validate
   * @returns True if valid
   */
  validateMessage(content: string): { valid: boolean; error?: string } {
    if (!content || content.trim().length === 0) {
      return { valid: false, error: 'Message content cannot be empty' };
    }

    if (content.length > 10000) {
      return { valid: false, error: 'Message content exceeds maximum length' };
    }

    return { valid: true };
  }
}

// Export singleton instance
export const aiModelService = new AIModelService();
