"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { carConfig } from "@/data/configuration";
import {
  ackermannAngles,
  FRONT_AXLE_Z,
  REAR_AXLE_Z,
  TRACK_HALF_WIDTH,
  WHEEL_RADIUS,
  type WheelSteerAngles,
} from "@/lib/vehicle";

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
  /** Intensità fari [0..1] controllata dal passaggio Blue Hour -> Mattino d'Oro. */
  headlightPowerRef: React.RefObject<number>;
  /** Indica se l'auto è ferma o sta frenando per intensificare le luci posteriori. */
  brakingRef: React.RefObject<boolean>;
  /** Evidenziazione extra quando è selezionata la Patente B allo Stop 01. */
  highlighted?: boolean;
  /** Disabilita ombre dinamiche su mobile per performance. */
  castShadows?: boolean;
  /** Disattiva beccheggio/rollio della scocca quando l'utente preferisce meno movimento. */
  reducedMotion?: boolean;
}

/** Posizione delle quattro ruote: side +1 = lato +X (sinistra), -1 = lato -X (destra). */
const WHEELS = [
  { side: 1, z: FRONT_AXLE_Z, front: true },
  { side: -1, z: FRONT_AXLE_Z, front: true },
  { side: 1, z: REAR_AXLE_Z, front: false },
  { side: -1, z: REAR_AXLE_Z, front: false },
] as const;

const SPOKE_COUNT = 5;
const CREASE_ANGLE = Math.PI / 5;

