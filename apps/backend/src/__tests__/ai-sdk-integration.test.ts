import type { AISDKMessage, ChatRequest } from '@instabuild/shared/types';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { fastify as fastifyApp, prisma } from '../server.js';
import { toolRegistry } from '../services/toolRegistry.js';

describe('AI SDK Integration', () => {
  let conversationId: string;

  beforeAll(async () => {
    // Start the server
    await fastifyApp.listen({ port: 3001, host: '127.0.0.1' });
  });

  beforeEach(async () => {
    // Create a fresh test conversation for each test
    const conversation = await prisma.conversation.create({
      data: {},
    });
    conversationId = conversation.id;
  });

  afterAll(async () => {
    // Clean up all test data
    await prisma.chatMessage.deleteMany({});
    await prisma.conversation.deleteMany({});
    await prisma.toolExecution.deleteMany({});

    // Close server
    await fastifyApp.close();
  });

  describe('Enhanced Chat Route', () => {
    it('should handle AI SDK message format with parts array', async () => {
      const messages: AISDKMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          parts: [
            {
              type: 'text',
              text: 'Hello, can you help me with my landing page?',
            },
          ],
        },
      ];

      const requestBody: ChatRequest = {
        conversationId,
        messages,
      };

      const response = await fastifyApp.inject({
        method: 'POST',
        url: '/api/v1/chat',
        payload: requestBody,
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/event-stream');

      // Verify message was saved to database with parts
      const savedMessage = await prisma.chatMessage.findFirst({
        where: {
          conversationId,
          senderType: 'User',
        },
      });

      expect(savedMessage).toBeTruthy();
      expect(savedMessage!.content).toBe(
        'Hello, can you help me with my landing page?'
      );
      expect(savedMessage!.parts).toEqual(messages[0].parts);
      expect(savedMessage!.metadata).toBeTruthy();
    });

    it('should extract text from multiple text parts', async () => {
      const messages: AISDKMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          parts: [
            { type: 'text', text: 'First part. ' },
            { type: 'text', text: 'Second part.' },
          ],
        },
      ];

      const requestBody: ChatRequest = {
        conversationId,
        messages,
      };

      const response = await fastifyApp.inject({
        method: 'POST',
        url: '/api/v1/chat',
        payload: requestBody,
      });

      expect(response.statusCode).toBe(200);

      // Verify combined text was saved
      const savedMessage = await prisma.chatMessage.findFirst({
        where: {
          conversationId,
          senderType: 'User',
        },
      });

      expect(savedMessage!.content).toBe('First part. Second part.');
    });

    it('should handle conversation not found error', async () => {
      const messages: AISDKMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          parts: [{ type: 'text', text: 'Test message' }],
        },
      ];

      const requestBody: ChatRequest = {
        conversationId: 'non-existent-id',
        messages,
      };

      const response = await fastifyApp.inject({
        method: 'POST',
        url: '/api/v1/chat',
        payload: requestBody,
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body)).toEqual({
        error: 'Conversation not found',
      });
    });

    it('should handle empty messages array', async () => {
      const requestBody: ChatRequest = {
        conversationId,
        messages: [],
      };

      const response = await fastifyApp.inject({
        method: 'POST',
        url: '/api/v1/chat',
        payload: requestBody,
      });

      // AI SDK requires at least one message, so this should return an error
      expect(response.statusCode).toBe(400);

      // No user message should be saved
      const savedMessages = await prisma.chatMessage.findMany({
        where: {
          conversationId,
          senderType: 'User',
        },
      });

      expect(savedMessages.length).toBe(0);
    });
  });

  describe('Tool Registry System', () => {
    it('should have registered text tools', () => {
      expect(toolRegistry.isToolRegistered('text_transform')).toBe(true);
      expect(toolRegistry.isToolRegistered('word_count')).toBe(true);
    });

    it('should get available tools in correct format', () => {
      const tools = toolRegistry.getTools();

      expect(tools).toHaveProperty('text_transform');
      expect(tools).toHaveProperty('word_count');

      expect(tools.text_transform).toHaveProperty('description');
      expect(tools.text_transform).toHaveProperty('parameters');
      expect(tools.word_count).toHaveProperty('description');
      expect(tools.word_count).toHaveProperty('parameters');
    });

    it('should execute text_transform tool successfully', async () => {
      const result = await toolRegistry.executeTool(
        'text_transform',
        {
          text: 'hello world',
          operation: 'uppercase',
        },
        {
          userId: 'test-user',
          conversationId,
          toolCallId: 'test-call-1',
        }
      );

      expect(result).toEqual({
        transformedText: 'HELLO WORLD',
      });
    });

    it('should execute word_count tool successfully', async () => {
      const result = await toolRegistry.executeTool(
        'word_count',
        {
          text: 'Hello world\nThis is a test',
        },
        {
          userId: 'test-user',
          conversationId,
          toolCallId: 'test-call-2',
        }
      );

      expect(result).toEqual({
        words: 6,
        characters: 26,
        charactersNoSpaces: 21,
        lines: 2,
        averageWordsPerLine: 3,
      });
    });

    it('should handle tool execution errors', async () => {
      await expect(
        toolRegistry.executeTool(
          'non_existent_tool',
          {},
          {
            userId: 'test-user',
            conversationId,
            toolCallId: 'test-call-3',
          }
        )
      ).rejects.toThrow("Tool 'non_existent_tool' is not registered");
    });

    it('should validate tool input schema', async () => {
      await expect(
        toolRegistry.executeTool(
          'text_transform',
          {
            text: 'hello',
            operation: 'invalid_operation',
          },
          {
            userId: 'test-user',
            conversationId,
            toolCallId: 'test-call-4',
          }
        )
      ).rejects.toThrow();
    });
  });

  describe('Database Schema Updates', () => {
    it('should save messages with parts column', async () => {
      const parts = [
        { type: 'text', text: 'Test message' },
        {
          type: 'tool-call',
          toolCallId: 'call-1',
          toolName: 'test_tool',
          args: {},
        },
      ];

      const message = await prisma.chatMessage.create({
        data: {
          conversationId,
          senderType: 'AI',
          role: 'assistant',
          content: 'Test message',
          parts,
          metadata: { test: true },
        },
      });

      expect(message.parts).toEqual(parts);
      expect(message.metadata).toEqual({ test: true });
    });

    it('should save tool executions to database', async () => {
      const toolExecution = await prisma.toolExecution.create({
        data: {
          conversationId,
          toolCallId: 'test-call-id',
          toolName: 'text_transform',
          input: { text: 'hello', operation: 'uppercase' },
          output: { transformedText: 'HELLO' },
          status: 'completed',
          userId: 'test-user',
        },
      });

      expect(toolExecution.toolName).toBe('text_transform');
      expect(toolExecution.status).toBe('completed');
      expect(toolExecution.input).toEqual({
        text: 'hello',
        operation: 'uppercase',
      });
      expect(toolExecution.output).toEqual({ transformedText: 'HELLO' });
    });

    it('should handle tool execution failures in database', async () => {
      const toolExecution = await prisma.toolExecution.create({
        data: {
          conversationId,
          toolCallId: 'failed-call-id',
          toolName: 'text_transform',
          input: { text: 'hello', operation: 'invalid' },
          error: 'Invalid operation',
          status: 'failed',
          userId: 'test-user',
        },
      });

      expect(toolExecution.status).toBe('failed');
      expect(toolExecution.error).toBe('Invalid operation');
      expect(toolExecution.output).toBeNull();
    });

    it('should support backward compatibility with existing messages', async () => {
      // Create a message without parts (simulating old format)
      const oldMessage = await prisma.chatMessage.create({
        data: {
          conversationId,
          senderType: 'User',
          role: 'user',
          content: 'Old format message',
          // parts is null (old format)
        },
      });

      expect(oldMessage.parts).toBeNull();
      expect(oldMessage.content).toBe('Old format message');

      // Should be able to read it normally
      const retrievedMessage = await prisma.chatMessage.findUnique({
        where: { id: oldMessage.id },
      });

      expect(retrievedMessage).toBeTruthy();
      expect(retrievedMessage!.content).toBe('Old format message');
    });
  });

  describe('Message Format Conversion', () => {
    it('should handle mixed message parts correctly', async () => {
      const messages: AISDKMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          parts: [
            { type: 'text', text: 'Please transform this text: ' },
            { type: 'text', text: 'hello world' },
          ],
        },
      ];

      const requestBody: ChatRequest = {
        conversationId,
        messages,
      };

      const response = await fastifyApp.inject({
        method: 'POST',
        url: '/api/v1/chat',
        payload: requestBody,
      });

      expect(response.statusCode).toBe(200);

      // Verify the text was properly concatenated
      const savedMessage = await prisma.chatMessage.findFirst({
        where: {
          conversationId,
          senderType: 'User',
        },
      });

      expect(savedMessage!.content).toBe(
        'Please transform this text: hello world'
      );
    });

    it('should ignore non-text parts when extracting content', async () => {
      const messages: AISDKMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          parts: [
            { type: 'text', text: 'Valid text' },
            { type: 'tool-call', toolCallId: 'call-1', toolName: 'test' },
            { type: 'text', text: ' more text' },
          ],
        },
      ];

      const requestBody: ChatRequest = {
        conversationId,
        messages,
      };

      const response = await fastifyApp.inject({
        method: 'POST',
        url: '/api/v1/chat',
        payload: requestBody,
      });

      expect(response.statusCode).toBe(200);

      const savedMessage = await prisma.chatMessage.findFirst({
        where: {
          conversationId,
          senderType: 'User',
        },
      });

      // Should only include text parts
      expect(savedMessage!.content).toBe('Valid text more text');
    });
  });
});
