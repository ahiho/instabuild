import {
  EnhancedToolDefinition,
  ToolCategory,
  ToolExecutionContext,
} from '@instabuild/shared/types';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { enhancedToolRegistry } from '../services/enhancedToolRegistry.js';

describe('EnhancedToolRegistry', () => {
  beforeEach(() => {
    enhancedToolRegistry.clearEnhancedTools();
  });

  it('should register an enhanced tool successfully', () => {
    const toolDef: EnhancedToolDefinition = {
      name: 'test-tool',
      displayName: 'Test Tool',
      description: 'A test tool for unit testing',
      userDescription: 'test the system functionality',
      category: ToolCategory.UTILITY,
      inputSchema: z.object({
        message: z.string(),
      }),
      execute: async input => {
        return { success: true, message: `Processed: ${input.message}` };
      },
      metadata: {
        version: '1.0.0',
        tags: ['test'],
      },
    };

    expect(() => {
      enhancedToolRegistry.registerEnhancedTool(toolDef);
    }).not.toThrow();

    const retrievedTool =
      enhancedToolRegistry.getEnhancedToolDefinition('test-tool');
    expect(retrievedTool).toBeDefined();
    expect(retrievedTool?.displayName).toBe('Test Tool');
    expect(retrievedTool?.category).toBe(ToolCategory.UTILITY);
  });

  it('should execute an enhanced tool with progress tracking', async () => {
    const toolDef: EnhancedToolDefinition = {
      name: 'progress-tool',
      displayName: 'Progress Tool',
      description: 'A tool that tracks progress',
      userDescription: 'demonstrate progress tracking',
      category: ToolCategory.UTILITY,
      inputSchema: z.object({
        data: z.string(),
      }),
      execute: async input => {
        return {
          success: true,
          userFeedback: `Successfully processed: ${input.data}`,
          previewRefreshNeeded: false,
        };
      },
      metadata: {
        version: '1.0.0',
        tags: ['progress'],
      },
    };

    enhancedToolRegistry.registerEnhancedTool(toolDef);

    const context: ToolExecutionContext = {
      userId: 'test-user',
      conversationId: 'test-conversation',
      toolCallId: 'test-call-123',
    };

    const result = await enhancedToolRegistry.executeEnhancedTool(
      'progress-tool',
      { data: 'test data' },
      context
    );

    expect(result.success).toBe(true);
    expect(result.userFeedback).toContain('Successfully processed: test data');
    expect(result.previewRefreshNeeded).toBe(false);
  });

  it('should track execution progress', async () => {
    const toolDef: EnhancedToolDefinition = {
      name: 'slow-tool',
      displayName: 'Slow Tool',
      description: 'A tool that takes time',
      userDescription: 'simulate slow processing',
      category: ToolCategory.UTILITY,
      estimatedDuration: 1000,
      inputSchema: z.object({
        delay: z.number().optional(),
      }),
      execute: async input => {
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, input.delay || 100));
        return {
          success: true,
          userFeedback: 'Processing completed',
          previewRefreshNeeded: false,
        };
      },
      metadata: {
        version: '1.0.0',
        tags: ['slow'],
      },
    };

    enhancedToolRegistry.registerEnhancedTool(toolDef);

    const context: ToolExecutionContext = {
      userId: 'test-user',
      conversationId: 'test-conversation',
      toolCallId: 'slow-call-123',
    };

    // Start execution in background
    const executionPromise = enhancedToolRegistry.executeEnhancedTool(
      'slow-tool',
      { delay: 50 },
      context
    );

    // Check progress during execution
    const progress = enhancedToolRegistry.getExecutionProgress('slow-call-123');
    expect(progress).toBeDefined();
    expect(progress?.toolName).toBe('slow-tool');
    expect(progress?.displayName).toBe('Slow Tool');
    expect(progress?.estimatedCompletion).toBeDefined();

    // Wait for completion
    const result = await executionPromise;
    expect(result.success).toBe(true);
  });

  it('should get tools by category', () => {
    const utilityTool: EnhancedToolDefinition = {
      name: 'utility-tool',
      displayName: 'Utility Tool',
      description: 'A utility tool',
      userDescription: 'perform utility functions',
      category: ToolCategory.UTILITY,
      inputSchema: z.object({}),
      execute: async () => ({ success: true }),
      metadata: { version: '1.0.0', tags: [] },
    };

    const uploadTool: EnhancedToolDefinition = {
      name: 'upload-tool',
      displayName: 'Upload Tool',
      description: 'An upload tool',
      userDescription: 'handle file uploads',
      category: ToolCategory.UPLOAD,
      inputSchema: z.object({}),
      execute: async () => ({ success: true }),
      metadata: { version: '1.0.0', tags: [] },
    };

    enhancedToolRegistry.registerEnhancedTool(utilityTool);
    enhancedToolRegistry.registerEnhancedTool(uploadTool);

    const utilityTools = enhancedToolRegistry.getToolsByCategory(
      ToolCategory.UTILITY
    );
    const uploadTools = enhancedToolRegistry.getToolsByCategory(
      ToolCategory.UPLOAD
    );

    expect(utilityTools).toHaveLength(1);
    expect(utilityTools[0].name).toBe('utility-tool');
    expect(uploadTools).toHaveLength(1);
    expect(uploadTools[0].name).toBe('upload-tool');
  });

  it('should get registry statistics', () => {
    const tool1: EnhancedToolDefinition = {
      name: 'tool1',
      displayName: 'Tool 1',
      description: 'First tool',
      userDescription: 'do something',
      category: ToolCategory.UTILITY,
      inputSchema: z.object({}),
      execute: async () => ({ success: true }),
      metadata: { version: '1.0.0', tags: [] },
    };

    const tool2: EnhancedToolDefinition = {
      name: 'tool2',
      displayName: 'Tool 2',
      description: 'Second tool',
      userDescription: 'do something else',
      category: ToolCategory.UPLOAD,
      inputSchema: z.object({}),
      execute: async () => ({ success: true }),
      metadata: { version: '1.0.0', tags: [] },
    };

    enhancedToolRegistry.registerEnhancedTool(tool1);
    enhancedToolRegistry.registerEnhancedTool(tool2);

    const stats = enhancedToolRegistry.getStats();
    expect(stats.totalEnhancedTools).toBe(2);
    expect(stats.toolsByCategory[ToolCategory.UTILITY]).toBe(1);
    expect(stats.toolsByCategory[ToolCategory.UPLOAD]).toBe(1);
    expect(stats.activeExecutions).toBe(0);
  });
});
