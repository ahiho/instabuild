import { ConversationState, TaskComplexity } from '../types.js';

/**
 * Conversation state manager for tracking conversation progress and context
 */
export class ConversationStateManager {
  private conversationStates: Map<string, ConversationState> = new Map();

  /**
   * Initialize conversation state tracking
   */
  initializeConversationState(options: {
    conversationId: string;
    userId: string;
    landingPageId?: string;
    taskComplexity: TaskComplexity;
    maxSteps: number;
  }): ConversationState {
    const state: ConversationState = {
      conversationId: options.conversationId,
      userId: options.userId,
      landingPageId: options.landingPageId,
      currentStep: 0,
      totalSteps: options.maxSteps,
      taskComplexity: options.taskComplexity,
      startTime: new Date(),
      lastActivity: new Date(),
      toolsUsed: [],
      filesModified: [],
      errorCount: 0,
      status: 'active',
      context: {
        projectStructure: [],
        recentChanges: [],
        workingDirectory: undefined,
      },
    };

    this.conversationStates.set(options.conversationId, state);
    return state;
  }

  /**
   * Update conversation state
   */
  async updateConversationState(
    conversationId: string,
    updates: Partial<ConversationState>
  ): Promise<void> {
    const state = this.conversationStates.get(conversationId);
    if (!state) return;

    // Merge updates
    Object.assign(state, updates);

    // Update tools used (avoid duplicates)
    if (updates.toolsUsed) {
      const existingTools = new Set(state.toolsUsed);
      updates.toolsUsed.forEach(tool => existingTools.add(tool));
      state.toolsUsed = Array.from(existingTools);
    }

    this.conversationStates.set(conversationId, state);
  }

  /**
   * Finalize conversation state
   */
  async finalizeConversationState(
    conversationId: string,
    finalResult: any
  ): Promise<void> {
    const state = this.conversationStates.get(conversationId);
    if (!state) return;

    state.status = finalResult.finishReason === 'stop' ? 'completed' : 'failed';
    state.lastActivity = new Date();

    // Check for tool errors
    const toolErrors =
      finalResult.steps?.flatMap(
        (step: any) =>
          step.content?.filter((part: any) => part.type === 'tool-error') || []
      ) || [];

    state.errorCount = toolErrors.length;

    this.conversationStates.set(conversationId, state);
  }

  /**
   * Track tool usage in conversation state
   */
  async trackToolUsage(
    conversationId: string,
    toolName: string
  ): Promise<void> {
    const state = this.conversationStates.get(conversationId);
    if (!state) return;

    // Track file modifications for filesystem tools
    if (['write_file', 'replace', 'glob'].includes(toolName)) {
      // This would be enhanced to track actual file paths from tool results
      state.context.recentChanges = state.context.recentChanges || [];
      state.context.recentChanges.push(
        `${toolName} executed at ${new Date().toISOString()}`
      );
    }

    this.conversationStates.set(conversationId, state);
  }

  /**
   * Get conversation state for monitoring
   */
  getConversationState(conversationId: string): ConversationState | undefined {
    return this.conversationStates.get(conversationId);
  }

  /**
   * Get all active conversation states
   */
  getAllConversationStates(): Map<string, ConversationState> {
    return new Map(this.conversationStates);
  }

  /**
   * Delete a conversation state
   */
  deleteConversationState(conversationId: string): void {
    this.conversationStates.delete(conversationId);
  }
}

export const conversationStateManager = new ConversationStateManager();
