"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { START_TRACK_T, type JourneyStopId } from "@/data/journey";
import type { LicenceCategoryId } from "@/data/services";
import { wrapAngle } from "@/lib/motion";
import { createRoadCurve, createRoadFrame, writeRoadFrame } from "@/lib/scene-config";
import { WHEELBASE, WHEEL_RADIUS } from "@/lib/vehicle";
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

/** Distanza di osservazione per calcolare la curvatura e quindi lo sterzo (m). */
const STEER_LOOKAHEAD = 6;

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
  // 1. Ambiente + Strada + Renault Captur GLB (immediato)
  // 2. Destinazioni (frame successivo)
  // 3. Terreno e vegetazione (frame seguente)
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const firstFrameSentRef = useRef(false);

  useEffect(() => {
    onLoadProgress(55);
    const id1 = window.requestAnimationFrame(() => {
      setStage(2);
      onLoadProgress(80);
    });
    const id2 = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setStage(3);
        onLoadProgress(95);
      });
    });
    return () => {
      window.cancelAnimationFrame(id1);
      window.cancelAnimationFrame(id2);
    };
  }, [onLoadProgress]);

  const carGroupRef = useRef<THREE.Group>(null);
  const currentTRef = useRef(START_TRACK_T);

  // Stato cinematico derivato esclusivamente dallo spostamento reale dello scroll
  const carPositionRef = useRef(new THREE.Vector3(0, 0.85, 145));
  const carYawRef = useRef(Math.PI);
  const speedRef = useRef(0);
  const accelRef = useRef(0);
  const yawRateRef = useRef(0);
  const steerRef = useRef(0);
  const wheelRollRef = useRef(0);
  const headlightPowerRef = useRef(0.95);
  const brakingRef = useRef(false);

  // Oggetti riutilizzati nel loop: nessuna allocazione per frame
  const frameRef = useRef(createRoadFrame());
  const aheadTangentRef = useRef(new THREE.Vector3());
  const prevYawRef = useRef(Math.PI);

  useFrame((_, delta) => {
    if (stage === 3 && !firstFrameSentRef.current) {
      firstFrameSentRef.current = true;
      onLoadProgress(100);
      onFirstFrameRendered();
    }

    const dt = Math.max(0.001, Math.min(delta, 0.05));

    // Micro-interpolazione ad alta reattività (lambda = 28, ~100ms di assestamento):
    // elimina gli scatti tra un evento rotella e il successivo a 60/120fps,
    // senza introdurre inerzia autonoma dopo che l'utente si è fermato.
    const prevT = currentTRef.current;
    const targetT = THREE.MathUtils.clamp(trackProgressRef.current ?? START_TRACK_T, 0.004, 0.99);
    let nextT: number;
    if (reducedMotion || Math.abs(targetT - prevT) < 1e-5) {
      nextT = targetT;
    } else {
      nextT = THREE.MathUtils.damp(prevT, targetT, 28, dt);
      if (Math.abs(targetT - nextT) < 1e-5) {
        nextT = targetT;
      }
    }
    currentTRef.current = nextT;

    const deltaT = nextT - prevT;
    const distance = deltaT * curveLength;
    const speed = Math.abs(deltaT) < 1e-7 ? 0 : distance / dt;
    const accel =
      Math.abs(deltaT) < 1e-7
        ? 0
        : THREE.MathUtils.clamp((speed - speedRef.current) / dt, -25, 25);
    speedRef.current = speed;
    accelRef.current = accel;

    // Rotolamento ruote deterministico rispetto alla posizione lungo il percorso (zero drift)
    wheelRollRef.current = ((nextT - START_TRACK_T) * curveLength) / WHEEL_RADIUS;

    const frame = writeRoadFrame(curve, nextT, frameRef.current);

    // Sterzo dalla curvatura reale della strada
    curve.getTangentAt(Math.min(0.996, nextT + STEER_LOOKAHEAD / curveLength), aheadTangentRef.current);
    const aheadYaw = Math.atan2(aheadTangentRef.current.x, aheadTangentRef.current.z);
    const curvature = wrapAngle(aheadYaw - frame.yaw) / STEER_LOOKAHEAD;
    steerRef.current = THREE.MathUtils.clamp(Math.atan(WHEELBASE * curvature), -0.5, 0.5);

    yawRateRef.current =
      Math.abs(deltaT) < 1e-7
        ? 0
        : THREE.MathUtils.clamp(wrapAngle(frame.yaw - prevYawRef.current) / dt, -1.5, 1.5);
    prevYawRef.current = frame.yaw;

    brakingRef.current = atStop || (speed * accel < 0 && Math.abs(accel) > 1.2);

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
        trackProgressRef={currentTRef}
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
          accelRef={accelRef}
          yawRateRef={yawRateRef}
          steerRef={steerRef}
          wheelRollRef={wheelRollRef}
          headlightPowerRef={headlightPowerRef}
          brakingRef={brakingRef}
          highlighted={activeStopId === "patenti" && atStop && selectedCategory === "b"}
          isMobile={isMobile}
          castShadows={!isMobile}
          reducedMotion={reducedMotion}
        />
      </group>

      <CameraRig
        curve={curve}
        curveLength={curveLength}
        trackRef={currentTRef}
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
