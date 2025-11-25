/**
 * Deployment Panel - Quick deployment access in editor sidebar
 */

import { Rocket, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeployment } from '../../hooks/useDeployment';
import { useToast } from '../../hooks/useToast';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { DeploymentCard } from './DeploymentCard';

interface DeploymentPanelProps {
  projectId: string;
}

export function DeploymentPanel({ projectId }: DeploymentPanelProps) {
  const navigate = useNavigate();
  const { configs, triggerDeployment } = useDeployment(projectId);
  const { success, error } = useToast();

  const [isOpen, setIsOpen] = useState(true);
  const [deployingId, setDeployingId] = useState<string | null>(null);

  const handleDeploy = async (configId: string) => {
    setDeployingId(configId);
    try {
      const response = await triggerDeployment(configId);
      success('Deployment started', `Deployment ${response.id} has started`);
      // TODO: Open deployment progress dialog with deployment ID
    } catch (err) {
      error(
        'Failed to start deployment',
        err instanceof Error ? err.message : 'Unknown error occurred'
      );
    } finally {
      setDeployingId(null);
    }
  };

  const handleConfigureDeployments = () => {
    // TODO: Open project settings with deployments tab
    navigate(`/dashboard/projects/${projectId}`);
  };

  if (configs.length === 0) {
    return (
      <Card className="m-4 border-gray-800">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-purple-400" />
              <h3 className="font-semibold text-white text-sm">Deployments</h3>
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-4">
            No deployments configured for this project
          </p>

          <Button
            onClick={handleConfigureDeployments}
            size="sm"
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
          >
            <Settings className="h-3 w-3" />
            Configure Deployments
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="m-4 border-gray-800">
      <div
        className="p-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-purple-400" />
            <h3 className="font-semibold text-white text-sm">Deployments</h3>
            <span className="text-xs text-gray-500 ml-auto">
              {configs.length}
            </span>
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-gray-800 p-4 space-y-3">
          {configs.map(config => (
            <DeploymentCard
              key={config.id}
              config={config}
              onDeploy={handleDeploy}
              isDeploying={deployingId === config.id}
            />
          ))}

          <Button
            onClick={handleConfigureDeployments}
            variant="ghost"
            size="sm"
            className="w-full justify-center text-xs h-8 text-gray-400 hover:text-gray-300"
          >
            <Settings className="h-3 w-3 mr-1" />
            Manage Deployments
          </Button>
        </div>
      )}
    </Card>
  );
}
