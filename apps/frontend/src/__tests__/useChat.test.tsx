import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ChatPanel } from '../components/ChatPanel';
import * as conversationService from '../services/conversation';

// Mock the conversation service
vi.mock('../services/conversation', () => ({
  getOrCreateConversation: vi.fn(),
  getConversationMessages: vi.fn(),
}));

// Mock the AI SDK useChat hook
vi.mock('@ai-sdk/react', () => ({
  useChat: vi.fn(),
}));

// Mock the DefaultChatTransport
vi.mock('ai', () => ({
  DefaultChatTransport: vi.fn(),
}));

// Mock toast hook
vi.mock('../hooks/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('ChatPanel with AI SDK Integration', () => {
  const mockGetOrCreateConversation = vi.mocked(conversationService.getOrCreateConversation);
  const mockGetConversationMessages = vi.mocked(conversationService.getConversationMessages);

  const defaultChatState = {
    messages: [],
    sendMessage: vi.fn(),
    status: 'ready' as const,
    error: null,
    stop: vi.fn(),
  };

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default mock implementations
    mockGetOrCreateConversation.mockResolvedValue('test-conversation-id');
    mockGetConversationMessages.mockResolvedValue([]);
    
    // Mock useChat from AI SDK
    const { useChat } = await import('@ai-sdk/react');
    vi.mocked(useChat).mockReturnValue(defaultChatState);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize conversation and load messages on mount', async () => {
    const testPageId = 'test-page-id';
    
    render(<ChatPanel pageId={testPageId} />);

    await waitFor(() => {
      expect(mockGetOrCreateConversation).toHaveBeenCalledWith(testPageId);
      expect(mockGetConversationMessages).toHaveBeenCalledWith('test-conversation-id');
    });
  });

  it('should display loading state while initializing conversation', () => {
    mockGetOrCreateConversation.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<ChatPanel pageId="test-page-id" />);

    expect(screen.getByText('Initializing chat...')).toBeInTheDocument();
  });

  it('should display empty state when no messages', async () => {
    render(<ChatPanel pageId="test-page-id" />);

    await waitFor(() => {
      expect(screen.getByText('AI Landing Page Editor')).toBeInTheDocument();
      expect(screen.getByText(/Describe the changes you'd like to make/)).toBeInTheDocument();
    });
  });

  it('should render messages with AI SDK format', async () => {
    const testMessages = [
      {
        id: '1',
        role: 'user' as const,
        parts: [{ type: 'text' as const, text: 'Hello, AI!' }],
      },
      {
        id: '2',
        role: 'assistant' as const,
        parts: [{ type: 'text' as const, text: 'Hello! How can I help you?' }],
      },
    ];

    const { useChat } = await import('@ai-sdk/react');
    vi.mocked(useChat).mockReturnValue({
      ...defaultChatState,
      messages: testMessages,
    });

    render(<ChatPanel pageId="test-page-id" />);

    await waitFor(() => {
      expect(screen.getByText('Hello, AI!')).toBeInTheDocument();
      expect(screen.getByText('Hello! How can I help you?')).toBeInTheDocument();
    });
  });

  it('should handle message sending with AI SDK', async () => {
    const mockSendMessage = vi.fn();
    const { useChat } = await import('@ai-sdk/react');
    vi.mocked(useChat).mockReturnValue({
      ...defaultChatState,
      sendMessage: mockSendMessage,
    });

    render(<ChatPanel pageId="test-page-id" />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ask me anything...')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('Ask me anything...');
    const submitButton = screen.getByRole('button', { name: /submit/i });

    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.click(submitButton);

    expect(mockSendMessage).toHaveBeenCalledWith(
      {
        role: 'user',
        parts: [{ type: 'text', text: 'Test message' }],
      },
      {
        body: {
          conversationId: 'test-conversation-id',
        },
      }
    );
  });

  it('should display streaming indicator when status is streaming', async () => {
    const { useChat } = await import('@ai-sdk/react');
    vi.mocked(useChat).mockReturnValue({
      ...defaultChatState,
      status: 'streaming',
    });

    render(<ChatPanel pageId="test-page-id" />);

    await waitFor(() => {
      // Look for bouncing dots animation elements
      const bouncingDots = screen.container.querySelectorAll('.bounce-dot');
      expect(bouncingDots).toHaveLength(3);
    });
  });

  it('should handle errors from AI SDK', async () => {
    const testError = new Error('Test error message');
    const { useChat } = await import('@ai-sdk/react');
    vi.mocked(useChat).mockReturnValue({
      ...defaultChatState,
      error: testError,
    });

    render(<ChatPanel pageId="test-page-id" />);

    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });
  });

  it('should disable input when not ready', async () => {
    const { useChat } = await import('@ai-sdk/react');
    vi.mocked(useChat).mockReturnValue({
      ...defaultChatState,
      status: 'streaming',
    });

    render(<ChatPanel pageId="test-page-id" />);

    await waitFor(() => {
      const textarea = screen.getByPlaceholderText('Ask me anything...');
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      expect(textarea).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });

  it('should show stop button when streaming', async () => {
    const mockStop = vi.fn();
    const { useChat } = await import('@ai-sdk/react');
    vi.mocked(useChat).mockReturnValue({
      ...defaultChatState,
      status: 'streaming',
      stop: mockStop,
    });

    render(<ChatPanel pageId="test-page-id" />);

    await waitFor(() => {
      const stopButton = screen.getByText('Stop');
      expect(stopButton).toBeInTheDocument();
      
      fireEvent.click(stopButton);
      expect(mockStop).toHaveBeenCalled();
    });
  });
});
