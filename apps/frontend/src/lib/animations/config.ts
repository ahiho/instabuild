import type { AnimationConfig } from '../../types/home';

// Animation configuration utilities for consistent timing and easing
export const ANIMATION_CONFIGS: Record<string, AnimationConfig> = {
  // Hero section animations
  heroFadeIn: {
    duration: 0.8,
    easing: 'ease-out',
    delay: 0.2,
  },

  // Background animations
  backgroundParticles: {
    duration: 20,
    easing: 'linear',
  },

  // Carousel animations
  carouselSlide: {
    duration: 0.5,
    easing: 'ease-in-out',
  },

  // Feature card hover effects
  cardHover: {
    duration: 0.2,
    easing: 'ease-out',
  },

  // Button interactions
  buttonPress: {
    duration: 0.1,
    easing: 'ease-in-out',
  },
};

// Framer Motion variants for common animations
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const scaleOnHover = {
  initial: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
};

export const slideInFromLeft = {
  initial: { opacity: 0, x: -50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 50 },
};

// Performance-optimized animation settings
export const PERFORMANCE_SETTINGS = {
  // Target 60fps for smooth animations
  targetFPS: 60,

  // Reduce animation complexity on slower devices
  reducedMotionFallback: {
    duration: 0.2,
    easing: 'ease-out',
  },

  // Animation thresholds
  maxParticles: 100,
  minFrameTime: 16.67, // 60fps = 16.67ms per frame
};
