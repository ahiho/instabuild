/**
 * Asset Management Tools
 * Provides tools for fetching external assets (images, etc.) for landing pages
 */

import type {
  EnhancedToolDefinition,
  ToolExecutionContext,
} from '@instabuild/shared/types';
import { ToolCategory } from '@instabuild/shared/types';
import { z } from 'zod';
import { logger } from '../lib/logger.js';
import { toolRegistry } from '../services/toolRegistry.js';

/**
 * Unsplash photo object structure
 */
interface UnsplashPhoto {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description: string | null;
  description: string | null;
  user: {
    name: string;
    username: string;
    links: {
      html: string;
    };
  };
  links: {
    html: string;
    download_location: string;
  };
}

/**
 * Image request schema
 */
const ImageRequestSchema = z.object({
  query: z
    .string()
    .describe(
      'Search query (e.g., "business meeting", "nature landscape", "technology")'
    ),
  count: z
    .number()
    .min(1)
    .max(10)
    .default(1)
    .describe('Number of images to fetch (1-10)'),
  orientation: z
    .enum(['landscape', 'portrait', 'squarish'])
    .optional()
    .describe('Image orientation preference'),
});

/**
 * Fetch images from Unsplash API
 */
async function fetchUnsplashImages(
  query: string,
  count: number,
  orientation?: 'landscape' | 'portrait' | 'squarish'
): Promise<UnsplashPhoto[]> {
  const apiKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!apiKey) {
    throw new Error('UNSPLASH_ACCESS_KEY environment variable not configured');
  }

  const params = new URLSearchParams({
    query,
    per_page: count.toString(),
    ...(orientation && { orientation }),
  });

  const url = `https://api.unsplash.com/photos/random?${params}`;

  logger.info('Fetching images from Unsplash', { query, count, orientation });

  const response = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${apiKey}`,
      'Accept-Version': 'v1',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('Unsplash API request failed', {
      status: response.status,
      error,
      url,
    });
    throw new Error(`Unsplash API error (${response.status}): ${error}`);
  }

  const data = await response.json();

  // API returns array for count > 1, single object for count = 1
  const photos = Array.isArray(data) ? data : [data];

  logger.info('Successfully fetched Unsplash images', {
    count: photos.length,
    query,
  });

  return photos;
}

/**
 * Format image result
 */
function formatImageResult(photo: UnsplashPhoto, index: number): string {
  const attribution = `Photo by ${photo.user.name} (${photo.user.links.html}) on Unsplash (${photo.links.html})`;

  return `
Image ${index + 1}:
- URL: ${photo.urls.regular}
- Alt text: ${photo.alt_description || photo.description || 'Unsplash photo'}
- Attribution: ${attribution}
- Photographer: ${photo.user.name} (@${photo.user.username})
`.trim();
}

/**
 * Register asset management tools
 */
export function registerAssetManagementTools() {
  logger.info('Registering asset management tools...');

  // fetch_images tool
  const fetchImagesTool: EnhancedToolDefinition = {
    name: 'fetch_images',
    displayName: 'FetchImages',
    description: `Fetch high-quality, professional images from Unsplash for landing pages.

Use when user requests images for hero sections, features, testimonials, or any landing page section.

IMPORTANT:
- Use specific search queries (e.g., "modern office workspace" not just "office")
- Attribution is provided automatically in response - MUST be included in HTML
- If fetch fails, fallback to PlaceholderImage component

Returns image URLs with attribution requirements.`,
    userDescription:
      'fetch professional images from Unsplash for landing pages',
    category: ToolCategory.ASSET_MANAGEMENT,
    safetyLevel: 'safe',
    inputSchema: ImageRequestSchema,
    metadata: {
      version: '1.0.0',
      tags: ['images', 'unsplash', 'assets', 'landing-pages'],
    },
    async execute(args: unknown, context: ToolExecutionContext) {
      try {
        const { query, count, orientation } = ImageRequestSchema.parse(args);

        logger.info('Executing fetch_images tool', {
          query,
          count,
          orientation,
          conversationId: context.conversationId,
          toolCallId: context.toolCallId,
        });

        // Check if API key is configured
        if (!process.env.UNSPLASH_ACCESS_KEY) {
          logger.warn('Unsplash API key not configured');
          return {
            success: false,
            userFeedback:
              'Image fetching unavailable - Unsplash API key not configured. Use PlaceholderImage component instead.',
            previewRefreshNeeded: false,
            technicalDetails: {
              error: 'UNSPLASH_ACCESS_KEY environment variable not set',
              fallback:
                'Use: import { PlaceholderImage } from "@/components/ui/placeholder-image"',
            },
          };
        }

        const photos = await fetchUnsplashImages(query, count, orientation);

        if (photos.length === 0) {
          return {
            success: false,
            userFeedback: `No images found for query: "${query}". Try different search terms or use PlaceholderImage.`,
            previewRefreshNeeded: false,
            technicalDetails: {
              query,
              count,
              orientation,
            },
          };
        }

        const imageResults = photos
          .map((photo, index) => formatImageResult(photo, index))
          .join('\n\n---\n\n');

        return {
          success: true,
          userFeedback: `Found ${photos.length} image${photos.length > 1 ? 's' : ''} for "${query}":\n\n${imageResults}`,
          previewRefreshNeeded: false,
          technicalDetails: {
            query,
            count: photos.length,
            orientation,
            images: photos.map(p => ({
              id: p.id,
              url: p.urls.regular,
              photographer: p.user.name,
              alt: p.alt_description,
            })),
          },
        };
      } catch (error) {
        logger.error('fetch_images tool execution failed', {
          error,
          conversationId: context.conversationId,
          toolCallId: context.toolCallId,
        });

        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        return {
          success: false,
          userFeedback: `Failed to fetch images: ${errorMessage}. Use PlaceholderImage component as fallback.`,
          previewRefreshNeeded: false,
          technicalDetails: {
            error: errorMessage,
            fallback:
              'import { PlaceholderImage } from "@/components/ui/placeholder-image"',
          },
        };
      }
    },
  };

  toolRegistry.registerEnhancedTool(fetchImagesTool);

  logger.info('Asset management tools registered successfully');
}
