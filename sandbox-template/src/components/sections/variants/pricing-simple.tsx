/**
 * PricingSectionSimple - Section Component Variant
 *
 * This is an individual variant file for better tree-shaking and smaller bundle sizes.
 * Import directly: `import { PricingSectionSimple } from "@/components/sections/variants/pricing-simple"`
 * Or use centralized: `import { PricingSectionSimple } from "@/components/sections"`
 */

/**
 * Pricing Section Component Variants
 *
 * This file contains alternate styling and layout variants for the Pricing Section component.
 * Different ways to present pricing tiers and plans to potential customers.
 *
 * VARIANTS INCLUDED:
 * 1. PricingSectionToggle - Monthly/yearly toggle with pricing switch
 * 2. PricingSectionTable - Comparison table format with all features visible
 * 3. PricingSectionSimple - Single column, stacked pricing cards
 *
 * AI AGENT INSTRUCTIONS:
 * - Import the variant you need: `import { PricingSectionToggle } from "@/components/sections/variants/pricing-variants"`
 * - Or use the centralized export: `import { PricingSectionToggle } from "@/components/sections"`
 * - Choose based on complexity of pricing and number of tiers
 * - Table variant works best for detailed feature comparisons
 */

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  staggerContainer,
  staggerItem,
  viewportOptions,
} from '@/lib/animations';
import { Check } from 'lucide-react';

export interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: {
    text: string;
    href: string;
  };
  popular?: boolean;
}

interface PricingBaseProps {
  badge?: string;
  title: string;
  description?: string;
  pricingTiers: PricingTier[];
}

// VARIANT 3: SIMPLE STACKED
// ============================================================================

/**
 * PricingSectionSimple Component
 *
 * VISUAL DESCRIPTION:
 * - Single column layout
 * - Cards stacked vertically
 * - Full-width presentation
 * - Clean, scannable design
 * - Mobile-first optimized
 *
 * USE WHEN:
 * - You have 2-3 pricing tiers
 * - Mobile users are primary audience
 * - You want maximum readability
 * - Space constraints don't allow horizontal layout
 * - Simpler product with fewer options
 * - Progressive disclosure preferred
 *
 * DIFFERENCES FROM ORIGINAL:
 * - Layout: Single column instead of grid
 * - Visual: Vertical stack, easier scrolling
 * - Mobile: Already optimized
 * - Simplicity: One tier at a time focus
 *
 * AI AGENT INSTRUCTIONS:
 * 1. Best with 2-4 pricing tiers
 * 2. Each tier gets full attention
 * 3. Easy to scan on mobile
 * 4. Consider for mobile-first products
 * 5. Great for simple pricing structures
 *
 * @example
 * ```tsx
 * <PricingSectionSimple
 *   title="Simple Pricing"
 *   pricingTiers={[
 *     {
 *       name: "Starter",
 *       price: "$10",
 *       period: "month",
 *       description: "Perfect for getting started",
 *       features: ["Feature 1", "Feature 2"],
 *       cta: { text: "Start Free", href: "/signup" },
 *     },
 *   ]}
 * />
 * ```
 */
export function PricingSectionSimple({
  badge,
  title,
  description,
  pricingTiers,
}: PricingBaseProps) {
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

        {/* Pricing Cards - Stacked */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOptions}
          className="mx-auto max-w-2xl space-y-6"
        >
          {pricingTiers.map((tier, index) => (
            <motion.div key={index} variants={staggerItem}>
              <Card
                className={`relative border-2 transition-all hover:shadow-lg ${
                  tier.popular
                    ? 'border-primary shadow-xl'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-6">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardContent className="p-8">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-6">
                    <div>
                      <h3 className="text-2xl font-bold mb-1">{tier.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {tier.description}
                      </p>
                    </div>
                    <div className="text-center sm:text-right">
                      <div className="text-4xl font-bold">{tier.price}</div>
                      {tier.period && (
                        <div className="text-sm text-muted-foreground">
                          /{tier.period}
                        </div>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <Check className="size-5 shrink-0 text-primary mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    className="w-full"
                    variant={tier.popular ? 'default' : 'outline'}
                    size="lg"
                  >
                    <a href={tier.cta.href}>{tier.cta.text}</a>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
