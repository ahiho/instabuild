/**
 * Authentication types for the frontend
 */

export interface User {
  id: string;
  email: string;
  displayName: string;
  provider: 'local' | 'google' | 'github';
  providerId?: string;
  createdAt: string;
  lastLoginAt?: string;
  emailVerified: boolean;
  role: 'admin' | 'user' | 'guest';
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  marketing: boolean;
}

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  displayName: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordReset {
  token: string;
  newPassword: string;
}

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
}

export interface AuthError {
  code: string;
  message: string;
  details?: unknown;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
}

export interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  requestPasswordReset: (request: PasswordResetRequest) => Promise<void>;
  resetPassword: (reset: PasswordReset) => Promise<void>;
  changePassword: (change: PasswordChange) => Promise<void>;
  clearError: () => void;
}

export type OAuthProvider = 'google' | 'github';
