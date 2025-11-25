/**
 * FaqSectionSearchable - Section Component Variant
 *
 * This is an individual variant file for better tree-shaking and smaller bundle sizes.
 * Import directly: `import { FaqSectionSearchable } from "@/components/sections/variants/faq-searchable"`
 * Or use centralized: `import { FaqSectionSearchable } from "@/components/sections"`
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

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { fadeInUp, viewportOptions } from '@/lib/animations';
import { Search } from 'lucide-react';

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

// VARIANT 3: SEARCHABLE
// ============================================================================

/**
 * FaqSectionSearchable Component
 *
 * VISUAL DESCRIPTION:
 * - Search bar to filter questions
 * - Real-time filtering as user types
 * - Shows only matching questions
 * - Clean, interactive interface
 * - Helpful for large FAQ sets
 *
 * USE WHEN:
 * - You have 10+ FAQs
 * - Users know what they're looking for
 * - Quick answers are priority
 * - Building self-service help centers
 * - You want to reduce support tickets
 *
 * DIFFERENCES FROM ORIGINAL:
 * - Layout: Search bar above FAQs
 * - Features: Real-time search filtering
 * - Interaction: Dynamic content filtering
 * - UX: Faster question discovery
 *
 * AI AGENT INSTRUCTIONS:
 * 1. Searches both questions and answers
 * 2. Case-insensitive matching
 * 3. Shows "No results" message when no matches
 * 4. Real-time filtering (no submit button)
 * 5. Great for 10+ FAQs where search helps
 *
 * @example
 * ```tsx
 * <FaqSectionSearchable
 *   badge="FAQ"
 *   title="How can we help?"
 *   faqs={[
 *     { question: "How do I reset my password?", answer: "Click forgot password..." },
 *     { question: "What payment methods do you accept?", answer: "We accept..." },
 *     // ... more FAQs
 *   ]}
 * />
 * ```
 */
export function FaqSectionSearchable({
  badge,
  title,
  description,
  faqs,
}: FaqBaseProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFaqs = faqs.filter(
    faq =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOptions}
          className="mx-auto max-w-3xl mb-12"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search frequently asked questions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-base"
            />
          </div>
        </motion.div>

        {/* FAQ Accordion */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOptions}
          className="mx-auto max-w-3xl"
        >
          {filteredFaqs.length > 0 ? (
            <Accordion type="single" collapsible className="space-y-4">
              {filteredFaqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
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
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                No results found for "{searchQuery}"
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Try searching with different keywords
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
