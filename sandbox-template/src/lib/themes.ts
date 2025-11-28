/**
 * Theme System - Prevents AI laziness by providing diverse, ready-to-use themes
 *
 * Each theme defines:
 * - Color palette (primary, secondary, accent) in OKLch format
 * - Light and dark mode variants
 * - Component variant recommendations
 * - Animation style recommendations
 * - Name and description for AI decision-making
 */

export interface ThemeColors {
  // Base
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;

  // Interactive
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;

  // Utility
  muted: string;
  mutedForeground: string;
  destructive: string;
  border: string;
  input: string;
  ring: string;

  // Chart colors
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;

  // Sidebar
  sidebar: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
}

export interface ThemeModeColors {
  light: ThemeColors;
  dark: ThemeColors;
}

export interface ComponentRecommendations {
  navbarVariant: string;
  heroVariant: string;
  featuresVariant: string;
  stepsVariant: string;
  testimonialsVariant: string;
  pricingVariant: string;
  faqVariant: string;
  ctaVariant: string;
  footerVariant: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  category: 'saas' | 'ecommerce' | 'portfolio' | 'marketing' | 'agency' | 'startup' | 'community';
  description: string;
  style: 'minimal' | 'modern' | 'bold' | 'professional' | 'playful' | 'luxury' | 'creative';
  colors: ThemeModeColors;
  components: ComponentRecommendations;
  animationTheme: 'subtle' | 'energetic' | 'smooth' | 'playful' | 'enterprise';
  usage: string; // AI guidance on when to use this theme
}

// ===== FOUNDATIONAL THEMES =====

/**
 * MINIMAL: Clean, spacious, focus on content
 * Best for: Professional SaaS, minimalist portfolios, documentation
 */
export const themeMinimal: ThemeDefinition = {
  id: 'minimal',
  name: 'Minimal',
  category: 'saas',
  description: 'Clean, spacious design focused on content clarity',
  style: 'minimal',
  colors: {
    light: {
      background: 'oklch(0.98 0 0)',
      foreground: 'oklch(0.15 0 0)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.15 0 0)',
      popover: 'oklch(1 0 0)',
      popoverForeground: 'oklch(0.15 0 0)',
      primary: 'oklch(0.3 0.1 260)',
      primaryForeground: 'oklch(0.98 0 0)',
      secondary: 'oklch(0.92 0 0)',
      secondaryForeground: 'oklch(0.15 0 0)',
      accent: 'oklch(0.92 0 0)',
      accentForeground: 'oklch(0.15 0 0)',
      muted: 'oklch(0.92 0 0)',
      mutedForeground: 'oklch(0.5 0 0)',
      destructive: 'oklch(0.58 0.25 27)',
      border: 'oklch(0.92 0 0)',
      input: 'oklch(0.92 0 0)',
      ring: 'oklch(0.3 0.1 260)',
      chart1: 'oklch(0.5 0.15 260)',
      chart2: 'oklch(0.6 0.15 40)',
      chart3: 'oklch(0.55 0.15 180)',
      chart4: 'oklch(0.65 0.15 140)',
      chart5: 'oklch(0.7 0.15 300)',
      sidebar: 'oklch(0.98 0 0)',
      sidebarForeground: 'oklch(0.15 0 0)',
      sidebarPrimary: 'oklch(0.3 0.1 260)',
      sidebarPrimaryForeground: 'oklch(0.98 0 0)',
      sidebarAccent: 'oklch(0.92 0 0)',
      sidebarAccentForeground: 'oklch(0.15 0 0)',
      sidebarBorder: 'oklch(0.92 0 0)',
      sidebarRing: 'oklch(0.3 0.1 260)',
    },
    dark: {
      background: 'oklch(0.12 0 0)',
      foreground: 'oklch(0.95 0 0)',
      card: 'oklch(0.17 0 0)',
      cardForeground: 'oklch(0.95 0 0)',
      popover: 'oklch(0.17 0 0)',
      popoverForeground: 'oklch(0.95 0 0)',
      primary: 'oklch(0.7 0.15 260)',
      primaryForeground: 'oklch(0.12 0 0)',
      secondary: 'oklch(0.25 0 0)',
      secondaryForeground: 'oklch(0.95 0 0)',
      accent: 'oklch(0.25 0 0)',
      accentForeground: 'oklch(0.95 0 0)',
      muted: 'oklch(0.25 0 0)',
      mutedForeground: 'oklch(0.65 0 0)',
      destructive: 'oklch(0.65 0.2 25)',
      border: 'oklch(0.22 0 0)',
      input: 'oklch(0.22 0 0)',
      ring: 'oklch(0.7 0.15 260)',
      chart1: 'oklch(0.65 0.15 260)',
      chart2: 'oklch(0.72 0.15 40)',
      chart3: 'oklch(0.7 0.15 180)',
      chart4: 'oklch(0.75 0.15 140)',
      chart5: 'oklch(0.8 0.15 300)',
      sidebar: 'oklch(0.17 0 0)',
      sidebarForeground: 'oklch(0.95 0 0)',
      sidebarPrimary: 'oklch(0.65 0.15 260)',
      sidebarPrimaryForeground: 'oklch(0.95 0 0)',
      sidebarAccent: 'oklch(0.25 0 0)',
      sidebarAccentForeground: 'oklch(0.95 0 0)',
      sidebarBorder: 'oklch(0.22 0 0)',
      sidebarRing: 'oklch(0.65 0.15 260)',
    },
  },
  components: {
    navbarVariant: 'NavbarTransparent',
    heroVariant: 'HeroSectionMinimal',
    featuresVariant: 'FeaturesSectionList',
    stepsVariant: 'StepsSectionHorizontal',
    testimonialsVariant: 'TestimonialsSectionCarousel',
    pricingVariant: 'PricingSectionSimple',
    faqVariant: 'FaqSectionTwoColumn',
    ctaVariant: 'CtaSectionMinimal',
    footerVariant: 'FooterMinimal',
  },
  animationTheme: 'subtle',
  usage: 'Use for professional SaaS, B2B products, documentation, minimalist portfolios. Emphasizes content clarity and simplicity.',
};

/**
 * VIBRANT: Bold colors, energetic feel, modern appeal
 * Best for: Startups, creative agencies, modern SaaS, youthful brands
 */
