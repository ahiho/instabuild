/**
 * Hero Section Component
 *
 * A customizable hero section with title, description, CTA buttons, and optional image.
 * Includes scroll-triggered animations using Framer Motion.
 *
 * AI Agent Instructions:
 * - Modify `title`, `description`, and button text/links as needed
 * - Replace `image` prop with actual image URL or component
 * - Adjust animation variants from `animations.ts` for different effects
 * - Add/remove buttons by modifying the Button elements
 */

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  staggerContainer,
  staggerItem,
  transitions,
  viewportOptions,
} from '@/lib/animations';
import { ArrowRight, Play } from 'lucide-react';

interface HeroSectionProps {
  badge?: string;
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
  image?: string;
}

export function HeroSection({
  badge = 'New Release',
  title,
  description,
  primaryCta,
  secondaryCta,
  image,
}: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background to-secondary/20 py-20 sm:py-32">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 blur-3xl opacity-20">
          <div className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-primary to-accent" />
        </div>
      </div>

      <div className="container mx-auto px-4">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOptions}
          className="mx-auto max-w-4xl text-center"
        >
          {/* Badge */}
          <motion.div variants={staggerItem} className="mb-8 inline-block">
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              {badge}
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={staggerItem}
            className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
          >
            {title}
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={staggerItem}
            className="mb-10 text-lg text-muted-foreground sm:text-xl"
          >
            {description}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={staggerItem}
            className="flex flex-col gap-4 sm:flex-row sm:justify-center"
          >
            <Button asChild size="lg" className="text-base">
              <a href={primaryCta.href}>
                {primaryCta.text}
                <ArrowRight className="ml-2 size-4" />
              </a>
            </Button>
            {secondaryCta && (
              <Button asChild variant="outline" size="lg" className="text-base">
                <a href={secondaryCta.href}>
                  <Play className="mr-2 size-4" />
                  {secondaryCta.text}
                </a>
              </Button>
            )}
          </motion.div>
        </motion.div>

        {/* Hero Image */}
        {image && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOptions}
            transition={transitions.smooth}
            className="mt-16 sm:mt-24"
          >
            <div className="relative rounded-xl border bg-card shadow-2xl">
              <img src={image} alt="Hero" className="w-full rounded-xl" />
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
