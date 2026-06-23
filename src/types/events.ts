// Typisierte Payload-Map für den EventBus. Entkoppelt Systeme und UI.

import type { Duck, DuckRarity, RodStats, Tip } from './domain';

// `paused` = Belohnungs-Modal (Tipp-Karte friert die Runde ein), `pausemenu` =
// vom Spieler ausgelöste Pause (Pause-Button/ESC) mit „Weiter"/„Ende".
export type GamePhase =
  | 'start'
  | 'playing'
  | 'summary'
  | 'shop'
  | 'codex'
  | 'paused'
  | 'pausemenu';

/**
 * Beide Pausen (Belohnungs-Modal `paused` + Spieler-Pause `pausemenu`) behalten
 * Timer/Score/Combo/gesammelte Tipps beim Zurück nach `playing` (kein Reset).
 * EINE Quelle dieses Prädikats — GameStateMachine, SummaryScreen und ComboSystem
 * müssen denselben Reset-Vertrag spiegeln (sonst resettet das Resume die Runde).
 */
export function isPauseState(phase: GamePhase): boolean {
  return phase === 'paused' || phase === 'pausemenu';
}

export type GameEvents = {
  'phase:changed': { from: GamePhase; to: GamePhase };
  'hook:cast': { aimX: number; aimY: number };
  'hook:result': { hit: boolean; perfect: boolean; duck: Duck | null };
  'duck:landed': { rarity: DuckRarity; value: number };
  'reward:granted': { tokens: number; tip: Tip | null; isNewTip: boolean };
  'economy:changed': { tokens: number };
  // Aktive Rod-Stats haben sich geändert (Equip/Upgrade/Laden) → Engine übernimmt sie.
  // `tier` = Tier der ausgerüsteten Rute → steuert Becken-Speed/-Anzahl + Loot-Table (M7).
  'rod:statsChanged': { stats: RodStats; tier: number };
  'round:tick': { timeRemaining: number; score: number };
  'round:ended': { score: number };
  // Fang-Serie (M9): steigt mit jedem Fang in Folge, bricht bei Miss/Snap.
  // `multiplier` skaliert die Token-Belohnung (RewardSystem). count=0 → kein Combo.
  'combo:changed': { count: number; multiplier: number };
  // Highscore-Auswertung am Rundenende (M9): trägt die Rundenpunktzahl, den (ggf.
  // aktualisierten) Rekord und ob er gerade gebrochen wurde. SummaryScreen rendert hieraus.
  'highscore:changed': { score: number; highScore: number; isNewRecord: boolean };
  'audio:unlocked': Record<string, never>;
  // Stummschaltung umgeschaltet (Single Source of Truth): MuteButton emittiert,
  // AudioManager wendet an, SaveSystem persistiert. Lade-Emit setzt den Initialwert.
  'audio:muteChanged': { muted: boolean };
};
