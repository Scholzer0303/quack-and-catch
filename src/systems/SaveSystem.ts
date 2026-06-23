import { BALANCE } from '../config/balance';
import { TIPS } from '../data/tips';
import { RODS, UPGRADES, STARTER_ROD_ID } from '../data/rods';
import { createDefaultSave, type SaveData } from '../types/state';
import type { EventBus } from '../events/EventBus';
import type { GameEvents } from '../types/events';
import type { Economy } from './Economy';

const KEY = BALANCE.save.storageKey;
const KNOWN_TIP_IDS: ReadonlySet<string> = new Set(TIPS.map((t) => t.id));
const KNOWN_ROD_IDS: ReadonlySet<string> = new Set(RODS.map((r) => r.id));
// Upgrade-ID → maxStacks (clamp gegen manipulierten/veralteten Storage).
const UPGRADE_MAX_STACKS: ReadonlyMap<string, number> = new Map(
  UPGRADES.map((u) => [u.id, u.maxStacks]),
);

/**
 * Persistiert Tokens + freigeschaltete Tipps in `localStorage`. Versioniert
 * (`schemaVersion`), debounced (Schreib-Zusammenfassung) und korruptionssicher:
 * jeder Lese-/Parse-/Schreibpfad ist gekapselt, ein kaputter Eintrag fällt
 * sauber auf Defaults zurück — Gameplay crasht nie an Storage.
 *
 * Reihenfolge-Vertrag: `load()` hydratisiert die Economy ZUERST (feuert
 * `economy:changed` → HUD), abonniert `economy:changed` DANACH — so löst der
 * Boot-Emit keinen redundanten Write/Feedback-Loop aus.
 */
export class SaveSystem {
  private current: SaveData = createDefaultSave();
  private timer: number | null = null;
  private readonly unsub: Array<() => void> = [];

  constructor(
    private readonly bus: EventBus<GameEvents>,
    private readonly economy: Economy,
  ) {}

  /** Einmal beim Boot: laden, validieren, Economy hydratisieren, dann abonnieren. */
  load(): void {
    this.current = this.read();
    this.economy.hydrate({
      tokens: this.current.tokens,
      unlockedTips: this.current.unlockedTips,
      ownedRodIds: this.current.ownedRodIds,
      equippedRodId: this.current.equippedRodId,
      upgradeStacks: this.current.upgradeStacks,
    });
    // Mute-Initialwert an AudioManager + MuteButton (beide vor save.load gebaut).
    // VOR dem Abonnieren emittieren, damit dieser Lade-Emit keinen Write auslöst.
    this.bus.emit('audio:muteChanged', { muted: this.current.muted });
    // ERST nach hydrate abonnieren (sonst triggert der hydrate-Emit einen Write).
    this.unsub.push(this.bus.on('economy:changed', () => this.onEconomyChanged()));
    this.unsub.push(
      this.bus.on('audio:muteChanged', (e) => {
        this.current.muted = e.muted;
        this.scheduleWrite();
      }),
    );
    window.addEventListener('pagehide', this.onPageHide);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  /** Ausstehenden Write sofort schreiben (idempotent, wenn nichts ansteht). */
  flush(): void {
    if (this.timer !== null) this.writeNow();
  }

  dispose(): void {
    this.flush(); // schreibt + nullt einen ausstehenden Timer
    window.removeEventListener('pagehide', this.onPageHide);
    document.removeEventListener('visibilitychange', this.onVisibility);
    for (const off of this.unsub) off();
    this.unsub.length = 0;
  }

  // — intern —

  private onEconomyChanged(): void {
    const slice = this.economy.snapshot();
    this.current.tokens = slice.tokens;
    this.current.unlockedTips = slice.unlockedTips;
    this.current.ownedRodIds = slice.ownedRodIds;
    this.current.equippedRodId = slice.equippedRodId;
    this.current.upgradeStacks = slice.upgradeStacks;
    this.scheduleWrite();
  }

  private readonly onPageHide = (): void => this.flush();
  private readonly onVisibility = (): void => {
    // Hintergrund/Tab-Wechsel: ausstehenden Stand sichern (Mobile feuert
    // hier zuverlässiger als pagehide).
    if (document.visibilityState === 'hidden') this.flush();
  };

  private scheduleWrite(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.writeNow(), BALANCE.save.debounceMs);
  }

