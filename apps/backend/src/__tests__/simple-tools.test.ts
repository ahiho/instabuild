import { describe, expect, it } from 'vitest';
import { toolRegistry } from '../services/toolRegistry.js';
import { registerLandingPageTools } from '../tools/landing-page-tools-simple.js';
import { registerTextTools } from '../tools/text-tools.js';

describe('Simple Tools Test', () => {
  it('should register and get tools for AI SDK', () => {
    // Clear and register tools
    toolRegistry['tools'].clear();
    registerTextTools();
    registerLandingPageTools();

    // Get tools for AI SDK
    const availableTools = toolRegistry.getTools();

    // Should have both text and landing page tools
    expect(availableTools).toBeDefined();
    expect(typeof availableTools).toBe('object');

    // Check for text tools
    expect(availableTools['text_transform']).toBeDefined();
    expect(availableTools['word_count']).toBeDefined();

    // Check for landing page tools
    expect(availableTools['update_content']).toBeDefined();
    expect(availableTools['update_style']).toBeDefined();
    expect(availableTools['add_element']).toBeDefined();

    console.log('Available tools:', Object.keys(availableTools));
  });
});
