"use client";

import { AnimatePresence, motion } from "motion/react";
import { EASE_AUTOMOTIVE } from "@/lib/animations";

interface LoadingScreenProps {
  visible: boolean;
  progress: number;
  reducedMotion: boolean;
}

export default function LoadingScreen({
  visible,
  progress,
  reducedMotion,
}: LoadingScreenProps) {
  const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="loading-curtain"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0.15 : 0.75, ease: EASE_AUTOMOTIVE }}
          role="status"
          aria-live="polite"
          aria-label="Caricamento esperienza 3D Autoscuola Prantini"
        >
          <div className="loading-curtain__inner">
            <span className="loading-curtain__kicker">AUTOSCUOLA PRANTINI · CAVEZZO</span>
            <div className="loading-curtain__mark">
              P<span>.</span>
            </div>
            <p className="loading-curtain__phrase">Ogni strada inizia con una scelta.</p>
            <div className="loading-curtain__bar" aria-hidden="true">
              <motion.span
                className="loading-curtain__fill"
                initial={{ scaleX: 0.05 }}
                animate={{ scaleX: Math.max(0.05, clampedProgress / 100) }}
                transition={{
                  duration: reducedMotion ? 0.08 : 0.25,
                  ease: EASE_AUTOMOTIVE,
                }}
              />
            </div>
            <span className="loading-curtain__hint">
              SCENA 3D · {clampedProgress}%
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
