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

export interface JourneyProgressState {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
  activeChapter: JourneyChapter;
  atStop: boolean;
  /** Mantenuto per compatibilità UI; lo scroll è sempre libero e controllabile. */
  holdSeconds: number;
  trackProgressRef: React.RefObject<number>;
  scrollProgressRef: React.RefObject<number>;
  jumpToStop: (stopId: JourneyStopId, reducedMotion?: boolean) => void;
}

const MAX_WHEEL_STEP_PX = 92;

export function useJourneyProgress(): JourneyProgressState {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const trackProgressRef = useRef<number>(mapScrollToTrackProgress(0));
  const scrollProgressRef = useRef<number>(0);

  const [activeChapter, setActiveChapter] = useState<JourneyChapter>(journeyChapters[0]);
  const [atStop, setAtStop] = useState<boolean>(true);

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

  // Ricalibrazione deterministica della rotellina:
  // riduce la distanza per singolo scatto, comprime i picchi improvvisi ed elimina accelerazioni
  // che porterebbero troppo avanti o in fondo al sito, mantenendo la progressione fluida e reversibile.
  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return;
      if (Math.abs(event.deltaY) < 0.01) return;

      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          ".fullscreen-menu, .mobile-menu-sheet, .mobile-details-drawer, [role='dialog']",
        )
      ) {
        return;
      }

      // Se esiste un elemento scrollabile interno sotto il cursore, non interferire
      let node = target;
      while (node && node !== document.body) {
        const style = window.getComputedStyle(node);
        const overflowY = style.overflowY;
        if (
          (overflowY === "auto" || overflowY === "scroll") &&
          node.scrollHeight > node.clientHeight + 2
        ) {
          return;
        }
        node = node.parentElement;
      }

      event.preventDefault();

      let rawDelta = event.deltaY;
      if (event.deltaMode === 1) {
        rawDelta *= 32;
      } else if (event.deltaMode === 2) {
        rawDelta *= window.innerHeight * 0.55;
      }

      const abs = Math.abs(rawDelta);
      // Sensibilità controllata: ~0.55x sui micro-movimenti e compressione progressiva sui colpi veloci
      const calibrated =
        abs <= 65
          ? abs * 0.55
          : 35.75 + Math.min(MAX_WHEEL_STEP_PX - 35.75, (abs - 65) * 0.24);
      const step = Math.sign(rawDelta) * calibrated;

      const container = scrollContainerRef.current;
      const maxDocScroll = container
        ? Math.max(0, container.offsetTop + container.offsetHeight - window.innerHeight)
        : Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

      const nextY = Math.max(0, Math.min(maxDocScroll, window.scrollY + step));
      window.scrollTo({ top: nextY, behavior: "auto" });
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
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

      const targetY = getScrollYForNormalized(chapter.scrollTarget);
      window.scrollTo({
        top: targetY,
        behavior: reducedMotion ? "auto" : "smooth",
      });
    },
    [getScrollYForNormalized],
  );

  return {
    scrollContainerRef,
    scrollYProgress,
    activeChapter,
    atStop,
    holdSeconds: 0,
    trackProgressRef,
    scrollProgressRef,
    jumpToStop,
  };
}