export const themeVibrant: ThemeDefinition = {
  id: 'vibrant',
  name: 'Vibrant',
  category: 'startup',
  description: 'Bold, energetic colors for modern, youthful brands',
  style: 'bold',
  colors: {
    light: {
      background: 'oklch(0.98 0 0)',
      foreground: 'oklch(0.15 0 0)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.15 0 0)',
      popover: 'oklch(1 0 0)',
      popoverForeground: 'oklch(0.15 0 0)',
      primary: 'oklch(0.65 0.25 310)', // Bold purple
      primaryForeground: 'oklch(1 0 0)',
      secondary: 'oklch(0.85 0.18 30)', // Warm orange
      secondaryForeground: 'oklch(0.15 0 0)',
      accent: 'oklch(0.6 0.22 130)', // Green accent
      accentForeground: 'oklch(1 0 0)',
      muted: 'oklch(0.92 0 0)',
      mutedForeground: 'oklch(0.5 0 0)',
      destructive: 'oklch(0.58 0.25 27)',
      border: 'oklch(0.92 0 0)',
      input: 'oklch(0.92 0 0)',
      ring: 'oklch(0.65 0.25 310)',
      chart1: 'oklch(0.65 0.25 310)',
      chart2: 'oklch(0.75 0.22 20)',
      chart3: 'oklch(0.6 0.22 130)',
      chart4: 'oklch(0.7 0.2 45)',
      chart5: 'oklch(0.68 0.18 260)',
      sidebar: 'oklch(0.98 0 0)',
      sidebarForeground: 'oklch(0.15 0 0)',
      sidebarPrimary: 'oklch(0.65 0.25 310)',
      sidebarPrimaryForeground: 'oklch(1 0 0)',
      sidebarAccent: 'oklch(0.85 0.18 30)',
      sidebarAccentForeground: 'oklch(0.15 0 0)',
      sidebarBorder: 'oklch(0.92 0 0)',
      sidebarRing: 'oklch(0.65 0.25 310)',
    },
    dark: {
      background: 'oklch(0.12 0 0)',
      foreground: 'oklch(0.95 0 0)',
      card: 'oklch(0.17 0 0)',
      cardForeground: 'oklch(0.95 0 0)',
      popover: 'oklch(0.17 0 0)',
      popoverForeground: 'oklch(0.95 0 0)',
      primary: 'oklch(0.75 0.25 310)',
      primaryForeground: 'oklch(0.12 0 0)',
      secondary: 'oklch(0.92 0.2 30)',
      secondaryForeground: 'oklch(0.12 0 0)',
      accent: 'oklch(0.25 0 0)',
      accentForeground: 'oklch(0.95 0 0)',
      muted: 'oklch(0.25 0 0)',
      mutedForeground: 'oklch(0.65 0 0)',
      destructive: 'oklch(0.65 0.2 25)',
      border: 'oklch(0.22 0 0)',
      input: 'oklch(0.22 0 0)',
      ring: 'oklch(0.75 0.25 310)',
      chart1: 'oklch(0.75 0.25 310)',
      chart2: 'oklch(0.92 0.2 30)',
      chart3: 'oklch(0.72 0.22 130)',
      chart4: 'oklch(0.8 0.2 45)',
      chart5: 'oklch(0.78 0.18 260)',
      sidebar: 'oklch(0.17 0 0)',
      sidebarForeground: 'oklch(0.95 0 0)',
      sidebarPrimary: 'oklch(0.75 0.25 310)',
      sidebarPrimaryForeground: 'oklch(0.12 0 0)',
      sidebarAccent: 'oklch(0.85 0.18 30)',
      sidebarAccentForeground: 'oklch(0.12 0 0)',
      sidebarBorder: 'oklch(0.22 0 0)',
      sidebarRing: 'oklch(0.75 0.25 310)',
    },
  },
  components: {
    navbarVariant: 'NavbarCentered',
    heroVariant: 'HeroSectionFullScreen',
    featuresVariant: 'FeaturesSectionBento',
    stepsVariant: 'StepsSectionCards',
    testimonialsVariant: 'TestimonialsSectionQuoteWall',
    pricingVariant: 'PricingSectionToggle',
    faqVariant: 'FaqSectionCategorized',
    ctaVariant: 'CtaSectionFullWidth',
    footerVariant: 'FooterNewsletter',
  },
  animationTheme: 'energetic',
  usage: 'Use for startups, creative agencies, modern SaaS platforms, youthful brands. Creates energetic, memorable impressions.',
};

/**
 * LUXURY: Sophisticated, muted tones, premium feel
 * Best for: High-end brands, premium SaaS, luxury e-commerce, agency portfolios
 */
