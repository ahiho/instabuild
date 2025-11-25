/**
 * Project and conversation types for the frontend
 */

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
  conversationCount?: number;
  landingPageCount?: number;

  // Sandbox fields (moved from Conversation - sandboxes are project-level)
  sandboxId?: string;
  sandboxStatus?: string;
  sandboxPort?: number;
  sandboxPublicUrl?: string;
  sandboxCreatedAt?: string;
}

export interface ProjectCreateRequest {
  name: string;
  description?: string;
}

export interface ProjectUpdateRequest {
  name?: string;
  description?: string;
}

export interface Conversation {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  startTime: string;
  lastUpdateTime: string;
  lastAccessedAt: string;
  isArchived: boolean;
  messageCount?: number;

  // Optional project relation with sandbox fields (populated by backend when needed)
  project?: Pick<
    Project,
    | 'sandboxId'
    | 'sandboxStatus'
    | 'sandboxPort'
    | 'sandboxPublicUrl'
    | 'sandboxCreatedAt'
  >;
}

export interface ConversationCreateRequest {
  projectId: string;
  title?: string;
  idempotencyKey?: string; // For deduplication in case of duplicate requests (e.g., StrictMode)
}

export interface ConversationUpdateRequest {
  title?: string;
  isArchived?: boolean;
}

export interface ConversationListResponse {
  conversations: Conversation[];
  total: number;
}

export interface ProjectListResponse {
  success: boolean;
  data: {
    projects: Project[];
    totalCount: number;
    activeProject?: Project | null;
  };
}
