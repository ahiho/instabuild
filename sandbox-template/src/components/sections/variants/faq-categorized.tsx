/**
 * FaqSectionCategorized - Section Component Variant
 *
 * This is an individual variant file for better tree-shaking and smaller bundle sizes.
 * Import directly: `import { FaqSectionCategorized } from "@/components/sections/variants/faq-categorized"`
 * Or use centralized: `import { FaqSectionCategorized } from "@/components/sections"`
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fadeInUp, viewportOptions } from '@/lib/animations';

export interface Faq {
  question: string;
  answer: string;
}

// VARIANT 2: CATEGORIZED (WITH TABS)
// ============================================================================

interface FaqCategory {
  name: string;
  faqs: Faq[];
}

interface FaqSectionCategorizedProps {
  badge?: string;
  title: string;
  description?: string;
  categories: FaqCategory[];
}

/**
 * FaqSectionCategorized Component
 *
 * VISUAL DESCRIPTION:
 * - Tab interface for different FAQ categories
 * - Questions organized by topic/category
 * - Horizontal tabs to switch between categories
 * - Clean separation of concerns
 * - Professional, organized appearance
 *
 * USE WHEN:
 * - You have 15+ FAQs across multiple topics
 * - Questions naturally group into categories
 * - Building comprehensive documentation
 * - Users need to find specific types of questions
 * - Product has multiple features/areas
 *
 * DIFFERENCES FROM ORIGINAL:
 * - Layout: Tabbed interface for categories
 * - Organization: Grouped by category
 * - Props: Uses categories array instead of flat faqs
 * - Navigation: Users can filter by category
 *
 * AI AGENT INSTRUCTIONS:
 * 1. Group FAQs into 3-5 logical categories
 * 2. Each category should have 3-8 questions
 * 3. Category names should be clear and concise
 * 4. Great for complex products with many FAQs
 * 5. Helps users find relevant questions faster
 *
 * @example
 * ```tsx
 * <FaqSectionCategorized
 *   title="Help Center"
 *   categories={[
 *     {
 *       name: "General",
 *       faqs: [
 *         { question: "What is this?", answer: "This is..." },
 *       ],
 *     },
 *     {
 *       name: "Billing",
 *       faqs: [
 *         { question: "How do I pay?", answer: "You can pay..." },
 *       ],
 *     },
 *   ]}
 * />
 * ```
 */
export function FaqSectionCategorized({
  badge,
  title,
  description,
  categories,
}: FaqSectionCategorizedProps) {
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

        {/* Categorized FAQs with Tabs */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOptions}
          className="mx-auto max-w-4xl"
        >
          <Tabs defaultValue={categories[0]?.name} className="w-full">
            <TabsList className="w-full justify-start mb-8 flex-wrap h-auto">
              {categories.map(category => (
                <TabsTrigger key={category.name} value={category.name}>
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map(category => (
              <TabsContent key={category.name} value={category.name}>
                <Accordion type="single" collapsible className="space-y-4">
                  {category.faqs.map((faq, index) => (
                    <AccordionItem
                      key={index}
                      value={`${category.name}-${index}`}
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
              </TabsContent>
            ))}
          </Tabs>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
