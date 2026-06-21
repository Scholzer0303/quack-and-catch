// Seedbarer Pseudo-Zufall (mulberry32) + gewichtete Auswahl.
// Deterministisch testbar; ohne globalen Math.random-State.

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Zufallszahl in [min, max). */
export function randRange(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Ganzzahl in [min, max] (inklusive). */
export function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(randRange(rng, min, max + 1));
}

/**
 * Gewichtete Auswahl. `entries` = Paare [Wert, Gewicht].
 * Gewichte müssen nicht normalisiert sein. Gibt den ersten Wert
 * zurück, falls alle Gewichte 0 sind (Defensive gegen leere Auswahl).
 */
export function weightedPick<T>(rng: Rng, entries: ReadonlyArray<[T, number]>): T {
  let total = 0;
  for (const [, weight] of entries) total += Math.max(0, weight);

  const first = entries[0];
  if (first === undefined) {
    throw new Error('weightedPick: leere Auswahl');
  }
  if (total <= 0) return first[0];

  let roll = rng() * total;
  for (const [value, weight] of entries) {
    roll -= Math.max(0, weight);
    if (roll < 0) return value;
  }
  return first[0];
}
