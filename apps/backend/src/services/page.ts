import {
  CreateLandingPageRequest,
  NotFoundError,
  UpdateLandingPageRequest,
  ValidationError,
} from '@instabuild/shared';
import { octokit } from '../lib/github.js';
import { logger } from '../lib/logger.js';
import { generateSandboxPreviewUrl } from '../lib/preview-url.js';
import { prisma } from '../server.js';
import { sandboxManager } from './sandboxManager.js';

export class PageService {
  async createPage(
    data: CreateLandingPageRequest,
    userId: string,
    projectId: string
  ) {
    // Validate authentication
    if (!userId) {
      throw new ValidationError('User authentication required');
    }

    if (!projectId) {
      throw new ValidationError('Project context required');
    }
    // Validate that at least title or description is provided
    if (!data.title?.trim() && !data.description?.trim()) {
      throw new ValidationError('Either title or description is required');
    }

    // Generate title from description if not provided
    const title =
      data.title?.trim() ||
      this.generateTitleFromDescription(data.description!);

    // Create GitHub repository
    const repoName = `landing-${Date.now()}`;
    // Sanitize description for GitHub (remove control characters, max 350 chars)
    const repoDescription = this.sanitizeGitHubDescription(
      data.description || title
    );
    const repo = await octokit.rest.repos.createForAuthenticatedUser({
      name: repoName,
      description: repoDescription,
      private: false,
      auto_init: true,
    });

    // Create page record with user and project context
    const page = await prisma.landingPage.create({
      data: {
        title,
        description: data.description,
        githubRepoUrl: repo.data.html_url,
        userId,
        projectId,
      },
    });

    // Create initial version with basic template
    const initialCode = this.generateBasicTemplate(title);
    const version = await this.createVersion(
      page.id,
      initialCode,
      'Initial page creation'
    );

    // Update page with current version
    await prisma.landingPage.update({
      where: { id: page.id },
      data: { currentVersionId: version.id },
    });

    // Phase 3.5: Check if project has sandbox or provision one for preview access
    let sandboxPublicUrl: string | undefined;
    let sandboxPort: number | undefined;
    try {
      // Check if the project already has a ready sandbox
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          sandboxStatus: true,
          sandboxId: true,
          sandboxPublicUrl: true,
          sandboxPort: true,
        },
      });

      if (project?.sandboxStatus === 'READY' && project.sandboxPublicUrl) {
        logger.info('Reusing existing project sandbox for page', {
          pageId: page.id,
          projectId,
          sandboxPublicUrl: project.sandboxPublicUrl,
        });
        sandboxPublicUrl = project.sandboxPublicUrl;
        sandboxPort = project.sandboxPort || undefined;
        // Skip sandbox creation - already have a ready one
      } else {
        // Create new conversation for this page
        const conversation = await prisma.conversation.create({
          data: {
            userId,
            projectId,
            title: `${title} Development`,
            startTime: new Date(),
            lastUpdateTime: new Date(),
            lastAccessedAt: new Date(),
          },
        });

        logger.info('Created conversation for page', {
          pageId: page.id,
          conversationId: conversation.id,
          projectId: conversation.projectId,
        });

        const sandboxRequest = {
          userId,
          projectId,
          conversationId: conversation.id,
        };

        const sandboxResponse =
          await sandboxManager.createSandbox(sandboxRequest);

        if (sandboxResponse && sandboxResponse.status === 'READY') {
          sandboxPort = sandboxResponse.port;

          // Generate preview URL using actual allocated port
          sandboxPublicUrl = sandboxPort
            ? `http://localhost:${sandboxPort}`
            : generateSandboxPreviewUrl(conversation.id);

          // Sandbox info is now stored on the project, not the conversation
          logger.info('Sandbox provisioned for landing page', {
            pageId: page.id,
            conversationId: conversation.id,
            sandboxId: sandboxResponse.containerId,
            previewUrl: sandboxPublicUrl,
          });
        } else {
          logger.warn(
            'Sandbox provisioning returned non-ready status for page',
            {
              pageId: page.id,
              status: sandboxResponse?.status,
              error: sandboxResponse?.error,
            }
          );

          // Update project to mark sandbox as failed
          await prisma.project.update({
            where: { id: projectId },
            data: {
              sandboxStatus: 'FAILED',
            },
          });
        }
      }
    } catch (error) {
      logger.error('Error provisioning sandbox for page', {
        pageId: page.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return {
      ...page,
      currentVersionId: version.id,
      sandboxPublicUrl,
      sandboxPort,
    };
  }

  async getPage(id: string, userId?: string) {
    // Validate user access if userId is provided
    if (userId) {
      const page = await prisma.landingPage.findFirst({
        where: {
          id,
          userId, // Ensure user owns this page
        },
      });

      if (!page) {
        throw new NotFoundError('Landing page not found or access denied');
      }
    }
    const page = await prisma.landingPage.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 10,
        },
        currentVersion: true,
      },
    });

    if (!page) {
      throw new NotFoundError('Landing page');
    }

    // Phase 3.5: Include sandbox information if available
    // Get sandbox info from the project
    const project = await prisma.project.findUnique({
      where: { id: page.projectId },
      select: {
        sandboxStatus: true,
        sandboxPublicUrl: true,
        sandboxPort: true,
      },
    });

    logger.info('GetPage - Sandbox lookup', {
      pageId: id,
      projectId: page.projectId,
      sandboxStatus: project?.sandboxStatus,
      sandboxPublicUrl: project?.sandboxPublicUrl,
    });

    return {
      ...page,
      sandboxPublicUrl: project?.sandboxPublicUrl,
      sandboxPort: project?.sandboxPort,
      sandboxStatus: project?.sandboxStatus,
    };
  }

  async updatePage(
    id: string,
    data: UpdateLandingPageRequest,
    userId?: string
  ) {
    const whereClause = userId ? { id, userId } : { id };
    const page = await prisma.landingPage.findUnique({ where: whereClause });
    if (!page) {
      throw new NotFoundError('Landing page not found or access denied');
    }

    return prisma.landingPage.update({
      where: whereClause,
      data: {
        title: data.title || page.title,
        description:
          data.description !== undefined ? data.description : page.description,
      },
    });
  }

  async createVersion(
    pageId: string,
    sourceCode: string,
    changeDescription: string,
    userId?: string
  ) {
    const whereClause = userId ? { id: pageId, userId } : { id: pageId };
    const page = await prisma.landingPage.findUnique({ where: whereClause });
    if (!page) {
      throw new NotFoundError('Landing page not found or access denied');
    }

    // Get next version number
    const lastVersion = await prisma.landingPageVersion.findFirst({
      where: { landingPageId: pageId },
      orderBy: { versionNumber: 'desc' },
    });

    const versionNumber = (lastVersion?.versionNumber || 0) + 1;

    // Create version
    const version = await prisma.landingPageVersion.create({
      data: {
        landingPageId: pageId,
        versionNumber,
        commitSha: `temp-${Date.now()}`, // Will be updated after GitHub commit
        sourceCode,
        changeDescription,
      },
    });

    // TODO: Create GitHub commit and update commitSha
    // TODO: Deploy to Vercel and update previewUrl

    return version;
  }

  /**
   * Generate a title from the description by taking the first sentence
   * or the first 50 characters, whichever is shorter
   */
  private generateTitleFromDescription(description: string): string {
    // Remove extra whitespace
    const cleanDescription = description.trim();

    // Try to extract first sentence (ending with . ! ?)
    const firstSentenceMatch = cleanDescription.match(/^[^.!?]+[.!?]/);
    if (firstSentenceMatch) {
      const firstSentence = firstSentenceMatch[0].trim();
      // If first sentence is reasonable length, use it
      if (firstSentence.length <= 100) {
        return firstSentence.replace(/[.!?]+$/, '').trim();
      }
    }

    // Otherwise, take first 50 characters and add ellipsis if needed
    if (cleanDescription.length <= 50) {
      return cleanDescription;
    }

    // Find last space before 50 chars to avoid cutting words
    const truncated = cleanDescription.substring(0, 50);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 30) {
      return truncated.substring(0, lastSpace) + '...';
    }

    return truncated + '...';
  }

  /**
   * Sanitize description for GitHub repository
   * Removes control characters and limits length to 350 characters
   */
  private sanitizeGitHubDescription(description: string): string {
    // Replace newlines and tabs with spaces
    let sanitized = description
      .replace(/[\r\n\t]/g, ' ')
      // Replace multiple spaces with single space
      .replace(/\s+/g, ' ')
      .trim();

    // Limit to 350 characters (GitHub's max)
    if (sanitized.length > 350) {
      sanitized = sanitized.substring(0, 347) + '...';
    }

    return sanitized;
  }

  private generateBasicTemplate(title: string): string {
    return `import React from 'react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 id="main-title" className="text-5xl font-bold text-gray-900 mb-6">
            ${title}
          </h1>
          <p id="main-subtitle" className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Welcome to your new landing page. Start editing by describing what you'd like to change!
          </p>
          <button id="cta-button" className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors">
            Get Started
          </button>
        </div>
      </div>
    </div>
  )
}`;
  }
}
