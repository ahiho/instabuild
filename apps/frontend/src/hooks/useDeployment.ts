/**
 * useDeployment hook - Manage deployment state and operations
 */

import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { deploymentService } from '../services/deployment';
import type { DeploymentConfig, DeploymentProgress } from '../types/deployment';

export function useDeployment(projectId?: string) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Query: Get all deployment accounts
  const accountsQuery = useQuery({
    queryKey: ['deployment-accounts'],
    queryFn: () => deploymentService.getDeploymentAccounts(),
    enabled: true,
  });

  // Query: Get project deployment configs
  const configsQuery = useQuery({
    queryKey: ['deployment-configs', projectId],
    queryFn: () => deploymentService.getProjectDeploymentConfigs(projectId!),
    enabled: !!projectId,
  });

  // Query: Get deployment history
  const historyQuery = useQuery({
    queryKey: ['deployment-history', projectId],
    queryFn: () => deploymentService.getDeploymentHistory(projectId!, 50),
    enabled: !!projectId,
  });

  // Mutation: Connect GitHub account
  const connectGitHub = useCallback(
    async (code: string, state: string) => {
      setError(null);
      setIsLoading(true);
      try {
        const account = await deploymentService.connectGitHubAccount(
          code,
          state
        );
        await queryClient.invalidateQueries({
          queryKey: ['deployment-accounts'],
        });
        return account;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to connect GitHub account';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [queryClient]
  );

  // Mutation: Connect Cloudflare account
  const connectCloudflare = useCallback(
    async (apiToken: string) => {
      setError(null);
      setIsLoading(true);
      try {
        const account =
          await deploymentService.connectCloudflareAccount(apiToken);
        await queryClient.invalidateQueries({
          queryKey: ['deployment-accounts'],
        });
        return account;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to connect Cloudflare account';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [queryClient]
  );

  // Mutation: Disconnect account
  const disconnectAccount = useCallback(
    async (accountId: string) => {
      setError(null);
      setIsLoading(true);
      try {
        await deploymentService.disconnectAccount(accountId);
        await queryClient.invalidateQueries({
          queryKey: ['deployment-accounts'],
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to disconnect account';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [queryClient]
  );

  // Mutation: Create deployment config
  const createConfig = useCallback(
    async (
      config: Omit<
        DeploymentConfig,
        'id' | 'projectId' | 'createdAt' | 'updatedAt'
      >
    ) => {
      setError(null);
      setIsLoading(true);
      try {
        if (!projectId) throw new Error('Project ID is required');
        const newConfig = await deploymentService.createDeploymentConfig(
          projectId,
          config
        );
        await queryClient.invalidateQueries({
          queryKey: ['deployment-configs', projectId],
        });
        return newConfig;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to create deployment config';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, queryClient]
  );

  // Mutation: Remove deployment config
  const removeConfig = useCallback(
    async (configId: string) => {
      setError(null);
      setIsLoading(true);
      try {
        await deploymentService.removeDeploymentConfig(configId);
        if (projectId) {
          await queryClient.invalidateQueries({
            queryKey: ['deployment-configs', projectId],
          });
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to remove deployment config';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, queryClient]
  );

  // Mutation: Trigger deployment
  const triggerDeployment = useCallback(
    async (configId: string) => {
      setError(null);
      setIsLoading(true);
      try {
        if (!projectId) throw new Error('Project ID is required');
        const response = await deploymentService.triggerDeployment(
          projectId,
          configId
        );
        await queryClient.invalidateQueries({
          queryKey: ['deployment-history', projectId],
        });
        return response;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to trigger deployment';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, queryClient]
  );

  // Query: Get deployment status (for polling)
  const getDeploymentStatus = useCallback(
    async (deploymentId: string): Promise<DeploymentProgress> => {
      return deploymentService.getDeploymentStatus(deploymentId);
    },
    []
  );

  // Mutation: Retry deployment
  const retryDeployment = useCallback(
    async (deploymentId: string) => {
      setError(null);
      setIsLoading(true);
      try {
        const response = await deploymentService.retryDeployment(deploymentId);
        if (projectId) {
          await queryClient.invalidateQueries({
            queryKey: ['deployment-history', projectId],
          });
        }
        return response;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to retry deployment';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, queryClient]
  );

  return {
    // Queries
    accounts: accountsQuery.data ?? [],
    configs: configsQuery.data ?? [],
    history: historyQuery.data ?? [],

    // Loading states
    isLoading,
    accountsLoading: accountsQuery.isLoading,
    configsLoading: configsQuery.isLoading,
    historyLoading: historyQuery.isLoading,

    // Error states
    error,
    accountsError: accountsQuery.error,
    configsError: configsQuery.error,
    historyError: historyQuery.error,

    // Mutations
    connectGitHub,
    connectCloudflare,
    disconnectAccount,
    createConfig,
    removeConfig,
    triggerDeployment,
    retryDeployment,
    getDeploymentStatus,

    // Refetch
    refetchAccounts: accountsQuery.refetch,
    refetchConfigs: configsQuery.refetch,
    refetchHistory: historyQuery.refetch,
  };
}
