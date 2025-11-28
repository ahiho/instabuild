/**
 * Dashboard page showing user's projects
 */

import { FolderPlus, MessageSquare, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/layout/AppHeader';
import { NewProjectDialog } from '../components/project/NewProjectDialog';
import { ProjectManager } from '../components/project/ProjectManager';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { useProject } from '../contexts/ProjectContext';

export function DashboardPage() {
  const navigate = useNavigate();
  const { projects = [], isLoading, setCurrentProject } = useProject();
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);

  // Clear current project on dashboard (no project should be selected on dashboard)
  useEffect(() => {
    setCurrentProject(null);
  }, [setCurrentProject]);

  const handleProjectClick = (projectId: string) => {
    navigate(`/dashboard/projects/${projectId}/conversations`);
  };

  return (
    <div className="min-h-screen bg-black">
      <AppHeader />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Projects</h1>
            <p className="text-gray-400">
              Manage your projects and conversations
            </p>
          </div>
          <Button
            onClick={() => setShowNewProjectDialog(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
            <p className="text-gray-400 mt-4">Loading projects...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && projects.length === 0 && (
          <Card className="border-gray-800">
            <CardContent className="pt-12 pb-12">
              <div className="text-center">
                <FolderPlus className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  No projects yet
                </h3>
                <p className="text-gray-400 mb-6">
                  Create your first project to get started
                </p>
                <Button onClick={() => setShowNewProjectDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Projects Grid */}
        {!isLoading && projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <Card
                key={project.id}
                className="border-gray-800 hover:border-purple-600 transition-colors cursor-pointer group"
                onClick={() => handleProjectClick(project.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white group-hover:text-purple-400 transition-colors">
                        {project.name}
                      </CardTitle>
                      {project.description && (
                        <CardDescription className="mt-2 text-gray-400">
                          {project.description}
                        </CardDescription>
                      )}
                    </div>
                    <ProjectManager
                      project={project}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>
                        {project.conversationCount || 0} conversations
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 text-xs text-gray-500">
                    Created {new Date(project.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* New Project Dialog */}
      <NewProjectDialog
        open={showNewProjectDialog}
        onOpenChange={setShowNewProjectDialog}
      />
    </div>
  );
}
