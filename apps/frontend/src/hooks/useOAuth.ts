/**
 * Custom hook for OAuth authentication
 */

import { useCallback, useEffect } from 'react';
import { authService } from '../services/auth';
import type { OAuthProvider } from '../types/auth';

export function useOAuth() {
  // Handle OAuth initiation
  const initiateOAuth = useCallback(
    async (provider: OAuthProvider): Promise<void> => {
      try {
        const authUrl = await authService.initiateOAuth(provider);
        // Redirect to OAuth provider
        window.location.href = authUrl;
      } catch (error) {
        console.error('OAuth initiation failed:', error);
        throw error;
      }
    },
    []
  );

  // Handle OAuth callback
  const handleOAuthCallback = useCallback(
    async (provider: OAuthProvider, code: string): Promise<void> => {
      try {
        await authService.handleOAuthCallback(provider, code);
        // The auth service already saves tokens, so we just need to update the context
        // We can trigger a refresh by calling getCurrentUser
        await authService.getCurrentUser();
        // This will be handled by the auth context's initialization
      } catch (error) {
        console.error('OAuth callback failed:', error);
        throw error;
      }
    },
    []
  );

  // Check for OAuth callback on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code && state) {
      // Parse provider from state parameter
      try {
        const stateData = JSON.parse(decodeURIComponent(state));
        const provider = stateData.provider as OAuthProvider;

        if (provider) {
          handleOAuthCallback(provider, code)
            .then(() => {
              // Clear URL parameters after successful callback
              window.history.replaceState(
                {},
                document.title,
                window.location.pathname
              );
            })
            .catch(error => {
              console.error('OAuth callback handling failed:', error);
              // Clear URL parameters even on error
              window.history.replaceState(
                {},
                document.title,
                window.location.pathname
              );
            });
        }
      } catch (error) {
        console.error('Failed to parse OAuth state:', error);
        // Clear URL parameters
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      }
    }
  }, [handleOAuthCallback]);

  return {
    initiateOAuth,
    handleOAuthCallback,
  };
}
