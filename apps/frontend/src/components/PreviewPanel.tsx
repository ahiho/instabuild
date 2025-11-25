import { LandingPageVersion } from '@instabuild/shared';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  ExternalLink,
  PanelLeft,
  PanelLeftClose,
  RefreshCw,
  Rocket,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { addMessage } from '../services/conversation';
import { projectService } from '../services/project';
import { DeploymentDialog } from './deployment/DeploymentDialog';
import { VersionSelector } from './editor/VersionSelector';
import { Button } from './ui/button';

interface PreviewPanelProps {
  projectId?: string;
  conversationId?: string;
  currentVersion?: LandingPageVersion;
  sandboxPublicUrl?: string;
  onToggleChat?: () => void;
  isChatVisible?: boolean;
}

export function PreviewPanel({
  projectId,
  conversationId,
  sandboxPublicUrl,
  onToggleChat,
  isChatVisible = true,
}: PreviewPanelProps) {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [showDeployDialog, setShowDeployDialog] = useState<boolean>(false);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('[PreviewPanel] Sandbox URL updated:', sandboxPublicUrl);

    if (sandboxPublicUrl) {
      setPreviewUrl(sandboxPublicUrl);
      // Add to history when URL changes
      setNavigationHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(sandboxPublicUrl);
        return newHistory;
      });
      setHistoryIndex(prev => prev + 1);
    } else {
      setPreviewUrl('');
    }
  }, [sandboxPublicUrl, historyIndex]);

  const handleReload = () => {
    setIframeKey(prev => prev + 1);
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setPreviewUrl(navigationHistory[newIndex]);
    }
  };

  const handleForward = () => {
    if (historyIndex < navigationHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setPreviewUrl(navigationHistory[newIndex]);
    }
  };

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < navigationHistory.length - 1;

  const handleVersionChange = async (commitSha: string) => {
    if (!projectId || !conversationId) {
      console.error('Missing projectId or conversationId for version revert');
      return;
    }

    console.log(
      'Reverting to commit:',
      commitSha,
      'for conversation:',
      conversationId
    );

    try {
      // Call the revert API
      const result = await projectService.revertProjectToCommit(
        projectId,
        commitSha,
        conversationId
      );

      if (result.success) {
        console.log('Successfully reverted to commit:', commitSha);

        // Reload the preview iframe to show the reverted code
        setIframeKey(prev => prev + 1);

        // Invalidate queries to refresh commit history
        queryClient.invalidateQueries({
          queryKey: ['project-commits', projectId],
        });

        // Send system message to chat panel about the revert
        try {
          await addMessage(conversationId, 'system', [
            {
              type: 'text',
              text: `⚠️ Project Version Reverted\n\nThe project has been reverted to commit ${commitSha.substring(0, 7)}. All files in the workspace have been reset to this version.\n\n**Important:** The previous conversation context may be stale as the code has changed. When working with files, please re-read them to get the current content.\n\nMessage: ${result.message}`,
            },
          ]);
          console.log('Added revert notification message to chat');
        } catch (messageError) {
          console.error('Failed to add revert message to chat:', messageError);
          // Don't fail the revert if message addition fails
        }
      } else {
        console.error('Failed to revert:', result.message);
        alert(`Failed to revert: ${result.message}`);
      }
    } catch (error) {
      console.error('Error reverting to commit:', error);
      alert('An error occurred while reverting to the selected version');
    }
  };

  const handleCopyUrl = async () => {
    if (!previewUrl) return;
    try {
      await navigator.clipboard.writeText(previewUrl);
      toast.success('URL copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy URL to clipboard');
      console.error('Failed to copy URL:', err);
    }
  };

  const handleOpenInNewTab = () => {
    if (previewUrl && previewUrl !== 'preview://landing-page') {
      window.open(previewUrl, '_blank');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Browser Controls */}
      <div className="border-b border-gray-800 px-1.5 h-9 flex items-center">
        <div className="flex items-center gap-1 w-full">
          {/* Toggle Chat Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleChat}
            className="h-6 w-6 text-gray-400 hover:text-white hover:bg-gray-800"
            aria-label={isChatVisible ? 'Hide chat panel' : 'Show chat panel'}
          >
            {isChatVisible ? (
              <PanelLeftClose className="h-3 w-3" />
            ) : (
              <PanelLeft className="h-3 w-3" />
            )}
          </Button>

          {/* Navigation Buttons */}
          <div className="flex gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              disabled={!canGoBack}
              className="h-6 w-6 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Go back"
            >
              <ArrowLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleForward}
              disabled={!canGoForward}
              className="h-6 w-6 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Go forward"
            >
              <ArrowRight className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReload}
              className="h-6 w-6 text-gray-400 hover:text-white hover:bg-gray-800"
              aria-label="Reload"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>

          {/* URL Bar */}
          <div className="flex-1 relative h-6">
            <input
              type="text"
              value={previewUrl}
              onChange={e => setPreviewUrl(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 text-gray-300 text-xs rounded px-2 py-0.5 pr-12 focus:outline-none focus:ring-1 focus:ring-gray-600 h-full"
              readOnly
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              <button
                onClick={handleCopyUrl}
                disabled={!previewUrl}
                className="p-0.5 text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Copy URL"
                title="Copy URL"
                type="button"
              >
                <Copy className="h-3 w-3" />
              </button>
              <button
                onClick={handleOpenInNewTab}
                disabled={
                  !previewUrl || previewUrl === 'preview://landing-page'
                }
                className="p-0.5 text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Open in new tab"
                title="Open in new tab"
                type="button"
              >
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Version Selector */}
          {projectId && (
            <VersionSelector
              projectId={projectId}
              conversationId={conversationId}
              onVersionChange={handleVersionChange}
            />
          )}

          {/* Deploy Button */}
          {projectId && (
            <Button
              variant="default"
              onClick={() => setShowDeployDialog(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white h-6 px-2 text-xs"
              aria-label="Deploy project"
              title="Deploy project"
            >
              <Rocket className="size-2.5" strokeWidth={1.5} /> Deploy
            </Button>
          )}
        </div>
      </div>

      {/* Deployment Dialog */}
      {projectId && (
        <DeploymentDialog
          open={showDeployDialog}
          onOpenChange={setShowDeployDialog}
          projectId={projectId}
        />
      )}

      {/* Preview */}
      <div className="flex-1 bg-gray-900">
        {previewUrl ? (
          <iframe
            key={iframeKey}
            src={previewUrl}
            className="w-full h-full border-0"
            title="Landing Page Preview"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-4">📄</div>
              <p className="text-gray-400">No preview available</p>
              <p className="text-sm text-gray-500">
                Create a page to see the preview
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
