/**
 * StepsSectionTimeline - Section Component Variant
 *
 * This is an individual variant file for better tree-shaking and smaller bundle sizes.
 * Import directly: `import { StepsSectionTimeline } from "@/components/sections/variants/steps-timeline"`
 * Or use centralized: `import { StepsSectionTimeline } from "@/components/sections"`
 */

/**
 * Steps Section Component Variants
 *
 * This file contains alternate styling and layout variants for the Steps Section component.
 * Perfect for "How It Works" sections with different visual presentations.
 *
 * VARIANTS INCLUDED:
 * 1. StepsSectionTimeline - Vertical timeline with connecting line
 * 2. StepsSectionHorizontal - Horizontal progress stepper
 * 3. StepsSectionCards - Each step in a card, simple grid
 *
 * AI AGENT INSTRUCTIONS:
 * - Import the variant you need: `import { StepsSectionTimeline } from "@/components/sections/variants/steps-variants"`
 * - Or use the centralized export: `import { StepsSectionTimeline } from "@/components/sections"`
 * - All variants use the same Step interface from the original
 * - Choose based on number of steps and desired visual style
 */

import { motion } from 'framer-motion';
import {
  staggerContainer,
  staggerItem,
  viewportOptions,
} from '@/lib/animations';
import type { LucideIcon } from 'lucide-react';

export interface Step {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface StepsBaseProps {
  badge?: string;
  title: string;
  description?: string;
  steps: Step[];
}

// VARIANT 1: TIMELINE LAYOUT
// ============================================================================

/**
 * StepsSectionTimeline Component
 *
 * VISUAL DESCRIPTION:
 * - Vertical timeline with connecting line
 * - Steps arranged in single column
 * - Line connects all steps visually
 * - Clean, linear progression
 * - Classic timeline aesthetic
 *
 * USE WHEN:
 * - You have 3-7 steps in a process
 * - Steps must be completed in order
 * - Building onboarding flows
 * - Explaining sequential processes
 * - You want a traditional, easy-to-follow layout
 * - Mobile-friendly design is priority
 *
 * DIFFERENCES FROM ORIGINAL:
 * - Layout: Single column with vertical line
 * - Styling: Timeline line connects steps
 * - Visual: More linear, less dynamic than alternating
 * - Mobile: Already optimized, no changes needed
 *
 * AI AGENT INSTRUCTIONS:
 * 1. Works best with 3-6 steps
 * 2. Perfect for ordered processes
 * 3. Line color matches primary theme color
 * 4. Each step has equal visual weight
 * 5. Great for onboarding, tutorials, how-to guides
 *
 * @example
 * ```tsx
 * import { UserPlus, Settings, Rocket } from "lucide-react";
 *
 * <StepsSectionTimeline
 *   badge="How It Works"
 *   title="Get Started in Minutes"
 *   description="Follow these simple steps"
 *   steps={[
 *     {
 *       icon: UserPlus,
 *       title: "Create Account",
 *       description: "Sign up with your email in seconds.",
 *     },
 *     // ... more steps
 *   ]}
 * />
 * ```
 */
export function StepsSectionTimeline({
  badge,
  title,
  description,
  steps,
}: StepsBaseProps) {
  return (
    <section className="py-20 sm:py-32 bg-secondary/30">
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

        {/* Timeline */}
        <div className="mx-auto max-w-3xl">
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-primary/20" />

            {/* Steps */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={viewportOptions}
              className="space-y-12"
            >
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={index}
                    variants={staggerItem}
                    className="relative flex gap-6"
                  >
                    {/* Step Number and Icon */}
                    <div className="relative flex-shrink-0 z-10">
                      <div className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                        <Icon className="size-8" />
                      </div>
                      <div className="absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full bg-background border-2 border-primary font-bold text-sm">
                        {index + 1}
                      </div>
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 pt-2">
                      <h3 className="mb-2 text-xl font-bold">{step.title}</h3>
                      <p className="text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