export const themeLuxury: ThemeDefinition = {
  id: 'luxury',
  name: 'Luxury',
  category: 'agency',
  description: 'Sophisticated, muted tones for premium brands',
  style: 'luxury',
  colors: {
    light: {
      background: 'oklch(0.97 0 0)',
      foreground: 'oklch(0.2 0 0)',
      card: 'oklch(0.98 0 0)',
      cardForeground: 'oklch(0.2 0 0)',
      popover: 'oklch(0.98 0 0)',
      popoverForeground: 'oklch(0.2 0 0)',
      primary: 'oklch(0.35 0.05 40)', // Warm gold/brown
      primaryForeground: 'oklch(0.97 0 0)',
      secondary: 'oklch(0.88 0.02 200)', // Soft blue
      secondaryForeground: 'oklch(0.2 0 0)',
      accent: 'oklch(0.55 0.08 30)', // Soft copper
      accentForeground: 'oklch(0.97 0 0)',
      muted: 'oklch(0.92 0 0)',
      mutedForeground: 'oklch(0.55 0 0)',
      destructive: 'oklch(0.58 0.25 27)',
      border: 'oklch(0.92 0 0)',
      input: 'oklch(0.92 0 0)',
      ring: 'oklch(0.35 0.05 40)',
      chart1: 'oklch(0.55 0.08 30)',
      chart2: 'oklch(0.45 0.06 200)',
      chart3: 'oklch(0.65 0.07 350)',
      chart4: 'oklch(0.5 0.07 120)',
      chart5: 'oklch(0.6 0.06 280)',
      sidebar: 'oklch(0.97 0 0)',
      sidebarForeground: 'oklch(0.2 0 0)',
      sidebarPrimary: 'oklch(0.35 0.05 40)',
      sidebarPrimaryForeground: 'oklch(0.97 0 0)',
      sidebarAccent: 'oklch(0.88 0.02 200)',
      sidebarAccentForeground: 'oklch(0.2 0 0)',
      sidebarBorder: 'oklch(0.92 0 0)',
      sidebarRing: 'oklch(0.35 0.05 40)',
    },
    dark: {
      background: 'oklch(0.14 0 0)',
      foreground: 'oklch(0.93 0 0)',
      card: 'oklch(0.18 0 0)',
      cardForeground: 'oklch(0.93 0 0)',
      popover: 'oklch(0.18 0 0)',
      popoverForeground: 'oklch(0.93 0 0)',
      primary: 'oklch(0.65 0.08 40)',
      primaryForeground: 'oklch(0.14 0 0)',
      secondary: 'oklch(0.5 0.04 200)',
      secondaryForeground: 'oklch(0.93 0 0)',
      accent: 'oklch(0.25 0 0)',
      accentForeground: 'oklch(0.95 0 0)',
      muted: 'oklch(0.28 0 0)',
      mutedForeground: 'oklch(0.68 0 0)',
      destructive: 'oklch(0.65 0.2 25)',
      border: 'oklch(0.22 0 0)',
      input: 'oklch(0.22 0 0)',
      ring: 'oklch(0.65 0.08 40)',
      chart1: 'oklch(0.72 0.08 30)',
      chart2: 'oklch(0.62 0.06 200)',
      chart3: 'oklch(0.78 0.07 350)',
      chart4: 'oklch(0.68 0.07 120)',
      chart5: 'oklch(0.72 0.06 280)',
      sidebar: 'oklch(0.18 0 0)',
      sidebarForeground: 'oklch(0.93 0 0)',
      sidebarPrimary: 'oklch(0.65 0.08 40)',
      sidebarPrimaryForeground: 'oklch(0.93 0 0)',
      sidebarAccent: 'oklch(0.5 0.04 200)',
      sidebarAccentForeground: 'oklch(0.93 0 0)',
      sidebarBorder: 'oklch(0.22 0 0)',
      sidebarRing: 'oklch(0.65 0.08 40)',
    },
  },
  components: {
    navbarVariant: 'NavbarTransparent',
    heroVariant: 'HeroSectionSplit',
    featuresVariant: 'FeaturesSectionList',
    stepsVariant: 'StepsSectionTimeline',
    testimonialsVariant: 'TestimonialsSectionMasonry',
    pricingVariant: 'PricingSectionTable',
    faqVariant: 'FaqSectionTwoColumn',
    ctaVariant: 'CtaSectionSplit',
    footerVariant: 'FooterMega',
  },
  animationTheme: 'smooth',
  usage: 'Use for premium brands, luxury products, high-end SaaS, agency portfolios. Creates sophisticated, refined impressions.',
};

/**
 * ECOMMERCE: Warm, inviting, conversion-focused
 * Best for: E-commerce, retail, product showcases
 */
export const themeEcommerce: ThemeDefinition = {
  id: 'ecommerce',
  name: 'E-commerce',
  category: 'ecommerce',
  description: 'Warm, inviting colors for product-focused sites',
  style: 'modern',
  colors: {
    light: {
      background: 'oklch(0.98 0 0)',
      foreground: 'oklch(0.15 0 0)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.15 0 0)',
      popover: 'oklch(1 0 0)',
      popoverForeground: 'oklch(0.15 0 0)',
      primary: 'oklch(0.6 0.2 20)', // Warm red/orange
      primaryForeground: 'oklch(1 0 0)',
      secondary: 'oklch(0.85 0.12 120)', // Soft teal
      secondaryForeground: 'oklch(0.15 0 0)',
      accent: 'oklch(0.75 0.15 40)', // Golden accent
      accentForeground: 'oklch(0.15 0 0)',
      muted: 'oklch(0.92 0 0)',
      mutedForeground: 'oklch(0.5 0 0)',
      destructive: 'oklch(0.58 0.25 27)',
      border: 'oklch(0.92 0 0)',
      input: 'oklch(0.92 0 0)',
      ring: 'oklch(0.6 0.2 20)',
      chart1: 'oklch(0.6 0.2 20)',
      chart2: 'oklch(0.75 0.15 40)',
      chart3: 'oklch(0.65 0.15 120)',
      chart4: 'oklch(0.7 0.18 10)',
      chart5: 'oklch(0.72 0.14 70)',
      sidebar: 'oklch(0.98 0 0)',
      sidebarForeground: 'oklch(0.15 0 0)',
      sidebarPrimary: 'oklch(0.6 0.2 20)',
      sidebarPrimaryForeground: 'oklch(1 0 0)',
      sidebarAccent: 'oklch(0.85 0.12 120)',
      sidebarAccentForeground: 'oklch(0.15 0 0)',
      sidebarBorder: 'oklch(0.92 0 0)',
      sidebarRing: 'oklch(0.6 0.2 20)',
    },
    dark: {
      background: 'oklch(0.12 0 0)',
      foreground: 'oklch(0.95 0 0)',
      card: 'oklch(0.17 0 0)',
      cardForeground: 'oklch(0.95 0 0)',
      popover: 'oklch(0.17 0 0)',
      popoverForeground: 'oklch(0.95 0 0)',
      primary: 'oklch(0.72 0.2 20)',
      primaryForeground: 'oklch(0.12 0 0)',
      secondary: 'oklch(0.65 0.15 120)',
      secondaryForeground: 'oklch(0.95 0 0)',
      accent: 'oklch(0.25 0 0)',
      accentForeground: 'oklch(0.95 0 0)',
      muted: 'oklch(0.25 0 0)',
      mutedForeground: 'oklch(0.65 0 0)',
      destructive: 'oklch(0.65 0.2 25)',
      border: 'oklch(0.22 0 0)',
      input: 'oklch(0.22 0 0)',
      ring: 'oklch(0.72 0.2 20)',
      chart1: 'oklch(0.72 0.2 20)',
      chart2: 'oklch(0.85 0.15 40)',
      chart3: 'oklch(0.78 0.15 120)',
      chart4: 'oklch(0.8 0.18 10)',
      chart5: 'oklch(0.82 0.14 70)',
      sidebar: 'oklch(0.17 0 0)',
      sidebarForeground: 'oklch(0.95 0 0)',
      sidebarPrimary: 'oklch(0.72 0.2 20)',
      sidebarPrimaryForeground: 'oklch(0.95 0 0)',
      sidebarAccent: 'oklch(0.65 0.15 120)',
      sidebarAccentForeground: 'oklch(0.95 0 0)',
      sidebarBorder: 'oklch(0.22 0 0)',
      sidebarRing: 'oklch(0.72 0.2 20)',
    },
  },
  components: {
    navbarVariant: 'NavbarCentered',
    heroVariant: 'HeroSectionFullScreen',
    featuresVariant: 'FeaturesSectionBento',
    stepsVariant: 'StepsSectionHorizontal',
    testimonialsVariant: 'TestimonialsSectionCarousel',
    pricingVariant: 'PricingSectionToggle',
    faqVariant: 'FaqSectionSearchable',
    ctaVariant: 'CtaSectionFullWidth',
    footerVariant: 'FooterNewsletter',
  },
  animationTheme: 'energetic',
  usage: 'Use for e-commerce, retail, product showcases, conversion-focused sites. Warm, inviting colors encourage exploration and purchases.',
};

