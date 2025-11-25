/**
 * Connect GitHub Account Dialog - OAuth flow for GitHub authentication
 */

import { Github } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

interface ConnectGitHubAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectGitHubAccountDialog({
  open,
  onOpenChange,
}: ConnectGitHubAccountDialogProps) {
  const handleStartOAuth = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const redirectUri =
      import.meta.env.VITE_GITHUB_REDIRECT_URI ||
      `${window.location.origin}/deployment/callback`;
    const state = Math.random().toString(36).substring(7);

    if (!clientId) {
      toast.error(
        'GitHub OAuth is not configured. Please check environment variables.'
      );
      return;
    }

    // Store state in sessionStorage for validation
    sessionStorage.setItem('github_oauth_state', state);

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=repo,workflow`;

    window.location.href = authUrl;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Connect GitHub Account
          </DialogTitle>
          <DialogDescription>
            Link your GitHub account to enable deployments to GitHub Pages
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-blue-400 text-sm">
              We'll request access to your repositories for creating and pushing
              deployment files. Your source code remains private.
            </p>
          </div>

          <Button
            onClick={handleStartOAuth}
            className="w-full flex items-center justify-center gap-2"
          >
            <Github className="h-4 w-4" />
            Connect with GitHub
          </Button>

          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Cancel
          </Button>

          <div className="text-xs text-gray-500 space-y-2 pt-2">
            <p>Required scopes:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>repo - Full control of repositories</li>
              <li>workflow - Update workflow files</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
