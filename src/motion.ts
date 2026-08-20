import type { Transition, Variants } from 'framer-motion';

/** Deceleration curve used across the product — no bounce. */
export const easeOut = [0.16, 1, 0.3, 1] as const;
export const easeInOut = [0.4, 0, 0.2, 1] as const;

export const duration = {
  instant: 0.08,
  fast: 0.14,
  base: 0.2,
  slow: 0.32,
  panel: 0.4,
} as const;

export const tween = (d: number = duration.base): Transition => ({
  duration: d,
  ease: easeOut,
});

export const springSoft: Transition = {
  type: 'spring',
  stiffness: 480,
  damping: 36,
  mass: 0.75,
};

export const springSnappy: Transition = {
  type: 'spring',
  stiffness: 560,
  damping: 40,
  mass: 0.65,
};

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.26, ease: easeOut },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.14, ease: easeOut },
  },
};

export const pageMotionProps = {
  variants: pageVariants,
  initial: 'initial' as const,
  animate: 'animate' as const,
  exit: 'exit' as const,
};

export const tabTransition = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.2, ease: easeOut },
};

export const fadeInUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: easeOut },
});

export const modalBackdrop = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2, ease: easeOut },
};

export const modalPanel = {
  initial: { opacity: 0, y: 14, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 8, scale: 0.985 },
  transition: { duration: 0.3, ease: easeOut },
};

export const dropdownMotion = {
  initial: { opacity: 0, y: 6, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 4, scale: 0.98 },
  transition: { duration: 0.16, ease: easeOut },
};

export const toastMotion = {
  initial: { opacity: 0, x: 20, scale: 0.98 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: 12, scale: 0.98 },
  transition: { duration: 0.24, ease: easeOut },
};

export const expandMotion = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto' as const, opacity: 1 },
  exit: { height: 0, opacity: 0 },
  transition: { duration: 0.26, ease: easeOut, opacity: { duration: 0.18 } },
};

export const hoverLift = { y: -2 };
export const tapPress = { scale: 0.985 };

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.05, delayChildren: 0.03 },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: easeOut },
  },
};

export const progressTween: Transition = {
  duration: 0.55,
  ease: easeOut,
};
