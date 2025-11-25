/**
 * Authentication page with login, register, and password reset
 */

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LoginForm, PasswordReset, RegisterForm } from '../components/auth';

type AuthMode = 'login' | 'register' | 'password-reset';

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine initial mode from URL path
  const getInitialMode = (): AuthMode => {
    const path = location.pathname;
    if (path.includes('register')) return 'register';
    if (path.includes('password-reset')) return 'password-reset';
    return 'login';
  };

  const [mode, setMode] = useState<AuthMode>(getInitialMode());

  // Get the intended destination after successful authentication
  const from = location.state?.from?.pathname || '/dashboard';

  const handleAuthSuccess = (): void => {
    // Redirect to the intended destination
    navigate(from, { replace: true });
  };

  const handleModeSwitch = (newMode: AuthMode): void => {
    setMode(newMode);
    // Update URL without adding to history
    const newPath =
      newMode === 'login'
        ? '/auth/login'
        : newMode === 'register'
          ? '/auth/register'
          : '/auth/password-reset';
    window.history.replaceState({}, '', newPath);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-md">
        {mode === 'login' && (
          <LoginForm
            onSuccess={handleAuthSuccess}
            onSwitchToRegister={() => handleModeSwitch('register')}
            onSwitchToPasswordReset={() => handleModeSwitch('password-reset')}
          />
        )}

        {mode === 'register' && (
          <RegisterForm
            onSuccess={handleAuthSuccess}
            onSwitchToLogin={() => handleModeSwitch('login')}
          />
        )}

        {mode === 'password-reset' && (
          <PasswordReset
            onSuccess={handleAuthSuccess}
            onSwitchToLogin={() => handleModeSwitch('login')}
          />
        )}
      </div>
    </div>
  );
}