/**
 * PORTFOLIO: Bold, creative, personality-driven
 * Best for: Creative professionals, portfolios, personal brands
 */
export const themePortfolio: ThemeDefinition = {
  id: 'portfolio',
  name: 'Portfolio',
  category: 'portfolio',
  description: 'Bold, creative design for showcasing work and personality',
  style: 'creative',
  colors: {
    light: {
      background: 'oklch(0.96 0.02 200)', // Slight blue tint
      foreground: 'oklch(0.15 0 0)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.15 0 0)',
      popover: 'oklch(1 0 0)',
      popoverForeground: 'oklch(0.15 0 0)',
      primary: 'oklch(0.55 0.2 280)', // Deep purple/magenta
      primaryForeground: 'oklch(1 0 0)',
      secondary: 'oklch(0.65 0.25 30)', // Bold orange
      secondaryForeground: 'oklch(0.15 0 0)',
      accent: 'oklch(0.7 0.18 140)', // Cyan/teal
      accentForeground: 'oklch(0.15 0 0)',
      muted: 'oklch(0.92 0 0)',
      mutedForeground: 'oklch(0.5 0 0)',
      destructive: 'oklch(0.58 0.25 27)',
      border: 'oklch(0.92 0 0)',
      input: 'oklch(0.92 0 0)',
      ring: 'oklch(0.55 0.2 280)',
      chart1: 'oklch(0.55 0.2 280)',
      chart2: 'oklch(0.65 0.25 30)',
      chart3: 'oklch(0.7 0.18 140)',
      chart4: 'oklch(0.68 0.2 350)',
      chart5: 'oklch(0.72 0.15 200)',
      sidebar: 'oklch(0.96 0.02 200)',
      sidebarForeground: 'oklch(0.15 0 0)',
      sidebarPrimary: 'oklch(0.55 0.2 280)',
      sidebarPrimaryForeground: 'oklch(1 0 0)',
      sidebarAccent: 'oklch(0.65 0.25 30)',
      sidebarAccentForeground: 'oklch(0.15 0 0)',
      sidebarBorder: 'oklch(0.92 0 0)',
      sidebarRing: 'oklch(0.55 0.2 280)',
    },
    dark: {
      background: 'oklch(0.11 0.03 240)', // Deep blue tint
      foreground: 'oklch(0.95 0 0)',
      card: 'oklch(0.16 0.02 240)',
      cardForeground: 'oklch(0.95 0 0)',
      popover: 'oklch(0.16 0.02 240)',
      popoverForeground: 'oklch(0.95 0 0)',
      primary: 'oklch(0.72 0.25 280)',
      primaryForeground: 'oklch(0.11 0.03 240)',
      secondary: 'oklch(0.78 0.25 30)',
      secondaryForeground: 'oklch(0.11 0.03 240)',
      accent: 'oklch(0.25 0 0)',
      accentForeground: 'oklch(0.95 0 0)',
      muted: 'oklch(0.25 0 0)',
      mutedForeground: 'oklch(0.65 0 0)',
      destructive: 'oklch(0.65 0.2 25)',
      border: 'oklch(0.22 0.02 240)',
      input: 'oklch(0.22 0.02 240)',
      ring: 'oklch(0.72 0.25 280)',
      chart1: 'oklch(0.72 0.25 280)',
      chart2: 'oklch(0.78 0.25 30)',
      chart3: 'oklch(0.8 0.18 140)',
      chart4: 'oklch(0.78 0.2 350)',
      chart5: 'oklch(0.82 0.15 200)',
      sidebar: 'oklch(0.16 0.02 240)',
      sidebarForeground: 'oklch(0.95 0 0)',
      sidebarPrimary: 'oklch(0.72 0.25 280)',
      sidebarPrimaryForeground: 'oklch(0.95 0 0)',
      sidebarAccent: 'oklch(0.78 0.25 30)',
      sidebarAccentForeground: 'oklch(0.95 0 0)',
      sidebarBorder: 'oklch(0.22 0.02 240)',
      sidebarRing: 'oklch(0.72 0.25 280)',
    },
  },
  components: {
    navbarVariant: 'NavbarCentered',
    heroVariant: 'HeroSectionVideo',
    featuresVariant: 'FeaturesSectionBento',
    stepsVariant: 'StepsSectionCards',
    testimonialsVariant: 'TestimonialsSectionMasonry',
    pricingVariant: 'PricingSectionSimple',
    faqVariant: 'FaqSectionTwoColumn',
    ctaVariant: 'CtaSectionMinimal',
    footerVariant: 'FooterMega',
  },
  animationTheme: 'playful',
  usage: 'Use for creative portfolios, designers, agencies, personal brands. Showcases personality and creative work through bold colors.',
};

/**
 * TECH: Modern, dark, developer-friendly
 * Best for: Developer tools, tech products, SaaS platforms
 */
