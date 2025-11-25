/**
 * AppHeader - Application header with project name and user menu
 */

import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import { UserMenu } from '../auth/UserMenu';

export function AppHeader() {
  const { isAuthenticated } = useAuth();
  const { currentProject } = useProject();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <header className="h-14 border-b border-gray-800 bg-black/50 backdrop-blur-sm">
      <div className="h-full p-4 flex items-center justify-between">
        {/* Left side - Project name */}
        <div className="flex items-center">
          {currentProject && (
            <h1 className="text-sm font-semibold text-white truncate">
              {currentProject.name}
            </h1>
          )}
        </div>

        {/* Right side - User menu */}
        <div className="flex items-center gap-4">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
