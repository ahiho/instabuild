/**
 * PricingSectionToggle - Section Component Variant
 *
 * This is an individual variant file for better tree-shaking and smaller bundle sizes.
 * Import directly: `import { PricingSectionToggle } from "@/components/sections/variants/pricing-toggle"`
 * Or use centralized: `import { PricingSectionToggle } from "@/components/sections"`
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

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  staggerContainer,
  staggerItem,
  viewportOptions,
} from '@/lib/animations';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

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

// VARIANT 1: TOGGLE PRICING (Monthly/Yearly)
// ============================================================================

interface PricingTierWithToggle extends Omit<PricingTier, 'price'> {
  monthlyPrice: string;
  yearlyPrice: string;
}

interface PricingSectionToggleProps {
  badge?: string;
  title: string;
  description?: string;
  pricingTiers: PricingTierWithToggle[];
  yearlyDiscount?: string;
}

/**
 * PricingSectionToggle Component
 *
 * VISUAL DESCRIPTION:
 * - Toggle switch between monthly and yearly pricing
 * - Prices update based on selected billing period
 * - Optional discount badge for yearly plans
 * - Interactive, modern presentation
 * - Same card layout as original
 *
 * USE WHEN:
 * - You offer both monthly and yearly billing
 * - You want to highlight annual plan savings
 * - Building SaaS pricing pages
 * - You have flexible billing options
 * - Encouraging annual commitments
 *
 * DIFFERENCES FROM ORIGINAL:
 * - Layout: Same grid but with toggle switch
 * - Features: Toggle between two pricing periods
 * - Props: Requires monthlyPrice and yearlyPrice
 * - Interaction: Users can switch pricing views
 *
 * AI AGENT INSTRUCTIONS:
 * 1. Provide both monthlyPrice and yearlyPrice for each tier
 * 2. Use yearlyDiscount prop to show savings (e.g., "Save 20%")
 * 3. Toggle is centered above pricing cards
 * 4. Prices animate smoothly when switching
 * 5. Perfect for subscription-based products
 *
 * @example
 * ```tsx
 * <PricingSectionToggle
 *   title="Choose Your Plan"
 *   yearlyDiscount="Save 20%"
 *   pricingTiers={[
 *     {
 *       name: "Pro",
 *       monthlyPrice: "$29",
 *       yearlyPrice: "$24",
 *       period: "month",
 *       description: "Perfect for professionals",
 *       features: ["Feature 1", "Feature 2"],
 *       cta: { text: "Get Started", href: "/signup" },
 *     },
 *   ]}
 * />
 * ```
 */
export function PricingSectionToggle({
  badge,
  title,
  description,
  pricingTiers,
  yearlyDiscount = 'Save 20%',
}: PricingSectionToggleProps) {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section className="py-20 sm:py-32 bg-secondary/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOptions}
          className="mx-auto max-w-2xl text-center mb-12"
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

        {/* Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span
            className={`text-sm font-medium transition-colors ${
              !isYearly ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            Monthly
          </span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              isYearly ? 'bg-primary' : 'bg-muted'
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                isYearly ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
          <span
            className={`text-sm font-medium transition-colors ${
              isYearly ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            Yearly
          </span>
          {isYearly && (
            <Badge variant="secondary" className="ml-2">
              {yearlyDiscount}
            </Badge>
          )}
        </div>

        {/* Pricing Cards */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOptions}
          className="grid gap-8 lg:grid-cols-3"
        >
          {pricingTiers.map((tier, index) => (
            <motion.div key={index} variants={staggerItem}>
              <Card
                className={`relative h-full border-2 transition-all hover:shadow-lg ${
                  tier.popular
                    ? 'border-primary shadow-xl scale-105'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-8 pt-8">
                  <CardTitle className="text-2xl mb-2">{tier.name}</CardTitle>
                  <div className="mb-2">
                    <motion.span
                      key={isYearly ? 'yearly' : 'monthly'}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-4xl font-bold"
                    >
                      {isYearly ? tier.yearlyPrice : tier.monthlyPrice}
                    </motion.span>
                    <span className="text-muted-foreground">
                      /{tier.period}
                    </span>
                    {isYearly && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Billed annually
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {tier.description}
                  </p>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
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

// ============================================================================
