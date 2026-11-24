"use client";

import { motion, type MotionValue } from "motion/react";
import { journeyChapters, type JourneyChapter, type JourneyStopId } from "@/data/journey";

interface JourneyProgressProps {
  scrollYProgress: MotionValue<number>;
  activeChapter: JourneyChapter;
  onSelectStop: (stopId: JourneyStopId) => void;
}

export default function JourneyProgress({
  scrollYProgress,
  activeChapter,
  onSelectStop,
}: JourneyProgressProps) {
  return (
    <aside className="journey-progress" aria-label="Avanzamento lungo il percorso">
      <div className="journey-progress__track" aria-hidden="true">
        <motion.div
          className="journey-progress__fill"
          style={{ scaleY: scrollYProgress }}
        />
      </div>

      <nav className="journey-progress__stops" aria-label="Fermate del viaggio">
        {journeyChapters.map((chapter) => {
          const isActive = chapter.id === activeChapter.id;
          return (
            <button
              key={chapter.id}
              type="button"
              className={`journey-stop-dot${isActive ? " is-active" : ""}`}
              onClick={() => onSelectStop(chapter.id)}
              aria-label={`Vai a ${chapter.navLabel}`}
              aria-current={isActive ? "step" : undefined}
            >
              <span className="journey-stop-dot__pip" aria-hidden="true" />
              <span className="journey-stop-dot__meta">
                <b>{chapter.index}</b> {chapter.shortLabel.toUpperCase()}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
