import { ToolCategory } from '@instabuild/shared/types';
import { z } from 'zod';
import { logger } from '../lib/logger.js';
import { prisma } from '../server.js';
import { toolRegistry } from '../services/toolRegistry.js';

/**
 * Landing Page Code Management Tools
 * Simplified version that works with existing LandingPage schema
 */

/**
 * Read landing page content
 */
const readLandingPageTool = {
  name: 'read_landing_page',
  displayName: 'Read Landing Page',
  description: 'Read the current version of a landing page',
  userDescription: 'view the current content of your landing page',
  category: ToolCategory.LANDING_PAGE,
  safetyLevel: 'safe' as const, // Reading is always safe
  inputSchema: z.object({
    landingPageId: z.string().describe('The ID of the landing page to read'),
  }),
  execute: async (input: { landingPageId: string }) => {
    try {
      // Get landing page with current version
      const landingPage = await prisma.landingPage.findUnique({
        where: { id: input.landingPageId },
        include: {
          currentVersion: true,
          versions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!landingPage) {
        return {
          success: false,
          userFeedback: 'Landing page not found',
          previewRefreshNeeded: false,
        };
      }

      const currentVersion =
        landingPage.currentVersion || landingPage.versions[0];

      return {
        success: true,
        data: {
          landingPageId: landingPage.id,
          title: landingPage.title,
          description: landingPage.description,
          sourceCode: currentVersion?.sourceCode || '',
          versionNumber: currentVersion?.versionNumber || 0,
        },
        userFeedback: `Successfully read landing page "${landingPage.title}"`,
        previewRefreshNeeded: false,
      };
    } catch (error) {
      logger.error('Error reading landing page', {
        error,
        landingPageId: input.landingPageId,
      });
      return {
        success: false,
        userFeedback: 'Failed to read landing page',
        previewRefreshNeeded: false,
      };
    }
  },
  metadata: {
    version: '1.0.0',
    tags: ['landing-page', 'read', 'html'],
    examples: [
      {
        description: 'Read content of a landing page',
        input: { landingPageId: 'page-123' },
      },
    ],
  },
};

/**
 * Update landing page content
 */
const updateLandingPageTool = {
  name: 'update_landing_page',
  displayName: 'Update Landing Page',
  description: 'Update the HTML content of a landing page',
  userDescription: 'modify the content and structure of your landing page',
  category: ToolCategory.LANDING_PAGE,
  safetyLevel: 'potentially_destructive' as const, // Full page updates can be destructive
  inputSchema: z.object({
    landingPageId: z.string().describe('The ID of the landing page to update'),
    newContent: z.string().describe('The new HTML content for the page'),
    changeDescription: z
      .string()
      .optional()
      .describe('Description of the changes made'),
  }),
  execute: async (input: {
    landingPageId: string;
    newContent: string;
    changeDescription?: string;
  }) => {
    try {
      // Get current landing page
      const landingPage = await prisma.landingPage.findUnique({
        where: { id: input.landingPageId },
        include: {
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1,
          },
        },
      });

      if (!landingPage) {
        return {
          success: false,
          userFeedback: 'Landing page not found',
          previewRefreshNeeded: false,
        };
      }

      const currentVersion = landingPage.versions[0];
      const nextVersionNumber = (currentVersion?.versionNumber || 0) + 1;

      // Create new version with updated content
      const newVersion = await prisma.landingPageVersion.create({
        data: {
          landingPageId: input.landingPageId,
          versionNumber: nextVersionNumber,
          commitSha: `update-${Date.now()}`, // Simple commit identifier
          sourceCode: input.newContent,
          changeDescription: input.changeDescription || 'Updated page content',
        },
      });

      // Update landing page to point to new version
      await prisma.landingPage.update({
        where: { id: input.landingPageId },
        data: {
          currentVersionId: newVersion.id,
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        data: {
          landingPageId: input.landingPageId,
          newVersionId: newVersion.id,
          versionNumber: nextVersionNumber,
        },
        userFeedback: `Successfully updated landing page "${landingPage.title}" to version ${nextVersionNumber}`,
        previewRefreshNeeded: true,
        changedFiles: [`landing-page-${input.landingPageId}.html`],
      };
    } catch (error) {
      logger.error('Error updating landing page', {
        error,
        landingPageId: input.landingPageId,
      });
      return {
        success: false,
        userFeedback: 'Failed to update landing page',
        previewRefreshNeeded: false,
      };
    }
  },
  metadata: {
    version: '1.0.0',
    tags: ['landing-page', 'update', 'html'],
    examples: [
      {
        description: 'Update page with new content',
        input: {
          landingPageId: 'page-123',
          newContent: '<html><body><h1>Updated Page</h1></body></html>',
          changeDescription: 'Added new heading',
        },
      },
    ],
  },
};

/**
 * Update landing page metadata
 */
const updateLandingPageMetaTool = {
  name: 'update_landing_page_meta',
  displayName: 'Update Page Info',
  description: 'Update the title and description of a landing page',
  userDescription: 'change the title and description of your landing page',
  category: ToolCategory.LANDING_PAGE,
  safetyLevel: 'safe' as const, // Metadata updates are safe
  inputSchema: z.object({
    landingPageId: z.string().describe('The ID of the landing page'),
    title: z.string().optional().describe('New page title'),
    description: z.string().optional().describe('New page description'),
  }),
  execute: async (input: {
    landingPageId: string;
    title?: string;
    description?: string;
  }) => {
    try {
      const landingPage = await prisma.landingPage.findUnique({
        where: { id: input.landingPageId },
      });

      if (!landingPage) {
        return {
          success: false,
          userFeedback: 'Landing page not found',
          previewRefreshNeeded: false,
        };
      }

      const updateData: any = { updatedAt: new Date() };
      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) {
        updateData.description = input.description;
      }

      const updatedPage = await prisma.landingPage.update({
        where: { id: input.landingPageId },
        data: updateData,
      });

      const changes = [];
      if (input.title) changes.push(`title to "${input.title}"`);
      if (input.description) changes.push('description');

      return {
        success: true,
        data: {
          landingPageId: input.landingPageId,
          newTitle: updatedPage.title,
          newDescription: updatedPage.description,
        },
        userFeedback: `Successfully updated ${changes.join(' and ')} for the landing page`,
        previewRefreshNeeded: true,
        changedFiles: [`landing-page-${input.landingPageId}.html`],
      };
    } catch (error) {
      logger.error('Error updating landing page meta', {
        error,
        landingPageId: input.landingPageId,
      });
      return {
        success: false,
        userFeedback: 'Failed to update page information',
        previewRefreshNeeded: false,
      };
    }
  },
  metadata: {
    version: '1.0.0',
    tags: ['landing-page', 'meta', 'title'],
    examples: [
      {
        description: 'Update page title and description',
        input: {
          landingPageId: 'page-123',
          title: 'Amazing Product Launch',
          description: 'Get ready for the most innovative product of the year',
        },
      },
    ],
  },
};

/**
 * Register all landing page tools
 */
export function registerLandingPageTools(): void {
  try {
    // Register with main registry for AI SDK compatibility
    toolRegistry.registerTool(readLandingPageTool);
    toolRegistry.registerTool(updateLandingPageTool);
    toolRegistry.registerTool(updateLandingPageMetaTool);

    logger.info('Landing page tools registered successfully', {
      toolCount: 3,
      tools: [
        'read_landing_page',
        'update_landing_page',
        'update_landing_page_meta',
      ],
    });
  } catch (error) {
    logger.error('Failed to register landing page tools', { error });
    throw error;
  }
}
