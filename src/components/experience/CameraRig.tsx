"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { JourneyStopId } from "@/data/journey";
import type { LicenceCategoryId } from "@/data/services";
import { stopCameraPresets } from "@/lib/scene-config";

interface CameraRigProps {
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

export default function CameraRig({
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
  const currentPosRef = useRef(new THREE.Vector3(3.6, 2.5, 200));
  const currentLookRef = useRef(new THREE.Vector3(0, 1.5, 194));

  const scratchRef = useRef({
    desiredPos: new THREE.Vector3(),
    desiredLook: new THREE.Vector3(),
    offset: new THREE.Vector3(),
    lookOffset: new THREE.Vector3(),
  });

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const carPos = carPositionRef.current;
    const yaw = carYawRef.current ?? Math.PI;
    const speed = Math.abs(speedRef.current ?? 0);
    const steer = steerRef.current ?? 0;
    const scratch = scratchRef.current;
    const camera = state.camera;

    const presetKey: JourneyStopId | "driving" =
      activeStopId === "intro" && atStop
        ? "intro"
        : atStop && speed < 1.8
          ? activeStopId
          : "driving";

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

    scratch.offset.set(rawOffset[0], rawOffset[1], rawOffset[2]);
    scratch.lookOffset.set(rawLook[0], rawLook[1], rawLook[2]);

    // Anticipazione cinematografica nelle curve: la camera guarda dentro la curva
    // e si apre leggermente sul fianco esterno per mostrare il paesaggio
    if (presetKey === "driving") {
      scratch.lookOffset.x += steer * 5.2;
      scratch.offset.x -= steer * 2.4;
    }

    // Inquadratura dedicata allo Stop 01 in base al veicolo selezionato (AM / A / B)
    if (presetKey === "patenti") {
      if (selectedCategory === "am") {
        scratch.offset.x -= 0.7;
        scratch.lookOffset.x += 1.35;
        scratch.lookOffset.z += 0.25;
      } else if (selectedCategory === "a") {
        scratch.offset.x -= 1.0;
        scratch.offset.z += 1.05;
        scratch.lookOffset.x += 1.95;
        scratch.lookOffset.z += 1.1;
      }
    }

    scratch.offset.applyAxisAngle(UP, yaw);
    scratch.lookOffset.applyAxisAngle(UP, yaw);

    scratch.desiredPos.copy(carPos).add(scratch.offset);
    scratch.desiredLook.copy(carPos).add(scratch.lookOffset);

    if (!initializedRef.current || reducedMotion) {
      currentPosRef.current.copy(scratch.desiredPos);
      currentLookRef.current.copy(scratch.desiredLook);
      initializedRef.current = true;
    } else {
      const damping = presetKey === "driving" ? 4.4 : 3.0;
      currentPosRef.current.x = THREE.MathUtils.damp(
        currentPosRef.current.x,
        scratch.desiredPos.x,
        damping,
        dt,
      );
      currentPosRef.current.y = THREE.MathUtils.damp(
        currentPosRef.current.y,
        scratch.desiredPos.y,
        damping,
        dt,
      );
      currentPosRef.current.z = THREE.MathUtils.damp(
        currentPosRef.current.z,
        scratch.desiredPos.z,
        damping,
        dt,
      );

      currentLookRef.current.x = THREE.MathUtils.damp(
        currentLookRef.current.x,
        scratch.desiredLook.x,
        damping + 0.9,
        dt,
      );
      currentLookRef.current.y = THREE.MathUtils.damp(
        currentLookRef.current.y,
        scratch.desiredLook.y,
        damping + 0.9,
        dt,
      );
      currentLookRef.current.z = THREE.MathUtils.damp(
        currentLookRef.current.z,
        scratch.desiredLook.z,
        damping + 0.9,
        dt,
      );
    }

    camera.position.copy(currentPosRef.current);
    camera.lookAt(currentLookRef.current);

    if (camera instanceof THREE.PerspectiveCamera) {
      const speedFovBoost = presetKey === "driving" ? Math.min(3.2, speed * 0.14) : 0;
      const desiredFov = targetFov + speedFovBoost;
      if (Math.abs(camera.fov - desiredFov) > 0.05) {
        camera.fov = reducedMotion
          ? desiredFov
          : THREE.MathUtils.damp(camera.fov, desiredFov, 4, dt);
        camera.updateProjectionMatrix();
      }
    }
  });

  return null;
}
