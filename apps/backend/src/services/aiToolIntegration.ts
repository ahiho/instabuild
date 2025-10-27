import { ToolExecutionContext } from '@instabuild/shared/types';
import { CoreMessage, streamText } from 'ai';
import { logger } from '../lib/logger.js';
import { enhancedToolRegistry } from './enhancedToolRegistry.js';
import { toolRegistry } from './toolRegistry.js';

/**
 * AI SDK Integration Layer
 * Implements Task 2: Create AI SDK integration layer with proper tool execution context
 */

/**
 * Enhanced chat completion with proper tool integration
 */
export async function createEnhancedChatCompletion({
  model,
  messages,
  userId,
  conversationId,
}: {
  model: any;
  messages: CoreMessage[];
  userId: string;
  conversationId: string;
}) {
  try {
    // Create execution context for tools
    const baseContext: ToolExecutionContext = {
      userId,
      conversationId,
      toolCallId: '', // Will be set by individual tool calls
    };

    // Get available tools for this user context
    const availableTools = toolRegistry.getAvailableTools(baseContext);

    logger.info('Creating enhanced chat completion', {
      userId,
      conversationId,
      messageCount: messages.length,
      availableToolCount: Object.keys(availableTools).length,
    });

    // Create the AI response with tools
    const result = await streamText({
      model,
      messages,
      tools: availableTools,
      toolChoice: 'auto', // Let AI decide when to use tools
      // maxTokens: 4000, // Remove this as it's not supported in this context
      temperature: 0.7,
    });

    return result;
  } catch (error) {
    logger.error('Error in enhanced chat completion', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      conversationId,
    });
    throw error;
  }
}

/**
 * Get tool execution progress for real-time updates
 */
export function getToolExecutionProgress(toolCallId: string) {
  return enhancedToolRegistry.getExecutionProgress(toolCallId);
}

/**
 * Subscribe to tool execution progress updates
 */
export function subscribeToToolProgress(
  toolCallId: string,
  callback: (progress: any) => void
) {
  return enhancedToolRegistry.subscribeToProgress(toolCallId, callback);
}

/**
 * Get available tools for a user context
 */
export function getAvailableToolsForUser(context: ToolExecutionContext) {
  return {
    standardTools: toolRegistry.getAvailableTools(context),
    enhancedTools: enhancedToolRegistry.getAvailableEnhancedTools(context),
  };
}

/**
 * Get tool statistics and analytics
 */
export function getToolAnalytics() {
  return {
    enhancedRegistry: enhancedToolRegistry.getStats(),
    // Add more analytics as needed
  };
}
