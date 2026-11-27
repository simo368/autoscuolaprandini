"use client";

import { AnimatePresence, motion } from "motion/react";
import { businessConfig } from "@/data/configuration";
import { panelRevealVariants, reducedRevealVariants } from "@/lib/animations";
import { ArrowDown } from "@/components/interface/Icons";

interface IntroScreenProps {
  visible: boolean;
  reducedMotion: boolean;
  onStartJourney: () => void;
}

export default function IntroScreen({
  visible,
  reducedMotion,
  onStartJourney,
}: IntroScreenProps) {
  const variants = reducedMotion ? reducedRevealVariants : panelRevealVariants;

  return (
    <AnimatePresence>
      {visible && (
        <motion.section
          className="intro-overlay"
          variants={variants}
          initial="hidden"
          animate="visible"
          exit="exit"
          aria-labelledby="intro-headline"
        >
          <div className="intro-overlay__content">
            <div className="intro-overlay__eyebrow">
              <span className="hairline-accent" />
              <span>00 / PARTENZA · {businessConfig.name.toUpperCase()}</span>
            </div>

            <h1 id="intro-headline" className="intro-overlay__title">
              OGNI STRADA
              <br />
              INIZIA CON <span>UNA SCELTA.</span>
            </h1>

            <p className="intro-overlay__lead">
              Dall&apos;ora blu alla luce dorata del mattino, segui il percorso di Autoscuola Prantini
              attraverso la campagna emiliana fino a Cavezzo.
            </p>

            <div className="intro-overlay__actions">
              <button
                type="button"
                className="btn-primary"
                onClick={onStartJourney}
              >
                <span>INIZIA IL VIAGGIO</span>
                <ArrowDown />
              </button>
              <span className="intro-overlay__scroll-note">
                OPPURE SCORRI PER GUIDARE
              </span>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

