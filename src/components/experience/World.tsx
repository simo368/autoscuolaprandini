"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getRoadFrameAtT } from "@/lib/scene-config";
import { createStoneTexture } from "@/lib/textures";

interface WorldProps {
  curve: THREE.CatmullRomCurve3;
  isMobile?: boolean;
}

/**
 * Crea una chioma organica scolpita deformando una geometria geodetica
 * in modo deterministico, evitando coni o sfere primitive uniformi.
 */
function createOrganicFoliageGeometry(seedOffset: number, squashX: number, stretchY: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n =
      1 +
      0.16 * Math.sin(x * 3.1 + seedOffset) * Math.cos(z * 2.7 - seedOffset) +
      0.1 * Math.cos(y * 4.2 + x * 2.1);
    pos.setXYZ(i, x * squashX * n, y * stretchY * n, z * squashX * n);
  }
  geo.computeVertexNormals();
  return geo;
}

export default function World({ curve, isMobile = false }: WorldProps) {
  const waterMatRef = useRef<THREE.MeshPhysicalMaterial>(null);

  const bridgeFrame = useMemo(() => getRoadFrameAtT(curve, 0.27), [curve]);

  const {
    terrainGeo,
    trunkGeo,
    poplarCrownGeo,
    broadCrownGeo,
    shrubGeo,
    postGeo,
    treeTrunks,
    poplarCrownsLower,
    poplarCrownsUpper,
    broadCrownsA,
    broadCrownsB,
    shrubs,
    guidePosts,
    casaliPlacements,
    stoneTex,
    materials,
  } = useMemo(() => {
    const roadSamples = curve.getSpacedPoints(180);
    const bridgePos = bridgeFrame.position;
    const canalDir = bridgeFrame.right.clone().setY(0).normalize();
    const canalNormal = new THREE.Vector3(-canalDir.z, 0, canalDir.x);

    // 1. Terreno continuo con vertex colors (campi verdi, fasce dorate, colline emiliane e letto del canale)
    const width = 460;
    const depth = 640;
    const segX = isMobile ? 76 : 136;
    const segZ = isMobile ? 96 : 168;
    const tGeo = new THREE.PlaneGeometry(width, depth, segX, segZ);
    tGeo.rotateX(-Math.PI / 2);
    tGeo.translate(10, 0, -75);

    const pos = tGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const cSage = new THREE.Color("#738771");
    const cMeadow = new THREE.Color("#879B88");
    const cGoldField = new THREE.Color("#CDB17E");
    const cVerge = new THREE.Color("#9C937D");
    const cHill = new THREE.Color("#6D8276");
    const cCanalBed = new THREE.Color("#4B5B56");
    const tmpCol = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);

      let minDistSq = Infinity;
      let nearestRoadY = 0.8;
      for (let j = 0; j < roadSamples.length; j++) {
        const rp = roadSamples[j];
        const dx = vx - rp.x;
        const dz = vz - rp.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < minDistSq) {
          minDistSq = dSq;
          nearestRoadY = rp.y;
        }
      }

      const dist = Math.sqrt(minDistSq);
      const roadBlend = THREE.MathUtils.smoothstep(dist, 9.5, 38);

      // Ondulazioni dolci della campagna + colline sullo sfondo e sui fianchi
      const gentleRolls =
        Math.sin(vx * 0.026) * Math.cos(vz * 0.022) * 2.8 +
        Math.sin(vx * 0.055 + vz * 0.04) * 1.1;
      const sideHills = Math.max(0, Math.abs(vx - 8) - 85) * 0.16;
      const horizonHills = Math.max(0, -vz - 335) * 0.24;
      let y = nearestRoadY - 0.16 + roadBlend * (gentleRolls + sideHills + horizonHills);

      // Letto del canale sotto il ponte (t ≈ 0.27)
      const relBridgeX = vx - bridgePos.x;
      const relBridgeZ = vz - bridgePos.z;
      const alongRoad = relBridgeX * canalNormal.x + relBridgeZ * canalNormal.z;
      const alongCanal = relBridgeX * canalDir.x + relBridgeZ * canalDir.z;
      const canalCurveOffset = Math.sin(alongCanal * 0.035) * 3.5;
      const canalDist = Math.abs(alongRoad - canalCurveOffset);
      const canalCarve = (1 - THREE.MathUtils.smoothstep(canalDist, 4.2, 10.5)) * (dist > 6.5 ? 1 : 0.92);
      if (canalCarve > 0.01) {
        y = THREE.MathUtils.lerp(y, bridgePos.y - 2.35, canalCarve);
      }

      pos.setY(i, y);

      // Colorazione agricola naturale per campi verdi e dorati
      const fieldPattern =
        Math.sin(vx * 0.048 + 0.6) * Math.cos(vz * 0.032 - 0.4) +
        Math.sin((vx + vz) * 0.022) * 0.45;
      if (canalCarve > 0.45) {
        tmpCol.copy(cCanalBed);
      } else if (dist < 13) {
        tmpCol.copy(cVerge).lerp(cMeadow, THREE.MathUtils.smoothstep(dist, 6, 13));
      } else if (sideHills + horizonHills > 5) {
        tmpCol.copy(cMeadow).lerp(cHill, Math.min(1, (sideHills + horizonHills - 5) / 14));
      } else if (fieldPattern > 0.28) {
        tmpCol.copy(cGoldField).lerp(cMeadow, 0.22);
      } else if (fieldPattern < -0.22) {
        tmpCol.copy(cSage);
      } else {
        tmpCol.copy(cMeadow);
      }

      colors[i * 3] = tmpCol.r;
      colors[i * 3 + 1] = tmpCol.g;
      colors[i * 3 + 2] = tmpCol.b;
    }

    tGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    tGeo.computeVertexNormals();

    // 2. Geometrie organiche per alberi e arbusti
    const trGeo = new THREE.CylinderGeometry(0.13, 0.24, 2.4, 8);
    const pCrownGeo = createOrganicFoliageGeometry(1.7, 1.05, 2.2);
    const bCrownGeo = createOrganicFoliageGeometry(4.1, 1.55, 1.2);
    const shGeo = createOrganicFoliageGeometry(7.3, 0.95, 0.72);
    const pgGeo = new THREE.BoxGeometry(0.11, 0.85, 0.06);

    const trunks: THREE.Matrix4[] = [];
    const pLow: THREE.Matrix4[] = [];
    const pHigh: THREE.Matrix4[] = [];
    const bA: THREE.Matrix4[] = [];
    const bB: THREE.Matrix4[] = [];
    const shList: THREE.Matrix4[] = [];
    const gPosts: THREE.Matrix4[] = [];

    const dummy = new THREE.Object3D();
    let seed = 4242;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    const stopProtected = [0.27, 0.39, 0.61, 0.77, 0.94];
    const isNearProtected = (t: number) =>
      stopProtected.some((st) => Math.abs(t - st) < 0.045);

    // Filari di pioppi e alberi da campagna lungo i bordi dei campi
    const treeCount = isMobile ? 70 : 140;
    for (let i = 0; i < treeCount; i++) {
      const t = 0.02 + (i / treeCount) * 0.95;
      const f = getRoadFrameAtT(curve, t);
      const side = i % 2 === 0 ? -1 : 1;
      const minOffset = isNearProtected(t) ? 24 : 11.5;
      const offset = minOffset + rand() * 32;
      const x = f.position.x + f.right.x * side * offset;
      const z = f.position.z + f.right.z * side * offset;
      const yBase = f.position.y - 0.1;
      const scale = 0.85 + rand() * 0.9;
      const rotY = rand() * Math.PI * 2;

      dummy.position.set(x, yBase + 1.15 * scale, z);
      dummy.rotation.set(0, rotY, 0);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      trunks.push(dummy.matrix.clone());

      if (i % 3 === 0) {
        // Albero a chioma larga (due lobi sovrapposti)
        dummy.position.set(x - 0.35 * scale, yBase + 3.2 * scale, z + 0.2 * scale);
        dummy.scale.set(scale * 1.1, scale * 1.0, scale * 1.1);
        dummy.updateMatrix();
        bA.push(dummy.matrix.clone());

        dummy.position.set(x + 0.45 * scale, yBase + 3.7 * scale, z - 0.25 * scale);
        dummy.scale.set(scale * 0.88, scale * 0.9, scale * 0.88);
        dummy.updateMatrix();
        bB.push(dummy.matrix.clone());
      } else {
        // Pioppo / cipresso emiliano slanciato a più livelli
        dummy.position.set(x, yBase + 3.6 * scale, z);
        dummy.scale.set(scale * 0.95, scale * 1.1, scale * 0.95);
        dummy.updateMatrix();
        pLow.push(dummy.matrix.clone());

        dummy.position.set(x + 0.12 * scale, yBase + 5.7 * scale, z - 0.1 * scale);
        dummy.scale.set(scale * 0.72, scale * 1.05, scale * 0.72);
        dummy.updateMatrix();
        pHigh.push(dummy.matrix.clone());
      }
    }

    // Cespugli lungo cigli e fossati
    const shrubCount = isMobile ? 40 : 88;
    for (let i = 0; i < shrubCount; i++) {
      const t = 0.03 + (i / shrubCount) * 0.93;
      if (isNearProtected(t)) continue;
      const f = getRoadFrameAtT(curve, t);
      const side = i % 2 === 0 ? -1 : 1;
      const offset = 7.4 + rand() * 5.2;
      const scale = 0.65 + rand() * 0.75;
      dummy.position.set(
        f.position.x + f.right.x * side * offset,
        f.position.y + 0.28 * scale,
        f.position.z + f.right.z * side * offset,
      );
      dummy.rotation.set(0, rand() * Math.PI, 0);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      shList.push(dummy.matrix.clone());
    }

    // Delineatori stradali italiani discreti
    const postCount = isMobile ? 28 : 54;
    for (let i = 0; i < postCount; i++) {
      const t = 0.03 + (i / postCount) * 0.92;
      if (Math.abs(t - 0.39) < 0.035) continue;
      const f = getRoadFrameAtT(curve, t);
      const side = i % 2 === 0 ? -1 : 1;
      dummy.position.set(
        f.position.x + f.right.x * side * 5.15,
        f.position.y + 0.42,
        f.position.z + f.right.z * side * 5.15,
      );
      dummy.rotation.set(0, f.yaw, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      gPosts.push(dummy.matrix.clone());
    }

    // Casali agricoli emiliani immersi nei campi (fuori dalla carreggiata)
    const casali = [
      { t: 0.16, side: -1, dist: 36, rotOffset: 0.35 },
      { t: 0.49, side: 1, dist: 38, rotOffset: -0.45 },
      { t: 0.7, side: -1, dist: 35, rotOffset: 0.55 },
      { t: 0.87, side: 1, dist: 42, rotOffset: -0.25 },
    ].map((c) => {
      const f = getRoadFrameAtT(curve, c.t);
      return {
        x: f.position.x + f.right.x * c.side * c.dist,
        y: f.position.y + 0.25,
        z: f.position.z + f.right.z * c.side * c.dist,
        rotY: f.yaw + c.rotOffset,
      };
    });

    const sTex = createStoneTexture();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.94,
      metalness: 0.02,
    });
    const trunkMat = new THREE.MeshStandardMaterial({
      color: "#695A4B",
      roughness: 0.92,
    });
    const poplarMat = new THREE.MeshStandardMaterial({
      color: "#6E846E",
      roughness: 0.86,
      metalness: 0.03,
    });
    const broadMat = new THREE.MeshStandardMaterial({
      color: "#879B88",
      roughness: 0.86,
      metalness: 0.03,
    });
    const shrubMat = new THREE.MeshStandardMaterial({
      color: "#76896E",
      roughness: 0.9,
    });
    const postMat = new THREE.MeshStandardMaterial({
      color: "#F3F1E9",
      roughness: 0.4,
      metalness: 0.2,
    });
    const stoneBridgeMat = new THREE.MeshStandardMaterial({
      map: sTex,
      color: "#DDD5C4",
      roughness: 0.82,
      metalness: 0.05,
    });
    const plasterMat = new THREE.MeshStandardMaterial({
      map: sTex,
      color: "#EFE8D8",
      roughness: 0.88,
    });
    const terracottaMat = new THREE.MeshStandardMaterial({
      color: "#B46D52",
      roughness: 0.78,
      metalness: 0.05,
    });
    const shutterMat = new THREE.MeshStandardMaterial({
      color: "#5E7363",
      roughness: 0.72,
    });

    return {
      terrainGeo: tGeo,
      trunkGeo: trGeo,
      poplarCrownGeo: pCrownGeo,
      broadCrownGeo: bCrownGeo,
      shrubGeo: shGeo,
      postGeo: pgGeo,
      treeTrunks: trunks,
      poplarCrownsLower: pLow,
      poplarCrownsUpper: pHigh,
      broadCrownsA: bA,
      broadCrownsB: bB,
      shrubs: shList,
      guidePosts: gPosts,
      casaliPlacements: casali,
      stoneTex: sTex,
      materials: {
        terrainMat,
        trunkMat,
        poplarMat,
        broadMat,
        shrubMat,
        postMat,
        stoneBridgeMat,
        plasterMat,
        terracottaMat,
        shutterMat,
      },
    };
  }, [curve, bridgeFrame, isMobile]);

  useEffect(() => {
    return () => {
      terrainGeo.dispose();
      trunkGeo.dispose();
      poplarCrownGeo.dispose();
      broadCrownGeo.dispose();
      shrubGeo.dispose();
      postGeo.dispose();
      stoneTex.dispose();
      Object.values(materials).forEach((m) => m.dispose());
    };
  }, [
    terrainGeo,
    trunkGeo,
    poplarCrownGeo,
    broadCrownGeo,
    shrubGeo,
    postGeo,
    stoneTex,
    materials,
  ]);

  useFrame(({ clock }) => {
    if (waterMatRef.current) {
      const pulse = Math.sin(clock.elapsedTime * 1.4) * 0.025;
      waterMatRef.current.roughness = 0.09 + pulse;
    }
  });

  return (
    <group>
      {/* Terreno continuo della campagna emiliana */}
      <mesh geometry={terrainGeo} material={materials.terrainMat} receiveShadow />

      {/* Canale d'acqua e ponte in pietra al segmento 3 (t = 0.27) */}
      <group
        position={[bridgeFrame.position.x, bridgeFrame.position.y, bridgeFrame.position.z]}
        rotation={[0, bridgeFrame.yaw, 0]}
      >
        {/* Specchio d'acqua riflettente del canale */}
        <mesh position={[0, -1.65, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[170, 9.2]} />
          <meshPhysicalMaterial
            ref={waterMatRef}
            color="#557982"
            roughness={0.09}
            metalness={0.18}
            clearcoat={1}
            clearcoatRoughness={0.08}
            envMapIntensity={1.6}
          />
        </mesh>

        {/* Parapetti in pietra chiara e archi del ponte */}
        {[-4.9, 4.9].map((sideX) => (
          <group key={`bridge-parapet-${sideX}`} position={[sideX, 0, 0]}>
            <mesh material={materials.stoneBridgeMat} position={[0, 0.42, 0]} castShadow={!isMobile} receiveShadow>
              <boxGeometry args={[0.42, 0.92, 13.4]} />
            </mesh>
            <mesh material={materials.stoneBridgeMat} position={[0, 0.92, 0]}>
              <boxGeometry args={[0.52, 0.14, 13.6]} />
            </mesh>
            {[-6.5, -2.2, 2.2, 6.5].map((pz) => (
              <mesh key={`pilaster-${pz}`} material={materials.stoneBridgeMat} position={[0, -0.5, pz]} castShadow={!isMobile}>
                <boxGeometry args={[0.68, 2.5, 0.95]} />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* Casali agricoli tradizionali emiliani */}
      {casaliPlacements.map((casale, idx) => (
        <group key={`casale-${idx}`} position={[casale.x, casale.y, casale.z]} rotation={[0, casale.rotY, 0]}>
          {/* Corpo principale in intonaco caldo */}
          <mesh material={materials.plasterMat} position={[0, 2.3, 0]} castShadow={!isMobile} receiveShadow>
            <boxGeometry args={[9.2, 4.6, 6.4]} />
          </mesh>
          {/* Zoccolo in pietra */}
          <mesh material={materials.stoneBridgeMat} position={[0, 0.35, 0]}>
            <boxGeometry args={[9.36, 0.7, 6.56]} />
          </mesh>
          {/* Tetto a falde in coppi terracotta */}
          <mesh material={materials.terracottaMat} position={[0, 5.55, 0]} rotation={[0, Math.PI / 4, 0]} castShadow={!isMobile}>
            <coneGeometry args={[7.2, 2.1, 4]} />
          </mesh>
          {/* Camino */}
          <mesh material={materials.plasterMat} position={[2.4, 6.3, -1.1]}>
            <boxGeometry args={[0.65, 1.4, 0.65]} />
          </mesh>
          {/* Portico adiacente con pilastri */}
          <mesh material={materials.plasterMat} position={[5.8, 1.75, 0]} castShadow={!isMobile}>
            <boxGeometry args={[2.6, 3.5, 5.2]} />
          </mesh>
          <mesh material={materials.terracottaMat} position={[5.8, 3.9, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[4.2, 1.3, 4]} />
          </mesh>
          {/* Finestre con scuri verde salvia */}
          {[-2.4, 0, 2.4].map((wx) => (
            <mesh key={`win-${wx}`} material={materials.shutterMat} position={[wx, 2.75, 3.24]}>
              <boxGeometry args={[0.92, 1.28, 0.08]} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Vegetazione organica istanziata */}
      <InstancedWorldMesh geometry={trunkGeo} material={materials.trunkMat} matrices={treeTrunks} />
      <InstancedWorldMesh geometry={poplarCrownGeo} material={materials.poplarMat} matrices={poplarCrownsLower} />
      <InstancedWorldMesh geometry={poplarCrownGeo} material={materials.broadMat} matrices={poplarCrownsUpper} />
      <InstancedWorldMesh geometry={broadCrownGeo} material={materials.broadMat} matrices={broadCrownsA} />
      <InstancedWorldMesh geometry={broadCrownGeo} material={materials.poplarMat} matrices={broadCrownsB} />
      <InstancedWorldMesh geometry={shrubGeo} material={materials.shrubMat} matrices={shrubs} />
      <InstancedWorldMesh geometry={postGeo} material={materials.postMat} matrices={guidePosts} />
    </group>
  );
}

function InstancedWorldMesh({
  geometry,
  material,
  matrices,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  matrices: THREE.Matrix4[];
}) {
  return (
    <instancedMesh
      args={[geometry, material, matrices.length]}
      ref={(mesh) => {
        if (!mesh) return;
        for (let i = 0; i < matrices.length; i++) {
          mesh.setMatrixAt(i, matrices[i]);
        }
        mesh.instanceMatrix.needsUpdate = true;
      }}
    />
  );
}
