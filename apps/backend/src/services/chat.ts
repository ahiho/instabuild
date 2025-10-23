import { streamText } from 'ai';
import { prisma } from '../server.js';
import { modelSelector } from './model-selector.js';
import type { ModelSelectionContext } from '@instabuild/shared/types';

export class ChatService {
  async processChatMessage(
    pageId: string,
    message: string,
    selectedElementId?: string
  ) {
    // Save user message
    await prisma.chatMessage.create({
      data: {
        landingPageId: pageId,
        role: 'user',
        content: message,
        metadata: selectedElementId ? { selectedElementId } : undefined,
      },
    });

    // Get conversation history
    const history = await prisma.chatMessage.findMany({
      where: { landingPageId: pageId },
      orderBy: { createdAt: 'asc' },
      take: 10, // Limit context
    });

    // Prepare messages for AI
    const messages = history.map((msg: any) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    // Select appropriate model based on task complexity
    const context: ModelSelectionContext = {
      message,
      selectedElementId,
      previousMessages: history.length,
      requiresToolCalling: /upload|file|image|logo|asset/i.test(message),
    };

    const { model, selection } = modelSelector.getModel(context);

    // Stream response from AI with selected model
    const result = await streamText({
      model,
      messages,
      system: `You are an AI assistant that helps users edit landing pages through natural language commands. 
      ${selectedElementId ? `The user has selected element with ID: ${selectedElementId}` : ''}
      
      When modifying elements:
      - Use CSS properties for styling
      - Be specific about changes
      - Maintain responsive design principles
      
      Model Selection: ${selection.reasoning}
      
      Respond with helpful suggestions and acknowledge the changes you would make.`,
    });

    return result.toTextStreamResponse();
  }

  async saveAssistantMessage(
    pageId: string,
    content: string,
    toolCalls?: any[]
  ) {
    return prisma.chatMessage.create({
      data: {
        landingPageId: pageId,
        role: 'assistant',
        content,
        toolCalls: toolCalls || undefined,
      },
    });
  }
}
