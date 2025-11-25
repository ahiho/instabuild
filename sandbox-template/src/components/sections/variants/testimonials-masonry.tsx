/**
 * TestimonialsSectionMasonry - Section Component Variant
 *
 * This is an individual variant file for better tree-shaking and smaller bundle sizes.
 * Import directly: `import { TestimonialsSectionMasonry } from "@/components/sections/variants/testimonials-masonry"`
 * Or use centralized: `import { TestimonialsSectionMasonry } from "@/components/sections"`
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
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  staggerContainer,
  staggerItem,
  viewportOptions,
} from '@/lib/animations';
import { Star } from 'lucide-react';

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

// VARIANT 2: MASONRY GRID
// ============================================================================

/**
 * TestimonialsSectionMasonry Component
 *
 * VISUAL DESCRIPTION:
 * - Pinterest-style masonry grid
 * - Variable height cards based on content length
 * - Dynamic, organic layout
 * - Visually interesting arrangement
 * - Modern, social media inspired
 *
 * USE WHEN:
 * - You have 6+ testimonials of varying lengths
 * - You want a modern, dynamic look
 * - Testimonials vary significantly in length
 * - Building social proof sections
 * - You want maximum visual interest
 * - Space is not a constraint
 *
 * DIFFERENCES FROM ORIGINAL:
 * - Layout: Masonry grid instead of uniform grid
 * - Styling: Cards adapt to content height
 * - Visual: More dynamic, less uniform
 * - Design: Pinterest/Instagram inspired
 *
 * AI AGENT INSTRUCTIONS:
 * 1. Best with 6-12+ testimonials
 * 2. Mix short and long testimonials for best effect
 * 3. Grid automatically balances heights
 * 4. Works great with varied content lengths
 * 5. Very visual, Instagram-like aesthetic
 *
 * @example
 * ```tsx
 * <TestimonialsSectionMasonry
 *   badge="Reviews"
 *   title="Loved by Thousands"
 *   testimonials={[
 *     // Mix of short and long testimonials works best
 *     { name: "Alice", role: "Designer", company: "Creative Co", rating: 5, content: "Amazing!" },
 *     { name: "Bob", role: "Developer", company: "Tech Inc", rating: 5, content: "This tool has completely revolutionized..." },
 *   ]}
 * />
 * ```
 */
export function TestimonialsSectionMasonry({
  badge,
  title,
  description,
  testimonials,
}: TestimonialsBaseProps) {
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

        {/* Masonry Grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOptions}
          className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={staggerItem}
              className="break-inside-avoid"
            >
              <Card className="border-2 transition-all hover:border-primary/50 hover:shadow-lg">
                <CardContent className="p-6">
                  {/* Rating */}
                  <div className="mb-4 flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`size-4 ${
                          i < testimonial.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'fill-muted text-muted'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Content */}
                  <blockquote className="mb-6 text-muted-foreground">
                    "{testimonial.content}"
                  </blockquote>

                  {/* Author */}
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10">
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
                      <div className="font-semibold text-sm">
                        {testimonial.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
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
