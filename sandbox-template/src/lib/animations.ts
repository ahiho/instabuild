/**
 * Enhanced Animation System - 40+ sophisticated patterns
 *
 * This file provides reusable animation variants and utilities for Framer Motion.
 * Organized by use case to help AI agents create polished, non-generic landing pages.
 *
 * Categories:
 * - Basic Entrance (fade, scale, slide, blur)
 * - Advanced Entrance (flip, zoom, bounce)
 * - Text Animations (typewriter, reveal, emphasis, blur-in)
 * - Scroll-Triggered (counter, progressive reveal, stagger)
 * - Hover Effects (lift, glow, color shift, scale)
 * - Card/Container (shine, shadow grow, border pulse)
 * - Group Animations (grid cascade, mesh reveal, carousel)
 * - Special Effects (parallax, 3D, morphing, gradient shift)
 */

import type { Variants } from 'framer-motion';

// ============================================================================
// ENTRANCE ANIMATIONS - BASIC (Essential for all sections)
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

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 },
};

export const scaleInUp: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
};

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

export const blur: Variants = {
  hidden: { opacity: 0, filter: 'blur(10px)' },
  visible: { opacity: 1, filter: 'blur(0px)' },
};

export const rotate: Variants = {
  hidden: { opacity: 0, rotate: -10 },
  visible: { opacity: 1, rotate: 0 },
};

// ============================================================================
// ENTRANCE ANIMATIONS - ADVANCED
// ============================================================================

export const flipInX: Variants = {
  hidden: { opacity: 0, rotateX: 90 },
  visible: { opacity: 1, rotateX: 0 },
};

export const flipInY: Variants = {
  hidden: { opacity: 0, rotateY: 90 },
  visible: { opacity: 1, rotateY: 0 },
};

export const zoomIn: Variants = {
  hidden: { opacity: 0, scale: 0.3 },
  visible: { opacity: 1, scale: 1 },
};

export const bounceIn: Variants = {
  hidden: { opacity: 0, scale: 0.3 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 150,
      damping: 15,
    },
  },
};

export const expandDown: Variants = {
  hidden: { opacity: 0, height: 0, overflow: 'hidden' },
  visible: {
    opacity: 1,
    height: 'auto',
    overflow: 'visible',
  },
};

// ============================================================================
// TEXT ANIMATIONS - Specialized for copy and headlines
// ============================================================================

export const textBlurIn: Variants = {
  hidden: { opacity: 0, filter: 'blur(10px)' },
  visible: { opacity: 1, filter: 'blur(0px)' },
};

export const textRevealUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
    },
  }),
};

export const textCharacterReveal: Variants = {
  hidden: { opacity: 0 },
  visible: (i: number) => ({
    opacity: 1,
    transition: {
      delay: i * 0.03,
      duration: 0.1,
    },
  }),
};

export const textEmphasisPulse: Variants = {
  visible: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 0.6,
      delay: 0.5,
    },
  },
};

export const highlightBgReveal: Variants = {
  hidden: { backgroundPosition: '100% 0' },
  visible: {
    backgroundPosition: '0% 0',
    transition: {
      duration: 0.8,
    },
  },
};

// ============================================================================
// SCROLL-TRIGGERED ANIMATIONS - Counter, progressive, stagger reveals
// ============================================================================

export const progressiveReveal: Variants = {
  hidden: { opacity: 0 },
  visible: (i: number) => ({
    opacity: 1,
    transition: {
      delay: i * 0.15,
      duration: 0.5,
    },
  }),
};

export const progressiveSlideInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.6,
      ease: 'easeOut',
    },
  }),
};

export const cascadeDown: Variants = {
  hidden: { opacity: 0, y: -30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
    },
  }),
};

export const cascadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
    },
  }),
};

export const gridMeshReveal: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: (i % 3) * 0.1 + Math.floor(i / 3) * 0.1,
    },
  }),
};

// ============================================================================
// STAGGER ANIMATIONS - For groups and lists
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

export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const staggerContainerSlow: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
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
// HOVER EFFECTS - Micro-interactions for interactivity
// ============================================================================

export const hoverLift: Variants = {
  rest: { y: 0 },
  hover: {
    y: -8,
    transition: {
      duration: 0.3,
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
};

export const hoverGrow: Variants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.05,
    transition: {
      duration: 0.2,
    },
  },
};

export const hoverScale: Variants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.08,
  },
};

export const hoverGlow: Variants = {
  rest: {
    boxShadow: '0px 0px 0px rgba(0, 0, 0, 0)',
  },
  hover: {
    boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.15)',
  },
};

