"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { carConfig } from "@/data/configuration";
import { ackermannAngles, type WheelSteerAngles } from "@/lib/vehicle";

export interface RenaultCapturProps {
  /** Velocità lineare con segno (m/s) lungo la strada (negativa in retromarcia). */
  speedRef: React.RefObject<number>;
  /** Accelerazione longitudinale (m/s²) misurata dallo spostamento reale. */
  accelRef: React.RefObject<number>;
  /** Velocità angolare di imbardata (rad/s) della strada sotto l'auto. */
  yawRateRef: React.RefObject<number>;
  /** Angolo di sterzo al centro dell'avantreno (rad), positivo = curva verso +X. */
  steerRef: React.RefObject<number>;
  /** Angolo cumulativo di rotolamento delle ruote (rad) = distanza percorsa / raggio. */
  wheelRollRef: React.RefObject<number>;
  /** Intensità fari [0..1] controllata dal passaggio Studio Ora Blu -> Mattino d'Oro. */
  headlightPowerRef: React.RefObject<number>;
  /** Indica se l'auto è ferma o sta frenando per intensificare le luci posteriori. */
  brakingRef: React.RefObject<boolean>;
  /** Evidenziazione extra quando è selezionata la Patente B allo Stop 01. */
  highlighted?: boolean;
  /** Usa il modello alleggerito su smartphone. */
  isMobile?: boolean;
  /** Disabilita ombre dinamiche su mobile per performance. */
  castShadows?: boolean;
  /** Disattiva beccheggio/rollio della scocca quando l'utente preferisce meno movimento. */
  reducedMotion?: boolean;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, 128, 256);
    const grad = ctx.createRadialGradient(64, 128, 12, 64, 128, 64);
    grad.addColorStop(0, "rgba(7, 11, 16, 0.72)");
    grad.addColorStop(0.55, "rgba(7, 11, 16, 0.36)");
    grad.addColorStop(1, "rgba(7, 11, 16, 0)");
    ctx.fillStyle = grad;
    ctx.scale(1, 2);
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Sostituisce il vecchio modello procedurale con la Renault Captur 2025 reale (GLB locale).
 * Mantiene il controllo deterministico di rotolamento ruote, sterzo Ackermann, fari e luci posteriori.
 */
