import { useChat, type UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import {
  Copy,
  Loader2,
  Paperclip,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { getToolMetadata } from '../lib/tool-metadata';
import { useToast } from '../hooks/useToast';
import {
  getConversationMessages,
  getOrCreateConversation,
} from '../services/conversation';
import { Action, Actions } from './ai-elements/actions';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from './ai-elements/conversation';
import { Message, MessageAvatar, MessageContent } from './ai-elements/message';
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from './ai-elements/prompt-input';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from './ai-elements/reasoning';
import { Response } from './ai-elements/response';
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from './ai-elements/tool';
import { usePromptInputAttachments } from './ai-elements/use-prompt-input';

interface ChatPanelProps {
  pageId: string;
}

/**
 * Renders different types of message parts from AI SDK using proper AI elements
 */
function renderMessagePart(part: UIMessage['parts'][0], index: number, toolCall?: Record<string, unknown>) {
  // Handle text parts
  if (part.type === 'text') {
    return <Response key={index}>{part.text}</Response>;
  }

  // Handle tool-result parts (saved from database - these are the results of executed tools)
  if (part.type === 'tool-result') {
    const resultPart = part as Record<string, unknown>;
    const toolCallId = String(resultPart.toolCallId || '');
    const toolName = String(resultPart.toolName || '');
    const toolMetadata = getToolMetadata(toolName);

    // Tool results are completed by definition
    const displayState: 'input-streaming' | 'input-available' | 'output-available' | 'output-error' =
      resultPart.error ? 'output-error' : 'output-available';

    return (
      <Tool key={index} isError={displayState === 'output-error'}>
        <ToolHeader
          title={toolMetadata.displayName}
          type={`tool-${toolName}` as `tool-${string}`}
          state={displayState}
          description={toolMetadata.description}
        />
        <ToolContent>
          {/* Show input parameters from the corresponding tool-call */}
          {toolCall?.input && (
            <ToolInput input={toolCall.input} />
          )}
          {/* Show output result */}
          {!!(resultPart.output || resultPart.error) && (
            <ToolOutput
              output={resultPart.output}
              errorText={resultPart.error as string | undefined}
            />
          )}
        </ToolContent>
      </Tool>
    );
  }

  // Handle tool-call parts (tool-* types) using the Tool component
  if (part.type.startsWith('tool-')) {
    const toolPart = part as Record<string, unknown>; // Tool parts from AI SDK

    // Extract tool name from either:
    // 1. toolName property (if explicitly provided by backend)
    // 2. type property (e.g., "tool-glob" -> "glob") from Vercel AI SDK dynamic tools
    let toolName = String(toolPart.toolName || '');
    if (!toolName && part.type.startsWith('tool-')) {
      toolName = part.type.substring(5); // Remove "tool-" prefix to get the actual tool name
    }

    const toolMetadata = getToolMetadata(toolName);

    // Determine the actual state based on:
    // 1. Vercel AI SDK state property
    // 2. Output success field (if success: false, show error even if state says output-available)
    let displayState: 'input-streaming' | 'input-available' | 'output-available' | 'output-error' =
      (toolPart.state as
        | 'input-streaming'
        | 'input-available'
        | 'output-available'
        | 'output-error') || 'input-available';

    // Check if output indicates failure
    const output = toolPart.output as Record<string, unknown> | undefined;
    if (
      displayState === 'output-available' &&
      output &&
      typeof output === 'object' &&
      output.success === false
    ) {
      displayState = 'output-error';
    }

    return (
      <Tool key={index} isError={displayState === 'output-error'}>
        <ToolHeader
          title={toolMetadata.displayName}
          type={part.type as `tool-${string}`}
          state={displayState}
          description={toolMetadata.description}
        />
        <ToolContent>
          {!!toolPart.input && <ToolInput input={toolPart.input} />}
          {!!(toolPart.output || toolPart.errorText) && (
            <ToolOutput
              output={toolPart.output}
              errorText={toolPart.errorText as string}
            />
          )}
        </ToolContent>
      </Tool>
    );
  }

  // Handle confirmation parts
  if (part.type === 'confirmation') {
    const confirmationPart = part as Record<string, unknown>;
    return (
      <div
        key={index}
        className="my-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-yellow-500">⚠️</span>
          <span className="font-medium text-sm text-yellow-400">
            Confirmation Required
          </span>
        </div>
        <p className="text-sm text-yellow-200 mb-3">
          {String(confirmationPart.message || 'Please confirm this action')}
        </p>
        <div className="flex gap-2">
          <button className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 rounded">
            Cancel
          </button>
          <button className="px-3 py-1 text-xs bg-yellow-600 hover:bg-yellow-700 rounded">
            Confirm
          </button>
        </div>
      </div>
    );
  }

  // Handle reasoning parts using the Reasoning component
  if (part.type === 'reasoning') {
    const reasoningPart = part as Record<string, unknown>;
    return (
      <Reasoning key={index} isStreaming={false}>
        <ReasoningTrigger />
        <ReasoningContent>
          {String(reasoningPart.text || reasoningPart.reasoning || '')}
        </ReasoningContent>
      </Reasoning>
    );
  }

  // Handle progress parts for multi-step execution
  if (part.type === 'progress') {
    const progressPart = part as Record<string, unknown>;
    const currentStep = Number(progressPart.currentStep || 0);
    const totalSteps = Number(progressPart.totalSteps || 1);
    const progressPercentage = Math.round((currentStep / totalSteps) * 100);

    return (
      <div
        key={index}
        className="my-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-blue-400">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-xs text-blue-300">{progressPercentage}%</span>
        </div>
        <div className="w-full bg-blue-900/30 rounded-full h-2 mb-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="text-sm text-blue-200">
          {String(
            progressPart.action || progressPart.description || 'Processing...'
          )}
        </p>
      </div>
    );
  }

  // Handle file parts
  if (part.type === 'file') {
    const filePart = part as Record<string, unknown>;
    return (
      <div key={index} className="my-2 p-3 bg-muted rounded-md">
        <p className="text-sm text-muted-foreground">
          📎 File: {String(filePart.name || 'Unknown file')}
        </p>
      </div>
    );
  }

  // For any other part types, just return null or a simple fallback
  return null;
}

/**
 * ChatPanel - Professional AI chat interface using AI SDK
 *
 * Features:
 * - AI SDK integration with useChat hook
 * - Streaming AI responses
 * - Message persistence and conversation management
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

  // Initialize conversation and load messages
  const initConversation = useCallback(async () => {
    try {
      setIsLoadingConversation(true);
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
  }, [pageId, showError]);

  // Get or create conversation and load messages on mount
  useEffect(() => {
    initConversation();
  }, [initConversation]);

  // Use AI SDK's useChat hook with custom transport
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
      body: {
        conversationId,
      },
    }),
  });

  // Merge initial messages with chat messages
  // useChat replaces initial messages when streaming, so we need to preserve them
  // Only include new messages that were added by useChat (after initial load)
  const mergedMessages = (() => {
    if (initialMessages.length === 0) {
      return chatMessages;
    }

    if (chatMessages.length === 0) {
      return initialMessages;
    }

    // Find messages that are in chatMessages but not in initialMessages
    // This represents the new messages sent in this session
    const initialIds = new Set(initialMessages.map(m => m.id));
    const newMessages = chatMessages.filter(m => !initialIds.has(m.id));

    // If no new messages were added by useChat, just return initial (page refresh case)
    if (newMessages.length === 0) {
      return initialMessages;
    }

    // Return initial messages + new messages added in this session
    return [...initialMessages, ...newMessages];
  })();

  const messages = mergedMessages;

  // Log message state for debugging
  useEffect(() => {
    console.log('[ChatPanel] Messages state:', {
      initialMessages: initialMessages.length,
      chatMessages: chatMessages.length,
      mergedMessages: mergedMessages.length,
      displayedMessages: messages.length,
      conversationId,
    });
  }, [
    initialMessages.length,
    chatMessages.length,
    mergedMessages.length,
    messages.length,
    conversationId,
  ]);

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
      await sendMessage({
        text: message.text.trim(),
      });
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
              // Extract text content for copy functionality
              const textContent = message.parts
                .filter(part => part.type === 'text')
                .map(part => (part.type === 'text' ? part.text : ''))
                .join('');

              // When tool-result is in the same message as tool-call (merged from backend),
              // skip rendering the tool-call since tool-result shows the complete execution
              const toolResultIds = new Set(
                message.parts
                  .filter((part: any) => part.type === 'tool-result')
                  .map((part: any) => part.toolCallId)
              );

              // Create a map of tool-calls by ID for reference
              const toolCallsById = new Map(
                message.parts
                  .filter((part: any) => part.type === 'tool-call')
                  .map((part: any) => [part.toolCallId, part])
              );

              const partsToRender = message.parts.filter((part: any) => {
                // Skip tool-call if we have a corresponding tool-result (they're merged)
                if (
                  part.type === 'tool-call' &&
                  toolResultIds.has(part.toolCallId)
                ) {
                  return false;
                }
                return true;
              });

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
                    {/* Render all message parts */}
                    <div className="space-y-2">
                      {partsToRender.map((part, index) => {
                        // For tool-result parts, also pass the corresponding tool-call for input display
                        if (part.type === 'tool-result') {
                          const toolCall = toolCallsById.get((part as any).toolCallId);
                          return renderMessagePart(part, index, toolCall);
                        }
                        return renderMessagePart(part, index);
                      })}
                    </div>

                    {/* Message Actions (only for assistant messages with text content) */}
                    {message.role === 'assistant' && textContent && (
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
              const isStreaming =
                status === 'submitted' || status === 'streaming';
              const lastMessage = messages[messages.length - 1];
              const hasAssistantContent =
                lastMessage?.role === 'assistant' &&
                lastMessage.parts?.some(
                  part => part.type === 'text' && part.text.trim()
                );

              // Only show bouncing dots if streaming but no assistant content yet
              return isStreaming && !hasAssistantContent ? (
                <Message from="assistant">
                  <MessageAvatar src="/avatar-ai.png" name="AI" />
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
                  <p className="text-xs text-red-300/80 mb-3">{error.message}</p>
                  {error.message?.toLowerCase().includes('sandbox') && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => window.location.reload()}
                        className="text-xs px-3 py-1 bg-red-600/50 hover:bg-red-600 rounded text-red-200 transition-colors"
                      >
                        Refresh Page
                      </button>
                      <button
                        onClick={() => {
                          // Clear conversation and retry
                          setConversationId('');
                          setInitialMessages([]);
                          setIsLoadingConversation(true);
                          initConversation();
                        }}
                        className="text-xs px-3 py-1 bg-red-600/50 hover:bg-red-600 rounded text-red-200 transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  )}
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
                  placeholder={
                    conversationId ? 'Ask me anything...' : 'Initializing...'
                  }
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
