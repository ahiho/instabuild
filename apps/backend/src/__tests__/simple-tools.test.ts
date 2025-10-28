import { describe, expect, it } from 'vitest';
import { toolRegistry } from '../services/toolRegistry.js';
import { registerFilesystemTools } from '../tools/filesystem-tools.js';
import { registerTextTools } from '../tools/text-tools.js';

describe('Simple Tools Test', () => {
  it('should register and get tools for AI SDK', () => {
    // Clear and register tools
    toolRegistry['tools'].clear();
    registerTextTools();
    registerFilesystemTools();

    // Get tools for AI SDK
    const availableTools = toolRegistry.getTools();

    // Should have both text and landing page tools
    expect(availableTools).toBeDefined();
    expect(typeof availableTools).toBe('object');

    // Check for text tools
    expect(availableTools['text_transform']).toBeDefined();
    expect(availableTools['word_count']).toBeDefined();

    // Check for filesystem tools
    expect(availableTools['list_directory']).toBeDefined();
    expect(availableTools['read_file']).toBeDefined();
    expect(availableTools['write_file']).toBeDefined();
    expect(availableTools['replace']).toBeDefined();
    expect(availableTools['search_file_content']).toBeDefined();
    expect(availableTools['glob']).toBeDefined();

    console.log('Available tools:', Object.keys(availableTools));
  });
});
