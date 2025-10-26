import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from '../hooks/useChat';
import WS from 'vitest-websocket-mock';

describe('useChat Hook', () => {
  let server: WS;
  const conversationId = 'test-conversation-id';

  beforeEach(() => {
    // Mock WebSocket server
    server = new WS('ws://localhost:3000/api/v1/chat/ws');
  });

  afterEach(() => {
    server.close();
    WS.clean();
  });

  it('should establish WebSocket connection on mount', async () => {
    const { result } = renderHook(() => useChat(conversationId));

    await waitFor(() => {
      expect(result.current.connectionState).toBe('connected');
    });
  });

  it('should send user messages', async () => {
    const { result } = renderHook(() => useChat(conversationId));

    await waitFor(() => {
      expect(result.current.connectionState).toBe('connected');
    });

    act(() => {
      result.current.sendMessage('Hello, AI!');
    });

    // Wait for message to be sent
    await server.nextMessage;

    // Verify message was sent to server
    expect(server).toHaveReceivedMessages([
      JSON.stringify({
        type: 'userMessage',
        conversationId,
        content: 'Hello, AI!',
      }),
    ]);

    // Verify message was added to local state
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.messages[0].content).toBe('Hello, AI!');
  });

  it('should handle streaming AI response chunks', async () => {
    const { result } = renderHook(() => useChat(conversationId));

    await waitFor(() => {
      expect(result.current.connectionState).toBe('connected');
    });

    // Send user message first
    act(() => {
      result.current.sendMessage('Tell me a story');
    });

    await server.nextMessage;

    // Simulate AI response chunks
    act(() => {
      server.send(
        JSON.stringify({
          type: 'aiResponseChunk',
          conversationId,
          content: 'Once ',
          isLastChunk: false,
        })
      );
    });

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(true);
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1].role).toBe('assistant');
      expect(result.current.messages[1].content).toContain('Once');
    });

    act(() => {
      server.send(
        JSON.stringify({
          type: 'aiResponseChunk',
          conversationId,
          content: 'upon a time...',
          isLastChunk: false,
        })
      );
    });

    await waitFor(() => {
      expect(result.current.messages[1].content).toContain('Once upon a time...');
    });

    // Send final chunk
    act(() => {
      server.send(
        JSON.stringify({
          type: 'aiResponseChunk',
          conversationId,
          content: '',
          isLastChunk: true,
        })
      );
    });

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(false);
    });
  });

  it('should handle error messages', async () => {
    const { result } = renderHook(() => useChat(conversationId));

    await waitFor(() => {
      expect(result.current.connectionState).toBe('connected');
    });

    act(() => {
      server.send(
        JSON.stringify({
          type: 'error',
          conversationId,
          message: 'Test error message',
          code: 'TEST_ERROR',
        })
      );
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Test error message');
    });
  });

  it('should attempt reconnection on disconnect', async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useChat(conversationId));

    await waitFor(() => {
      expect(result.current.connectionState).toBe('connected');
    });

    // Simulate disconnect
    act(() => {
      server.close();
    });

    await waitFor(() => {
      expect(result.current.connectionState).toBe('disconnected');
    });

    // Fast-forward timers to trigger reconnection
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    vi.useRealTimers();
  });

  it('should not send message when not connected', async () => {
    const { result } = renderHook(() => useChat(conversationId));

    // Try to send message before connection is established
    act(() => {
      result.current.sendMessage('This should fail');
    });

    // Verify error is set
    expect(result.current.error).toBeTruthy();
  });

  it('should ignore messages for different conversation', async () => {
    const { result } = renderHook(() => useChat(conversationId));

    await waitFor(() => {
      expect(result.current.connectionState).toBe('connected');
    });

    // Send message for different conversation
    act(() => {
      server.send(
        JSON.stringify({
          type: 'aiResponseChunk',
          conversationId: 'different-conversation-id',
          content: 'This should be ignored',
          isLastChunk: false,
        })
      );
    });

    await waitFor(() => {
      // Messages should still be empty
      expect(result.current.messages).toHaveLength(0);
    });
  });

  it('should clean up WebSocket on unmount', async () => {
    const { result, unmount } = renderHook(() => useChat(conversationId));

    await waitFor(() => {
      expect(result.current.connectionState).toBe('connected');
    });

    unmount();

    await waitFor(() => {
      expect(server.server.clients().length).toBe(0);
    });
  });
});
