/**
 * Parametri meccanici condivisi della Renault Captur procedurale.
 * Unità: metri. Asse locale: +Z avanti, +X sinistra, +Y alto.
 * L'asse dell'assale è l'asse X locale: le ruote rotolano con rotation.x
 * (angolo positivo = rotolamento in avanti verso +Z).
 */
export const WHEEL_RADIUS = 0.34;
export const FRONT_AXLE_Z = 1.33;
export const REAR_AXLE_Z = -1.31;
export const WHEELBASE = FRONT_AXLE_Z - REAR_AXLE_Z;
export const TRACK_HALF_WIDTH = 0.735;

export interface WheelSteerAngles {
  /** Angolo (rad) della ruota anteriore sul lato +X (sinistra). */
  plusX: number;
  /** Angolo (rad) della ruota anteriore sul lato -X (destra). */
  minusX: number;
}

/**
 * Geometria di Ackermann: dato l'angolo di sterzo al centro dell'avantreno
 * (positivo = curva verso +X), la ruota interna sterza leggermente di più di quella esterna.
 */
export function ackermannAngles(centerAngle: number, out: WheelSteerAngles): WheelSteerAngles {
  const a = Math.abs(centerAngle);
  if (a < 1e-4) {
    out.plusX = centerAngle;
    out.minusX = centerAngle;
    return out;
  }

  const sign = Math.sign(centerAngle);
  const radius = WHEELBASE / Math.tan(a);
  const inner = Math.atan(WHEELBASE / Math.max(0.01, radius - TRACK_HALF_WIDTH));
  const outer = Math.atan(WHEELBASE / (radius + TRACK_HALF_WIDTH));

  // Per una curva verso +X il lato +X è quello interno.
  if (sign > 0) {
    out.plusX = inner;
    out.minusX = outer;
  } else {
    out.plusX = -outer;
    out.minusX = -inner;
  }
  return out;
}

