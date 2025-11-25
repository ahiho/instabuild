import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import { ProjectService } from './projectService';

export interface AuthResult {
  user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
    emailVerified: boolean;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  emailVerified: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface OAuthLoginRequest {
  provider: 'google' | 'github';
  code: string;
  email: string;
  displayName: string;
  providerId: string;
}

export class AuthenticationService {
  private prisma: PrismaClient;
  private projectService: ProjectService;
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.projectService = new ProjectService(prisma);
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    this.jwtRefreshSecret =
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
    this.accessTokenExpiry = '1h'; // 1 hour (increased from 15 minutes for better UX)
    this.refreshTokenExpiry = '7d'; // 7 days
  }

  /**
   * Register a new user with email and password
   */
  async register(request: RegisterRequest): Promise<AuthResult> {
    const { email, password, displayName } = request;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        provider: 'local',
        emailVerified: false,
        role: 'user',
      },
    });

    // Note: Default project creation is handled explicitly when user
    // submits a query via Hero section, not automatically on registration

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user);

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
      expiresIn: 60 * 60, // 1 hour in seconds
    };
  }

  /**
   * Login user with email and password
   */
  async login(request: LoginRequest): Promise<AuthResult> {
    const { email, password } = request;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user);

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
      expiresIn: 60 * 60, // 1 hour in seconds
    };
  }

  /**
   * Login or register user with OAuth
   */
  async loginWithOAuth(request: OAuthLoginRequest): Promise<AuthResult> {
    const { provider, email, displayName, providerId } = request;

    // Check if user exists
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { provider, providerId }],
      },
    });

    if (user) {
      // Update existing user
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          emailVerified: true, // OAuth emails are pre-verified
        },
      });
    } else {
      // Create new user
      user = await this.prisma.user.create({
        data: {
          email,
          displayName,
          provider,
          providerId,
          emailVerified: true,
          role: 'user',
        },
      });

      // Note: Default project creation is handled explicitly when user
      // submits a query via Hero section, not automatically on registration
    }

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user);

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
      expiresIn: 60 * 60, // 1 hour in seconds
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as any;

      // Find user session
      const session = await this.prisma.userSession.findFirst({
        where: {
          token: refreshToken,
          userId: decoded.userId,
          isActive: true,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          user: true,
        },
      });

      if (!session) {
        throw new Error('Invalid refresh token');
      }

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } =
        await this.generateTokens(session.user);

      // Deactivate old session
      await this.prisma.userSession.update({
        where: { id: session.id },
        data: { isActive: false },
      });

      return {
        user: {
          id: session.user.id,
          email: session.user.email,
          displayName: session.user.displayName,
          role: session.user.role,
          emailVerified: session.user.emailVerified,
        },
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: 60 * 60, // 1 hour in seconds
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Logout user by deactivating session
   */
  async logout(sessionId: string, userId?: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { id: sessionId },
      data: { isActive: false },
    });

    // Clear active project session if userId is provided
    if (userId) {
      this.projectService.clearActiveProjectSession(userId);
    }
  }

  /**
   * Validate session token and return user
   */
  async validateSession(token: string): Promise<User | null> {
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, this.jwtSecret) as any;

      // Find user
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists
      return;
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token (you might want to create a separate table for this)
    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt,
        isActive: true,
      },
    });

    // TODO: Send email with reset link
    console.log(`Password reset token for ${email}: ${resetToken}`);
  }

  /**
   * Reset password using reset token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Find valid reset token
    const session = await this.prisma.userSession.findFirst({
      where: {
        token,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!session) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash new password
    const passwordHash = await this.hashPassword(newPassword);

    // Update user password
    await this.prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash },
    });

    // Deactivate reset token
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { isActive: false },
    });

    // Deactivate all other sessions for security
    await this.prisma.userSession.updateMany({
      where: { userId: session.userId },
      data: { isActive: false },
    });
  }

  /**
   * Change password with current password verification
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await this.hashPassword(newPassword);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Deactivate all sessions for security
    await this.prisma.userSession.updateMany({
      where: { userId },
      data: { isActive: false },
    });
  }

  /**
   * Hash password using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Generate JWT access and refresh tokens
   */
  private async generateTokens(
    user: any
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Generate access token
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      this.jwtSecret,
      { expiresIn: this.accessTokenExpiry } as jwt.SignOptions
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      {
        userId: user.id,
        type: 'refresh',
      },
      this.jwtRefreshSecret,
      { expiresIn: this.refreshTokenExpiry } as jwt.SignOptions
    );

    // Store refresh token session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
        isActive: true,
      },
    });

    return { accessToken, refreshToken };
  }
}
