import * as THREE from "three";
import type { JourneyStopId } from "@/data/journey";

/**
 * Costruisce una strada panoramica continua a 8 segmenti attraverso la campagna emiliana:
 * 1. Partenza (viale iniziale)
 * 2. Prima ampia curva a destra
 * 3. S-curve panoramica attraverso campi e ponte sul canale (t ≈ 0.27)
 * 4. Rotatoria / incrocio Le Patenti (t = 0.39)
 * 5. Discesa morbida nella campagna verde
 * 6. Area sosta Rinnovo Patenti (t = 0.61)
 * 7. Curva verso area segnaletica Recupero Punti (t = 0.77)
 * 8. Ampia curva dorata verso Cavezzo (t = 0.94)
 */
export function createRoadCurve(): THREE.CatmullRomCurve3 {
  const points = [
    // Segmento 1: viale di partenza
    new THREE.Vector3(0, 0.8, 195),
    new THREE.Vector3(0, 0.8, 165),
    new THREE.Vector3(1, 0.85, 136),

    // Segmento 2: ampia curva panoramica a destra
    new THREE.Vector3(12, 1.15, 108),
    new THREE.Vector3(30, 1.55, 84),

    // Segmento 3: S-curve scenica (ponte sul canale attorno a z ≈ 54)
    new THREE.Vector3(34, 1.85, 56),
    new THREE.Vector3(16, 1.75, 28),
    new THREE.Vector3(-4, 1.7, 6),

    // Segmento 4: rotatoria / incrocio Le Patenti (trackT ≈ 0.39)
    new THREE.Vector3(-12, 1.7, -18),
    new THREE.Vector3(-8, 1.7, -42),

    // Segmento 5: discesa dolce nella campagna
    new THREE.Vector3(6, 1.15, -70),
    new THREE.Vector3(24, 0.5, -100),

    // Segmento 6: padiglione Rinnovo Patenti (trackT ≈ 0.61)
    new THREE.Vector3(30, 0.4, -128),
    new THREE.Vector3(26, 0.45, -152),

    // Segmento 7: salita dolce verso Recupero Punti (trackT ≈ 0.77)
    new THREE.Vector3(8, 1.05, -180),
    new THREE.Vector3(-12, 1.55, -206),
    new THREE.Vector3(-16, 1.6, -228),

    // Segmento 8: ampia curva dorata finale verso Cavezzo (trackT ≈ 0.94)
    new THREE.Vector3(-6, 2.0, -256),
    new THREE.Vector3(8, 2.35, -284),
    new THREE.Vector3(12, 2.4, -310),
    new THREE.Vector3(12, 2.4, -334),
  ];

  return new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.45);
}

export interface RoadFrame {
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  normal: THREE.Vector3;
  yaw: number;
  pitch: number;
  bank: number;
}

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Restituisce posizione, orientamento e banking naturale lungo la spline.
 * Il banking è azzerato automaticamente nelle zone delle fermate per mantenere
 * i veicoli perfettamente orizzontali nelle aree di sosta.
 */
