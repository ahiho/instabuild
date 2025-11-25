/**
 * Deployment Accounts Page - Manage global GitHub and Cloudflare accounts
 */

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { AppHeader } from '../components/layout/AppHeader';
import { ConnectCloudflareAccountDialog } from '../components/deployment/ConnectCloudflareAccountDialog';
import { ConnectGitHubAccountDialog } from '../components/deployment/ConnectGitHubAccountDialog';
import { DeploymentAccountsList } from '../components/deployment/DeploymentAccountsList';
import { Button } from '../components/ui/button';
import { useDeployment } from '../hooks/useDeployment';

export function DeploymentAccountsPage() {
  const { accounts, accountsLoading, accountsError } = useDeployment();
  const [showGitHubDialog, setShowGitHubDialog] = useState(false);
  const [showCloudflareDialog, setShowCloudflareDialog] = useState(false);

  // Debug logging
  console.log('DeploymentAccountsPage - accounts:', accounts);
  console.log('DeploymentAccountsPage - loading:', accountsLoading);
  console.log('DeploymentAccountsPage - error:', accountsError);

  // Check which accounts are connected
  const hasGitHubAccount = accounts.some(acc => acc.type === 'GITHUB');
  const hasCloudflareAccount = accounts.some(acc => acc.type === 'CLOUDFLARE');

  return (
    <div className="min-h-screen bg-black">
      <AppHeader />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Deployment Accounts
            </h1>
            <p className="text-gray-400">
              Connect your GitHub and Cloudflare accounts for deployments
            </p>
          </div>
        </div>

        {/* Debug Error Display */}
        {accountsError && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 font-semibold">
              Error loading accounts:
            </p>
            <p className="text-red-300 text-sm mt-1">
              {accountsError instanceof Error
                ? accountsError.message
                : 'Unknown error'}
            </p>
          </div>
        )}

        {/* Account List */}
        <DeploymentAccountsList
          accounts={accounts}
          isLoading={accountsLoading}
          onAddGitHub={() => setShowGitHubDialog(true)}
          onAddCloudflare={() => setShowCloudflareDialog(true)}
        />

        {/* Quick Add Buttons - Only show if accounts not connected */}
        {!hasGitHubAccount && !hasCloudflareAccount && (
          <div className="mt-8 flex gap-4">
            {!hasGitHubAccount && (
              <Button
                onClick={() => setShowGitHubDialog(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add GitHub Account
              </Button>
            )}
            {!hasCloudflareAccount && (
              <Button
                onClick={() => setShowCloudflareDialog(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Cloudflare Account
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ConnectGitHubAccountDialog
        open={showGitHubDialog}
        onOpenChange={setShowGitHubDialog}
      />
      <ConnectCloudflareAccountDialog
        open={showCloudflareDialog}
        onOpenChange={setShowCloudflareDialog}
      />
    </div>
  );
}
