/**
 * CTA (Call-to-Action) Section Component
 *
 * A prominent call-to-action section with gradient background.
 * Perfect for converting visitors at the bottom of landing pages.
 *
 * AI Agent Instructions:
 * - Modify title and description text
 * - Add/remove buttons as needed
 * - Customize gradient colors via Tailwind classes
 * - Adjust button variants (default, outline, etc.)
 */

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  staggerContainer,
  staggerItem,
  viewportOptions,
} from '@/lib/animations';
import { ArrowRight } from 'lucide-react';

interface CtaSectionProps {
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

export function CtaSection({
  title,
  description,
  primaryCta,
  secondaryCta,
}: CtaSectionProps) {
  return (
    <section className="py-20 sm:py-32">
      <div className="container mx-auto px-4">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOptions}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80 px-8 py-16 shadow-2xl sm:px-16 sm:py-24"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/2 blur-3xl opacity-30">
              <div className="aspect-square w-160 rounded-full bg-white" />
            </div>
          </div>

          <div className="relative mx-auto max-w-2xl text-center">
            <motion.h2
              variants={staggerItem}
              className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl lg:text-5xl mb-6"
            >
              {title}
            </motion.h2>

            <motion.p
              variants={staggerItem}
              className="text-lg text-primary-foreground/90 mb-10"
            >
              {description}
            </motion.p>

            <motion.div
              variants={staggerItem}
              className="flex flex-col gap-4 sm:flex-row sm:justify-center"
            >
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="text-base"
              >
                <a href={primaryCta.href}>
                  {primaryCta.text}
                  <ArrowRight className="ml-2 size-4" />
                </a>
              </Button>
              {secondaryCta && (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="text-base border-primary-foreground/20 bg-primary text-primary-foreground hover:bg-primary-foreground/10"
                >
                  <a href={secondaryCta.href}>{secondaryCta.text}</a>
                </Button>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
