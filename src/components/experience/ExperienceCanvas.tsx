"use client";

import { Component, Suspense, useEffect, useState, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PerformanceMonitor, useProgress } from "@react-three/drei";
import * as THREE from "three";
import type { JourneyStopId } from "@/data/journey";
import type { LicenceCategoryId } from "@/data/services";
import { isWebGLAvailable } from "@/lib/scene-config";
import JourneyController from "@/components/experience/JourneyController";

interface ExperienceCanvasProps {
  trackProgressRef: React.RefObject<number>;
  activeStopId: JourneyStopId;
  atStop: boolean;
  selectedCategory: LicenceCategoryId;
  isMobile: boolean;
  isSmallMobile: boolean;
  reducedMotion: boolean;
  onLoadProgress: (percent: number) => void;
  onSceneReady: () => void;
  onWebGLUnavailable: () => void;
}

class CanvasErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

/**
 * Qualità adattiva: se il frame rate scende in modo stabile riduce il pixel ratio,
 * e lo ripristina quando il dispositivo regge di nuovo. Non causa re-render React della scena.
 */
function AdaptiveQuality({ maxDpr }: { maxDpr: number }) {
  const setDpr = useThree((state) => state.setDpr);
  return (
    <PerformanceMonitor
      flipflops={3}
      onDecline={() => setDpr(1)}
      onIncline={() => setDpr(Math.min(window.devicePixelRatio, maxDpr))}
    />
  );
}

function AssetProgressBridge({ onLoadProgress }: { onLoadProgress: (percent: number) => void }) {
  const { progress } = useProgress();
  useEffect(() => {
    if (progress > 0) {
      onLoadProgress(Math.min(90, Math.round(15 + progress * 0.65)));
    }
  }, [progress, onLoadProgress]);
  return null;
}

export default function ExperienceCanvas({
  trackProgressRef,
  activeStopId,
  atStop,
  selectedCategory,
  isMobile,
  isSmallMobile,
  reducedMotion,
  onLoadProgress,
  onSceneReady,
  onWebGLUnavailable,
}: ExperienceCanvasProps) {
  const [webglSupported] = useState(() => isWebGLAvailable());
  const [isPageVisible, setIsPageVisible] = useState(true);

  useEffect(() => {
    if (!webglSupported) {
      onWebGLUnavailable();
    }
  }, [webglSupported, onWebGLUnavailable]);

  useEffect(() => {
    const handleVisibility = () => {
      setIsPageVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  if (!webglSupported) return null;

  const dprRange: [number, number] = isSmallMobile
    ? [1, 1.25]
    : isMobile
      ? [1, 1.4]
      : [1, 2];

  return (
    <CanvasErrorBoundary onError={onWebGLUnavailable}>
      <div className="experience-canvas-wrapper" aria-hidden="true">
        <Canvas
          frameloop={isPageVisible ? "always" : "never"}
          shadows={!isMobile}
          dpr={dprRange}
          camera={{ position: [3.2, 1.48, 150], fov: isMobile ? 46 : 36, near: 0.25, far: 650 }}
          gl={{
            antialias: !isSmallMobile,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.12,
          }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener(
              "webglcontextlost",
              (event) => {
                event.preventDefault();
                onWebGLUnavailable();
              },
              { once: true },
            );
          }}
        >
          <AssetProgressBridge onLoadProgress={onLoadProgress} />
          <Suspense fallback={null}>
            <AdaptiveQuality maxDpr={dprRange[1]} />
            <JourneyController
              trackProgressRef={trackProgressRef}
              activeStopId={activeStopId}
              atStop={atStop}
              selectedCategory={selectedCategory}
              isMobile={isMobile}
              reducedMotion={reducedMotion}
              onLoadProgress={onLoadProgress}
              onFirstFrameRendered={onSceneReady}
            />
          </Suspense>
        </Canvas>
      </div>
    </CanvasErrorBoundary>
  );
}
