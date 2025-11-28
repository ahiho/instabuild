/**
 * User menu component for authenticated users
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../ui/avatar';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { UserProfile } from './UserProfile';

export function UserMenu(): JSX.Element {
  const { user, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);

  if (!user) {
    return <></>;
  }

  const handleLogout = async (): Promise<void> => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarUrl = (): string | undefined => {
    // For OAuth users, we might have profile pictures
    if (user.provider === 'google' && user.providerId) {
      // This would need to be stored during OAuth flow
      return undefined;
    }
    if (user.provider === 'github' && user.providerId) {
      return `https://avatars.githubusercontent.com/u/${user.providerId}?v=4`;
    }
    return undefined;
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-7 w-7 rounded-full">
            <Avatar className="h-7 w-7">
              {getAvatarUrl() ? (
                <img
                  src={getAvatarUrl()}
                  alt={user.displayName}
                  className="h-7 w-7 rounded-full"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  {getInitials(user.displayName)}
                </div>
              )}
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user.displayName}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/dashboard')}>
            Dashboard
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowProfile(true)}>
            Profile Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/dashboard/deployments')}>
            Deployment Accounts
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} disabled={isLoading}>
            {isLoading ? 'Signing out...' : 'Sign out'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Profile Dialog */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Profile Settings</DialogTitle>
          </DialogHeader>
          <UserProfile onClose={() => setShowProfile(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
