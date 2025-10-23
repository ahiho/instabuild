// Component contracts for Home Page UI/UX Overhaul
// Generated: 2025-10-22

export interface HeroPromptProps {
  onSubmit: (content: string) => void;
  placeholder?: string;
  maxLength?: number;
  isLoading?: boolean;
}

export interface HeroPromptState {
  content: string;
  isFocused: boolean;
  isValid: boolean;
  charCount: number;
}

export interface ShowcaseExample {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  category: string;
  order: number;
}

export interface ShowcaseCarouselProps {
  examples: ShowcaseExample[];
  autoScrollInterval?: number; // milliseconds, default 4000
  showIndicators?: boolean;
  showNavigation?: boolean;
}

export interface FeatureCard {
  id: string;
  title: string;
  description: string;
  iconName: string;
  order: number;
}

export interface FeatureCardsProps {
  features: FeatureCard[];
  layout?: 'grid' | 'row';
}

export interface DynamicBackgroundProps {
  animationType?: 'particles' | 'waves' | 'constellation';
  intensity?: number; // 0-100
  color?: string;
  respectReducedMotion?: boolean;
}

export interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
}

export interface PerformanceMetrics {
  fps: number;
  loadTime: number;
  interactionDelay: number;
}
