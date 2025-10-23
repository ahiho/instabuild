import { ReactNode } from 'react';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLayoutState } from '../../hooks/useLayoutState';

interface CollapsibleSidebarProps {
  children: ReactNode;
  className?: string;
}

export const CollapsibleSidebar = ({
  children,
  className = '',
}: CollapsibleSidebarProps) => {
  const { layoutState, toggleSidebar } = useLayoutState();

  return (
    <div className={`relative h-full ${className}`}>
      {/* Collapse/Expand Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleSidebar}
        className="absolute top-2 right-2 z-10 h-8 w-8 p-0"
        aria-label={
          layoutState.sidebar.isCollapsed
            ? 'Expand sidebar'
            : 'Collapse sidebar'
        }
      >
        {layoutState.sidebar.isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      {/* Sidebar Content */}
      <div className="h-full overflow-hidden">
        {!layoutState.sidebar.isCollapsed && (
          <div className="h-full pt-12 px-4">{children}</div>
        )}
      </div>

      {/* Collapsed State Indicator */}
      {layoutState.sidebar.isCollapsed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="h-8 w-8 p-0"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