export const hoverBorderPulse: Variants = {
  rest: { borderColor: 'rgba(0, 0, 0, 0.1)' },
  hover: {
    borderColor: 'rgba(0, 0, 0, 0.3)',
  },
};

// ============================================================================
// CARD ANIMATIONS - Container-specific effects
// ============================================================================

export const cardShineEffect: Variants = {
  hidden: { backgroundPosition: '200% 0' },
  visible: {
    backgroundPosition: '0% 0',
    transition: {
      duration: 0.8,
      ease: 'easeInOut',
    },
  },
};

export const cardShadowGrow: Variants = {
  hidden: { boxShadow: '0px 2px 8px rgba(0,0,0,0.08)' },
  visible: {
    boxShadow: '0px 12px 24px rgba(0,0,0,0.12)',
    transition: { duration: 0.5 },
  },
};

export const cardBorderGradientPulse: Variants = {
  visible: {
    backgroundPosition: ['0% 0%', '100% 0%', '0% 0%'],
    transition: {
      duration: 3,
      repeat: Infinity,
    },
  },
};

// ============================================================================
// TRANSITION PRESETS - Timing functions for different vibes
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
  springBouncy: {
    type: 'spring' as const,
    stiffness: 150,
    damping: 12,
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
  faster: {
    duration: 0.15,
    ease: 'easeOut' as const,
  },
  slow: {
    duration: 1,
    ease: 'easeInOut' as const,
  },
  verySlow: {
    duration: 1.5,
    ease: 'easeInOut' as const,
  },
};

// ============================================================================
// ANIMATION THEMES - Matched to design themes
// ============================================================================

export const animationThemes = {
  subtle: {
    entrance: fadeInUp,
    container: staggerContainer,
    item: staggerItem,
    transition: transitions.smooth,
  },
  energetic: {
    entrance: bounceIn,
    container: staggerContainerFast,
    item: progressiveSlideInUp,
    transition: transitions.springBouncy,
  },
  smooth: {
    entrance: slideInUp,
    container: staggerContainer,
    item: staggerItem,
    transition: transitions.smooth,
  },
  playful: {
    entrance: flipInY,
    container: staggerContainerFast,
    item: cascadeUp,
    transition: transitions.bouncy,
  },
  enterprise: {
    entrance: fadeInUp,
    container: staggerContainer,
    item: progressiveSlideInUp,
    transition: transitions.default,
  },
};

// ============================================================================
// VIEWPORT OPTIONS - Control when animations trigger
// ============================================================================

export const viewportOptions = {
  once: true, // Animate only once when entering viewport
  margin: '0px 0px -100px 0px', // Trigger animation slightly before element is visible
  amount: 0.3, // Percentage of element that must be visible
};

export const viewportOptionsEarly = {
  once: true,
  margin: '0px 0px -200px 0px', // Trigger earlier
  amount: 0.1,
};

export const viewportOptionsLate = {
  once: true,
  margin: '0px 0px 0px 0px', // Trigger when fully visible
  amount: 0.5,
};

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
Example 1: Hero section with staggered entrance
<motion.div
  variants={staggerContainer}
  initial="hidden"
  whileInView="visible"
  viewport={viewportOptions}
>
  <motion.h1 variants={staggerItem}>Title</motion.h1>
  <motion.p variants={staggerItem}>Description</motion.p>
</motion.div>

Example 2: Card with hover lift effect
<motion.div
  variants={hoverLift}
  initial="rest"
  whileHover="hover"
>
  <CardContent />
</motion.div>

Example 3: Grid of items with progressive reveal
<motion.div
  variants={staggerContainer}
  initial="hidden"
  whileInView="visible"
  viewport={viewportOptions}
>
  {items.map((item, i) => (
    <motion.div
      key={i}
      variants={progressiveSlideInUp}
      custom={i}
    >
      {item}
    </motion.div>
  ))}
</motion.div>

Example 4: Text with character reveal
<motion.h1>
  {text.split('').map((char, i) => (
    <motion.span
      key={i}
      variants={textCharacterReveal}
      custom={i}
    >
      {char}
    </motion.span>
  ))}
</motion.h1>

Example 5: Card with combined effects
<motion.div
  variants={fadeInUp}
  initial="hidden"
  whileInView="visible"
  viewport={viewportOptions}
  transition={transitions.smooth}
  whileHover="hover"
  initial="rest"
  custom={hoverLift}
>
  Card Content
</motion.div>
*/
