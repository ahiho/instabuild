/**
 * Deployment types and interfaces
 */

/**
 * Deployment account - Global user level
 * Users can connect multiple GitHub and Cloudflare accounts
 */
export interface DeploymentAccount {
  id: string;
  userId: string;
  type: 'GITHUB' | 'CLOUDFLARE';
  email: string;
  username?: string;
  organization?: string;
  connectedAt: Date;
  lastUsed?: Date;
}

/**
 * Deployment configuration - Per-project
 * Each project can have multiple deployment configurations
 */
export interface DeploymentConfig {
  id: string;
  projectId: string;
  accountId: string;
  type: 'GITHUB_PAGES' | 'CLOUDFLARE_PAGES';

  // GitHub Pages specific
  githubRepo?: string;
  githubBranch?: string;
  customDomain?: string; // Custom domain for GitHub Pages (e.g., "example.com")

  // Cloudflare specific
  cloudflareProjectName?: string;
  cloudflareBranch?: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Deployment history - Record of each deployment attempt
 */
export interface DeploymentHistory {
  id: string;
  configId: string;
  status: 'PENDING' | 'BUILDING' | 'UPLOADING' | 'SUCCESS' | 'FAILED';

  startedAt: Date;
  completedAt?: Date;
  buildLogs: string;
  errorMessage?: string;
  deployedUrl?: string;

  buildDuration?: number;
  uploadDuration?: number;

  // Nested config from backend
  config: {
    id: string;
    projectId: string;
    type: 'GITHUB_PAGES' | 'CLOUDFLARE_PAGES';
    githubRepo?: string;
    githubBranch?: string;
    cloudflareProjectName?: string;
    cloudflareBranch?: string;
  };
}

/**
 * Deployment progress - Real-time status during deployment
 */
export interface DeploymentProgress {
  id: string;
  status: 'PENDING' | 'BUILDING' | 'UPLOADING' | 'SUCCESS' | 'FAILED';
  phase: 'pending' | 'building' | 'uploading' | 'complete' | 'failed';
  progress: number;
  message: string;
  logs: string;
  deployedUrl?: string;
  error?: string;
}

/**
 * Deployment response - API response for triggering deployment
 */
export interface DeploymentResponse {
  deploymentId: string;
  status: 'PENDING';
  startedAt: Date;
}