/**
 * Ricostruzione 3D scolpita della Renault Captur 2025 (restyling).
 *
 * Gerarchia delle ruote (una per angolo):
 *   WheelMount (posizione sull'assale, raggio = altezza da terra)
 *     SteeringPivot (ruota solo sull'asse Y, solo anteriori)
 *       RollingWheel (ruota solo sull'asse X = asse dell'assale)
 *         WheelFace (specchio per il lato sinistro)
 *           Tire / Alloy / BrakeDisc / Spokes / Hub
 *       BrakeCaliper (solidale allo sterzo, non ruota)
 *
 * Tutte le geometrie rotazionali (LatheGeometry/Cylinder) vengono girate
 * di -90° attorno a Z: l'asse di rivoluzione Y diventa X, cioè l'asse dell'assale.
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
  castShadows = true,
  reducedMotion = false,
}: RenaultCapturProps) {
  const chassisRef = useRef<THREE.Group>(null);
  const pivotRefs = useRef<Array<THREE.Group | null>>([null, null, null, null]);
  const rollRefs = useRef<Array<THREE.Group | null>>([null, null, null, null]);
  const headSpotLeftRef = useRef<THREE.SpotLight>(null);
  const headSpotRightRef = useRef<THREE.SpotLight>(null);
  const beamLeftMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const beamRightMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const tailMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const highlightSpotRef = useRef<THREE.PointLight>(null);
  const steerAnglesRef = useRef<WheelSteerAngles>({ plusX: 0, minusX: 0 });

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
    geometries,
    materials,
  } = useMemo(() => {
    // 1. Scocca inferiore. Il profilo è espresso in coordinate reali: x = lunghezza (+avanti), y = altezza.
    //    I passaruota (raggio 0.455, ridotto a ~0.385 dal bisello) sono centrati esattamente sugli assali
    //    con ~4.5 cm di gioco attorno al pneumatico (raggio 0.34).
    const ARCH_R = 0.455;
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(-2.05, 0.34);
    bodyShape.lineTo(-2.12, 0.56);
    bodyShape.quadraticCurveTo(-2.13, 0.86, -1.96, 1.03);
    bodyShape.lineTo(-1.38, 1.09);
    bodyShape.lineTo(0.86, 1.07);
    bodyShape.quadraticCurveTo(1.52, 1.04, 1.98, 0.89);
    bodyShape.quadraticCurveTo(2.14, 0.79, 2.13, 0.56);
    bodyShape.lineTo(2.07, 0.33);
    bodyShape.lineTo(FRONT_AXLE_Z + ARCH_R, 0.29);
    bodyShape.absarc(FRONT_AXLE_Z, WHEEL_RADIUS, ARCH_R, 0, Math.PI, false);
    bodyShape.lineTo(REAR_AXLE_Z + ARCH_R, 0.29);
    bodyShape.absarc(REAR_AXLE_Z, WHEEL_RADIUS, ARCH_R, 0, Math.PI, false);
    bodyShape.lineTo(-2.05, 0.34);

    const bodyDepth = 1.56;
    let body: THREE.BufferGeometry = new THREE.ExtrudeGeometry(bodyShape, {
      depth: bodyDepth,
      bevelEnabled: true,
      bevelThickness: 0.09,
      bevelSize: 0.07,
      bevelSegments: 6,
      curveSegments: 28,
    });
    // Nessuna ricentratura su X/Y: gli assali restano nelle coordinate di progetto.
    body.translate(0, 0, -bodyDepth / 2);
    body.rotateY(-Math.PI / 2); // x(profilo) -> z(avanti); estrusione -> larghezza (X)

    // Rastremazione naturale su paraurti anteriore/posteriore e fiancata alta (tumblehome)
    const bPos = body.attributes.position;
    for (let i = 0; i < bPos.count; i++) {
      const x = bPos.getX(i);
      const y = bPos.getY(i);
      const z = bPos.getZ(i);
      const frontTaper = z > 1.45 ? (z - 1.45) * 0.16 : 0;
      const rearTaper = z < -1.45 ? (-1.45 - z) * 0.13 : 0;
      const upperTumblehome = y > 0.76 ? (y - 0.76) * 0.24 : 0;
      const scaleX = Math.max(0.76, 1 - frontTaper - rearTaper - upperTumblehome);
      bPos.setX(i, x * scaleX);
    }
    // Normali morbide sulle superfici curve, spigoli netti oltre l'angolo di piega
    const bodyCreased = toCreasedNormals(body, CREASE_ANGLE);
    body.dispose();
    body = bodyCreased;

    // 2. Serra / padiglione superiore con tumblehome verso il tetto
    const cabinShape = new THREE.Shape();
    cabinShape.moveTo(-1.76, 0.96);
    cabinShape.quadraticCurveTo(-1.54, 1.38, -1.24, 1.5);
    cabinShape.lineTo(0.32, 1.52);
    cabinShape.quadraticCurveTo(0.66, 1.46, 1.02, 1.02);
    cabinShape.lineTo(-1.76, 0.96);

    let cabin: THREE.BufferGeometry = new THREE.ExtrudeGeometry(cabinShape, {
      depth: 1.24,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.05,
      bevelSegments: 5,
      curveSegments: 24,
    });
    cabin.center();
    cabin.rotateY(-Math.PI / 2);
    cabin.translate(0, 1.25, -0.34);

    const cPos = cabin.attributes.position;
    for (let i = 0; i < cPos.count; i++) {
      const x = cPos.getX(i);
      const y = cPos.getY(i);
      const heightFactor = THREE.MathUtils.clamp((y - 0.98) / 0.56, 0, 1);
      cPos.setX(i, x * (1 - heightFactor * 0.14));
    }
    const cabinCreased = toCreasedNormals(cabin, CREASE_ANGLE);
    cabin.dispose();
    cabin = cabinCreased;

    // 3. Tetto bi-tone superiore
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-1.42, 0.0);
    roofShape.lineTo(0.36, 0.0);
    roofShape.lineTo(0.28, 0.06);
    roofShape.lineTo(-1.34, 0.06);
    roofShape.closePath();

    let roof: THREE.BufferGeometry = new THREE.ExtrudeGeometry(roofShape, {
      depth: 1.12,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 3,
    });
    roof.center();
    roof.rotateY(-Math.PI / 2);
    roof.translate(0, 1.545, -0.45);
    const roofCreased = toCreasedNormals(roof, CREASE_ANGLE);
    roof.dispose();
    roof = roofCreased;

    // 4. Cornice passaruota: anello nel piano YZ (perpendicolare all'assale X), mezzo giro superiore
    const flare = new THREE.TorusGeometry(0.415, 0.038, 12, 32, Math.PI);

    // 5. Cofano motore scolpito a conchiglia
    const hood = new THREE.BoxGeometry(1.48, 0.14, 1.06, 10, 2, 10);
    const hoodPos = hood.attributes.position;
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
    hood.computeVertexNormals();

    // 6. Vetri sagomati
    const windshield = new THREE.BoxGeometry(1.2, 0.62, 0.03);
    const rearGlass = new THREE.BoxGeometry(1.12, 0.46, 0.03);
    const sideGlass = new THREE.BoxGeometry(1.31, 0.35, 1.96);

    // 7. Ruote. Profili LatheGeometry: x = raggio, y = coordinata assiale (+ = verso l'esterno).
    //    L'ordine dei punti definisce l'orientamento delle normali (verso l'esterno del solido).
    const R = WHEEL_RADIUS;
    const tireProfile = [
      new THREE.Vector2(0.228, -0.086),
      new THREE.Vector2(0.245, -0.098),
      new THREE.Vector2(0.283, -0.104),
      new THREE.Vector2(0.318, -0.097),
      new THREE.Vector2(0.333, -0.082),
      new THREE.Vector2(R - 0.0015, -0.058),
      new THREE.Vector2(R, -0.03),
      new THREE.Vector2(R, 0.03),
      new THREE.Vector2(R - 0.0015, 0.058),
      new THREE.Vector2(0.333, 0.082),
      new THREE.Vector2(0.318, 0.097),
      new THREE.Vector2(0.283, 0.104),
      new THREE.Vector2(0.245, 0.098),
      new THREE.Vector2(0.228, 0.086),
    ];
    const tire = new THREE.LatheGeometry(tireProfile, 56);
    tire.rotateZ(-Math.PI / 2);

    // Cerchio in lega (solo anello/canale + labbro); disco e razze sono separati e visibili tra le razze
    const rimProfile = [
      new THREE.Vector2(0.2, -0.088),
      new THREE.Vector2(0.232, -0.088),
      new THREE.Vector2(0.232, 0.09),
      new THREE.Vector2(0.225, 0.099),
      new THREE.Vector2(0.2, 0.096),
      new THREE.Vector2(0.2, -0.088),
    ];
    const rim = new THREE.LatheGeometry(rimProfile, 48);
    rim.rotateZ(-Math.PI / 2);

    // Fondo scuro del canale (evita di vedere la scocca attraverso le razze)
    const backing = new THREE.CylinderGeometry(0.205, 0.205, 0.012, 32);
    backing.rotateZ(Math.PI / 2);
    backing.translate(-0.02, 0, 0);

    const disc = new THREE.CylinderGeometry(0.168, 0.168, 0.026, 40);
    disc.rotateZ(Math.PI / 2);
    disc.translate(0.012, 0, 0);

    const hub = new THREE.CylinderGeometry(0.056, 0.062, 0.05, 24);
    hub.rotateZ(Math.PI / 2);
    hub.translate(0.082, 0, 0);

    const hubCap = new THREE.CylinderGeometry(0.03, 0.03, 0.012, 20);
    hubCap.rotateZ(Math.PI / 2);
    hubCap.translate(0.11, 0, 0);

    // Razza: scatola radiale con leggera rastremazione, poi coppie a V
    const spoke = new THREE.BoxGeometry(0.024, 0.165, 0.034, 1, 1, 1);

    // 8. Pinza freno (non rotante)
    const caliper = new THREE.BoxGeometry(0.07, 0.085, 0.11);

    // 9. Cono volumetrico morbido fari
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
      color: "#15181B",
      roughness: 0.88,
      metalness: 0.05,
    });

    const alloyDark = new THREE.MeshStandardMaterial({
      color: "#1A2126",
      metalness: 0.8,
      roughness: 0.3,
    });

    const alloySilver = new THREE.MeshStandardMaterial({
      color: "#D2D9DE",
      metalness: 0.92,
      roughness: 0.22,
      envMapIntensity: 1.6,
    });

    const rotorMat = new THREE.MeshStandardMaterial({
      color: "#8D98A0",
      metalness: 0.85,
      roughness: 0.34,
    });

    const caliperMat = new THREE.MeshStandardMaterial({
      color: "#2B3338",
      metalness: 0.5,
      roughness: 0.45,
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
      geometries: {
        body,
        cabin,
        roof,
        flare,
        hood,
        windshield,
        rearGlass,
        sideGlass,
        tire,
        rim,
        backing,
        disc,
        hub,
        hubCap,
        spoke,
        caliper,
        cone,
      },
      materials: {
        paint,
        roofPaint,
        cladding,
        chrome,
        glass,
        rubber,
        alloyDark,
        alloySilver,
        rotorMat,
        caliperMat,
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
      Object.values(geometries).forEach((g) => g.dispose());
      Object.values(materials).forEach((m) => m.dispose());
    };
  }, [geometries, materials]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const speed = speedRef.current ?? 0;
    const accel = accelRef.current ?? 0;
    const yawRate = yawRateRef.current ?? 0;
    const beamPower = headlightPowerRef.current ?? 0.6;
    const isBraking = brakingRef.current ?? false;

    // === Ruote: un'unica fonte per ogni asse ===
    // Rotolamento (asse X dell'assale): angolo cumulativo = distanza / raggio, deciso da JourneyController.
    const roll = wheelRollRef.current ?? 0;
    for (let i = 0; i < 4; i++) {
      const wheel = rollRefs.current[i];
      if (wheel) wheel.rotation.x = roll;
    }

    // Sterzo (asse Y) solo sull'avantreno, con relazione di Ackermann: la ruota interna sterza di più.
    const angles = ackermannAngles(steerRef.current ?? 0, steerAnglesRef.current);
    const pivotPlus = pivotRefs.current[0];
    const pivotMinus = pivotRefs.current[1];
    if (pivotPlus) {
      pivotPlus.rotation.y = THREE.MathUtils.damp(pivotPlus.rotation.y, angles.plusX, 14, dt);
    }
    if (pivotMinus) {
      pivotMinus.rotation.y = THREE.MathUtils.damp(pivotMinus.rotation.y, angles.minusX, 14, dt);
    }

    // === Scocca: assetto sulle sospensioni (le ruote restano a contatto con la strada) ===
    // Frenata: muso in basso (+rotation.x). Accelerazione: muso in alto. Curva a sinistra: rollio verso l'esterno.
    if (chassisRef.current) {
      const lateralAccel = speed * yawRate;
      const calm = reducedMotion ? 0 : 1;
      const targetPitch = THREE.MathUtils.clamp(-accel * 0.0022, -0.014, 0.014) * calm;
      const targetRoll = THREE.MathUtils.clamp(lateralAccel * 0.0032, -0.02, 0.02) * calm;
      const targetHeave =
        -THREE.MathUtils.clamp(Math.abs(accel) * 0.0008 + Math.abs(lateralAccel) * 0.0006, 0, 0.012) * calm;

      const chassis = chassisRef.current;
      chassis.rotation.x = THREE.MathUtils.damp(chassis.rotation.x, targetPitch, 7, dt);
      chassis.rotation.z = THREE.MathUtils.damp(chassis.rotation.z, targetRoll, 7, dt);
      chassis.position.y = THREE.MathUtils.damp(chassis.position.y, targetHeave, 7, dt);
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
        <mesh geometry={geometries.body} material={materials.paint} castShadow={castShadows} receiveShadow />

        {/* Cofano motore scolpito */}
        <mesh
          geometry={geometries.hood}
          material={materials.paint}
          position={[0, 1.03, 1.46]}
          castShadow={castShadows}
        />

        {/* Minigonne e protezioni sottoporta SUV */}
        <mesh material={materials.cladding} position={[0, 0.26, 0]}>
          <boxGeometry args={[1.6, 0.13, 1.7]} />
        </mesh>
        {[-0.85, 0.85].map((x) => (
          <mesh key={`sill-${x}`} material={materials.chrome} position={[x, 0.28, 0]}>
            <boxGeometry args={[0.025, 0.04, 1.4]} />
          </mesh>
        ))}

        {/* Cornici passaruota: anello attorno al centro ruota, nel piano YZ */}
        {[-0.83, 0.83].map((x) =>
          [FRONT_AXLE_Z, REAR_AXLE_Z].map((z) => (
            <mesh
              key={`arch-${x}-${z}`}
              geometry={geometries.flare}
              material={materials.cladding}
              position={[x, WHEEL_RADIUS, z]}
              rotation={[0, Math.PI / 2, 0]}
            />
          )),
        )}

        {/* Serra vetri e tetto bi-tone */}
        <mesh geometry={geometries.cabin} material={materials.roofPaint} castShadow={castShadows} />
        <mesh geometry={geometries.roof} material={materials.roofPaint} castShadow={castShadows} />

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
          geometry={geometries.windshield}
          material={materials.glass}
          position={[0, 1.29, 0.69]}
          rotation={[-0.95, 0, 0]}
        />
        <mesh
          geometry={geometries.rearGlass}
          material={materials.glass}
          position={[0, 1.28, -1.68]}
          rotation={[0.76, 0, 0]}
        />
        <mesh geometry={geometries.sideGlass} material={materials.glass} position={[0, 1.24, -0.45]} />

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
        <mesh geometry={geometries.cone} position={[-0.6, 0.85, 2.14]}>
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
        <mesh geometry={geometries.cone} position={[0.6, 0.85, 2.14]}>
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

      {/* === RUOTE === WheelMount > SteeringPivot > RollingWheel > WheelFace > componenti */}
      {WHEELS.map((wheel, index) => (
        <group
          key={`wheel-${index}`}
          position={[wheel.side * TRACK_HALF_WIDTH, WHEEL_RADIUS, wheel.z]}
        >
          {/* SteeringPivot: viene ruotato solo per le ruote anteriori (asse Y) */}
          <group
            ref={(el) => {
              pivotRefs.current[index] = wheel.front ? el : null;
            }}
          >
            {/* RollingWheel: ruota solo sull'asse X (asse dell'assale) */}
            <group
              ref={(el) => {
                rollRefs.current[index] = el;
              }}
            >
              {/* WheelFace: specchia i dettagli assiali per il lato sinistro (+X outward = +asse) */}
              <group scale={[wheel.side, 1, 1]}>
                <mesh geometry={geometries.tire} material={materials.rubber} castShadow={castShadows} />
                <mesh geometry={geometries.rim} material={materials.alloySilver} />
                <mesh geometry={geometries.backing} material={materials.alloyDark} />
                <mesh geometry={geometries.disc} material={materials.rotorMat} />

                {/* Razze a V: ruotano con il cerchio */}
                {Array.from({ length: SPOKE_COUNT }, (_, spokeIndex) => (
                  <group key={spokeIndex} rotation={[(spokeIndex * Math.PI * 2) / SPOKE_COUNT, 0, 0]}>
                    <mesh
                      geometry={geometries.spoke}
                      material={materials.alloySilver}
                      position={[0.07, 0.125, 0.02]}
                      rotation={[0.17, 0, 0]}
                    />
                    <mesh
                      geometry={geometries.spoke}
                      material={materials.alloySilver}
                      position={[0.07, 0.125, -0.02]}
                      rotation={[-0.17, 0, 0]}
                    />
                  </group>
                ))}

                <mesh geometry={geometries.hub} material={materials.alloyDark} />
                <mesh geometry={geometries.hubCap} material={materials.chrome} />
              </group>
            </group>

            {/* Pinza freno: solidale allo sterzo, non ruota con la ruota */}
            <mesh
              geometry={geometries.caliper}
              material={materials.caliperMat}
              position={[wheel.side * 0.02, 0.12, -0.1]}
            />
          </group>
        </group>
      ))}
    </group>
  );
}
