import { BALANCE } from '../config/balance';
import type { Rod, Upgrade } from '../types/domain';

/**
 * Katalog-Inhalt des Upgrade-Shops (Daten-of-Record, wie RARITY_DEFS in
 * `data/ducks.ts`). Reine Engine-Mapping-Tunables (Magnet/Glück) liegen in
 * `BALANCE.shop`; hier stehen Ruten + Upgrades mit Preisen und Stat-Blöcken.
 *
 * Stat-Bedeutung (siehe RodStats): reach × catchRadius · castSpeed/reelSpeed ×
 * Tempo · luck verschiebt die Loot-Table · magnetRadius zieht den Zielpunkt an
 * nahe Enten · lineStrength = max fangbares Enten-Gewicht (common 1 … legendary 5).
 *
 * Die Starter-Rute spiegelt exakt die bisherigen `BALANCE.hook`-Basiswerte →
 * das Default-Spiel (vor jedem Kauf) bleibt unverändert.
 */
export const STARTER_ROD_ID = 'rod-holz';

export const RODS: readonly Rod[] = [
  {
    id: STARTER_ROD_ID,
    name: 'Holzangel',
    description: 'Die treue Standard-Rute vom Stand. Fängt zuverlässig bis zu seltenen Enten.',
    price: 0,
    tier: 0,
    stats: {
      reach: 1,
      castSpeed: 1,
      reelSpeed: 1,
      luck: 0,
      magnetRadius: 0,
      lineStrength: BALANCE.hook.baseLineStrength, // = 3 (bis epische Enten zu schwer)
    },
  },
  {
    id: 'rod-glueck',
    name: 'Glücksrute',
    description: 'Bunt lackiert und vom Glück geküsst: stärkere Schnur und mehr seltene Enten.',
    price: 45,
    tier: 1,
    stats: {
      reach: 1.05,
      castSpeed: 1.1,
      reelSpeed: 1.1,
      luck: 0.2,
      magnetRadius: 0,
      lineStrength: 4, // hält epische Enten
    },
  },
  {
    id: 'rod-magnet',
    name: 'Magnetstab',
    description: 'Magnetischer Haken zieht nahe Enten an und holt flott ein — ideal zum Sammeln.',
    price: 120,
    tier: 2,
    stats: {
      reach: 1.1,
      castSpeed: 1.15,
      reelSpeed: 1.35,
      luck: 0.15,
      magnetRadius: 0.6,
      lineStrength: 4,
    },
  },
  {
    id: 'rod-gold',
    name: 'Goldene Kirmesrute',
    description: 'Die Königsklasse: reißt nichts mehr ab, starker Magnet, viel Glück, blitzschnell.',
    price: 320,
    tier: 3,
    stats: {
      reach: 1.25,
      castSpeed: 1.4,
      reelSpeed: 1.5,
      luck: 0.4,
      magnetRadius: 0.9,
      lineStrength: 5, // fängt selbst legendäre Enten
    },
  },
  {
    id: 'rod-heilig',
    name: 'Heilige Kirmesrute',
    description:
      'Das End-Game-Heiligtum: hält selbst die heilige Ente, zieht stark an und rollt blitzschnell ein. Wer hier landet, ist Meister vom Stand.',
    price: 1200,
    tier: 4,
    stats: {
      reach: 1.35,
      castSpeed: 1.5,
      reelSpeed: 1.6,
      luck: 0.5,
      magnetRadius: 1.0,
      lineStrength: 6, // einzige Rute, die die heilige Ente direkt hält
    },
  },
];

export const UPGRADES: readonly Upgrade[] = [
  {
    id: 'up-schnur',
    name: 'Stärkere Schnur',
    description: '+1 Linienstärke je Stufe — schwerere Enten reißen nicht mehr ab.',
    price: 30,
    apply: { lineStrength: 1 },
    repeatable: true,
    maxStacks: 2,
  },
  {
    id: 'up-rolle',
    name: 'Schnellrolle',
    description: 'Holt die Ente spürbar schneller ein (+25 % Einhol-Tempo je Stufe).',
    price: 35,
    apply: { reelSpeed: 0.25 },
    repeatable: true,
    maxStacks: 3,
  },
  {
    id: 'up-koeder',
    name: 'Glücksköder',
    description: 'Lockt seltenere Enten an (+0,15 Glück je Stufe).',
    price: 50,
    apply: { luck: 0.15 },
    repeatable: true,
    maxStacks: 3,
  },
  {
    id: 'up-magnet',
    name: 'Magnetclip',
    description: 'Klemmt einen Magneten an den Haken (+0,4 Anzieh-Radius je Stufe).',
    price: 60,
    apply: { magnetRadius: 0.4 },
    repeatable: true,
    maxStacks: 2,
  },
];

/** Rute per id (oder undefined). */
export function findRod(id: string): Rod | undefined {
  return RODS.find((r) => r.id === id);
}

/** Upgrade per id (oder undefined). */
export function findUpgrade(id: string): Upgrade | undefined {
  return UPGRADES.find((u) => u.id === id);
}
