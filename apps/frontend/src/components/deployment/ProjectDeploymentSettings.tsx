/**
 * Project Deployment Settings - Configure deployments for a project
 */

import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Badge } from '../ui/badge';
import { useToast } from '../../hooks/useToast';
import { useDeployment } from '../../hooks/useDeployment';
import { ConfigureGitHubPagesDialog } from './ConfigureGitHubPagesDialog';
import { ConfigureCloudflareDialog } from './ConfigureCloudflareDialog';

interface ProjectDeploymentSettingsProps {
  projectId: string;
}

export function ProjectDeploymentSettings({
  projectId,
}: ProjectDeploymentSettingsProps) {
  const { configs, accounts, isLoading, removeConfig } =
    useDeployment(projectId);
  const { success, error } = useToast();
  const [showGitHubDialog, setShowGitHubDialog] = useState(false);
  const [showCloudflareDialog, setShowCloudflareDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleRemoveConfig = async (configId: string) => {
    setDeletingId(configId);
    try {
      await removeConfig(configId);
      success('Deployment removed', 'Configuration has been deleted');
    } catch (err) {
      error(
        'Failed to remove deployment',
        err instanceof Error ? err.message : 'Unknown error occurred'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const githubConfigs = configs.filter(c => c.type === 'GITHUB_PAGES');
  const cloudflareConfigs = configs.filter(c => c.type === 'CLOUDFLARE_PAGES');

  const getAccountEmail = (accountId: string) => {
    return accounts.find(a => a.id === accountId)?.email || 'Unknown account';
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-purple-600 border-r-transparent"></div>
        <p className="text-gray-400 mt-3 text-sm">Loading deployments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* GitHub Pages Deployments */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">GitHub Pages</h3>
          {githubConfigs.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {githubConfigs.length} configured
            </Badge>
          )}
        </div>

        {githubConfigs.length === 0 ? (
          <Card className="border-gray-800">
            <CardContent className="pt-6 pb-6">
              <p className="text-gray-400 text-sm mb-4">
                No GitHub Pages deployment configured for this project
              </p>
              <Button
                onClick={() => setShowGitHubDialog(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add GitHub Pages
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {githubConfigs.map(config => (
              <Card key={config.id} className="border-gray-800">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white text-base">
                        {config.githubRepo}
                      </CardTitle>
                      <CardDescription className="text-gray-400 text-sm mt-1">
                        Branch:{' '}
                        <span className="text-gray-300">
                          {config.githubBranch}
                        </span>
                        <span className="mx-2">•</span>
                        Account:{' '}
                        <span className="text-gray-300">
                          {getAccountEmail(config.accountId)}
                        </span>
                      </CardDescription>
                      {config.customDomain && (
                        <div className="mt-2 pt-2 border-t border-gray-800">
                          <p className="text-xs text-gray-500">
                            Custom Domain:
                          </p>
                          <p className="text-sm text-purple-400 font-mono mt-0.5">
                            {config.customDomain}
                          </p>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveConfig(config.id)}
                      disabled={deletingId === config.id}
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
            <Button
              onClick={() => setShowGitHubDialog(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 w-full"
            >
              <Plus className="h-4 w-4" />
              Add Another GitHub Pages
            </Button>
          </div>
        )}
      </div>

      {/* Cloudflare Pages Deployments */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Cloudflare Pages</h3>
          {cloudflareConfigs.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {cloudflareConfigs.length} configured
            </Badge>
          )}
        </div>

        {cloudflareConfigs.length === 0 ? (
          <Card className="border-gray-800">
            <CardContent className="pt-6 pb-6">
              <p className="text-gray-400 text-sm mb-4">
                No Cloudflare Pages deployment configured for this project
              </p>
              <Button
                onClick={() => setShowCloudflareDialog(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Cloudflare Pages
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {cloudflareConfigs.map(config => (
              <Card key={config.id} className="border-gray-800">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-white text-base">
                        {config.cloudflareProjectName}
                      </CardTitle>
                      <CardDescription className="text-gray-400 text-sm mt-1">
                        Branch:{' '}
                        <span className="text-gray-300">
                          {config.cloudflareBranch}
                        </span>
                        <span className="mx-2">•</span>
                        Account:{' '}
                        <span className="text-gray-300">
                          {getAccountEmail(config.accountId)}
                        </span>
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveConfig(config.id)}
                      disabled={deletingId === config.id}
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
            <Button
              onClick={() => setShowCloudflareDialog(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 w-full"
            >
              <Plus className="h-4 w-4" />
              Add Another Cloudflare Pages
            </Button>
          </div>
        )}
      </div>

      {/* No Deployments State */}
      {configs.length === 0 && !isLoading && (
        <Card className="border-gray-800">
          <CardContent className="pt-10 pb-10">
            <div className="text-center">
              <div className="text-4xl mb-3">🚀</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                No deployments configured
              </h3>
              <p className="text-gray-400 mb-6 text-sm">
                Set up a deployment target to automatically deploy your project
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => setShowGitHubDialog(true)} size="sm">
                  GitHub Pages
                </Button>
                <Button
                  onClick={() => setShowCloudflareDialog(true)}
                  variant="outline"
                  size="sm"
                >
                  Cloudflare Pages
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <ConfigureGitHubPagesDialog
        projectId={projectId}
        accounts={accounts.filter(a => a.type === 'GITHUB')}
        open={showGitHubDialog}
        onOpenChange={setShowGitHubDialog}
      />
      <ConfigureCloudflareDialog
        projectId={projectId}
        accounts={accounts.filter(a => a.type === 'CLOUDFLARE')}
        open={showCloudflareDialog}
        onOpenChange={setShowCloudflareDialog}
      />
    </div>
  );
}
