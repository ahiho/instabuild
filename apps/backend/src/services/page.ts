import { prisma } from '../server.js';
import { octokit } from '../lib/github.js';
import { sandboxManager } from './sandboxManager.js';
import { generateSandboxPreviewUrl } from '../lib/preview-url.js';
import { logger } from '../lib/logger.js';
import {
  NotFoundError,
  ValidationError,
  CreateLandingPageRequest,
  UpdateLandingPageRequest,
} from '@instabuild/shared';

export class PageService {
  async createPage(data: CreateLandingPageRequest) {
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

    // Create page record
    const page = await prisma.landingPage.create({
      data: {
        title,
        description: data.description,
        githubRepoUrl: repo.data.html_url,
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

    // Phase 3.5: Create conversation and provision sandbox for preview access
    let sandboxPublicUrl: string | undefined;
    let sandboxPort: number | undefined;
    try {
      // Check if a conversation with ready sandbox already exists for this page
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          landingPageId: page.id,
          sandboxStatus: 'READY',
        },
        orderBy: { startTime: 'desc' },
      });

      if (existingConversation && existingConversation.sandboxPublicUrl) {
        logger.info('Reusing existing sandbox for page', {
          pageId: page.id,
          conversationId: existingConversation.id,
          sandboxPublicUrl: existingConversation.sandboxPublicUrl,
        });
        sandboxPublicUrl = existingConversation.sandboxPublicUrl;
        sandboxPort = existingConversation.sandboxPort || undefined;
        // Skip sandbox creation - already have a ready one
      } else {
        // Create new conversation and provision sandbox
        const conversation = await prisma.conversation.create({
          data: {
            userId: 'system', // TODO: Get from authentication context
            landingPageId: page.id,
            startTime: new Date(),
            lastUpdateTime: new Date(),
            lastAccessedAt: new Date(),
            sandboxStatus: 'PENDING',
          },
        });

        logger.info('Created conversation for page', {
          pageId: page.id,
          conversationId: conversation.id,
          landingPageId: conversation.landingPageId,
        });

        const sandboxRequest = {
          userId: conversation.userId || 'system',
          projectId: conversation.id,
        };

        const sandboxResponse =
          await sandboxManager.createSandbox(sandboxRequest);

        if (sandboxResponse && sandboxResponse.status === 'READY') {
          sandboxPort = sandboxResponse.port;

          // Generate preview URL using actual allocated port
          sandboxPublicUrl = sandboxPort
            ? `http://localhost:${sandboxPort}`
            : generateSandboxPreviewUrl(conversation.id);

          // Update conversation with sandbox info + port
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              sandboxId: sandboxResponse.containerId,
              sandboxPort,
              sandboxStatus: 'READY',
              sandboxCreatedAt: new Date(),
              sandboxPublicUrl,
            },
          });

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

          // Update conversation to mark sandbox as failed
          await prisma.conversation.update({
            where: { id: conversation.id },
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

  async getPage(id: string) {
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
    // Prioritize conversations with ready sandboxes, fall back to any conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        landingPageId: id,
        sandboxStatus: 'READY',
      },
      orderBy: { startTime: 'desc' },
      take: 1,
    });

    // If no ready sandbox found, get the most recent conversation
    if (!conversation) {
      conversation = await prisma.conversation.findFirst({
        where: { landingPageId: id },
        orderBy: { startTime: 'desc' },
        take: 1,
      });
    }

    logger.info('GetPage - Sandbox lookup', {
      pageId: id,
      found: !!conversation,
      conversationId: conversation?.id,
      sandboxStatus: conversation?.sandboxStatus,
      sandboxPublicUrl: conversation?.sandboxPublicUrl,
    });

    return {
      ...page,
      sandboxPublicUrl: conversation?.sandboxPublicUrl,
      sandboxPort: conversation?.sandboxPort,
      sandboxStatus: conversation?.sandboxStatus,
    };
  }

  async updatePage(id: string, data: UpdateLandingPageRequest) {
    const page = await prisma.landingPage.findUnique({ where: { id } });
    if (!page) {
      throw new NotFoundError('Landing page');
    }

    return prisma.landingPage.update({
      where: { id },
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
    changeDescription: string
  ) {
    const page = await prisma.landingPage.findUnique({ where: { id: pageId } });
    if (!page) {
      throw new NotFoundError('Landing page');
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
