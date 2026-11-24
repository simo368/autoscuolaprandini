"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import {
  getActiveChapterForScroll,
  isAtStopPlateau,
  journeyChapters,
  mapScrollToTrackProgress,
  type JourneyChapter,
  type JourneyStopId,
} from "@/data/journey";

const STOP_HOLD_MS = 3000;
const HOLD_STOPS: ReadonlySet<JourneyStopId> = new Set(["patenti", "rinnovo", "punti"]);

export interface JourneyProgressState {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
  activeChapter: JourneyChapter;
  atStop: boolean;
  /** Secondi rimanenti della sosta obbligatoria (3, 2, 1) oppure 0 quando lo scroll è libero. */
  holdSeconds: number;
  trackProgressRef: React.RefObject<number>;
  scrollProgressRef: React.RefObject<number>;
  jumpToStop: (stopId: JourneyStopId, reducedMotion?: boolean) => void;
}

export function useJourneyProgress(): JourneyProgressState {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const trackProgressRef = useRef<number>(mapScrollToTrackProgress(0));
  const scrollProgressRef = useRef<number>(0);

  const [activeChapter, setActiveChapter] = useState<JourneyChapter>(journeyChapters[0]);
  const [atStop, setAtStop] = useState<boolean>(true);
  const [holdSeconds, setHoldSeconds] = useState<number>(0);

  const heldStopRef = useRef<{
    id: JourneyStopId;
    until: number;
    lockNormalized: number;
  } | null>(null);
  const bypassHoldRef = useRef<boolean>(false);
  const armedStopsRef = useRef<Set<JourneyStopId>>(new Set(["patenti", "rinnovo", "punti"]));

  const { scrollYProgress } = useScroll({
    target: scrollContainerRef,
    offset: ["start start", "end end"],
  });

  const getScrollYForNormalized = useCallback((normalized: number) => {
    const container = scrollContainerRef.current;
    if (!container) return 0;
    const maxScroll = Math.max(1, container.offsetHeight - window.innerHeight);
    const containerTop = container.getBoundingClientRect().top + window.scrollY;
    return containerTop + normalized * maxScroll;
  }, []);

  const clearHold = useCallback(() => {
    heldStopRef.current = null;
    setHoldSeconds(0);
  }, []);

  // Blocca lo scroll in avanti (rotellina / touch momentum) durante i 3 secondi di sosta
  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      const held = heldStopRef.current;
      if (!held) return;
      if (performance.now() >= held.until) {
        clearHold();
        return;
      }
      if (event.deltaY > 0) {
        event.preventDefault();
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [clearHold]);

  // Aggiorna il countdown 3 -> 2 -> 1 -> 0
  useEffect(() => {
    if (holdSeconds <= 0) return;
    const timer = window.setInterval(() => {
      const held = heldStopRef.current;
      if (!held) {
        setHoldSeconds(0);
        return;
      }
      const remainingMs = held.until - performance.now();
      if (remainingMs <= 0) {
        clearHold();
      } else {
        setHoldSeconds(Math.ceil(remainingMs / 1000));
      }
    }, 150);

    return () => window.clearInterval(timer);
  }, [holdSeconds, clearHold]);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const prevScroll = scrollProgressRef.current;

    // Se siamo in sosta obbligatoria di 3 secondi, impedisci di superare il punto di sosta
    const held = heldStopRef.current;
    if (held) {
      if (performance.now() >= held.until) {
        clearHold();
      } else if (latest > held.lockNormalized) {
        const lockY = getScrollYForNormalized(held.lockNormalized);
        window.scrollTo({ top: lockY, behavior: "auto" });
        return;
      } else if (latest < held.lockNormalized - 0.03) {
        // Scorrimento all'indietro libero
        clearHold();
      }
    }

    // Ri-arma una fermata se l'utente torna indietro prima della zona di ingresso
    for (const ch of journeyChapters) {
      if (HOLD_STOPS.has(ch.id) && latest < ch.stopPlateauStart - 0.03) {
        armedStopsRef.current.add(ch.id);
      }
    }

    // Attiva la sosta di 3 secondi quando si entra in avanti in una fermata armata
    if (!bypassHoldRef.current && latest > prevScroll) {
      for (const ch of journeyChapters) {
        if (
          HOLD_STOPS.has(ch.id) &&
          armedStopsRef.current.has(ch.id) &&
          prevScroll < ch.stopPlateauStart &&
          latest >= ch.stopPlateauStart
        ) {
          armedStopsRef.current.delete(ch.id);
          heldStopRef.current = {
            id: ch.id,
            until: performance.now() + STOP_HOLD_MS,
            lockNormalized: ch.scrollTarget,
          };
          setHoldSeconds(3);

          const lockY = getScrollYForNormalized(ch.scrollTarget);
          scrollProgressRef.current = ch.scrollTarget;
          trackProgressRef.current = mapScrollToTrackProgress(ch.scrollTarget);
          setActiveChapter(ch);
          setAtStop(true);
          window.scrollTo({ top: lockY, behavior: "auto" });
          return;
        }
      }
    }

    scrollProgressRef.current = latest;
    trackProgressRef.current = mapScrollToTrackProgress(latest);

    const nextChapter = getActiveChapterForScroll(latest);
    const nextAtStop = isAtStopPlateau(latest, nextChapter);

    setActiveChapter((prev) => (prev.id === nextChapter.id ? prev : nextChapter));
    setAtStop((prev) => (prev === nextAtStop ? prev : nextAtStop));
  });

  const jumpToStop = useCallback(
    (stopId: JourneyStopId, reducedMotion = false) => {
      const chapter = journeyChapters.find((item) => item.id === stopId);
      const container = scrollContainerRef.current;
      if (!chapter || !container) return;

      clearHold();
      // Disarma temporaneamente le fermate intermedie durante il salto da menu / Continua
      bypassHoldRef.current = true;
      for (const ch of journeyChapters) {
        if (ch.scrollTarget <= chapter.scrollTarget) {
          armedStopsRef.current.delete(ch.id);
        }
      }

      const targetY = getScrollYForNormalized(chapter.scrollTarget);
      window.scrollTo({
        top: targetY,
        behavior: reducedMotion ? "auto" : "smooth",
      });

      window.setTimeout(() => {
        bypassHoldRef.current = false;
      }, reducedMotion ? 100 : 1100);
    },
    [clearHold, getScrollYForNormalized],
  );

  return {
    scrollContainerRef,
    scrollYProgress,
    activeChapter,
    atStop,
    holdSeconds,
    trackProgressRef,
    scrollProgressRef,
    jumpToStop,
  };
}
