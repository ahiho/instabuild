/**
 * CtaSectionMinimal - Section Component Variant
 *
 * This is an individual variant file for better tree-shaking and smaller bundle sizes.
 * Import directly: `import { CtaSectionMinimal } from "@/components/sections/variants/cta-minimal"`
 * Or use centralized: `import { CtaSectionMinimal } from "@/components/sections"`
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
import {
  staggerContainer,
  staggerItem,
  viewportOptions,
} from '@/lib/animations';
import { ArrowRight } from 'lucide-react';

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

// VARIANT 3: MINIMAL CTA
// ============================================================================

/**
 * CtaSectionMinimal Component
 *
 * VISUAL DESCRIPTION:
 * - Clean, simple text design
 * - No gradient backgrounds
 * - Underline link style
 * - Subtle, elegant approach
 * - Lots of whitespace
 *
 * USE WHEN:
 * - You want a subtle, non-pushy CTA
 * - Building minimalist designs
 * - Audience prefers understated design
 * - Multiple CTAs on page (this won't dominate)
 * - Creating content-focused pages
 * - Blog or article pages
 *
 * DIFFERENCES FROM ORIGINAL:
 * - Layout: Simple centered text
 * - Visual: Minimal, no backgrounds
 * - Style: Underline links instead of buttons
 * - Impact: Softer, more elegant
 *
 * AI AGENT INSTRUCTIONS:
 * 1. Great for secondary CTAs
 * 2. Works well in content-heavy pages
 * 3. Use for soft conversions
 * 4. Pairs well with bold sections elsewhere
 * 5. Professional, editorial feel
 *
 * @example
 * ```tsx
 * <CtaSectionMinimal
 *   title="Want to Learn More?"
 *   description="Explore our documentation and guides"
 *   primaryCta={{ text: "Read Documentation", href: "/docs" }}
 *   secondaryCta={{ text: "Contact Us", href: "/contact" }}
 * />
 * ```
 */
export function CtaSectionMinimal({
  title,
  description,
  primaryCta,
  secondaryCta,
}: CtaBaseProps) {
  return (
    <section className="py-20 sm:py-32">
      <div className="container mx-auto px-4">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOptions}
          className="mx-auto max-w-2xl text-center"
        >
          <motion.h2
            variants={staggerItem}
            className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-6"
          >
            {title}
          </motion.h2>

          <motion.p
            variants={staggerItem}
            className="text-lg text-muted-foreground mb-10"
          >
            {description}
          </motion.p>

          <motion.div
            variants={staggerItem}
            className="flex flex-col gap-6 sm:flex-row sm:justify-center sm:gap-12"
          >
            <a
              href={primaryCta.href}
              className="group inline-flex items-center gap-2 text-lg font-semibold text-primary transition-all hover:gap-3"
            >
              {primaryCta.text}
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
            </a>
            {secondaryCta && (
              <a
                href={secondaryCta.href}
                className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
              >
                {secondaryCta.text}
              </a>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
