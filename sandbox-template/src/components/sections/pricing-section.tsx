/**
 * Pricing Section Component
 *
 * Displays pricing tiers with features, pricing, and CTA buttons.
 * Includes a highlighted "popular" tier.
 *
 * AI Agent Instructions:
 * - Modify the `pricingTiers` array to add/remove/edit pricing plans
 * - Set `popular: true` on a tier to highlight it
 * - Adjust features list for each tier
 * - Customize CTA button text and links
 * - Change billing period (monthly/yearly) display
 */

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

interface PricingSectionProps {
  badge?: string;
  title: string;
  description?: string;
  pricingTiers: PricingTier[];
}

export function PricingSection({
  badge,
  title,
  description,
  pricingTiers,
}: PricingSectionProps) {
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
                    <span className="text-4xl font-bold">{tier.price}</span>
                    {tier.period && (
                      <span className="text-muted-foreground">
                        /{tier.period}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {tier.description}
                  </p>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Features List */}
                  <ul className="space-y-3">
                    {tier.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <Check className="size-5 shrink-0 text-primary mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
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
