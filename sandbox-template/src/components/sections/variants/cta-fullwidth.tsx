/**
 * CtaSectionFullWidth - Section Component Variant
 *
 * This is an individual variant file for better tree-shaking and smaller bundle sizes.
 * Import directly: `import { CtaSectionFullWidth } from "@/components/sections/variants/cta-fullwidth"`
 * Or use centralized: `import { CtaSectionFullWidth } from "@/components/sections"`
 */

/**
 * CTA (Call-to-Action) Section Component Variants
 *
 * This file contains alternate styling and layout variants for the CTA Section component.
 * Different ways to create compelling calls-to-action for your landing pages.
 *
 * VARIANTS INCLUDED:
 * 1. CtaSectionFullWidth - Edge-to-edge banner design
 * 2. CtaSectionSplit - Image on one side, CTA on other
 * 3. CtaSectionMinimal - Simple text with underline link
 *
 * AI AGENT INSTRUCTIONS:
 * - Import the variant you need: `import { CtaSectionFullWidth } from "@/components/sections/variants/cta-variants"`
 * - Or use the centralized export: `import { CtaSectionFullWidth } from "@/components/sections"`
 * - Choose based on desired visual impact and page design
 * - CTAs are conversion-critical - test different variants
 */

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  staggerContainer,
  staggerItem,
  viewportOptions,
} from '@/lib/animations';
import { ArrowRight, Sparkles } from 'lucide-react';

interface CtaBaseProps {
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

// VARIANT 1: FULL WIDTH BANNER
// ============================================================================

/**
 * CtaSectionFullWidth Component
 *
 * VISUAL DESCRIPTION:
 * - Full-width edge-to-edge design
 * - No rounded corners or container
 * - Bold, attention-grabbing banner
 * - High visual impact
 * - Modern, contemporary style
 *
 * USE WHEN:
 * - You want maximum visual impact
 * - Building bold, modern landing pages
 * - Final CTA at bottom of page
 * - You want to break out of container constraints
 * - Creating campaign or promotional pages
 *
 * DIFFERENCES FROM ORIGINAL:
 * - Layout: Full width, no rounded corners
 * - Visual: More dramatic, banner-style
 * - Impact: Higher visual presence
 * - Design: Contemporary, bold
 *
 * AI AGENT INSTRUCTIONS:
 * 1. Takes full viewport width
 * 2. No container padding on sides
 * 3. Great for bottom-of-page CTAs
 * 4. Consider page flow when using
 * 5. Works well with dark backgrounds
 *
 * @example
 * ```tsx
 * <CtaSectionFullWidth
 *   title="Ready to Get Started?"
 *   description="Join thousands of happy customers today"
 *   primaryCta={{ text: "Start Free Trial", href: "/signup" }}
 *   secondaryCta={{ text: "Contact Sales", href: "/contact" }}
 * />
 * ```
 */
export function CtaSectionFullWidth({
  title,
  description,
  primaryCta,
  secondaryCta,
}: CtaBaseProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/80 py-20 sm:py-32">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/2 blur-3xl opacity-30">
          <div className="aspect-square w-[40rem] rounded-full bg-white" />
        </div>
        <div className="absolute left-0 bottom-0 translate-y-1/2 -translate-x-1/2 blur-3xl opacity-30">
          <div className="aspect-square w-[40rem] rounded-full bg-white" />
        </div>
      </div>

      <div className="container mx-auto px-4">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOptions}
          className="relative mx-auto max-w-4xl text-center"
        >
          <motion.div
            variants={staggerItem}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-primary-foreground mb-6"
          >
            <Sparkles className="size-4" />
            <span>Limited Time Offer</span>
          </motion.div>

          <motion.h2
            variants={staggerItem}
            className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-5xl lg:text-6xl mb-6"
          >
            {title}
          </motion.h2>

          <motion.p
            variants={staggerItem}
            className="text-xl text-primary-foreground/90 mb-10 max-w-2xl mx-auto"
          >
            {description}
          </motion.p>

          <motion.div
            variants={staggerItem}
            className="flex flex-col gap-4 sm:flex-row sm:justify-center"
          >
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="text-base h-14 px-8"
            >
              <a href={primaryCta.href}>
                {primaryCta.text}
                <ArrowRight className="ml-2 size-5" />
              </a>
            </Button>
            {secondaryCta && (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="text-base h-14 px-8 border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              >
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
