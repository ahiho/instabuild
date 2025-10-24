import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Sparkles, Copy, ThumbsUp, ThumbsDown, Paperclip } from 'lucide-react';
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

interface ChatPanelProps {
  pageId: string;
}

/**
 * ChatPanel - Professional AI chat interface using AI SDK Elements
 *
 * Features:
 * - Real-time streaming responses using AI SDK
 * - Auto-scroll conversation
 * - Code block rendering with syntax highlighting
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
  const { success } = useToast();

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: `${import.meta.env.VITE_API_BASE_URL}/pages/${pageId}/chat`,
    }),
  });

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    success('Copied to clipboard', 'Message copied successfully');
  };

  const renderMessageContent = (message: any) => {
    // Extract text from message parts
    const textContent = message.parts
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text)
      .join('');

    // Response component handles markdown and code blocks automatically via Streamdown
    return <Response>{textContent}</Response>;
  };

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
                  {renderMessageContent(message)}

                  {/* Message Actions (only for assistant messages) */}
                  {message.role === 'assistant' && (
                    <Actions className="mt-2">
                      <Action
                        tooltip="Copy message"
                        onClick={() => {
                          const text = message.parts
                            .filter((p: any) => p.type === 'text')
                            .map((p: any) => p.text)
                            .join('');
                          handleCopyMessage(text);
                        }}
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

            {/* Error State */}
            {error && (
              <div className="flex justify-center p-4">
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg px-4 py-3 max-w-md">
                  <p className="text-sm font-medium text-red-400 mb-1">
                    Something went wrong
                  </p>
                  <p className="text-xs text-red-300/80">
                    {error.message ||
                      'Failed to send message. Please try again.'}
                  </p>
                </div>
              </div>
            )}
          </ConversationContent>
        </Conversation>

        {/* Input Area */}
        <div className="border-t border-gray-800 p-4">
          <PromptInput
            onSubmit={(message: PromptInputMessage) => {
              if (message.text?.trim()) {
                sendMessage({ text: message.text });
              }
            }}
            className="border-0"
            accept="image/*"
            multiple
          >
            <PromptInputBody>
              <div className="bg-white/5 rounded-lg p-3">
                <PromptInputTextarea
                  placeholder="Ask me anything..."
                  className="bg-transparent border-0 text-white placeholder-gray-500 p-0 min-h-[40px] mb-2"
                />
                <div className="flex items-center justify-between">
                  <AttachButton />
                  <PromptInputSubmit
                    status={status}
                    size="icon"
                    className="rounded-lg bg-purple-600 text-white hover:bg-purple-700 h-7 w-7"
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
