// Typisierte Payload-Map für den EventBus. Entkoppelt Systeme und UI.

import type { Duck, DuckRarity, Rod, Tip } from './domain';

export type GamePhase = 'start' | 'playing' | 'summary' | 'shop' | 'codex' | 'paused';

export type GameEvents = {
  'phase:changed': { from: GamePhase; to: GamePhase };
  'hook:cast': { aimX: number; aimY: number };
  'hook:result': { hit: boolean; perfect: boolean; duck: Duck | null };
  'duck:landed': { rarity: DuckRarity; value: number };
  'reward:granted': { tokens: number; tip: Tip | null; isNewTip: boolean };
  'economy:changed': { tokens: number };
  'rod:equipped': { rod: Rod };
  'round:tick': { timeRemaining: number; score: number };
  'round:ended': { score: number };
  'audio:unlocked': Record<string, never>;
};
