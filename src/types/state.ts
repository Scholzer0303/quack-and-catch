// Persistierter Spielstand (localStorage). Bewusst flach und JSON-serialisierbar:
// `Set` und Klassen-Instanzen gehören NICHT hier rein. Alle Felder sind required
// (keine optionalen Properties) — fehlende/kaputte Felder repariert das SaveSystem
// beim Laden auf Defaults, statt sie als `?` zu modellieren (exactOptionalPropertyTypes).

import { BALANCE } from '../config/balance';
import { STARTER_ROD_ID } from '../data/rods';

export interface SaveData {
  schemaVersion: number; // erkennt inkompatible Altstände
  tokens: number;
  unlockedTips: string[]; // Tip-IDs (Set ist nicht serialisierbar)
  // Shop (M6) — additiv, kein Schema-Bump (fehlende Felder repariert SaveSystem).
  ownedRodIds: string[]; // besessene Ruten-IDs (Starter immer dabei)
  equippedRodId: string; // aktuell ausgerüstete Rute
  upgradeStacks: Record<string, number>; // Upgrade-ID → Anzahl Stapel
  muted: boolean; // reserviert für M8-Audio; bis dahin nur persistiert
}

/** Frischer Default-Stand. Factory (nicht Konstante) — sonst teilten sich
 *  mehrere Aufrufe dasselbe mutable `unlockedTips`-Array. */
export function createDefaultSave(): SaveData {
  return {
    schemaVersion: BALANCE.save.schemaVersion,
    tokens: 0,
    unlockedTips: [],
    ownedRodIds: [STARTER_ROD_ID],
    equippedRodId: STARTER_ROD_ID,
    upgradeStacks: {},
    muted: false,
  };
}
