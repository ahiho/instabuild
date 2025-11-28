import { useCallback } from 'react';
import { useChat, type UseChatOptions, type UIMessage } from '@ai-sdk/react';

interface ChatWithTitleUpdateOptions extends Omit<UseChatOptions<unknown>, 'onFinish'> {
  conversationId?: string;
  onTitleUpdate?: (newTitle: string) => void;
  onFinish?: (options: {
    message: UIMessage;
    messages: UIMessage[];
    isAbort: boolean;
    isDisconnect: boolean;
    isError: boolean;
  }) => void;
}

/**
 * Custom hook that wraps useChat and handles conversation title updates
 * Fetches the updated conversation after chat completes to get the new title
 */
export function useChatWithTitleUpdate(options: ChatWithTitleUpdateOptions) {
  const { conversationId, onTitleUpdate } = options;

  // Create a wrapped onFinish handler that fetches updated conversation
  const wrappedOnFinish = useCallback(
    async (finishOptions: {
      message: UIMessage;
      messages: UIMessage[];
      isAbort: boolean;
      isDisconnect: boolean;
      isError: boolean;
    }) => {
      // Call the original onFinish if provided
      options.onFinish?.(finishOptions);

      // After chat finishes, fetch the conversation to get the updated title
      // This ensures we get the AI-generated title if it was created
      if (conversationId && !finishOptions.isError && !finishOptions.isAbort) {
        try {
          // Small delay to ensure backend has processed the message
          await new Promise(resolve => setTimeout(resolve, 500));

          const response = await fetch(
            `${import.meta.env.VITE_API_BASE_URL}/conversations/${conversationId}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
              },
            }
          );

          if (response.ok) {
            const data = (await response.json()) as {
              data: { title: string };
            };
            const newTitle = data.data.title;

            // Notify if title has changed (not the default "New Conversation")
            if (newTitle && newTitle !== 'New Conversation') {
              onTitleUpdate?.(newTitle);
            }
          }
        } catch (error) {
          console.warn('Failed to fetch updated conversation title:', error);
          // Non-blocking - don't throw, just warn
        }
      }
    },
    [conversationId, options, onTitleUpdate]
  );

  // Use the standard useChat hook
  return useChat({
    ...options,
    onFinish: wrappedOnFinish,
  });
}
