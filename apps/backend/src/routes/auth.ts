import { ApiResponse, createApiResponse } from '@instabuild/shared';
import { PrismaClient } from '@prisma/client';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  AuthenticationService,
  AuthResult,
  LoginRequest,
  OAuthLoginRequest,
  RegisterRequest,
} from '../services/authentication.js';
import { OAuthService } from '../services/oauthService.js';

// Request/Response type definitions
interface RegisterBody {
  email: string;
  password: string;
  displayName: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface RefreshBody {
  refreshToken: string;
}

interface LogoutBody {
  sessionId?: string;
}

interface OAuthCallbackQuery {
  code: string;
  state?: string;
  error?: string;
  error_description?: string;
}

// Validation schemas
const registerSchema = {
  type: 'object',
  required: ['email', 'password', 'displayName'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      maxLength: 255,
    },
    password: {
      type: 'string',
      minLength: 8,
      maxLength: 128,
    },
    displayName: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
    },
  },
};

const loginSchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      maxLength: 255,
    },
    password: {
      type: 'string',
      minLength: 1,
      maxLength: 128,
    },
  },
};

const refreshSchema = {
  type: 'object',
  required: ['refreshToken'],
  properties: {
    refreshToken: {
      type: 'string',
      minLength: 1,
    },
  },
};

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  const prisma = fastify.prisma as PrismaClient;
  const authService = new AuthenticationService(prisma);
  const oauthService = new OAuthService();

  /**
   * POST /api/v1/auth/register
   * Register a new user with email and password
   */
  fastify.post<{
    Body: RegisterBody;
    Reply: ApiResponse<AuthResult>;
  }>(
    '/auth/register',
    {
      schema: {
        body: registerSchema,
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      email: { type: 'string' },
                      displayName: { type: 'string' },
                      role: { type: 'string' },
                      emailVerified: { type: 'boolean' },
                    },
                  },
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                  expiresIn: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: RegisterBody }>,
      reply: FastifyReply
    ) => {
      try {
        const { email, password, displayName } = request.body;

        const registerRequest: RegisterRequest = {
          email: email.toLowerCase().trim(),
          password,
          displayName: displayName.trim(),
        };

        const result = await authService.register(registerRequest);

        // Set refresh token as HTTP-only cookie
        reply.setCookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          path: '/',
        });

        const response = createApiResponse(true, result);
        return reply.code(201).send(response);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Registration failed';

        if (errorMessage.includes('already exists')) {
          const response = createApiResponse(
            false,
            undefined,
            'User with this email already exists'
          );
          return reply.code(409).send(response);
        }

        const response = createApiResponse(false, undefined, errorMessage);
        return reply.code(400).send(response);
      }
    }
  );

  /**
   * POST /api/v1/auth/login
   * Login user with email and password
   */
  fastify.post<{
    Body: LoginBody;
    Reply: ApiResponse<AuthResult>;
  }>(
    '/auth/login',
    {
      schema: {
        body: loginSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      email: { type: 'string' },
                      displayName: { type: 'string' },
                      role: { type: 'string' },
                      emailVerified: { type: 'boolean' },
                    },
                  },
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                  expiresIn: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: LoginBody }>,
      reply: FastifyReply
    ) => {
      try {
        const { email, password } = request.body;

        const loginRequest: LoginRequest = {
          email: email.toLowerCase().trim(),
          password,
        };

        const result = await authService.login(loginRequest);

        // Set refresh token as HTTP-only cookie
        reply.setCookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          path: '/',
        });

        const response = createApiResponse(true, result);
        return reply.code(200).send(response);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Login failed';

        if (errorMessage.includes('Invalid credentials')) {
          const response = createApiResponse(
            false,
            undefined,
            'Invalid email or password'
          );
          return reply.code(401).send(response);
        }

        const response = createApiResponse(false, undefined, errorMessage);
        return reply.code(400).send(response);
      }
    }
  );

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token using refresh token
   */
  fastify.post<{
    Body: RefreshBody;
    Reply: ApiResponse<AuthResult>;
  }>(
    '/auth/refresh',
    {
      schema: {
        body: refreshSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      email: { type: 'string' },
                      displayName: { type: 'string' },
                      role: { type: 'string' },
                      emailVerified: { type: 'boolean' },
                    },
                  },
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                  expiresIn: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: RefreshBody }>,
      reply: FastifyReply
    ) => {
      try {
        // Try to get refresh token from body first, then from cookies
        let refreshToken = request.body.refreshToken;

        if (!refreshToken && request.cookies.refreshToken) {
          refreshToken = request.cookies.refreshToken;
        }

        if (!refreshToken) {
          const response = createApiResponse(
            false,
            undefined,
            'Refresh token is required'
          );
          return reply.code(400).send(response);
        }

        const result = await authService.refreshToken(refreshToken);

        // Set new refresh token as HTTP-only cookie
        reply.setCookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          path: '/',
        });

        const response = createApiResponse(true, result);
        return reply.code(200).send(response);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Token refresh failed';

        if (errorMessage.includes('Invalid refresh token')) {
          // Clear the invalid refresh token cookie
          reply.clearCookie('refreshToken', { path: '/' });
          const response = createApiResponse(
            false,
            undefined,
            'Invalid or expired refresh token'
          );
          return reply.code(401).send(response);
        }

        const response = createApiResponse(false, undefined, errorMessage);
        return reply.code(400).send(response);
      }
    }
  );

  /**
   * POST /api/v1/auth/logout
   * Logout user by deactivating session
   */
  fastify.post<{
    Body: LogoutBody;
    Reply: ApiResponse<{ message: string }>;
  }>(
    '/auth/logout',
    async (
      request: FastifyRequest<{ Body: LogoutBody }>,
      reply: FastifyReply
    ) => {
      try {
        // Get refresh token from cookies or body
        let refreshToken = request.cookies.refreshToken;

        if (!refreshToken && request.body.sessionId) {
          // If sessionId is provided in body, use it as the token to deactivate
          refreshToken = request.body.sessionId;
        }

        if (refreshToken) {
          // Find the session to get userId for project cleanup
          const prisma = fastify.prisma as PrismaClient;
          const session = await prisma.userSession.findFirst({
            where: { token: refreshToken, isActive: true },
          });

          if (session) {
            await authService.logout(session.id, session.userId);
          }
        }

        // Clear refresh token cookie regardless
        reply.clearCookie('refreshToken', { path: '/' });

        const response = createApiResponse(true, {
          message: 'Logged out successfully',
        });
        return reply.code(200).send(response);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Logout failed';

        // Still clear the cookie even if logout fails
        reply.clearCookie('refreshToken', { path: '/' });

        const response = createApiResponse(false, undefined, errorMessage);
        return reply.code(400).send(response);
      }
    }
  );

  /**
   * GET /api/v1/auth/oauth/:provider
   * Initiate OAuth authentication flow
   */
  fastify.get<{
    Params: { provider: 'google' | 'github' };
    Querystring: { redirect_uri?: string };
    Reply: ApiResponse<{ authUrl: string; state: string }>;
  }>('/auth/oauth/:provider', async (request, reply) => {
    try {
      const { provider } = request.params;
      // eslint-disable-next-line camelcase
      const { redirect_uri } = request.query;

      // Validate provider
      if (!['google', 'github'].includes(provider)) {
        const response = createApiResponse(
          false,
          undefined,
          'Unsupported OAuth provider'
        );
        return reply.code(400).send(response);
      }

      // Check if provider is configured
      if (!oauthService.isProviderConfigured(provider)) {
        const response = createApiResponse(
          false,
          undefined,
          `${provider} OAuth is not configured`
        );
        return reply.code(400).send(response);
      }

      // Generate state for CSRF protection
      const state = oauthService.generateState();

      // Store state in session/cookie for validation
      reply.setCookie(`oauth_state_${provider}`, state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 10 * 60 * 1000, // 10 minutes
        path: '/',
      });

      // Store redirect URI if provided
      // eslint-disable-next-line camelcase
      if (redirect_uri) {
        reply.setCookie(`oauth_redirect_${provider}`, redirect_uri, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 10 * 60 * 1000, // 10 minutes
          path: '/',
        });
      }

      // Get authorization URL
      const authUrl = oauthService.getAuthorizationUrl(provider, state);

      const response = createApiResponse(true, { authUrl, state });
      return reply.code(200).send(response);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'OAuth initiation failed';
      const response = createApiResponse(false, undefined, errorMessage);
      return reply.code(400).send(response);
    }
  });

  /**
   * GET /api/v1/auth/oauth/:provider/callback
   * Handle OAuth callback and complete authentication
   */
  fastify.get<{
    Params: { provider: 'google' | 'github' };
    Querystring: OAuthCallbackQuery;
    Reply: ApiResponse<AuthResult>;
  }>('/auth/oauth/:provider/callback', async (request, reply) => {
    try {
      const { provider } = request.params;
      // eslint-disable-next-line camelcase
      const { code, state, error, error_description } = request.query;

      // Check for OAuth errors
      if (error) {
        // eslint-disable-next-line camelcase
        const errorMsg = error_description || error;
        const response = createApiResponse(
          false,
          undefined,
          `OAuth error: ${errorMsg}`
        );
        return reply.code(400).send(response);
      }

      if (!code) {
        const response = createApiResponse(
          false,
          undefined,
          'Authorization code is required'
        );
        return reply.code(400).send(response);
      }

      // Validate state parameter for CSRF protection
      const expectedState = request.cookies[`oauth_state_${provider}`];
      if (
        !expectedState ||
        !state ||
        !oauthService.validateState(state, expectedState)
      ) {
        const response = createApiResponse(
          false,
          undefined,
          'Invalid state parameter'
        );
        return reply.code(400).send(response);
      }

      // Clear state cookie
      reply.clearCookie(`oauth_state_${provider}`, { path: '/' });

      // Complete OAuth flow
      const userInfo = await oauthService.completeOAuthFlow(provider, code);

      // Create OAuth login request
      const oauthLoginRequest: OAuthLoginRequest = {
        provider,
        code,
        email: userInfo.email,
        displayName: userInfo.name,
        providerId: userInfo.id,
      };

      // Login or register user
      const result = await authService.loginWithOAuth(oauthLoginRequest);

      // Set refresh token as HTTP-only cookie
      reply.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });

      // Check for custom redirect URI
      const redirectUri = request.cookies[`oauth_redirect_${provider}`];
      if (redirectUri) {
        reply.clearCookie(`oauth_redirect_${provider}`, { path: '/' });

        // For web applications, redirect to the frontend with tokens
        const redirectUrl = new URL(redirectUri);
        redirectUrl.searchParams.set('access_token', result.accessToken);
        redirectUrl.searchParams.set('user_id', String(result.user.id));

        return reply.redirect(redirectUrl.toString());
      }

      // Return JSON response for API clients
      const response = createApiResponse(true, result);
      return reply.code(200).send(response);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'OAuth callback failed';
      const { provider } = request.params;

      // Clear OAuth cookies on error
      reply.clearCookie(`oauth_state_${provider}`, { path: '/' });
      reply.clearCookie(`oauth_redirect_${provider}`, { path: '/' });

      const response = createApiResponse(false, undefined, errorMessage);
      return reply.code(400).send(response);
    }
  });

  /**
   * GET /api/v1/auth/oauth/providers
   * Get list of configured OAuth providers
   */
  fastify.get<{
    Reply: ApiResponse<{ providers: string[] }>;
  }>('/auth/oauth/providers', async (_request, reply) => {
    try {
      const providers = oauthService.getConfiguredProviders();
      const response = createApiResponse(true, { providers });
      return reply.code(200).send(response);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to get OAuth providers';
      const response = createApiResponse(false, undefined, errorMessage);
      return reply.code(500).send(response);
    }
  });
}