export const themeTech: ThemeDefinition = {
  id: 'tech',
  name: 'Tech',
  category: 'saas',
  description: 'Modern dark theme for developer tools and tech products',
  style: 'modern',
  colors: {
    light: {
      background: 'oklch(0.97 0 0)',
      foreground: 'oklch(0.12 0 0)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.12 0 0)',
      popover: 'oklch(1 0 0)',
      popoverForeground: 'oklch(0.12 0 0)',
      primary: 'oklch(0.5 0.15 230)', // Electric blue
      primaryForeground: 'oklch(1 0 0)',
      secondary: 'oklch(0.6 0.12 180)', // Cyan
      secondaryForeground: 'oklch(0.12 0 0)',
      accent: 'oklch(0.65 0.18 140)', // Bright green
      accentForeground: 'oklch(0.12 0 0)',
      muted: 'oklch(0.92 0 0)',
      mutedForeground: 'oklch(0.5 0 0)',
      destructive: 'oklch(0.58 0.25 27)',
      border: 'oklch(0.92 0 0)',
      input: 'oklch(0.92 0 0)',
      ring: 'oklch(0.5 0.15 230)',
      chart1: 'oklch(0.5 0.15 230)',
      chart2: 'oklch(0.65 0.18 140)',
      chart3: 'oklch(0.6 0.12 180)',
      chart4: 'oklch(0.7 0.15 50)',
      chart5: 'oklch(0.72 0.2 280)',
      sidebar: 'oklch(0.97 0 0)',
      sidebarForeground: 'oklch(0.12 0 0)',
      sidebarPrimary: 'oklch(0.5 0.15 230)',
      sidebarPrimaryForeground: 'oklch(1 0 0)',
      sidebarAccent: 'oklch(0.6 0.12 180)',
      sidebarAccentForeground: 'oklch(0.12 0 0)',
      sidebarBorder: 'oklch(0.92 0 0)',
      sidebarRing: 'oklch(0.5 0.15 230)',
    },
    dark: {
      background: 'oklch(0.08 0 0)',
      foreground: 'oklch(0.92 0 0)',
      card: 'oklch(0.13 0 0)',
      cardForeground: 'oklch(0.92 0 0)',
      popover: 'oklch(0.13 0 0)',
      popoverForeground: 'oklch(0.92 0 0)',
      primary: 'oklch(0.65 0.2 230)',
      primaryForeground: 'oklch(0.08 0 0)',
      secondary: 'oklch(0.7 0.15 180)',
      secondaryForeground: 'oklch(0.08 0 0)',
      accent: 'oklch(0.25 0 0)',
      accentForeground: 'oklch(0.95 0 0)',
      muted: 'oklch(0.22 0 0)',
      mutedForeground: 'oklch(0.62 0 0)',
      destructive: 'oklch(0.65 0.2 25)',
      border: 'oklch(0.18 0 0)',
      input: 'oklch(0.18 0 0)',
      ring: 'oklch(0.65 0.2 230)',
      chart1: 'oklch(0.65 0.2 230)',
      chart2: 'oklch(0.75 0.18 140)',
      chart3: 'oklch(0.72 0.15 180)',
      chart4: 'oklch(0.8 0.15 50)',
      chart5: 'oklch(0.82 0.2 280)',
      sidebar: 'oklch(0.13 0 0)',
      sidebarForeground: 'oklch(0.92 0 0)',
      sidebarPrimary: 'oklch(0.65 0.2 230)',
      sidebarPrimaryForeground: 'oklch(0.92 0 0)',
      sidebarAccent: 'oklch(0.7 0.15 180)',
      sidebarAccentForeground: 'oklch(0.92 0 0)',
      sidebarBorder: 'oklch(0.18 0 0)',
      sidebarRing: 'oklch(0.65 0.2 230)',
    },
  },
  components: {
    navbarVariant: 'NavbarTransparent',
    heroVariant: 'HeroSectionSplit',
    featuresVariant: 'FeaturesSectionIconGrid',
    stepsVariant: 'StepsSectionHorizontal',
    testimonialsVariant: 'TestimonialsSectionCarousel',
    pricingVariant: 'PricingSectionTable',
    faqVariant: 'FaqSectionSearchable',
    ctaVariant: 'CtaSectionSplit',
    footerVariant: 'FooterMega',
  },
  animationTheme: 'smooth',
  usage: 'Use for developer tools, API products, technical SaaS. Modern dark theme with electric colors appeals to tech-savvy audiences.',
};

/**
 * B2B PROFESSIONAL: Conservative, trust-focused, corporate
 * Best for: Enterprise SaaS, B2B products, corporate sites
 */
