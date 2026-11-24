import * as THREE from "three";

/**
 * Smorzamento critico del secondo ordine (SmoothDamp). A differenza dello smorzamento
 * esponenziale la velocità è continua: nessun "colpo" di velocità quando il bersaglio cambia,
 * quindi accelerazioni e frenate risultano morbide.
 */
let lastVelocity = 0;

function damp1(
  current: number,
  target: number,
  velocity: number,
  smoothTime: number,
  maxSpeed: number,
  dt: number,
): number {
  const st = Math.max(0.0001, smoothTime);
  const omega = 2 / st;
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);

  const originalTo = target;
  const maxChange = maxSpeed * st;
  const change = Math.max(-maxChange, Math.min(maxChange, current - target));
  const clampedTarget = current - change;

  const temp = (velocity + omega * change) * dt;
  let newVelocity = (velocity - omega * temp) * exp;
  let output = clampedTarget + (change + temp) * exp;

  // Evita l'overshoot oltre il bersaglio
  if (originalTo - current > 0 === output > originalTo) {
    output = originalTo;
    newVelocity = 0;
  }

  lastVelocity = newVelocity;
  return output;
}

export interface SmoothState {
  velocity: number;
}

export function smoothDamp(
  current: number,
  target: number,
  state: SmoothState,
  smoothTime: number,
  maxSpeed: number,
  dt: number,
): number {
  const out = damp1(current, target, state.velocity, smoothTime, maxSpeed, dt);
  state.velocity = lastVelocity;
  return out;
}

export function smoothDampVec3(
  current: THREE.Vector3,
  target: THREE.Vector3,
  velocity: THREE.Vector3,
  smoothTime: number,
  dt: number,
): void {
  current.x = damp1(current.x, target.x, velocity.x, smoothTime, Infinity, dt);
  velocity.x = lastVelocity;
  current.y = damp1(current.y, target.y, velocity.y, smoothTime, Infinity, dt);
  velocity.y = lastVelocity;
  current.z = damp1(current.z, target.z, velocity.z, smoothTime, Infinity, dt);
  velocity.z = lastVelocity;
}

/** Smorzamento esponenziale di un angolo con percorso più breve (nessun salto a ±π). */
export function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * (1 - Math.exp(-lambda * dt));
}

export function wrapAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

