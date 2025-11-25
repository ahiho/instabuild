/**
 * HeroSectionVideo - Section Component Variant
 *
 * This is an individual variant file for better tree-shaking and smaller bundle sizes.
 * Import directly: `import { HeroSectionVideo } from "@/components/sections/variants/hero-video"`
 * Or use centralized: `import { HeroSectionVideo } from "@/components/sections"`
 */

/**
 * Hero Section Component Variants
 *
 * This file contains alternate styling and layout variants for the Hero Section component.
 * Each variant offers a different visual presentation while maintaining core hero functionality.
 *
 * VARIANTS INCLUDED:
 * 1. HeroSectionSplit - Two-column layout with text left, media right
 * 2. HeroSectionMinimal - Clean, simple design without gradients
 * 3. HeroSectionVideo - Background video with overlay
 * 4. HeroSectionFullScreen - Full viewport height hero
 *
 * AI AGENT INSTRUCTIONS:
 * - Import the variant you need: `import { HeroSectionSplit } from "@/components/sections/variants/hero-variants"`
 * - Or use the centralized export: `import { HeroSectionSplit } from "@/components/sections"`
 * - Each variant maintains similar props but may have additional options
 * - Check each variant's JSDoc for specific customization options
 */

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  staggerContainer,
  staggerItem,
  viewportOptions,
} from '@/lib/animations';
import { ArrowRight, Play } from 'lucide-react';

interface HeroBaseProps {
  badge?: string;
  title: string;
  description: string;
  primaryCta: {
    text: string;
    href: string;
  };
  secondaryCta?: {
    text: string;
    href: string;
  };
}

// VARIANT 3: VIDEO HERO
// ============================================================================

interface HeroSectionVideoProps extends HeroBaseProps {
  videoSrc: string;
  posterImage?: string;
  overlayOpacity?: number;
}

/**
 * HeroSectionVideo Component
 *
 * VISUAL DESCRIPTION:
 * - Full-width background video
 * - Dark overlay for text readability
 * - Text content centered over video
 * - Autoplay, loop, muted video
 * - Dramatic, engaging presentation
 *
 * USE WHEN:
 * - You have professional video content
 * - Building creative agency or portfolio sites
 * - You want maximum visual impact
 * - Showcasing dynamic products or experiences
 * - Creating premium, luxury brand presence
 * - Event or conference landing pages
 *
 * DIFFERENCES FROM ORIGINAL:
 * - Layout: Text overlaid on video
 * - Styling: Dark overlay, white text
 * - Props: Requires videoSrc, optional posterImage and overlayOpacity
 * - Features: Auto-playing background video
 * - Accessibility: Video is decorative, muted by default
 *
 * AI AGENT INSTRUCTIONS:
 * 1. Provide videoSrc (MP4 recommended for best compatibility)
 * 2. Provide posterImage for loading state
 * 3. Adjust overlayOpacity (0-100) for text readability
 * 4. Use short, looping videos (10-30 seconds)
 * 5. Optimize video file size for web (under 5MB)
 * 6. Consider mobile data usage - video may not autoplay on mobile
 *
 * @example
 * ```tsx
 * <HeroSectionVideo
 *   videoSrc="/hero-video.mp4"
 *   posterImage="/hero-poster.jpg"
 *   overlayOpacity={60}
 *   title="Experience Innovation"
 *   description="Where creativity meets technology."
 *   primaryCta={{ text: "Explore", href: "/explore" }}
 *   secondaryCta={{ text: "Learn More", href: "/about" }}
 * />
 * ```
 */
export function HeroSectionVideo({
  badge,
  title,
  description,
  primaryCta,
  secondaryCta,
  videoSrc,
  posterImage,
  overlayOpacity = 60,
}: HeroSectionVideoProps) {
  return (
    <section className="relative min-h-[600px] sm:min-h-[700px] flex items-center justify-center overflow-hidden">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        poster={posterImage}
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={videoSrc} type="video/mp4" />
      </video>

      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: overlayOpacity / 100 }}
      />

      {/* Content */}
      <div className="container relative z-10 mx-auto px-4">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOptions}
          className="mx-auto max-w-4xl text-center text-white"
        >
          {/* Badge */}
          {badge && (
            <motion.div variants={staggerItem} className="mb-8 inline-block">
              <span className="inline-flex items-center rounded-full border border-white/30 bg-white/10 backdrop-blur-sm px-4 py-1.5 text-sm font-medium">
                {badge}
              </span>
            </motion.div>
          )}

          {/* Title */}
          <motion.h1
            variants={staggerItem}
            className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
          >
            {title}
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={staggerItem}
            className="mb-10 text-lg sm:text-xl text-white/90"
          >
            {description}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={staggerItem}
            className="flex flex-col gap-4 sm:flex-row sm:justify-center"
          >
            <Button
              asChild
              size="lg"
              className="text-base bg-white text-black hover:bg-white/90"
            >
              <a href={primaryCta.href}>
                {primaryCta.text}
                <ArrowRight className="ml-2 size-4" />
              </a>
            </Button>
            {secondaryCta && (
              <Button
                asChild
                variant="outline"
                size="lg"
                className="text-base border-white text-white hover:bg-white/10"
              >
                <a href={secondaryCta.href}>
                  <Play className="mr-2 size-4" />
                  {secondaryCta.text}
                </a>
              </Button>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