export default function RenaultCaptur({
  speedRef,
  accelRef,
  yawRateRef,
  steerRef,
  wheelRollRef,
  headlightPowerRef,
  brakingRef,
  highlighted = false,
  isMobile = false,
  castShadows = true,
  reducedMotion = false,
}: RenaultCapturProps) {
  const modelUrl =
    isMobile && carConfig.mobileModelUrl
      ? carConfig.mobileModelUrl
      : (carConfig.customModelUrl ?? "/models/renault-captur-2025.glb");

  const gltf = useGLTF(modelUrl, false, true);

  const chassisRef = useRef<THREE.Group>(null);
  const wheelRefs = useRef<{
    fl: THREE.Object3D | null;
    fr: THREE.Object3D | null;
    rl: THREE.Object3D | null;
    rr: THREE.Object3D | null;
  }>({ fl: null, fr: null, rl: null, rr: null });
  const tailMatRef = useRef<THREE.MeshPhysicalMaterial | null>(null);

  const headSpotLeftRef = useRef<THREE.SpotLight>(null);
  const headSpotRightRef = useRef<THREE.SpotLight>(null);
  const beamLeftMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const beamRightMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const highlightSpotRef = useRef<THREE.PointLight>(null);
  const steerAnglesRef = useRef<WheelSteerAngles>({ plusX: 0, minusX: 0 });

  const spotTargetLeft = useMemo(() => {
    const obj = new THREE.Object3D();
    obj.position.set(-0.52, 0.05, 19);
    return obj;
  }, []);

  const spotTargetRight = useMemo(() => {
    const obj = new THREE.Object3D();
    obj.position.set(0.52, 0.05, 19);
    return obj;
  }, []);

  const contactShadowTex = useMemo(() => createContactShadowTexture(), []);
  const coneGeo = useMemo(() => {
    const geo = new THREE.ConeGeometry(1.65, 10.5, 22, 1, true);
    geo.translate(0, -5.25, 0);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  // Clona scena e materiali per evitare mutazioni condivise e applica finish PBR da studio
  const { clonedScene, autoOffset, autoRotationY, clonedMaterials } = useMemo(() => {
    const root = gltf.scene.clone(true);
    const createdMaterials: THREE.Material[] = [];
    const matCache = new Map<string, THREE.Material>();

    const upgradeMaterial = (orig: THREE.Material): THREE.Material => {
      const key = orig.uuid;
      const cached = matCache.get(key);
      if (cached) return cached;

      const std = orig as THREE.MeshStandardMaterial;
      const name = (orig.name || "").toLowerCase();
      let next: THREE.Material;

      if (name.includes("paint_1")) {
        // Carrozzeria principale metallizzata: clearcoat su desktop, PBR leggero su mobile
        next = isMobile
          ? new THREE.MeshStandardMaterial({
              color: std.color ? std.color.clone() : new THREE.Color(carConfig.paintColor),
              metalness: 0.72,
              roughness: 0.2,
              envMapIntensity: 1.65,
            })
          : new THREE.MeshPhysicalMaterial({
              color: std.color ? std.color.clone() : new THREE.Color(carConfig.paintColor),
              metalness: 0.72,
              roughness: 0.21,
              clearcoat: 1.0,
              clearcoatRoughness: 0.055,
              envMapIntensity: 1.75,
            });
      } else if (name.includes("translucent_glass_dark_green")) {
        // Gruppi ottici posteriori rossi
        const tail = new THREE.MeshStandardMaterial({
          color: new THREE.Color("#7E1216"),
          emissive: new THREE.Color("#E52424"),
          emissiveIntensity: 1.4,
          metalness: 0.15,
          roughness: 0.14,
          transparent: true,
          opacity: 0.9,
          envMapIntensity: 1.4,
        });
        tail.userData.isTailLamp = true;
        next = tail;
      } else if (name.includes("translucent_glass") || name.includes("color_m03")) {
        // Cristalli e vetri fumé riflettenti
        next = isMobile
          ? new THREE.MeshStandardMaterial({
              color: new THREE.Color("#141C24"),
              metalness: 0.2,
              roughness: 0.08,
              transparent: true,
              opacity: 0.72,
              envMapIntensity: 1.75,
            })
          : new THREE.MeshPhysicalMaterial({
              color: new THREE.Color("#141C24"),
              metalness: 0.12,
              roughness: 0.05,
              clearcoat: 1.0,
              clearcoatRoughness: 0.04,
              transparent: true,
              opacity: 0.68,
              envMapIntensity: 1.95,
            });
      } else if (name.includes("color_m06")) {
        // Tetto e dettagli nero lucido / antracite
        next = isMobile
          ? new THREE.MeshStandardMaterial({
              color: std.color ? std.color.clone() : new THREE.Color("#222930"),
              metalness: 0.45,
              roughness: 0.24,
              envMapIntensity: 1.35,
            })
          : new THREE.MeshPhysicalMaterial({
              color: std.color ? std.color.clone() : new THREE.Color("#222930"),
              metalness: 0.45,
              roughness: 0.22,
              clearcoat: 0.9,
              clearcoatRoughness: 0.08,
              envMapIntensity: 1.45,
            });
      } else if (name.includes("color_m01") || name.includes("whitesmoke")) {
        // Dettagli satinati / inserti chiari / loghi cerchi
        next = new THREE.MeshStandardMaterial({
          color: std.color ? std.color.clone() : new THREE.Color("#E4E8EC"),
          metalness: 0.86,
          roughness: 0.22,
          envMapIntensity: 1.5,
        });
      } else if (name.includes("auto_13")) {
        // Pneumatici, cerchi, modanature SUV e sottoscocca
        next = new THREE.MeshStandardMaterial({
          color: new THREE.Color("#262B31"),
          metalness: 0.24,
          roughness: 0.56,
          envMapIntensity: 1.15,
        });
      } else {
        // Materiali con texture (targa, fari/specchi)
        const cloned = orig.clone() as THREE.MeshStandardMaterial;
        if (cloned.isMeshStandardMaterial) {
          cloned.envMapIntensity = 1.35;
          cloned.roughness = Math.min(cloned.roughness ?? 0.5, 0.48);
        }
        next = cloned;
      }

      next.side = THREE.DoubleSide;
      matCache.set(key, next);
      createdMaterials.push(next);
      return next;
    };

    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = castShadows;
        mesh.receiveShadow = true;
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map(upgradeMaterial);
        } else if (mesh.material) {
          mesh.material = upgradeMaterial(mesh.material);
        }
      }
    });

    // Individua i 4 pivot ruota se presenti nel GLB ottimizzato
    const fl = root.getObjectByName("wheel_fl") ?? null;
    const fr = root.getObjectByName("wheel_fr") ?? null;
    const rl = root.getObjectByName("wheel_rl") ?? null;
    const rr = root.getObjectByName("wheel_rr") ?? null;

    for (const w of [fl, fr, rl, rr]) {
      if (w) w.rotation.order = "YXZ";
    }

    // Safety check: se un GLB esterno non è pre-centrato, allinealo automaticamente
    const box = new THREE.Box3().setFromObject(root);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const isAlreadyNormalized =
      Math.abs(box.min.y) < 0.05 && Math.abs(center.x) < 0.15 && Math.abs(center.z) < 0.25;

    const offset: [number, number, number] = isAlreadyNormalized
      ? [0, 0, 0]
      : [-center.x, -box.min.y, -center.z];

    // Se un GLB grezzo Sketchfab non è ruotato verso +Z (ha front verso -Z), orientalo
    const rotY = fl ? 0 : isAlreadyNormalized ? 0 : Math.PI;

    return {
      clonedScene: root,
      autoOffset: offset,
      autoRotationY: rotY,
      clonedMaterials: createdMaterials,
    };
  }, [gltf.scene, castShadows, isMobile]);

  useEffect(() => {
    const chassis = chassisRef.current;
    if (!chassis) return;

    wheelRefs.current = {
      fl: chassis.getObjectByName("wheel_fl") ?? null,
      fr: chassis.getObjectByName("wheel_fr") ?? null,
      rl: chassis.getObjectByName("wheel_rl") ?? null,
      rr: chassis.getObjectByName("wheel_rr") ?? null,
    };

    let foundTail: THREE.MeshPhysicalMaterial | null = null;
    chassis.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          if (m && m.userData?.isTailLamp) {
            foundTail = m as THREE.MeshPhysicalMaterial;
          }
        }
      }
    });
    tailMatRef.current = foundTail;
  }, [clonedScene]);

  useEffect(() => {
    return () => {
      contactShadowTex.dispose();
      coneGeo.dispose();
      clonedMaterials.forEach((m) => m.dispose());
    };
  }, [contactShadowTex, coneGeo, clonedMaterials]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const speed = speedRef.current ?? 0;
    const accel = accelRef.current ?? 0;
    const yawRate = yawRateRef.current ?? 0;
    const beamPower = headlightPowerRef.current ?? 0.6;
    const isBraking = brakingRef.current ?? false;

    // 1. Ruote: rotolamento deterministico legato alla posizione sullo scroll + sterzo Ackermann
    const roll = wheelRollRef.current ?? 0;
    const angles = ackermannAngles(steerRef.current ?? 0, steerAnglesRef.current);
    const { fl, fr, rl, rr } = wheelRefs.current;

    if (fl) {
      fl.rotation.x = roll;
      fl.rotation.y = reducedMotion
        ? angles.plusX
        : THREE.MathUtils.damp(fl.rotation.y, angles.plusX, 14, dt);
    }
    if (fr) {
      fr.rotation.x = roll;
      fr.rotation.y = reducedMotion
        ? angles.minusX
        : THREE.MathUtils.damp(fr.rotation.y, angles.minusX, 14, dt);
    }
    if (rl) rl.rotation.x = roll;
    if (rr) rr.rotation.x = roll;

    // 2. Scocca: leggero assetto sulle sospensioni solo durante il movimento reale
    if (chassisRef.current) {
      const lateralAccel = speed * yawRate;
      const calm = reducedMotion || Math.abs(speed) < 0.05 ? 0 : 1;
      const targetPitch = THREE.MathUtils.clamp(-accel * 0.0018, -0.012, 0.012) * calm;
      const targetRoll = THREE.MathUtils.clamp(lateralAccel * 0.0028, -0.016, 0.016) * calm;
      const targetHeave =
        -THREE.MathUtils.clamp(Math.abs(accel) * 0.0006 + Math.abs(lateralAccel) * 0.0005, 0, 0.01) * calm;

      const chassis = chassisRef.current;
      if (reducedMotion) {
        chassis.rotation.set(0, 0, 0);
        chassis.position.y = 0;
      } else {
        chassis.rotation.x = THREE.MathUtils.damp(chassis.rotation.x, targetPitch, 9, dt);
        chassis.rotation.z = THREE.MathUtils.damp(chassis.rotation.z, targetRoll, 9, dt);
        chassis.position.y = THREE.MathUtils.damp(chassis.position.y, targetHeave, 9, dt);
      }
    }

    // 3. Fari e gruppi ottici
    const spotIntensity = 26 * beamPower;
    if (headSpotLeftRef.current) headSpotLeftRef.current.intensity = spotIntensity;
    if (headSpotRightRef.current) headSpotRightRef.current.intensity = spotIntensity;
    if (beamLeftMatRef.current) beamLeftMatRef.current.opacity = 0.04 * beamPower;
    if (beamRightMatRef.current) beamRightMatRef.current.opacity = 0.04 * beamPower;

    if (tailMatRef.current) {
      const targetGlow = isBraking ? 2.8 : 1.35;
      tailMatRef.current.emissiveIntensity = THREE.MathUtils.damp(
        tailMatRef.current.emissiveIntensity,
        targetGlow,
        10,
        dt,
      );
    }

    if (highlightSpotRef.current) {
      highlightSpotRef.current.intensity = THREE.MathUtils.damp(
        highlightSpotRef.current.intensity,
        highlighted ? 12 : 0,
        6,
        dt,
      );
    }
  });

  return (
    <group>
      {!isMobile && (
        <pointLight
          ref={highlightSpotRef}
          position={[0, 3.0, 1.4]}
          color="#FFF3DF"
          intensity={0}
          distance={8}
          decay={2}
        />
      )}

      {/* Ombra morbida di contatto a terra sotto la Captur */}
      <mesh position={[0, 0.015, 0.06]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <planeGeometry args={[2.55, 4.75]} />
        <meshBasicMaterial
          map={contactShadowTex}
          transparent
          opacity={0.78}
          depthWrite={false}
        />
      </mesh>

      <group ref={chassisRef}>
        <group position={autoOffset} rotation={[0, autoRotationY, 0]}>
          <primitive object={clonedScene} />
        </group>

        {/* Fari anteriori caldi: spotLight solo su desktop, coni volumetrici leggeri ovunque */}
        {!isMobile && (
          <>
            <primitive object={spotTargetLeft} />
            <primitive object={spotTargetRight} />
            <spotLight
              ref={headSpotLeftRef}
              position={[-0.62, 0.84, 2.02]}
              target={spotTargetLeft}
              angle={0.44}
              penumbra={0.68}
              intensity={24}
              distance={34}
              decay={1.7}
              color="#FFF2D9"
            />
            <spotLight
              ref={headSpotRightRef}
              position={[0.62, 0.84, 2.02]}
              target={spotTargetRight}
              angle={0.44}
              penumbra={0.68}
              intensity={24}
              distance={34}
              decay={1.7}
              color="#FFF2D9"
            />
          </>
        )}
        <mesh geometry={coneGeo} position={[-0.62, 0.82, 2.02]}>
          <meshBasicMaterial
            ref={beamLeftMatRef}
            color="#FFF2DA"
            transparent
            opacity={0.04}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh geometry={coneGeo} position={[0.62, 0.82, 2.02]}>
          <meshBasicMaterial
            ref={beamRightMatRef}
            color="#FFF2DA"
            transparent
            opacity={0.04}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}
