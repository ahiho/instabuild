/**
 * Deployment Accounts List - Display connected accounts
 */

import { Github, Cloud } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { DeploymentAccount } from '../../types/deployment';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { useDeployment } from '../../hooks/useDeployment';

interface DeploymentAccountsListProps {
  accounts: DeploymentAccount[];
  isLoading: boolean;
  onAddGitHub: () => void;
  onAddCloudflare: () => void;
}

export function DeploymentAccountsList({
  accounts,
  isLoading,
  onAddGitHub,
  onAddCloudflare,
}: DeploymentAccountsListProps) {
  const { disconnectAccount } = useDeployment();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [accountToDelete, setAccountToDelete] =
    useState<DeploymentAccount | null>(null);

  const handleDisconnect = async (accountId: string) => {
    setDeletingId(accountId);
    try {
      await disconnectAccount(accountId);
      toast.success('Account disconnected');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to disconnect account'
      );
    } finally {
      setDeletingId(null);
      setAccountToDelete(null);
    }
  };

  const githubAccounts = accounts.filter(acc => acc.type === 'GITHUB');
  const cloudflareAccounts = accounts.filter(acc => acc.type === 'CLOUDFLARE');

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
        <p className="text-gray-400 mt-4">Loading accounts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* GitHub Account Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Github className="h-5 w-5 text-gray-400" />
          <h2 className="text-xl font-semibold text-white">GitHub Account</h2>
        </div>

        {githubAccounts.length === 0 ? (
          <Card className="border-gray-800">
            <CardContent className="pt-8 pb-8">
              <p className="text-gray-400 text-center mb-4">
                No GitHub account connected
              </p>
              <div className="flex justify-center">
                <Button onClick={onAddGitHub} variant="outline" size="sm">
                  Connect GitHub Account
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {githubAccounts.map(account => (
              <Card
                key={account.id}
                className="border-gray-800 hover:border-purple-600 transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Github className="h-4 w-4" />
                        {account.username || account.email}
                      </CardTitle>
                      <CardDescription className="text-gray-400 text-sm mt-1">
                        Connected{' '}
                        {new Date(account.connectedAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setAccountToDelete(account)}
                      disabled={deletingId === account.id}
                    >
                      {deletingId === account.id
                        ? 'Disconnecting...'
                        : 'Disconnect'}
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Cloudflare Account Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Cloud className="h-5 w-5 text-gray-400" />
          <h2 className="text-xl font-semibold text-white">
            Cloudflare Account
          </h2>
        </div>

        {cloudflareAccounts.length === 0 ? (
          <Card className="border-gray-800">
            <CardContent className="pt-8 pb-8">
              <p className="text-gray-400 text-center mb-4">
                No Cloudflare account connected
              </p>
              <div className="flex justify-center">
                <Button onClick={onAddCloudflare} variant="outline" size="sm">
                  Connect Cloudflare Account
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {cloudflareAccounts.map(account => (
              <Card
                key={account.id}
                className="border-gray-800 hover:border-purple-600 transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Cloud className="h-4 w-4" />
                        {account.organization || account.email}
                      </CardTitle>
                      <CardDescription className="text-gray-400 text-sm mt-1">
                        {account.email} • Connected{' '}
                        {new Date(account.connectedAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setAccountToDelete(account)}
                      disabled={deletingId === account.id}
                    >
                      {deletingId === account.id
                        ? 'Disconnecting...'
                        : 'Disconnect'}
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Empty State */}
      {accounts.length === 0 && !isLoading && (
        <Card className="border-gray-800">
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <div className="text-4xl mb-4">🔐</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                No accounts connected
              </h3>
              <p className="text-gray-400 mb-6">
                Connect your GitHub and Cloudflare accounts to enable
                deployments
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={onAddGitHub}>Connect GitHub</Button>
                <Button onClick={onAddCloudflare} variant="outline">
                  Connect Cloudflare
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disconnect Confirmation Dialog */}
      <Dialog
        open={!!accountToDelete}
        onOpenChange={open => !open && setAccountToDelete(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Disconnect Account?</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect your{' '}
              {accountToDelete?.type === 'GITHUB' ? 'GitHub' : 'Cloudflare'}{' '}
              account ({accountToDelete?.email})? You can reconnect it later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setAccountToDelete(null)}
              disabled={deletingId !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                accountToDelete && handleDisconnect(accountToDelete.id)
              }
              disabled={deletingId !== null}
            >
              {deletingId ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
