// Kleine Mathe-Helfer (Oval-Parametrisierung, Glättung, Interpolation).

export const TWO_PI = Math.PI * 2;

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Rahmenraten-unabhängige exponentielle Glättung.
 * Bewegt `current` in Richtung `target`; größere `lambda` = schneller.
 */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

/**
 * Punkt auf einem Oval (Mittelpunkt 0/0) für Parameter t ∈ [0,1).
 * Gibt [x, z] in der XZ-Ebene zurück.
 */
export function ovalPoint(t: number, radiusX: number, radiusZ: number): [number, number] {
  const angle = t * TWO_PI;
  return [Math.cos(angle) * radiusX, Math.sin(angle) * radiusZ];
}

/** Hält t im Bereich [0,1) (Wrap-around für die Umlaufbahn). */
export function wrap01(t: number): number {
  return t - Math.floor(t);
}
