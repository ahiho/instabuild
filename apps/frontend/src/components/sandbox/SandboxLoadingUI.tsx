import { useState, useEffect } from 'react';

interface SandboxLoadingUIProps {
  /**
   * Current status of sandbox provisioning
   * 'PENDING' - Waiting for sandbox to be ready
   * 'RETRYING' - Retrying after failure
   */
  status?: 'PENDING' | 'RETRYING';
  /**
   * Optional message to display
   */
  message?: string;
  /**
   * Callback when user clicks retry button (if provisioning times out)
   */
  onRetry?: () => void;
  /**
   * Whether to show retry button (shown after timeout)
   */
  showRetryButton?: boolean;
}

/**
 * Loading UI component displayed while sandbox is being provisioned
 * Shows informative messages and loading animation to user
 */
export function SandboxLoadingUI({
  status = 'PENDING',
  message = 'Preparing sandbox environment...',
  onRetry,
  showRetryButton = false,
}: SandboxLoadingUIProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Track elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  return (
    <div className="flex items-center justify-center h-full w-full bg-gradient-to-b from-[#1e0d2b] via-slate-900 to-slate-950">
      <div className="flex flex-col items-center gap-6 p-8 text-center max-w-md">
        {/* Loading spinner */}
        <div className="relative w-16 h-16">
          <div
            className="absolute inset-0 rounded-full border-4 border-slate-700"
            style={{
              background: `conic-gradient(from 0deg, #334155 0deg, #7e22ce ${status === 'RETRYING' ? '180' : '120'}deg, transparent ${status === 'RETRYING' ? '180' : '120'}deg)`,
              animation:
                status === 'RETRYING'
                  ? 'spin 0.6s linear infinite reverse'
                  : 'spin 1.5s linear infinite',
            }}
          />
          <div className="absolute inset-2 bg-slate-950 rounded-full" />
        </div>

        {/* Status text */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">
            {status === 'RETRYING'
              ? 'Retrying sandbox setup...'
              : 'Preparing Sandbox'}
          </h2>
          <p className="text-slate-400 text-sm">{message}</p>
        </div>

        {/* Info items */}

        {/* Time elapsed */}
        <p className="text-xs text-slate-500">
          Time elapsed: {formatTime(elapsedSeconds)}
        </p>

        {/* Retry button (shown if provisioning takes too long) */}
        {showRetryButton && onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
          >
            Retry Provisioning
          </button>
        )}

        {/* Help text */}
        <p className="text-xs text-slate-500 mt-4">
          This usually takes 10-30 seconds. If it takes longer, you can retry or
          refresh the page.
        </p>
      </div>

      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
