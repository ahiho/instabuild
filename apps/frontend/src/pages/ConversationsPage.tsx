/**
 * ConversationsPage - Shows conversations for a specific project
 */

import { ArrowLeft, MessageSquare, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AppHeader } from '../components/layout/AppHeader';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { useProject } from '../contexts/ProjectContext';
import { conversationService } from '../services/project';
import type { Conversation } from '../types/project';

export function ConversationsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, setCurrentProject } = useProject();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currentProject = projects.find(p => p.id === projectId);

  // Set current project when viewing this project's conversations
  useEffect(() => {
    if (currentProject) {
      setCurrentProject(currentProject);
    }
  }, [currentProject, setCurrentProject]);

  const handleCreateConversation = useCallback(async () => {
    if (!projectId) return;

    try {
      const idempotencyKey = `conv-page-${Date.now()}-${Math.random()}`;
      const newConversation = await conversationService.createConversation({
        projectId,
        title: 'New Conversation',
        idempotencyKey,
      });

      // Navigate to the editor with the new conversation
      navigate(`/project/${projectId}/conversation/${newConversation.id}`);
    } catch (err) {
      console.error('Failed to create conversation:', err);
      toast.error('Failed to create conversation', {
        description: err instanceof Error ? err.message : 'Please try again',
      });
    }
  }, [projectId, navigate]);

  useEffect(() => {
    const loadConversations = async () => {
      if (!projectId) return;

      try {
        setIsLoading(true);
        const projectConversations =
          await conversationService.getProjectConversations(projectId);

        // Sort by last update time (most recent first)
        const sortedConversations = projectConversations.sort(
          (a, b) =>
            new Date(b.lastUpdateTime).getTime() -
            new Date(a.lastUpdateTime).getTime()
        );

        setConversations(sortedConversations);

        // If no conversations, auto-create the first one
        if (sortedConversations.length === 0) {
          await handleCreateConversation();
        }
      } catch (err) {
        console.error('Failed to load conversations:', err);
        toast.error('Failed to load conversations', {
          description: err instanceof Error ? err.message : 'Please try again',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, [projectId, handleCreateConversation]);

  const handleConversationClick = (conversationId: string) => {
    if (!projectId) return;
    navigate(`/project/${projectId}/conversation/${conversationId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-black">
      <AppHeader />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {currentProject?.name || 'Project'}
              </h1>
              <p className="text-gray-400">Conversations</p>
            </div>
          </div>
          <Button
            onClick={handleCreateConversation}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Conversation
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
            <p className="text-gray-400 mt-4">Loading conversations...</p>
          </div>
        )}

        {/* Conversations List */}
        {!isLoading && conversations.length > 0 && (
          <div className="space-y-4">
            {conversations.map(conversation => (
              <Card
                key={conversation.id}
                className="border-gray-800 hover:border-purple-600 transition-colors cursor-pointer group"
                onClick={() => handleConversationClick(conversation.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white text-lg group-hover:text-purple-400 transition-colors flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        {conversation.title}
                      </CardTitle>
                      <CardDescription className="mt-2 text-gray-400 text-sm">
                        Last updated {formatDate(conversation.lastUpdateTime)}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    {conversation.messageCount !== undefined && (
                      <span>{conversation.messageCount} messages</span>
                    )}
                    {conversation.project?.sandboxStatus && (
                      <span className="flex items-center gap-1">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            conversation.project.sandboxStatus === 'running'
                              ? 'bg-green-500'
                              : 'bg-gray-500'
                          }`}
                        />
                        {conversation.project.sandboxStatus}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