export const themeB2B: ThemeDefinition = {
  id: 'b2b',
  name: 'B2B Professional',
  category: 'saas',
  description: 'Conservative, trust-focused design for enterprise and B2B',
  style: 'professional',
  colors: {
    light: {
      background: 'oklch(0.98 0 0)',
      foreground: 'oklch(0.18 0 0)',
      card: 'oklch(0.99 0 0)',
      cardForeground: 'oklch(0.18 0 0)',
      popover: 'oklch(0.99 0 0)',
      popoverForeground: 'oklch(0.18 0 0)',
      primary: 'oklch(0.4 0.08 240)', // Professional blue
      primaryForeground: 'oklch(0.99 0 0)',
      secondary: 'oklch(0.85 0 0)', // Light gray
      secondaryForeground: 'oklch(0.18 0 0)',
      accent: 'oklch(0.65 0.08 210)', // Subtle blue accent
      accentForeground: 'oklch(0.99 0 0)',
      muted: 'oklch(0.92 0 0)',
      mutedForeground: 'oklch(0.55 0 0)',
      destructive: 'oklch(0.58 0.25 27)',
      border: 'oklch(0.92 0 0)',
      input: 'oklch(0.92 0 0)',
      ring: 'oklch(0.4 0.08 240)',
      chart1: 'oklch(0.4 0.08 240)',
      chart2: 'oklch(0.65 0.08 210)',
      chart3: 'oklch(0.55 0.06 180)',
      chart4: 'oklch(0.5 0.07 270)',
      chart5: 'oklch(0.6 0.06 150)',
      sidebar: 'oklch(0.98 0 0)',
      sidebarForeground: 'oklch(0.18 0 0)',
      sidebarPrimary: 'oklch(0.4 0.08 240)',
      sidebarPrimaryForeground: 'oklch(0.99 0 0)',
      sidebarAccent: 'oklch(0.85 0 0)',
      sidebarAccentForeground: 'oklch(0.18 0 0)',
      sidebarBorder: 'oklch(0.92 0 0)',
      sidebarRing: 'oklch(0.4 0.08 240)',
    },
    dark: {
      background: 'oklch(0.13 0 0)',
      foreground: 'oklch(0.93 0 0)',
      card: 'oklch(0.18 0 0)',
      cardForeground: 'oklch(0.93 0 0)',
      popover: 'oklch(0.18 0 0)',
      popoverForeground: 'oklch(0.93 0 0)',
      primary: 'oklch(0.68 0.1 240)',
      primaryForeground: 'oklch(0.13 0 0)',
      secondary: 'oklch(0.3 0 0)',
      secondaryForeground: 'oklch(0.93 0 0)',
      accent: 'oklch(0.25 0 0)',
      accentForeground: 'oklch(0.95 0 0)',
      muted: 'oklch(0.26 0 0)',
      mutedForeground: 'oklch(0.68 0 0)',
      destructive: 'oklch(0.65 0.2 25)',
      border: 'oklch(0.22 0 0)',
      input: 'oklch(0.22 0 0)',
      ring: 'oklch(0.68 0.1 240)',
      chart1: 'oklch(0.68 0.1 240)',
      chart2: 'oklch(0.75 0.08 210)',
      chart3: 'oklch(0.68 0.06 180)',
      chart4: 'oklch(0.65 0.07 270)',
      chart5: 'oklch(0.75 0.06 150)',
      sidebar: 'oklch(0.18 0 0)',
      sidebarForeground: 'oklch(0.93 0 0)',
      sidebarPrimary: 'oklch(0.68 0.1 240)',
      sidebarPrimaryForeground: 'oklch(0.93 0 0)',
      sidebarAccent: 'oklch(0.3 0 0)',
      sidebarAccentForeground: 'oklch(0.93 0 0)',
      sidebarBorder: 'oklch(0.22 0 0)',
      sidebarRing: 'oklch(0.68 0.1 240)',
    },
  },
  components: {
    navbarVariant: 'NavbarTransparent',
    heroVariant: 'HeroSectionSplit',
    featuresVariant: 'FeaturesSectionList',
    stepsVariant: 'StepsSectionHorizontal',
    testimonialsVariant: 'TestimonialsSectionCarousel',
    pricingVariant: 'PricingSectionTable',
    faqVariant: 'FaqSectionTwoColumn',
    ctaVariant: 'CtaSectionSplit',
    footerVariant: 'FooterMega',
  },
  animationTheme: 'enterprise',
  usage: 'Use for enterprise SaaS, B2B products, corporate websites. Conservative blue palette builds trust and professionalism.',
};

/**
 * WELLNESS: Calming, green-heavy, health-focused
 * Best for: Health apps, fitness, wellness, meditation, beauty
 */
export const themeWellness: ThemeDefinition = {
  id: 'wellness',
  name: 'Wellness',
  category: 'community',
  description: 'Calming, natural colors for health and wellness brands',
  style: 'playful',
  colors: {
    light: {
      background: 'oklch(0.97 0.02 150)', // Slight green tint
      foreground: 'oklch(0.15 0 0)',
      card: 'oklch(0.99 0 0)',
      cardForeground: 'oklch(0.15 0 0)',
      popover: 'oklch(0.99 0 0)',
      popoverForeground: 'oklch(0.15 0 0)',
      primary: 'oklch(0.55 0.12 150)', // Natural green
      primaryForeground: 'oklch(0.99 0 0)',
      secondary: 'oklch(0.75 0.1 40)', // Warm neutral
      secondaryForeground: 'oklch(0.15 0 0)',
      accent: 'oklch(0.65 0.12 100)', // Yellow-green
      accentForeground: 'oklch(0.15 0 0)',
      muted: 'oklch(0.92 0 0)',
      mutedForeground: 'oklch(0.5 0 0)',
      destructive: 'oklch(0.58 0.25 27)',
      border: 'oklch(0.92 0 0)',
      input: 'oklch(0.92 0 0)',
      ring: 'oklch(0.55 0.12 150)',
      chart1: 'oklch(0.55 0.12 150)',
      chart2: 'oklch(0.65 0.12 100)',
      chart3: 'oklch(0.75 0.1 40)',
      chart4: 'oklch(0.68 0.1 170)',
      chart5: 'oklch(0.72 0.11 80)',
      sidebar: 'oklch(0.97 0.02 150)',
      sidebarForeground: 'oklch(0.15 0 0)',
      sidebarPrimary: 'oklch(0.55 0.12 150)',
      sidebarPrimaryForeground: 'oklch(0.99 0 0)',
      sidebarAccent: 'oklch(0.75 0.1 40)',
      sidebarAccentForeground: 'oklch(0.15 0 0)',
      sidebarBorder: 'oklch(0.92 0 0)',
      sidebarRing: 'oklch(0.55 0.12 150)',
    },
    dark: {
      background: 'oklch(0.12 0.02 150)',
      foreground: 'oklch(0.94 0 0)',
      card: 'oklch(0.17 0.01 150)',
      cardForeground: 'oklch(0.94 0 0)',
      popover: 'oklch(0.17 0.01 150)',
      popoverForeground: 'oklch(0.94 0 0)',
      primary: 'oklch(0.7 0.15 150)',
      primaryForeground: 'oklch(0.12 0.02 150)',
      secondary: 'oklch(0.85 0.1 40)',
      secondaryForeground: 'oklch(0.12 0.02 150)',
      accent: 'oklch(0.25 0 0)',
      accentForeground: 'oklch(0.95 0 0)',
      muted: 'oklch(0.25 0 0)',
      mutedForeground: 'oklch(0.65 0 0)',
      destructive: 'oklch(0.65 0.2 25)',
      border: 'oklch(0.22 0.01 150)',
      input: 'oklch(0.22 0.01 150)',
      ring: 'oklch(0.7 0.15 150)',
      chart1: 'oklch(0.7 0.15 150)',
      chart2: 'oklch(0.78 0.12 100)',
      chart3: 'oklch(0.85 0.1 40)',
      chart4: 'oklch(0.78 0.1 170)',
      chart5: 'oklch(0.82 0.11 80)',
      sidebar: 'oklch(0.17 0.01 150)',
      sidebarForeground: 'oklch(0.94 0 0)',
      sidebarPrimary: 'oklch(0.7 0.15 150)',
      sidebarPrimaryForeground: 'oklch(0.94 0 0)',
      sidebarAccent: 'oklch(0.85 0.1 40)',
      sidebarAccentForeground: 'oklch(0.94 0 0)',
      sidebarBorder: 'oklch(0.22 0.01 150)',
      sidebarRing: 'oklch(0.7 0.15 150)',
    },
  },
  components: {
    navbarVariant: 'NavbarCentered',
    heroVariant: 'HeroSectionFullScreen',
    featuresVariant: 'FeaturesSectionBento',
    stepsVariant: 'StepsSectionCards',
    testimonialsVariant: 'TestimonialsSectionCarousel',
    pricingVariant: 'PricingSectionSimple',
    faqVariant: 'FaqSectionSearchable',
    ctaVariant: 'CtaSectionMinimal',
    footerVariant: 'FooterNewsletter',
  },
  animationTheme: 'smooth',
  usage: 'Use for health, fitness, wellness, beauty, meditation apps. Calming natural greens and warm tones create a welcoming, trustworthy feel.',
};

