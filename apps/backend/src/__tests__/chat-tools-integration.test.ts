import { beforeAll, describe, expect, it } from 'vitest';
import { toolRegistry } from '../services/toolRegistry.js';
import { registerLandingPageTools } from '../tools/landing-page-tools-simple.js';
import { registerTextTools } from '../tools/text-tools.js';

describe('Chat Tools Integration', () => {
  beforeAll(() => {
    // Register all tools
    registerTextTools();
    registerLandingPageTools();
  });

  it('should have all tools available for AI SDK', () => {
    const availableTools = toolRegistry.getTools();

    console.log('Available tools for AI SDK:', Object.keys(availableTools));

    // Should have text tools
    expect(availableTools['text_transform']).toBeDefined();
    expect(availableTools['word_count']).toBeDefined();

    // Should have landing page tools
    expect(availableTools['update_content']).toBeDefined();
    expect(availableTools['update_style']).toBeDefined();
    expect(availableTools['add_element']).toBeDefined();

    // Verify tool structure
    const updateContentTool = availableTools['update_content'];
    expect(updateContentTool.description).toBeDefined();
    expect(updateContentTool.parameters).toBeDefined();
    expect(updateContentTool.execute).toBeDefined();

    console.log('update_content tool:', {
      description: updateContentTool.description,
      hasParameters: !!updateContentTool.parameters,
      hasExecute: !!updateContentTool.execute,
    });
  });

  it('should execute landing page tools successfully', async () => {
    const context = {
      userId: 'test-user',
      conversationId: 'test-conversation',
      toolCallId: 'test-call-123',
    };

    // Test content update tool
    const result = await toolRegistry.executeTool(
      'update_content',
      {
        elementId: 'test-heading',
        newContent: 'New Heading Text',
        contentType: 'heading',
      },
      context
    );

    expect(result).toBeDefined();
    console.log('Tool execution result:', result);
  });

  it('should validate tool permissions', () => {
    // Test permission validation
    expect(
      toolRegistry.validatePermissions('update_content', 'admin-user')
    ).toBe(true);
    expect(toolRegistry.validatePermissions('update_style', 'user')).toBe(true);
    expect(toolRegistry.validatePermissions('add_element', 'developer')).toBe(
      true
    );
  });
});
