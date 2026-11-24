"use client";

import { useCallback, useRef, useState } from "react";
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

  const { scrollYProgress } = useScroll({
    target: scrollContainerRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    scrollProgressRef.current = latest;
    trackProgressRef.current = mapScrollToTrackProgress(latest);

    const nextChapter = getActiveChapterForScroll(latest);
    const nextAtStop = isAtStopPlateau(latest, nextChapter);

    setActiveChapter((prev) => (prev.id === nextChapter.id ? prev : nextChapter));
    setAtStop((prev) => (prev === nextAtStop ? prev : nextAtStop));
  });

  const jumpToStop = useCallback((stopId: JourneyStopId, reducedMotion = false) => {
    const chapter = journeyChapters.find((item) => item.id === stopId);
    const container = scrollContainerRef.current;
    if (!chapter || !container) return;

    const maxScroll = Math.max(1, container.offsetHeight - window.innerHeight);
    const containerTop = container.getBoundingClientRect().top + window.scrollY;
    const targetY = containerTop + chapter.scrollTarget * maxScroll;

    window.scrollTo({
      top: targetY,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, []);

  return {
    scrollContainerRef,
    scrollYProgress,
    activeChapter,
    atStop,
    trackProgressRef,
    scrollProgressRef,
    jumpToStop,
  };
}

