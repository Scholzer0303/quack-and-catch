// Domänen-Typen: stabile Verträge für Enten, Angeln, Upgrades und Tipp-Karten.

export type DuckRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'heilig';

/**
 * Kanonische Rang-Reihenfolge der Raritäten (Basics → Geheimwissen). Single Source
 * für jede ordnungsabhängige Logik (Codex-Sortierung, Wissens-Crossover). Der Index
 * ist zugleich der „Rang" (common=0 … heilig=5).
 */
export const RARITY_ORDER: readonly DuckRarity[] = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
  'heilig',
];

/** Tipp-Stufen entsprechen 1:1 den Raritäten (gemeinsame visuelle Sprache). */
export type TipTier = DuckRarity;

/** Design-Definition einer Rarität (aus data/ducks.ts). */
export interface RarityDef {
  rarity: DuckRarity;
  baseValue: number; // Score-Punkte
  weight: number; // „Gewicht" der Ente (Linienstärke-Gate)
  bodyColor: number; // Hex
  accentColor: number; // Schnabel/Flügel Hex
  emissive: number; // 0x000000 = kein Leuchten
  emissiveIntensity: number;
  hasGlint: boolean; // Epic/Legendary Funkeln
}

/** Laufzeit-Instanz einer Ente auf der Bahn (ein InstancedMesh-Slot). */
export interface Duck {
  slot: number; // Instanz-Index im InstancedMesh
  rarity: DuckRarity;
  trackT: number; // 0..1 Position auf dem Oval
  speed: number; // t pro Sekunde
  laneOffset: number; // radialer Versatz (Überlappung vermeiden)
  bobPhase: number; // Seed fürs vertikale Wippen
  alive: boolean; // false während gehakt/eingeholt/entfernt
  worldX: number; // pro Tick gecachte Weltposition (Raycast)
  worldY: number;
  worldZ: number;
}

/** Stat-Block einer Angel/eines Upgrades. */
export interface RodStats {
  reach: number; // × auf catchRadius (größere Fang-Zone); 1 = Basis
  castSpeed: number; // Senk-Tempo-Multiplikator (× → kürzere lowerDuration)
  reelSpeed: number; // Einhol-Tempo-Multiplikator (× → kürzere reelDuration)
  luck: number; // Loot-Table-Glück (0 = keins; verschiebt Richtung selten)
  magnetRadius: number; // 0 = kein Magnet; sonst Anzieh-Radius (Welteinheiten)
  lineStrength: number; // max. fangbare Raritäts-Gewichtsstufe
}

export interface Rod {
  id: string;
  name: string;
  description: string;
  price: number; // Tokens; 0 = Startangel
  tier: number; // 0..n; bestimmt Loot-Table + Beckenspeed
  stats: RodStats;
}

/** Eigenständiges Upgrade (keine Angel), stapelt auf die ausgerüstete Angel. */
export interface Upgrade {
  id: string;
  name: string;
  description: string;
  price: number;
  apply: Partial<RodStats>;
  repeatable: boolean;
  maxStacks: number;
}

export interface Tip {
  id: string;
  tier: TipTier;
  kategorie: string;
  icon: string; // Emoji-Symbol je Tipp (Reward-Modal + Codex)
  titel: string;
  text: string;
}
