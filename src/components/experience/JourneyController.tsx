"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { JourneyStopId } from "@/data/journey";
import type { LicenceCategoryId } from "@/data/services";
import { createRoadCurve, getRoadFrameAtT } from "@/lib/scene-config";
import Road from "@/components/experience/Road";
import World from "@/components/experience/World";
import SceneEnvironment from "@/components/experience/Environment";
import Destinations from "@/components/experience/Destination";
import RenaultCaptur from "@/components/experience/RenaultCaptur";
import CameraRig from "@/components/experience/CameraRig";

interface JourneyControllerProps {
  trackProgressRef: React.RefObject<number>;
  activeStopId: JourneyStopId;
  atStop: boolean;
  selectedCategory: LicenceCategoryId;
  isMobile: boolean;
  reducedMotion: boolean;
  onLoadProgress: (percent: number) => void;
  onFirstFrameRendered: () => void;
}

export default function JourneyController({
  trackProgressRef,
  activeStopId,
  atStop,
  selectedCategory,
  isMobile,
  reducedMotion,
  onLoadProgress,
  onFirstFrameRendered,
}: JourneyControllerProps) {
  const curve = useMemo(() => createRoadCurve(), []);
  const curveLength = useMemo(() => curve.getLength(), [curve]);

  // Caricamento progressivo a stadi:
  // 1. Ambiente + Strada + Renault Captur (immediato)
  // 2. Destinazioni (frame successivo)
  // 3. Terreno e vegetazione (frame seguente)
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const firstFrameSentRef = useRef(false);

  useEffect(() => {
    onLoadProgress(40);
    const id1 = window.requestAnimationFrame(() => {
      setStage(2);
      onLoadProgress(72);
    });
    const id2 = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setStage(3);
        onLoadProgress(92);
      });
    });
    return () => {
      window.cancelAnimationFrame(id1);
      window.cancelAnimationFrame(id2);
    };
  }, [onLoadProgress]);

  const carGroupRef = useRef<THREE.Group>(null);
  const initializedTrackRef = useRef(false);
  const smoothedTRef = useRef(0.02);
  const carPositionRef = useRef(new THREE.Vector3(0, 0.8, 195));
  const carYawRef = useRef(Math.PI);
  const speedRef = useRef(0);
  const steerRef = useRef(0);
  const headlightPowerRef = useRef(0.85);
  const brakingRef = useRef(false);

  const aheadTangentRef = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (stage === 3 && !firstFrameSentRef.current) {
      firstFrameSentRef.current = true;
      onLoadProgress(100);
      onFirstFrameRendered();
    }

    const dt = Math.max(0.001, Math.min(delta, 0.05));
    const targetT = THREE.MathUtils.clamp(trackProgressRef.current ?? 0.02, 0.004, 0.99);

    if (!initializedTrackRef.current) {
      smoothedTRef.current = targetT;
      initializedTrackRef.current = true;
    }

    const prevT = smoothedTRef.current;
    const nextT = reducedMotion
      ? targetT
      : THREE.MathUtils.damp(prevT, targetT, 5.0, dt);

    smoothedTRef.current = nextT;

    const deltaT = nextT - prevT;
    const instantSpeed = (deltaT * curveLength) / dt;
    speedRef.current = THREE.MathUtils.damp(speedRef.current, instantSpeed, 10, dt);
    brakingRef.current = Math.abs(targetT - nextT) < 0.0022 || atStop;

    const frame = getRoadFrameAtT(curve, nextT);
    curve.getTangentAt(Math.min(0.996, nextT + 0.018), aheadTangentRef.current).normalize();

    const aheadYaw = Math.atan2(aheadTangentRef.current.x, aheadTangentRef.current.z);
    let deltaYaw = aheadYaw - frame.yaw;
    while (deltaYaw > Math.PI) deltaYaw -= Math.PI * 2;
    while (deltaYaw < -Math.PI) deltaYaw += Math.PI * 2;

    steerRef.current = THREE.MathUtils.clamp(deltaYaw * 2.1, -0.42, 0.42);

    carPositionRef.current.copy(frame.position);
    carYawRef.current = frame.yaw;

    if (carGroupRef.current) {
      carGroupRef.current.position.copy(frame.position);
      carGroupRef.current.rotation.set(frame.pitch, frame.yaw, -frame.bank, "YXZ");
    }
  });

  return (
    <>
      <SceneEnvironment
        trackProgressRef={smoothedTRef}
        headlightPowerRef={headlightPowerRef}
        isMobile={isMobile}
      />

      <Road curve={curve} isMobile={isMobile} />

      {stage >= 3 && <World curve={curve} isMobile={isMobile} />}

      {stage >= 2 && (
        <Destinations
          curve={curve}
          selectedCategory={selectedCategory}
          isMobile={isMobile}
        />
      )}

      <group ref={carGroupRef}>
        <RenaultCaptur
          speedRef={speedRef}
          steerRef={steerRef}
          headlightPowerRef={headlightPowerRef}
          brakingRef={brakingRef}
          highlighted={activeStopId === "patenti" && atStop && selectedCategory === "b"}
          castShadows={!isMobile}
        />
      </group>

      <CameraRig
        carPositionRef={carPositionRef}
        carYawRef={carYawRef}
        speedRef={speedRef}
        steerRef={steerRef}
        activeStopId={activeStopId}
        atStop={atStop}
        selectedCategory={selectedCategory}
        isMobile={isMobile}
        reducedMotion={reducedMotion}
      />
    </>
  );
}
