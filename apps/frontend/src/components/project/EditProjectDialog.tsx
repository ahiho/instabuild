/**
 * EditProjectDialog - Modal for editing existing projects
 */

import { useEffect, useState } from 'react';
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
import { Textarea } from '../ui/textarea';

interface EditProjectDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProjectDialog({
  project,
  open,
  onOpenChange,
}: EditProjectDialogProps) {
  const { updateProject } = useProject();
  const { success, error } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  // Initialize form data when dialog opens or project changes
  useEffect(() => {
    if (open && project) {
      setFormData({
        name: project.name,
        description: project.description || '',
      });
    }
  }, [open, project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      error('Validation Error', 'Project name is required');
      return;
    }

    // Check if anything actually changed
    const hasChanges =
      formData.name.trim() !== project.name ||
      formData.description.trim() !== (project.description || '');

    if (!hasChanges) {
      onOpenChange(false);
      return;
    }

    try {
      setIsSubmitting(true);
      await updateProject(project.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      });

      success(
        'Project Updated',
        `Project "${formData.name}" has been updated successfully`
      );
      onOpenChange(false);
    } catch (err) {
      error(
        'Update Failed',
        err instanceof Error ? err.message : 'Failed to update project'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    setFormData({
      name: project.name,
      description: project.description || '',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update your project name and description.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="edit-project-name" className="text-sm font-medium">
              Project Name *
            </label>
            <Input
              id="edit-project-name"
              placeholder="Enter project name"
              value={formData.name}
              onChange={e =>
                setFormData(prev => ({ ...prev, name: e.target.value }))
              }
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="edit-project-description"
              className="text-sm font-medium"
            >
              Description (Optional)
            </label>
            <Textarea
              id="edit-project-description"
              placeholder="Enter project description"
              value={formData.description}
              onChange={e =>
                setFormData(prev => ({ ...prev, description: e.target.value }))
              }
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.name.trim()}
            >
              {isSubmitting ? 'Updating...' : 'Update Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
