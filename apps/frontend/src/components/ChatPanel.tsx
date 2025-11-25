import { useChat, type UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import {
  Copy,
  Edit3,
  Loader2,
  MessageSquareText,
  Paperclip,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useToast } from '../hooks/useToast';
import { getToolMetadata } from '../lib/tool-metadata';
import { conversationService } from '../services/project';
import type { Conversation as ConversationType } from '../types/project';
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
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '../lib/utils';
import { ThinkingStep } from './chat/ThinkingStep';

interface ChatPanelProps {
  conversation?: ConversationType | null;
  onConversationTitleChange?: (
    conversationId: string,
    newTitle: string
  ) => void;
  className?: string;
  isConversationListOpen?: boolean;
  onToggleConversationList?: () => void;
  isLoadingConversation?: boolean;
}

/**
 * Renders different types of message parts from AI SDK using proper AI elements
 */
function renderMessagePart(
  part: UIMessage['parts'][0],
  index: number,
  toolCall?: Record<string, unknown>
) {
  // Handle text parts
  if (part.type === 'text') {
    return <Response key={index}>{part.text}</Response>;
  }

  // Handle tool-result parts (saved from database - these are the results of executed tools)
  if (part.type === 'tool-result') {
    const resultPart = part as Record<string, unknown>;
    // Get toolName from the result part itself, or from the corresponding tool-call if provided
    const toolName = String(resultPart.toolName || toolCall?.toolName || '');

    // Special handling for 'think' tool - render with custom ThinkingStep component
    if (toolName === 'think' && toolCall?.input) {
      const input = toolCall.input as Record<string, unknown>;
      return (
        <ThinkingStep
          key={index}
          observation={String(input.observation || '')}
          next_step={String(input.next_step || '')}
          task_progress={String(input.task_progress || '')}
          completion_checklist={
            input.completion_checklist
              ? (input.completion_checklist as {
                  all_features_implemented: boolean;
                  validation_passing: boolean;
                  no_todos_or_placeholders: boolean;
                  ready_for_user: boolean;
                })
              : undefined
          }
        />
      );
    }

    const toolMetadata = getToolMetadata(toolName);

    // Tool results are completed by definition
    const displayState:
      | 'input-streaming'
      | 'input-available'
      | 'output-available'
      | 'output-error' = resultPart.error ? 'output-error' : 'output-available';

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
          {toolCall?.input && <ToolInput input={toolCall.input} />}
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

    // Special handling for 'think' tool - render with custom ThinkingStep component
    if (toolName === 'think' && toolPart.input) {
      const input = toolPart.input as Record<string, unknown>;
      return (
        <ThinkingStep
          key={index}
          observation={String(input.observation || '')}
          next_step={String(input.next_step || '')}
          task_progress={String(input.task_progress || '')}
          completion_checklist={
            input.completion_checklist
              ? (input.completion_checklist as {
                  all_features_implemented: boolean;
                  validation_passing: boolean;
                  no_todos_or_placeholders: boolean;
                  ready_for_user: boolean;
                })
              : undefined
          }
        />
      );
    }

    const toolMetadata = getToolMetadata(toolName);

    // Determine the actual state based on:
    // 1. Vercel AI SDK state property
    // 2. Output success field (if success: false, show error even if state says output-available)
    let displayState:
      | 'input-streaming'
      | 'input-available'
      | 'output-available'
      | 'output-error' =
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
 * ChatPanel - Professional AI chat interface using AI SDK with project-based conversations
 *
 * Features:
 * - Project-based conversation management
 * - AI SDK integration with useChat hook
 * - Streaming AI responses
 * - Message persistence and conversation management
 * - Message actions (copy, like, dislike)
 * - Conversation title editing
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

/**
 * ConversationHeader - Header component with conversation title and edit functionality
 */
function ConversationHeader({
  conversation,
  onTitleChange,
  isConversationListOpen,
  onToggleConversationList,
}: {
  conversation: ConversationType;
  onTitleChange?: (newTitle: string) => void;
  isConversationListOpen?: boolean;
  onToggleConversationList?: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);
  const { success, error } = useToast();

  const handleSaveTitle = async () => {
    if (!editTitle.trim() || editTitle.trim() === conversation.title) {
      setIsEditing(false);
      setEditTitle(conversation.title);
      return;
    }

    try {
      await conversationService.updateConversation(conversation.id, {
        title: editTitle.trim(),
      });

      success('Title Updated', 'Conversation title has been updated');
      setIsEditing(false);
      onTitleChange?.(editTitle.trim());
    } catch (err) {
      error(
        'Update Failed',
        err instanceof Error
          ? err.message
          : 'Failed to update conversation title'
      );
      setEditTitle(conversation.title);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditTitle(conversation.title);
    setIsEditing(false);
  };

  return (
    <div className="flex items-center justify-between border-b border-gray-800 px-4 h-12">
      {isEditing ? (
        <div className="flex items-center gap-2 flex-1">
          <Input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            className="h-8 text-sm"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                handleSaveTitle();
              } else if (e.key === 'Escape') {
                handleCancelEdit();
              }
            }}
            autoFocus
          />
          <Button size="sm" onClick={handleSaveTitle}>
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
            Cancel
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            {!isConversationListOpen && onToggleConversationList && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-gray-400 hover:text-gray-300"
                onClick={onToggleConversationList}
                title="Open conversation list"
              >
                <MessageSquareText className="h-4 w-4" />
              </Button>
            )}
            <h2 className="text-sm font-medium text-white truncate">
              {conversation.title}
            </h2>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-gray-400 hover:text-gray-300"
            onClick={() => setIsEditing(true)}
          >
            <Edit3 className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}

export function ChatPanel({
  conversation,
  onConversationTitleChange,
  className,
  isConversationListOpen,
  onToggleConversationList,
  isLoadingConversation,
}: ChatPanelProps) {
  const { success, error: showError } = useToast();
  const { currentProject } = useProject();
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Load conversation messages when conversation changes
  const loadMessages = useCallback(async () => {
    if (!conversation) {
      setInitialMessages([]);
      return;
    }

    try {
      setIsLoadingMessages(true);
      console.log(
        '[ChatPanel] Loading messages for conversation:',
        conversation.id
      );

      // Load previous messages using the new conversation service
      const messages = await conversationService.getConversationMessages(
        conversation.id
      );
      console.log('[ChatPanel] Loaded messages:', messages.length);
      setInitialMessages(messages);
    } catch (err) {
      console.error('Failed to load conversation messages:', err);
      showError('Load Error', 'Failed to load conversation messages');
      setInitialMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [conversation, showError]);

  // Load messages when conversation changes
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Use AI SDK's useChat hook with custom transport
  const {
    messages: chatMessages,
    sendMessage,
    status,
    error,
    stop,
  } = useChat({
    id: conversation?.id || '',
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: `${import.meta.env.VITE_API_BASE_URL}/chat`,
      headers: () => {
        const token = localStorage.getItem('accessToken');
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
      },
      body: {
        conversationId: conversation?.id,
        projectId: currentProject?.id,
      },
    }),
  });

  // Merge initial messages with chat messages
  const mergedMessages = (() => {
    if (initialMessages.length === 0) {
      return chatMessages;
    }

    if (chatMessages.length === 0) {
      return initialMessages;
    }

    // Find messages that are in chatMessages but not in initialMessages
    const initialIds = new Set(initialMessages.map(m => m.id));
    const newMessages = chatMessages.filter(m => !initialIds.has(m.id));

    // If no new messages were added by useChat, just return initial
    if (newMessages.length === 0) {
      return initialMessages;
    }

    // Return initial messages + new messages added in this session
    return [...initialMessages, ...newMessages];
  })();

  const messages = mergedMessages;

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
    if (message.text?.trim() && conversation) {
      await sendMessage({
        text: message.text.trim(),
      });
    }
  };

  const handleTitleChange = (newTitle: string) => {
    if (conversation) {
      onConversationTitleChange?.(conversation.id, newTitle);
    }
  };

  // Show loading state while loading conversation data from parent
  if (isLoadingConversation) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-purple-500 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-400">Loading conversation...</p>
        </div>
      </div>
    );
  }

  // Show empty state when no conversation is selected
  if (!conversation) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <Sparkles
            className="h-12 w-12 text-muted-foreground mx-auto mb-4"
            strokeWidth={1.2}
          />
          <h3 className="text-lg font-medium text-white mb-2">
            No Conversation Selected
          </h3>
          <p className="text-sm text-gray-400">
            Select a conversation from the sidebar to start chatting
          </p>
        </div>
      </div>
    );
  }

  // Show loading state while loading messages
  if (isLoadingMessages) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <ConversationHeader
          conversation={conversation}
          onTitleChange={handleTitleChange}
          isConversationListOpen={isConversationListOpen}
          onToggleConversationList={onToggleConversationList}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-purple-500 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-400">Loading conversation...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PromptInputProvider>
      <div className={`flex flex-col h-full ${className}`}>
        {/* Conversation Header */}
        <ConversationHeader
          conversation={conversation}
          onTitleChange={handleTitleChange}
          isConversationListOpen={isConversationListOpen}
          onToggleConversationList={onToggleConversationList}
        />

        {/* Conversation Area */}
        <Conversation className="flex-1">
          <ConversationContent className="min-h-full flex flex-col">
            {/* Empty State */}
            {messages.length === 0 && (
              <div className="flex-1 flex items-center">
                <ConversationEmptyState
                  icon={<Sparkles className="h-12 w-12" strokeWidth={1.2} />}
                  title="AI Conversation"
                  description="Start chatting with AI about your project. Ask questions, request changes, or get help with your work."
                />
              </div>
            )}

            {/* Messages */}
            {messages.map((message, msgIndex) => {
              // Skip messages with role='tool' - these are tool results that should be
              // merged into the assistant message display (AI SDK v5 creates separate messages)
              // Type assertion is safe here as backend returns messages with role='tool'
              if ((message.role as string) === 'tool') {
                return null;
              }

              // Extract text content for copy functionality
              const textContent = message.parts
                .filter(part => part.type === 'text')
                .map(part => (part.type === 'text' ? part.text : ''))
                .join('');

              // For assistant messages with tool-calls, find corresponding tool-results
              // from subsequent 'tool' messages and merge them for display
              const toolResultsFromToolMessages = new Map<
                string,
                UIMessage['parts'][number]
              >();

              if (message.role === 'assistant') {
                // Look ahead for tool messages that contain results for this assistant's tool calls
                for (let i = msgIndex + 1; i < messages.length; i++) {
                  const nextMsg = messages[i];
                  // Check for tool role using type assertion since UIMessage doesn't include 'tool'
                  if ((nextMsg.role as string) === 'tool') {
                    // Extract tool-result parts and map by toolCallId
                    nextMsg.parts
                      .filter(part => part.type === 'tool-result')
                      .forEach(part => {
                        if (part.type === 'tool-result') {
                          toolResultsFromToolMessages.set(
                            part.toolCallId,
                            part
                          );
                        }
                      });
                  } else if (nextMsg.role === 'assistant') {
                    // Stop at the next assistant message (different turn)
                    break;
                  }
                }
              }

              // When tool-result is in the same message as tool-call (merged from backend),
              // skip rendering the tool-call since tool-result shows the complete execution
              const toolResultIds = new Set(
                message.parts
                  .filter(part => part.type === 'tool-result')
                  .map(part =>
                    part.type === 'tool-result' ? part.toolCallId : ''
                  )
              );

              // Create a map of tool-calls by ID for reference
              const toolCallsById = new Map(
                message.parts
                  .filter(part => part.type === 'tool-call')
                  .map(part =>
                    part.type === 'tool-call'
                      ? [part.toolCallId, part]
                      : ['', part]
                  )
              );

              const partsToRender = message.parts.filter(part => {
                // Skip tool-call if we have a corresponding tool-result IN THE SAME MESSAGE
                // (The rendering logic will handle merging tool-calls with results from tool messages)
                if (
                  part.type === 'tool-call' &&
                  toolResultIds.has(part.toolCallId)
                ) {
                  return false;
                }
                // Keep tool-call parts that have results in tool messages - they'll be merged during rendering
                return true;
              });

              return (
                <Message key={message.id} from={message.role}>
                  <MessageContent
                    variant="flat"
                    className={cn(message.role === 'assistant' && 'w-full')}
                  >
                    {/* Render all message parts */}
                    <div className="space-y-2">
                      {partsToRender.map((part, index) => {
                        // Create a unique key using message ID + part index + part type
                        const uniqueKey = `${message.id}-part-${index}-${part.type}`;

                        // For tool-call parts, check if we have a result from a tool message
                        if (part.type === 'tool-call') {
                          const toolResult = toolResultsFromToolMessages.get(
                            part.toolCallId
                          );
                          if (toolResult) {
                            // Render the complete tool execution with input from tool-call
                            // and output from tool-result (from separate tool message)
                            return (
                              <div key={uniqueKey}>
                                {renderMessagePart(toolResult, index, part)}
                              </div>
                            );
                          }
                          // No result yet, render just the tool-call (streaming state)
                          return (
                            <div key={uniqueKey}>
                              {renderMessagePart(part, index)}
                            </div>
                          );
                        }

                        // For tool-result parts in the same message, pass the corresponding tool-call
                        if (part.type === 'tool-result') {
                          const toolCall = toolCallsById.get(part.toolCallId);
                          return (
                            <div key={uniqueKey}>
                              {renderMessagePart(part, index, toolCall)}
                            </div>
                          );
                        }

                        // For all other parts, render normally
                        return (
                          <div key={uniqueKey}>
                            {renderMessagePart(part, index)}
                          </div>
                        );
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
                  <p className="text-xs text-red-300/80 mb-3">
                    {error.message}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.location.reload()}
                      className="text-xs px-3 py-1 bg-red-600/50 hover:bg-red-600 rounded text-red-200 transition-colors"
                    >
                      Refresh Page
                    </button>
                    <button
                      onClick={() => loadMessages()}
                      className="text-xs px-3 py-1 bg-red-600/50 hover:bg-red-600 rounded text-red-200 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
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
                    conversation
                      ? 'Ask me anything...'
                      : 'Select a conversation to start chatting...'
                  }
                  className="bg-transparent border-0 text-white placeholder-gray-500 p-0 min-h-[40px] mb-2"
                  disabled={!conversation || status !== 'ready'}
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
                      disabled={!conversation || status !== 'ready'}
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
