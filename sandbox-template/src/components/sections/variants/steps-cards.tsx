/**
 * StepsSectionCards - Section Component Variant
 *
 * This is an individual variant file for better tree-shaking and smaller bundle sizes.
 * Import directly: `import { StepsSectionCards } from "@/components/sections/variants/steps-cards"`
 * Or use centralized: `import { StepsSectionCards } from "@/components/sections"`
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
import { Card, CardContent } from '@/components/ui/card';
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

// VARIANT 3: CARDS LAYOUT
// ============================================================================

/**
 * StepsSectionCards Component
 *
 * VISUAL DESCRIPTION:
 * - Each step in a separate card
 * - Grid layout (2-3 columns)
 * - No connecting lines or special ordering
 * - Clean, simple, modular appearance
 * - Equal visual weight for all steps
 *
 * USE WHEN:
 * - Steps can be completed in any order
 * - You have 3-6 independent items
 * - Building feature lists or benefits
 * - Order doesn't matter
 * - You want a simple, clean grid
 * - Steps are more like categories than a process
 *
 * DIFFERENCES FROM ORIGINAL:
 * - Layout: Simple grid of cards
 * - Styling: Individual cards, no alternation
 * - Visual: More modular, less process-oriented
 * - Flexibility: Can be used for non-sequential info
 *
 * AI AGENT INSTRUCTIONS:
 * 1. Best for non-sequential information
 * 2. Works with 3-9 items
 * 3. Can also be used for benefits, features, or tips
 * 4. No implied order or progression
 * 5. Clean, scannable layout
 *
 * @example
 * ```tsx
 * import { Lightbulb, Target, TrendingUp } from "lucide-react";
 *
 * <StepsSectionCards
 *   badge="Our Approach"
 *   title="How We Work"
 *   steps={[
 *     { icon: Lightbulb, title: "Ideate", description: "Brainstorm solutions" },
 *     { icon: Target, title: "Execute", description: "Implement with precision" },
 *     { icon: TrendingUp, title: "Optimize", description: "Continuous improvement" },
 *   ]}
 * />
 * ```
 */
export function StepsSectionCards({
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

        {/* Cards Grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOptions}
          className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
        >
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div key={index} variants={staggerItem}>
                <Card className="h-full border-2 transition-all hover:border-primary/50 hover:shadow-lg">
                  <CardContent className="p-6">
                    {/* Icon and Number */}
                    <div className="relative mb-4 inline-flex">
                      <div className="flex size-16 items-center justify-center rounded-xl bg-primary/10">
                        <Icon className="size-8 text-primary" />
                      </div>
                      <div className="absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-md">
                        {index + 1}
                      </div>
                    </div>

                    {/* Content */}
                    <h3 className="mb-2 text-xl font-semibold">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
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
