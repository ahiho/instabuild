/**
 * PlaceholderImage Component
 *
 * A placeholder component for images during development and prototyping.
 * Uses picsum.photos for stylish, random placeholder images.
 *
 * Benefits:
 * - Beautiful, real photo placeholders from picsum.photos
 * - No API key required
 * - Fast CDN delivery
 * - Easy to replace with real images later
 * - Works great for demos and prototypes
 *
 * AI Agent Instructions:
 * - Use this as fallback when fetch_images fails or Unsplash API unavailable
 * - Automatically uses picsum.photos with specified dimensions
 * - Optionally include blur effect for loading states
 * - When user provides real images, replace with actual URLs
 *
 * @example
 * // Basic usage - 1200x600 image
 * <PlaceholderImage />
 *
 * @example
 * // Custom dimensions
 * <PlaceholderImage width={800} height={600} />
 *
 * @example
 * // Square image
 * <PlaceholderImage width={400} height={400} />
 *
 * @example
 * // With custom styling and blur effect
 * <PlaceholderImage
 *   width={1200}
 *   height={600}
 *   blur={true}
 *   className="rounded-lg shadow-xl"
 * />
 */

import { cn } from '@/lib/utils';

interface PlaceholderImageProps {
  /**
   * Image width in pixels (default: 1200)
   */
  width?: number;
  /**
   * Image height in pixels (default: 600)
   */
  height?: number;
  /**
   * Apply blur effect (default: false)
   * Uses picsum.photos blur parameter for soft focus
   */
  blur?: boolean;
  /**
   * Grayscale filter (default: false)
   * Converts image to black and white
   */
  grayscale?: boolean;
  /**
   * Seed for consistent random images (optional)
   * Same seed = same image on each load
   * Useful for consistent placeholders during development
   */
  seed?: number;
  /**
   * Alt text for the image (default: "Placeholder image")
   */
  alt?: string;
  /**
   * Additional CSS classes to apply
   */
  className?: string;
}

export function PlaceholderImage({
  width = 1200,
  height = 600,
  blur = false,
  grayscale = false,
  seed,
  alt = 'Placeholder image',
  className,
}: PlaceholderImageProps) {
  // Build picsum.photos URL
  const baseUrl = 'https://picsum.photos';
  const params: string[] = [];

  if (blur) params.push('blur=2');
  if (grayscale) params.push('grayscale');

  const queryString = params.length > 0 ? `?${params.join('&')}` : '';

  // Use seed if provided for consistent images, otherwise use random
  const imageUrl = seed
    ? `${baseUrl}/seed/${seed}/${width}/${height}${queryString}`
    : `${baseUrl}/${width}/${height}${queryString}`;

  return (
    <img
      src={imageUrl}
      alt={alt}
      width={width}
      height={height}
      className={cn('object-cover', className)}
      loading="lazy"
    />
  );
}
