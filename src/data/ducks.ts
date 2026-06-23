import { BALANCE } from '../config/balance';
import { weightedPick, type Rng } from '../utils/rng';
import type { DuckRarity, RarityDef } from '../types/domain';

/**
 * Single Source der Raritäten (DESIGN.md §Raritäten + §Loot-Tables).
 * Ersetzt das provisorische RARITY_INFO aus FishingRod (M2).
 *
 * Hinweis: `emissive` / `emissiveIntensity` / `hasGlint` sind hier bereits
 * gepflegt (Design-of-Record), werden in M3 aber NICHT gerendert — per-Instanz-
 * Emissive/Sparkle auf einer geteilten InstancedMesh braucht einen Custom-Shader
 * und folgt in M8 (Juice). M3 nutzt nur `bodyColor` via InstancedMesh.instanceColor.
 */
export const RARITY_DEFS: Record<DuckRarity, RarityDef> = {
  common: {
    rarity: 'common',
    baseValue: 10,
    weight: 1,
    bodyColor: 0xffd24a,
    accentColor: BALANCE.duck.beakColor,
    emissive: 0x000000,
    emissiveIntensity: 0,
    hasGlint: false,
  },
  uncommon: {
    rarity: 'uncommon',
    baseValue: 25,
    weight: 2,
    bodyColor: 0x4ad27a,
    accentColor: BALANCE.duck.beakColor,
    emissive: 0x4ad27a,
    emissiveIntensity: 0.1,
    hasGlint: false,
  },
  rare: {
    rarity: 'rare',
    baseValue: 60,
    weight: 3,
    bodyColor: 0x4a9bd2,
    accentColor: BALANCE.duck.beakColor,
    emissive: 0x4a9bd2,
    emissiveIntensity: 0.25,
    hasGlint: false,
  },
  epic: {
    rarity: 'epic',
    baseValue: 140,
    weight: 4,
    bodyColor: 0xb24ad2,
    accentColor: BALANCE.duck.beakColor,
    emissive: 0xb24ad2,
    emissiveIntensity: 0.5,
    hasGlint: true,
  },
  legendary: {
    rarity: 'legendary',
    baseValue: 350,
    weight: 5,
    bodyColor: 0xffcf3f,
    accentColor: BALANCE.duck.beakColor,
    emissive: 0xffcf3f,
    emissiveIntensity: 0.9,
    hasGlint: true,
  },
  // Heilige Ente (M11): die seltenste Stufe. Cremeweißer Körper mit goldenem Halo
  // (emissive Gold, höchste Intensität → hellstes Bloom-Glow). weight 6 ⇒ nur mit
  // lineStrength ≥ 6 fangbar (Tier-4-Rute oder Gold-Rute + „Stärkere Schnur").
  heilig: {
    rarity: 'heilig',
    baseValue: 900,
    weight: 6,
    bodyColor: 0xfff6e0,
    accentColor: BALANCE.duck.beakColor,
    emissive: 0xffd24a,
    emissiveIntensity: 1.3,
    hasGlint: true,
  },
};

/**
 * Loot-Tables je Rod-Tier (relative Gewichte, bei Roll normalisiert).
 * Index = Rod-Tier (0..3). Bessere Angel → seltenere Enten (DESIGN.md).
 */
export const LOOT_TABLES: ReadonlyArray<ReadonlyArray<[DuckRarity, number]>> = [
  [
    ['common', 70],
    ['uncommon', 23],
    ['rare', 6],
    ['epic', 1],
    ['legendary', 0],
    ['heilig', 0],
  ],
  [
    ['common', 55],
    ['uncommon', 28],
    ['rare', 12],
    ['epic', 4],
    ['legendary', 1],
    ['heilig', 0],
  ],
  [
    ['common', 42],
    ['uncommon', 30],
    ['rare', 18],
    ['epic', 8],
    ['legendary', 2],
    ['heilig', 0],
  ],
  [
    ['common', 30],
    ['uncommon', 30],
    ['rare', 23],
    ['epic', 13],
    ['legendary', 4],
    // heilig schon bei Tier 3 minimal vertreten → Alt-Weg (Gold-Rute + „Stärkere
    // Schnur" auf lineStrength 6) kann die heilige Ente überhaupt antreffen+landen.
    ['heilig', 1],
  ],
  // Tier 4 (Heilige Kirmesrute): heilig spürbar (aber weiterhin selten) vertreten.
  [
    ['common', 22],
    ['uncommon', 26],
    ['rare', 24],
    ['epic', 16],
    ['legendary', 8],
    ['heilig', 4],
  ],
];

/**
 * Würfelt eine Rarität gemäß der Loot-Table des Rod-Tiers.
 * `luck` > 0 verschiebt die Gewichte selten-wärts (M6): effektives Gewicht =
 * weight × (1 + luck × luckWeightFactor)^rang (rang: common=0 … legendary=4).
 * luck = 0 lässt die Tabelle unverändert (rückwärtskompatibel).
 */
export function rollRarity(rng: Rng, tier: number, luck = 0): DuckRarity {
  const table = LOOT_TABLES[tier] ?? LOOT_TABLES[0]!;
  if (luck <= 0) return weightedPick(rng, table);
  const base = 1 + luck * BALANCE.shop.luckWeightFactor;
  const scaled: Array<[DuckRarity, number]> = table.map(([r, w], i) => [r, w * Math.pow(base, i)]);
  return weightedPick(rng, scaled);
}
