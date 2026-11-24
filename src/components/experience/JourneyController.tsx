"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { JourneyStopId } from "@/data/journey";
import type { LicenceCategoryId } from "@/data/services";
import { smoothDamp, wrapAngle, type SmoothState } from "@/lib/motion";
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

/** Tempo di risposta del veicolo allo scroll (s): velocità continua, nessun colpo di avvio. */
const FOLLOW_SMOOTH_TIME = 0.22;
/** Velocità massima del veicolo (m/s): evita "teletrasporti" quando si salta tra tappe dal menu. */
const MAX_SPEED = 32;
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
  const initializedRef = useRef(false);

  // Unica posizione lisciata autorevole lungo la spline (parametro in lunghezza d'arco).
  const smoothedTRef = useRef(0.02);
  const trackVelocityRef = useRef<SmoothState>({ velocity: 0 });

  // Stato cinematico misurato dallo spostamento reale
  const carPositionRef = useRef(new THREE.Vector3(0, 0.8, 195));
  const carYawRef = useRef(Math.PI);
  const speedRef = useRef(0);
  const accelRef = useRef(0);
  const yawRateRef = useRef(0);
  const steerRef = useRef(0);
  const wheelRollRef = useRef(0);
  const headlightPowerRef = useRef(0.85);
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

    // Passo fisico limitato: dopo una pausa della scheda non si produce un salto.
    const dt = Math.max(0.001, Math.min(delta, 0.05));
    const targetT = THREE.MathUtils.clamp(trackProgressRef.current ?? 0.02, 0.004, 0.99);

    if (!initializedRef.current) {
      smoothedTRef.current = targetT;
      initializedRef.current = true;
    }

    const prevT = smoothedTRef.current;
    let nextT: number;
    if (reducedMotion) {
      nextT = targetT;
      trackVelocityRef.current.velocity = 0;
    } else {
      nextT = smoothDamp(
        prevT,
        targetT,
        trackVelocityRef.current,
        FOLLOW_SMOOTH_TIME,
        MAX_SPEED / curveLength,
        dt,
      );
      // Posizione perfettamente stabile da fermi (nessun micro-movimento asintotico)
      if (Math.abs(targetT - nextT) < 2e-6 && Math.abs(trackVelocityRef.current.velocity) < 1e-5) {
        nextT = targetT;
        trackVelocityRef.current.velocity = 0;
      }
    }
    smoothedTRef.current = nextT;

    // Cinematica misurata: distanza reale (m) -> velocità -> accelerazione. Con segno (retromarcia < 0).
    const distance = (nextT - prevT) * curveLength;
    const speed = distance / dt;
    const accel = THREE.MathUtils.clamp((speed - speedRef.current) / dt, -25, 25);
    speedRef.current = speed;
    accelRef.current = accel;

    // Rotolamento ruote = distanza / raggio, cumulativo e continuo (inverte con la retromarcia, si ferma da fermo)
    wheelRollRef.current += distance / WHEEL_RADIUS;

    const frame = writeRoadFrame(curve, nextT, frameRef.current);

    // Sterzo dalla curvatura reale della strada: delta = atan(L * curvatura)
    curve.getTangentAt(Math.min(0.996, nextT + STEER_LOOKAHEAD / curveLength), aheadTangentRef.current);
    const aheadYaw = Math.atan2(aheadTangentRef.current.x, aheadTangentRef.current.z);
    const curvature = wrapAngle(aheadYaw - frame.yaw) / STEER_LOOKAHEAD;
    steerRef.current = THREE.MathUtils.clamp(Math.atan(WHEELBASE * curvature), -0.5, 0.5);

    // Velocità di imbardata per il rollio della scocca
    yawRateRef.current = THREE.MathUtils.clamp(wrapAngle(frame.yaw - prevYawRef.current) / dt, -1.5, 1.5);
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
          accelRef={accelRef}
          yawRateRef={yawRateRef}
          steerRef={steerRef}
          wheelRollRef={wheelRollRef}
          headlightPowerRef={headlightPowerRef}
          brakingRef={brakingRef}
          highlighted={activeStopId === "patenti" && atStop && selectedCategory === "b"}
          castShadows={!isMobile}
          reducedMotion={reducedMotion}
        />
      </group>

      <CameraRig
        curve={curve}
        curveLength={curveLength}
        trackRef={smoothedTRef}
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
