/**
 * StepsSectionHorizontal - Section Component Variant
 *
 * This is an individual variant file for better tree-shaking and smaller bundle sizes.
 * Import directly: `import { StepsSectionHorizontal } from "@/components/sections/variants/steps-horizontal"`
 * Or use centralized: `import { StepsSectionHorizontal } from "@/components/sections"`
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

// VARIANT 2: HORIZONTAL STEPPER
// ============================================================================

/**
 * StepsSectionHorizontal Component
 *
 * VISUAL DESCRIPTION:
 * - Horizontal progress bar across page
 * - Steps arranged in a row
 * - Progress line connects steps
 * - Clean, modern stepper design
 * - Numbers and icons above the line
 *
 * USE WHEN:
 * - You have 3-4 steps (not more, gets crowded)
 * - Building multi-step forms or wizards
 * - You want a progress indicator feel
 * - Space is limited vertically
 * - Desktop experience is priority
 * - Creating checkout or signup flows
 *
 * DIFFERENCES FROM ORIGINAL:
 * - Layout: Horizontal instead of vertical/alternating
 * - Styling: Progress bar instead of individual containers
 * - Visual: More compact, fits in less vertical space
 * - Responsive: Stacks vertically on mobile
 *
 * AI AGENT INSTRUCTIONS:
 * 1. ONLY use with 3-4 steps (5 max)
 * 2. Keep titles short (2-4 words)
 * 3. Descriptions can be longer, appear below
 * 4. Automatically stacks on mobile
 * 5. Perfect for form wizards and progress indicators
 *
 * @example
 * ```tsx
 * import { User, CreditCard, Check } from "lucide-react";
 *
 * <StepsSectionHorizontal
 *   title="Simple Process"
 *   steps={[
 *     { icon: User, title: "Sign Up", description: "Create your account" },
 *     { icon: CreditCard, title: "Subscribe", description: "Choose a plan" },
 *     { icon: Check, title: "Start", description: "Begin using the platform" },
 *   ]}
 * />
 * ```
 */
export function StepsSectionHorizontal({
  badge,
  title,
  description,
  steps,
}: StepsBaseProps) {
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

        {/* Horizontal Stepper */}
        <div className="mx-auto max-w-5xl">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOptions}
            className="relative"
          >
            {/* Progress Line - Desktop Only */}
            <div className="hidden md:block absolute top-10 left-0 right-0 h-0.5 bg-primary/20">
              <motion.div
                initial={{ width: '0%' }}
                whileInView={{ width: '100%' }}
                viewport={viewportOptions}
                transition={{ duration: 1.5, delay: 0.5 }}
                className="h-full bg-primary"
              />
            </div>

            {/* Steps */}
            <div className="grid gap-8 md:grid-cols-3 lg:grid-cols-4 relative">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={index}
                    variants={staggerItem}
                    className="flex flex-col items-center text-center"
                  >
                    {/* Icon and Number */}
                    <div className="relative mb-6 z-10">
                      <div className="flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                        <Icon className="size-10" />
                      </div>
                      <div className="absolute -right-2 -top-2 flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground font-bold text-sm shadow-md">
                        {index + 1}
                      </div>
                    </div>

                    {/* Content */}
                    <h3 className="mb-2 text-lg font-bold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