export function getRoadFrameAtT(curve: THREE.CatmullRomCurve3, t: number): RoadFrame {
  const clamped = THREE.MathUtils.clamp(t, 0.002, 0.998);
  const position = curve.getPointAt(clamped);
  const tangent = curve.getTangentAt(clamped).normalize();

  const dt = 0.012;
  const tPrev = Math.max(0.001, clamped - dt);
  const tNext = Math.min(0.999, clamped + dt);
  const tanPrev = curve.getTangentAt(tPrev).normalize();
  const tanNext = curve.getTangentAt(tNext).normalize();

  const yawPrev = Math.atan2(tanPrev.x, tanPrev.z);
  const yawNext = Math.atan2(tanNext.x, tanNext.z);
  let deltaYaw = yawNext - yawPrev;
  while (deltaYaw > Math.PI) deltaYaw -= Math.PI * 2;
  while (deltaYaw < -Math.PI) deltaYaw += Math.PI * 2;

  // Riduci il banking a zero vicino alle piazze di sosta e al ponte
  const stopTs = [0.035, 0.27, 0.39, 0.61, 0.77, 0.94];
  let stopDamp = 1;
  for (const st of stopTs) {
    const dist = Math.abs(clamped - st);
    if (dist < 0.055) {
      stopDamp = Math.min(stopDamp, THREE.MathUtils.smoothstep(dist, 0.018, 0.055));
    }
  }

  const bank = THREE.MathUtils.clamp(-deltaYaw * 0.22, -0.05, 0.05) * stopDamp;
  const baseRight = new THREE.Vector3().crossVectors(tangent, UP).normalize();
  const right = baseRight.clone().applyAxisAngle(tangent, bank).normalize();
  const normal = new THREE.Vector3().crossVectors(right, tangent).normalize();

  const yaw = Math.atan2(tangent.x, tangent.z);
  const pitch = -Math.asin(THREE.MathUtils.clamp(tangent.y, -0.45, 0.45));

  return { position, tangent, right, normal, yaw, pitch, bank };
}

/** Larghezza variabile della carreggiata: si apre con naturalezza in prossimità di rotatoria e fermate. */
export function getRoadHalfWidthAtT(t: number): number {
  const base = 4.35;
  // Rotatoria/incrocio Le Patenti
  const patentiBoost = Math.exp(-Math.pow((t - 0.39) / 0.032, 2)) * 1.9;
  // Piazzale Rinnovo
  const rinnovoBoost = Math.exp(-Math.pow((t - 0.61) / 0.028, 2)) * 1.1;
  // Piazzale Recupero Punti
  const puntiBoost = Math.exp(-Math.pow((t - 0.77) / 0.028, 2)) * 1.1;
  // Arrivo Cavezzo
  const cavezzoBoost = Math.exp(-Math.pow((t - 0.94) / 0.035, 2)) * 1.6;
  return base + patentiBoost + rinnovoBoost + puntiBoost + cavezzoBoost;
}

export interface CameraPreset {
  offsetDesktop: [number, number, number];
  offsetMobile: [number, number, number];
  lookDesktop: [number, number, number];
  lookMobile: [number, number, number];
  fovDesktop: number;
  fovMobile: number;
}

export const stopCameraPresets: Record<JourneyStopId | "driving", CameraPreset> = {
  intro: {
    offsetDesktop: [3.6, 1.75, 5.8],
    // Ritratto 9:16: distanza leggermente più ampia e sguardo più basso per tenere la Captur nella zona centrale alta
    offsetMobile: [2.3, 2.15, 7.6],
    lookDesktop: [-0.9, 0.85, 0.5],
    lookMobile: [0.1, 0.1, 0.3],
    fovDesktop: 39,
    fovMobile: 50,
  },
  driving: {
    offsetDesktop: [1.75, 2.35, -6.8],
    // Su smartphone la camera segue leggermente più in alto e più vicina per mostrare strada avanti e curve
    offsetMobile: [0.35, 2.85, -7.8],
    lookDesktop: [0, 1.0, 9.2],
    lookMobile: [0, 0.55, 8.8],
    fovDesktop: 43,
    fovMobile: 53,
  },
  patenti: {
    offsetDesktop: [-5.6, 3.0, 7.2],
    // Inquadra la Captur + pedane Scooter AM e Moto A nella metà superiore sopra il bottom sheet
    offsetMobile: [-1.1, 4.1, 9.8],
    lookDesktop: [2.7, 0.9, -0.4],
    lookMobile: [1.5, 0.05, 0.4],
    fovDesktop: 40,
    fovMobile: 52,
  },
  rinnovo: {
    offsetDesktop: [-4.9, 2.25, -5.4],
    offsetMobile: [-1.4, 3.1, -8.2],
    lookDesktop: [3.1, 1.25, 2.5],
    lookMobile: [1.2, 0.45, 2.0],
    fovDesktop: 39,
    fovMobile: 51,
  },
  punti: {
    offsetDesktop: [5.1, 2.4, -5.0],
    offsetMobile: [1.6, 3.15, -8.0],
    lookDesktop: [-2.6, 1.35, 3.2],
    lookMobile: [-0.8, 0.5, 2.2],
    fovDesktop: 40,
    fovMobile: 51,
  },
  cavezzo: {
    offsetDesktop: [-5.3, 2.3, 7.2],
    offsetMobile: [-1.1, 3.0, 9.2],
    lookDesktop: [2.6, 1.3, -1.8],
    lookMobile: [0.8, 0.4, -1.0],
    fovDesktop: 41,
    fovMobile: 52,
  },
};

