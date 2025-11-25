/**
 * ProjectManager - Component for managing projects (view, edit, delete)
 */

import { MoreHorizontal, Pencil, Settings, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import { useToast } from '../../hooks/useToast';
import type { Project } from '../../types/project';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { DeleteProjectDialog } from './DeleteProjectDialog';
import { EditProjectDialog } from './EditProjectDialog';
import { ProjectSettings } from './ProjectSettings';

interface ProjectManagerProps {
  project: Project;
  className?: string;
}

export function ProjectManager({ project, className }: ProjectManagerProps) {
  const { currentProject } = useProject();
  const { success } = useToast();
  const [showSettings, setShowSettings] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isCurrentProject = currentProject?.id === project.id;

  const handleCopyProjectId = () => {
    navigator.clipboard.writeText(project.id);
    success('Copied', 'Project ID copied to clipboard');
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className={className}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Project Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Project
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCopyProjectId}>
            Copy Project ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
            disabled={isCurrentProject && project.isDefault}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProjectSettings
        project={project}
        open={showSettings}
        onOpenChange={setShowSettings}
      />

      <EditProjectDialog
        project={project}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />

      <DeleteProjectDialog
        project={project}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      />
    </>
  );
}
