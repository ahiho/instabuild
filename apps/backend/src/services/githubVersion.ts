import { prisma } from '../server.js';
import { logger } from '../lib/logger.js';
import { getGitHubSyncService } from './githubSync.js';

/**
 * Service for managing landing page versions via GitHub tags
 *
 * Version format: v1, v2, v3, etc.
 * - Each version is a Git tag pointing to a specific commit
 * - Users can "Save as Version" to snapshot the current state
 * - Auto-commits are made without tags (latest version)
 * - Previous versions are available for preview/rollback
 */
export class GitHubVersionService {
  /**
   * Create a new version (Git tag) for current commit
   *
   * @param landingPageId - The landing page to version
   * @param userId - User creating the version
   * @returns The new version tag (e.g., 'v5')
   */
  async createVersion(landingPageId: string, userId: string): Promise<string> {
    try {
      // Validate user has access to this landing page
      const landingPage = await prisma.landingPage.findFirst({
        where: { id: landingPageId, userId },
        select: {
          id: true,
          title: true,
          currentVersionNumber: true,
          githubRepoUrl: true,
        },
      });

      if (!landingPage) {
        throw new Error('Landing page not found or access denied');
      }

      if (!landingPage.githubRepoUrl) {
        throw new Error(
          'GitHub repository not initialized for this landing page'
        );
      }

      // Get next version number
      const nextVersionNumber = (landingPage.currentVersionNumber || 0) + 1;

      // Create Git tag via GitHubSyncService
      const gitHubSync = getGitHubSyncService();
      const versionTag = await gitHubSync.createVersion(
        landingPageId,
        nextVersionNumber
      );

      // Update landing page with new version number
      await prisma.landingPage.update({
        where: { id: landingPageId },
        data: { currentVersionNumber: nextVersionNumber },
      });

      logger.info('Created new version', {
        landingPageId,
        versionTag,
        versionNumber: nextVersionNumber,
        userId,
      });

      return versionTag;
    } catch (error) {
      logger.error('Failed to create version', {
        landingPageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get list of all versions (tags) for a landing page
   *
   * @param landingPageId - The landing page
   * @param userId - User requesting versions (for access control)
   * @returns Array of version tags in descending order (v3, v2, v1)
   */
  async listVersions(landingPageId: string, userId: string): Promise<string[]> {
    try {
      // Validate user has access
      const landingPage = await prisma.landingPage.findFirst({
        where: { id: landingPageId, userId },
        select: { id: true },
      });

      if (!landingPage) {
        throw new Error('Landing page not found or access denied');
      }

      const gitHubSync = getGitHubSyncService();
      const versions = await gitHubSync.listVersions(landingPageId);

      logger.info('Listed versions', {
        landingPageId,
        versionCount: versions.length,
      });

      return versions;
    } catch (error) {
      logger.error('Failed to list versions', {
        landingPageId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get current version information
   *
   * @param landingPageId - The landing page
   * @param userId - User requesting info (for access control)
   * @returns Current version number and commit SHA
   */
  async getCurrentVersion(
    landingPageId: string,
    userId: string
  ): Promise<{
    versionNumber: number | null;
    commitSha: string | null;
    title: string;
  }> {
    try {
      const landingPage = await prisma.landingPage.findFirst({
        where: { id: landingPageId, userId },
        select: {
          currentVersionNumber: true,
          commitSha: true,
          title: true,
        },
      });

      if (!landingPage) {
        throw new Error('Landing page not found or access denied');
      }

      return {
        versionNumber: landingPage.currentVersionNumber,
        commitSha: landingPage.commitSha,
        title: landingPage.title,
      };
    } catch (error) {
      logger.error('Failed to get current version', {
        landingPageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

// Singleton instance
let instance: GitHubVersionService | null = null;

export function initializeGitHubVersionService(): GitHubVersionService {
  if (!instance) {
    instance = new GitHubVersionService();
  }
  return instance;
}

export function getGitHubVersionService(): GitHubVersionService {
  if (!instance) {
    throw new Error(
      'GitHubVersionService not initialized. Call initializeGitHubVersionService first.'
    );
  }
  return instance;
}