export interface AtmosphereState {
  skyTop: THREE.Color;
  skyHorizon: THREE.Color;
  fogColor: THREE.Color;
  fogDensity: number;
  sunIntensity: number;
  sunColor: THREE.Color;
  sunElevation: number;
  ambientIntensity: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  headlightPower: number;
  dawnMix: number;
}

// 3 fasi cromatiche luminose e naturali: Blue Hour -> Early Morning -> Golden Morning
const BLUE_HOUR_TOP = new THREE.Color("#4B6A82");
const EARLY_MORN_TOP = new THREE.Color("#7FA3BC");
const GOLDEN_MORN_TOP = new THREE.Color("#7DA8C8");

const BLUE_HOUR_HORIZON = new THREE.Color("#B8CCD4");
const EARLY_MORN_HORIZON = new THREE.Color("#E5DCD0");
const GOLDEN_MORN_HORIZON = new THREE.Color("#F3EAD9");

const HEMI_GROUND_BLUE = new THREE.Color("#525E53");
const HEMI_GROUND_GOLD = new THREE.Color("#9A8D73");

const SUN_BLUE_HOUR = new THREE.Color("#C7DCEE");
const SUN_EARLY_MORN = new THREE.Color("#FFE0B2");
const SUN_GOLDEN_MORN = new THREE.Color("#FFE8BE");

export function evaluateAtmosphere(trackT: number, target: AtmosphereState): AtmosphereState {
  const t = THREE.MathUtils.clamp(trackT, 0, 1);

  if (t < 0.42) {
    const k = THREE.MathUtils.smoothstep(t, 0, 0.42);
    target.skyTop.lerpColors(BLUE_HOUR_TOP, EARLY_MORN_TOP, k);
    target.skyHorizon.lerpColors(BLUE_HOUR_HORIZON, EARLY_MORN_HORIZON, k);
    target.sunColor.lerpColors(SUN_BLUE_HOUR, SUN_EARLY_MORN, k);
  } else {
    const k = THREE.MathUtils.smoothstep(t, 0.42, 1.0);
    target.skyTop.lerpColors(EARLY_MORN_TOP, GOLDEN_MORN_TOP, k);
    target.skyHorizon.lerpColors(EARLY_MORN_HORIZON, GOLDEN_MORN_HORIZON, k);
    target.sunColor.lerpColors(SUN_EARLY_MORN, SUN_GOLDEN_MORN, k);
  }

  target.fogColor.copy(target.skyHorizon);
  target.fogDensity = THREE.MathUtils.lerp(0.0052, 0.0032, t);
  target.sunIntensity = THREE.MathUtils.lerp(1.15, 2.85, Math.pow(t, 0.85));
  target.sunElevation = THREE.MathUtils.lerp(7, 24, t);
  target.ambientIntensity = THREE.MathUtils.lerp(0.85, 1.38, t);
  target.hemiSky.copy(target.skyHorizon).lerp(new THREE.Color("#FAFAF7"), 0.35);
  target.hemiGround.lerpColors(HEMI_GROUND_BLUE, HEMI_GROUND_GOLD, t);
  target.headlightPower = THREE.MathUtils.lerp(0.9, 0.25, THREE.MathUtils.smoothstep(t, 0.08, 0.72));
  target.dawnMix = t;

  return target;
}

export function isWebGLAvailable(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") ||
          canvas.getContext("webgl") ||
          canvas.getContext("experimental-webgl")),
    );
  } catch {
    return false;
  }
}
