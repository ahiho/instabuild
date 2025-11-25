/**
 * TestimonialsSectionQuoteWall - Section Component Variant
 *
 * This is an individual variant file for better tree-shaking and smaller bundle sizes.
 * Import directly: `import { TestimonialsSectionQuoteWall } from "@/components/sections/variants/testimonials-quotewall"`
 * Or use centralized: `import { TestimonialsSectionQuoteWall } from "@/components/sections"`
 */

/**
 * Testimonials Section Component Variants
 *
 * This file contains alternate styling and layout variants for the Testimonials Section component.
 * Different ways to showcase customer reviews and social proof.
 *
 * VARIANTS INCLUDED:
 * 1. TestimonialsSectionCarousel - Single large rotating testimonial
 * 2. TestimonialsSectionMasonry - Variable height masonry grid
 * 3. TestimonialsSectionQuoteWall - Minimal quote wall without cards
 *
 * AI AGENT INSTRUCTIONS:
 * - Import the variant you need: `import { TestimonialsSectionCarousel } from "@/components/sections/variants/testimonials-variants"`
 * - Or use the centralized export: `import { TestimonialsSectionCarousel } from "@/components/sections"`
 * - All variants use the same Testimonial interface
 * - Choose based on the number of testimonials and desired emphasis
 */

import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  staggerContainer,
  staggerItem,
  viewportOptions,
} from '@/lib/animations';
import { Quote } from 'lucide-react';

export interface Testimonial {
  name: string;
  role: string;
  company: string;
  avatar?: string;
  rating: number;
  content: string;
}

interface TestimonialsBaseProps {
  badge?: string;
  title: string;
  description?: string;
  testimonials: Testimonial[];
}

// VARIANT 3: QUOTE WALL
// ============================================================================

/**
 * TestimonialsSectionQuoteWall Component
 *
 * VISUAL DESCRIPTION:
 * - Minimal design without cards
 * - Large quote marks
 * - Small avatars
 * - Clean, editorial style
 * - Lots of whitespace
 * - Text-focused presentation
 *
 * USE WHEN:
 * - You want a minimalist aesthetic
 * - Testimonials are concise and impactful
 * - Building editorial or blog-style pages
 * - You have 3-6 powerful short quotes
 * - Clean design is priority
 * - Less is more approach
 *
 * DIFFERENCES FROM ORIGINAL:
 * - Layout: No cards, open layout
 * - Styling: Minimal, text-focused
 * - Visual: Large quotes, small attribution
 * - Design: Editorial, magazine-style
 *
 * AI AGENT INSTRUCTIONS:
 * 1. Best with 3-6 short, impactful quotes
 * 2. Keep testimonials brief (1-2 sentences)
 * 3. No ratings shown (add if needed)
 * 4. Very clean, readable layout
 * 5. Perfect for  minimalist brands
 *
 * @example
 * ```tsx
 * <TestimonialsSectionQuoteWall
 *   title="Hear From Our Users"
 *   testimonials={[
 *     {
 *       name: "Jane Smith",
 *       role: "Product Manager",
 *       company: "StartupXYZ",
 *       rating: 5,
 *       content: "Best tool we've ever used. Period.",
 *     },
 *   ]}
 * />
 * ```
 */
export function TestimonialsSectionQuoteWall({
  badge,
  title,
  description,
  testimonials,
}: TestimonialsBaseProps) {
  return (
    <section className="py-20 sm:py-32 bg-secondary/20">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOptions}
          className="mx-auto max-w-2xl text-center mb-20"
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

        {/* Quote Wall */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOptions}
          className="mx-auto max-w-6xl grid gap-16 sm:grid-cols-2 lg:grid-cols-3"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={staggerItem}
              className="text-center"
            >
              {/* Quote Icon */}
              <Quote className="size-10 text-primary/30 mx-auto mb-6" />

              {/* Content */}
              <blockquote className="mb-6 text-lg font-medium">
                "{testimonial.content}"
              </blockquote>

              {/* Author */}
              <div className="flex flex-col items-center gap-3">
                <Avatar className="size-12">
                  <AvatarImage
                    src={testimonial.avatar}
                    alt={testimonial.name}
                  />
                  <AvatarFallback>
                    {testimonial.name
                      .split(' ')
                      .map(n => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.role}, {testimonial.company}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
