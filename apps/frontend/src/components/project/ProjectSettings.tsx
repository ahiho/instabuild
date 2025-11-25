/**
 * ProjectSettings - Component for viewing and configuring project settings
 */

import { Calendar, FileText, MessageSquare, User, Rocket } from 'lucide-react';
import { useState } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import type { Project } from '../../types/project';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { ProjectDeploymentSettings } from '../deployment/ProjectDeploymentSettings';

interface ProjectSettingsProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectSettings({
  project,
  open,
  onOpenChange,
}: ProjectSettingsProps) {
  const { currentProject } = useProject();
  const [activeTab, setActiveTab] = useState<'general' | 'deployments'>(
    'general'
  );
  const isCurrentProject = currentProject?.id === project.id;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {project.name}
            {isCurrentProject && (
              <Badge variant="secondary" className="text-xs">
                Current
              </Badge>
            )}
            {project.isDefault && (
              <Badge variant="outline" className="text-xs">
                Default
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Project settings and information
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-800 mb-6">
          <Button
            variant={activeTab === 'general' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('general')}
            className="rounded-b-none"
          >
            General
          </Button>
          <Button
            variant={activeTab === 'deployments' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('deployments')}
            className="flex items-center gap-2 rounded-b-none"
          >
            <Rocket className="h-4 w-4" />
            Deployments
          </Button>
        </div>

        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Basic Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Project ID
                  </label>
                  <p className="text-sm font-mono bg-muted px-2 py-1 rounded text-xs">
                    {project.id}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Owner</label>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <p className="text-sm">{project.userId}</p>
                  </div>
                </div>
              </div>

              {project.description && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Description
                  </label>
                  <p className="text-sm">{project.description}</p>
                </div>
              )}
            </div>

            {/* Statistics */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Statistics</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {project.conversationCount || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Conversations
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {project.landingPageCount || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Landing Pages
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Timeline</h3>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-sm">{formatDate(project.createdAt)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Last Updated
                    </p>
                    <p className="text-sm">{formatDate(project.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Deployments Tab */}
        {activeTab === 'deployments' && (
          <div className="space-y-6">
            <ProjectDeploymentSettings projectId={project.id} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
