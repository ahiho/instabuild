import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { fastify as fastifyApp } from '../server.js';
import { prisma } from '../server.js';
// @ts-ignore - WebSocket types
import WebSocket from 'ws';

describe('WebSocket Chat', () => {
  let wsClient: WebSocket;
  let conversationId: string;
  const WS_URL = 'ws://localhost:3000/api/v1/chat/ws';

  beforeAll(async () => {
    // Start the server
    await fastifyApp.listen({ port: 3000, host: '127.0.0.1' });

    // Create a test conversation
    const conversation = await prisma.conversation.create({
      data: {},
    });
    conversationId = conversation.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.chatMessage.deleteMany({
      where: { conversationId },
    });
    await prisma.conversation.delete({
      where: { id: conversationId },
    });

    // Close server
    await fastifyApp.close();
  });

  it('should establish WebSocket connection', async () => {
    wsClient = new WebSocket(WS_URL);

    await new Promise<void>((resolve, reject) => {
      wsClient.on('open', () => {
        expect(wsClient.readyState).toBe(WebSocket.OPEN);
        wsClient.close();
        resolve();
      });

      wsClient.on('error', (error: Error) => {
        reject(error);
      });
    });
  });

  it('should handle user message and receive AI response chunks', async () => {
    wsClient = new WebSocket(WS_URL);
    const receivedChunks: any[] = [];

    await new Promise<void>((resolve, reject) => {
      wsClient.on('open', () => {
        // Send user message
        const userMessage = {
          type: 'userMessage',
          conversationId,
          content: 'Hello, AI!',
        };
        wsClient.send(JSON.stringify(userMessage));
      });

      wsClient.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString());
        receivedChunks.push(message);

        // Check if we received the final chunk
        if (message.type === 'aiResponseChunk' && message.isLastChunk) {
          // Verify we received chunks
          expect(receivedChunks.length).toBeGreaterThan(0);

          // Verify chunk structure
          const firstChunk = receivedChunks[0];
          expect(firstChunk.type).toBe('aiResponseChunk');
          expect(firstChunk.conversationId).toBe(conversationId);
          expect(firstChunk).toHaveProperty('content');
          expect(firstChunk).toHaveProperty('isLastChunk');

          wsClient.close();
          resolve();
        }
      });

      wsClient.on('error', (error: Error) => {
        wsClient.close();
        reject(error);
      });
    });
  }, 30000); // 30 second timeout for AI response

  it('should persist user messages to database', async () => {
    // Send a message via WebSocket
    wsClient = new WebSocket(WS_URL);

    await new Promise<void>((resolve, reject) => {
      wsClient.on('open', () => {
        const userMessage = {
          type: 'userMessage',
          conversationId,
          content: 'Test message for persistence',
        };
        wsClient.send(JSON.stringify(userMessage));
        resolve();
      });

      wsClient.on('error', reject);
    });

    // Wait a bit for message to be processed
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check if message was saved
    const messages = await prisma.chatMessage.findMany({
      where: {
        conversationId,
        senderType: 'User',
        content: 'Test message for persistence',
      },
    });

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0].content).toBe('Test message for persistence');

    wsClient.close();
  });

  it('should handle invalid conversation ID', async () => {
    wsClient = new WebSocket(WS_URL);

    await new Promise<void>((resolve, reject) => {
      wsClient.on('open', () => {
        const userMessage = {
          type: 'userMessage',
          conversationId: 'invalid-conversation-id',
          content: 'Test message',
        };
        wsClient.send(JSON.stringify(userMessage));
      });

      wsClient.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'error') {
          expect(message.message).toBeTruthy();
          expect(message.code).toBe('CONVERSATION_NOT_FOUND');
          wsClient.close();
          resolve();
        }
      });

      wsClient.on('error', (error: Error) => {
        wsClient.close();
        reject(error);
      });
    });
  });

  it('should handle empty message content', async () => {
    wsClient = new WebSocket(WS_URL);

    await new Promise<void>((resolve, reject) => {
      wsClient.on('open', () => {
        const userMessage = {
          type: 'userMessage',
          conversationId,
          content: '',
        };
        wsClient.send(JSON.stringify(userMessage));
      });

      wsClient.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'error') {
          expect(message.message).toBeTruthy();
          expect(message.code).toBe('INVALID_MESSAGE');
          wsClient.close();
          resolve();
        }
      });

      wsClient.on('error', (error: Error) => {
        wsClient.close();
        reject(error);
      });
    });
  });

  it('should update conversation timestamp after message', async () => {
    const initialConversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    wsClient = new WebSocket(WS_URL);

    await new Promise<void>((resolve, reject) => {
      wsClient.on('open', () => {
        const userMessage = {
          type: 'userMessage',
          conversationId,
          content: 'Timestamp test message',
        };
        wsClient.send(JSON.stringify(userMessage));
        resolve();
      });

      wsClient.on('error', reject);
    });

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const updatedConversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    expect(updatedConversation).toBeTruthy();
    expect(
      new Date(updatedConversation!.lastUpdateTime).getTime()
    ).toBeGreaterThan(new Date(initialConversation!.lastUpdateTime).getTime());

    wsClient.close();
  }, 30000);
});
