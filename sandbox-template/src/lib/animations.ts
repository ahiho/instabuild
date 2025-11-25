/**
 * Animation Utilities for Landing Pages
 *
 * This file provides reusable animation variants and utilities for Framer Motion.
 * AI agents can use these presets to quickly add animations to components.
 */

import type { Variants } from 'framer-motion';

// ============================================================================
// FADE ANIMATIONS
// ============================================================================

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0 },
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
};

// ============================================================================
// SCALE ANIMATIONS
// ============================================================================

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 },
};

export const scaleInUp: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
};

// ============================================================================
// SLIDE ANIMATIONS
// ============================================================================

export const slideInLeft: Variants = {
  hidden: { x: -100, opacity: 0 },
  visible: { x: 0, opacity: 1 },
};

export const slideInRight: Variants = {
  hidden: { x: 100, opacity: 0 },
  visible: { x: 0, opacity: 1 },
};

export const slideInUp: Variants = {
  hidden: { y: 100, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

export const slideInDown: Variants = {
  hidden: { y: -100, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

// ============================================================================
// STAGGER ANIMATIONS
// ============================================================================

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

// ============================================================================
// SPECIAL EFFECTS
// ============================================================================

export const blur: Variants = {
  hidden: { opacity: 0, filter: 'blur(10px)' },
  visible: { opacity: 1, filter: 'blur(0px)' },
};

export const rotate: Variants = {
  hidden: { opacity: 0, rotate: -10 },
  visible: { opacity: 1, rotate: 0 },
};

// ============================================================================
// TRANSITION PRESETS
// ============================================================================

export const transitions = {
  default: {
    duration: 0.5,
    ease: 'easeOut' as const,
  },
  smooth: {
    duration: 0.8,
    ease: [0.6, 0.05, 0.01, 0.9] as const,
  },
  spring: {
    type: 'spring' as const,
    stiffness: 100,
    damping: 15,
  },
  bouncy: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 20,
  },
  fast: {
    duration: 0.3,
    ease: 'easeOut' as const,
  },
  slow: {
    duration: 1,
    ease: 'easeInOut' as const,
  },
};

// ============================================================================
// VIEWPORT OPTIONS
// ============================================================================

export const viewportOptions = {
  once: true, // Animate only once when entering viewport
  margin: '0px 0px -100px 0px', // Trigger animation slightly before element is visible
  amount: 0.3, // Percentage of element that must be visible
};

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
Example 1: Basic fade in animation
<motion.div
  variants={fadeInUp}
  initial="hidden"
  whileInView="visible"
  viewport={viewportOptions}
  transition={transitions.default}
>
  Content
</motion.div>

Example 2: Stagger children animation
<motion.div
  variants={staggerContainer}
  initial="hidden"
  whileInView="visible"
  viewport={viewportOptions}
>
  {items.map((item) => (
    <motion.div key={item.id} variants={staggerItem}>
      {item.content}
    </motion.div>
  ))}
</motion.div>

Example 3: Custom animation with spring
<motion.div
  initial={{ opacity: 0, scale: 0.5 }}
  whileInView={{ opacity: 1, scale: 1 }}
  viewport={viewportOptions}
  transition={transitions.spring}
>
  Content
</motion.div>
*/
