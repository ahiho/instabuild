/**
 * DeleteProjectDialog - Confirmation dialog for deleting projects
 */

import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import { useToast } from '../../hooks/useToast';
import type { Project } from '../../types/project';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';

interface DeleteProjectDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteProjectDialog({
  project,
  open,
  onOpenChange,
}: DeleteProjectDialogProps) {
  const { deleteProject, currentProject } = useProject();
  const { success, error } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');

  const isCurrentProject = currentProject?.id === project.id;
  const canDelete = !project.isDefault || !isCurrentProject;
  const confirmationRequired = project.name;
  const isConfirmed = confirmationText === confirmationRequired;

  const handleDelete = async () => {
    if (!isConfirmed) {
      error(
        'Confirmation Required',
        'Please type the project name to confirm deletion'
      );
      return;
    }

    try {
      setIsDeleting(true);
      await deleteProject(project.id);

      success(
        'Project Deleted',
        `Project "${project.name}" has been deleted successfully`
      );

      // Reset form and close dialog
      setConfirmationText('');
      onOpenChange(false);
    } catch (err) {
      error(
        'Deletion Failed',
        err instanceof Error ? err.message : 'Failed to delete project'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setConfirmationText('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Project
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the
            project and all associated conversations and landing pages.
          </DialogDescription>
        </DialogHeader>

        {!canDelete ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                This project cannot be deleted because it is your default
                project and currently active. Please switch to another project
                first.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Project Details:</p>
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <p className="text-sm font-medium">{project.name}</p>
                {project.description && (
                  <p className="text-xs text-muted-foreground">
                    {project.description}
                  </p>
                )}
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{project.conversationCount || 0} conversations</span>
                  <span>{project.landingPageCount || 0} landing pages</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirmation-input"
                className="text-sm font-medium"
              >
                Type{' '}
                <code className="bg-muted px-1 rounded">
                  {confirmationRequired}
                </code>{' '}
                to confirm:
              </label>
              <Input
                id="confirmation-input"
                placeholder={`Type "${confirmationRequired}" to confirm`}
                value={confirmationText}
                onChange={e => setConfirmationText(e.target.value)}
                disabled={isDeleting}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          {canDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || !isConfirmed}
            >
              {isDeleting ? 'Deleting...' : 'Delete Project'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
