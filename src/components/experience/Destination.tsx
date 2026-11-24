"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { journeyChapters } from "@/data/journey";
import type { LicenceCategoryId } from "@/data/services";
import { getRoadFrameAtT } from "@/lib/scene-config";
import {
  createRoadSignTexture,
  createRoundaboutSignTexture,
  createStoneTexture,
} from "@/lib/textures";
import PatentiVehicles from "@/components/experience/PatentiVehicles";

interface DestinationsProps {
  curve: THREE.CatmullRomCurve3;
  selectedCategory: LicenceCategoryId;
  isMobile?: boolean;
}

export default function Destinations({
  curve,
  selectedCategory,
  isMobile = false,
}: DestinationsProps) {
  const frames = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getRoadFrameAtT>>();
    for (const ch of journeyChapters) {
      map.set(ch.id, getRoadFrameAtT(curve, ch.trackT));
    }
    return map;
  }, [curve]);

  const { materials, textures } = useMemo(() => {
    const stoneTex = createStoneTexture();
    const roundaboutTex = createRoundaboutSignTexture();

    const patentiSignTex = createRoadSignTexture({
      bg: "#1D5E9A",
      fg: "#FAFAF7",
      border: "#FAFAF7",
      kicker: "STOP 01 · AREA ADDESTRAMENTO",
      title: "LE PATENTI",
      subtitle: "AM · A · B  —  SELEZIONA CATEGORIA",
    });

    const rinnovoSignTex = createRoadSignTexture({
      bg: "#F3F1E9",
      fg: "#26343B",
      border: "#879B88",
      kicker: "STOP 02 · PRATICHE",
      title: "RINNOVO PATENTI",
      subtitle: "ACCETTAZIONE & CONSULENZA",
    });

    const puntiSignTex = createRoadSignTexture({
      bg: "#1D5E9A",
      fg: "#FAFAF7",
      border: "#FAFAF7",
      kicker: "STOP 03 · FORMAZIONE",
      title: "RECUPERO PUNTI",
      subtitle: "SICUREZZA STRADALE",
    });

    const cavezzoSignTex = createRoadSignTexture({
      bg: "#FAFAF7",
      fg: "#26343B",
      border: "#D7AD78",
      kicker: "DESTINAZIONE FINALE",
      title: "AUTOSCUOLA PRANTINI",
      subtitle: "CAVEZZO · MODENA",
    });

    const limestone = new THREE.MeshStandardMaterial({
      map: stoneTex,
      color: "#ECE7DB",
      roughness: 0.72,
      metalness: 0.04,
    });
    const warmTimber = new THREE.MeshStandardMaterial({
      color: "#B4895D",
      roughness: 0.65,
      metalness: 0.06,
    });
    const slateMetal = new THREE.MeshStandardMaterial({
      color: "#2E3D45",
      roughness: 0.36,
      metalness: 0.68,
    });
    const brushedSilver = new THREE.MeshStandardMaterial({
      color: "#C4CED4",
      roughness: 0.25,
      metalness: 0.85,
    });
    const archGlass = new THREE.MeshPhysicalMaterial({
      color: "#C8DCE0",
      roughness: 0.06,
      metalness: 0.1,
      transmission: 0.2,
      transparent: true,
      opacity: 0.72,
      clearcoat: 1,
    });
    const warmInterior = new THREE.MeshStandardMaterial({
      color: "#FAF0DC",
      emissive: new THREE.Color("#F2D29B"),
      emissiveIntensity: 0.55,
      roughness: 0.6,
    });
    const sageGreenery = new THREE.MeshStandardMaterial({
      color: "#788E79",
      roughness: 0.88,
    });
    const pavingPlaza = new THREE.MeshStandardMaterial({
      color: "#576168",
      roughness: 0.85,
      metalness: 0.06,
    });
    const roadPaint = new THREE.MeshStandardMaterial({
      color: "#F3F1E9",
      roughness: 0.45,
    });
    const roundaboutSignMat = new THREE.MeshStandardMaterial({
      map: roundaboutTex,
      roughness: 0.35,
    });
    const patentiSignMat = new THREE.MeshStandardMaterial({
      map: patentiSignTex,
      roughness: 0.35,
    });
    const rinnovoSignMat = new THREE.MeshStandardMaterial({
      map: rinnovoSignTex,
      roughness: 0.35,
    });
    const puntiSignMat = new THREE.MeshStandardMaterial({
      map: puntiSignTex,
      roughness: 0.35,
    });
    const cavezzoSignMat = new THREE.MeshStandardMaterial({
      map: cavezzoSignTex,
      roughness: 0.35,
    });

    return {
      textures: [stoneTex, roundaboutTex, patentiSignTex, rinnovoSignTex, puntiSignTex, cavezzoSignTex],
      materials: {
        limestone,
        warmTimber,
        slateMetal,
        brushedSilver,
        archGlass,
        warmInterior,
        sageGreenery,
        pavingPlaza,
        roadPaint,
        roundaboutSignMat,
        patentiSignMat,
        rinnovoSignMat,
        puntiSignMat,
        cavezzoSignMat,
      },
    };
  }, []);

  useEffect(() => {
    return () => {
      textures.forEach((t) => t.dispose());
      Object.values(materials).forEach((m) => m.dispose());
    };
  }, [textures, materials]);

  const stop01 = frames.get("patenti")!;
  const stop02 = frames.get("rinnovo")!;
  const stop03 = frames.get("punti")!;
  const stop04 = frames.get("cavezzo")!;

  return (
    <group>
      {/* === STOP 01: ROTATORIA / INTERSEZIONE PAESAGGISTICA LE PATENTI === */}
      <group position={stop01.position} rotation={[0, stop01.yaw, 0]}>
        {/* Ampia piattaforma stradale dell'intersezione raccordata con la carreggiata */}
        <mesh material={materials.pavingPlaza} position={[3.2, -0.02, 0.8]} receiveShadow>
          <cylinderGeometry args={[12.5, 13.0, 0.08, 48]} />
        </mesh>

        {/* Isola centrale paesaggistica della rotatoria (a lato rispetto alla corsia di sosta) */}
        <group position={[5.6, 0, -3.2]}>
          <mesh material={materials.limestone} position={[0, 0.14, 0]} receiveShadow>
            <cylinderGeometry args={[2.5, 2.75, 0.28, 36]} />
          </mesh>
          <mesh material={materials.sageGreenery} position={[0, 0.31, 0]}>
            <cylinderGeometry args={[2.15, 2.25, 0.12, 32]} />
          </mesh>
          {/* Cespugli sagomati e palo rotatoria */}
          <mesh material={materials.sageGreenery} position={[0, 0.65, 0]}>
            <icosahedronGeometry args={[0.85, 1]} />
          </mesh>
          <mesh material={materials.brushedSilver} position={[-1.4, 1.3, 1.4]}>
            <cylinderGeometry args={[0.04, 0.04, 2.4, 10]} />
          </mesh>
          <mesh material={materials.roundaboutSignMat} position={[-1.4, 2.25, 1.44]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.42, 0.42, 0.04, 24]} />
          </mesh>
        </group>

        {/* Strisce pedonali / di arresto e segnaletica direzionale */}
        {[-2.4, -1.2, 0, 1.2, 2.4].map((x) => (
          <mesh key={`zebra-${x}`} material={materials.roadPaint} position={[x, 0.03, 4.4]}>
            <boxGeometry args={[0.55, 0.012, 2.1]} />
          </mesh>
        ))}

        {/* Cartello stradale direzionale Stop 01 */}
        <group position={[7.4, 0, 4.8]} rotation={[0, -0.45, 0]}>
          <mesh material={materials.brushedSilver} position={[-0.9, 1.45, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 2.9, 10]} />
          </mesh>
          <mesh material={materials.brushedSilver} position={[0.9, 1.45, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 2.9, 10]} />
          </mesh>
          <mesh material={materials.patentiSignMat} position={[0, 2.4, 0.04]} castShadow={!isMobile}>
            <boxGeometry args={[2.5, 1.25, 0.06]} />
          </mesh>
        </group>

        {/* Veicoli dedicati Scooter AM e Moto A integrati nelle piazzole in pietra chiara */}
        <PatentiVehicles selectedCategory={selectedCategory} castShadows={!isMobile} />
      </group>

      {/* === STOP 02: PADIGLIONE MODERNO IN PIETRA CHIARA, LEGNO E VETRO — RINNOVO PATENTI === */}
      <group position={stop02.position} rotation={[0, stop02.yaw, 0]}>
        {/* Terrazza e piazzale di accoglienza */}
        <mesh material={materials.limestone} position={[6.8, 0.02, 0]} receiveShadow>
          <boxGeometry args={[11.2, 0.14, 15.6]} />
        </mesh>

        <group position={[8.6, 0.08, 0.4]}>
          {/* Basamento in pietra chiara */}
          <mesh material={materials.limestone} position={[0, 0.16, 0]} receiveShadow>
            <boxGeometry args={[6.4, 0.32, 11.8]} />
          </mesh>
          {/* Nucleo interno luminoso caldo */}
          <mesh material={materials.warmInterior} position={[0.7, 1.9, 0]}>
            <boxGeometry args={[4.0, 2.9, 8.8]} />
          </mesh>
          {/* Facciata continua vetrata */}
          <mesh material={materials.archGlass} position={[0.2, 1.95, 0]}>
            <boxGeometry args={[5.1, 3.2, 9.6]} />
          </mesh>
          {/* Copertura aggettante in legno caldo e profilo in acciaio */}
          <mesh material={materials.warmTimber} position={[-1.3, 3.68, 0]} castShadow={!isMobile}>
            <boxGeometry args={[8.8, 0.28, 12.6]} />
          </mesh>
          <mesh material={materials.slateMetal} position={[-1.3, 3.84, 0]}>
            <boxGeometry args={[8.9, 0.08, 12.7]} />
          </mesh>
          {/* Colonne sottili in acciaio ardesia */}
          {[-4.8, -1.6, 1.6, 4.8].map((z) => (
            <mesh key={`col-${z}`} material={materials.slateMetal} position={[-4.6, 1.85, z]} castShadow={!isMobile}>
              <cylinderGeometry args={[0.09, 0.09, 3.5, 12]} />
            </mesh>
          ))}
          {/* Fioriere in pietra con vegetazione salvia */}
          {[-4.2, 4.2].map((pz) => (
            <group key={`planter-${pz}`} position={[-3.2, 0, pz]}>
              <mesh material={materials.limestone} position={[0, 0.35, 0]}>
                <boxGeometry args={[1.4, 0.5, 2.2]} />
              </mesh>
              <mesh material={materials.sageGreenery} position={[0, 0.72, 0]}>
                <icosahedronGeometry args={[0.55, 1]} />
              </mesh>
            </group>
          ))}
          {/* Totem informativo Rinnovo Patenti */}
          <mesh material={materials.slateMetal} position={[-3.8, 1.5, -5.8]}>
            <boxGeometry args={[0.28, 2.9, 1.6]} />
          </mesh>
          <mesh material={materials.rinnovoSignMat} position={[-3.96, 2.05, -5.8]} rotation={[0, -Math.PI / 2, 0]}>
            <boxGeometry args={[1.45, 0.78, 0.04]} />
          </mesh>
        </group>
      </group>

      {/* === STOP 03: PIAZZA SEGNALETICA & FORMAZIONE — RECUPERO PUNTI === */}
      <group position={stop03.position} rotation={[0, stop03.yaw, 0]}>
        <mesh material={materials.pavingPlaza} position={[-4.5, -0.01, 0]} receiveShadow>
          <boxGeometry args={[12, 0.06, 15]} />
        </mesh>

        {/* Segnaletica orizzontale direzionale */}
        {[-1.5, 1.5].map((z) => (
          <mesh key={`arrow-strip-${z}`} material={materials.roadPaint} position={[-2.2, 0.024, z]}>
            <boxGeometry args={[0.35, 0.01, 1.6]} />
          </mesh>
        ))}

        {/* Portale informativo moderno in acciaio e legno (stile educational stradale) */}
        <group position={[0, 0, 2.6]}>
          <mesh material={materials.slateMetal} position={[-5.4, 2.4, 0]} castShadow={!isMobile}>
            <cylinderGeometry args={[0.14, 0.16, 4.8, 14]} />
          </mesh>
          <mesh material={materials.slateMetal} position={[5.4, 2.4, 0]} castShadow={!isMobile}>
            <cylinderGeometry args={[0.14, 0.16, 4.8, 14]} />
          </mesh>
          <mesh material={materials.warmTimber} position={[0, 4.75, 0]} castShadow={!isMobile}>
            <boxGeometry args={[11.4, 0.36, 0.48]} />
          </mesh>
          {/* Insegna stradale centrata */}
          <mesh material={materials.puntiSignMat} position={[0, 4.75, -0.28]} rotation={[0, Math.PI, 0]}>
            <boxGeometry args={[3.8, 1.4, 0.06]} />
          </mesh>
        </group>

        {/* Struttura informativa laterale con segnaletica verticale */}
        <group position={[-6.8, 0, -0.8]} rotation={[0, 0.4, 0]}>
          <mesh material={materials.limestone} position={[0, 0.2, 0]} receiveShadow>
            <boxGeometry args={[4.4, 0.4, 5.2]} />
          </mesh>
          <mesh material={materials.warmTimber} position={[0, 3.1, 0]} castShadow={!isMobile}>
            <boxGeometry args={[4.6, 0.22, 5.4]} />
          </mesh>
          <mesh material={materials.slateMetal} position={[-1.8, 1.65, 2.2]}>
            <cylinderGeometry args={[0.07, 0.07, 2.9, 10]} />
          </mesh>
          <mesh material={materials.slateMetal} position={[1.8, 1.65, 2.2]}>
            <cylinderGeometry args={[0.07, 0.07, 2.9, 10]} />
          </mesh>
          <mesh material={materials.sageGreenery} position={[-1.3, 0.65, -1.8]}>
            <icosahedronGeometry args={[0.55, 1]} />
          </mesh>
        </group>
      </group>

      {/* === DESTINAZIONE FINALE: PIAZZA AUTOSCUOLA PRANTINI — CAVEZZO === */}
      <group position={stop04.position} rotation={[0, stop04.yaw, 0]}>
        {/* Grande corte in pietra chiara baciata dal sole del mattino */}
        <mesh material={materials.limestone} position={[4.5, 0.01, 0.5]} receiveShadow>
          <boxGeometry args={[24, 0.08, 22]} />
        </mesh>

        {/* Sede architettonica Autoscuola Prantini */}
        <group position={[9.5, 0.05, 1.4]}>
          <mesh material={materials.limestone} position={[0, 2.3, 0]} castShadow={!isMobile} receiveShadow>
            <boxGeometry args={[7.2, 4.6, 13.4]} />
          </mesh>
          <mesh material={materials.warmInterior} position={[-3.2, 2.0, 0]}>
            <boxGeometry args={[0.8, 3.3, 10.2]} />
          </mesh>
          <mesh material={materials.archGlass} position={[-3.62, 2.0, 0]}>
            <boxGeometry args={[0.08, 3.4, 10.6]} />
          </mesh>
          {/* Pensilina ingresso in legno e acciaio */}
          <mesh material={materials.warmTimber} position={[-1.8, 4.65, 0]} castShadow={!isMobile}>
            <boxGeometry args={[10.8, 0.28, 14.4]} />
          </mesh>
          {/* Frangisole verticali in legno sul fronte */}
          {[-4.2, -2.1, 0, 2.1, 4.2].map((lz) => (
            <mesh key={`louver-${lz}`} material={materials.warmTimber} position={[-5.1, 2.35, lz]} castShadow={!isMobile}>
              <boxGeometry args={[0.16, 4.5, 0.35]} />
            </mesh>
          ))}
        </group>

        {/* Monolite d'ingresso Cavezzo */}
        <group position={[4.8, 0.05, 7.2]} rotation={[0, -0.45, 0]}>
          <mesh material={materials.limestone} position={[0, 1.4, 0]} castShadow={!isMobile}>
            <boxGeometry args={[3.2, 2.8, 0.42]} />
          </mesh>
          <mesh material={materials.cavezzoSignMat} position={[0, 1.55, 0.23]}>
            <boxGeometry args={[2.7, 1.35, 0.04]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
