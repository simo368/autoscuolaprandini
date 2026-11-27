"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { JourneyStopId } from "@/data/journey";
import type { LicenceCategoryId } from "@/data/services";
import { dampAngle, smoothDamp, smoothDampVec3, type SmoothState } from "@/lib/motion";
import { stopCameraPresets } from "@/lib/scene-config";

interface CameraRigProps {
  curve: THREE.CatmullRomCurve3;
  curveLength: number;
  /** Posizione lisciata del veicolo lungo la spline (unica fonte autorevole). */
  trackRef: React.RefObject<number>;
  carPositionRef: React.RefObject<THREE.Vector3>;
  carYawRef: React.RefObject<number>;
  speedRef: React.RefObject<number>;
  steerRef: React.RefObject<number>;
  activeStopId: JourneyStopId;
  atStop: boolean;
  selectedCategory: LicenceCategoryId;
  isMobile: boolean;
  reducedMotion: boolean;
}

const UP = new THREE.Vector3(0, 1, 0);
/** Distanza (m) davanti all'auto su cui il telecamera anticipa le curve. */
const ANTICIPATION_DISTANCE = 12;

export default function CameraRig({
  curve,
  curveLength,
  trackRef,
  carPositionRef,
  carYawRef,
  speedRef,
  steerRef,
  activeStopId,
  atStop,
  selectedCategory,
  isMobile,
  reducedMotion,
}: CameraRigProps) {
  const initializedRef = useRef(false);
  const modeRef = useRef<"driving" | "stop">("driving");
  const headingRef = useRef(Math.PI);
  const blendRef = useRef(1);
  const fovRef = useRef(40);
  const fovStateRef = useRef<SmoothState>({ velocity: 0 });

  // Oggetti riutilizzati nel loop (nessuna allocazione per frame)
  const scratch = useRef({
    pos: new THREE.Vector3(3.6, 2.5, 200),
    vel: new THREE.Vector3(),
    desiredPos: new THREE.Vector3(),
    localLook: new THREE.Vector3(),
    splineLook: new THREE.Vector3(),
    look: new THREE.Vector3(),
    offset: new THREE.Vector3(),
    lookOffset: new THREE.Vector3(),
    aheadPoint: new THREE.Vector3(),
    aheadTangent: new THREE.Vector3(),
    forward: new THREE.Vector3(),
    matrix: new THREE.Matrix4(),
    targetQuat: new THREE.Quaternion(),
  });

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const s = scratch.current;
    const camera = state.camera;
    const carPos = carPositionRef.current;
    const carYaw = carYawRef.current ?? Math.PI;
    const speed = speedRef.current ?? 0;
    const absSpeed = Math.abs(speed);
    const t = trackRef.current ?? 0;

    // Modalità con isteresi leggera: in guida nessun inseguimento ritardato dietro l'auto
    if (!atStop) {
      modeRef.current = "driving";
    } else if (modeRef.current === "driving" && absSpeed < 2.2) {
      modeRef.current = "stop";
    } else if (modeRef.current === "stop" && absSpeed > 4.5) {
      modeRef.current = "driving";
    }
    const driving = modeRef.current === "driving";
    const presetKey: JourneyStopId | "driving" = driving ? "driving" : activeStopId;

    const preset = stopCameraPresets[presetKey];
    const aspect = state.size.width / Math.max(1, state.size.height);
    const isPortraitMobile = isMobile && aspect < 0.95;
    const isLandscapeMobile = isMobile && aspect >= 0.95;

    const rawOffset = isPortraitMobile ? preset.offsetMobile : preset.offsetDesktop;
    const rawLook = isPortraitMobile ? preset.lookMobile : preset.lookDesktop;
    let targetFov = isPortraitMobile ? preset.fovMobile : preset.fovDesktop;

    // Adattamento aspect-ratio per schermi stretti (320px) e mobile landscape
    if (isPortraitMobile && aspect < 0.68) {
      targetFov = Math.min(58, targetFov + (0.68 - aspect) * 20);
    } else if (isLandscapeMobile) {
      targetFov = Math.max(38, preset.fovDesktop - 2);
    }

    s.offset.set(rawOffset[0], rawOffset[1], rawOffset[2]);
    s.lookOffset.set(rawLook[0], rawLook[1], rawLook[2]);

    // Leggero spostamento laterale in curva (la camera si apre verso l'esterno della curva)
    const steerNorm = THREE.MathUtils.clamp((steerRef.current ?? 0) / 0.08, -1, 1);
    if (driving) {
      s.offset.x -= steerNorm * 1.4;
    }

    // Inquadratura dedicata allo Stop 01 in base al veicolo selezionato (AM / A / B)
    if (presetKey === "patenti") {
      if (selectedCategory === "am") {
        if (isPortraitMobile) {
          s.offset.set(2.8, 1.85, 4.1);
          s.lookOffset.set(3.85, -0.25, 0.6);
        } else {
          s.offset.set(1.25, 1.8, 4.35);
          s.lookOffset.set(3.25, 0.65, 0.55);
        }
      } else if (selectedCategory === "a") {
        if (isPortraitMobile) {
          s.offset.set(4.8, 1.95, 6.2);
          s.lookOffset.set(6.0, -0.2, 2.7);
        } else {
          s.offset.set(3.15, 1.9, 6.35);
          s.lookOffset.set(5.25, 0.72, 2.65);
        }
      }
    }

    // Orientamento della ripresa: in guida anticipa la direzione della strada davanti all'auto
    let targetHeading = carYaw;
    if (driving) {
      const aheadT = THREE.MathUtils.clamp(t + ANTICIPATION_DISTANCE / curveLength, 0.002, 0.996);
      curve.getTangentAt(aheadT, s.aheadTangent);
      targetHeading = Math.atan2(s.aheadTangent.x, s.aheadTangent.z);
    }

    const snap = !initializedRef.current || reducedMotion;
    if (snap) {
      headingRef.current = targetHeading;
      blendRef.current = driving ? 1 : 0;
    } else {
      headingRef.current = dampAngle(headingRef.current, targetHeading, driving ? 24 : 5, dt);
      blendRef.current = THREE.MathUtils.damp(blendRef.current, driving ? 1 : 0, 6.5, dt);
    }
    const heading = headingRef.current;

    // Posizione desiderata nello spazio dell'auto, ruotata dalla direzione di ripresa
    s.desiredPos.copy(s.offset).applyAxisAngle(UP, heading).add(carPos);

    // Bersaglio dello sguardo: punto locale al veicolo (soste) o punto avanzato sulla spline (guida)
    s.localLook.copy(s.lookOffset).applyAxisAngle(UP, heading).add(carPos);

    const lookAheadT = THREE.MathUtils.clamp(t + Math.max(4, s.lookOffset.z) / curveLength, 0.002, 0.996);
    curve.getPointAt(lookAheadT, s.aheadPoint);
    s.splineLook.set(s.lookOffset.x, 0, 0).applyAxisAngle(UP, heading).add(s.aheadPoint);
    s.splineLook.y += s.lookOffset.y;

    s.look.copy(s.localLook).lerp(s.splineLook, blendRef.current);

    // In guida la camera segue con micro-damp ad alta reattività (nessuno scatto né ritardo);
    // nelle transizioni di sosta ammorbidisce solo il cambio d'inquadratura.
    if (snap) {
      s.pos.copy(s.desiredPos);
      s.vel.set(0, 0, 0);
    } else if (driving && blendRef.current > 0.985) {
      const alpha = 1 - Math.exp(-28 * dt);
      s.pos.lerp(s.desiredPos, alpha);
      s.vel.set(0, 0, 0);
    } else {
      smoothDampVec3(s.pos, s.desiredPos, s.vel, driving ? 0.06 : 0.28, dt);
    }
    camera.position.copy(s.pos);

    // Orientamento: slerp rapido verso la direzione di sguardo
    s.matrix.lookAt(s.pos, s.look, UP);
    s.targetQuat.setFromRotationMatrix(s.matrix);
    if (snap) {
      camera.quaternion.copy(s.targetQuat);
    } else {
      camera.quaternion.slerp(s.targetQuat, 1 - Math.exp(-(driving ? 28 : 8) * dt));
    }

    // Campo visivo: cambia solo tra preset, lentamente (nessun effetto "zoom di velocità")
    if (camera instanceof THREE.PerspectiveCamera) {
      if (snap) {
        fovRef.current = targetFov;
        fovStateRef.current.velocity = 0;
      } else {
        fovRef.current = smoothDamp(fovRef.current, targetFov, fovStateRef.current, 0.7, 40, dt);
      }
      if (Math.abs(camera.fov - fovRef.current) > 0.01) {
        camera.fov = fovRef.current;
        camera.updateProjectionMatrix();
      }
    }

    initializedRef.current = true;
  });

  return null;
}
