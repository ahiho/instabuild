import { PrismaClient } from '@prisma/client';
import { JWTUtils } from '../utils/jwt.js';

export interface SessionInfo {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
}

export interface CreateSessionRequest {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

export class SessionManager {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a new session with refresh token
   */
  async createSession(request: CreateSessionRequest): Promise<SessionInfo> {
    const { userId, ipAddress, userAgent } = request;

    // Generate refresh token
    const refreshToken = JWTUtils.generateRefreshToken(userId);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await this.prisma.userSession.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt,
        ipAddress,
        userAgent,
        isActive: true,
      },
    });

    return {
      id: session.id,
      userId: session.userId,
      token: session.token,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      ipAddress: session.ipAddress || undefined,
      userAgent: session.userAgent || undefined,
      isActive: session.isActive,
    };
  }

  /**
   * Get session by token
   */
  async getSessionByToken(token: string): Promise<SessionInfo | null> {
    const session = await this.prisma.userSession.findFirst({
      where: {
        token,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!session) {
      return null;
    }

    return {
      id: session.id,
      userId: session.userId,
      token: session.token,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      ipAddress: session.ipAddress || undefined,
      userAgent: session.userAgent || undefined,
      isActive: session.isActive,
    };
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    const sessions = await this.prisma.userSession.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return sessions.map(session => ({
      id: session.id,
      userId: session.userId,
      token: session.token,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      ipAddress: session.ipAddress || undefined,
      userAgent: session.userAgent || undefined,
      isActive: session.isActive,
    }));
  }

  /**
   * Deactivate a specific session
   */
  async deactivateSession(sessionId: string): Promise<void> {
    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });
  }

  /**
   * Deactivate session by token
   */
  async deactivateSessionByToken(token: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { token },
      data: { isActive: false },
    });
  }

  /**
   * Deactivate all sessions for a user
   */
  async deactivateAllUserSessions(userId: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { userId },
      data: { isActive: false },
    });
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prisma.userSession.updateMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { isActive: false }],
      },
      data: { isActive: false },
    });

    return result.count;
  }

  /**
   * Validate session and return user info
   */
  async validateSession(
    token: string
  ): Promise<{ userId: string; sessionId: string } | null> {
    try {
      // First verify the JWT token structure
      const payload = JWTUtils.verifyRefreshToken(token);

      // Then check if session exists in database
      const session = await this.getSessionByToken(token);

      if (!session || session.userId !== payload.userId) {
        return null;
      }

      return {
        userId: session.userId,
        sessionId: session.id,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Refresh session (extend expiration)
   */
  async refreshSession(sessionId: string): Promise<SessionInfo | null> {
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    try {
      const session = await this.prisma.userSession.update({
        where: { id: sessionId },
        data: { expiresAt: newExpiresAt },
      });

      return {
        id: session.id,
        userId: session.userId,
        token: session.token,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        ipAddress: session.ipAddress || undefined,
        userAgent: session.userAgent || undefined,
        isActive: session.isActive,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get session statistics for a user
   */
  async getSessionStats(userId: string): Promise<{
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
  }> {
    const [total, active, expired] = await Promise.all([
      this.prisma.userSession.count({
        where: { userId },
      }),
      this.prisma.userSession.count({
        where: {
          userId,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
      }),
      this.prisma.userSession.count({
        where: {
          userId,
          OR: [{ isActive: false }, { expiresAt: { lt: new Date() } }],
        },
      }),
    ]);

    return {
      totalSessions: total,
      activeSessions: active,
      expiredSessions: expired,
    };
  }
}
