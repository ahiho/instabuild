/**
 * ConversationList - Component for displaying a list of conversations in a project
 */

import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import { useToast } from '../../hooks/useToast';
import { conversationService } from '../../services/project';
import type { Conversation } from '../../types/project';
import { ConversationItem } from './ConversationItem';
import { NewConversationButton } from './NewConversationButton';

interface ConversationListProps {
  onConversationSelect?: (conversation: Conversation) => void;
  selectedConversationId?: string;
  className?: string;
  onSidebarClose?: () => void;
}

export function ConversationList({
  onConversationSelect,
  selectedConversationId,
  className,
  onSidebarClose,
}: ConversationListProps) {
  const { currentProject } = useProject();
  const { error } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load conversations when project changes
  useEffect(() => {
    const loadConversations = async () => {
      if (!currentProject) {
        setConversations([]);
        return;
      }

      try {
        setIsLoading(true);
        const projectConversations =
          await conversationService.getProjectConversations(currentProject.id);

        // Sort by last update time (most recent first)
        const sortedConversations = projectConversations.sort(
          (a, b) =>
            new Date(b.lastUpdateTime).getTime() -
            new Date(a.lastUpdateTime).getTime()
        );

        setConversations(sortedConversations);
      } catch (err) {
        console.error('Failed to load conversations:', err);
        error(
          'Load Error',
          err instanceof Error ? err.message : 'Failed to load conversations'
        );
        setConversations([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, [currentProject, error]);

  const handleConversationCreated = (newConversation: Conversation) => {
    setConversations(prev => [newConversation, ...prev]);
    onConversationSelect?.(newConversation);
  };

  const handleConversationUpdated = (updatedConversation: Conversation) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === updatedConversation.id ? updatedConversation : conv
      )
    );
  };

  const handleConversationDeleted = (conversationId: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== conversationId));

    // If the deleted conversation was selected, clear selection
    if (selectedConversationId === conversationId) {
      onConversationSelect?.(conversations[0] || null);
    }
  };

  if (!currentProject) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-8 text-center ${className}`}
      >
        <h3 className="text-lg font-medium mb-2">No Project Selected</h3>
        <p className="text-sm text-muted-foreground">
          Select a project to view conversations
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Loading conversations...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">Conversations</h2>
          <p className="text-sm text-muted-foreground">{currentProject.name}</p>
        </div>
        <NewConversationButton
          projectId={currentProject.id}
          onConversationCreated={handleConversationCreated}
          onSidebarClose={onSidebarClose}
        />
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <h3 className="text-lg font-medium mb-2">No Conversations</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start a new conversation to begin chatting with AI
            </p>
            <NewConversationButton
              projectId={currentProject.id}
              onConversationCreated={handleConversationCreated}
              onSidebarClose={onSidebarClose}
              variant="default"
            >
              <Plus className="h-4 w-4 mr-2" />
              Start Conversation
            </NewConversationButton>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {conversations.map(conversation => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedConversationId === conversation.id}
                onClick={() => onConversationSelect?.(conversation)}
                onUpdated={handleConversationUpdated}
                onDeleted={handleConversationDeleted}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
