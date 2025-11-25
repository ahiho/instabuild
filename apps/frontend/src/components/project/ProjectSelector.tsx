/**
 * ProjectSelector - Dropdown component for switching between projects
 */

import { ChevronDown, FolderOpen, Plus } from 'lucide-react';
import { useState } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { NewProjectDialog } from './NewProjectDialog';

interface ProjectSelectorProps {
  className?: string;
}

export function ProjectSelector({ className }: ProjectSelectorProps) {
  const { currentProject, projects, setCurrentProject, isLoading } =
    useProject();
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);

  // Ensure projects is always an array
  const safeProjects = projects || [];

  const handleProjectSelect = async (projectId: string) => {
    const project = safeProjects.find(p => p.id === projectId);
    if (project) {
      await setCurrentProject(project);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={`justify-between min-w-[200px] ${className}`}
            disabled={isLoading}
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              <span className="truncate">
                {currentProject?.name || 'Select Project'}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          {safeProjects.length === 0 ? (
            <DropdownMenuItem disabled>No projects available</DropdownMenuItem>
          ) : (
            safeProjects.map(project => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => handleProjectSelect(project.id)}
                className={
                  currentProject?.id === project.id
                    ? 'bg-accent text-accent-foreground'
                    : ''
                }
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium">{project.name}</span>
                  {project.description && (
                    <span className="text-xs text-muted-foreground truncate">
                      {project.description}
                    </span>
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowNewProjectDialog(true)}
            className="text-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <NewProjectDialog
        open={showNewProjectDialog}
        onOpenChange={setShowNewProjectDialog}
      />
    </>
  );
}
