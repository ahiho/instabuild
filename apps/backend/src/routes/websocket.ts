import { FastifyInstance } from 'fastify';
import { chatPersistenceService } from '../services/chatPersistence.js';
import { aiModelService } from '../services/aiModel.js';
import { logger } from '../lib/logger.js';

/**
 * WebSocket message types based on contract
 */
interface UserMessage {
  type: 'userMessage';
  conversationId: string;
  content: string;
}

interface AIResponseChunk {
  type: 'aiResponseChunk';
  conversationId: string;
  content: string;
  isLastChunk: boolean;
}

interface ErrorMessage {
  type: 'error';
  conversationId?: string;
  message: string;
  code?: string;
}

type WSMessage = UserMessage | AIResponseChunk | ErrorMessage;

/**
 * Register WebSocket routes
 */
export async function websocketRoutes(fastify: FastifyInstance) {
  /**
   * WebSocket endpoint for real-time chat
   * @route ws://host/api/v1/chat/ws
   */
  fastify.get(
    '/api/v1/chat/ws',
    { websocket: true },
    (socket: any, _req: any) => {
      logger.info('WebSocket connection established');

      // Handle incoming messages from client
      socket.on('message', async (data: Buffer) => {
        try {
          // Parse incoming message
          const messageText = data.toString();
          const message: WSMessage = JSON.parse(messageText);

          // Handle user message
          if (message.type === 'userMessage') {
            await handleUserMessage(socket, message);
          } else {
            logger.warn('Unknown message type received', {
              type: message.type,
            });
          }
        } catch (error) {
          logger.error('Error processing WebSocket message', { error });
          sendErrorMessage(
            socket,
            'Failed to process message',
            'PROCESSING_ERROR'
          );
        }
      });

      // Handle connection close
      socket.on('close', () => {
        logger.info('WebSocket connection closed');
      });

      // Handle errors
      socket.on('error', (error: Error) => {
        logger.error('WebSocket error', { error });
      });
    }
  );
}

/**
 * Handle incoming user message (T008, T009, T010, T011)
 */
async function handleUserMessage(
  socket: any,
  message: UserMessage
): Promise<void> {
  const { conversationId, content } = message;

  try {
    // Validate message content
    const validation = aiModelService.validateMessage(content);
    if (!validation.valid) {
      sendErrorMessage(
        socket,
        validation.error || 'Invalid message',
        'INVALID_MESSAGE',
        conversationId
      );
      return;
    }

    // Verify conversation exists
    const conversationExists =
      await chatPersistenceService.conversationExists(conversationId);
    if (!conversationExists) {
      sendErrorMessage(
        socket,
        'Conversation not found',
        'CONVERSATION_NOT_FOUND',
        conversationId
      );
      return;
    }

    logger.info('Processing user message', {
      conversationId,
      contentLength: content.length,
    });

    // T011: Save user message to database
    await chatPersistenceService.saveUserMessage(conversationId, content);

    // Get conversation history for context
    const history = await chatPersistenceService.getConversationHistory(
      conversationId,
      20 // Last 20 messages for context
    );

    // Prepare messages for AI
    const messages = history.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    // T009 & T010: Invoke AI model and stream response
    let fullResponse = '';
    let chunkCount = 0;

    try {
      for await (const chunk of aiModelService.streamChatResponse({
        messages,
      })) {
        fullResponse += chunk;
        chunkCount++;

        // Send chunk to client
        const responseChunk: AIResponseChunk = {
          type: 'aiResponseChunk',
          conversationId,
          content: chunk,
          isLastChunk: false,
        };

        socket.send(JSON.stringify(responseChunk));
        logger.debug('Sent chunk to client', {
          chunkNumber: chunkCount,
          chunkLength: chunk.length,
        });
      }

      logger.info('AI streaming completed', {
        conversationId,
        totalChunks: chunkCount,
        totalLength: fullResponse.length,
      });

      // Send final chunk indicator
      const finalChunk: AIResponseChunk = {
        type: 'aiResponseChunk',
        conversationId,
        content: '',
        isLastChunk: true,
      };
      socket.send(JSON.stringify(finalChunk));
    } catch (streamError) {
      logger.error('Error during AI streaming', {
        error: streamError,
        conversationId,
        chunksReceived: chunkCount,
      });
      throw streamError; // Re-throw to be caught by outer handler
    }

    // Save complete AI response to database
    await chatPersistenceService.saveAIMessage(conversationId, fullResponse);

    // Update conversation timestamp
    await chatPersistenceService.updateConversationTimestamp(conversationId);

    logger.info('AI response completed', {
      conversationId,
      responseLength: fullResponse.length,
    });
  } catch (error) {
    logger.error('Error handling user message', {
      error,
      conversationId,
    });
    sendErrorMessage(
      socket,
      'Failed to process message',
      'AI_PROCESSING_ERROR',
      conversationId
    );
  }
}

/**
 * Send error message to client
 */
function sendErrorMessage(
  socket: any,
  message: string,
  code: string,
  conversationId?: string
): void {
  const errorMessage: ErrorMessage = {
    type: 'error',
    conversationId,
    message,
    code,
  };
  socket.send(JSON.stringify(errorMessage));
}
