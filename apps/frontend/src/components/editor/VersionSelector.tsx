import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { projectService } from '@/services/project';

interface VersionSelectorProps {
  projectId: string;
  conversationId?: string;
  onVersionChange?: (commitSha: string) => void;
}

interface GitCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  timestamp: number;
}

/**
 * VersionSelector component - Dropdown select for version selection based on git commits
 *
 * Features:
 * - Fetches real git commit history from API
 * - Displays commits with user-friendly labels
 * - Shows warning dialog before reverting to previous version
 * - Dark theme styling with accessible keyboard navigation
 */
export function VersionSelector({
  projectId,
  conversationId: _conversationId, // eslint-disable-line @typescript-eslint/no-unused-vars
  onVersionChange,
}: VersionSelectorProps) {
  const [selectedCommitSha, setSelectedCommitSha] = useState<string>('');
  const [pendingCommitSha, setPendingCommitSha] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch commit history using react-query
  const { data: commits = [], isLoading } = useQuery<GitCommit[]>({
    queryKey: ['project-commits', projectId],
    queryFn: () => projectService.getProjectCommits(projectId),
    enabled: !!projectId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get current commit (latest one)
  const currentCommit = commits[0];
  const currentCommitSha = currentCommit?.sha || '';

  // Format commit message for display
  const formatCommitLabel = (commit: GitCommit, index: number): string => {
    if (index === 0) {
      return `Current - ${commit.message}`;
    }

    // Parse timestamp to show relative time
    const now = Date.now();
    const diff = now - commit.timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    let timeAgo = '';
    if (days > 0) {
      timeAgo = `${days}d ago`;
    } else if (hours > 0) {
      timeAgo = `${hours}h ago`;
    } else {
      timeAgo = 'recently';
    }

    return `${timeAgo} - ${commit.message}`;
  };

  const handleValueChange = (value: string) => {
    // If selecting the current version, no need for warning
    if (value === currentCommitSha) {
      setSelectedCommitSha(value);
      return;
    }

    // Show warning dialog for reverting to older version
    setPendingCommitSha(value);
    setIsDialogOpen(true);
  };

  const handleConfirmRevert = () => {
    setSelectedCommitSha(pendingCommitSha);
    setIsDialogOpen(false);
    onVersionChange?.(pendingCommitSha);
  };

  const handleCancelRevert = () => {
    setPendingCommitSha('');
    setIsDialogOpen(false);
  };

  if (isLoading || !currentCommit) {
    return (
      <div className="w-[200px] bg-gray-800/50 border border-gray-700 text-gray-500 text-xs rounded px-2 h-6 flex items-center">
        Loading versions...
      </div>
    );
  }

  return (
    <>
      <Select
        value={selectedCommitSha || currentCommitSha}
        onValueChange={handleValueChange}
      >
        <SelectTrigger className="w-[200px] bg-gray-800/50 border-gray-700 text-gray-300 text-xs h-6 px-2 py-0">
          <SelectValue placeholder="Select version" />
        </SelectTrigger>
        <SelectContent className="bg-gray-900 border-gray-800 text-white max-h-[400px]">
          {commits.map((commit, index) => (
            <SelectItem
              key={commit.sha}
              value={commit.sha}
              className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer text-xs"
            >
              {formatCommitLabel(commit, index)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Warning Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">
              Revert to Previous Version?
            </DialogTitle>
            <DialogDescription className="text-gray-400 space-y-2">
              <p>You are about to revert your project to a previous version.</p>
              <p>
                The selected version will be restored, and any unsaved changes
                will be lost. Your conversation history and context may become
                stale.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancelRevert}
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmRevert}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Revert to Selected Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
