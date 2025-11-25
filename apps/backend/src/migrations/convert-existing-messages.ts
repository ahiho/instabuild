import { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger.js';

const prisma = new PrismaClient();

/**
 * Migration script to convert existing chat messages to AI SDK format
 * This adds the parts array to existing messages based on their content
 */
export async function convertExistingMessagesToAISDKFormat() {
  logger.info(
    'Starting migration: Converting existing messages to AI SDK format'
  );

  try {
    // Get all messages that don't have parts yet
    const messagesWithoutParts = await prisma.chatMessage.findMany({
      where: {
        parts: undefined,
      },
    });

    logger.info(`Found ${messagesWithoutParts.length} messages to convert`);

    let convertedCount = 0;

    for (const message of messagesWithoutParts) {
      // Convert content to parts array format
      const parts = [
        {
          type: 'text',
          text: (message as any).content || 'No content',
        },
      ];

      // Update the message with parts
      await prisma.chatMessage.update({
        where: { id: message.id },
        data: {
          parts,
          metadata: {
            ...((message.metadata as any) || {}),
            migrated: true,
            migratedAt: new Date().toISOString(),
          },
        },
      });

      convertedCount++;

      if (convertedCount % 100 === 0) {
        logger.info(`Converted ${convertedCount} messages...`);
      }
    }

    logger.info(
      `Migration completed: Converted ${convertedCount} messages to AI SDK format`
    );
  } catch (error) {
    logger.error('Migration failed:', error as Record<string, any>);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  convertExistingMessagesToAISDKFormat()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
