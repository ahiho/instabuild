import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface PasswordChangeRequest {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export interface EmailVerificationRequest {
  userId: string;
}

export interface EmailVerificationConfirm {
  token: string;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
}

export class PasswordManager {
  private prisma: PrismaClient;
  private readonly RESET_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour
  private readonly VERIFICATION_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Request password reset - generates and stores reset token
   */
  async requestPasswordReset(
    request: PasswordResetRequest
  ): Promise<{ success: boolean; message: string }> {
    const { email } = request;

    try {
      // Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      // Always return success to prevent email enumeration
      if (!user) {
        return {
          success: true,
          message:
            'If an account with that email exists, a password reset link has been sent.',
        };
      }

      // Check if user has a password (OAuth users might not)
      if (!user.passwordHash) {
        return {
          success: true,
          message:
            'If an account with that email exists, a password reset link has been sent.',
        };
      }

      // Generate secure reset token
      const resetToken = this.generateSecureToken();
      const hashedToken = this.hashToken(resetToken);
      const expiresAt = new Date(Date.now() + this.RESET_TOKEN_EXPIRY);

      // Invalidate any existing reset tokens for this user
      await this.prisma.userSession.updateMany({
        where: {
          userId: user.id,
          token: { contains: 'reset_' },
        },
        data: { isActive: false },
      });

      // Store hashed token in database
      await this.prisma.userSession.create({
        data: {
          userId: user.id,
          token: `reset_${hashedToken}`,
          expiresAt,
          isActive: true,
        },
      });

      // TODO: Send email with reset link
      // For now, log the token (in production, this should be sent via email)
      console.log(`Password reset token for ${email}: ${resetToken}`);
      console.log(
        `Reset link: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`
      );

      return {
        success: true,
        message:
          'If an account with that email exists, a password reset link has been sent.',
      };
    } catch (error) {
      console.error('Password reset request error:', error);
      return {
        success: false,
        message:
          'An error occurred while processing your request. Please try again.',
      };
    }
  }

  /**
   * Reset password using reset token
   */
  async resetPassword(
    request: PasswordResetConfirm
  ): Promise<{ success: boolean; message: string }> {
    const { token, newPassword } = request;

    try {
      // Validate password strength
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: passwordValidation.message,
        };
      }

      // Hash the provided token to match stored hash
      const hashedToken = this.hashToken(token);

      // Find valid reset token
      const resetSession = await this.prisma.userSession.findFirst({
        where: {
          token: `reset_${hashedToken}`,
          isActive: true,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          user: true,
        },
      });

      if (!resetSession) {
        return {
          success: false,
          message: 'Invalid or expired reset token.',
        };
      }

      // Hash new password
      const passwordHash = await this.hashPassword(newPassword);

      // Update user password
      await this.prisma.user.update({
        where: { id: resetSession.userId },
        data: {
          passwordHash,
          emailVerified: true, // Reset password implies email verification
        },
      });

      // Invalidate the reset token
      await this.prisma.userSession.update({
        where: { id: resetSession.id },
        data: { isActive: false },
      });

      // Invalidate all user sessions for security
      await this.prisma.userSession.updateMany({
        where: {
          userId: resetSession.userId,
          token: { not: { contains: 'reset_' } },
        },
        data: { isActive: false },
      });

      // TODO: Send confirmation email
      console.log(
        `Password reset successful for user: ${resetSession.user.email}`
      );

      return {
        success: true,
        message:
          'Password has been reset successfully. Please log in with your new password.',
      };
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        message:
          'An error occurred while resetting your password. Please try again.',
      };
    }
  }

  /**
   * Change password with current password verification
   */
  async changePassword(
    request: PasswordChangeRequest
  ): Promise<{ success: boolean; message: string }> {
    const { userId, currentPassword, newPassword } = request;

    try {
      // Find user
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found.',
        };
      }

      // Check if user has a password (OAuth users might not)
      if (!user.passwordHash) {
        return {
          success: false,
          message:
            'Cannot change password for OAuth-only accounts. Please set a password first.',
        };
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          message: 'Current password is incorrect.',
        };
      }

      // Validate new password
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: passwordValidation.message,
        };
      }

      // Check if new password is different from current
      const isSamePassword = await bcrypt.compare(
        newPassword,
        user.passwordHash
      );
      if (isSamePassword) {
        return {
          success: false,
          message: 'New password must be different from current password.',
        };
      }

      // Hash new password
      const passwordHash = await this.hashPassword(newPassword);

      // Update password
      await this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      // Invalidate all sessions except current one for security
      await this.prisma.userSession.updateMany({
        where: { userId },
        data: { isActive: false },
      });

      // TODO: Send confirmation email
      console.log(`Password changed successfully for user: ${user.email}`);

      return {
        success: true,
        message: 'Password changed successfully. Please log in again.',
      };
    } catch (error) {
      console.error('Password change error:', error);
      return {
        success: false,
        message:
          'An error occurred while changing your password. Please try again.',
      };
    }
  }

  /**
   * Request email verification
   */
  async requestEmailVerification(
    request: EmailVerificationRequest
  ): Promise<{ success: boolean; message: string }> {
    const { userId } = request;

    try {
      // Find user
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found.',
        };
      }

      // Check if already verified
      if (user.emailVerified) {
        return {
          success: true,
          message: 'Email is already verified.',
        };
      }

      // Generate verification token
      const verificationToken = this.generateSecureToken();
      const hashedToken = this.hashToken(verificationToken);
      const expiresAt = new Date(Date.now() + this.VERIFICATION_TOKEN_EXPIRY);

      // Invalidate existing verification tokens
      await this.prisma.userSession.updateMany({
        where: {
          userId: user.id,
          token: { contains: 'verify_' },
        },
        data: { isActive: false },
      });

      // Store verification token
      await this.prisma.userSession.create({
        data: {
          userId: user.id,
          token: `verify_${hashedToken}`,
          expiresAt,
          isActive: true,
        },
      });

      // TODO: Send verification email
      console.log(
        `Email verification token for ${user.email}: ${verificationToken}`
      );
      console.log(
        `Verification link: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`
      );

      return {
        success: true,
        message: 'Verification email sent. Please check your inbox.',
      };
    } catch (error) {
      console.error('Email verification request error:', error);
      return {
        success: false,
        message:
          'An error occurred while sending verification email. Please try again.',
      };
    }
  }

  /**
   * Verify email using verification token
   */
  async verifyEmail(
    request: EmailVerificationConfirm
  ): Promise<{ success: boolean; message: string }> {
    const { token } = request;

    try {
      // Hash the provided token
      const hashedToken = this.hashToken(token);

      // Find valid verification token
      const verificationSession = await this.prisma.userSession.findFirst({
        where: {
          token: `verify_${hashedToken}`,
          isActive: true,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          user: true,
        },
      });

      if (!verificationSession) {
        return {
          success: false,
          message: 'Invalid or expired verification token.',
        };
      }

      // Update user email verification status
      await this.prisma.user.update({
        where: { id: verificationSession.userId },
        data: { emailVerified: true },
      });

      // Invalidate the verification token
      await this.prisma.userSession.update({
        where: { id: verificationSession.id },
        data: { isActive: false },
      });

      console.log(
        `Email verified successfully for user: ${verificationSession.user.email}`
      );

      return {
        success: true,
        message: 'Email verified successfully!',
      };
    } catch (error) {
      console.error('Email verification error:', error);
      return {
        success: false,
        message:
          'An error occurred while verifying your email. Please try again.',
      };
    }
  }

  /**
   * Set password for OAuth users
   */
  async setPassword(
    userId: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Find user
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found.',
        };
      }

      // Check if user already has a password
      if (user.passwordHash) {
        return {
          success: false,
          message: 'User already has a password. Use change password instead.',
        };
      }

      // Validate password
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: passwordValidation.message,
        };
      }

      // Hash password
      const passwordHash = await this.hashPassword(newPassword);

      // Update user
      await this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      return {
        success: true,
        message: 'Password set successfully.',
      };
    } catch (error) {
      console.error('Set password error:', error);
      return {
        success: false,
        message:
          'An error occurred while setting your password. Please try again.',
      };
    }
  }

  /**
   * Generate secure random token
   */
  private generateSecureToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Hash token for secure storage
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Hash password using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Validate password strength
   */
  private validatePassword(password: string): {
    isValid: boolean;
    message: string;
  } {
    if (!password) {
      return { isValid: false, message: 'Password is required.' };
    }

    if (password.length < 8) {
      return {
        isValid: false,
        message: 'Password must be at least 8 characters long.',
      };
    }

    if (password.length > 128) {
      return {
        isValid: false,
        message: 'Password must be less than 128 characters long.',
      };
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      return {
        isValid: false,
        message: 'Password must contain at least one uppercase letter.',
      };
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      return {
        isValid: false,
        message: 'Password must contain at least one lowercase letter.',
      };
    }

    // Check for at least one number
    if (!/\d/.test(password)) {
      return {
        isValid: false,
        message: 'Password must contain at least one number.',
      };
    }

    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      return {
        isValid: false,
        message: 'Password must contain at least one special character.',
      };
    }

    return { isValid: true, message: 'Password is valid.' };
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.userSession.updateMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isActive: false },
          { token: { contains: 'reset_' } },
          { token: { contains: 'verify_' } },
        ],
      },
      data: { isActive: false },
    });

    return result.count;
  }

  /**
   * Get password reset token info (for debugging)
   */
  async getTokenInfo(token: string): Promise<any> {
    const hashedToken = this.hashToken(token);

    return this.prisma.userSession.findFirst({
      where: {
        token: `reset_${hashedToken}`,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });
  }
}
