/**
 * Deployment Card - Individual deployment display in panel
 */

import { Cloud, Github, RotateCcw, Clock } from 'lucide-react';
import type { DeploymentConfig } from '../../types/deployment';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useToast } from '../../hooks/useToast';

interface DeploymentCardProps {
  config: DeploymentConfig;
  lastDeployedAt?: Date;
  onDeploy: (configId: string) => void;
  isDeploying?: boolean;
}

export function DeploymentCard({
  config,
  lastDeployedAt,
  onDeploy,
  isDeploying = false,
}: DeploymentCardProps) {
  const { error } = useToast();

  // Get platform info
  const platformName =
    config.type === 'GITHUB_PAGES' ? 'GitHub Pages' : 'Cloudflare Pages';
  const platformIcon =
    config.type === 'GITHUB_PAGES' ? (
      <Github className="h-4 w-4" />
    ) : (
      <Cloud className="h-4 w-4" />
    );
  const targetName =
    config.type === 'GITHUB_PAGES'
      ? config.githubRepo
      : config.cloudflareProjectName;

  const formatDeployTime = (date?: Date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours === 0) {
      return `${minutes}m ago`;
    }
    if (hours < 24) {
      return `${hours}h ago`;
    }
    return new Date(date).toLocaleDateString();
  };

  const handleDeploy = async () => {
    try {
      onDeploy(config.id);
    } catch (err) {
      error(
        'Deployment failed',
        err instanceof Error ? err.message : 'Unknown error occurred'
      );
    }
  };

  return (
    <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-purple-600/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {platformIcon}
          <span className="font-medium text-white text-sm">{platformName}</span>
        </div>
        <Badge variant="outline" className="text-xs">
          Ready
        </Badge>
      </div>

      <div className="space-y-2 mb-3">
        <div>
          <p className="text-xs text-gray-500">Target</p>
          <p className="text-sm text-gray-300">{targetName}</p>
        </div>
        {lastDeployedAt && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            <span>Last: {formatDeployTime(lastDeployedAt)}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleDeploy}
          disabled={isDeploying}
          size="sm"
          className="flex-1 h-8 text-xs"
        >
          {isDeploying ? 'Deploying...' : 'Deploy Now'}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={isDeploying}
          className="h-8 w-8"
          title="View deployment history"
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
