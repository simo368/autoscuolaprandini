"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import type { LicenceCategoryId } from "@/data/services";
import { useJourneyProgress } from "@/hooks/useJourneyProgress";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import ContactSection from "@/components/interface/ContactSection";
import FallbackExperience from "@/components/interface/FallbackExperience";
import InformationPanel from "@/components/interface/InformationPanel";
import IntroScreen from "@/components/interface/IntroScreen";
import JourneyProgress from "@/components/interface/JourneyProgress";
import LoadingScreen from "@/components/interface/LoadingScreen";
import Navigation from "@/components/interface/Navigation";

const ExperienceCanvas = dynamic(
  () => import("@/components/experience/ExperienceCanvas"),
  { ssr: false },
);

export default function RoadExperience() {
  const reducedMotion = useReducedMotion();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const isSmallMobile = useMediaQuery("(max-width: 379px)");

  const {
    scrollContainerRef,
    scrollYProgress,
    activeChapter,
    atStop,
    holdSeconds,
    trackProgressRef,
    jumpToStop,
  } = useJourneyProgress();

  const [selectedCategory, setSelectedCategory] = useState<LicenceCategoryId>("b");
  const [loadProgress, setLoadProgress] = useState(12);
  const [sceneReady, setSceneReady] = useState(false);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  const handleLoadProgress = useCallback((percent: number) => {
    setLoadProgress((prev) => Math.max(prev, percent));
  }, []);

  const handleSceneReady = useCallback(() => {
    setLoadProgress(100);
    setSceneReady(true);
  }, []);

  const handleWebGLUnavailable = useCallback(() => {
    setWebglUnavailable(true);
    setLoadProgress(100);
    setSceneReady(true);
  }, []);

  if (webglUnavailable) {
    return <FallbackExperience />;
  }

  const showLoader = !sceneReady;

  return (
    <main className="experience-root">
      <LoadingScreen
        visible={showLoader}
        progress={loadProgress}
        reducedMotion={reducedMotion}
      />

      <div ref={scrollContainerRef} className="journey-scroll-track">
        <div className="journey-sticky-viewport">
          <ExperienceCanvas
            trackProgressRef={trackProgressRef}
            activeStopId={activeChapter.id}
            atStop={atStop}
            selectedCategory={selectedCategory}
            isMobile={isMobile}
            isSmallMobile={isSmallMobile}
            reducedMotion={reducedMotion}
            onLoadProgress={handleLoadProgress}
            onSceneReady={handleSceneReady}
            onWebGLUnavailable={handleWebGLUnavailable}
          />

          <div className="cinematic-vignette" aria-hidden="true" />

          <Navigation
            activeChapter={activeChapter}
            scrollYProgress={scrollYProgress}
            isMobile={isMobile}
            reducedMotion={reducedMotion}
            onNavigateStop={(stopId) => jumpToStop(stopId, reducedMotion)}
          />

          <IntroScreen
            visible={!showLoader && activeChapter.id === "intro"}
            reducedMotion={reducedMotion}
            onStartJourney={() => jumpToStop("patenti", reducedMotion)}
          />

          <InformationPanel
            activeChapter={activeChapter}
            atStop={atStop}
            holdSeconds={holdSeconds}
            selectedCategory={selectedCategory}
            isMobile={isMobile}
            onSelectCategory={setSelectedCategory}
            onNavigateStop={(stopId) => jumpToStop(stopId, reducedMotion)}
            reducedMotion={reducedMotion}
          />

          <ContactSection
            visible={activeChapter.id === "cavezzo" && atStop}
            isMobile={isMobile}
            reducedMotion={reducedMotion}
            onNavigateStop={(stopId) => jumpToStop(stopId, reducedMotion)}
          />

          {!isMobile && (
            <JourneyProgress
              scrollYProgress={scrollYProgress}
              activeChapter={activeChapter}
              onSelectStop={(stopId) => jumpToStop(stopId, reducedMotion)}
            />
          )}

          <div className="viewport-bottom-hint" aria-hidden="true">
            <span>RENAULT CAPTUR 2025 · CAVEZZO</span>
            <span>SCORRI PER PROSEGUIRE</span>
          </div>
        </div>
      </div>
    </main>
  );
}