  private writeNow(): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(this.current));
    } catch (err) {
      // Quota überschritten / Private-Mode: schlucken, nie Gameplay crashen.
      if (import.meta.env.DEV) console.warn('SaveSystem: Schreiben fehlgeschlagen', err);
    }
  }

  /** Lesen + defensiv validieren. Jede Stufe fällt sauber auf Default zurück. */
  private read(): SaveData {
    let raw: string | null;
    try {
      raw = localStorage.getItem(KEY);
    } catch {
      return createDefaultSave(); // Storage nicht verfügbar (Private-Mode)
    }
    if (raw === null) return createDefaultSave(); // Erststart

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return createDefaultSave(); // korruptes JSON
    }
    return this.validate(parsed);
  }

  /** Feldweise reparieren statt alles-oder-nichts: Teilkorruption bleibt nutzbar.
   *  Nur die Version mismatch verwirft komplett (kein Migrationspfad in v1). */
  private validate(input: unknown): SaveData {
    const def = createDefaultSave();
    if (typeof input !== 'object' || input === null) return def;
    const o = input as Record<string, unknown>;

    // Version: bei Abweichung verwerfen (Seam für spätere Migration).
    if (o.schemaVersion !== BALANCE.save.schemaVersion) return def;

    // Tokens sind im Spiel immer ganzzahlig (randInt); Bruchwerte aus manipuliertem
    // Storage abschneiden statt durchreichen.
    const tokens =
      typeof o.tokens === 'number' && Number.isFinite(o.tokens) && o.tokens >= 0
        ? Math.floor(o.tokens)
        : def.tokens;

    const unlockedTips = Array.isArray(o.unlockedTips)
      ? [
          ...new Set(
            o.unlockedTips.filter(
              (t): t is string => typeof t === 'string' && KNOWN_TIP_IDS.has(t),
            ),
          ),
        ]
      : def.unlockedTips;

    // Besessene Ruten: nur bekannte IDs, Starter immer dabei, dedupliziert.
    const ownedRodIds = Array.isArray(o.ownedRodIds)
      ? [
          ...new Set([
            STARTER_ROD_ID,
            ...o.ownedRodIds.filter(
              (r): r is string => typeof r === 'string' && KNOWN_ROD_IDS.has(r),
            ),
          ]),
        ]
      : def.ownedRodIds;

    // Ausgerüstete Rute muss bekannt UND besessen sein, sonst Starter.
    const equippedRodId =
      typeof o.equippedRodId === 'string' && ownedRodIds.includes(o.equippedRodId)
        ? o.equippedRodId
        : STARTER_ROD_ID;

    // Upgrade-Stapel: nur bekannte Upgrades, Anzahl ganzzahlig in [1, maxStacks].
    const upgradeStacks: Record<string, number> = {};
    if (typeof o.upgradeStacks === 'object' && o.upgradeStacks !== null) {
      for (const [id, raw] of Object.entries(o.upgradeStacks as Record<string, unknown>)) {
        const max = UPGRADE_MAX_STACKS.get(id);
        if (max === undefined || typeof raw !== 'number' || !Number.isFinite(raw)) continue;
        const n = Math.min(max, Math.floor(raw));
        if (n >= 1) upgradeStacks[id] = n;
      }
    }

    const muted = typeof o.muted === 'boolean' ? o.muted : def.muted;

    return {
      schemaVersion: BALANCE.save.schemaVersion,
      tokens,
      unlockedTips,
      ownedRodIds,
      equippedRodId,
      upgradeStacks,
      muted,
    };
  }
}
