/**
 * Connect Cloudflare Account Dialog - API token authentication
 */

import { Cloud, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { useDeployment } from '../../hooks/useDeployment';

interface ConnectCloudflareAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectCloudflareAccountDialog({
  open,
  onOpenChange,
}: ConnectCloudflareAccountDialogProps) {
  const { connectCloudflare, isLoading } = useDeployment();
  const [apiToken, setApiToken] = useState('');
  const [connected, setConnected] = useState(false);

  const getFriendlyErrorMessage = (error: string): string => {
    if (
      error.includes('unauthorized') ||
      error.includes('invalid') ||
      error.includes('401')
    ) {
      return 'Invalid API token. Please check your token and try again.';
    }
    if (
      error.includes('permission') ||
      error.includes('forbidden') ||
      error.includes('403')
    ) {
      return "Your API token doesn't have the required permissions. Please check the token permissions.";
    }
    if (error.includes('network') || error.includes('timeout')) {
      return 'Network error. Please check your connection and try again.';
    }
    return 'Unable to connect. Please verify your API token and try again.';
  };

  const handleConnect = async () => {
    if (!apiToken) {
      toast.error('Please enter your Cloudflare API token');
      return;
    }

    try {
      const account = await connectCloudflare(apiToken);
      toast.success(`Connected as ${account.email}`);
      setConnected(true);
      setApiToken('');

      // Close dialog after 1 second
      setTimeout(() => {
        setConnected(false);
        onOpenChange(false);
      }, 1000);
    } catch (err) {
      const rawError = err instanceof Error ? err.message : 'Unknown error';
      const friendlyMessage = getFriendlyErrorMessage(rawError);
      toast.error(friendlyMessage);
    }
  };

  const handleReset = () => {
    setApiToken('');
    setConnected(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Connect Cloudflare Account
          </DialogTitle>
          <DialogDescription>
            Link your Cloudflare account to deploy to Cloudflare Pages
          </DialogDescription>
        </DialogHeader>

        {connected ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 font-medium">
                ✓ Connection successful
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Your Cloudflare account has been connected
              </p>
            </div>
            <Button onClick={handleReset} className="w-full">
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-blue-400 text-sm">
                Enter your Cloudflare API Token to connect
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  API Token *
                </label>
                <Input
                  type="password"
                  placeholder="Paste your API token here"
                  value={apiToken}
                  onChange={e => setApiToken(e.target.value)}
                  disabled={isLoading}
                  className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-600"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Your token is securely stored and never shared
                </p>
              </div>
            </div>

            <Button
              onClick={handleConnect}
              disabled={isLoading || !apiToken}
              className="w-full"
            >
              {isLoading ? 'Verifying...' : 'Connect Account'}
            </Button>

            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isLoading}
              className="w-full"
            >
              Cancel
            </Button>

            <div className="space-y-3 pt-2 border-t border-gray-800">
              <p className="text-sm text-gray-400">
                Need to create an API Token?
              </p>
              <a
                href="https://dash.cloudflare.com/profile/api-tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                Go to Cloudflare Dashboard
                <ExternalLink className="h-3 w-3" />
              </a>

              <div className="text-xs text-gray-600 space-y-2">
                <p className="font-medium text-gray-400">
                  Steps to create a token:
                </p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Go to your Cloudflare profile</li>
                  <li>Click API Tokens section</li>
                  <li>Create a token with Cloudflare Pages permission</li>
                  <li>Copy the token and paste it above</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
