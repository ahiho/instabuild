/**
 * FaqSectionTwoColumn - Section Component Variant
 *
 * This is an individual variant file for better tree-shaking and smaller bundle sizes.
 * Import directly: `import { FaqSectionTwoColumn } from "@/components/sections/variants/faq-twocolumn"`
 * Or use centralized: `import { FaqSectionTwoColumn } from "@/components/sections"`
 */

/**
 * FAQ Section Component Variants
 *
 * This file contains alternate styling and layout variants for the FAQ Section component.
 * Different ways to present frequently asked questions to users.
 *
 * VARIANTS INCLUDED:
 * 1. FaqSectionTwoColumn - Questions split into two columns
 * 2. FaqSectionCategorized - Tabs for different FAQ categories
 * 3. FaqSectionSearchable - Search bar with filterable questions
 *
 * AI AGENT INSTRUCTIONS:
 * - Import the variant you need: `import { FaqSectionTwoColumn } from "@/components/sections/variants/faq-variants"`
 * - Or use the centralized export: `import { FaqSectionTwoColumn } from "@/components/sections"`
 * - All variants use the Faq interface
 * - Choose based on number of FAQs and organization needs
 */

import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { fadeInUp, viewportOptions } from '@/lib/animations';

export interface Faq {
  question: string;
  answer: string;
}

interface FaqBaseProps {
  badge?: string;
  title: string;
  description?: string;
  faqs: Faq[];
}

// VARIANT 1: TWO COLUMN LAYOUT
// ============================================================================

/**
 * FaqSectionTwoColumn Component
 *
 * VISUAL DESCRIPTION:
 * - Questions split into two side-by-side columns
 * - More compact, fits more FAQs on screen
 * - Grid layout that stacks on mobile
 * - Clean, scannable presentation
 * - Space-efficient design
 *
 * USE WHEN:
 * - You have 6-12 FAQs
 * - Desktop space utilization is important
 * - Questions/answers are relatively short
 * - You want users to scan multiple questions quickly
 * - Building comprehensive help sections
 *
 * DIFFERENCES FROM ORIGINAL:
 * - Layout: Two columns instead of single column
 * - Visual: More compact, fits more content
 * - Responsive: Stacks to single column on mobile
 * - Density: Higher information density
 *
 * AI AGENT INSTRUCTIONS:
 * 1. Best with 6-12 FAQs (3-6 per column)
 * 2. Keep answers concise for better scanning
 * 3. Automatically splits FAQs evenly
 * 4. Responsive - single column on mobile
 * 5. Great for comprehensive FAQ pages
 *
 * @example
 * ```tsx
 * <FaqSectionTwoColumn
 *   badge="FAQ"
 *   title="Frequently Asked Questions"
 *   faqs={[
 *     { question: "What is this?", answer: "This is a product..." },
 *     { question: "How much?", answer: "Pricing starts at..." },
 *     // ... 6-12 total FAQs work best
 *   ]}
 * />
 * ```
 */
export function FaqSectionTwoColumn({
  badge,
  title,
  description,
  faqs,
}: FaqBaseProps) {
  const midpoint = Math.ceil(faqs.length / 2);
  const leftColumn = faqs.slice(0, midpoint);
  const rightColumn = faqs.slice(midpoint);

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

        {/* Two Column FAQ Grid */}
        <div className="mx-auto max-w-6xl grid gap-6 lg:grid-cols-2">
          {/* Left Column */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOptions}
          >
            <Accordion type="single" collapsible className="space-y-4">
              {leftColumn.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`left-${index}`}
                  className="border rounded-lg px-6 bg-card"
                >
                  <AccordionTrigger className="text-left hover:no-underline py-4">
                    <span className="font-semibold">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>

          {/* Right Column */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOptions}
            transition={{ delay: 0.1 }}
          >
            <Accordion type="single" collapsible className="space-y-4">
              {rightColumn.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`right-${index}`}
                  className="border rounded-lg px-6 bg-card"
                >
                  <AccordionTrigger className="text-left hover:no-underline py-4">
                    <span className="font-semibold">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
