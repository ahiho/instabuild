import { useState, useEffect } from 'react';
import { Sparkles, Copy, ThumbsUp, ThumbsDown, Paperclip, WifiOff, Loader2 } from 'lucide-react';
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
import { useChat } from '../hooks/useChat';
import { getOrCreateConversation } from '../services/conversation';

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
  const [isLoadingConversation, setIsLoadingConversation] = useState(true);

  // Get or create conversation on mount
  useEffect(() => {
    const initConversation = async () => {
      try {
        console.log('[ChatPanel] Getting conversation for pageId:', pageId);
        const id = await getOrCreateConversation(pageId);
        console.log('[ChatPanel] Got conversationId:', id);
        setConversationId(id);
      } catch (err) {
        console.error('Failed to initialize conversation:', err);
        showError('Connection Error', 'Failed to initialize chat');
      } finally {
        setIsLoadingConversation(false);
      }
    };

    initConversation();
  }, [pageId, showError]);

  const {
    messages,
    sendMessage,
    isStreaming,
    connectionState,
    error,
    reconnect,
  } = useChat(conversationId);

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    success('Copied to clipboard', 'Message copied successfully');
  };

  const handleSendMessage = (message: PromptInputMessage) => {
    if (message.text?.trim() && conversationId) {
      sendMessage(message.text.trim());
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
        {/* Connection Status Banner */}
        {connectionState === 'disconnected' && (
          <div className="bg-orange-500/10 border-b border-orange-500/50 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-orange-400">
              <WifiOff className="h-4 w-4" />
              <span>Disconnected</span>
            </div>
            <button
              onClick={reconnect}
              className="text-xs text-orange-300 hover:text-orange-200 underline"
            >
              Reconnect
            </button>
          </div>
        )}

        {connectionState === 'connecting' && (
          <div className="bg-blue-500/10 border-b border-blue-500/50 px-4 py-2">
            <div className="flex items-center gap-2 text-sm text-blue-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Connecting...</span>
            </div>
          </div>
        )}

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
            {messages.map(message => (
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
                  <Response>{message.content}</Response>

                  {/* Message Actions (only for assistant messages) */}
                  {message.role === 'assistant' && (
                    <Actions className="mt-2">
                      <Action
                        tooltip="Copy message"
                        onClick={() => handleCopyMessage(message.content)}
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
            ))}

            {/* Streaming Indicator */}
            {isStreaming && (
              <div className="flex justify-center p-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>AI is typing...</span>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="flex justify-center p-4">
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg px-4 py-3 max-w-md">
                  <p className="text-sm font-medium text-red-400 mb-1">
                    Something went wrong
                  </p>
                  <p className="text-xs text-red-300/80">{error}</p>
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
            disabled={connectionState !== 'connected' || isStreaming}
          >
            <PromptInputBody>
              <div className="bg-white/5 rounded-lg p-3">
                <PromptInputTextarea
                  placeholder={
                    connectionState === 'connected'
                      ? 'Ask me anything...'
                      : 'Connecting to chat...'
                  }
                  className="bg-transparent border-0 text-white placeholder-gray-500 p-0 min-h-[40px] mb-2"
                  disabled={connectionState !== 'connected' || isStreaming}
                />
                <div className="flex items-center justify-between">
                  <AttachButton />
                  <PromptInputSubmit
                    status={isStreaming ? 'in_progress' : 'awaiting_message'}
                    size="icon"
                    className="rounded-lg bg-purple-600 text-white hover:bg-purple-700 h-7 w-7 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={connectionState !== 'connected'}
                  />
                </div>
              </div>
            </PromptInputBody>
          </PromptInput>
        </div>
      </div>
    </PromptInputProvider>
  );
}
