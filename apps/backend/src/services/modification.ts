import { prisma } from '../server.js';
import { PageService } from './page.js';
import { NotFoundError } from '@instabuild/shared';

export class ModificationService {
  private pageService = new PageService();

  async processModification(
    chatMessageId: string,
    targetElements: string[],
    requestedChanges: Record<string, unknown>
  ) {
    // Create modification command record
    const command = await prisma.modificationCommand.create({
      data: {
        chatMessageId,
        targetElements: targetElements as any,
        requestedChanges: requestedChanges as any,
        status: 'processing',
      },
    });

    try {
      // Get the chat message to find the page
      const chatMessage = await prisma.chatMessage.findUnique({
        where: { id: chatMessageId },
        include: { landingPage: { include: { currentVersion: true } } },
      });

      if (!chatMessage) {
        throw new NotFoundError('Chat message');
      }

      const page = chatMessage.landingPage;
      if (!page.currentVersion) {
        throw new Error('No current version found for page');
      }

      // Apply modifications to source code
      const modifiedCode = this.applyModifications(
        page.currentVersion.sourceCode,
        targetElements,
        requestedChanges
      );

      // Create new version
      const newVersion = await this.pageService.createVersion(
        page.id,
        modifiedCode,
        `Applied modifications: ${JSON.stringify(requestedChanges)}`
      );

      // Update page current version
      await prisma.landingPage.update({
        where: { id: page.id },
        data: { currentVersionId: newVersion.id },
      });

      // Update command status
      await prisma.modificationCommand.update({
        where: { id: command.id },
        data: {
          status: 'completed',
          resultVersionId: newVersion.id,
        },
      });

      return newVersion;
    } catch (error) {
      // Update command with error
      await prisma.modificationCommand.update({
        where: { id: command.id },
        data: {
          status: 'failed',
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw error;
    }
  }

  private applyModifications(
    sourceCode: string,
    targetElements: string[],
    changes: Record<string, unknown>
  ): string {
    let modifiedCode = sourceCode;

    // Simple text-based modifications for MVP
    // In a production system, this would use AST parsing

    if (changes.content && typeof changes.content === 'string') {
      // Replace content in elements
      for (const elementId of targetElements) {
        const regex = new RegExp(
          `(id="${elementId}"[^>]*>)([^<]*)(</[^>]*>)`,
          'g'
        );
        modifiedCode = modifiedCode.replace(regex, `$1${changes.content}$3`);
      }
    }

    if (changes.style && typeof changes.style === 'object') {
      // Apply style changes (simplified for MVP)
      const styleChanges = changes.style as Record<string, string>;
      for (const elementId of targetElements) {
        // This is a simplified approach - in production, use proper AST manipulation
        for (const [property, value] of Object.entries(styleChanges)) {
          if (property === 'backgroundColor') {
            modifiedCode = modifiedCode.replace(
              new RegExp(
                `(id="${elementId}"[^>]*className="[^"]*)(bg-[^\\s"]*)`
              ),
              `$1bg-${value}`
            );
          }
        }
      }
    }

    return modifiedCode;
  }
}
