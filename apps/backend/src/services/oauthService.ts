import fetch from 'node-fetch';

export interface OAuthProvider {
  name: 'google' | 'github';
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
}

export interface OAuthUserInfo {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: 'google' | 'github';
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export class OAuthService {
  private providers: Map<string, OAuthProvider>;

  constructor() {
    this.providers = new Map();
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Google OAuth configuration
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      this.providers.set('google', {
        name: 'google',
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri:
          process.env.GOOGLE_REDIRECT_URI ||
          'http://localhost:3000/auth/google/callback',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scope: 'openid email profile',
      });
    }

    // GitHub OAuth configuration
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      this.providers.set('github', {
        name: 'github',
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        redirectUri:
          process.env.GITHUB_REDIRECT_URI ||
          'http://localhost:3000/auth/github/callback',
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userInfoUrl: 'https://api.github.com/user',
        scope: 'user:email',
      });
    }
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(
    providerName: 'google' | 'github',
    state?: string
  ): string {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`OAuth provider ${providerName} not configured`);
    }

    const params = new URLSearchParams({
      client_id: provider.clientId,
      redirect_uri: provider.redirectUri,
      scope: provider.scope,
      response_type: 'code',
    });

    if (state) {
      params.append('state', state);
    }

    // Provider-specific parameters
    if (providerName === 'google') {
      params.append('access_type', 'offline');
      params.append('prompt', 'consent');
    }

    return `${provider.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    providerName: 'google' | 'github',
    code: string
  ): Promise<OAuthTokenResponse> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`OAuth provider ${providerName} not configured`);
    }

    const params = new URLSearchParams({
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
      code,
      redirect_uri: provider.redirectUri,
    });

    // Provider-specific parameters
    if (providerName === 'google') {
      params.append('grant_type', 'authorization_code');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    // GitHub requires Accept header
    if (providerName === 'github') {
      headers['Accept'] = 'application/json';
    }

    const response = await fetch(provider.tokenUrl, {
      method: 'POST',
      headers,
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to exchange code for token: ${errorText}`);
    }

    const tokenData = (await response.json()) as OAuthTokenResponse;
    return tokenData;
  }

  /**
   * Get user information using access token
   */
  async getUserInfo(
    providerName: 'google' | 'github',
    accessToken: string
  ): Promise<OAuthUserInfo> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`OAuth provider ${providerName} not configured`);
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };

    // GitHub requires User-Agent header
    if (providerName === 'github') {
      headers['User-Agent'] = 'InstaBuild-App';
    }

    const response = await fetch(provider.userInfoUrl, {
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get user info: ${errorText}`);
    }

    const userData = (await response.json()) as any;

    // Handle different provider response formats
    if (providerName === 'google') {
      return {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        avatar: userData.picture,
        provider: 'google',
      };
    } else if (providerName === 'github') {
      // GitHub might not return email in the user endpoint, need to fetch separately
      let email = userData.email;

      if (!email) {
        email = await this.getGitHubUserEmail(accessToken);
      }

      return {
        id: userData.id.toString(),
        email,
        name: userData.name || userData.login,
        avatar: userData.avatar_url,
        provider: 'github',
      };
    }

    throw new Error(`Unsupported provider: ${providerName}`);
  }

  /**
   * Get GitHub user's primary email (separate API call)
   */
  private async getGitHubUserEmail(accessToken: string): Promise<string> {
    const response = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'InstaBuild-App',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get GitHub user email');
    }

    const emails = (await response.json()) as Array<{
      email: string;
      primary: boolean;
      verified: boolean;
    }>;

    // Find primary verified email
    const primaryEmail = emails.find(e => e.primary && e.verified);
    if (primaryEmail) {
      return primaryEmail.email;
    }

    // Fallback to first verified email
    const verifiedEmail = emails.find(e => e.verified);
    if (verifiedEmail) {
      return verifiedEmail.email;
    }

    throw new Error('No verified email found for GitHub user');
  }

  /**
   * Complete OAuth flow: exchange code and get user info
   */
  async completeOAuthFlow(
    providerName: 'google' | 'github',
    code: string
  ): Promise<OAuthUserInfo> {
    // Exchange code for token
    const tokenResponse = await this.exchangeCodeForToken(providerName, code);

    // Get user info
    const userInfo = await this.getUserInfo(
      providerName,
      tokenResponse.access_token
    );

    return userInfo;
  }

  /**
   * Check if provider is configured
   */
  isProviderConfigured(providerName: 'google' | 'github'): boolean {
    return this.providers.has(providerName);
  }

  /**
   * Get list of configured providers
   */
  getConfiguredProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Generate state parameter for CSRF protection
   */
  generateState(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  /**
   * Validate state parameter
   */
  validateState(receivedState: string, expectedState: string): boolean {
    return receivedState === expectedState;
  }
}
