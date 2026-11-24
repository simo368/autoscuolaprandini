"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { getRoadFrameAtT, getRoadHalfWidthAtT, type RoadFrame } from "@/lib/scene-config";
import { createAsphaltTextures } from "@/lib/textures";

interface RoadProps {
  curve: THREE.CatmullRomCurve3;
  isMobile?: boolean;
}

function createVariableRibbonGeometry(
  frames: RoadFrame[],
  tValues: number[],
  getOffsetAndHalfWidth: (t: number) => { offset: number; halfWidth: number; heightOffset: number },
): THREE.BufferGeometry {
  const count = frames.length;
  const positions = new Float32Array(count * 2 * 3);
  const uvs = new Float32Array(count * 2 * 2);
  const indices: number[] = [];

  let cumulativeDist = 0;

  for (let i = 0; i < count; i++) {
    const f = frames[i];
    const t = tValues[i];
    if (i > 0) {
      cumulativeDist += f.position.distanceTo(frames[i - 1].position);
    }

    const { offset, halfWidth, heightOffset } = getOffsetAndHalfWidth(t);

    const cx = f.position.x + f.right.x * offset + f.normal.x * heightOffset;
    const cy = f.position.y + f.right.y * offset + f.normal.y * heightOffset;
    const cz = f.position.z + f.right.z * offset + f.normal.z * heightOffset;

    const lx = cx - f.right.x * halfWidth;
    const ly = cy - f.right.y * halfWidth;
    const lz = cz - f.right.z * halfWidth;

    const rx = cx + f.right.x * halfWidth;
    const ry = cy + f.right.y * halfWidth;
    const rz = cz + f.right.z * halfWidth;

    const vIdx = i * 6;
    positions[vIdx] = lx;
    positions[vIdx + 1] = ly;
    positions[vIdx + 2] = lz;
    positions[vIdx + 3] = rx;
    positions[vIdx + 4] = ry;
    positions[vIdx + 5] = rz;

    const uvIdx = i * 4;
    uvs[uvIdx] = 0;
    uvs[uvIdx + 1] = cumulativeDist / 4.2;
    uvs[uvIdx + 2] = 1;
    uvs[uvIdx + 3] = cumulativeDist / 4.2;

    if (i < count - 1) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export default function Road({ curve, isMobile = false }: RoadProps) {
  const segments = isMobile ? 220 : 380;

  const {
    roadGeo,
    leftCurbGeo,
    rightCurbGeo,
    leftVergeGeo,
    rightVergeGeo,
    leftLineGeo,
    rightLineGeo,
    asphaltTextures,
    dashMatrices,
    studMatrices,
    dashGeo,
    studGeo,
    materials,
  } = useMemo(() => {
    const frames: RoadFrame[] = [];
    const tValues: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      tValues.push(t);
      frames.push(getRoadFrameAtT(curve, t));
    }

    // Carreggiata principale con larghezza variabile fluida
    const road = createVariableRibbonGeometry(frames, tValues, (t) => ({
      offset: 0,
      halfWidth: getRoadHalfWidthAtT(t),
      heightOffset: 0,
    }));

    // Cordoli in pietra chiara lungo i bordi
    const lCurb = createVariableRibbonGeometry(frames, tValues, (t) => {
      const w = getRoadHalfWidthAtT(t);
      return { offset: -(w + 0.24), halfWidth: 0.26, heightOffset: 0.03 };
    });
    const rCurb = createVariableRibbonGeometry(frames, tValues, (t) => {
      const w = getRoadHalfWidthAtT(t);
      return { offset: w + 0.24, halfWidth: 0.26, heightOffset: 0.03 };
    });

    // Banchine in ghiaino/terra battuta raccordate al terreno
    const lVerge = createVariableRibbonGeometry(frames, tValues, (t) => {
      const w = getRoadHalfWidthAtT(t);
      return { offset: -(w + 1.05), halfWidth: 0.65, heightOffset: -0.04 };
    });
    const rVerge = createVariableRibbonGeometry(frames, tValues, (t) => {
      const w = getRoadHalfWidthAtT(t);
      return { offset: w + 1.05, halfWidth: 0.65, heightOffset: -0.04 };
    });

    // Linee continue bianche di margine carreggiata
    const lLine = createVariableRibbonGeometry(frames, tValues, (t) => {
      const w = getRoadHalfWidthAtT(t);
      return { offset: -(w - 0.42), halfWidth: 0.075, heightOffset: 0.016 };
    });
    const rLine = createVariableRibbonGeometry(frames, tValues, (t) => {
      const w = getRoadHalfWidthAtT(t);
      return { offset: w - 0.42, halfWidth: 0.075, heightOffset: 0.016 };
    });

    const tex = createAsphaltTextures(isMobile);

    // Tratteggio centrale + catadiottri riflettenti
    const totalLen = curve.getLength();
    const dashStep = 5.4;
    const dashCount = Math.floor(totalLen / dashStep);
    const dashes: THREE.Matrix4[] = [];
    const studs: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();

    for (let i = 1; i < dashCount - 1; i++) {
      const t = i / dashCount;
      const f = getRoadFrameAtT(curve, t);

      // Salta il tratteggio centrale esattamente dentro l'isola della rotatoria Stop 01
      if (Math.abs(t - 0.39) > 0.025) {
        dummy.position.set(
          f.position.x + f.normal.x * 0.018,
          f.position.y + f.normal.y * 0.018,
          f.position.z + f.normal.z * 0.018,
        );
        dummy.rotation.set(f.pitch, f.yaw, -f.bank, "YXZ");
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        dashes.push(dummy.matrix.clone());
      }

      if (i % 2 === 0) {
        const w = getRoadHalfWidthAtT(t) - 0.32;
        for (const side of [-1, 1]) {
          dummy.position.set(
            f.position.x + f.right.x * side * w + f.normal.x * 0.024,
            f.position.y + f.right.y * side * w + f.normal.y * 0.024,
            f.position.z + f.right.z * side * w + f.normal.z * 0.024,
          );
          dummy.rotation.set(f.pitch, f.yaw, -f.bank, "YXZ");
          dummy.updateMatrix();
          studs.push(dummy.matrix.clone());
        }
      }
    }

    const dGeo = new THREE.BoxGeometry(0.14, 0.012, 2.3);
    const sGeo = new THREE.BoxGeometry(0.11, 0.032, 0.16);

    const asphaltMat = new THREE.MeshStandardMaterial({
      map: tex.map,
      roughnessMap: tex.roughnessMap,
      bumpMap: tex.bumpMap,
      bumpScale: 0.025,
      roughness: 0.82,
      metalness: 0.06,
      envMapIntensity: 0.75,
    });

    const curbMat = new THREE.MeshStandardMaterial({
      color: "#D9D4C8",
      roughness: 0.78,
      metalness: 0.04,
    });

    const vergeMat = new THREE.MeshStandardMaterial({
      color: "#A49982",
      roughness: 0.94,
      metalness: 0.02,
    });

    const lineMat = new THREE.MeshStandardMaterial({
      color: "#F3F1E9",
      roughness: 0.42,
      metalness: 0.04,
    });

    const studMat = new THREE.MeshStandardMaterial({
      color: "#FAFAF7",
      emissive: new THREE.Color("#FFE9C2"),
      emissiveIntensity: 0.55,
      roughness: 0.25,
    });

    return {
      roadGeo: road,
      leftCurbGeo: lCurb,
      rightCurbGeo: rCurb,
      leftVergeGeo: lVerge,
      rightVergeGeo: rVerge,
      leftLineGeo: lLine,
      rightLineGeo: rLine,
      asphaltTextures: tex,
      dashMatrices: dashes,
      studMatrices: studs,
      dashGeo: dGeo,
      studGeo: sGeo,
      materials: { asphaltMat, curbMat, vergeMat, lineMat, studMat },
    };
  }, [curve, segments, isMobile]);

  useEffect(() => {
    return () => {
      roadGeo.dispose();
      leftCurbGeo.dispose();
      rightCurbGeo.dispose();
      leftVergeGeo.dispose();
      rightVergeGeo.dispose();
      leftLineGeo.dispose();
      rightLineGeo.dispose();
      dashGeo.dispose();
      studGeo.dispose();
      asphaltTextures.map.dispose();
      asphaltTextures.roughnessMap.dispose();
      asphaltTextures.bumpMap.dispose();
      Object.values(materials).forEach((m) => m.dispose());
    };
  }, [
    roadGeo,
    leftCurbGeo,
    rightCurbGeo,
    leftVergeGeo,
    rightVergeGeo,
    leftLineGeo,
    rightLineGeo,
    dashGeo,
    studGeo,
    asphaltTextures,
    materials,
  ]);

  return (
    <group>
      <mesh geometry={roadGeo} material={materials.asphaltMat} receiveShadow />
      <mesh geometry={leftCurbGeo} material={materials.curbMat} receiveShadow />
      <mesh geometry={rightCurbGeo} material={materials.curbMat} receiveShadow />
      <mesh geometry={leftVergeGeo} material={materials.vergeMat} receiveShadow />
      <mesh geometry={rightVergeGeo} material={materials.vergeMat} receiveShadow />
      <mesh geometry={leftLineGeo} material={materials.lineMat} />
      <mesh geometry={rightLineGeo} material={materials.lineMat} />

      <InstancedRoadMesh geometry={dashGeo} material={materials.lineMat} matrices={dashMatrices} />
      <InstancedRoadMesh geometry={studGeo} material={materials.studMat} matrices={studMatrices} />
    </group>
  );
}

function InstancedRoadMesh({
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
