import { useState, useEffect } from 'react';
import { useChat, type UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import {
  Sparkles,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Paperclip,
  Loader2,
} from 'lucide-react';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from './ai-elements/conversation';
import { Message, MessageContent, MessageAvatar } from './ai-elements/message';
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputProvider,
  usePromptInputAttachments,
  type PromptInputMessage,
} from './ai-elements/prompt-input';
import { Response } from './ai-elements/response';
import { Actions, Action } from './ai-elements/actions';
import { useToast } from '../hooks/useToast';
import { getOrCreateConversation, getConversationMessages } from '../services/conversation';

interface ChatPanelProps {
  pageId: string;
}

/**
 * ChatPanel - Professional AI chat interface using WebSocket
 *
 * Features:
 * - Real-time WebSocket communication
 * - Streaming AI responses
 * - Auto-reconnection
 * - Message actions (copy, like, dislike)
 * - Professional UI with AI Elements components
 * - Dark theme styling
 */

/**
 * BouncingDots - Animated indicator showing AI is generating response
 */
function BouncingDots() {
  return (
    <div className="flex items-center gap-1">
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .bounce-dot {
          animation: bounce 1.4s infinite;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: currentColor;
        }
        .bounce-dot-1 { animation-delay: 0s; }
        .bounce-dot-2 { animation-delay: 0.2s; }
        .bounce-dot-3 { animation-delay: 0.4s; }
      `}</style>
      <div className="bounce-dot bounce-dot-1 text-gray-400"></div>
      <div className="bounce-dot bounce-dot-2 text-gray-400"></div>
      <div className="bounce-dot bounce-dot-3 text-gray-400"></div>
    </div>
  );
}

function AttachButton() {
  const attachments = usePromptInputAttachments();

  return (
    <PromptInputButton
      onClick={() => attachments.openFileDialog()}
      className="h-8 w-8 text-gray-400 hover:text-gray-300 hover:bg-white/10"
    >
      <Paperclip className="h-4 w-4" />
    </PromptInputButton>
  );
}

export function ChatPanel({ pageId }: ChatPanelProps) {
  const { success, error: showError } = useToast();
  const [conversationId, setConversationId] = useState<string>('');
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [isLoadingConversation, setIsLoadingConversation] = useState(true);

  // Get or create conversation and load messages on mount
  useEffect(() => {
    const initConversation = async () => {
      try {
        console.log('[ChatPanel] Getting conversation for pageId:', pageId);
        const id = await getOrCreateConversation(pageId);
        console.log('[ChatPanel] Got conversationId:', id);
        setConversationId(id);

        // Load previous messages
        console.log('[ChatPanel] Loading previous messages');
        const messages = await getConversationMessages(id);
        console.log('[ChatPanel] Loaded messages:', messages.length);
        setInitialMessages(messages);
      } catch (err) {
        console.error('Failed to initialize conversation:', err);
        showError('Connection Error', 'Failed to initialize chat');
      } finally {
        setIsLoadingConversation(false);
      }
    };

    initConversation();
  }, [pageId, showError]);

  // Use AI SDK's useChat hook
  const {
    messages: chatMessages,
    sendMessage,
    status,
    error,
    stop,
  } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: `${import.meta.env.VITE_API_BASE_URL}/chat`,
    }),
  });

  // Use initial messages if chat messages are empty (fallback for loading)
  const messages = chatMessages.length > 0 ? chatMessages : initialMessages;

  // Log message state for debugging
  useEffect(() => {
    console.log('[ChatPanel] Messages state:', {
      initialMessages: initialMessages.length,
      chatMessages: chatMessages.length,
      displayedMessages: messages.length,
      conversationId,
    });
  }, [initialMessages.length, chatMessages.length, messages.length, conversationId]);

  // Handle errors from the chat
  useEffect(() => {
    if (error) {
      console.error('Chat error:', error);
      showError('Chat Error', error.message || 'Failed to send message');
    }
  }, [error, showError]);

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    success('Copied to clipboard', 'Message copied successfully');
  };

  const handleSendMessage = async (message: PromptInputMessage) => {
    if (message.text?.trim() && conversationId) {
      await sendMessage(
        {
          role: 'user',
          parts: [{ type: 'text', text: message.text.trim() }],
        },
        {
          body: {
            conversationId,
          },
        }
      );
    }
  };

  // Show loading state while getting conversation
  if (isLoadingConversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-purple-500 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-400">Initializing chat...</p>
        </div>
      </div>
    );
  }

  return (
    <PromptInputProvider>
      <div className="flex flex-col h-full">

        {/* Conversation Area */}
        <Conversation className="flex-1">
          <ConversationContent className="min-h-full flex flex-col">
            {/* Empty State */}
            {messages.length === 0 && (
              <div className="flex-1 flex items-center">
                <ConversationEmptyState
                  icon={<Sparkles className="h-12 w-12" strokeWidth={1.2} />}
                  title="AI Landing Page Editor"
                  description="Describe the changes you'd like to make, and I'll help you edit your landing page in real-time."
                />
              </div>
            )}

            {/* Messages */}
            {messages.map(message => {
              // Extract text from message parts
              const textContent = message.parts
                .filter((part) => part.type === 'text')
                .map((part) => (part.type === 'text' ? part.text : ''))
                .join('');

              return (
                <Message key={message.id} from={message.role}>
                  <MessageAvatar
                    src={
                      message.role === 'user'
                        ? '/avatar-user.png'
                        : '/avatar-ai.png'
                    }
                    name={message.role === 'user' ? 'You' : 'AI'}
                  />
                  <MessageContent variant="flat">
                    <Response>{textContent}</Response>

                    {/* Message Actions (only for assistant messages) */}
                    {message.role === 'assistant' && (
                      <Actions className="mt-2">
                        <Action
                          tooltip="Copy message"
                          onClick={() => handleCopyMessage(textContent)}
                        >
                          <Copy className="h-4 w-4" />
                        </Action>
                        <Action tooltip="Like">
                          <ThumbsUp className="h-4 w-4" />
                        </Action>
                        <Action tooltip="Dislike">
                          <ThumbsDown className="h-4 w-4" />
                        </Action>
                      </Actions>
                    )}
                  </MessageContent>
                </Message>
              );
            })}

            {/* Streaming Indicator - Bouncing Dots (only if no content streaming yet) */}
            {(() => {
              // Check if we're streaming and if the last message has content
              const isStreaming = status === 'submitted' || status === 'streaming';
              const lastMessage = messages[messages.length - 1];
              const hasAssistantContent = lastMessage?.role === 'assistant' &&
                lastMessage.parts?.some((part) => part.type === 'text' && part.text.trim());

              // Only show bouncing dots if streaming but no assistant content yet
              return isStreaming && !hasAssistantContent ? (
                <Message from="assistant">
                  <MessageAvatar
                    src="/avatar-ai.png"
                    name="AI"
                  />
                  <MessageContent variant="flat">
                    <div className="py-2">
                      <BouncingDots />
                    </div>
                  </MessageContent>
                </Message>
              ) : null;
            })()}

            {/* Error State */}
            {error && (
              <div className="flex justify-center p-4">
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg px-4 py-3 max-w-md">
                  <p className="text-sm font-medium text-red-400 mb-1">
                    Something went wrong
                  </p>
                  <p className="text-xs text-red-300/80">{error.message}</p>
                </div>
              </div>
            )}
          </ConversationContent>
        </Conversation>

        {/* Input Area */}
        <div className="border-t border-gray-800 p-4">
          <PromptInput
            onSubmit={handleSendMessage}
            className="border-0"
            accept="image/*"
            multiple
          >
            <PromptInputBody>
              <div className="bg-white/5 rounded-lg p-3">
                <PromptInputTextarea
                  placeholder={conversationId ? 'Ask me anything...' : 'Initializing...'}
                  className="bg-transparent border-0 text-white placeholder-gray-500 p-0 min-h-[40px] mb-2"
                  disabled={!conversationId || status !== 'ready'}
                />
                <div className="flex items-center justify-between">
                  <AttachButton />
                  <div className="flex items-center gap-2">
                    {(status === 'submitted' || status === 'streaming') && (
                      <button
                        type="button"
                        onClick={() => stop()}
                        className="text-xs text-gray-400 hover:text-gray-300"
                      >
                        Stop
                      </button>
                    )}
                    <PromptInputSubmit
                      status={status}
                      size="icon"
                      className="rounded-lg bg-purple-600 text-white hover:bg-purple-700 h-7 w-7 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!conversationId || status !== 'ready'}
                    />
                  </div>
                </div>
              </div>
            </PromptInputBody>
          </PromptInput>
        </div>
      </div>
    </PromptInputProvider>
  );
}
