import { PrismaClient } from '@prisma/client';
import { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import { AuthenticationService } from '../services/authentication.js';
import { JWTUtils } from '../utils/jwt.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  emailVerified: boolean;
}

export interface AuthenticatedRequest extends FastifyRequest {
  user?: AuthenticatedUser;
}

export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  CONVERSATION_NOT_FOUND = 'CONVERSATION_NOT_FOUND',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
}

export interface AuthError extends Error {
  code: AuthErrorCode;
  statusCode: number;
  details?: any;
}

export class AuthMiddleware {
  private authService: AuthenticationService;

  constructor(prisma: PrismaClient) {
    this.authService = new AuthenticationService(prisma);
  }

  /**
   * Extract JWT token from request headers
   */
  private extractToken(request: FastifyRequest): string | null {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return null;
    }

    // Support both "Bearer token" and "token" formats
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return authHeader;
  }

  /**
   * Authenticate request and inject user context
   * This is the core authentication method used by other middleware
   */
  async authenticate(
    request: AuthenticatedRequest
  ): Promise<AuthenticatedUser> {
    const token = this.extractToken(request);

    if (!token) {
      const error = new Error('Authentication token required') as AuthError;
      error.code = AuthErrorCode.INVALID_TOKEN;
      error.statusCode = 401;
      throw error;
    }

    try {
      // Verify JWT token
      JWTUtils.verifyAccessToken(token);

      // Validate session and get user details
      const user = await this.authService.validateSession(token);

      if (!user) {
        const error = new Error('Invalid or expired session') as AuthError;
        error.code = AuthErrorCode.SESSION_EXPIRED;
        error.statusCode = 401;
        throw error;
      }

      const authenticatedUser: AuthenticatedUser = {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        emailVerified: user.emailVerified,
      };

      // Inject user into request
      request.user = authenticatedUser;

      return authenticatedUser;
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error; // Re-throw AuthError
      }

      // Handle JWT verification errors
      const authError = new Error('Invalid authentication token') as AuthError;
      authError.code = AuthErrorCode.INVALID_TOKEN;
      authError.statusCode = 401;
      throw authError;
    }
  }

  /**
   * Middleware that requires authentication
   * Throws error if user is not authenticated
   */
  requireAuth(): preHandlerHookHandler {
    return async (request, reply) => {
      try {
        await this.authenticate(request as AuthenticatedRequest);
      } catch (error) {
        const authError = error as AuthError;
        reply.code(authError.statusCode || 401).send({
          error: authError.code || 'AUTHENTICATION_REQUIRED',
          message: authError.message,
          details: authError.details || {},
          timestamp: new Date().toISOString(),
        });
      }
    };
  }

  /**
   * Middleware that optionally authenticates
   * Does not throw error if user is not authenticated
   */
  optionalAuth(): preHandlerHookHandler {
    return async (request, _reply) => {
      try {
        await this.authenticate(request as AuthenticatedRequest);
      } catch (error) {
        // Silently ignore authentication errors for optional auth
        // User will be undefined in request.user
      }
    };
  }

  /**
   * Middleware for session verification and refresh logic
   * Automatically refreshes tokens if they're close to expiry
   */
  verifySession() {
    return async (
      request: AuthenticatedRequest,
      reply: FastifyReply
    ): Promise<void> => {
      const token = this.extractToken(request);

      if (!token) {
        reply.code(401).send({
          error: AuthErrorCode.INVALID_TOKEN,
          message: 'Authentication token required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      try {
        // Check if token is close to expiry (within 5 minutes)
        const expiration = JWTUtils.getTokenExpiration(token);
        const now = new Date();
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

        if (expiration && expiration < fiveMinutesFromNow) {
          // Token is close to expiry, suggest refresh
          reply.header('X-Token-Refresh-Suggested', 'true');
        }

        // Authenticate normally
        await this.authenticate(request);
      } catch (error) {
        const authError = error as AuthError;

        // If token is expired, provide specific error code
        if (JWTUtils.isTokenExpired(token)) {
          reply.code(401).send({
            error: AuthErrorCode.TOKEN_EXPIRED,
            message: 'Authentication token has expired',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        reply.code(authError.statusCode || 401).send({
          error: authError.code || 'AUTHENTICATION_FAILED',
          message: authError.message,
          details: authError.details || {},
          timestamp: new Date().toISOString(),
        });
      }
    };
  }

  /**
   * Middleware to inject user context for authenticated requests
   * Similar to authenticate but doesn't throw on missing auth
   */
  injectUserContext() {
    return async (
      request: AuthenticatedRequest,
      _reply: FastifyReply
    ): Promise<void> => {
      const token = this.extractToken(request);

      if (!token) {
        return; // No token, no user context
      }

      try {
        const user = await this.authService.validateSession(token);

        if (user) {
          request.user = {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            emailVerified: user.emailVerified,
          };
        }
      } catch (error) {
        // Silently ignore errors when injecting context
        // This allows endpoints to work for both authenticated and unauthenticated users
      }
    };
  }

  /**
   * Get authentication service instance
   */
  getAuthService(): AuthenticationService {
    return this.authService;
  }
}
