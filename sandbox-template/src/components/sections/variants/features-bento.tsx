/**
 * FeaturesSectionBento - Section Component Variant
 *
 * This is an individual variant file for better tree-shaking and smaller bundle sizes.
 * Import directly: `import { FeaturesSectionBento } from "@/components/sections/variants/features-bento"`
 * Or use centralized: `import { FeaturesSectionBento } from "@/components/sections"`
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
import { Card, CardContent } from '@/components/ui/card';
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

// VARIANT 2: BENTO GRID LAYOUT
// ============================================================================

interface FeaturesSectionBentoProps extends FeaturesBaseProps {
  featuredIndex?: number;
}

/**
 * FeaturesSectionBento Component
 *
 * VISUAL DESCRIPTION:
 * - Asymmetric bento/mosaic grid layout
 * - One featured item takes 2x space (spans 2 columns)
 * - Modern, Pinterest-style arrangement
 * - Cards with varied sizes create visual interest
 * - Sophisticated, contemporary design
 *
 * USE WHEN:
 * - You want a modern, trendy layout
 * - You have 4-6 features to showcase
 * - One feature is more important (featured)
 * - Building SaaS product pages
 * - You want a distinctive, memorable design
 * - Target audience appreciates modern design trends
 *
 * DIFFERENCES FROM ORIGINAL:
 * - Layout: Asymmetric grid with variable sizes
 * - Styling: Featured card is larger and more prominent
 * - Props: Additional featuredIndex prop (default: 0)
 * - Visual: More dynamic, less uniform
 *
 * AI AGENT INSTRUCTIONS:
 * 1. Set featuredIndex to highlight your most important feature
 * 2. Works best with 4-6 features (first one featured by default)
 * 3. Featured card spans 2 columns on desktop
 * 4. Grid automatically adjusts for mobile
 * 5. Consider using a stronger description for the featured item
 *
 * @example
 * ```tsx
 * import { Zap, Shield, Rocket, Star, Award, Target } from "lucide-react";
 *
 * <FeaturesSectionBento
 *   badge="Features"
 *   title="Powerful Capabilities"
 *   featuredIndex={0}
 *   features={[
 *     {
 *       icon: Zap,
 *       title: "Lightning Speed",
 *       description: "Ultra-fast performance that scales with your needs.",
 *     },
 *     // ... more features (5-6 total recommended)
 *   ]}
 * />
 * ```
 */
export function FeaturesSectionBento({
  badge,
  title,
  description,
  features,
  featuredIndex = 0,
}: FeaturesSectionBentoProps) {
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

        {/* Bento Grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOptions}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 auto-rows-fr"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isFeatured = index === featuredIndex;

            return (
              <motion.div
                key={index}
                variants={staggerItem}
                className={`${
                  isFeatured
                    ? 'sm:col-span-2 lg:col-span-2'
                    : 'sm:col-span-1 lg:col-span-1'
                }`}
              >
                <Card
                  className={`h-full border-2 transition-all hover:border-primary/50 hover:shadow-lg ${
                    isFeatured ? 'bg-primary/5' : ''
                  }`}
                >
                  <CardContent className={isFeatured ? 'p-8' : 'p-6'}>
                    <div
                      className={`mb-4 inline-flex rounded-lg bg-primary/10 ${
                        isFeatured ? 'p-4' : 'p-3'
                      }`}
                    >
                      <Icon
                        className={`text-primary ${
                          isFeatured ? 'size-8' : 'size-6'
                        }`}
                      />
                    </div>
                    <h3
                      className={`mb-2 font-semibold ${
                        isFeatured ? 'text-2xl' : 'text-xl'
                      }`}
                    >
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
