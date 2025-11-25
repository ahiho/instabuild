/**
 * NewConversationButton - Button for creating new conversations
 */

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { conversationService } from '../../services/project';
import type { Conversation } from '../../types/project';
import { Button, type ButtonProps } from '../ui/button';

interface NewConversationButtonProps extends Omit<ButtonProps, 'onClick'> {
  projectId: string;
  onConversationCreated?: (conversation: Conversation) => void;
  onSidebarClose?: () => void;
}

export function NewConversationButton({
  projectId,
  onConversationCreated,
  onSidebarClose,
  children,
  ...buttonProps
}: NewConversationButtonProps) {
  const { success, error } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    try {
      setIsCreating(true);
      const idempotencyKey = `new-conv-${Date.now()}-${Math.random()}`;
      const newConversation = await conversationService.createConversation({
        projectId,
        idempotencyKey,
      });

      success('Conversation Created', 'New conversation started successfully');

      // Notify parent component
      onConversationCreated?.(newConversation);

      // Close sidebar
      onSidebarClose?.();
    } catch (err) {
      error(
        'Creation Failed',
        err instanceof Error ? err.message : 'Failed to create conversation'
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Button
      size="icon"
      onClick={handleCreate}
      disabled={isCreating}
      {...buttonProps}
    >
      {children || <Plus className="h-4 w-4" />}
    </Button>
  );
}
