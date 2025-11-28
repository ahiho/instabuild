import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChatPanel } from '../components/ChatPanel';
import { ConversationList } from '../components/conversation/ConversationList';
import { EditorLayout } from '../components/layout/EditorLayout';
import { PreviewPanel } from '../components/PreviewPanel';
import { SandboxLoadingUI } from '../components/sandbox/SandboxLoadingUI';
import { Card } from '../components/ui/card';
import { Collapsible, CollapsibleContent } from '../components/ui/collapsible';
import { useProject } from '../contexts/ProjectContext';
import { provisionSandboxWithRetry } from '../services/conversation';
import { conversationService } from '../services/project';
import type { Conversation } from '../types/project';

function EditorPageContent() {
  const { projectId, conversationId } = useParams<{
    projectId: string;
    conversationId: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentProject, projects } = useProject();
  const queryClient = useQueryClient();
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [isConversationListOpen, setIsConversationListOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  // Track if we've synced the project on initial load to avoid overwriting user selection
  const hasInitialSyncRef = useRef(false);

  // Get initial message from navigation state (set by Hero component)
  const initialMessage = (location.state as Record<string, unknown> | null)
    ?.initialMessage as string | undefined;

  // Sandbox provisioning state
  const [sandboxStatus, setSandboxStatus] = useState<
    'PENDING' | 'RETRYING' | 'READY' | 'FAILED' | null
  >(null);
  const [sandboxMessage, setSandboxMessage] = useState(
    'Preparing sandbox environment...'
  );
  const [sandboxError, setSandboxError] = useState<string | null>(null);
  const [showSandboxRetry, setShowSandboxRetry] = useState(false);
  const provisioningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousSandboxStatusRef = useRef<string | null | undefined>(undefined);

  const {
    data: conversation,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => conversationService.getConversation(conversationId!),
    enabled: !!conversationId,
    // Poll every 5 seconds to check for sandbox updates when not READY
    refetchInterval: data => {
      if (!data) return false;

      // Poll if:
      // 1. Sandbox is PENDING (being provisioned)
      // 2. Sandbox is FAILED (need to retry)
      // 3. Sandbox status is null/undefined (unknown state)
      const conversationData = data as unknown as Conversation;
      const shouldPoll =
        conversationData.project?.sandboxStatus === 'PENDING' ||
        conversationData.project?.sandboxStatus === 'FAILED' ||
        conversationData.project?.sandboxStatus === null ||
        conversationData.project?.sandboxStatus === undefined;

      if (shouldPoll) {
        console.log(
          '[EditorPage] Polling enabled, sandbox status:',
          conversationData.project?.sandboxStatus
        );
        return 5000;
      }

      return false;
    },
  });

  const handleToggleChat = () => {
    setIsChatVisible(prev => !prev);
  };

  const handleSandboxRetry = () => {
    console.log('[EditorPage] User clicked retry button');
    setSandboxStatus('RETRYING');
    setSandboxError(null);
    setShowSandboxRetry(false);
    // Trigger the provisioning effect again by refetching conversation
    queryClient.refetchQueries({ queryKey: ['conversation', conversationId] });
  };

  const handleConversationSelect = (conversation: Conversation | null) => {
    if (conversation) {
      // Navigate to editor with project and conversation ID in URL
      // Only navigate if we're switching to a different conversation
      if (conversationId !== conversation.id) {
        console.log(
          '[EditorPage] Navigating from',
          conversationId,
          'to',
          conversation.id
        );
        navigate(
          `/project/${conversation.projectId}/conversation/${conversation.id}`
        );
      } else {
        console.log('[EditorPage] Already on conversation', conversationId);
      }
    }
    setSelectedConversation(conversation);
  };

  const handleConversationTitleChange = (
    conversationId: string,
    newTitle: string
  ) => {
    if (selectedConversation?.id === conversationId) {
      setSelectedConversation(prev =>
        prev ? { ...prev, title: newTitle } : null
      );
    }
  };

  // Provision sandbox when conversation is loaded and not ready
  useEffect(() => {
    if (!conversation || !conversationId) return;

    const provisionSandboxIfNeeded = async () => {
      // Skip if sandbox is already READY
      if (conversation.project?.sandboxStatus === 'READY') {
        console.log('[EditorPage] Sandbox already ready');
        setSandboxStatus('READY');
        return;
      }

      // Show loading UI and start provisioning
      setSandboxStatus('PENDING');
      setSandboxMessage('Preparing sandbox environment...');
      setSandboxError(null);
      setShowSandboxRetry(false);

      // Set a timeout to show retry button after 35 seconds
      if (provisioningTimeoutRef.current) {
        clearTimeout(provisioningTimeoutRef.current);
      }
      provisioningTimeoutRef.current = setTimeout(() => {
        console.log(
          '[EditorPage] Sandbox provisioning taking longer than expected, showing retry button'
        );
        setShowSandboxRetry(true);
      }, 35000);

      console.log(
        '[EditorPage] Starting sandbox provisioning with polling for conversation',
        {
          conversationId,
          status: conversation.project?.sandboxStatus,
        }
      );

      try {
        const result = await provisionSandboxWithRetry(conversationId, {
          maxAttempts: 15, // 30 seconds total
          pollIntervalMs: 2000,
          onStatusChange: (status, message) => {
            setSandboxMessage(message || 'Preparing sandbox environment...');
          },
        });

        // Clear timeout since provisioning succeeded
        if (provisioningTimeoutRef.current) {
          clearTimeout(provisioningTimeoutRef.current);
        }

        console.log('[EditorPage] Sandbox provisioning succeeded:', result);
        setSandboxStatus('READY');

        // Immediately refetch conversation to get updated sandbox info
        // This is crucial after provisioning to update the preview panel
        await queryClient.refetchQueries({
          queryKey: ['conversation', conversationId],
        });
      } catch (error) {
        // Clear timeout on error
        if (provisioningTimeoutRef.current) {
          clearTimeout(provisioningTimeoutRef.current);
        }

        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(
          '[EditorPage] Sandbox provisioning failed:',
          errorMessage
        );
        setSandboxStatus('FAILED');
        setSandboxError(`Failed to provision sandbox: ${errorMessage}`);
        setShowSandboxRetry(true);
      }
    };

    provisionSandboxIfNeeded();

    // Cleanup timeout on unmount
    return () => {
      if (provisioningTimeoutRef.current) {
        clearTimeout(provisioningTimeoutRef.current);
      }
    };
  }, [conversation, conversationId, queryClient]);

  // Monitor for sandbox crashes/stops and automatically attempt restart
  useEffect(() => {
    if (!conversation || !conversationId) return;

    // Check if sandbox was previously READY but is now not ready (crashed/stopped)
    const wasPreviouslyReady = previousSandboxStatusRef.current === 'READY';
    const isNowNotReady =
      conversation.project?.sandboxStatus !== 'READY' &&
      conversation.project?.sandboxStatus !== undefined &&
      conversation.project?.sandboxStatus !== null;

    if (wasPreviouslyReady && isNowNotReady) {
      console.log(
        '[EditorPage] Detected sandbox crash/stop, attempting automatic restart',
        {
          previousStatus: previousSandboxStatusRef.current,
          currentStatus: conversation.project?.sandboxStatus,
        }
      );

      // Automatically attempt to restart the sandbox
      setSandboxStatus('PENDING');
      setSandboxMessage('Sandbox was stopped. Attempting to restart...');
      setSandboxError(null);
      setShowSandboxRetry(false);

      // Clear timeout if exists
      if (provisioningTimeoutRef.current) {
        clearTimeout(provisioningTimeoutRef.current);
      }

      // Attempt restart with polling
      provisionSandboxWithRetry(conversationId, {
        maxAttempts: 15,
        pollIntervalMs: 2000,
        onStatusChange: (status, message) => {
          setSandboxMessage(message || 'Attempting to restart sandbox...');
        },
      })
        .then(result => {
          if (provisioningTimeoutRef.current) {
            clearTimeout(provisioningTimeoutRef.current);
          }
          console.log('[EditorPage] Sandbox restart successful:', result);
          setSandboxStatus('READY');
          queryClient.refetchQueries({
            queryKey: ['conversation', conversationId],
          });
        })
        .catch(error => {
          if (provisioningTimeoutRef.current) {
            clearTimeout(provisioningTimeoutRef.current);
          }
          console.error('[EditorPage] Sandbox restart failed:', error);
          setSandboxStatus('FAILED');
          setSandboxError(
            `Failed to restart sandbox: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          setShowSandboxRetry(true);
        });
    }

    // Update the ref for next comparison
    previousSandboxStatusRef.current = conversation.project?.sandboxStatus;

    return () => {
      if (provisioningTimeoutRef.current) {
        clearTimeout(provisioningTimeoutRef.current);
      }
    };
  }, [conversation, conversationId, queryClient]);

  // Periodic health check and keepalive for READY sandboxes
  // - Detects if sandbox has stopped running
  // - Updates lastAccessedAt to prevent idle container cleanup (30min threshold)
  // - Only runs when page is visible to reduce unnecessary requests
  useEffect(() => {
    if (
      !conversation?.project?.sandboxStatus ||
      conversation.project.sandboxStatus !== 'READY' ||
      !conversationId
    ) {
      return;
    }

    // Check page visibility to pause keepalive when tab is hidden
    const isPageVisible = () => !document.hidden;

    const healthCheckInterval = setInterval(() => {
      if (isPageVisible()) {
        console.log(
          '[EditorPage] Running periodic sandbox health check and keepalive'
        );
        queryClient.refetchQueries({
          queryKey: ['conversation', conversationId],
        });
      } else {
        console.log(
          '[EditorPage] Page hidden, skipping health check/keepalive'
        );
      }
    }, 300000); // Every 5 minutes (keeps lastAccessedAt fresh, well under 30min idle threshold)

    return () => clearInterval(healthCheckInterval);
  }, [conversation?.project?.sandboxStatus, conversationId, queryClient]);

  // Auto-select conversation based on URL parameter
  useEffect(() => {
    if (
      conversation &&
      (!selectedConversation || selectedConversation.id !== conversation.id)
    ) {
      console.log(
        '[EditorPage] Auto-selecting conversation from URL:',
        conversation.id
      );
      setSelectedConversation(conversation);
    }
  }, [conversation, selectedConversation]);

  // Update currentProject when conversation is first loaded to ensure correct project context
  // Validate that the URL projectId matches the conversation's projectId
  useEffect(() => {
    if (
      conversation &&
      conversation.projectId &&
      projectId &&
      !hasInitialSyncRef.current
    ) {
      // Validate URL projectId matches conversation's projectId
      if (conversation.projectId !== projectId) {
        console.error(
          '[EditorPage] URL projectId does not match conversation projectId',
          {
            urlProjectId: projectId,
            conversationProjectId: conversation.projectId,
          }
        );
        navigate('/dashboard');
        return;
      }

      // Find the project that matches this conversation's projectId
      const conversationProject = projects.find(
        p => p.id === conversation.projectId
      );

      if (conversationProject) {
        console.log(
          '[EditorPage] Initial sync: Setting currentProject to match conversation projectId:',
          conversationProject.id
        );
        setCurrentProject(conversationProject);
        hasInitialSyncRef.current = true;
      }
    }
  }, [conversation, projectId, projects, setCurrentProject, navigate]); // Only trigger on conversation or projects list change

  // Reset selected conversation when project changes (via URL)
  useEffect(() => {
    setSelectedConversation(null);
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-lg text-white">Loading conversation...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-red-400">
          Error loading conversation: {error.message}
        </div>
      </div>
    );
  }

  if (!conversation || !conversationId) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-gray-400">Conversation not found</div>
      </div>
    );
  }

  // Determine if we should show the sandbox loading UI in the preview panel
  const showSandboxLoadingInPreview =
    sandboxStatus === 'PENDING' ||
    sandboxStatus === 'RETRYING' ||
    sandboxStatus === 'FAILED';

  return (
    <EditorLayout
      isChatVisible={isChatVisible}
      chatPanel={
        <div className="relative h-full">
          {/* Backdrop overlay when sidebar is open */}
          {isConversationListOpen && (
            <div
              className="absolute inset-0 bg-black/50 z-10 transition-opacity duration-300"
              onClick={() => setIsConversationListOpen(false)}
            />
          )}

          {/* Floating Conversation List Sidebar */}
          <Collapsible
            open={isConversationListOpen}
            onOpenChange={setIsConversationListOpen}
            className="absolute left-0 top-0 bottom-0 z-20 flex flex-col"
          >
            <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left duration-300 h-full flex flex-col">
              <Card className="w-52 md:w-72 h-full bg-black/95 backdrop-blur-sm border-gray-800 border-r border-l-0 rounded-none shadow-2xl">
                <ConversationList
                  onConversationSelect={handleConversationSelect}
                  selectedConversationId={selectedConversation?.id}
                  onSidebarClose={() => setIsConversationListOpen(false)}
                />
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Chat Panel - Full width, no shifting */}
          <Card className="h-full bg-black/40 backdrop-blur-sm border-gray-800 rounded-none">
            <ChatPanel
              conversation={selectedConversation}
              onConversationTitleChange={handleConversationTitleChange}
              isConversationListOpen={isConversationListOpen}
              onToggleConversationList={() =>
                setIsConversationListOpen(!isConversationListOpen)
              }
              isLoadingConversation={isLoading}
              initialMessage={initialMessage}
              sandboxStatus={sandboxStatus}
            />
          </Card>
        </div>
      }
      previewPanel={
        <Card className="h-full bg-black/40 backdrop-blur-sm border-gray-800 rounded-none">
          <div className="h-full">
            {showSandboxLoadingInPreview ? (
              <SandboxLoadingUI
                status={sandboxStatus === 'RETRYING' ? 'RETRYING' : 'PENDING'}
                message={
                  sandboxError
                    ? `${sandboxError}\n\nPlease try again.`
                    : sandboxMessage
                }
                onRetry={handleSandboxRetry}
                showRetryButton={showSandboxRetry}
              />
            ) : (
              <PreviewPanel
                pageId={conversationId}
                projectId={conversation.projectId}
                conversationId={conversationId}
                currentVersion={undefined}
                sandboxPublicUrl={conversation.project?.sandboxPublicUrl}
                onToggleChat={handleToggleChat}
                isChatVisible={isChatVisible}
              />
            )}
          </div>
        </Card>
      }
    />
  );
}

export function EditorPage() {
  return <EditorPageContent />;
}
