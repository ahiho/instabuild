/**
 * Configure Deployment Dialog - Create deployment configuration for a project
 */

import { Github, Cloud } from 'lucide-react';
import { useState } from 'react';
import { useDeployment } from '../../hooks/useDeployment';
import { useToast } from '../../hooks/useToast';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

interface ConfigureDeploymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  accountType: 'GITHUB' | 'CLOUDFLARE';
}

export function ConfigureDeploymentDialog({
  open,
  onOpenChange,
  projectId,
  accountType,
}: ConfigureDeploymentDialogProps) {
  const { accounts, createConfig } = useDeployment(projectId);
  const { success, error } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  // GitHub Pages form state
  const [githubRepo, setGithubRepo] = useState('');
  const [githubBranch, setGithubBranch] = useState('gh-pages');

  // Cloudflare Pages form state
  const [cloudflareProjectName, setCloudflareProjectName] = useState('');
  const [cloudflareBranch, setCloudflareBranch] = useState('main');

  const account = accounts.find(acc => acc.type === accountType);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!account) {
      error('No account found', 'Please connect your account first');
      return;
    }

    setIsCreating(true);

    try {
      if (accountType === 'GITHUB') {
        if (!githubRepo.trim()) {
          error('Repository required', 'Please enter a repository name');
          return;
        }

        await createConfig({
          accountId: account.id,
          type: 'GITHUB_PAGES',
          githubRepo: githubRepo.trim(),
          githubBranch: githubBranch.trim() || 'gh-pages',
        });

        success(
          'GitHub deployment configured',
          `Your project will deploy to ${githubRepo}`
        );
      } else {
        if (!cloudflareProjectName.trim()) {
          error(
            'Project name required',
            'Please enter a Cloudflare project name'
          );
          return;
        }

        await createConfig({
          accountId: account.id,
          type: 'CLOUDFLARE_PAGES',
          cloudflareProjectName: cloudflareProjectName.trim(),
          cloudflareBranch: cloudflareBranch.trim() || 'main',
        });

        success(
          'Cloudflare deployment configured',
          `Your project will deploy to ${cloudflareProjectName}`
        );
      }

      // Reset form and close
      setGithubRepo('');
      setGithubBranch('gh-pages');
      setCloudflareProjectName('');
      setCloudflareBranch('main');
      onOpenChange(false);
    } catch (err) {
      error(
        'Failed to create deployment config',
        err instanceof Error ? err.message : 'Unknown error occurred'
      );
    } finally {
      setIsCreating(false);
    }
  };

  if (!account) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {accountType === 'GITHUB' ? (
              <>
                <Github className="h-5 w-5" />
                Configure GitHub Pages
              </>
            ) : (
              <>
                <Cloud className="h-5 w-5" />
                Configure Cloudflare Pages
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {accountType === 'GITHUB'
              ? 'Set up GitHub Pages deployment for this project'
              : 'Set up Cloudflare Pages deployment for this project'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreate} className="space-y-4">
          {accountType === 'GITHUB' ? (
            <>
              {/* GitHub Configuration */}
              <div className="space-y-2">
                <Label htmlFor="githubRepo" className="text-gray-300">
                  Repository Name *
                </Label>
                <Input
                  id="githubRepo"
                  value={githubRepo}
                  onChange={e => setGithubRepo(e.target.value)}
                  placeholder="owner/repo-name"
                  className="bg-gray-800 border-gray-700 text-white"
                  required
                />
                <p className="text-xs text-gray-500">
                  Format: username/repository (e.g., {account.username}/my-site)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="githubBranch" className="text-gray-300">
                  Branch
                </Label>
                <Input
                  id="githubBranch"
                  value={githubBranch}
                  onChange={e => setGithubBranch(e.target.value)}
                  placeholder="gh-pages"
                  className="bg-gray-800 border-gray-700 text-white"
                />
                <p className="text-xs text-gray-500">
                  Default: gh-pages (GitHub Pages standard branch)
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Cloudflare Configuration */}
              <div className="space-y-2">
                <Label
                  htmlFor="cloudflareProjectName"
                  className="text-gray-300"
                >
                  Project Name *
                </Label>
                <Input
                  id="cloudflareProjectName"
                  value={cloudflareProjectName}
                  onChange={e => setCloudflareProjectName(e.target.value)}
                  placeholder="my-project"
                  className="bg-gray-800 border-gray-700 text-white"
                  required
                />
                <p className="text-xs text-gray-500">
                  The Cloudflare Pages project name (must be created in
                  Cloudflare dashboard first)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cloudflareBranch" className="text-gray-300">
                  Branch
                </Label>
                <Input
                  id="cloudflareBranch"
                  value={cloudflareBranch}
                  onChange={e => setCloudflareBranch(e.target.value)}
                  placeholder="main"
                  className="bg-gray-800 border-gray-700 text-white"
                />
                <p className="text-xs text-gray-500">
                  Default: main (production branch)
                </p>
              </div>
            </>
          )}

          {/* Account Info */}
          <div className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
            <p className="text-xs text-gray-400">Connected account:</p>
            <p className="text-sm text-white mt-1">
              {account.username || account.email}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating} className="flex-1">
              {isCreating ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
              ) : (
                'Create Configuration'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
