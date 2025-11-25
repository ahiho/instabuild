/**
 * HeroSectionMinimal - Section Component Variant
 *
 * This is an individual variant file for better tree-shaking and smaller bundle sizes.
 * Import directly: `import { HeroSectionMinimal } from "@/components/sections/variants/hero-minimal"`
 * Or use centralized: `import { HeroSectionMinimal } from "@/components/sections"`
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

// VARIANT 2: MINIMAL HERO
// ============================================================================

interface HeroSectionMinimalProps extends HeroBaseProps {
  subtitle?: string;
}

/**
 * HeroSectionMinimal Component
 *
 * VISUAL DESCRIPTION:
 * - Clean, simple centered text layout
 * - No background gradients or decorative elements
 * - Narrow max-width for better readability (700px)
 * - Subtle, elegant design
 * - Optional subtitle for additional context
 *
 * USE WHEN:
 * - You want a clean, distraction-free hero
 * - Building blog headers or article pages
 * - Creating simple announcement pages
 * - You prefer minimalist design
 * - Text content is the primary focus
 * - Building internal tools or documentation sites
 *
 * DIFFERENCES FROM ORIGINAL:
 * - Layout: Narrower max-width, more focused
 * - Styling: No gradients, decorations, or background effects
 * - Props: Optional subtitle instead of badge
 * - Visual: More whitespace, cleaner typography
 *
 * AI AGENT INSTRUCTIONS:
 * 1. Use for content-focused pages
 * 2. Subtitle is optional - use for additional context
 * 3. Keep title concise for best visual impact
 * 4. Works well with simple, clear messaging
 * 5. Pairs great with content sections below
 *
 * @example
 * ```tsx
 * <HeroSectionMinimal
 *   subtitle="Welcome to"
 *   title="The Future of Development"
 *   description="Simple, powerful, and built for developers who value clean design."
 *   primaryCta={{ text: "Get Started", href: "/start" }}
 * />
 * ```
 */
export function HeroSectionMinimal({
  subtitle,
  badge,
  title,
  description,
  primaryCta,
  secondaryCta,
}: HeroSectionMinimalProps) {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="container mx-auto px-4">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOptions}
          className="mx-auto max-w-[700px] text-center"
        >
          {/* Subtitle */}
          {subtitle && (
            <motion.div
              variants={staggerItem}
              className="mb-4 text-sm font-medium tracking-wide text-primary uppercase"
            >
              {subtitle}
            </motion.div>
          )}

          {/* Badge (alternative to subtitle) */}
          {!subtitle && badge && (
            <motion.div variants={staggerItem} className="mb-6 inline-block">
              <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium">
                {badge}
              </span>
            </motion.div>
          )}

          {/* Title */}
          <motion.h1
            variants={staggerItem}
            className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
          >
            {title}
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={staggerItem}
            className="mb-10 text-lg text-muted-foreground"
          >
            {description}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={staggerItem}
            className="flex flex-col gap-4 sm:flex-row sm:justify-center"
          >
            <Button asChild size="lg">
              <a href={primaryCta.href}>{primaryCta.text}</a>
            </Button>
            {secondaryCta && (
              <Button asChild variant="ghost" size="lg">
                <a href={secondaryCta.href}>{secondaryCta.text}</a>
              </Button>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
