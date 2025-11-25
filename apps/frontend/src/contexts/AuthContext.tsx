/**
 * Authentication context and provider
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from 'react';
import { authService } from '../services/auth';
import type {
  AuthContextValue,
  AuthError,
  AuthState,
  LoginCredentials,
  PasswordChange,
  PasswordReset,
  PasswordResetRequest,
  RegisterCredentials,
  User,
} from '../types/auth';

// Auth reducer actions
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_ERROR'; payload: AuthError }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' };

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start with loading true to check for existing session
  error: null,
};

// Create context
const AuthContext = createContext<AuthContextValue | null>(null);

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider component
export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Helper function to handle auth errors
  const handleAuthError = useCallback((error: unknown): void => {
    const authError: AuthError = {
      code: 'UNKNOWN_ERROR',
      message:
        error instanceof Error ? error.message : 'An unknown error occurred',
    };

    if (error instanceof Error) {
      // Parse common error patterns
      if (
        error.message.includes('401') ||
        error.message.includes('Unauthorized')
      ) {
        authError.code = 'INVALID_CREDENTIALS';
        authError.message = 'Invalid email or password';
      } else if (
        error.message.includes('409') ||
        error.message.includes('already exists')
      ) {
        authError.code = 'EMAIL_ALREADY_EXISTS';
        authError.message = 'An account with this email already exists';
      } else if (error.message.includes('400')) {
        authError.code = 'INVALID_REQUEST';
        authError.message = 'Invalid request. Please check your input.';
      } else if (
        error.message.includes('Network') ||
        error.message.includes('fetch')
      ) {
        authError.code = 'NETWORK_ERROR';
        authError.message = 'Network error. Please check your connection.';
      }
    }

    dispatch({ type: 'AUTH_ERROR', payload: authError });
  }, []);

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async (): Promise<void> => {
      try {
        // Check if we have a valid token
        if (authService.hasValidToken()) {
          // Try to get current user
          const user = await authService.getCurrentUser();
          dispatch({ type: 'AUTH_SUCCESS', payload: user });
        } else if (authService.getRefreshToken()) {
          // Try to refresh token
          const result = await authService.refreshTokens();
          dispatch({ type: 'AUTH_SUCCESS', payload: result.user });
        } else {
          // No valid tokens, user is not authenticated
          dispatch({ type: 'AUTH_LOGOUT' });
        }
      } catch {
        // Clear invalid tokens and set unauthenticated state
        await authService.logout();
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    };

    initializeAuth();
  }, []);

  // Auto-refresh token before expiration
  useEffect(() => {
    if (!state.isAuthenticated || !authService.getAccessToken()) {
      return;
    }

    const token = authService.getAccessToken()!;
    let refreshTimer: NodeJS.Timeout;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiresAt = payload.exp * 1000;
      const refreshAt = expiresAt - 5 * 60 * 1000; // Refresh 5 minutes before expiration
      const timeUntilRefresh = refreshAt - Date.now();

      if (timeUntilRefresh > 0) {
        refreshTimer = setTimeout(async () => {
          try {
            const result = await authService.refreshTokens();
            dispatch({ type: 'AUTH_SUCCESS', payload: result.user });
          } catch (error) {
            handleAuthError(error);
          }
        }, timeUntilRefresh);
      }
    } catch (error) {
      console.warn('Failed to parse token for auto-refresh:', error);
    }

    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [state.isAuthenticated, handleAuthError]);

  // Login function
  const login = useCallback(
    async (credentials: LoginCredentials): Promise<void> => {
      dispatch({ type: 'AUTH_START' });
      try {
        const result = await authService.login(credentials);
        dispatch({ type: 'AUTH_SUCCESS', payload: result.user });
      } catch (error) {
        handleAuthError(error);
        throw error;
      }
    },
    [handleAuthError]
  );

  // Register function
  const register = useCallback(
    async (credentials: RegisterCredentials): Promise<void> => {
      dispatch({ type: 'AUTH_START' });
      try {
        const result = await authService.register(credentials);
        dispatch({ type: 'AUTH_SUCCESS', payload: result.user });
      } catch (error) {
        handleAuthError(error);
        throw error;
      }
    },
    [handleAuthError]
  );

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      console.warn('Logout error:', error);
    } finally {
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  }, []);

  // Refresh token function
  const refreshToken = useCallback(async (): Promise<void> => {
    try {
      const result = await authService.refreshTokens();
      dispatch({ type: 'AUTH_SUCCESS', payload: result.user });
    } catch (error) {
      handleAuthError(error);
      throw error;
    }
  }, [handleAuthError]);

  // Request password reset function
  const requestPasswordReset = useCallback(
    async (request: PasswordResetRequest): Promise<void> => {
      dispatch({ type: 'AUTH_START' });
      try {
        await authService.requestPasswordReset(request);
        dispatch({ type: 'CLEAR_ERROR' });
      } catch (error) {
        handleAuthError(error);
        throw error;
      }
    },
    [handleAuthError]
  );

  // Reset password function
  const resetPassword = useCallback(
    async (reset: PasswordReset): Promise<void> => {
      dispatch({ type: 'AUTH_START' });
      try {
        await authService.resetPassword(reset);
        dispatch({ type: 'CLEAR_ERROR' });
      } catch (error) {
        handleAuthError(error);
        throw error;
      }
    },
    [handleAuthError]
  );

  // Change password function
  const changePassword = useCallback(
    async (change: PasswordChange): Promise<void> => {
      dispatch({ type: 'AUTH_START' });
      try {
        await authService.changePassword(change);
        dispatch({ type: 'CLEAR_ERROR' });
      } catch (error) {
        handleAuthError(error);
        throw error;
      }
    },
    [handleAuthError]
  );

  // Clear error function
  const clearError = useCallback((): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // Context value
  const contextValue: AuthContextValue = {
    ...state,
    login,
    register,
    logout,
    refreshToken,
    requestPasswordReset,
    resetPassword,
    changePassword,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

// Custom hook to use auth context
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
