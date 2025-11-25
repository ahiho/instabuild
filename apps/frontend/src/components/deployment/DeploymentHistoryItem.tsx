/**
 * Deployment History Item - Individual deployment in history list
 */

import {
  Check,
  AlertCircle,
  Cloud,
  Github,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import type { DeploymentHistory } from '../../types/deployment';

interface DeploymentHistoryItemProps {
  deployment: DeploymentHistory;
}

export function DeploymentHistoryItem({
  deployment,
}: DeploymentHistoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isSuccess = deployment.status === 'SUCCESS';
  const isFailed = deployment.status === 'FAILED';
  const isPending =
    deployment.status === 'PENDING' ||
    deployment.status === 'BUILDING' ||
    deployment.status === 'UPLOADING';

  const platformIcon =
    deployment.config.type === 'GITHUB_PAGES' ? (
      <Github className="h-4 w-4" />
    ) : (
      <Cloud className="h-4 w-4" />
    );
  const platformName =
    deployment.config.type === 'GITHUB_PAGES'
      ? 'GitHub Pages'
      : 'Cloudflare Pages';

  const statusIcon = isSuccess ? (
    <Check className="h-5 w-5 text-green-400" />
  ) : isFailed ? (
    <AlertCircle className="h-5 w-5 text-red-400" />
  ) : (
    <div className="h-5 w-5 rounded-full border-2 border-blue-400 border-r-transparent animate-spin" />
  );

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    return `${Math.round(ms / 1000)}s`;
  };

  return (
    <div className="border-l-2 border-gray-800 pl-4 py-3 hover:border-purple-600 transition-colors">
      <div
        className="flex items-start gap-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {statusIcon}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {platformIcon}
            <span className="font-medium text-white text-sm">
              {platformName}
            </span>
            <span
              className={`text-xs font-medium ${
                isSuccess
                  ? 'text-green-400'
                  : isFailed
                    ? 'text-red-400'
                    : 'text-blue-400'
              }`}
            >
              {isSuccess && 'Success'}
              {isFailed && 'Failed'}
              {isPending && 'In Progress'}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {new Date(deployment.startedAt).toLocaleString()}
          </p>
        </div>

        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500 mt-1" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500 mt-1" />
        )}
      </div>

      {isExpanded && (
        <div className="mt-3 pl-8 space-y-3">
          {/* Timing */}
          {deployment.completedAt && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-gray-600">Build</p>
                <p className="text-gray-300">
                  {formatDuration(deployment.buildDuration)}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Upload</p>
                <p className="text-gray-300">
                  {formatDuration(deployment.uploadDuration)}
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {isFailed && deployment.errorMessage && (
            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
              {deployment.errorMessage}
            </div>
          )}

          {/* Build Logs */}
          {deployment.buildLogs && (
            <div>
              <p className="text-xs text-gray-600 mb-2">Build Logs</p>
              <div className="bg-gray-950 border border-gray-800 rounded p-2 max-h-32 overflow-auto">
                <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap break-words">
                  {deployment.buildLogs.slice(0, 300)}
                  {deployment.buildLogs.length > 300 && '...'}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
