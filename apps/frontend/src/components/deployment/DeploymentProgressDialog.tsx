/**
 * Deployment Progress Dialog - Show deployment progress and logs
 */

import { Check, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DeploymentProgress } from '../../types/deployment';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { useDeployment } from '../../hooks/useDeployment';
import { useToast } from '../../hooks/useToast';

interface DeploymentProgressDialogProps {
  deploymentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onHistoryView?: () => void;
}

export function DeploymentProgressDialog({
  deploymentId,
  open,
  onOpenChange,
  onHistoryView,
}: DeploymentProgressDialogProps) {
  const { getDeploymentStatus, retryDeployment } = useDeployment();
  const { error: showError } = useToast();
  const [deployment, setDeployment] = useState<DeploymentProgress | null>(null);
  const [showFullLogs, setShowFullLogs] = useState(false);
  const [currentDeploymentId, setCurrentDeploymentId] = useState<string | null>(
    null
  );
  const [isRetrying, setIsRetrying] = useState(false);

  // Sync deploymentId prop to internal state
  useEffect(() => {
    if (deploymentId) {
      setCurrentDeploymentId(deploymentId);
    }
  }, [deploymentId]);

  // Poll deployment status
  useEffect(() => {
    if (!open || !currentDeploymentId) return;

    const pollStatus = async () => {
      try {
        const status = await getDeploymentStatus(currentDeploymentId);
        setDeployment(status);

        // Stop polling if deployment is complete
        if (status.status === 'SUCCESS' || status.status === 'FAILED') {
          return true; // Signal to stop polling
        }
        return false;
      } catch (err) {
        console.error('Failed to fetch deployment status:', err);
        return false;
      }
    };

    pollStatus();
    const interval = setInterval(async () => {
      const shouldStop = await pollStatus();
      if (shouldStop) {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [open, currentDeploymentId, getDeploymentStatus]);

  const handleRetry = async () => {
    if (!currentDeploymentId) return;

    setIsRetrying(true);
    try {
      const newDeployment = await retryDeployment(currentDeploymentId);
      // Update to the new deployment ID to start polling
      setCurrentDeploymentId(newDeployment.id);
      // Reset deployment state to show new progress
      setDeployment(null);
    } catch (err) {
      showError(
        'Failed to retry deployment',
        err instanceof Error ? err.message : 'Unknown error occurred'
      );
    } finally {
      setIsRetrying(false);
    }
  };

  if (!deployment) {
    return null;
  }

  const isSuccess = deployment.status === 'SUCCESS';
  const isFailed = deployment.status === 'FAILED';
  const isRunning =
    deployment.status === 'PENDING' ||
    deployment.status === 'BUILDING' ||
    deployment.status === 'UPLOADING';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSuccess && <Check className="h-5 w-5 text-green-400" />}
            {isFailed && <AlertCircle className="h-5 w-5 text-red-400" />}
            {isRunning && (
              <Loader2 className="h-5 w-5 text-purple-400 animate-spin" />
            )}
            {isSuccess && 'Deployment Successful'}
            {isFailed && 'Deployment Failed'}
            {isRunning && 'Deploying...'}
          </DialogTitle>
          <DialogDescription>{deployment.message}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status */}
          <div>
            <h3 className="text-sm font-medium text-white mb-2">Status</h3>
            <div
              className={`p-3 rounded-lg ${
                isSuccess
                  ? 'bg-green-500/10 text-green-400'
                  : isFailed
                    ? 'bg-red-500/10 text-red-400'
                    : 'bg-blue-500/10 text-blue-400'
              }`}
            >
              {isSuccess && '✓ Deployment completed successfully'}
              {isFailed && `✗ ${deployment.error || 'Deployment failed'}`}
              {isRunning && deployment.message}
            </div>
          </div>

          {/* Build Logs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-white">Build Logs</h3>
              <button
                onClick={() => setShowFullLogs(!showFullLogs)}
                className="text-xs text-purple-400 hover:text-purple-300"
              >
                {showFullLogs ? 'Collapse' : 'Expand'}
              </button>
            </div>
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 max-h-96 overflow-auto">
              <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-words">
                {showFullLogs ? deployment.logs : deployment.logs.slice(0, 500)}
                {!showFullLogs && deployment.logs.length > 500 && '...'}
              </pre>
            </div>
          </div>

          {/* Progress */}
          {isRunning && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-white">Progress</h3>
                <span className="text-xs text-gray-400">
                  {deployment.progress}%
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${deployment.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {isSuccess && deployment.deployedUrl && (
              <Button
                onClick={() => window.open(deployment.deployedUrl, '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Visit Live Site
              </Button>
            )}

            {onHistoryView && (
              <Button onClick={onHistoryView} variant="outline">
                View History
              </Button>
            )}

            {isFailed && (
              <Button
                variant="outline"
                className="ml-auto"
                onClick={handleRetry}
                disabled={isRetrying}
              >
                {isRetrying && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {isRetrying ? 'Retrying...' : 'Retry Deployment'}
              </Button>
            )}

            <Button
              onClick={() => onOpenChange(false)}
              variant="ghost"
              className="ml-auto"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
