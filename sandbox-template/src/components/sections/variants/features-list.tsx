/**
 * FeaturesSectionList - Section Component Variant
 *
 * This is an individual variant file for better tree-shaking and smaller bundle sizes.
 * Import directly: `import { FeaturesSectionList } from "@/components/sections/variants/features-list"`
 * Or use centralized: `import { FeaturesSectionList } from "@/components/sections"`
 */

/**
 * Features Section Component Variants
 *
 * This file contains alternate styling and layout variants for the Features Section component.
 * Each variant offers different ways to present feature information to users.
 *
 * VARIANTS INCLUDED:
 * 1. FeaturesSectionList - Horizontal rows with large icons on left
 * 2. FeaturesSectionBento - Asymmetric bento/mosaic grid layout
 * 3. FeaturesSectionIconGrid - Minimal design, icons and titles only
 *
 * AI AGENT INSTRUCTIONS:
 * - Import the variant you need: `import { FeaturesSectionList } from "@/components/sections/variants/features-variants"`
 * - Or use the centralized export: `import { FeaturesSectionList } from "@/components/sections"`
 * - All variants use the same Feature interface from the original
 * - Check each variant's JSDoc for specific use cases and customization
 */

import { motion } from 'framer-motion';
import {
  staggerContainer,
  staggerItem,
  viewportOptions,
} from '@/lib/animations';
import type { LucideIcon } from 'lucide-react';

export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface FeaturesBaseProps {
  badge?: string;
  title: string;
  description?: string;
  features: Feature[];
}

// VARIANT 1: LIST LAYOUT
// ============================================================================

/**
 * FeaturesSectionList Component
 *
 * VISUAL DESCRIPTION:
 * - Horizontal rows instead of grid
 * - Large icon on the left side
 * - Text content (title and description) on the right
 * - No cards - clean, open layout
 * - More whitespace between items
 *
 * USE WHEN:
 * - You have 3-5 features to highlight
 * - Feature descriptions are longer and need more space
 * - You want a clean, scannable layout
 * - Building documentation or information pages
 * - You prefer a more editorial, article-like presentation
 * - Mobile-first design is priority (stacks well)
 *
 * DIFFERENCES FROM ORIGINAL:
 * - Layout: Horizontal rows instead of grid
 * - Styling: No cards, open layout with dividers
 * - Visual: Larger icons, more prominent
 * - Spacing: More generous vertical spacing
 *
 * AI AGENT INSTRUCTIONS:
 * 1. Best with 3-6 features (more can feel too long)
 * 2. Icon size is larger - choose icons that work well at this size
 * 3. Works great for step-by-step processes
 * 4. Consider using different colored icons for variety
 * 5. Descriptions can be longer since there's more horizontal space
 *
 * @example
 * ```tsx
 * import { Zap, Shield, Rocket } from "lucide-react";
 *
 * <FeaturesSectionList
 *   badge="Features"
 *   title="Why Choose Us"
 *   description="Everything you need to succeed"
 *   features={[
 *     {
 *       icon: Zap,
 *       title: "Lightning Fast",
 *       description: "Optimized for speed with best-in-class performance metrics.",
 *     },
 *     // ... more features
 *   ]}
 * />
 * ```
 */
export function FeaturesSectionList({
  badge,
  title,
  description,
  features,
}: FeaturesBaseProps) {
  return (
    <section className="py-20 sm:py-32">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOptions}
          className="mx-auto max-w-2xl text-center mb-16"
        >
          {badge && (
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-4">
              {badge}
            </span>
          )}
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">
            {title}
          </h2>
          {description && (
            <p className="text-lg text-muted-foreground">{description}</p>
          )}
        </motion.div>

        {/* Features List */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOptions}
          className="mx-auto max-w-4xl space-y-12"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                variants={staggerItem}
                className="flex flex-col sm:flex-row gap-6 items-start pb-12 border-b last:border-b-0 last:pb-0"
              >
                {/* Icon */}
                <div className="flex-shrink-0">
                  <div className="inline-flex rounded-xl bg-primary/10 p-4">
                    <Icon className="size-8 text-primary" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-lg text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
