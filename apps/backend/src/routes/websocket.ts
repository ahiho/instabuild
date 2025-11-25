import { FastifyInstance } from 'fastify';
import { logger } from '../lib/logger.js';
import { prisma } from '../server.js';
import { aiModelService } from '../services/aiModel.js';
import { AuthenticationService } from '../services/authentication.js';
import { chatPersistenceService } from '../services/chatPersistence.js';

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
  const authService = new AuthenticationService(prisma);

  /**
   * WebSocket endpoint for real-time chat
   * @route ws://host/api/v1/chat/ws
   */
  fastify.get(
    '/api/v1/chat/ws',
    { websocket: true },
    (socket: any, req: any) => {
      logger.info('WebSocket connection established');

      let authenticatedUser: any = null;

      // Authenticate WebSocket connection
      const token =
        extractTokenFromQuery(req.query) ||
        extractTokenFromHeaders(req.headers);

      if (!token) {
        logger.warn(
          'WebSocket connection attempted without authentication token'
        );
        sendErrorMessage(
          socket,
          'Authentication required',
          'AUTHENTICATION_REQUIRED'
        );
        socket.close();
        return;
      }

      // Verify authentication
      authService
        .validateSession(token)
        .then(user => {
          if (!user) {
            logger.warn('WebSocket connection with invalid token');
            sendErrorMessage(
              socket,
              'Invalid authentication token',
              'INVALID_TOKEN'
            );
            socket.close();
            return;
          }

          authenticatedUser = user;
          logger.info('WebSocket connection authenticated', {
            userId: user.id,
          });
        })
        .catch(error => {
          logger.error('WebSocket authentication error', { error });
          sendErrorMessage(
            socket,
            'Authentication failed',
            'AUTHENTICATION_FAILED'
          );
          socket.close();
        });

      // Handle incoming messages from client
      socket.on('message', async (data: Buffer) => {
        try {
          if (!authenticatedUser) {
            sendErrorMessage(socket, 'Not authenticated', 'NOT_AUTHENTICATED');
            return;
          }

          // Parse incoming message
          const messageText = data.toString();
          const message: WSMessage = JSON.parse(messageText);

          // Handle user message
          if (message.type === 'userMessage') {
            await handleUserMessage(socket, message, authenticatedUser);
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
 * Extract token from WebSocket query parameters
 */
function extractTokenFromQuery(query: any): string | null {
  return query.token || query.access_token || null;
}

/**
 * Extract token from WebSocket headers
 */
function extractTokenFromHeaders(headers: any): string | null {
  const authHeader = headers.authorization;
  if (!authHeader) return null;

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
}

/**
 * Handle incoming user message (T008, T009, T010, T011)
 */
async function handleUserMessage(
  socket: any,
  message: UserMessage,
  authenticatedUser: any
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

    // Update lastAccessedAt to prevent container cleanup
    await chatPersistenceService.updateConversationAccess(
      conversationId,
      authenticatedUser.id
    );

    logger.info('Processing user message', {
      conversationId,
      contentLength: content.length,
    });

    // T011: Save user message to database
    const userId = authenticatedUser.id;
    await chatPersistenceService.saveUserMessage(
      conversationId,
      userId,
      content
    );

    // Get conversation history for context
    const history = await chatPersistenceService.getConversationHistory(
      conversationId,
      20 // Last 20 messages for context
    );

    // Prepare messages for AI
    const messages = history.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: Array.isArray(msg.parts)
        ? msg.parts
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text)
            .join(' ')
        : 'No content',
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
    await chatPersistenceService.saveAIMessage(
      conversationId,
      userId,
      fullResponse
    );

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
