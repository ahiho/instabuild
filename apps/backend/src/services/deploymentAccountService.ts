import {
  PrismaClient,
  DeploymentAccount,
  DeploymentAccountType,
} from '@prisma/client';
import { Octokit } from '@octokit/rest';
import Cloudflare from 'cloudflare';
import crypto from 'crypto';

/**
 * Service for managing deployment account connections (GitHub, Cloudflare)
 * Handles OAuth flows, token validation, and credential storage
 */
export class DeploymentAccountService {
  private prisma: PrismaClient;
  private encryptionKey: Buffer;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;

    // Get encryption key from environment
    const key = process.env.DEPLOYMENT_TOKEN_ENCRYPTION_KEY;
    if (!key) {
      throw new Error(
        'DEPLOYMENT_TOKEN_ENCRYPTION_KEY environment variable is required'
      );
    }

    // Convert hex string to buffer (expects 32-byte hex = 64 chars)
    this.encryptionKey = Buffer.from(key, 'hex');
    if (this.encryptionKey.length !== 32) {
      throw new Error(
        'DEPLOYMENT_TOKEN_ENCRYPTION_KEY must be a 32-byte hex string (64 characters)'
      );
    }
  }

  /**
   * Encrypt a token using AES-256-GCM
   */
  private encryptToken(token: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt a token using AES-256-GCM
   */
  private decryptToken(encryptedToken: string): string {
    const parts = encryptedToken.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted token format');
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      iv
    );
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Connect a GitHub account via OAuth
   */
  async connectGitHubAccount(
    userId: string,
    code: string,
    state: string
  ): Promise<DeploymentAccount> {
    // Validate OAuth state parameter (should be validated by caller against session)
    if (!state) {
      throw new Error('Invalid OAuth state parameter');
    }

    // Exchange code for access token
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('GitHub OAuth credentials not configured');
    }

    try {
      // Exchange authorization code for access token
      const tokenResponse = await fetch(
        'https://github.com/login/oauth/access_token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code,
          }),
        }
      );

      const tokenData = (await tokenResponse.json()) as {
        access_token?: string;
        error?: string;
        error_description?: string;
      };

      if (tokenData.error || !tokenData.access_token) {
        throw new Error(
          `GitHub OAuth error: ${tokenData.error_description || tokenData.error || 'Unknown error'}`
        );
      }

      const accessToken = tokenData.access_token;

      // Fetch user details from GitHub
      const octokit = new Octokit({ auth: accessToken });
      const { data: user } = await octokit.users.getAuthenticated();

      // Encrypt token before storing
      const encryptedToken = this.encryptToken(accessToken);

      // Store or update account (only one GitHub account per user)
      const account = await this.prisma.deploymentAccount.upsert({
        where: {
          userId_type: {
            userId,
            type: DeploymentAccountType.GITHUB,
          },
        },
        update: {
          accessToken: encryptedToken,
          username: user.login,
          email: user.email || `${user.login}@github.com`,
          lastUsed: new Date(),
        },
        create: {
          userId,
          type: DeploymentAccountType.GITHUB,
          email: user.email || `${user.login}@github.com`,
          username: user.login,
          accessToken: encryptedToken,
        },
      });

      return account;
    } catch (error) {
      console.error('GitHub OAuth error:', error);
      throw new Error(
        `Failed to connect GitHub account: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Connect a Cloudflare account via API token
   */
  async connectCloudflareAccount(
    userId: string,
    apiToken: string
  ): Promise<DeploymentAccount> {
    try {
      // Validate token by fetching account info
      const cloudflare = new Cloudflare({ apiToken });

      // Verify token works by fetching user info
      const user = await cloudflare.user.get();

      if (!user || !user.id) {
        throw new Error('Invalid Cloudflare API token');
      }

      // Get email from Cloudflare API (or fallback to user ID)
      const email = user.email || `${user.id}@cloudflare.user`;
      const username = user.email?.split('@')[0] || user.id;

      // Encrypt token before storing
      const encryptedToken = this.encryptToken(apiToken);

      // Store or update account (only one Cloudflare account per user)
      const account = await this.prisma.deploymentAccount.upsert({
        where: {
          userId_type: {
            userId,
            type: DeploymentAccountType.CLOUDFLARE,
          },
        },
        update: {
          accessToken: encryptedToken,
          username,
          email,
          lastUsed: new Date(),
        },
        create: {
          userId,
          type: DeploymentAccountType.CLOUDFLARE,
          email,
          username,
          accessToken: encryptedToken,
        },
      });

      return account;
    } catch (error) {
      console.error('Cloudflare connection error:', error);
      throw new Error(
        `Failed to connect Cloudflare account: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Disconnect a deployment account
   */
  async disconnectAccount(userId: string, accountId: string): Promise<void> {
    // Verify account belongs to user
    const account = await this.prisma.deploymentAccount.findFirst({
      where: {
        id: accountId,
        userId,
      },
    });

    if (!account) {
      throw new Error('Account not found or does not belong to user');
    }

    // Check for active deployment configs
    const activeConfigs = await this.prisma.deploymentConfig.count({
      where: {
        accountId,
      },
    });

    if (activeConfigs > 0) {
      throw new Error(
        `Cannot disconnect account: ${activeConfigs} deployment configurations are using this account`
      );
    }

    // Delete account (will cascade delete configs if we remove the check above)
    await this.prisma.deploymentAccount.delete({
      where: { id: accountId },
    });
  }

  /**
   * Get all deployment accounts for a user
   */
  async getAccounts(userId: string): Promise<DeploymentAccount[]> {
    const accounts = await this.prisma.deploymentAccount.findMany({
      where: { userId },
    });

    // Remove sensitive fields before returning
    return accounts.map(account => ({
      ...account,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
    }));
  }

  /**
   * Get a decrypted access token for an account
   * Internal use only - never expose this to API responses
   */
  async getDecryptedToken(accountId: string, userId: string): Promise<string> {
    const account = await this.prisma.deploymentAccount.findFirst({
      where: {
        id: accountId,
        userId,
      },
    });

    if (!account) {
      throw new Error('Account not found or does not belong to user');
    }

    if (!account.accessToken) {
      throw new Error('No access token found for this account');
    }

    return this.decryptToken(account.accessToken);
  }

  /**
   * Validate a GitHub token
   */
  async validateGitHubToken(token: string): Promise<boolean> {
    try {
      const octokit = new Octokit({ auth: token });
      await octokit.users.getAuthenticated();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate a Cloudflare token
   */
  async validateCloudflareToken(token: string): Promise<boolean> {
    try {
      const cloudflare = new Cloudflare({ apiToken: token });
      await cloudflare.user.get();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Update last used timestamp for an account
   */
  async updateLastUsed(accountId: string): Promise<void> {
    await this.prisma.deploymentAccount.update({
      where: { id: accountId },
      data: { lastUsed: new Date() },
    });
  }
}
