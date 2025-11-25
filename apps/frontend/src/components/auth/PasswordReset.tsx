/**
 * Password reset component for password recovery
 */

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { PasswordReset } from '../../types/auth';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Input } from '../ui/input';

interface PasswordResetProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

type ResetStep = 'request' | 'confirm' | 'success';

export function PasswordReset({
  onSuccess,
  onSwitchToLogin,
}: PasswordResetProps): JSX.Element {
  const { requestPasswordReset, resetPassword, isLoading, error, clearError } =
    useAuth();

  const [step, setStep] = useState<ResetStep>('request');
  const [email, setEmail] = useState('');
  const [resetData, setResetData] = useState<PasswordReset>({
    token: '',
    newPassword: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Check URL for reset token on mount
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
      setResetData(prev => ({ ...prev, token }));
      setStep('confirm');
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const validateRequestForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateConfirmForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!resetData.token.trim()) {
      errors.token = 'Reset token is required';
    }

    if (!resetData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (resetData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(resetData.newPassword)) {
      errors.newPassword =
        'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (confirmPassword !== resetData.newPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRequestSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    clearError();

    if (!validateRequestForm()) {
      return;
    }

    try {
      await requestPasswordReset({ email });
      setStep('success');
    } catch (error) {
      // Error is handled by the auth context
      console.error('Password reset request failed:', error);
    }
  };

  const handleConfirmSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    clearError();

    if (!validateConfirmForm()) {
      return;
    }

    try {
      await resetPassword(resetData);
      setStep('success');
    } catch (error) {
      // Error is handled by the auth context
      console.error('Password reset failed:', error);
    }
  };

  const handleInputChange =
    (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const value = e.target.value;

      if (field === 'email') {
        setEmail(value);
      } else if (field === 'token') {
        setResetData(prev => ({ ...prev, token: value }));
      } else if (field === 'newPassword') {
        setResetData(prev => ({ ...prev, newPassword: value }));
      } else if (field === 'confirmPassword') {
        setConfirmPassword(value);
      }

      // Clear field error when user starts typing
      if (formErrors[field]) {
        setFormErrors(prev => ({
          ...prev,
          [field]: undefined,
        }));
      }
    };

  if (step === 'request') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Reset Password
          </CardTitle>
          <CardDescription className="text-center">
            Enter your email address and we'll send you a link to reset your
            password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={handleInputChange('email')}
                disabled={isLoading}
                className={formErrors.email ? 'border-red-500' : ''}
              />
              {formErrors.email && (
                <p className="text-sm text-red-500">{formErrors.email}</p>
              )}
            </div>

            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                {error.message}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>

          {/* Footer Links */}
          <div className="text-center text-sm">
            {onSwitchToLogin && (
              <div>
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-primary hover:underline"
                  disabled={isLoading}
                >
                  Sign in
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'confirm') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Set New Password
          </CardTitle>
          <CardDescription className="text-center">
            Enter your reset token and choose a new password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleConfirmSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="token" className="text-sm font-medium">
                Reset Token
              </label>
              <Input
                id="token"
                type="text"
                placeholder="Enter the token from your email"
                value={resetData.token}
                onChange={handleInputChange('token')}
                disabled={isLoading}
                className={formErrors.token ? 'border-red-500' : ''}
              />
              {formErrors.token && (
                <p className="text-sm text-red-500">{formErrors.token}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-sm font-medium">
                New Password
              </label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Enter your new password"
                value={resetData.newPassword}
                onChange={handleInputChange('newPassword')}
                disabled={isLoading}
                className={formErrors.newPassword ? 'border-red-500' : ''}
              />
              {formErrors.newPassword && (
                <p className="text-sm text-red-500">{formErrors.newPassword}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm New Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                disabled={isLoading}
                className={formErrors.confirmPassword ? 'border-red-500' : ''}
              />
              {formErrors.confirmPassword && (
                <p className="text-sm text-red-500">
                  {formErrors.confirmPassword}
                </p>
              )}
            </div>

            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                {error.message}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>

          {/* Footer Links */}
          <div className="text-center text-sm">
            <button
              type="button"
              onClick={() => setStep('request')}
              className="text-primary hover:underline"
              disabled={isLoading}
            >
              Need a new reset link?
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success step
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center text-green-600">
          Password Reset Successful
        </CardTitle>
        <CardDescription className="text-center">
          {step === 'success' && resetData.token
            ? 'Your password has been reset successfully.'
            : "We've sent a password reset link to your email address."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {step === 'success' && resetData.token ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You can now sign in with your new password.
              </p>
              <Button
                onClick={() => {
                  onSuccess?.();
                  onSwitchToLogin?.();
                }}
                className="w-full"
              >
                Sign In
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please check your email and click the link to reset your
                password. The link will expire in 1 hour.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => setStep('confirm')}
                  variant="outline"
                  className="w-full"
                >
                  I have the reset token
                </Button>
                {onSwitchToLogin && (
                  <Button
                    onClick={onSwitchToLogin}
                    variant="secondary"
                    className="w-full"
                  >
                    Back to Sign In
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
