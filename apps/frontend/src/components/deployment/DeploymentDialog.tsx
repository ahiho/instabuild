/**
 * Deployment Dialog - Choose deployment service and deploy
 */

import {
  Rocket,
  Github,
  Cloud,
  Settings,
  History,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeployment } from '../../hooks/useDeployment';
import { useToast } from '../../hooks/useToast';
import { useProject } from '../../contexts/ProjectContext';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Badge } from '../ui/badge';
import { DeploymentProgressDialog } from './DeploymentProgressDialog';
import { DeploymentHistorySheet } from './DeploymentHistorySheet';

interface DeploymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function DeploymentDialog({
  open,
  onOpenChange,
  projectId,
}: DeploymentDialogProps) {
  const navigate = useNavigate();
  const { currentProject } = useProject();
  const {
    accounts,
    accountsLoading,
    configs,
    history,
    triggerDeployment,
    createConfig,
  } = useDeployment(projectId);
  const { success, error } = useToast();
  const [deployingId, setDeployingId] = useState<string | null>(null);
  const [currentDeploymentId, setCurrentDeploymentId] = useState<string | null>(
    null
  );
  const [showProgress, setShowProgress] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const githubAccount = accounts.find(acc => acc.type === 'GITHUB');
  const cloudflareAccount = accounts.find(acc => acc.type === 'CLOUDFLARE');

  const githubConfigs = configs.filter(c => c.type === 'GITHUB_PAGES');
  const cloudflareConfigs = configs.filter(c => c.type === 'CLOUDFLARE_PAGES');

  // Helper function to get the last deployment for a config
  const getLastDeployment = (configId: string) => {
    const deployments = history.filter(h => h.configId === configId);
    if (deployments.length === 0) return null;
    // Sort by startedAt descending and return the most recent
    return deployments.sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    )[0];
  };

  // Helper function to format relative time
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Sanitize project name for repo/project naming
  const sanitizeProjectName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  };

  const projectName = currentProject?.name || 'instabuild';
  const sanitizedProjectName = sanitizeProjectName(projectName);

  const handleDeploy = async (configId: string) => {
    setDeployingId(configId);
    try {
      const response = await triggerDeployment(configId);
      console.log('Deployment triggered:', response);
      setCurrentDeploymentId(response.id);
      setShowProgress(true);
      onOpenChange(false);
    } catch (err) {
      error(
        'Failed to start deployment',
        err instanceof Error ? err.message : 'Unknown error occurred'
      );
    } finally {
      setDeployingId(null);
    }
  };

  const handleAutoConfigureGitHub = async () => {
    if (!githubAccount) {
      error('No GitHub account', 'Please connect your GitHub account first');
      return;
    }

    setDeployingId('configuring');
    try {
      // Auto-generate repo name: username/sanitized-project-name-instabuild
      const repoName = `${githubAccount.username || 'user'}/${sanitizedProjectName}-instabuild`;

      const config = await createConfig({
        accountId: githubAccount.id,
        type: 'GITHUB_PAGES',
        githubRepo: repoName,
        githubBranch: 'gh-pages',
      });

      success('Configuration created', `Deploying to ${repoName}...`);

      // Trigger deployment immediately after creating config
      const response = await triggerDeployment(config.id);
      console.log('Auto-deploy GitHub triggered:', response);
      setCurrentDeploymentId(response.id);
      setShowProgress(true);
      onOpenChange(false);
    } catch (err) {
      error(
        'Failed to deploy',
        err instanceof Error ? err.message : 'Unknown error occurred'
      );
    } finally {
      setDeployingId(null);
    }
  };

  const handleAutoConfigureCloudflare = async () => {
    if (!cloudflareAccount) {
      error(
        'No Cloudflare account',
        'Please connect your Cloudflare account first'
      );
      return;
    }

    setDeployingId('configuring');
    try {
      // Auto-generate project name: sanitized-project-name
      const config = await createConfig({
        accountId: cloudflareAccount.id,
        type: 'CLOUDFLARE_PAGES',
        cloudflareProjectName: sanitizedProjectName,
        cloudflareBranch: 'main',
      });

      success(
        'Configuration created',
        `Deploying to ${sanitizedProjectName}...`
      );

      // Trigger deployment immediately after creating config
      const response = await triggerDeployment(config.id);
      console.log('Auto-deploy Cloudflare triggered:', response);
      setCurrentDeploymentId(response.id);
      setShowProgress(true);
      onOpenChange(false);
    } catch (err) {
      error(
        'Failed to deploy',
        err instanceof Error ? err.message : 'Unknown error occurred'
      );
    } finally {
      setDeployingId(null);
    }
  };

  const handleConnectAccounts = () => {
    onOpenChange(false);
    navigate('/dashboard/deployments');
  };

  const handleManageDeployments = () => {
    onOpenChange(false);
    // TODO: Navigate to project deployment settings when available
    navigate('/dashboard/deployments');
  };

  if (accountsLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // No accounts connected
  if (!githubAccount && !cloudflareAccount) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-purple-400" />
              Deploy Project
            </DialogTitle>
            <DialogDescription>
              Connect a deployment service to get started
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-400 text-sm">
                You need to connect a GitHub or Cloudflare account before you
                can deploy.
              </p>
            </div>

            <Button
              onClick={handleConnectAccounts}
              className="w-full flex items-center justify-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Connect Deployment Accounts
            </Button>

            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-purple-400" />
            Deploy Project
          </DialogTitle>
          <DialogDescription>
            Choose a deployment service to publish your project
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {/* GitHub Pages Deployments */}
          {githubAccount && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Github className="h-4 w-4 text-gray-400" />
                <h3 className="font-semibold text-white text-sm">
                  GitHub Pages
                </h3>
              </div>

              {githubConfigs.length === 0 ? (
                <Card className="border-gray-800">
                  <CardContent className="pt-4">
                    <p className="text-gray-400 text-sm mb-3">
                      Will deploy to: {githubAccount.username || 'user'}/
                      {sanitizedProjectName}-instabuild
                    </p>
                    <Button
                      onClick={handleAutoConfigureGitHub}
                      disabled={deployingId === 'configuring'}
                      size="sm"
                      className="w-full"
                    >
                      {deployingId === 'configuring' ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent mr-2"></div>
                      ) : null}
                      {deployingId === 'configuring'
                        ? 'Configuring...'
                        : 'Setup & Deploy to GitHub Pages'}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {githubConfigs.map(config => {
                    const lastDeployment = getLastDeployment(config.id);
                    return (
                      <Card
                        key={config.id}
                        className="border-gray-800 hover:border-purple-600 transition-colors"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-white text-sm flex items-center gap-2">
                                <Github className="h-3.5 w-3.5" />
                                {config.githubRepo || 'GitHub Pages'}
                              </CardTitle>
                              <CardDescription className="text-gray-400 text-xs mt-1">
                                Branch: {config.githubBranch || 'gh-pages'}
                              </CardDescription>
                              {lastDeployment && (
                                <div className="mt-2 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant={
                                        lastDeployment.status === 'SUCCESS'
                                          ? 'default'
                                          : lastDeployment.status === 'FAILED'
                                            ? 'destructive'
                                            : 'secondary'
                                      }
                                      className="text-xs"
                                    >
                                      {lastDeployment.status}
                                    </Badge>
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {formatRelativeTime(
                                        lastDeployment.startedAt
                                      )}
                                    </span>
                                  </div>
                                  {lastDeployment.deployedUrl &&
                                    lastDeployment.status === 'SUCCESS' && (
                                      <a
                                        href={lastDeployment.deployedUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        View Live Site
                                      </a>
                                    )}
                                </div>
                              )}
                            </div>
                            <Button
                              onClick={() => handleDeploy(config.id)}
                              disabled={deployingId === config.id}
                              size="sm"
                              className="ml-2"
                            >
                              {deployingId === config.id ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                              ) : (
                                <Rocket className="h-3.5 w-3.5" />
                              )}
                              <span className="ml-1.5">
                                {deployingId === config.id
                                  ? 'Deploying...'
                                  : 'Deploy'}
                              </span>
                            </Button>
                          </div>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Cloudflare Pages Deployments */}
          {cloudflareAccount && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Cloud className="h-4 w-4 text-gray-400" />
                <h3 className="font-semibold text-white text-sm">
                  Cloudflare Pages
                </h3>
              </div>

              {cloudflareConfigs.length === 0 ? (
                <Card className="border-gray-800">
                  <CardContent className="pt-4">
                    <p className="text-gray-400 text-sm mb-3">
                      Will deploy to: {sanitizedProjectName} (Cloudflare Pages)
                    </p>
                    <Button
                      onClick={handleAutoConfigureCloudflare}
                      disabled={deployingId === 'configuring'}
                      size="sm"
                      className="w-full"
                    >
                      {deployingId === 'configuring' ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent mr-2"></div>
                      ) : null}
                      {deployingId === 'configuring'
                        ? 'Configuring...'
                        : 'Setup & Deploy to Cloudflare Pages'}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {cloudflareConfigs.map(config => {
                    const lastDeployment = getLastDeployment(config.id);
                    return (
                      <Card
                        key={config.id}
                        className="border-gray-800 hover:border-purple-600 transition-colors"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-white text-sm flex items-center gap-2">
                                <Cloud className="h-3.5 w-3.5" />
                                {config.cloudflareProjectName ||
                                  'Cloudflare Pages'}
                              </CardTitle>
                              <CardDescription className="text-gray-400 text-xs mt-1">
                                Branch: {config.cloudflareBranch || 'main'}
                              </CardDescription>
                              {lastDeployment && (
                                <div className="mt-2 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant={
                                        lastDeployment.status === 'SUCCESS'
                                          ? 'default'
                                          : lastDeployment.status === 'FAILED'
                                            ? 'destructive'
                                            : 'secondary'
                                      }
                                      className="text-xs"
                                    >
                                      {lastDeployment.status}
                                    </Badge>
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {formatRelativeTime(
                                        lastDeployment.startedAt
                                      )}
                                    </span>
                                  </div>
                                  {lastDeployment.deployedUrl &&
                                    lastDeployment.status === 'SUCCESS' && (
                                      <a
                                        href={lastDeployment.deployedUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        View Live Site
                                      </a>
                                    )}
                                </div>
                              )}
                            </div>
                            <Button
                              onClick={() => handleDeploy(config.id)}
                              disabled={deployingId === config.id}
                              size="sm"
                              className="ml-2"
                            >
                              {deployingId === config.id ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                              ) : (
                                <Rocket className="h-3.5 w-3.5" />
                              )}
                              <span className="ml-1.5">
                                {deployingId === config.id
                                  ? 'Deploying...'
                                  : 'Deploy'}
                              </span>
                            </Button>
                          </div>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-800">
          {history.length > 0 && (
            <Button
              onClick={() => setShowHistory(true)}
              variant="ghost"
              size="sm"
              className="text-gray-400"
            >
              <History className="h-3.5 w-3.5 mr-1.5" />
              View Full History
            </Button>
          )}
          <Button
            onClick={handleManageDeployments}
            variant="ghost"
            size="sm"
            className="text-gray-400"
          >
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Manage Deployments
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            size="sm"
            className="ml-auto"
          >
            Close
          </Button>
        </div>
      </DialogContent>

      {/* Deployment Progress Dialog */}
      <DeploymentProgressDialog
        deploymentId={currentDeploymentId}
        open={showProgress}
        onOpenChange={setShowProgress}
      />

      {/* Deployment History Sheet */}
      <DeploymentHistorySheet
        projectId={projectId}
        open={showHistory}
        onOpenChange={setShowHistory}
      />
    </Dialog>
  );
}
