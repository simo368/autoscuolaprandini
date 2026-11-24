"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { carConfig } from "@/data/configuration";

export interface RenaultCapturProps {
  /** Velocità lineare istantanea (unità/s) per rotazione ruote e fari stop. */
  speedRef: React.RefObject<number>;
  /** Angolo di sterzo normalizzato [-0.42..0.42] ricavato dalla curvatura della strada. */
  steerRef: React.RefObject<number>;
  /** Intensità fari [0..1] controllata dal passaggio Blue Hour -> Mattino d'Oro. */
  headlightPowerRef: React.RefObject<number>;
  /** Indica se l'auto è ferma o sta frenando per intensificare le luci posteriori. */
  brakingRef: React.RefObject<boolean>;
  /** Evidenziazione extra quando è selezionata la Patente B allo Stop 01. */
  highlighted?: boolean;
  /** Disabilita ombre dinamiche su mobile per performance. */
  castShadows?: boolean;
}

const WHEEL_RADIUS = 0.34;
const FRONT_AXLE_Z = 1.33;
const REAR_AXLE_Z = -1.31;
const TRACK_HALF_WIDTH = 0.815;

/**
 * Ricostruzione 3D scolpita ad alta fedeltà della Renault Captur 2025 (restyling).
 * Include fiancate rastremate verso il tetto (tumblehome), parafanghi svasati,
 * pneumatici LatheGeometry con spalla arrotondata, dischi freno, firme DRL verticali
 * a mezzo diamante, losanga Nouvel'R e tetto bi-tone.
 */
