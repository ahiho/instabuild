/**
 * Section Component Variants - Centralized Exports
 *
 * This file provides centralized exports for all section component variants.
 * Import any variant from this single location for convenience.
 *
 * Each variant is in its own file for optimal tree-shaking and minimal bundle size.
 * Only the variants you import will be included in your final bundle.
 *
 * AVAILABLE VARIANTS:
 *
 * Navbar (3 variants):
 * - NavbarTransparent - Transparent background, solid on scroll
 * - NavbarCentered - Logo centered, links on sides
 * - NavbarMegaMenu - Dropdown mega menu support
 *
 * Hero (4 variants):
 * - HeroSectionSplit - Two-column with image
 * - HeroSectionMinimal - Clean, simple design
 * - HeroSectionVideo - Background video support
 * - HeroSectionFullScreen - Full viewport height
 *
 * Features (3 variants):
 * - FeaturesSectionList - Horizontal rows layout
 * - FeaturesSectionBento - Asymmetric grid layout
 * - FeaturesSectionIconGrid - Minimal icons only
 *
 * Steps (3 variants):
 * - StepsSectionTimeline - Vertical timeline
 * - StepsSectionHorizontal - Horizontal progress bar
 * - StepsSectionCards - Card grid layout
 *
 * Testimonials (3 variants):
 * - TestimonialsSectionCarousel - Rotating carousel
 * - TestimonialsSectionMasonry - Masonry grid
 * - TestimonialsSectionQuoteWall - Minimal quotes
 *
 * Pricing (3 variants):
 * - PricingSectionToggle - Monthly/yearly toggle
 * - PricingSectionTable - Comparison table
 * - PricingSectionSimple - Stacked single column
 *
 * FAQ (3 variants):
 * - FaqSectionTwoColumn - Two-column layout
 * - FaqSectionCategorized - Tabbed categories
 * - FaqSectionSearchable - Search with filtering
 *
 * CTA (3 variants):
 * - CtaSectionFullWidth - Edge-to-edge banner
 * - CtaSectionSplit - Image and text split
 * - CtaSectionMinimal - Simple text design
 *
 * Footer (3 variants):
 * - FooterMinimal - Single row, compact
 * - FooterNewsletter - Newsletter signup featured
 * - FooterMega - Large comprehensive footer
 *
 * @example
 * ```tsx
 * // Import any variant
 * import { HeroSectionSplit, NavbarTransparent } from "@/components/sections/variants";
 *
 * // Or import from sections (after updating sections/index.ts)
 * import { HeroSectionSplit } from "@/components/sections";
 *
 * // Or import directly from specific file (best for tree-shaking)
 * import { HeroSectionSplit } from "@/components/sections/variants/hero-split";
 * ```
 */

// ============================================================================
// NAVBAR VARIANTS (3)
// ============================================================================

export { NavbarTransparent } from './navbar-transparent';
export { NavbarCentered } from './navbar-centered';
export { NavbarMegaMenu } from './navbar-megamenu';

// ============================================================================
// HERO SECTION VARIANTS (4)
// ============================================================================

export { HeroSectionSplit } from './hero-split';
export { HeroSectionMinimal } from './hero-minimal';
export { HeroSectionVideo } from './hero-video';
export { HeroSectionFullScreen } from './hero-fullscreen';

// ============================================================================
// FEATURES SECTION VARIANTS (3)
// ============================================================================

export { FeaturesSectionList } from './features-list';
export { FeaturesSectionBento } from './features-bento';
export { FeaturesSectionIconGrid } from './features-icongrid';

// ============================================================================
// STEPS SECTION VARIANTS (3)
// ============================================================================

export { StepsSectionTimeline } from './steps-timeline';
export { StepsSectionHorizontal } from './steps-horizontal';
export { StepsSectionCards } from './steps-cards';

// ============================================================================
// TESTIMONIALS SECTION VARIANTS (3)
// ============================================================================

export { TestimonialsSectionCarousel } from './testimonials-carousel';
export { TestimonialsSectionMasonry } from './testimonials-masonry';
export { TestimonialsSectionQuoteWall } from './testimonials-quotewall';

// ============================================================================
// PRICING SECTION VARIANTS (3)
// ============================================================================

export { PricingSectionToggle } from './pricing-toggle';
export { PricingSectionTable } from './pricing-table';
export { PricingSectionSimple } from './pricing-simple';

// ============================================================================
// FAQ SECTION VARIANTS (3)
// ============================================================================

export { FaqSectionTwoColumn } from './faq-twocolumn';
export { FaqSectionCategorized } from './faq-categorized';
export { FaqSectionSearchable } from './faq-searchable';

// ============================================================================
// CTA SECTION VARIANTS (3)
// ============================================================================

export { CtaSectionFullWidth } from './cta-fullwidth';
export { CtaSectionSplit } from './cta-split';
export { CtaSectionMinimal } from './cta-minimal';

// ============================================================================
// FOOTER VARIANTS (3)
// ============================================================================

export { FooterMinimal } from './footer-minimal';
export { FooterNewsletter } from './footer-newsletter';
export { FooterMega } from './footer-mega';
