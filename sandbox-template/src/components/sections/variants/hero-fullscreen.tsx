/**
 * HeroSectionFullScreen - Section Component Variant
 *
 * This is an individual variant file for better tree-shaking and smaller bundle sizes.
 * Import directly: `import { HeroSectionFullScreen } from "@/components/sections/variants/hero-fullscreen"`
 * Or use centralized: `import { HeroSectionFullScreen } from "@/components/sections"`
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

// VARIANT 4: FULLSCREEN HERO
// ============================================================================

interface HeroSectionFullScreenProps extends HeroBaseProps {
  backgroundImage?: string;
  showScrollIndicator?: boolean;
}

/**
 * HeroSectionFullScreen Component
 *
 * VISUAL DESCRIPTION:
 * - Full viewport height (100vh)
 * - Centered content both vertically and horizontally
 * - Optional background image with gradient overlay
 * - Optional scroll indicator at bottom
 * - Maximum visual impact and presence
 *
 * USE WHEN:
 * - You want immediate, powerful impact
 * - First impression is critical
 * - Building portfolio or creative sites
 * - Single-page websites
 * - Product launches or campaign pages
 * - You have minimal navigation and want focus on hero
 *
 * DIFFERENCES FROM ORIGINAL:
 * - Layout: Full viewport height, perfectly centered
 * - Styling: Optional background image support
 * - Props: backgroundImage and showScrollIndicator options
 * - Features: Scroll indicator for user guidance
 * - Visual: Takes full screen real estate
 *
 * AI AGENT INSTRUCTIONS:
 * 1. This hero will take the full viewport - plan your page layout accordingly
 * 2. Use backgroundImage for visual interest (high-res, optimized)
 * 3. Enable showScrollIndicator to guide users to scroll
 * 4. Keep text concise - users should grasp message immediately
 * 5. Consider adding a NavbarTransparent above this for best effect
 * 6. Ensure good contrast with background if using backgroundImage
 *
 * @example
 * ```tsx
 * <HeroSectionFullScreen
 *   title="Welcome to the Future"
 *   description="Innovation starts here."
 *   primaryCta={{ text: "Begin Journey", href: "/start" }}
 *   secondaryCta={{ text: "Learn More", href: "#about" }}
 *   backgroundImage="/hero-bg.jpg"
 *   showScrollIndicator={true}
 * />
 * ```
 */
export function HeroSectionFullScreen({
  badge,
  title,
  description,
  primaryCta,
  secondaryCta,
  backgroundImage,
  showScrollIndicator = false,
}: HeroSectionFullScreenProps) {
  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      {backgroundImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/30" />
        </>
      )}

      {/* Background Gradient (if no image) */}
      {!backgroundImage && (
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-secondary/20">
          <div className="absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 blur-3xl opacity-20">
              <div className="aspect-square w-[80rem] bg-gradient-to-tr from-primary to-accent" />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="container relative z-10 mx-auto px-4">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOptions}
          className={`mx-auto max-w-4xl text-center ${
            backgroundImage ? 'text-white' : ''
          }`}
        >
          {/* Badge */}
          {badge && (
            <motion.div variants={staggerItem} className="mb-8 inline-block">
              <span
                className={`inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium ${
                  backgroundImage
                    ? 'border-white/30 bg-white/10 backdrop-blur-sm'
                    : 'border-primary/20 bg-primary/10 text-primary'
                }`}
              >
                {badge}
              </span>
            </motion.div>
          )}

          {/* Title */}
          <motion.h1
            variants={staggerItem}
            className="mb-6 text-5xl font-bold tracking-tight sm:text-7xl lg:text-8xl"
          >
            {title}
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={staggerItem}
            className={`mb-10 text-xl sm:text-2xl ${
              backgroundImage ? 'text-white/90' : 'text-muted-foreground'
            }`}
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
              className={`text-base ${
                backgroundImage ? 'bg-white text-black hover:bg-white/90' : ''
              }`}
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
                className={`text-base ${
                  backgroundImage
                    ? 'border-white text-white hover:bg-white/10'
                    : ''
                }`}
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

      {/* Scroll Indicator */}
      {showScrollIndicator && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div
            className={`flex flex-col items-center gap-2 ${
              backgroundImage ? 'text-white' : 'text-muted-foreground'
            }`}
          >
            <span className="text-sm font-medium">Scroll</span>
            <svg
              className="size-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
            </svg>
          </div>
        </motion.div>
      )}
    </section>
  );
}
