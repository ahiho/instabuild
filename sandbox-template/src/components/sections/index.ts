/**
 * Section Components Index
 *
 * Centralized exports for all landing page sections and their variants.
 * Import sections using: import { HeroSection, FeaturesSection } from "@/components/sections"
 * Import variants using: import { HeroSectionSplit, NavbarTransparent } from "@/components/sections"
 */

// ============================================================================
// ORIGINAL SECTION COMPONENTS
// ============================================================================

export { Navbar } from './navbar';
export { HeroSection } from './hero-section';
export { FeaturesSection } from './features-section';
export { StepsSection } from './steps-section';
export { TestimonialsSection } from './testimonials-section';
export { PricingSection } from './pricing-section';
export { FaqSection } from './faq-section';
export { CtaSection } from './cta-section';
export { Footer } from './footer';

// ============================================================================
// SECTION COMPONENT VARIANTS
// ============================================================================

// Navbar Variants (3)
export { NavbarTransparent } from './variants/navbar-transparent';
export { NavbarCentered } from './variants/navbar-centered';
export { NavbarMegaMenu } from './variants/navbar-megamenu';

// Hero Section Variants (4)
export { HeroSectionSplit } from './variants/hero-split';
export { HeroSectionMinimal } from './variants/hero-minimal';
export { HeroSectionVideo } from './variants/hero-video';
export { HeroSectionFullScreen } from './variants/hero-fullscreen';

// Features Section Variants (3)
export { FeaturesSectionList } from './variants/features-list';
export { FeaturesSectionBento } from './variants/features-bento';
export { FeaturesSectionIconGrid } from './variants/features-icongrid';

// Steps Section Variants (3)
export { StepsSectionTimeline } from './variants/steps-timeline';
export { StepsSectionHorizontal } from './variants/steps-horizontal';
export { StepsSectionCards } from './variants/steps-cards';

// Testimonials Section Variants (3)
export { TestimonialsSectionCarousel } from './variants/testimonials-carousel';
export { TestimonialsSectionMasonry } from './variants/testimonials-masonry';
export { TestimonialsSectionQuoteWall } from './variants/testimonials-quotewall';

// Pricing Section Variants (3)
export { PricingSectionToggle } from './variants/pricing-toggle';
export { PricingSectionTable } from './variants/pricing-table';
export { PricingSectionSimple } from './variants/pricing-simple';

// FAQ Section Variants (3)
export { FaqSectionTwoColumn } from './variants/faq-twocolumn';
export { FaqSectionCategorized } from './variants/faq-categorized';
export { FaqSectionSearchable } from './variants/faq-searchable';

// CTA Section Variants (3)
export { CtaSectionFullWidth } from './variants/cta-fullwidth';
export { CtaSectionSplit } from './variants/cta-split';
export { CtaSectionMinimal } from './variants/cta-minimal';

// Footer Variants (3)
export { FooterMinimal } from './variants/footer-minimal';
export { FooterNewsletter } from './variants/footer-newsletter';
export { FooterMega } from './variants/footer-mega';

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Export types for easier usage
export type { Feature } from './features-section';
export type { Step } from './steps-section';
export type { Testimonial } from './testimonials-section';
export type { PricingTier } from './pricing-section';
export type { Faq } from './faq-section';
