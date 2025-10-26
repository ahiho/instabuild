import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Message types based on WebSocket contract
 */
interface UserMessage {
  type: 'userMessage';
  conversationId: string;
  content: string;
}

interface AIResponseChunk {
  type: 'aiResponseChunk';
  conversationId: string;
  content: string;
  isLastChunk: boolean;
}

interface ErrorMessage {
  type: 'error';
  conversationId?: string;
  message: string;
  code?: string;
}

type WSMessage = UserMessage | AIResponseChunk | ErrorMessage;

/**
 * Chat message for display
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * WebSocket connection states
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Hook for managing WebSocket-based chat
 */
export function useChat(conversationId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const streamingMessageRef = useRef<string>('');
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 2000;

  /**
   * Get WebSocket URL
   */
  const getWebSocketUrl = useCallback(() => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

    // Extract host and port from API URL
    const url = new URL(apiUrl);
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

    return `${protocol}//${url.host}/api/v1/chat/ws`;
  }, []);

  /**
   * Handle incoming AI response chunks (T014)
   */
  const handleAIResponseChunk = useCallback((chunk: AIResponseChunk) => {
    console.log('[Chat] Handling AI chunk:', {
      isLastChunk: chunk.isLastChunk,
      chunkLength: chunk.content.length,
      currentStreamingLength: streamingMessageRef.current.length,
    });

    if (chunk.conversationId !== conversationId) {
      console.log('[Chat] Ignoring chunk for different conversation');
      return; // Ignore messages for other conversations
    }

    if (chunk.isLastChunk) {
      // Finalize the streaming message
      const finalContent = streamingMessageRef.current;
      console.log('[Chat] Finalizing message. Final length:', finalContent.length);
      streamingMessageRef.current = '';
      setIsStreaming(false);

      setMessages((prev) => {
        // Update the last message (assistant) with final content
        const updated = [...prev];
        if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
          console.log('[Chat] Updating last assistant message');
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: finalContent,
          };
        } else {
          console.log('[Chat] No assistant message to update!');
        }
        return updated;
      });
    } else {
      // Append chunk to streaming message
      streamingMessageRef.current += chunk.content;
      setIsStreaming(true);

      console.log('[Chat] Appending chunk. Total length now:', streamingMessageRef.current.length);

      setMessages((prev) => {
        const updated = [...prev];
        const lastMessage = updated[updated.length - 1];

        if (lastMessage && lastMessage.role === 'assistant') {
          // Update existing assistant message
          console.log('[Chat] Updating existing assistant message');
          updated[updated.length - 1] = {
            ...lastMessage,
            content: streamingMessageRef.current,
          };
        } else {
          // Create new assistant message
          console.log('[Chat] Creating new assistant message');
          updated.push({
            id: `temp-${Date.now()}`,
            role: 'assistant',
            content: streamingMessageRef.current,
            timestamp: new Date(),
          });
        }
        return updated;
      });
    }
  }, [conversationId]);

  /**
   * Handle error messages
   */
  const handleError = useCallback((errorMsg: ErrorMessage) => {
    console.error('Chat error:', errorMsg);
    setError(errorMsg.message);
    setIsStreaming(false);
  }, []);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setConnectionState('connecting');
      const wsUrl = getWebSocketUrl();
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnectionState('connected');
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          console.log('[WebSocket] Received message:', message.type, message);

          if (message.type === 'aiResponseChunk') {
            handleAIResponseChunk(message);
          } else if (message.type === 'error') {
            handleError(message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setConnectionState('error');
        setError('Connection error occurred');
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionState('disconnected');
        wsRef.current = null;

        // Attempt reconnection
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          console.log(
            `Reconnecting... Attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}`
          );
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_DELAY);
        } else {
          setError('Connection lost. Please refresh the page.');
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      setConnectionState('error');
      setError('Failed to connect to chat server');
    }
  }, [getWebSocketUrl, handleAIResponseChunk, handleError]);

  /**
   * Send a message (T013)
   */
  const sendMessage = useCallback(
    (content: string) => {
      console.log('[Chat] Current conversationId:', conversationId);

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        setError('Not connected to chat server');
        return;
      }

      if (!content.trim()) {
        return;
      }

      // Add user message to UI immediately
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Send message to server
      const wsMessage: UserMessage = {
        type: 'userMessage',
        conversationId,
        content: content.trim(),
      };

      console.log('[Chat] Sending message with conversationId:', conversationId);

      try {
        wsRef.current.send(JSON.stringify(wsMessage));
        setError(null);
      } catch (error) {
        console.error('Error sending message:', error);
        setError('Failed to send message');
      }
    },
    [conversationId]
  );

  /**
   * Disconnect WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionState('disconnected');
  }, []);

  /**
   * Connect when conversationId is available, disconnect on unmount or conversationId change
   */
  useEffect(() => {
    console.log('[Chat] useEffect - conversationId changed:', conversationId);

    if (!conversationId) {
      // Don't connect if no conversationId
      console.log('[Chat] No conversationId, skipping connection');
      return;
    }

    connect();
    return () => {
      disconnect();
    };
  }, [conversationId, connect, disconnect]);

  return {
    messages,
    sendMessage,
    isStreaming,
    connectionState,
    error,
    reconnect: connect,
    disconnect,
  };
}
