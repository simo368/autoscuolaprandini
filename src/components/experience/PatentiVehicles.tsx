"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { LicenceCategoryId } from "@/data/services";
import { createStoneTexture } from "@/lib/textures";

interface PatentiVehiclesProps {
  selectedCategory: LicenceCategoryId;
  castShadows?: boolean;
}

/**
 * Veicoli 3D dedicati allo Stop 01 (Le Patenti), integrati su pedane in pietra chiara
 * attorno alla rotatoria paesaggistica:
 * - Scooter / Ciclomotore 3D (Patente AM)
 * - Motociclo Naked 3D (Patente A)
 */
export default function PatentiVehicles({
  selectedCategory,
  castShadows = true,
}: PatentiVehiclesProps) {
  const amSpotRef = useRef<THREE.PointLight>(null);
  const aSpotRef = useRef<THREE.PointLight>(null);
  const amRingMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const aRingMatRef = useRef<THREE.MeshStandardMaterial>(null);

  const { stoneTex, scooterShieldGeo, motoTankGeo, exhaustGeo, materials } = useMemo(() => {
    const sTex = createStoneTexture();

    // Scudo sagomato scooter
    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(-0.18, 0);
    shieldShape.quadraticCurveTo(-0.2, 0.42, -0.14, 0.68);
    shieldShape.lineTo(0.14, 0.68);
    shieldShape.quadraticCurveTo(0.2, 0.42, 0.18, 0);
    shieldShape.closePath();
    const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 3,
    });
    shieldGeo.center();

    // Serbatoio scolpito motociclo
    const tankShape = new THREE.Shape();
    tankShape.moveTo(-0.28, -0.06);
    tankShape.quadraticCurveTo(-0.12, 0.16, 0.14, 0.14);
    tankShape.quadraticCurveTo(0.28, 0.08, 0.3, -0.08);
    tankShape.lineTo(-0.28, -0.06);
    const tankGeo = new THREE.ExtrudeGeometry(tankShape, {
      depth: 0.28,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.04,
      bevelSegments: 4,
    });
    tankGeo.center();
    tankGeo.rotateY(Math.PI / 2);

    // Scarico curvo TubeGeometry
    const exCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.16, 0.38, 0.18),
      new THREE.Vector3(0.21, 0.26, -0.12),
      new THREE.Vector3(0.22, 0.33, -0.62),
    ]);
    const exGeo = new THREE.TubeGeometry(exCurve, 14, 0.038, 10, false);

    const bodyIvory = new THREE.MeshPhysicalMaterial({
      color: "#F3F1E9",
      metalness: 0.25,
      roughness: 0.24,
      clearcoat: 0.9,
    });
    const bodySage = new THREE.MeshPhysicalMaterial({
      color: "#879B88",
      metalness: 0.52,
      roughness: 0.24,
      clearcoat: 0.95,
    });
    const bodySlate = new THREE.MeshPhysicalMaterial({
      color: "#26343B",
      metalness: 0.62,
      roughness: 0.25,
      clearcoat: 0.85,
    });
    const matte = new THREE.MeshStandardMaterial({
      color: "#1F262B",
      roughness: 0.82,
      metalness: 0.14,
    });
    const chrome = new THREE.MeshStandardMaterial({
      color: "#DDE4EA",
      metalness: 0.92,
      roughness: 0.16,
    });
    const headlight = new THREE.MeshStandardMaterial({
      color: "#FAFAF7",
      emissive: "#FFF2DA",
      emissiveIntensity: 1.8,
    });
    const plinth = new THREE.MeshStandardMaterial({
      map: sTex,
      color: "#ECE7DB",
      roughness: 0.72,
      metalness: 0.05,
    });

    return {
      stoneTex: sTex,
      scooterShieldGeo: shieldGeo,
      motoTankGeo: tankGeo,
      exhaustGeo: exGeo,
      materials: { bodyIvory, bodySage, bodySlate, matte, chrome, headlight, plinth },
    };
  }, []);

  useEffect(() => {
    return () => {
      stoneTex.dispose();
      scooterShieldGeo.dispose();
      motoTankGeo.dispose();
      exhaustGeo.dispose();
      Object.values(materials).forEach((m) => m.dispose());
    };
  }, [stoneTex, scooterShieldGeo, motoTankGeo, exhaustGeo, materials]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const amActive = selectedCategory === "am";
    const aActive = selectedCategory === "a";

    if (amSpotRef.current) {
      amSpotRef.current.intensity = THREE.MathUtils.damp(
        amSpotRef.current.intensity,
        amActive ? 10 : 2,
        6,
        dt,
      );
    }
    if (aSpotRef.current) {
      aSpotRef.current.intensity = THREE.MathUtils.damp(
        aSpotRef.current.intensity,
        aActive ? 10 : 2,
        6,
        dt,
      );
    }
    if (amRingMatRef.current) {
      amRingMatRef.current.emissiveIntensity = THREE.MathUtils.damp(
        amRingMatRef.current.emissiveIntensity,
        amActive ? 1.8 : 0.2,
        6,
        dt,
      );
    }
    if (aRingMatRef.current) {
      aRingMatRef.current.emissiveIntensity = THREE.MathUtils.damp(
        aRingMatRef.current.emissiveIntensity,
        aActive ? 1.8 : 0.2,
        6,
        dt,
      );
    }
  });

  return (
    <group>
      {/* === BAY 01: SCOOTER / CICLOMOTORE (PATENTE AM) === */}
      <group position={[4.5, 0.02, 0.4]} rotation={[0, -0.58, 0]}>
        <mesh material={materials.plinth} position={[0, 0.05, 0]} receiveShadow>
          <cylinderGeometry args={[1.38, 1.46, 0.1, 36]} />
        </mesh>
        <mesh position={[0, 0.104, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.26, 1.34, 48]} />
          <meshStandardMaterial
            ref={amRingMatRef}
            color="#D7AD78"
            emissive="#D7AD78"
            emissiveIntensity={0.2}
          />
        </mesh>
        <pointLight ref={amSpotRef} position={[0, 2.3, 0.6]} color="#FFF2DB" intensity={2} distance={6} decay={2} />

        <group position={[0, 0.1, 0]}>
          <mesh material={materials.matte} position={[0, 0.22, 0.62]} rotation={[0, 0, Math.PI / 2]} castShadow={castShadows}>
            <cylinderGeometry args={[0.22, 0.22, 0.11, 24]} />
          </mesh>
          <mesh material={materials.chrome} position={[0, 0.22, 0.62]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.13, 0.13, 0.12, 16]} />
          </mesh>
          <mesh material={materials.matte} position={[0, 0.21, -0.56]} rotation={[0, 0, Math.PI / 2]} castShadow={castShadows}>
            <cylinderGeometry args={[0.21, 0.21, 0.12, 24]} />
          </mesh>
          <mesh material={materials.chrome} position={[0, 0.21, -0.56]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.12, 0.12, 0.13, 16]} />
          </mesh>

          <mesh material={materials.matte} position={[0, 0.26, 0.05]}>
            <boxGeometry args={[0.34, 0.06, 0.72]} />
          </mesh>
          <mesh
            geometry={scooterShieldGeo}
            material={materials.bodyIvory}
            position={[0, 0.62, 0.45]}
            rotation={[-0.24, 0, 0]}
            castShadow={castShadows}
          />
          <mesh material={materials.headlight} position={[0, 0.76, 0.53]} rotation={[-0.24, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.04, 16]} />
          </mesh>

          <mesh material={materials.bodyIvory} position={[0, 0.56, -0.35]} castShadow={castShadows}>
            <boxGeometry args={[0.36, 0.32, 0.7]} />
          </mesh>
          <mesh material={materials.bodySlate} position={[0, 0.76, -0.28]}>
            <boxGeometry args={[0.28, 0.1, 0.6]} />
          </mesh>
          <mesh material={materials.chrome} position={[0, 0.62, 0.55]} rotation={[-0.24, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.72, 10]} />
          </mesh>
          <mesh material={materials.bodySlate} position={[0, 1.0, 0.38]}>
            <boxGeometry args={[0.56, 0.075, 0.13]} />
          </mesh>
          {[-0.24, 0.24].map((mx) => (
            <group key={`am-mirror-${mx}`} position={[mx, 1.12, 0.38]}>
              <mesh material={materials.chrome} position={[0, -0.06, 0]}>
                <cylinderGeometry args={[0.009, 0.009, 0.12, 8]} />
              </mesh>
              <mesh material={materials.matte}>
                <boxGeometry args={[0.09, 0.05, 0.03]} />
              </mesh>
            </group>
          ))}
          <mesh material={materials.chrome} position={[0.19, 0.24, -0.44]} rotation={[Math.PI / 2 - 0.12, 0, 0]}>
            <cylinderGeometry args={[0.038, 0.046, 0.5, 12]} />
          </mesh>
        </group>
      </group>

      {/* === BAY 02: MOTOCICLO NAKED (PATENTE A) === */}
      <group position={[6.9, 0.02, 3.1]} rotation={[0, -0.78, 0]}>
        <mesh material={materials.plinth} position={[0, 0.05, 0]} receiveShadow>
          <cylinderGeometry args={[1.58, 1.66, 0.1, 36]} />
        </mesh>
        <mesh position={[0, 0.104, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.46, 1.54, 48]} />
          <meshStandardMaterial
            ref={aRingMatRef}
            color="#D7AD78"
            emissive="#D7AD78"
            emissiveIntensity={0.2}
          />
        </mesh>
        <pointLight ref={aSpotRef} position={[0, 2.5, 0.8]} color="#FFF2DB" intensity={2} distance={6} decay={2} />

        <group position={[0, 0.1, 0]}>
          <mesh material={materials.matte} position={[0, 0.31, 0.76]} rotation={[0, 0, Math.PI / 2]} castShadow={castShadows}>
            <cylinderGeometry args={[0.31, 0.31, 0.13, 28]} />
          </mesh>
          <mesh material={materials.chrome} position={[0, 0.31, 0.76]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.21, 0.21, 0.14, 18]} />
          </mesh>
          <mesh material={materials.matte} position={[0, 0.31, -0.72]} rotation={[0, 0, Math.PI / 2]} castShadow={castShadows}>
            <cylinderGeometry args={[0.31, 0.31, 0.17, 28]} />
          </mesh>
          <mesh material={materials.chrome} position={[0, 0.31, -0.72]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.21, 0.21, 0.18, 18]} />
          </mesh>

          <mesh material={materials.chrome} position={[0, 0.44, 0.04]} castShadow={castShadows}>
            <boxGeometry args={[0.32, 0.34, 0.54]} />
          </mesh>
          <mesh material={materials.bodySlate} position={[0, 0.34, -0.44]} rotation={[0.1, 0, 0]}>
            <boxGeometry args={[0.22, 0.07, 0.6]} />
          </mesh>
          <mesh
            geometry={motoTankGeo}
            material={materials.bodySage}
            position={[0, 0.84, 0.18]}
            castShadow={castShadows}
          />
          <mesh material={materials.matte} position={[0, 0.77, -0.28]}>
            <boxGeometry args={[0.26, 0.1, 0.46]} />
          </mesh>
          <mesh material={materials.bodySlate} position={[0, 0.86, -0.64]} rotation={[0.28, 0, 0]} castShadow={castShadows}>
            <boxGeometry args={[0.21, 0.1, 0.4]} />
          </mesh>
          {[-0.1, 0.1].map((fx) => (
            <mesh key={`fork-${fx}`} material={materials.chrome} position={[fx, 0.63, 0.58]} rotation={[-0.38, 0, 0]}>
              <cylinderGeometry args={[0.025, 0.022, 0.74, 10]} />
            </mesh>
          ))}
          <mesh material={materials.headlight} position={[0, 0.84, 0.66]} rotation={[Math.PI / 2 - 0.15, 0, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.08, 18]} />
          </mesh>
          <mesh material={materials.bodySlate} position={[0, 0.99, 0.44]}>
            <boxGeometry args={[0.72, 0.035, 0.05]} />
          </mesh>
          <mesh geometry={exhaustGeo} material={materials.chrome} />
        </group>
      </group>
    </group>
  );
}