/**
 * FINTECH: Modern, trustworthy, tech-focused
 * Best for: Financial apps, fintech, crypto, banking, investing
 */
export const themeFintech: ThemeDefinition = {
  id: 'fintech',
  name: 'Fintech',
  category: 'saas',
  description: 'Modern, trustworthy design for financial products',
  style: 'modern',
  colors: {
    light: {
      background: 'oklch(0.98 0 0)',
      foreground: 'oklch(0.12 0 0)',
      card: 'oklch(0.99 0 0)',
      cardForeground: 'oklch(0.12 0 0)',
      popover: 'oklch(0.99 0 0)',
      popoverForeground: 'oklch(0.12 0 0)',
      primary: 'oklch(0.45 0.12 260)', // Deep blue/purple
      primaryForeground: 'oklch(0.99 0 0)',
      secondary: 'oklch(0.75 0.14 140)', // Teal accent
      secondaryForeground: 'oklch(0.12 0 0)',
      accent: 'oklch(0.65 0.15 40)', // Amber for success
      accentForeground: 'oklch(0.12 0 0)',
      muted: 'oklch(0.92 0 0)',
      mutedForeground: 'oklch(0.5 0 0)',
      destructive: 'oklch(0.58 0.25 27)',
      border: 'oklch(0.92 0 0)',
      input: 'oklch(0.92 0 0)',
      ring: 'oklch(0.45 0.12 260)',
      chart1: 'oklch(0.45 0.12 260)',
      chart2: 'oklch(0.75 0.14 140)',
      chart3: 'oklch(0.65 0.15 40)',
      chart4: 'oklch(0.55 0.12 200)',
      chart5: 'oklch(0.7 0.13 30)',
      sidebar: 'oklch(0.98 0 0)',
      sidebarForeground: 'oklch(0.12 0 0)',
      sidebarPrimary: 'oklch(0.45 0.12 260)',
      sidebarPrimaryForeground: 'oklch(0.99 0 0)',
      sidebarAccent: 'oklch(0.75 0.14 140)',
      sidebarAccentForeground: 'oklch(0.12 0 0)',
      sidebarBorder: 'oklch(0.92 0 0)',
      sidebarRing: 'oklch(0.45 0.12 260)',
    },
    dark: {
      background: 'oklch(0.09 0 0)',
      foreground: 'oklch(0.92 0 0)',
      card: 'oklch(0.14 0 0)',
      cardForeground: 'oklch(0.92 0 0)',
      popover: 'oklch(0.14 0 0)',
      popoverForeground: 'oklch(0.92 0 0)',
      primary: 'oklch(0.62 0.15 260)',
      primaryForeground: 'oklch(0.09 0 0)',
      secondary: 'oklch(0.72 0.15 140)',
      secondaryForeground: 'oklch(0.09 0 0)',
      accent: 'oklch(0.25 0 0)',
      accentForeground: 'oklch(0.95 0 0)',
      muted: 'oklch(0.23 0 0)',
      mutedForeground: 'oklch(0.62 0 0)',
      destructive: 'oklch(0.65 0.2 25)',
      border: 'oklch(0.18 0 0)',
      input: 'oklch(0.18 0 0)',
      ring: 'oklch(0.62 0.15 260)',
      chart1: 'oklch(0.62 0.15 260)',
      chart2: 'oklch(0.72 0.15 140)',
      chart3: 'oklch(0.75 0.15 40)',
      chart4: 'oklch(0.68 0.12 200)',
      chart5: 'oklch(0.8 0.13 30)',
      sidebar: 'oklch(0.14 0 0)',
      sidebarForeground: 'oklch(0.92 0 0)',
      sidebarPrimary: 'oklch(0.62 0.15 260)',
      sidebarPrimaryForeground: 'oklch(0.92 0 0)',
      sidebarAccent: 'oklch(0.72 0.15 140)',
      sidebarAccentForeground: 'oklch(0.92 0 0)',
      sidebarBorder: 'oklch(0.18 0 0)',
      sidebarRing: 'oklch(0.62 0.15 260)',
    },
  },
  components: {
    navbarVariant: 'NavbarTransparent',
    heroVariant: 'HeroSectionSplit',
    featuresVariant: 'FeaturesSectionIconGrid',
    stepsVariant: 'StepsSectionHorizontal',
    testimonialsVariant: 'TestimonialsSectionCarousel',
    pricingVariant: 'PricingSectionToggle',
    faqVariant: 'FaqSectionSearchable',
    ctaVariant: 'CtaSectionSplit',
    footerVariant: 'FooterMega',
  },
  animationTheme: 'smooth',
  usage: 'Use for fintech, crypto, banking, investment apps. Modern deep blue conveys security and trustworthiness.',
};

