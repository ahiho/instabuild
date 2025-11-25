/**
 * Deployment service - Handle all deployment-related API calls
 */

import type {
  DeploymentAccount,
  DeploymentConfig,
  DeploymentHistory,
  DeploymentProgress,
} from '../types/deployment';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

/**
 * Get authorization headers with JWT token
 */
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

/**
 * API Response wrapper type
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

/**
 * Handle API response with error handling
 */
async function handleResponse<T>(response: Response): Promise<T> {
  const json = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !json.success) {
    throw new Error(json.error || `API error: ${response.status}`);
  }

  return json.data as T;
}

/**
 * Deployment service object with all operations
 */
export const deploymentService = {
  /**
   * Account Management - Get all connected accounts
   */
  async getDeploymentAccounts(): Promise<DeploymentAccount[]> {
    const response = await fetch(`${API_BASE_URL}/deployment-accounts`, {
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<{ accounts: DeploymentAccount[] }>(
      response
    );
    return data.accounts;
  },

  /**
   * Account Management - Connect GitHub account via OAuth
   * @param code OAuth authorization code from GitHub
   * @param state OAuth state parameter
   */
  async connectGitHubAccount(
    code: string,
    state: string
  ): Promise<DeploymentAccount> {
    const response = await fetch(
      `${API_BASE_URL}/deployment-accounts/github/connect`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ code, state }),
      }
    );
    return handleResponse<DeploymentAccount>(response);
  },

  /**
   * Account Management - Connect Cloudflare account via API token
   * @param apiToken Cloudflare API token
   */
  async connectCloudflareAccount(apiToken: string): Promise<DeploymentAccount> {
    const response = await fetch(
      `${API_BASE_URL}/deployment-accounts/cloudflare/connect`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ apiToken }),
      }
    );
    return handleResponse<DeploymentAccount>(response);
  },

  /**
   * Account Management - Disconnect an account
   * @param accountId ID of account to disconnect
   */
  async disconnectAccount(accountId: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/deployment-accounts/${accountId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }
    );
    return handleResponse<void>(response);
  },

  /**
   * Project Configuration - Get all deployment configs for a project
   * @param projectId Project ID
   */
  async getProjectDeploymentConfigs(
    projectId: string
  ): Promise<DeploymentConfig[]> {
    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/deployments`,
      {
        headers: getAuthHeaders(),
      }
    );
    const data = await handleResponse<{ configs: DeploymentConfig[] }>(
      response
    );
    return data.configs;
  },

  /**
   * Project Configuration - Create new deployment config
   * @param projectId Project ID
   * @param config Deployment configuration
   */
  async createDeploymentConfig(
    projectId: string,
    config: Omit<
      DeploymentConfig,
      'id' | 'projectId' | 'createdAt' | 'updatedAt'
    >
  ): Promise<DeploymentConfig> {
    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/deployments`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(config),
      }
    );
    return handleResponse<DeploymentConfig>(response);
  },

  /**
   * Project Configuration - Update deployment config
   * @param configId Deployment config ID
   * @param config Partial config updates
   */
  async updateDeploymentConfig(
    configId: string,
    config: Partial<DeploymentConfig>
  ): Promise<DeploymentConfig> {
    const response = await fetch(`${API_BASE_URL}/deployments/${configId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(config),
    });
    return handleResponse<DeploymentConfig>(response);
  },

  /**
   * Project Configuration - Delete deployment config
   * @param configId Deployment config ID
   */
  async removeDeploymentConfig(configId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/deployments/${configId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<void>(response);
  },

  /**
   * Deployment Execution - Trigger a new deployment
   * @param projectId Project ID
   * @param configId Deployment config ID
   */
  async triggerDeployment(
    projectId: string,
    configId: string
  ): Promise<DeploymentHistory> {
    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/deployments/${configId}/deploy`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
      }
    );
    return handleResponse<DeploymentHistory>(response);
  },

  /**
   * Deployment Execution - Get real-time deployment status
   * @param deploymentId Deployment ID
   */
  async getDeploymentStatus(deploymentId: string): Promise<DeploymentProgress> {
    const response = await fetch(
      `${API_BASE_URL}/deployments/${deploymentId}/status`,
      {
        headers: getAuthHeaders(),
      }
    );
    return handleResponse<DeploymentProgress>(response);
  },

  /**
   * Deployment Execution - Get deployment history for a project
   * @param projectId Project ID
   * @param limit Maximum number of records to return
   */
  async getDeploymentHistory(
    projectId: string,
    limit = 20
  ): Promise<DeploymentHistory[]> {
    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/deployments/history?limit=${limit}`,
      {
        headers: getAuthHeaders(),
      }
    );
    const data = await handleResponse<{
      deployments: DeploymentHistory[];
      total: number;
    }>(response);
    return data.deployments;
  },

  /**
   * Deployment Execution - Get single deployment history item
   * @param deploymentId Deployment ID
   */
  async getDeploymentHistoryItem(
    deploymentId: string
  ): Promise<DeploymentHistory> {
    const response = await fetch(
      `${API_BASE_URL}/deployments/${deploymentId}`,
      {
        headers: getAuthHeaders(),
      }
    );
    return handleResponse<DeploymentHistory>(response);
  },

  /**
   * Retry - Retry a failed deployment
   * @param deploymentId Deployment ID to retry
   */
  async retryDeployment(deploymentId: string): Promise<DeploymentHistory> {
    const response = await fetch(
      `${API_BASE_URL}/deployments/${deploymentId}/retry`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
      }
    );
    return handleResponse<DeploymentHistory>(response);
  },
};
