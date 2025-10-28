import { beforeAll, describe, expect, it } from 'vitest';
import { agenticAIService } from '../services/agenticAIService.js';
import { toolRegistry } from '../services/toolRegistry.js';
import { registerFilesystemTools } from '../tools/filesystem-tools.js';
import { registerTextTools } from '../tools/text-tools.js';

describe('Agentic AI Service', () => {
  beforeAll(() => {
    // Register tools for testing
    registerTextTools();
    registerFilesystemTools();
  });

  it('should initialize with correct capabilities', () => {
    const stats = agenticAIService.getExecutionStats();

    expect(stats.service).toBe('AgenticAIService');
    expect(stats.version).toBe('3.0.0');
    expect(stats.capabilities).toContain('adaptive-multi-step-execution');
    expect(stats.capabilities).toContain('tool-chaining');
    expect(stats.capabilities).toContain('advanced-error-recovery');
    expect(stats.capabilities).toContain('context-awareness');
    expect(stats.capabilities).toContain('state-management');
    expect(stats.capabilities).toContain('execution-analytics');
    expect(stats.maxStepsRange).toEqual({ min: 3, max: 25 });
  });

  it('should detect tool call requirements correctly', () => {
    // Access the private method through type assertion for testing
    const service = agenticAIService as any;

    // Should detect tool call requirements
    expect(service.detectToolCallRequirement('update the header color')).toBe(
      true
    );
    expect(service.detectToolCallRequirement('change the button style')).toBe(
      true
    );
    expect(service.detectToolCallRequirement('add a new section')).toBe(true);
    expect(service.detectToolCallRequirement('upload an image')).toBe(true);

    // Should not detect tool call requirements
    expect(service.detectToolCallRequirement('hello how are you')).toBe(false);
    expect(service.detectToolCallRequirement('what is the weather')).toBe(
      false
    );
  });

  it('should register agentic tools successfully', () => {
    // This should not throw
    expect(() => {
      agenticAIService.registerAgenticTools();
    }).not.toThrow();
  });

  it('should build appropriate system prompt', () => {
    // Access the private method through type assertion for testing
    const service = agenticAIService as any;

    const prompt = service.buildSystemPrompt(
      'Using GPT-4 for complex task',
      'page-123'
    );

    expect(prompt).toContain('agentic capabilities');
    expect(prompt).toContain('Multi-Step Reasoning');
    expect(prompt).toContain('Working on landing page: page-123');
    expect(prompt).toContain('Model Selection: Using GPT-4 for complex task');
  });

  it('should have access to registered tools', () => {
    const availableTools = toolRegistry.getTools();

    // Should have text tools
    expect(availableTools).toHaveProperty('text_transform');
    expect(availableTools).toHaveProperty('word_count');

    // Should have filesystem tools
    expect(availableTools).toHaveProperty('list_directory');
    expect(availableTools).toHaveProperty('read_file');
    expect(availableTools).toHaveProperty('write_file');
    expect(availableTools).toHaveProperty('replace');
    expect(availableTools).toHaveProperty('search_file_content');
    expect(availableTools).toHaveProperty('glob');

    // Each tool should have the correct AI SDK format
    const readFileTool = availableTools.read_file;
    expect(readFileTool).toHaveProperty('description');
    expect(readFileTool).toHaveProperty('parameters');
    expect(readFileTool).toHaveProperty('execute');
    expect(typeof readFileTool.execute).toBe('function');
  });
});
