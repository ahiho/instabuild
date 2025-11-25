/**
 * CtaSectionSplit - Section Component Variant
 *
 * This is an individual variant file for better tree-shaking and smaller bundle sizes.
 * Import directly: `import { CtaSectionSplit } from "@/components/sections/variants/cta-split"`
 * Or use centralized: `import { CtaSectionSplit } from "@/components/sections"`
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

// VARIANT 2: SPLIT CTA
// ============================================================================

interface CtaSectionSplitProps extends CtaBaseProps {
  image?: string;
  imagePosition?: 'left' | 'right';
}

/**
 * CtaSectionSplit Component
 *
 * VISUAL DESCRIPTION:
 * - Two-column layout
 * - Image/visual on one side, CTA content on other
 * - Balanced, professional appearance
 * - Clean, structured design
 * - Visual interest from imagery
 *
 * USE WHEN:
 * - You have a strong visual to showcase
 * - Building product-focused CTAs
 * - You want a professional, corporate look
 * - Image reinforces the CTA message
 * - Creating multi-section landing pages
 *
 * DIFFERENCES FROM ORIGINAL:
 * - Layout: Split instead of centered
 * - Visual: Image adds context
 * - Props: Requires image prop
 * - Design: More balanced, less dramatic
 *
 * AI AGENT INSTRUCTIONS:
 * 1. Provide high-quality image for best results
 * 2. Use imagePosition to control layout
 * 3. Image should support CTA message
 * 4. Stacks vertically on mobile
 * 5. Great for product screenshots or hero images
 *
 * @example
 * ```tsx
 * <CtaSectionSplit
 *   title="See it in Action"
 *   description="Try our platform risk-free"
 *   primaryCta={{ text: "Start Trial", href: "/trial" }}
 *   image="/product-demo.png"
 *   imagePosition="right"
 * />
 * ```
 */
export function CtaSectionSplit({
  title,
  description,
  primaryCta,
  secondaryCta,
  image,
  imagePosition = 'right',
}: CtaSectionSplitProps) {
  const content = (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOptions}
      className="flex flex-col justify-center space-y-6"
    >
      <motion.h2
        variants={staggerItem}
        className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
      >
        {title}
      </motion.h2>

      <motion.p
        variants={staggerItem}
        className="text-xl text-muted-foreground"
      >
        {description}
      </motion.p>

      <motion.div
        variants={staggerItem}
        className="flex flex-col gap-4 sm:flex-row"
      >
        <Button asChild size="lg" className="text-base">
          <a href={primaryCta.href}>
            {primaryCta.text}
            <ArrowRight className="ml-2 size-4" />
          </a>
        </Button>
        {secondaryCta && (
          <Button asChild size="lg" variant="outline" className="text-base">
            <a href={secondaryCta.href}>{secondaryCta.text}</a>
          </Button>
        )}
      </motion.div>
    </motion.div>
  );

  const imageContent = image && (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={viewportOptions}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      <div className="relative rounded-2xl overflow-hidden shadow-2xl">
        <img src={image} alt="CTA Visual" className="w-full h-auto" />
      </div>
    </motion.div>
  );

  return (
    <section className="py-20 sm:py-32 bg-secondary/20">
      <div className="container mx-auto px-4">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {imagePosition === 'left' ? (
            <>
              {imageContent}
              {content}
            </>
          ) : (
            <>
              {content}
              {imageContent}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
