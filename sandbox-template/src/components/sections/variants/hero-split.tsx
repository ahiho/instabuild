/**
 * HeroSectionSplit - Section Component Variant
 *
 * This is an individual variant file for better tree-shaking and smaller bundle sizes.
 * Import directly: `import { HeroSectionSplit } from "@/components/sections/variants/hero-split"`
 * Or use centralized: `import { HeroSectionSplit } from "@/components/sections"`
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
  fadeInLeft,
  fadeInRight,
  viewportOptions,
  transitions,
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

// VARIANT 1: SPLIT HERO
// ============================================================================

interface HeroSectionSplitProps extends HeroBaseProps {
  image?: string;
  imagePosition?: 'left' | 'right';
}

/**
 * HeroSectionSplit Component
 *
 * VISUAL DESCRIPTION:
 * - Two-column layout with 50/50 split
 * - Text content on one side, image/media on the other
 * - Configurable image position (left or right)
 * - Clean, professional appearance
 * - No background gradients or decorations
 *
 * USE WHEN:
 * - You want to showcase a product screenshot or image prominently
 * - You need equal emphasis on text and visuals
 * - Building SaaS product pages or app landing pages
 * - You have high-quality images that deserve prominent placement
 * - Creating a more structured, professional layout
 *
 * DIFFERENCES FROM ORIGINAL:
 * - Layout: Side-by-side columns instead of stacked
 * - Styling: No gradient background, clean white/dark
 * - Props: Additional imagePosition prop
 * - Responsive: Stacks vertically on mobile
 *
 * AI AGENT INSTRUCTIONS:
 * 1. Provide a high-quality image for best results
 * 2. Use imagePosition="left" or "right" to control layout
 * 3. Text is left-aligned (not centered) for better readability
 * 4. Works great with screenshots, mockups, or product images
 * 5. Consider adding a subtle background color via Tailwind classes if needed
 *
 * @example
 * ```tsx
 * <HeroSectionSplit
 *   badge="New Feature"
 *   title="Build Faster with Our Platform"
 *   description="The complete solution for modern developers."
 *   primaryCta={{ text: "Get Started", href: "/signup" }}
 *   secondaryCta={{ text: "Watch Demo", href: "/demo" }}
 *   image="/product-screenshot.png"
 *   imagePosition="right"
 * />
 * ```
 */
export function HeroSectionSplit({
  badge,
  title,
  description,
  primaryCta,
  secondaryCta,
  image,
  imagePosition = 'right',
}: HeroSectionSplitProps) {
  const textContent = (
    <motion.div
      variants={fadeInLeft}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOptions}
      transition={transitions.default}
      className="flex flex-col justify-center"
    >
      {/* Badge */}
      {badge && (
        <div className="mb-6 inline-block">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            {badge}
          </span>
        </div>
      )}

      {/* Title */}
      <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
        {title}
      </h1>

      {/* Description */}
      <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
        {description}
      </p>

      {/* CTA Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button asChild size="lg" className="text-base">
          <a href={primaryCta.href}>
            {primaryCta.text}
            <ArrowRight className="ml-2 size-4" />
          </a>
        </Button>
        {secondaryCta && (
          <Button asChild variant="outline" size="lg" className="text-base">
            <a href={secondaryCta.href}>
              <Play className="mr-2 size-4" />
              {secondaryCta.text}
            </a>
          </Button>
        )}
      </div>
    </motion.div>
  );

  const imageContent = image && (
    <motion.div
      variants={fadeInRight}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOptions}
      transition={transitions.smooth}
      className="flex items-center justify-center"
    >
      <div className="relative rounded-xl border bg-card shadow-2xl overflow-hidden">
        <img src={image} alt="Hero" className="w-full h-auto" />
      </div>
    </motion.div>
  );

  return (
    <section className="relative py-20 sm:py-32">
      <div className="container mx-auto px-4">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {imagePosition === 'left' ? (
            <>
              {imageContent}
              {textContent}
            </>
          ) : (
            <>
              {textContent}
              {imageContent}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
