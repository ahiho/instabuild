/**
 * FeaturesSectionIconGrid - Section Component Variant
 *
 * This is an individual variant file for better tree-shaking and smaller bundle sizes.
 * Import directly: `import { FeaturesSectionIconGrid } from "@/components/sections/variants/features-icongrid"`
 * Or use centralized: `import { FeaturesSectionIconGrid } from "@/components/sections"`
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

// VARIANT 3: ICON GRID (MINIMAL)
// ============================================================================

/**
 * FeaturesSectionIconGrid Component
 *
 * VISUAL DESCRIPTION:
 * - Minimal, clean design
 * - Large icons with titles, no descriptions
 * - No cards or borders
 * - Generous whitespace
 * - Centered text under each icon
 * - Perfect for simple feature listings
 *
 * USE WHEN:
 * - Features are self-explanatory from title alone
 * - You have many features to show (6-12+)
 * - Space is limited
 * - You want a quick, scannable overview
 * - Building comparison pages or spec sheets
 * - Minimalist design aesthetic
 * - The icons themselves are very descriptive
 *
 * DIFFERENCES FROM ORIGINAL:
 * - Layout: Same grid but no cards
 * - Styling: Minimal, no backgrounds or borders
 * - Content: No descriptions displayed (but still in props for accessibility)
 * - Visual: Icon-focused, very clean
 *
 * AI AGENT INSTRUCTIONS:
 * 1. Choose highly recognizable icons that convey meaning
 * 2. Keep titles short (1-3 words ideal)
 * 3. Works great with 6-12 features
 * 4. Descriptions are not shown but provide them anyway for context
 * 5. Consider this for "at a glance" feature lists
 * 6. Pair with a detailed features section elsewhere on the page
 *
 * @example
 * ```tsx
 * import { Zap, Shield, Rocket, Lock, Globe, Smartphone } from "lucide-react";
 *
 * <FeaturesSectionIconGrid
 *   title="Everything You Need"
 *   description="All the features to power your business"
 *   features={[
 *     { icon: Zap, title: "Fast", description: "" },
 *     { icon: Shield, title: "Secure", description: "" },
 *     { icon: Rocket, title: "Scalable", description: "" },
 *     { icon: Lock, title: "Private", description: "" },
 *     { icon: Globe, title: "Global", description: "" },
 *     { icon: Smartphone, title: "Mobile", description: "" },
 *   ]}
 * />
 * ```
 */
export function FeaturesSectionIconGrid({
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

        {/* Icon Grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOptions}
          className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                variants={staggerItem}
                className="flex flex-col items-center text-center transition-all hover:scale-105"
              >
                {/* Icon */}
                <div className="mb-4 inline-flex rounded-2xl bg-primary/10 p-5 transition-colors hover:bg-primary/20">
                  <Icon className="size-10 text-primary" />
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold">{feature.title}</h3>

                {/* Description hidden but available for screen readers */}
                <span className="sr-only">{feature.description}</span>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