/**
 * EDUCATION: Accessible, structured, learning-focused
 * Best for: EdTech, courses, universities, learning platforms
 */
export const themeEducation: ThemeDefinition = {
  id: 'education',
  name: 'Education',
  category: 'saas',
  description: 'Accessible, structured design for educational platforms',
  style: 'professional',
  colors: {
    light: {
      background: 'oklch(0.98 0 0)',
      foreground: 'oklch(0.15 0 0)',
      card: 'oklch(0.99 0 0)',
      cardForeground: 'oklch(0.15 0 0)',
      popover: 'oklch(0.99 0 0)',
      popoverForeground: 'oklch(0.15 0 0)',
      primary: 'oklch(0.5 0.15 260)', // Academic purple
      primaryForeground: 'oklch(0.99 0 0)',
      secondary: 'oklch(0.72 0.16 30)', // Warm orange
      secondaryForeground: 'oklch(0.15 0 0)',
      accent: 'oklch(0.6 0.18 120)', // Bright green
      accentForeground: 'oklch(0.15 0 0)',
      muted: 'oklch(0.92 0 0)',
      mutedForeground: 'oklch(0.5 0 0)',
      destructive: 'oklch(0.58 0.25 27)',
      border: 'oklch(0.92 0 0)',
      input: 'oklch(0.92 0 0)',
      ring: 'oklch(0.5 0.15 260)',
      chart1: 'oklch(0.5 0.15 260)',
      chart2: 'oklch(0.72 0.16 30)',
      chart3: 'oklch(0.6 0.18 120)',
      chart4: 'oklch(0.65 0.15 200)',
      chart5: 'oklch(0.7 0.14 350)',
      sidebar: 'oklch(0.98 0 0)',
      sidebarForeground: 'oklch(0.15 0 0)',
      sidebarPrimary: 'oklch(0.5 0.15 260)',
      sidebarPrimaryForeground: 'oklch(0.99 0 0)',
      sidebarAccent: 'oklch(0.72 0.16 30)',
      sidebarAccentForeground: 'oklch(0.15 0 0)',
      sidebarBorder: 'oklch(0.92 0 0)',
      sidebarRing: 'oklch(0.5 0.15 260)',
    },
    dark: {
      background: 'oklch(0.12 0 0)',
      foreground: 'oklch(0.95 0 0)',
      card: 'oklch(0.17 0 0)',
      cardForeground: 'oklch(0.95 0 0)',
      popover: 'oklch(0.17 0 0)',
      popoverForeground: 'oklch(0.95 0 0)',
      primary: 'oklch(0.68 0.18 260)',
      primaryForeground: 'oklch(0.95 0 0)',
      secondary: 'oklch(0.82 0.18 30)',
      secondaryForeground: 'oklch(0.12 0 0)',
      accent: 'oklch(0.25 0 0)',
      accentForeground: 'oklch(0.95 0 0)',
      muted: 'oklch(0.25 0 0)',
      mutedForeground: 'oklch(0.65 0 0)',
      destructive: 'oklch(0.65 0.2 25)',
      border: 'oklch(0.22 0 0)',
      input: 'oklch(0.22 0 0)',
      ring: 'oklch(0.68 0.18 260)',
      chart1: 'oklch(0.68 0.18 260)',
      chart2: 'oklch(0.82 0.18 30)',
      chart3: 'oklch(0.75 0.18 120)',
      chart4: 'oklch(0.78 0.15 200)',
      chart5: 'oklch(0.8 0.14 350)',
      sidebar: 'oklch(0.17 0 0)',
      sidebarForeground: 'oklch(0.95 0 0)',
      sidebarPrimary: 'oklch(0.68 0.18 260)',
      sidebarPrimaryForeground: 'oklch(0.95 0 0)',
      sidebarAccent: 'oklch(0.82 0.18 30)',
      sidebarAccentForeground: 'oklch(0.95 0 0)',
      sidebarBorder: 'oklch(0.22 0 0)',
      sidebarRing: 'oklch(0.68 0.18 260)',
    },
  },
  components: {
    navbarVariant: 'NavbarCentered',
    heroVariant: 'HeroSectionMinimal',
    featuresVariant: 'FeaturesSectionList',
    stepsVariant: 'StepsSectionCards',
    testimonialsVariant: 'TestimonialsSectionCarousel',
    pricingVariant: 'PricingSectionToggle',
    faqVariant: 'FaqSectionCategorized',
    ctaVariant: 'CtaSectionMinimal',
    footerVariant: 'FooterMega',
  },
  animationTheme: 'subtle',
  usage: 'Use for EdTech, online courses, universities, learning platforms. Clear structure and accessible colors promote learning.',
};

/**
 * All available themes - Organized by category
 */
export const ALL_THEMES: ThemeDefinition[] = [
  // SaaS & Professional
  themeMinimal,
  themeTech,
  themeB2B,
  themeFintech,
  themeEducation,
  // Startup & Creative
  themeVibrant,
  themePortfolio,
  // Premium & Enterprise
  themeLuxury,
  // Commerce & Retail
  themeEcommerce,
  // Health & Wellness
  themeWellness,
];

/**
 * Apply theme colors to CSS variables
 */
export function applyTheme(theme: ThemeDefinition, isDark: boolean = false) {
  const colors = isDark ? theme.colors.dark : theme.colors.light;
  const root = document.documentElement;

  Object.entries(colors).forEach(([key, value]) => {
    const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssVar, value);
  });
}

/**
 * Get recommendation text for AI
 */
export function getThemeRecommendation(theme: ThemeDefinition): string {
  return `
Theme: ${theme.name}
Style: ${theme.style}
Category: ${theme.category}

${theme.usage}

Recommended Components:
- Navbar: ${theme.components.navbarVariant}
- Hero: ${theme.components.heroVariant}
- Features: ${theme.components.featuresVariant}
- Steps: ${theme.components.stepsVariant}
- Testimonials: ${theme.components.testimonialsVariant}
- Pricing: ${theme.components.pricingVariant}
- FAQ: ${theme.components.faqVariant}
- CTA: ${theme.components.ctaVariant}
- Footer: ${theme.components.footerVariant}

Animation Style: ${theme.animationTheme}
`;
}
