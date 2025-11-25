/**
 * Project context for managing current project state
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { projectService } from '../services/project';
import type { Project } from '../types/project';
import { useAuth } from './AuthContext';

interface ProjectContextValue {
  currentProject: Project | null;
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  setCurrentProject: (project: Project | null) => void;
  refreshProjects: () => Promise<void>;
  createProject: (name: string, description?: string) => Promise<Project>;
  updateProject: (
    projectId: string,
    updates: { name?: string; description?: string }
  ) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

interface ProjectProviderProps {
  children: ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const { isAuthenticated, user } = useAuth();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load projects when user is authenticated
  const loadProjects = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setProjects([]);
      setCurrentProject(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Load projects and active project in a single call
      const { projects: userProjects, activeProject } =
        await projectService.getProjectsWithActive();
      setProjects(userProjects);

      // If no active project but we have projects, set the first one as active
      if (!activeProject && userProjects.length > 0) {
        const defaultProject =
          userProjects.find(p => p.isDefault) || userProjects[0];
        await projectService.setActiveProject(defaultProject.id);
        setCurrentProject(defaultProject);
      } else {
        setCurrentProject(activeProject);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  // Load projects on mount and when auth state changes
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Set current project and update active project on server
  const handleSetCurrentProject = useCallback(
    async (project: Project | null) => {
      if (!project) {
        setCurrentProject(null);
        return;
      }

      try {
        await projectService.setActiveProject(project.id);
        setCurrentProject(project);
      } catch (err) {
        console.error('Failed to set active project:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to set active project'
        );
      }
    },
    []
  );

  // Refresh projects list
  const refreshProjects = useCallback(async () => {
    await loadProjects();
  }, [loadProjects]);

  // Create new project
  const createProject = useCallback(
    async (name: string, description?: string): Promise<Project> => {
      try {
        setError(null);
        const newProject = await projectService.createProject({
          name,
          description,
        });

        // Refresh projects list
        await refreshProjects();

        // Set as current project
        await handleSetCurrentProject(newProject);

        return newProject;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create project';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [refreshProjects, handleSetCurrentProject]
  );

  // Update project
  const updateProject = useCallback(
    async (
      projectId: string,
      updates: { name?: string; description?: string }
    ): Promise<Project> => {
      try {
        setError(null);
        const updatedProject = await projectService.updateProject(
          projectId,
          updates
        );

        // Update projects list
        setProjects(prev =>
          prev.map(p => (p.id === projectId ? updatedProject : p))
        );

        // Update current project if it's the one being updated
        if (currentProject?.id === projectId) {
          setCurrentProject(updatedProject);
        }

        return updatedProject;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update project';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [currentProject]
  );

  // Delete project
  const deleteProject = useCallback(
    async (projectId: string): Promise<void> => {
      try {
        setError(null);
        await projectService.deleteProject(projectId);

        // Remove from projects list
        setProjects(prev => prev.filter(p => p.id !== projectId));

        // If deleting current project, switch to another one
        if (currentProject?.id === projectId) {
          const remainingProjects = projects.filter(p => p.id !== projectId);
          if (remainingProjects.length > 0) {
            await handleSetCurrentProject(remainingProjects[0]);
          } else {
            setCurrentProject(null);
          }
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete project';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [currentProject, projects, handleSetCurrentProject]
  );

  const contextValue: ProjectContextValue = {
    currentProject,
    projects,
    isLoading,
    error,
    setCurrentProject: handleSetCurrentProject,
    refreshProjects,
    createProject,
    updateProject,
    deleteProject,
  };

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProject(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
