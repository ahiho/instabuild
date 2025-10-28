import { beforeAll, describe, expect, it } from 'vitest';
import { toolRegistry } from '../services/toolRegistry.js';
import { registerFilesystemTools } from '../tools/filesystem-tools.js';
import { registerTextTools } from '../tools/text-tools.js';

describe('Chat Tools Integration', () => {
  beforeAll(() => {
    // Register all tools
    registerTextTools();
    registerFilesystemTools();
  });

  it('should have all tools available for AI SDK', () => {
    const availableTools = toolRegistry.getTools();

    console.log('Available tools for AI SDK:', Object.keys(availableTools));

    // Should have text tools
    expect(availableTools['text_transform']).toBeDefined();
    expect(availableTools['word_count']).toBeDefined();

    // Should have filesystem tools
    expect(availableTools['list_directory']).toBeDefined();
    expect(availableTools['read_file']).toBeDefined();
    expect(availableTools['write_file']).toBeDefined();
    expect(availableTools['replace']).toBeDefined();
    expect(availableTools['search_file_content']).toBeDefined();
    expect(availableTools['glob']).toBeDefined();

    // Verify tool structure
    const readFileTool = availableTools['read_file'];
    expect(readFileTool.description).toBeDefined();
    expect(readFileTool.parameters).toBeDefined();
    expect(readFileTool.execute).toBeDefined();

    console.log('read_file tool:', {
      description: readFileTool.description,
      hasParameters: !!readFileTool.parameters,
      hasExecute: !!readFileTool.execute,
    });
  });

  it('should execute filesystem tools successfully', async () => {
    const context = {
      userId: 'test-user',
      conversationId: 'test-conversation',
      toolCallId: 'test-call-123',
    };

    // Test read file tool (safe operation)
    const result = await toolRegistry.executeTool(
      'read_file',
      {
        absolute_path: '/tmp/nonexistent-file.txt',
      },
      context
    );

    expect(result).toBeDefined();
    // Note: This will fail because the file doesn't exist, but we're testing the tool structure
    expect(result.success).toBe(false); // File doesn't exist
    console.log('Tool execution result:', result);
  });

  it('should validate filesystem tools are registered', () => {
    // Test that filesystem tools are properly registered
    expect(toolRegistry.isToolRegistered('list_directory')).toBe(true);
    expect(toolRegistry.isToolRegistered('read_file')).toBe(true);
    expect(toolRegistry.isToolRegistered('write_file')).toBe(true);
    expect(toolRegistry.isToolRegistered('replace')).toBe(true);
    expect(toolRegistry.isToolRegistered('search_file_content')).toBe(true);
    expect(toolRegistry.isToolRegistered('glob')).toBe(true);
  });
});
