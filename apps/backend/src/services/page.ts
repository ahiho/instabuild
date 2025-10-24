import { prisma } from '../server.js';
import { octokit } from '../lib/github.js';
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
    const repo = await octokit.rest.repos.createForAuthenticatedUser({
      name: repoName,
      description: data.description || title,
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

    return { ...page, currentVersionId: version.id };
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

    return page;
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
