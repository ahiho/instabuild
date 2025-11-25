import { toolLoopLogger } from './toolLoopLogger.js';

/**
 * Custom fetch wrapper that logs all OpenAI API requests and responses
 * for debugging tool loop stop reasons
 */
export function createLoggingFetch(conversationId?: string): typeof fetch {
  return async (input: string | URL | Request, init?: RequestInit) => {
    const startTime = Date.now();
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method || 'GET';

    // Only log OpenAI API calls
    const isOpenAICall = url.includes('api.openai.com');
    if (!isOpenAICall) {
      // Pass through non-OpenAI calls without logging
      return fetch(input, init);
    }

    try {
      // Parse request body if present
      let requestBody: any = null;
      if (init?.body) {
        try {
          requestBody =
            typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
        } catch {
          requestBody = init.body;
        }
      }

      // Extract headers
      const headers: Record<string, string> = {};
      if (init?.headers) {
        if (init.headers instanceof Headers) {
          init.headers.forEach((value, key) => {
            headers[key] = value;
          });
        } else if (Array.isArray(init.headers)) {
          for (const [key, value] of init.headers) {
            headers[key] = value;
          }
        } else {
          Object.assign(headers, init.headers);
        }
      }

      // Log the request
      toolLoopLogger.logOpenAIRequest({
        conversationId,
        url,
        method,
        headers,
        body: requestBody,
        timestamp: new Date().toISOString(),
      });

      // Make the actual API call
      const response = await fetch(input, init);
      const durationMs = Date.now() - startTime;

      // Clone the response so we can read it for logging
      const clonedResponse = response.clone();

      // Extract response headers
      const responseHeaders: Record<string, string> = {};
      clonedResponse.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Parse response body
      let responseBody: any = null;
      try {
        const text = await clonedResponse.text();

        // For streaming responses, we might get multiple JSON objects separated by newlines
        // This is common with Server-Sent Events (SSE) from OpenAI
        if (text.includes('\n') && text.includes('data: ')) {
          // Parse SSE format
          const lines = text.split('\n').filter(line => line.trim());
          const events = lines
            .filter(line => line.startsWith('data: '))
            .map(line => {
              const data = line.substring(6); // Remove "data: " prefix
              if (data === '[DONE]') return '[DONE]';
              try {
                return JSON.parse(data);
              } catch {
                return data;
              }
            });
          responseBody = {
            format: 'SSE',
            eventCount: events.length,
            events: events.slice(0, 5), // Log first 5 events to avoid huge logs
            lastEvent: events[events.length - 1],
            fullEventsCount: events.length,
          };
        } else {
          // Regular JSON response
          try {
            responseBody = JSON.parse(text);
          } catch {
            responseBody = text;
          }
        }
      } catch (error) {
        responseBody = {
          error: 'Failed to parse response body',
          details: error instanceof Error ? error.message : String(error),
        };
      }

      // Log the response
      toolLoopLogger.logOpenAIResponse({
        conversationId,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        timestamp: new Date().toISOString(),
        durationMs,
      });

      return response;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      // Log the error
      toolLoopLogger.logOpenAIError({
        conversationId,
        error,
        timestamp: new Date().toISOString(),
        durationMs,
      });

      // Re-throw the error
      throw error;
    }
  };
}

/**
 * Global logging fetch that can be used when conversationId is not available
 */
export const globalLoggingFetch = createLoggingFetch();
