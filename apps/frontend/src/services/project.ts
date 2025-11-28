/**
 * Project service for managing projects and conversations
 */

import type {
  Conversation,
  ConversationCreateRequest,
  ConversationUpdateRequest,
  Project,
  ProjectCreateRequest,
  ProjectListResponse,
  ProjectUpdateRequest,
} from '../types/project';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

// Helper function to get auth headers
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

// Helper function to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }
  const jsonData = await response.json();
  console.log('[handleResponse] Parsed JSON:', jsonData);
  return jsonData;
}

// Project API functions
export const projectService = {
  /**
   * Get all projects for the current user
   */
  async getProjects(): Promise<Project[]> {
    const response = await fetch(`${API_BASE_URL}/projects`, {
      headers: getAuthHeaders(),
    });
    const result = await handleResponse<ProjectListResponse>(response);
    return result.data.projects;
  },

  /**
   * Get all projects and active project in a single call
   */
  async getProjectsWithActive(): Promise<{
    projects: Project[];
    activeProject: Project | null;
  }> {
    const response = await fetch(`${API_BASE_URL}/projects`, {
      headers: getAuthHeaders(),
    });
    const result = await handleResponse<ProjectListResponse>(response);
    return {
      projects: result.data.projects,
      activeProject: result.data.activeProject || null,
    };
  },

  /**
   * Get a specific project by ID
   */
  async getProject(projectId: string): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<Project>(response);
  },

  /**
   * Create a new project
   */
  async createProject(request: ProjectCreateRequest): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });
    const result = await handleResponse<{ success: boolean; data: Project }>(
      response
    );
    return result.data;
  },

  /**
   * Update an existing project
   */
  async updateProject(
    projectId: string,
    request: ProjectUpdateRequest
  ): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return handleResponse<Project>(response);
  },

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete project: ${errorText}`);
    }
  },

  /**
   * Set the active project for the current user
   */
  async setActiveProject(projectId: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/activate`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to set active project: ${errorText}`);
    }
  },

  /**
   * Get the current active project
   */
  async getActiveProject(): Promise<Project | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/active`, {
        headers: getAuthHeaders(),
      });
      if (response.status === 404) {
        return null;
      }
      return handleResponse<Project>(response);
    } catch (error) {
      console.warn('Failed to get active project:', error);
      return null;
    }
  },

  /**
   * Get git commit history for a project
   */
  async getProjectCommits(projectId: string): Promise<
    Array<{
      sha: string;
      message: string;
      author: string;
      date: string;
      timestamp: number;
    }>
  > {
    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/commits`,
      {
        headers: getAuthHeaders(),
      }
    );
    const result = await handleResponse<{
      success: boolean;
      data: {
        commits: Array<{
          sha: string;
          message: string;
          author: string;
          date: string;
          timestamp: number;
        }>;
      };
    }>(response);
    return result.data.commits;
  },

  /**
   * Revert project to a specific commit
   */
  async revertProjectToCommit(
    projectId: string,
    commitSha: string,
    conversationId: string
  ): Promise<{
    success: boolean;
    message: string;
    hasConflicts: boolean;
  }> {
    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/revert`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ commitSha, conversationId }),
      }
    );
    const result = await handleResponse<{
      success: boolean;
      data: {
        success: boolean;
        message: string;
        hasConflicts: boolean;
      };
    }>(response);
    return result.data;
  },

  /**
   * Generate a project name from a user query using AI
   */
  async generateProjectName(query: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/projects/generate-name`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ query }),
    });
    const result = await handleResponse<{
      success: boolean;
      data: { name: string };
    }>(response);
    return result.data.name;
  },
};

// Conversation API functions
export const conversationService = {
  /**
   * Get all conversations for a project
   */
  async getProjectConversations(projectId: string): Promise<Conversation[]> {
    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/conversations`,
      {
        headers: getAuthHeaders(),
      }
    );
    const result = await handleResponse<{
      success: boolean;
      data: { conversations: Conversation[]; totalCount: number };
    }>(response);

    console.log('[getProjectConversations] Response data:', result);

    // Defensive: ensure we always return an array
    if (!result || !result.data || !result.data.conversations) {
      console.warn(
        '[getProjectConversations] Invalid response format:',
        result
      );
      return [];
    }

    return result.data.conversations;
  },

  /**
   * Get a specific conversation by ID
   */
  async getConversation(conversationId: string): Promise<Conversation> {
    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}`,
      {
        headers: getAuthHeaders(),
      }
    );
    return handleResponse<Conversation>(response);
  },

  /**
   * Create a new conversation in a project
   */
  async createConversation(
    request: ConversationCreateRequest
  ): Promise<Conversation> {
    const response = await fetch(`${API_BASE_URL}/conversations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return handleResponse<Conversation>(response);
  },

  /**
   * Update an existing conversation
   */
  async updateConversation(
    conversationId: string,
    request: ConversationUpdateRequest
  ): Promise<Conversation> {
    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}`,
      {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(request),
      }
    );
    return handleResponse<Conversation>(response);
  },

  /**
   * Archive a conversation
   */
  async archiveConversation(conversationId: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}/archive`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to archive conversation: ${errorText}`);
    }
  },

  /**
   * Restore an archived conversation
   */
  async restoreConversation(conversationId: string): Promise<Conversation> {
    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}/restore`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to restore conversation: ${errorText}`);
    }
    return handleResponse<Conversation>(response);
  },

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete conversation: ${errorText}`);
    }
  },

  /**
   * Get messages for a conversation
   */
  async getConversationMessages(conversationId: string): Promise<unknown[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/conversations/${conversationId}/messages`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        // If endpoint doesn't exist yet, return empty array (graceful fallback)
        if (response.status === 404) {
          console.log('Messages endpoint not found, starting fresh');
          return [];
        }
        throw new Error(`Failed to fetch messages: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      // Return empty array on error - don't block chat
      return [];
    }
  },
};
