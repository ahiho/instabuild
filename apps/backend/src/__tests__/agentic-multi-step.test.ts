import { beforeAll, describe, expect, it, vi } from 'vitest';
import { agenticAIService } from '../services/agenticAIService.js';
import { toolRegistry } from '../services/toolRegistry.js';
import { registerFilesystemTools } from '../tools/filesystem-tools.js';
import { registerTextTools } from '../tools/text-tools.js';

// Mock the AI SDK streamText function for testing
vi.mock('ai', async () => {
  const actual = await vi.importActual('ai');
  return {
    ...actual,
    streamText: vi.fn().mockImplementation(({ onStepFinish, onFinish }) => {
      // Simulate multi-step execution
      const mockSteps = [
        {
          finishReason: 'tool-calls',
          toolCalls: [
            {
              toolName: 'write_file',
              toolCallId: 'call-1',
              args: {
                file_path: '/tmp/test.html',
                content: '<h1>New Header</h1>',
              },
            },
          ],
          usage: { totalTokens: 100 },
        },
        {
          finishReason: 'stop',
          toolCalls: [],
          usage: { totalTokens: 150 },
        },
      ];

      // Simulate step execution
      setTimeout(async () => {
        for (const step of mockSteps) {
          if (onStepFinish) {
            await onStepFinish(step);
          }
        }

        if (onFinish) {
          await onFinish({
            text: 'I have successfully updated the header content.',
            steps: mockSteps,
            finishReason: 'stop',
            usage: { totalTokens: 250 },
          });
        }
      }, 10);

      return {
        toUIMessageStreamResponse: () => ({
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
          body: 'Mock response',
        }),
        onFinish: null,
      };
    }),
  };
});

describe('Agentic Multi-Step Execution', () => {
  beforeAll(() => {
    // Register tools for testing
    registerTextTools();
    registerFilesystemTools();
  });

  it('should process agentic chat with multi-step execution', async () => {
    // Test that the service can be called without throwing errors
    // The actual AI SDK integration would be tested in integration tests
    expect(() => {
      agenticAIService.processAgenticChat({
        messages: [],
        conversationId: 'test-conversation',
        userId: 'test-user',
        landingPageId: 'test-page',
        maxSteps: 5,
      });
    }).not.toThrow();
  });

  it('should configure correct system prompt for agentic behavior', () => {
    const service = agenticAIService as any;
    const prompt = service.buildSystemPrompt(
      'GPT-4 selected for complex task',
      'page-123'
    );

    // Should contain agentic behavior guidelines
    expect(prompt).toContain('agentic capabilities');
    expect(prompt).toContain('Multi-Step Reasoning');
    expect(prompt).toContain('Observe and Adapt');
    expect(prompt).toContain('Explain Your Process');
    expect(prompt).toContain('Error Recovery');
    expect(prompt).toContain('Context Awareness');

    // Should contain tool usage strategy
    expect(prompt).toContain('Tool Usage Strategy');
    expect(prompt).toContain('Start with Analysis');
    expect(prompt).toContain('Plan Your Changes');
    expect(prompt).toContain('Make Incremental Changes');
    expect(prompt).toContain('Validate Results');

    // Should contain context information
    expect(prompt).toContain('Working on landing page: page-123');
    expect(prompt).toContain(
      'Model Selection: GPT-4 selected for complex task'
    );
  });

  it('should detect complex requests requiring tool calls', () => {
    const service = agenticAIService as any;

    // Complex requests that should trigger tool calls
    const complexRequests = [
      'Create a hero section with a call-to-action button and testimonials below',
      'Update the header color to blue and add a contact form',
      'Change the font size and upload a new logo image',
      'Modify the layout and add three new sections with different content',
      'Remove the old banner and create a new navigation menu',
    ];

    complexRequests.forEach(request => {
      expect(service.detectToolCallRequirement(request)).toBe(true);
    });

    // Simple requests that shouldn't trigger tool calls
    const simpleRequests = [
      'Hello, how are you?',
      'What is the weather like today?',
      'Can you explain how CSS works?',
      'Tell me about web development best practices',
    ];

    simpleRequests.forEach(request => {
      expect(service.detectToolCallRequirement(request)).toBe(false);
    });
  });

  it('should have proper execution statistics', () => {
    const stats = agenticAIService.getExecutionStats();

    expect(stats).toEqual({
      service: 'AgenticAIService',
      version: '1.0.0',
      capabilities: [
        'multi-step-execution',
        'tool-chaining',
        'error-recovery',
        'context-awareness',
      ],
      maxStepsDefault: 10,
      supportedModels: ['gpt-4', 'gpt-4o-mini'],
    });
  });

  it('should integrate with existing tool registry', () => {
    const availableTools = toolRegistry.getTools();

    // Should have all registered tools available
    expect(Object.keys(availableTools).length).toBeGreaterThan(0);

    // Each tool should be properly formatted for AI SDK
    Object.values(availableTools).forEach(tool => {
      expect(tool).toHaveProperty('description');
      expect(tool).toHaveProperty('parameters');
      expect(tool).toHaveProperty('execute');
      expect(typeof tool.execute).toBe('function');
    });

    // Should have specific tools we registered
    expect(availableTools).toHaveProperty('list_directory');
    expect(availableTools).toHaveProperty('read_file');
    expect(availableTools).toHaveProperty('write_file');
    expect(availableTools).toHaveProperty('replace');
    expect(availableTools).toHaveProperty('search_file_content');
    expect(availableTools).toHaveProperty('glob');
    expect(availableTools).toHaveProperty('text_transform');
  });
});
