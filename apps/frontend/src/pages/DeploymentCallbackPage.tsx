/**
 * GitHub OAuth Callback Page
 * Handles the redirect from GitHub OAuth authorization
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeployment } from '../hooks/useDeployment';
import { useToast } from '../hooks/useToast';

export function DeploymentCallbackPage() {
  const navigate = useNavigate();
  const { connectGitHub } = useDeployment();
  const { success, error } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract OAuth parameters from URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const errorParam = params.get('error');
        const errorDescription = params.get('error_description');

        // Check for OAuth errors
        if (errorParam) {
          throw new Error(errorDescription || `OAuth error: ${errorParam}`);
        }

        // Validate required parameters
        if (!code || !state) {
          throw new Error('Missing OAuth code or state parameter');
        }

        // Validate state parameter against stored value
        const storedState = sessionStorage.getItem('github_oauth_state');
        if (!storedState || storedState !== state) {
          throw new Error(
            'Invalid OAuth state parameter. Possible CSRF attack.'
          );
        }

        // Clear stored state
        sessionStorage.removeItem('github_oauth_state');

        // Connect GitHub account
        const account = await connectGitHub(code, state);

        success(
          'GitHub account connected',
          `Successfully connected as ${account.username || account.email}`
        );

        // Redirect to deployments page
        navigate('/dashboard/deployments', { replace: true });
      } catch (err) {
        console.error('GitHub OAuth callback error:', err);
        error(
          'Failed to connect GitHub account',
          err instanceof Error ? err.message : 'Unknown error occurred'
        );

        // Redirect to deployments page even on error
        setTimeout(() => {
          navigate('/dashboard/deployments', { replace: true });
        }, 2000);
      } finally {
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, [connectGitHub, navigate, success, error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
      <div className="text-center">
        {isProcessing ? (
          <>
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent mb-4"></div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Connecting GitHub Account
            </h2>
            <p className="text-gray-400">
              Please wait while we complete the authorization...
            </p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-white mb-2">
              Processing Complete
            </h2>
            <p className="text-gray-400">Redirecting you back...</p>
          </>
        )}
      </div>
    </div>
  );
}
