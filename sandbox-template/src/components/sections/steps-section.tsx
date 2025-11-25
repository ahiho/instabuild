/**
 * Steps Section Component
 *
 * Displays a "How It Works" section with numbered steps.
 * Features alternating layout and connecting lines.
 *
 * AI Agent Instructions:
 * - Modify the `steps` array to add/remove/edit steps
 * - Change icons by importing different icons from 'lucide-react'
 * - Adjust layout with `alternating` prop (true for zigzag, false for linear)
 * - Customize step numbers styling via className
 */

import { motion } from 'framer-motion';
import {
  fadeInLeft,
  fadeInRight,
  viewportOptions,
  transitions,
} from '@/lib/animations';
import type { LucideIcon } from 'lucide-react';

export interface Step {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface StepsSectionProps {
  badge?: string;
  title: string;
  description?: string;
  steps: Step[];
  alternating?: boolean;
}

export function StepsSection({
  badge,
  title,
  description,
  steps,
  alternating = true,
}: StepsSectionProps) {
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

        {/* Steps */}
        <div className="mx-auto max-w-5xl space-y-16">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isEven = index % 2 === 0;
            const variant = alternating && !isEven ? fadeInRight : fadeInLeft;

            return (
              <motion.div
                key={index}
                variants={variant}
                initial="hidden"
                whileInView="visible"
                viewport={viewportOptions}
                transition={transitions.smooth}
                className={`flex flex-col gap-8 ${
                  alternating && !isEven ? 'md:flex-row-reverse' : 'md:flex-row'
                } items-center`}
              >
                {/* Step Number and Icon */}
                <div className="relative flex-shrink-0">
                  <div className="flex size-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                    <Icon className="size-12" />
                  </div>
                  <div className="absolute -right-2 -top-2 flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground font-bold shadow-md">
                    {index + 1}
                  </div>
                </div>

                {/* Step Content */}
                <div
                  className={`flex-1 ${alternating && !isEven ? 'md:text-right' : ''}`}
                >
                  <h3 className="mb-3 text-2xl font-bold">{step.title}</h3>
                  <p className="text-lg text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
