import type { Transition } from "motion/react";

/**
 * Curva di accelerazione/decelerazione automotive ispirata ai principi
 * di coreografia e performance di Emil Kowalski (compositor-only: transform + opacity).
 */
export const EASE_AUTOMOTIVE = [0.16, 1, 0.3, 1] as const;
export const EASE_EXIT = [0.4, 0, 1, 1] as const;

export const panelTransition: Transition = {
  duration: 0.52,
  ease: EASE_AUTOMOTIVE,
};

export const staggerItemTransition = (index: number): Transition => ({
  duration: 0.42,
  delay: Math.min(index * 0.055, 0.22),
  ease: EASE_AUTOMOTIVE,
});

export const panelRevealVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.985,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: panelTransition,
  },
  exit: {
    opacity: 0,
    y: -12,
    scale: 0.99,
    transition: { duration: 0.28, ease: EASE_EXIT },
  },
};

export const reducedRevealVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.16 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

