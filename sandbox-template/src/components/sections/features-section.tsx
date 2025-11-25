/**
 * Features Section Component
 *
 * Displays a grid of features with icons, titles, and descriptions.
 * Includes staggered animations for a polished look.
 *
 * AI Agent Instructions:
 * - Modify the `features` array to add/remove/edit features
 * - Change icons by importing different icons from 'lucide-react'
 * - Adjust grid columns with className (currently 1-3 columns)
 * - Customize colors and styling via Tailwind classes
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

interface FeaturesSectionProps {
  badge?: string;
  title: string;
  description?: string;
  features: Feature[];
}

export function FeaturesSection({
  badge,
  title,
  description,
  features,
}: FeaturesSectionProps) {
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

        {/* Features Grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOptions}
          className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div key={index} variants={staggerItem}>
                <Card className="h-full border-2 transition-all hover:border-primary/50 hover:shadow-lg">
                  <CardContent className="p-6">
                    <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                      <Icon className="size-6 text-primary" />
                    </div>
                    <h3 className="mb-2 text-xl font-semibold">
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
