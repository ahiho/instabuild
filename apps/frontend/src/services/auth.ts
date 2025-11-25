/**
 * Authentication service for API communication
 */

import type {
  AuthResult,
  LoginCredentials,
  OAuthProvider,
  PasswordChange,
  PasswordReset,
  PasswordResetRequest,
  RegisterCredentials,
  User,
} from '../types/auth';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

class AuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Load tokens from localStorage on initialization
    this.loadTokensFromStorage();
  }

  private loadTokensFromStorage(): void {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  private saveTokensToStorage(accessToken: string, refreshToken: string): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  private clearTokensFromStorage(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.accessToken = null;
    this.refreshToken = null;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add authorization header if we have an access token
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || errorData.message || `HTTP ${response.status}`
      );
    }

    const responseData = await response.json();

    // Unwrap the API response format { success, data, error }
    if (responseData.success === true && responseData.data !== undefined) {
      return responseData.data;
    }

    // If response doesn't match expected format, return as-is
    return responseData;
  }

  async register(credentials: RegisterCredentials): Promise<AuthResult> {
    const result = await this.makeRequest<AuthResult>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    this.saveTokensToStorage(result.accessToken, result.refreshToken);
    return result;
  }

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    const result = await this.makeRequest<AuthResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    this.saveTokensToStorage(result.accessToken, result.refreshToken);
    return result;
  }

  async logout(): Promise<void> {
    try {
      await this.makeRequest('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      this.clearTokensFromStorage();
    }
  }

  async refreshTokens(): Promise<AuthResult> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const result = await this.makeRequest<AuthResult>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });

    this.saveTokensToStorage(result.accessToken, result.refreshToken);
    return result;
  }

  async getCurrentUser(): Promise<User> {
    return this.makeRequest<User>('/users/profile');
  }

  async requestPasswordReset(request: PasswordResetRequest): Promise<void> {
    await this.makeRequest('/auth/password-reset', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async resetPassword(reset: PasswordReset): Promise<void> {
    await this.makeRequest('/auth/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify(reset),
    });
  }

  async changePassword(change: PasswordChange): Promise<void> {
    await this.makeRequest('/users/password', {
      method: 'PATCH',
      body: JSON.stringify(change),
    });
  }

  async initiateOAuth(provider: OAuthProvider): Promise<string> {
    const response = await this.makeRequest<{ url: string }>(
      `/auth/oauth/${provider}`
    );
    return response.url;
  }

  async handleOAuthCallback(
    provider: OAuthProvider,
    code: string
  ): Promise<AuthResult> {
    const result = await this.makeRequest<AuthResult>(
      `/auth/oauth/${provider}/callback`,
      {
        method: 'POST',
        body: JSON.stringify({ code }),
      }
    );

    this.saveTokensToStorage(result.accessToken, result.refreshToken);
    return result;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }

  hasValidToken(): boolean {
    return this.accessToken !== null && !this.isTokenExpired(this.accessToken);
  }
}

export const authService = new AuthService();
