/**
 * Configure Cloudflare Pages Dialog - Set up Cloudflare Pages deployment
 */

import { Cloud } from 'lucide-react';
import { useState } from 'react';
import type { DeploymentAccount } from '../../types/deployment';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useToast } from '../../hooks/useToast';
import { useDeployment } from '../../hooks/useDeployment';

interface ConfigureCloudflareDialogProps {
  projectId: string;
  accounts: DeploymentAccount[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConfigureCloudflareDialog({
  projectId,
  accounts,
  open,
  onOpenChange,
}: ConfigureCloudflareDialogProps) {
  const { createConfig, isLoading } = useDeployment(projectId);
  const { success, error } = useToast();

  const [accountId, setAccountId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [branch, setBranch] = useState('main');

  const handleCreate = async () => {
    if (!accountId || !projectName) {
      error('Validation error', 'Please fill in all required fields');
      return;
    }

    try {
      await createConfig({
        accountId,
        type: 'CLOUDFLARE_PAGES',
        cloudflareProjectName: projectName,
        cloudflareBranch: branch,
      });

      success(
        'Cloudflare Pages configured',
        `Deployment to ${projectName} is ready`
      );
      setAccountId('');
      setProjectName('');
      setBranch('main');
      onOpenChange(false);
    } catch (err) {
      error(
        'Failed to configure Cloudflare Pages',
        err instanceof Error ? err.message : 'Unknown error occurred'
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Configure Cloudflare Pages
          </DialogTitle>
          <DialogDescription>
            Set up automatic deployment to Cloudflare Pages
          </DialogDescription>
        </DialogHeader>

        {accounts.length === 0 ? (
          <div className="space-y-4">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-amber-400 text-sm">
                You need to connect a Cloudflare account first before
                configuring deployments.
              </p>
            </div>
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-blue-400 text-sm">
                We'll build your site and upload the built files to Cloudflare
                Pages. Your source code remains private and secure.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  Cloudflare Account *
                </label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="bg-gray-900 border-gray-800 text-white">
                    <SelectValue placeholder="Select your Cloudflare account" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-800">
                    {accounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.organization || account.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  Cloudflare Project Name *
                </label>
                <Input
                  placeholder="e.g., my-landing-page"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  disabled={isLoading}
                  className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-600"
                />
                <p className="text-xs text-gray-500 mt-2">
                  The Cloudflare Pages project name where your site will be
                  deployed
                </p>
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  Production Branch
                </label>
                <Select value={branch} onValueChange={setBranch}>
                  <SelectTrigger className="bg-gray-900 border-gray-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-800">
                    <SelectItem value="main">main</SelectItem>
                    <SelectItem value="master">master</SelectItem>
                    <SelectItem value="production">production</SelectItem>
                    <SelectItem value="deploy">deploy</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-2">
                  Branch considered as production (default: main)
                </p>
              </div>
            </div>

            <Button
              onClick={handleCreate}
              disabled={isLoading || !accountId || !projectName}
              className="w-full"
            >
              {isLoading ? 'Configuring...' : 'Configure Cloudflare Pages'}
            </Button>

            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