export default function RenaultCaptur({
  speedRef,
  steerRef,
  headlightPowerRef,
  brakingRef,
  highlighted = false,
  castShadows = true,
}: RenaultCapturProps) {
  const chassisRef = useRef<THREE.Group>(null);
  const flSteerRef = useRef<THREE.Group>(null);
  const frSteerRef = useRef<THREE.Group>(null);
  const wheelSpinRefs = useRef<Array<THREE.Group | null>>([null, null, null, null]);
  const headSpotLeftRef = useRef<THREE.SpotLight>(null);
  const headSpotRightRef = useRef<THREE.SpotLight>(null);
  const beamLeftMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const beamRightMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const tailMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const highlightSpotRef = useRef<THREE.PointLight>(null);

  const spotTargetLeft = useMemo(() => {
    const obj = new THREE.Object3D();
    obj.position.set(-0.55, 0.06, 20);
    return obj;
  }, []);

  const spotTargetRight = useMemo(() => {
    const obj = new THREE.Object3D();
    obj.position.set(0.55, 0.06, 20);
    return obj;
  }, []);

  const {
    mainBodyGeo,
    cabinUpperGeo,
    roofCapGeo,
    fenderFlareGeo,
    windshieldGeo,
    rearGlassGeo,
    sideGlassGeo,
    hoodGeo,
    tireGeo,
    rimGeo,
    discGeo,
    beamConeGeo,
    materials,
  } = useMemo(() => {
    // 1. Scocca inferiore scolpita con rastremazione automobilistica anteriore/posteriore
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(-2.05, 0.34);
    bodyShape.lineTo(-2.12, 0.56);
    bodyShape.quadraticCurveTo(-2.13, 0.86, -1.96, 1.03);
    bodyShape.lineTo(-1.38, 1.09);
    bodyShape.lineTo(0.86, 1.07);
    bodyShape.quadraticCurveTo(1.52, 1.04, 1.98, 0.89);
    bodyShape.quadraticCurveTo(2.14, 0.79, 2.13, 0.56);
    bodyShape.lineTo(2.07, 0.33);
    bodyShape.lineTo(1.75, 0.29);
    bodyShape.absarc(1.33, 0.34, 0.415, 0, Math.PI, false);
    bodyShape.lineTo(-0.9, 0.29);
    bodyShape.absarc(-1.31, 0.34, 0.415, 0, Math.PI, false);
    bodyShape.lineTo(-2.05, 0.34);

    const extrudedBody = new THREE.ExtrudeGeometry(bodyShape, {
      depth: 1.56,
      bevelEnabled: true,
      bevelThickness: 0.09,
      bevelSize: 0.07,
      bevelSegments: 5,
      curveSegments: 22,
    });
    extrudedBody.center();
    extrudedBody.rotateY(-Math.PI / 2);
    extrudedBody.computeBoundingBox();
    const bodyCenterY =
      (extrudedBody.boundingBox!.max.y + extrudedBody.boundingBox!.min.y) * 0.5;
    extrudedBody.translate(0, 0.68 - bodyCenterY, 0);

    // Rastremazione naturale su paraurti anteriore/posteriore e fiancata alta
    const bPos = extrudedBody.attributes.position;
    for (let i = 0; i < bPos.count; i++) {
      const x = bPos.getX(i);
      const y = bPos.getY(i);
      const z = bPos.getZ(i);
      const frontTaper = z > 1.35 ? (z - 1.35) * 0.16 : 0;
      const rearTaper = z < -1.45 ? (-1.45 - z) * 0.13 : 0;
      const upperTumblehome = y > 0.76 ? (y - 0.76) * 0.24 : 0;
      const scaleX = Math.max(0.76, 1 - frontTaper - rearTaper - upperTumblehome);
      bPos.setX(i, x * scaleX);
    }
    extrudedBody.computeVertexNormals();

    // 2. Serra / Padiglione superiore con tumblehome reale verso il tetto
    const cabinShape = new THREE.Shape();
    cabinShape.moveTo(-1.76, 0.96);
    cabinShape.quadraticCurveTo(-1.54, 1.38, -1.24, 1.5);
    cabinShape.lineTo(0.32, 1.52);
    cabinShape.quadraticCurveTo(0.66, 1.46, 1.02, 1.02);
    cabinShape.lineTo(-1.76, 0.96);

    const extrudedCabin = new THREE.ExtrudeGeometry(cabinShape, {
      depth: 1.24,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.05,
      bevelSegments: 4,
      curveSegments: 18,
    });
    extrudedCabin.center();
    extrudedCabin.rotateY(-Math.PI / 2);
    extrudedCabin.translate(0, 1.25, -0.34);

    const cPos = extrudedCabin.attributes.position;
    for (let i = 0; i < cPos.count; i++) {
      const x = cPos.getX(i);
      const y = cPos.getY(i);
      const heightFactor = THREE.MathUtils.clamp((y - 0.98) / 0.56, 0, 1);
      cPos.setX(i, x * (1 - heightFactor * 0.14));
    }
    extrudedCabin.computeVertexNormals();

    // 3. Tetto bi-tone superiore
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-1.42, 0.0);
    roofShape.lineTo(0.36, 0.0);
    roofShape.lineTo(0.28, 0.06);
    roofShape.lineTo(-1.34, 0.06);
    roofShape.closePath();

    const extrudedRoof = new THREE.ExtrudeGeometry(roofShape, {
      depth: 1.12,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 3,
    });
    extrudedRoof.center();
    extrudedRoof.rotateY(-Math.PI / 2);
    extrudedRoof.translate(0, 1.545, -0.45);

    // 4. Parafanghi scolpiti svasati
    const flare = new THREE.TorusGeometry(0.415, 0.055, 10, 26, Math.PI);

    // 5. Cofano motore scolpito a conchiglia
    const hoodGeometry = new THREE.BoxGeometry(1.48, 0.14, 1.06, 8, 2, 8);
    const hoodPos = hoodGeometry.attributes.position;
    for (let i = 0; i < hoodPos.count; i++) {
      const x = hoodPos.getX(i);
      const y = hoodPos.getY(i);
      const z = hoodPos.getZ(i);
      if (y > 0) {
        const taper = THREE.MathUtils.smoothstep(z, -0.53, 0.53);
        const bulge = Math.exp(-Math.pow(Math.abs(x) - 0.36, 2) * 18) * 0.032;
        hoodPos.setY(i, y - taper * 0.11 + bulge);
      }
      if (z > 0.2) {
        hoodPos.setX(i, x * (1 - (z - 0.2) * 0.2));
      }
    }
    hoodGeometry.computeVertexNormals();

    // 6. Vetri sagomati
    const wsGeo = new THREE.BoxGeometry(1.2, 0.62, 0.03);
    const rgGeo = new THREE.BoxGeometry(1.12, 0.46, 0.03);
    const sgGeo = new THREE.BoxGeometry(1.31, 0.35, 1.96);

    // 7. Pneumatico realistico con spalla arrotondata (LatheGeometry) + cerchio 18" + disco freno
    const tireProfile = [
      new THREE.Vector2(0.225, -0.11),
      new THREE.Vector2(0.27, -0.118),
      new THREE.Vector2(0.325, -0.112),
      new THREE.Vector2(WHEEL_RADIUS, -0.088),
      new THREE.Vector2(WHEEL_RADIUS, 0.088),
      new THREE.Vector2(0.325, 0.112),
      new THREE.Vector2(0.27, 0.118),
      new THREE.Vector2(0.225, 0.11),
    ];
    const tGeo = new THREE.LatheGeometry(tireProfile, 34);
    tGeo.rotateZ(Math.PI / 2);

    const rGeo = new THREE.CylinderGeometry(0.228, 0.228, 0.21, 24);
    rGeo.rotateZ(Math.PI / 2);

    const dGeo = new THREE.CylinderGeometry(0.165, 0.165, 0.028, 22);
    dGeo.rotateZ(Math.PI / 2);

    // 8. Cono volumetrico morbido fari (per l'ora blu)
    const cone = new THREE.ConeGeometry(1.75, 11.0, 24, 1, true);
    cone.translate(0, -5.5, 0);
    cone.rotateX(-Math.PI / 2);

    // Materiali PBR automotive luminosi
    const paint = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(carConfig.paintColor),
      metalness: 0.78,
      roughness: 0.19,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.55,
    });

    const roofPaint = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(carConfig.roofColor),
      metalness: 0.62,
      roughness: 0.16,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.45,
    });

    const cladding = new THREE.MeshStandardMaterial({
      color: "#222B31",
      roughness: 0.74,
      metalness: 0.12,
    });

    const chrome = new THREE.MeshStandardMaterial({
      color: new THREE.Color(carConfig.trimColor),
      metalness: 0.94,
      roughness: 0.16,
      envMapIntensity: 1.65,
    });

    const glass = new THREE.MeshPhysicalMaterial({
      color: "#1B2933",
      metalness: 0.12,
      roughness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      transparent: true,
      opacity: 0.84,
      envMapIntensity: 1.8,
    });

    const rubber = new THREE.MeshStandardMaterial({
      color: "#1B1F23",
      roughness: 0.84,
      metalness: 0.08,
    });

    const alloyDark = new THREE.MeshStandardMaterial({
      color: "#232B32",
      metalness: 0.76,
      roughness: 0.28,
    });

    const rotorMat = new THREE.MeshStandardMaterial({
      color: "#8D98A0",
      metalness: 0.85,
      roughness: 0.34,
    });

    const drlLed = new THREE.MeshStandardMaterial({
      color: "#FAFAF7",
      emissive: new THREE.Color("#FFF4DE"),
      emissiveIntensity: 2.6,
      roughness: 0.15,
    });

    const tailLed = new THREE.MeshStandardMaterial({
      color: "#C62828",
      emissive: new THREE.Color("#EF3A3A"),
      emissiveIntensity: 1.85,
      roughness: 0.2,
    });

    const plateMat = new THREE.MeshStandardMaterial({
      color: "#FAFAF7",
      roughness: 0.35,
      metalness: 0.08,
    });

    const schoolSignHousing = new THREE.MeshStandardMaterial({
      color: "#26343B",
      metalness: 0.45,
      roughness: 0.3,
    });

    const schoolSignFace = new THREE.MeshStandardMaterial({
      color: "#FAFAF7",
      emissive: new THREE.Color("#F3F1E9"),
      emissiveIntensity: 0.7,
      roughness: 0.25,
    });

    return {
      mainBodyGeo: extrudedBody,
      cabinUpperGeo: extrudedCabin,
      roofCapGeo: extrudedRoof,
      fenderFlareGeo: flare,
      windshieldGeo: wsGeo,
      rearGlassGeo: rgGeo,
      sideGlassGeo: sgGeo,
      hoodGeo: hoodGeometry,
      tireGeo: tGeo,
      rimGeo: rGeo,
      discGeo: dGeo,
      beamConeGeo: cone,
      materials: {
        paint,
        roofPaint,
        cladding,
        chrome,
        glass,
        rubber,
        alloyDark,
        rotorMat,
        drlLed,
        tailLed,
        plateMat,
        schoolSignHousing,
        schoolSignFace,
      },
    };
  }, []);

  useEffect(() => {
    tailMatRef.current = materials.tailLed;
    return () => {
      mainBodyGeo.dispose();
      cabinUpperGeo.dispose();
      roofCapGeo.dispose();
      fenderFlareGeo.dispose();
      windshieldGeo.dispose();
      rearGlassGeo.dispose();
      sideGlassGeo.dispose();
      hoodGeo.dispose();
      tireGeo.dispose();
      rimGeo.dispose();
      discGeo.dispose();
      beamConeGeo.dispose();
      Object.values(materials).forEach((m) => m.dispose());
    };
  }, [
    mainBodyGeo,
    cabinUpperGeo,
    roofCapGeo,
    fenderFlareGeo,
    windshieldGeo,
    rearGlassGeo,
    sideGlassGeo,
    hoodGeo,
    tireGeo,
    rimGeo,
    discGeo,
    beamConeGeo,
    materials,
  ]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const speed = speedRef.current ?? 0;
    const steer = steerRef.current ?? 0;
    const beamPower = headlightPowerRef.current ?? 0.6;
    const isBraking = brakingRef.current ?? false;

    // Rotazione accurata delle 4 ruote alla velocità lineare lungo la spline
    const angularDelta = (speed * dt) / WHEEL_RADIUS;
    for (const wheel of wheelSpinRefs.current) {
      if (wheel) wheel.rotation.x += angularDelta;
    }

    if (flSteerRef.current) {
      flSteerRef.current.rotation.y = THREE.MathUtils.damp(
        flSteerRef.current.rotation.y,
        steer,
        8,
        dt,
      );
    }
    if (frSteerRef.current) {
      frSteerRef.current.rotation.y = THREE.MathUtils.damp(
        frSteerRef.current.rotation.y,
        steer,
        8,
        dt,
      );
    }

    if (chassisRef.current) {
      const targetPitch = isBraking ? 0.006 : THREE.MathUtils.clamp(-speed * 0.001, -0.012, 0.012);
      chassisRef.current.rotation.x = THREE.MathUtils.damp(
        chassisRef.current.rotation.x,
        targetPitch,
        6,
        dt,
      );
    }

    const spotIntensity = 28 * beamPower;
    if (headSpotLeftRef.current) headSpotLeftRef.current.intensity = spotIntensity;
    if (headSpotRightRef.current) headSpotRightRef.current.intensity = spotIntensity;
    if (beamLeftMatRef.current) beamLeftMatRef.current.opacity = 0.045 * beamPower;
    if (beamRightMatRef.current) beamRightMatRef.current.opacity = 0.045 * beamPower;

    if (tailMatRef.current) {
      const targetGlow = isBraking ? 3.2 : 1.7;
      tailMatRef.current.emissiveIntensity = THREE.MathUtils.damp(
        tailMatRef.current.emissiveIntensity,
        targetGlow,
        8,
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

  const wheelPositions: Array<[number, number, number, boolean, number]> = [
    [-TRACK_HALF_WIDTH, WHEEL_RADIUS, FRONT_AXLE_Z, true, 0],
    [TRACK_HALF_WIDTH, WHEEL_RADIUS, FRONT_AXLE_Z, true, 1],
    [-TRACK_HALF_WIDTH, WHEEL_RADIUS, REAR_AXLE_Z, false, 2],
    [TRACK_HALF_WIDTH, WHEEL_RADIUS, REAR_AXLE_Z, false, 3],
  ];

  return (
    <group>
      <pointLight
        ref={highlightSpotRef}
        position={[0, 3.0, 1.4]}
        color="#FFF3DF"
        intensity={0}
        distance={8}
        decay={2}
      />

      <group ref={chassisRef}>
        {/* Scocca scolpita principale */}
        <mesh geometry={mainBodyGeo} material={materials.paint} castShadow={castShadows} receiveShadow />

        {/* Cofano motore scolpito */}
        <mesh
          geometry={hoodGeo}
          material={materials.paint}
          position={[0, 1.03, 1.46]}
          castShadow={castShadows}
        />

        {/* Minigonne e protezioni sottoporta SUV */}
        <mesh material={materials.cladding} position={[0, 0.26, 0]}>
          <boxGeometry args={[1.68, 0.13, 1.88]} />
        </mesh>
        {[-0.85, 0.85].map((x) => (
          <mesh key={`sill-${x}`} material={materials.chrome} position={[x, 0.28, 0]}>
            <boxGeometry args={[0.025, 0.04, 1.54]} />
          </mesh>
        ))}

        {/* Passaruota svasati */}
        {[-0.84, 0.84].map((x) =>
          [FRONT_AXLE_Z, REAR_AXLE_Z].map((z) => (
            <mesh
              key={`arch-${x}-${z}`}
              geometry={fenderFlareGeo}
              material={materials.cladding}
              position={[x, 0.36, z]}
              rotation={[0, 0, Math.PI / 2]}
            />
          )),
        )}

        {/* Serra vetri e tetto bi-tone */}
        <mesh geometry={cabinUpperGeo} material={materials.roofPaint} castShadow={castShadows} />
        <mesh geometry={roofCapGeo} material={materials.roofPaint} castShadow={castShadows} />

        {/* Barre longitudinali al tetto + antenna pinna di squalo */}
        {[-0.5, 0.5].map((rx) => (
          <mesh key={`rail-${rx}`} material={materials.chrome} position={[rx, 1.6, -0.45]}>
            <boxGeometry args={[0.032, 0.038, 1.38]} />
          </mesh>
        ))}
        <mesh material={materials.roofPaint} position={[0, 1.62, -1.25]} rotation={[-0.45, 0, 0]}>
          <boxGeometry args={[0.04, 0.09, 0.16]} />
        </mesh>

        {/* Modanatura cromata a C lungo il profilo del tetto */}
        {[-0.65, 0.65].map((cx) => (
          <mesh key={`ctrim-${cx}`} material={materials.chrome} position={[cx, 1.38, -0.58]} rotation={[0.14, 0, 0]}>
            <boxGeometry args={[0.025, 0.034, 1.54]} />
          </mesh>
        ))}

        {/* Spoiler posteriore e terza luce stop */}
        <mesh material={materials.roofPaint} position={[0, 1.51, -1.78]} rotation={[-0.08, 0, 0]}>
          <boxGeometry args={[1.14, 0.06, 0.26]} />
        </mesh>
        <mesh material={materials.tailLed} position={[0, 1.535, -1.89]}>
          <boxGeometry args={[0.38, 0.018, 0.02]} />
        </mesh>

        {/* Vetri (parabrezza, lunotto, laterali) */}
        <mesh
          geometry={windshieldGeo}
          material={materials.glass}
          position={[0, 1.29, 0.69]}
          rotation={[-0.95, 0, 0]}
        />
        <mesh
          geometry={rearGlassGeo}
          material={materials.glass}
          position={[0, 1.28, -1.68]}
          rotation={[0.76, 0, 0]}
        />
        <mesh geometry={sideGlassGeo} material={materials.glass} position={[0, 1.24, -0.45]} />

        {/* Specchietti retrovisori */}
        {[-1, 1].map((side) => (
          <group key={`mirror-${side}`} position={[side * 0.87, 1.07, 0.56]}>
            <mesh material={materials.cladding} position={[-side * 0.06, -0.02, 0]}>
              <boxGeometry args={[0.12, 0.035, 0.06]} />
            </mesh>
            <mesh material={materials.roofPaint} castShadow={castShadows}>
              <boxGeometry args={[0.17, 0.1, 0.13]} />
            </mesh>
            <mesh material={materials.drlLed} position={[0, 0, 0.068]}>
              <boxGeometry args={[0.11, 0.014, 0.01]} />
            </mesh>
          </group>
        ))}

        {/* === FRONTALE RENAULT CAPTUR 2025 === */}
        <mesh material={materials.cladding} position={[0, 0.87, 2.08]}>
          <boxGeometry args={[1.32, 0.16, 0.07]} />
        </mesh>
        {[-0.42, -0.28, -0.14, 0.14, 0.28, 0.42].map((x) => (
          <mesh key={`grille-fin-${x}`} material={materials.chrome} position={[x, 0.87, 2.12]}>
            <boxGeometry args={[0.07, 0.02, 0.02]} />
          </mesh>
        ))}

        {/* Losanga Renault Nouvel'R */}
        <group position={[0, 0.87, 2.13]} rotation={[0, 0, Math.PI / 4]}>
          <mesh material={materials.chrome}>
            <boxGeometry args={[0.125, 0.125, 0.02]} />
          </mesh>
          <mesh material={materials.cladding} position={[0, 0, 0.008]}>
            <boxGeometry args={[0.075, 0.075, 0.02]} />
          </mesh>
        </group>

        {/* Fari e DRL verticali a mezzo diamante */}
        {[-1, 1].map((side) => (
          <group key={`front-light-${side}`}>
            <mesh material={materials.cladding} position={[side * 0.6, 0.9, 2.02]} rotation={[0, side * 0.25, 0]}>
              <boxGeometry args={[0.36, 0.09, 0.14]} />
            </mesh>
            <mesh material={materials.drlLed} position={[side * 0.6, 0.9, 2.085]} rotation={[0, side * 0.25, 0]}>
              <boxGeometry args={[0.31, 0.032, 0.025]} />
            </mesh>
            <mesh
              material={materials.drlLed}
              position={[side * 0.68, 0.63, 2.07]}
              rotation={[0.08, side * 0.14, side * -0.12]}
            >
              <boxGeometry args={[0.04, 0.25, 0.03]} />
            </mesh>
            <mesh
              material={materials.drlLed}
              position={[side * 0.63, 0.72, 2.075]}
              rotation={[0.08, side * 0.14, side * 0.45]}
            >
              <boxGeometry args={[0.035, 0.14, 0.03]} />
            </mesh>
          </group>
        ))}

        {/* Paraurti e skid plate inferiore */}
        <mesh material={materials.cladding} position={[0, 0.47, 2.09]}>
          <boxGeometry args={[1.42, 0.28, 0.09]} />
        </mesh>
        <mesh material={materials.chrome} position={[0, 0.34, 2.11]}>
          <boxGeometry args={[0.92, 0.07, 0.06]} />
        </mesh>
        <mesh material={materials.plateMat} position={[0, 0.56, 2.14]}>
          <boxGeometry args={[0.46, 0.1, 0.015]} />
        </mesh>

        {/* === POSTERIORE RENAULT CAPTUR 2025 === */}
        {[-1, 1].map((side) => (
          <group key={`rear-light-${side}`} position={[side * 0.63, 0.99, -2.07]}>
            <mesh material={materials.tailLed}>
              <boxGeometry args={[0.38, 0.055, 0.07]} />
            </mesh>
            <mesh material={materials.tailLed} position={[side * 0.16, -0.07, 0.02]}>
              <boxGeometry args={[0.055, 0.14, 0.07]} />
            </mesh>
          </group>
        ))}

        <group position={[0, 1.01, -2.1]} rotation={[0, 0, Math.PI / 4]}>
          <mesh material={materials.chrome}>
            <boxGeometry args={[0.1, 0.1, 0.02]} />
          </mesh>
        </group>
        <mesh material={materials.cladding} position={[0, 0.43, -2.09]}>
          <boxGeometry args={[1.5, 0.24, 0.09]} />
        </mesh>
        <mesh material={materials.chrome} position={[-0.54, 0.37, -2.13]}>
          <boxGeometry args={[0.22, 0.055, 0.02]} />
        </mesh>
        <mesh material={materials.chrome} position={[0.54, 0.37, -2.13]}>
          <boxGeometry args={[0.22, 0.055, 0.02]} />
        </mesh>
        <mesh material={materials.plateMat} position={[0, 0.65, -2.11]}>
          <boxGeometry args={[0.46, 0.1, 0.015]} />
        </mesh>

        {/* Discreto cartello magnetico aerodinamico sul tetto "AUTOSCUOLA" */}
        <group position={[0, 1.62, -0.32]}>
          <mesh material={materials.schoolSignHousing} castShadow={castShadows}>
            <boxGeometry args={[0.54, 0.072, 0.13]} />
          </mesh>
          <mesh material={materials.schoolSignFace} position={[0, 0, 0.068]}>
            <boxGeometry args={[0.46, 0.045, 0.008]} />
          </mesh>
          <mesh material={materials.schoolSignFace} position={[0, 0, -0.068]}>
            <boxGeometry args={[0.46, 0.045, 0.008]} />
          </mesh>
        </group>

        {/* Fari anteriori caldi per la prima fascia Blue Hour */}
        <primitive object={spotTargetLeft} />
        <primitive object={spotTargetRight} />
        <spotLight
          ref={headSpotLeftRef}
          position={[-0.6, 0.88, 2.15]}
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
          position={[0.6, 0.88, 2.15]}
          target={spotTargetRight}
          angle={0.44}
          penumbra={0.68}
          intensity={24}
          distance={34}
          decay={1.7}
          color="#FFF2D9"
        />
        <mesh geometry={beamConeGeo} position={[-0.6, 0.85, 2.14]}>
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
        <mesh geometry={beamConeGeo} position={[0.6, 0.85, 2.14]}>
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

      {/* === 4 RUOTE 18" CON SPALLA ARROTONDATA, DISCHI FRENO E RAZZE DIAMANTATE === */}
      {wheelPositions.map(([x, y, z, isFront, idx]) => {
        const sideSign = x < 0 ? -1 : 1;
        const wheelContent = (
          <group
            ref={(el) => {
              wheelSpinRefs.current[idx] = el;
            }}
          >
            <mesh geometry={tireGeo} material={materials.rubber} castShadow={castShadows} />
            <mesh geometry={rimGeo} material={materials.alloyDark} />
            <mesh geometry={discGeo} material={materials.rotorMat} position={[-sideSign * 0.04, 0, 0]} />
            {[0, 1, 2, 3, 4].map((spoke) => {
              const angle = (spoke * Math.PI * 2) / 5;
              return (
                <group key={spoke} rotation={[angle, 0, 0]}>
                  <mesh
                    material={materials.chrome}
                    position={[sideSign * 0.106, 0.112, 0.025]}
                    rotation={[0.22, 0, 0]}
                  >
                    <boxGeometry args={[0.018, 0.18, 0.028]} />
                  </mesh>
                  <mesh
                    material={materials.chrome}
                    position={[sideSign * 0.106, 0.112, -0.025]}
                    rotation={[-0.22, 0, 0]}
                  >
                    <boxGeometry args={[0.018, 0.18, 0.028]} />
                  </mesh>
                </group>
              );
            })}
            <mesh material={materials.chrome} position={[sideSign * 0.114, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.052, 0.052, 0.02, 16]} />
            </mesh>
          </group>
        );

        if (isFront) {
          return (
            <group
              key={`wheel-steer-${idx}`}
              ref={idx === 0 ? flSteerRef : frSteerRef}
              position={[x, y, z]}
            >
              {wheelContent}
            </group>
          );
        }

        return (
          <group key={`wheel-${idx}`} position={[x, y, z]}>
            {wheelContent}
          </group>
        );
      })}
    </group>
  );
}
