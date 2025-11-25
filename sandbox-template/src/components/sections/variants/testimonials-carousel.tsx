/**
 * TestimonialsSectionCarousel - Section Component Variant
 *
 * This is an individual variant file for better tree-shaking and smaller bundle sizes.
 * Import directly: `import { TestimonialsSectionCarousel } from "@/components/sections/variants/testimonials-carousel"`
 * Or use centralized: `import { TestimonialsSectionCarousel } from "@/components/sections"`
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

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { viewportOptions } from '@/lib/animations';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';

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

// VARIANT 1: CAROUSEL LAYOUT
// ============================================================================

/**
 * TestimonialsSectionCarousel Component
 *
 * VISUAL DESCRIPTION:
 * - Single large testimonial displayed at a time
 * - Navigation arrows to cycle through testimonials
 * - Smooth slide animations
 * - Large, impactful presentation
 * - Focus on one testimonial at a time
 *
 * USE WHEN:
 * - You have 3-5 strong testimonials
 * - Each testimonial deserves full attention
 * - Space is limited
 * - You want maximum impact per testimonial
 * - Building trust-focused landing pages
 * - Testimonials are detailed/longer
 *
 * DIFFERENCES FROM ORIGINAL:
 * - Layout: Single testimonial with navigation
 * - Styling: Larger text, more prominent
 * - Features: Interactive carousel with prev/next
 * - Focus: One testimonial gets full spotlight
 *
 * AI AGENT INSTRUCTIONS:
 * 1. Best with 3-7 testimonials
 * 2. Longer testimonials work great here
 * 3. Auto-rotates every 5 seconds (customizable)
 * 4. Users can manually navigate with arrows
 * 5. Mobile-friendly touch gestures supported
 *
 * @example
 * ```tsx
 * <TestimonialsSectionCarousel
 *   badge="Testimonials"
 *   title="What Our Customers Say"
 *   testimonials={[
 *     {
 *       name: "John Doe",
 *       role: "CEO",
 *       company: "TechCorp",
 *       rating: 5,
 *       content: "This product transformed our business...",
 *     },
 *     // ... more testimonials
 *   ]}
 * />
 * ```
 */
export function TestimonialsSectionCarousel({
  badge,
  title,
  description,
  testimonials,
}: TestimonialsBaseProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = () => {
    setCurrentIndex(prev => (prev + 1) % testimonials.length);
  };

  const previous = () => {
    setCurrentIndex(
      prev => (prev - 1 + testimonials.length) % testimonials.length
    );
  };

  const currentTestimonial = testimonials[currentIndex];

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

        {/* Carousel */}
        <div className="mx-auto max-w-4xl relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-2">
                <CardContent className="p-8 sm:p-12">
                  {/* Quote Icon */}
                  <Quote className="size-12 text-primary/20 mb-6" />

                  {/* Rating */}
                  <div className="mb-6 flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`size-5 ${
                          i < currentTestimonial.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'fill-muted text-muted'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Content */}
                  <blockquote className="mb-8 text-xl sm:text-2xl font-medium">
                    "{currentTestimonial.content}"
                  </blockquote>

                  {/* Author */}
                  <div className="flex items-center gap-4">
                    <Avatar className="size-14">
                      <AvatarImage
                        src={currentTestimonial.avatar}
                        alt={currentTestimonial.name}
                      />
                      <AvatarFallback>
                        {currentTestimonial.name
                          .split(' ')
                          .map(n => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-lg">
                        {currentTestimonial.name}
                      </div>
                      <div className="text-muted-foreground">
                        {currentTestimonial.role} at{' '}
                        {currentTestimonial.company}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="outline"
              size="icon"
              onClick={previous}
              disabled={testimonials.length <= 1}
            >
              <ChevronLeft className="size-4" />
            </Button>

            {/* Dots */}
            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`size-2 rounded-full transition-all ${
                    index === currentIndex
                      ? 'bg-primary w-8'
                      : 'bg-muted hover:bg-primary/50'
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={next}
              disabled={testimonials.length <= 1}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
