import { PrismaClient } from '@prisma/client';
import { AuthenticationService, AuthResult } from './authentication.js';
import { OAuthService, OAuthUserInfo } from './oauthService.js';

export interface OAuthCallbackRequest {
  code: string;
  state?: string;
  error?: string;
  error_description?: string;
}

export interface OAuthCallbackResult {
  success: boolean;
  authResult?: AuthResult;
  error?: string;
  redirectUrl?: string;
}

export class OAuthCallbackHandler {
  private prisma: PrismaClient;
  private oauthService: OAuthService;
  private authService: AuthenticationService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.oauthService = new OAuthService();
    this.authService = new AuthenticationService(prisma);
  }

  /**
   * Handle Google OAuth callback
   */
  async handleGoogleCallback(
    request: OAuthCallbackRequest
  ): Promise<OAuthCallbackResult> {
    return this.handleOAuthCallback('google', request);
  }

  /**
   * Handle GitHub OAuth callback
   */
  async handleGitHubCallback(
    request: OAuthCallbackRequest
  ): Promise<OAuthCallbackResult> {
    return this.handleOAuthCallback('github', request);
  }

  /**
   * Generic OAuth callback handler
   */
  private async handleOAuthCallback(
    provider: 'google' | 'github',
    request: OAuthCallbackRequest
  ): Promise<OAuthCallbackResult> {
    try {
      // Check for OAuth errors
      if (request.error) {
        return {
          success: false,
          error: `OAuth error: ${request.error} - ${request.error_description || 'Unknown error'}`,
          redirectUrl: '/login?error=oauth_error',
        };
      }

      // Validate required parameters
      if (!request.code) {
        return {
          success: false,
          error: 'Missing authorization code',
          redirectUrl: '/login?error=missing_code',
        };
      }

      // Complete OAuth flow
      const userInfo = await this.oauthService.completeOAuthFlow(
        provider,
        request.code
      );

      // Authenticate or register user
      const authResult = await this.authenticateOAuthUser(userInfo);

      return {
        success: true,
        authResult,
        redirectUrl: '/dashboard',
      };
    } catch (error) {
      console.error(`OAuth ${provider} callback error:`, error);

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'OAuth authentication failed',
        redirectUrl: '/login?error=oauth_failed',
      };
    }
  }

  /**
   * Authenticate or register OAuth user
   */
  private async authenticateOAuthUser(
    userInfo: OAuthUserInfo
  ): Promise<AuthResult> {
    // Check if user exists by email or provider ID
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: userInfo.email },
          {
            provider: userInfo.provider,
            providerId: userInfo.id,
          },
        ],
      },
    });

    if (user) {
      // Update existing user with OAuth info if needed
      if (
        user.provider !== userInfo.provider ||
        user.providerId !== userInfo.id
      ) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            provider: userInfo.provider,
            providerId: userInfo.id,
            emailVerified: true, // OAuth emails are pre-verified
            lastLoginAt: new Date(),
          },
        });
      } else {
        // Just update last login
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
      }

      // Generate tokens
      const { accessToken, refreshToken } =
        await this.generateTokensForUser(user);

      return {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          emailVerified: user.emailVerified,
        },
        accessToken,
        refreshToken,
        expiresIn: 60 * 60, // 1 hour
      };
    } else {
      // Create new user
      const newUser = await this.prisma.user.create({
        data: {
          email: userInfo.email,
          displayName: userInfo.name,
          provider: userInfo.provider,
          providerId: userInfo.id,
          emailVerified: true,
          role: 'user',
        },
      });

      // Create default project
      await this.prisma.project.create({
        data: {
          userId: newUser.id,
          name: 'My First Project',
          description: 'Default project for getting started',
          isDefault: true,
        },
      });

      // Generate tokens
      const { accessToken, refreshToken } =
        await this.generateTokensForUser(newUser);

      return {
        user: {
          id: newUser.id,
          email: newUser.email,
          displayName: newUser.displayName,
          role: newUser.role,
          emailVerified: newUser.emailVerified,
        },
        accessToken,
        refreshToken,
        expiresIn: 60 * 60, // 1 hour
      };
    }
  }

  /**
   * Generate tokens for user (reuse from AuthenticationService)
   */
  private async generateTokensForUser(
    user: any
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Use the authentication service to generate tokens
    const loginResult = await this.authService.loginWithOAuth({
      provider: user.provider as 'google' | 'github',
      code: '', // Not needed for existing user
      email: user.email,
      displayName: user.displayName,
      providerId: user.providerId,
    });

    return {
      accessToken: loginResult.accessToken,
      refreshToken: loginResult.refreshToken,
    };
  }

  /**
   * Link OAuth account to existing user
   */
  async linkOAuthAccount(
    userId: string,
    provider: 'google' | 'github',
    code: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get OAuth user info
      const userInfo = await this.oauthService.completeOAuthFlow(
        provider,
        code
      );

      // Check if OAuth account is already linked to another user
      const existingUser = await this.prisma.user.findFirst({
        where: {
          provider: userInfo.provider,
          providerId: userInfo.id,
          id: { not: userId },
        },
      });

      if (existingUser) {
        return {
          success: false,
          error: 'This OAuth account is already linked to another user',
        };
      }

      // Update user with OAuth info
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          provider: userInfo.provider,
          providerId: userInfo.id,
          emailVerified: true,
        },
      });

      return { success: true };
    } catch (error) {
      console.error('OAuth account linking error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to link OAuth account',
      };
    }
  }

  /**
   * Unlink OAuth account from user
   */
  async unlinkOAuthAccount(
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Check if user has a password (can't unlink if it's the only auth method)
      if (!user.passwordHash) {
        return {
          success: false,
          error: 'Cannot unlink OAuth account without setting a password first',
        };
      }

      // Remove OAuth info
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          provider: 'local',
          providerId: null,
        },
      });

      return { success: true };
    } catch (error) {
      console.error('OAuth account unlinking error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to unlink OAuth account',
      };
    }
  }

  /**
   * Get OAuth authorization URL with state
   */
  getAuthorizationUrl(provider: 'google' | 'github'): string {
    const state = this.oauthService.generateState();

    // Store state in session/cache if needed for validation
    // For now, we'll just generate the URL

    return this.oauthService.getAuthorizationUrl(provider, state);
  }

  /**
   * Check if OAuth provider is configured
   */
  isProviderConfigured(provider: 'google' | 'github'): boolean {
    return this.oauthService.isProviderConfigured(provider);
  }

  /**
   * Get list of configured OAuth providers
   */
  getConfiguredProviders(): string[] {
    return this.oauthService.getConfiguredProviders();
  }
}
