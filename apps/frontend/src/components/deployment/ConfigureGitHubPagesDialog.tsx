/**
 * Configure GitHub Pages Dialog - Set up GitHub Pages deployment
 */

import { Github, ExternalLink, Info } from 'lucide-react';
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

interface ConfigureGitHubPagesDialogProps {
  projectId: string;
  accounts: DeploymentAccount[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConfigureGitHubPagesDialog({
  projectId,
  accounts,
  open,
  onOpenChange,
}: ConfigureGitHubPagesDialogProps) {
  const { createConfig, isLoading } = useDeployment(projectId);
  const { success, error } = useToast();

  const [accountId, setAccountId] = useState('');
  const [repoName, setRepoName] = useState('');
  const [branch, setBranch] = useState('gh-pages');
  const [useCustomDomain, setUseCustomDomain] = useState(false);
  const [customDomain, setCustomDomain] = useState('');

  const handleCreate = async () => {
    if (!accountId || !repoName) {
      error('Validation error', 'Please fill in all required fields');
      return;
    }

    // Validate custom domain if enabled
    if (useCustomDomain && customDomain) {
      // Basic domain validation - no protocol, no trailing slash
      const domainRegex =
        /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      if (!domainRegex.test(customDomain)) {
        error(
          'Invalid domain',
          'Please enter a valid domain without protocol (e.g., example.com)'
        );
        return;
      }
    }

    try {
      await createConfig({
        accountId,
        type: 'GITHUB_PAGES',
        githubRepo: repoName,
        githubBranch: branch,
        customDomain:
          useCustomDomain && customDomain ? customDomain : undefined,
      });

      success('GitHub Pages configured', `Deployment to ${repoName} is ready`);
      setAccountId('');
      setRepoName('');
      setBranch('gh-pages');
      setUseCustomDomain(false);
      setCustomDomain('');
      onOpenChange(false);
    } catch (err) {
      error(
        'Failed to configure GitHub Pages',
        err instanceof Error ? err.message : 'Unknown error occurred'
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Configure GitHub Pages
          </DialogTitle>
          <DialogDescription>
            Set up automatic deployment to GitHub Pages
          </DialogDescription>
        </DialogHeader>

        {accounts.length === 0 ? (
          <div className="space-y-4">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-amber-400 text-sm">
                You need to connect a GitHub account first before configuring
                deployments.
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
                We'll build your site and push the built files to your GitHub
                repository branch. Your source code remains private.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  GitHub Account *
                </label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="bg-gray-900 border-gray-800 text-white">
                    <SelectValue placeholder="Select your GitHub account" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-800">
                    {accounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.username || account.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  Repository Name *
                </label>
                <Input
                  placeholder="e.g., my-landing-page"
                  value={repoName}
                  onChange={e => setRepoName(e.target.value)}
                  disabled={isLoading}
                  className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-600"
                />
                <p className="text-xs text-gray-500 mt-2">
                  The repository where built files will be deployed
                </p>
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  Deploy Branch
                </label>
                <Select value={branch} onValueChange={setBranch}>
                  <SelectTrigger className="bg-gray-900 border-gray-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-800">
                    <SelectItem value="main">main</SelectItem>
                    <SelectItem value="master">master</SelectItem>
                    <SelectItem value="gh-pages">gh-pages</SelectItem>
                    <SelectItem value="deploy">deploy</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-2">
                  Branch to push built files to (default: gh-pages)
                </p>
              </div>

              {/* Custom Domain Configuration */}
              <div className="pt-2 border-t border-gray-800">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="useCustomDomain"
                    checked={useCustomDomain}
                    onChange={e => setUseCustomDomain(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-purple-600 focus:ring-purple-600 focus:ring-offset-gray-900"
                  />
                  <label
                    htmlFor="useCustomDomain"
                    className="text-sm text-gray-400 cursor-pointer"
                  >
                    Use custom domain
                  </label>
                </div>

                {!useCustomDomain && accountId && repoName && (
                  <div className="p-3 bg-gray-800/50 rounded-lg mb-3">
                    <p className="text-xs text-gray-400 mb-1">
                      Default GitHub Pages URL:
                    </p>
                    <p className="text-sm text-purple-400 font-mono">
                      {accounts.find(a => a.id === accountId)?.username ||
                        'username'}
                      .github.io/{repoName}
                    </p>
                  </div>
                )}

                {useCustomDomain && (
                  <>
                    <div className="mb-3">
                      <Input
                        placeholder="e.g., example.com or www.example.com"
                        value={customDomain}
                        onChange={e => setCustomDomain(e.target.value)}
                        disabled={isLoading}
                        className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-600"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Enter your domain without protocol (no https://)
                      </p>
                    </div>

                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-2">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-blue-400 space-y-2">
                          <p className="font-medium">
                            Configure DNS records for your domain:
                          </p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>
                              For apex domain (example.com): Add A records to
                              GitHub Pages IPs
                            </li>
                            <li>
                              For subdomain (www.example.com): Add CNAME record
                              pointing to{' '}
                              {accounts.find(a => a.id === accountId)
                                ?.username || 'username'}
                              .github.io
                            </li>
                          </ul>
                          <a
                            href="https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 mt-2"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View GitHub Pages custom domain docs
                          </a>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <Button
              onClick={handleCreate}
              disabled={isLoading || !accountId || !repoName}
              className="w-full"
            >
              {isLoading ? 'Configuring...' : 'Configure GitHub Pages'}
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
