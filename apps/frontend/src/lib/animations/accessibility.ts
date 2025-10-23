// Accessibility utilities for animations and motion
import { ANIMATION_CONFIGS } from './config';

// Detect user's motion preferences
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Create a reactive hook for reduced motion preference
export const useReducedMotion = () => {
  const [shouldReduceMotion, setShouldReduceMotion] = useState(
    prefersReducedMotion()
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (event: MediaQueryListEvent) => {
      setShouldReduceMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return shouldReduceMotion;
};

// Get accessibility-compliant animation config
export const getAccessibleAnimationConfig = (configKey: string) => {
  const baseConfig = ANIMATION_CONFIGS[configKey];

  if (prefersReducedMotion()) {
    return {
      ...baseConfig,
      duration: Math.min(baseConfig.duration, 0.2),
      easing: 'ease-out',
    };
  }

  return baseConfig;
};

// Framer Motion variants that respect reduced motion
export const accessibleFadeIn = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      duration: prefersReducedMotion() ? 0.1 : 0.5,
    },
  },
};

export const accessibleSlideIn = {
  initial: {
    opacity: 0,
    y: prefersReducedMotion() ? 0 : 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: prefersReducedMotion() ? 0.1 : 0.5,
    },
  },
};

// Utility to disable animations entirely if needed
export const getMotionProps = (shouldAnimate = true) => {
  if (!shouldAnimate || prefersReducedMotion()) {
    return {
      initial: false,
      animate: false,
      exit: false,
      transition: { duration: 0 },
    };
  }

  return {};
};

// Focus management for keyboard navigation
export const manageFocus = {
  // Trap focus within a component
  trapFocus: (element: HTMLElement) => {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    element.addEventListener('keydown', handleTabKey);
    return () => element.removeEventListener('keydown', handleTabKey);
  },

  // Restore focus to previous element
  restoreFocus: (previousElement: HTMLElement | null) => {
    if (previousElement) {
      previousElement.focus();
    }
  },
};

// Import React hooks (this would normally be imported from React)
import { useState, useEffect } from 'react';
