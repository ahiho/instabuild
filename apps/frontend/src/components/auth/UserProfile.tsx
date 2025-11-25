/**
 * User profile component for account management
 */

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { PasswordChange } from '../../types/auth';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Input } from '../ui/input';

interface UserProfileProps {
  onClose?: () => void;
}

export function UserProfile({ onClose }: UserProfileProps): JSX.Element {
  const { user, changePassword, logout, isLoading, error, clearError } =
    useAuth();

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState<PasswordChange>({
    currentPassword: '',
    newPassword: '',
  });
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<
    Partial<PasswordChange & { confirmNewPassword: string }>
  >({});
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  if (!user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Please log in to view your profile.
          </p>
        </CardContent>
      </Card>
    );
  }

  const validatePasswordForm = (): boolean => {
    const errors: Partial<PasswordChange & { confirmNewPassword: string }> = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    } else if (
      !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)
    ) {
      errors.newPassword =
        'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    if (!confirmNewPassword) {
      errors.confirmNewPassword = 'Please confirm your new password';
    } else if (confirmNewPassword !== passwordData.newPassword) {
      errors.confirmNewPassword = 'Passwords do not match';
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      errors.newPassword =
        'New password must be different from current password';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordChange = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    clearError();
    setPasswordSuccess(false);

    if (!validatePasswordForm()) {
      return;
    }

    try {
      await changePassword(passwordData);
      setPasswordSuccess(true);
      setPasswordData({ currentPassword: '', newPassword: '' });
      setConfirmNewPassword('');
      setIsChangingPassword(false);
    } catch (error) {
      // Error is handled by the auth context
      console.error('Password change failed:', error);
    }
  };

  const handlePasswordInputChange =
    (field: keyof PasswordChange) =>
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      setPasswordData(prev => ({
        ...prev,
        [field]: e.target.value,
      }));

      // Clear field error when user starts typing
      if (passwordErrors[field]) {
        setPasswordErrors(prev => ({
          ...prev,
          [field]: undefined,
        }));
      }
    };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    setConfirmNewPassword(e.target.value);

    // Clear confirm password error when user starts typing
    if (passwordErrors.confirmNewPassword) {
      setPasswordErrors(prev => ({
        ...prev,
        confirmNewPassword: undefined,
      }));
    }
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await logout();
      onClose?.();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Your account details and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Display Name
              </label>
              <p className="text-sm font-medium">{user.displayName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Email
              </label>
              <p className="text-sm font-medium">{user.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Account Type
              </label>
              <p className="text-sm font-medium capitalize">{user.provider}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Role
              </label>
              <p className="text-sm font-medium capitalize">{user.role}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Member Since
              </label>
              <p className="text-sm font-medium">
                {formatDate(user.createdAt)}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Email Verified
              </label>
              <p className="text-sm font-medium">
                {user.emailVerified ? (
                  <span className="text-green-600">✓ Verified</span>
                ) : (
                  <span className="text-yellow-600">⚠ Unverified</span>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Management - Only for local accounts */}
      {user.provider === 'local' && (
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Change your account password</CardDescription>
          </CardHeader>
          <CardContent>
            {!isChangingPassword ? (
              <Button
                onClick={() => setIsChangingPassword(true)}
                variant="outline"
              >
                Change Password
              </Button>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="currentPassword"
                    className="text-sm font-medium"
                  >
                    Current Password
                  </label>
                  <Input
                    id="currentPassword"
                    type="password"
                    placeholder="Enter your current password"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordInputChange('currentPassword')}
                    disabled={isLoading}
                    className={
                      passwordErrors.currentPassword ? 'border-red-500' : ''
                    }
                  />
                  {passwordErrors.currentPassword && (
                    <p className="text-sm text-red-500">
                      {passwordErrors.currentPassword}
                    </p>
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
                    value={passwordData.newPassword}
                    onChange={handlePasswordInputChange('newPassword')}
                    disabled={isLoading}
                    className={
                      passwordErrors.newPassword ? 'border-red-500' : ''
                    }
                  />
                  {passwordErrors.newPassword && (
                    <p className="text-sm text-red-500">
                      {passwordErrors.newPassword}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="confirmNewPassword"
                    className="text-sm font-medium"
                  >
                    Confirm New Password
                  </label>
                  <Input
                    id="confirmNewPassword"
                    type="password"
                    placeholder="Confirm your new password"
                    value={confirmNewPassword}
                    onChange={handleConfirmPasswordChange}
                    disabled={isLoading}
                    className={
                      passwordErrors.confirmNewPassword ? 'border-red-500' : ''
                    }
                  />
                  {passwordErrors.confirmNewPassword && (
                    <p className="text-sm text-red-500">
                      {passwordErrors.confirmNewPassword}
                    </p>
                  )}
                </div>

                {error && (
                  <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                    {error.message}
                  </div>
                )}

                {passwordSuccess && (
                  <div className="p-3 text-sm text-green-500 bg-green-50 border border-green-200 rounded-md">
                    Password changed successfully!
                  </div>
                )}

                <div className="flex gap-2">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Changing...' : 'Change Password'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordData({ currentPassword: '', newPassword: '' });
                      setConfirmNewPassword('');
                      setPasswordErrors({});
                      clearError();
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Account Actions</CardTitle>
          <CardDescription>Manage your account settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleLogout}
              variant="outline"
              disabled={isLoading}
            >
              Sign Out
            </Button>
            {onClose && (
              <Button
                onClick={onClose}
                variant="secondary"
                disabled={isLoading}
              >
                Close
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
