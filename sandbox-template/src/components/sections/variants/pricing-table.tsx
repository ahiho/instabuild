/**
 * PricingSectionTable - Section Component Variant
 *
 * This is an individual variant file for better tree-shaking and smaller bundle sizes.
 * Import directly: `import { PricingSectionTable } from "@/components/sections/variants/pricing-table"`
 * Or use centralized: `import { PricingSectionTable } from "@/components/sections"`
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { viewportOptions } from '@/lib/animations';
import { Check, X } from 'lucide-react';

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

// VARIANT 2: COMPARISON TABLE
// ============================================================================

interface PricingFeature {
  name: string;
  tiers: (boolean | string)[];
}

interface PricingSectionTableProps {
  badge?: string;
  title: string;
  description?: string;
  tierNames: string[];
  prices: string[];
  periods: string[];
  descriptions: string[];
  features: PricingFeature[];
  ctas: Array<{ text: string; href: string }>;
  popularTier?: number;
}

/**
 * PricingSectionTable Component
 *
 * VISUAL DESCRIPTION:
 * - Full comparison table with all features
 * - Checkmarks or text for each tier/feature combination
 * - Horizontal layout with tiers as columns
 * - Comprehensive feature comparison
 * - Professional, enterprise-style presentation
 *
 * USE WHEN:
 * - You have many features to compare (10+)
 * - Buyers need detailed feature comparison
 * - B2B or enterprise sales
 * - Complex pricing with many differentiators
 * - You want transparency in feature availability
 *
 * DIFFERENCES FROM ORIGINAL:
 * - Layout: Table format instead of cards
 * - Content: Shows all features side-by-side
 * - Visual: More data-dense, informational
 * - Use case: Complex pricing structures
 *
 * AI AGENT INSTRUCTIONS:
 * 1. Define features array with tier availability
 * 2. Use boolean (true/false) for checkmark/X
 * 3. Use string for custom values (e.g., "10 GB", "Unlimited")
 * 4. Best viewed on desktop (stacks on mobile)
 * 5. Works great for 3-4 tiers, 10-20 features
 *
 * @example
 * ```tsx
 * <PricingSectionTable
 *   title="Compare Plans"
 *   tierNames={["Basic", "Pro", "Enterprise"]}
 *   prices={["$10", "$29", "$99"]}
 *   periods={["month", "month", "month"]}
 *   descriptions={["For individuals", "For teams", "For companies"]}
 *   features={[
 *     { name: "Storage", tiers: ["5 GB", "50 GB", "Unlimited"] },
 *     { name: "Users", tiers: ["1", "10", "Unlimited"] },
 *     { name: "Support", tiers: [false, true, true] },
 *   ]}
 *   ctas={[
 *     { text: "Get Started", href: "/signup" },
 *     { text: "Get Started", href: "/signup" },
 *     { text: "Contact Sales", href: "/contact" },
 *   ]}
 *   popularTier={1}
 * />
 * ```
 */
export function PricingSectionTable({
  badge,
  title,
  description,
  tierNames,
  prices,
  periods,
  descriptions,
  features,
  ctas,
  popularTier,
}: PricingSectionTableProps) {
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

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-4 text-left w-1/3"></th>
                {tierNames.map((name, index) => (
                  <th key={index} className="p-4 text-center">
                    <div
                      className={`relative p-6 rounded-t-xl ${
                        index === popularTier
                          ? 'bg-primary/5 border-2 border-b-0 border-primary'
                          : ''
                      }`}
                    >
                      {index === popularTier && (
                        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                          Popular
                        </Badge>
                      )}
                      <div className="font-bold text-xl mb-2">{name}</div>
                      <div className="text-3xl font-bold mb-1">
                        {prices[index]}
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        /{periods[index]}
                      </div>
                      <div className="text-sm text-muted-foreground mb-4">
                        {descriptions[index]}
                      </div>
                      <Button
                        asChild
                        className="w-full"
                        variant={index === popularTier ? 'default' : 'outline'}
                      >
                        <a href={ctas[index].href}>{ctas[index].text}</a>
                      </Button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((feature, featureIndex) => (
                <tr key={featureIndex} className="border-t">
                  <td className="p-4 font-medium">{feature.name}</td>
                  {feature.tiers.map((value, tierIndex) => (
                    <td
                      key={tierIndex}
                      className={`p-4 text-center ${
                        tierIndex === popularTier
                          ? 'bg-primary/5 border-x-2 border-primary'
                          : ''
                      }`}
                    >
                      {typeof value === 'boolean' ? (
                        value ? (
                          <Check className="size-5 text-primary mx-auto" />
                        ) : (
                          <X className="size-5 text-muted mx-auto" />
                        )
                      ) : (
                        <span className="text-sm">{value}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
