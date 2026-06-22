import { BALANCE } from '../config/balance';
import { TIPS } from '../data/tips';
import { createDefaultSave, type SaveData } from '../types/state';
import type { EventBus } from '../events/EventBus';
import type { GameEvents } from '../types/events';
import type { Economy } from './Economy';

const KEY = BALANCE.save.storageKey;
const KNOWN_TIP_IDS: ReadonlySet<string> = new Set(TIPS.map((t) => t.id));

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
    });
    // ERST nach hydrate abonnieren (sonst triggert der hydrate-Emit einen Write).
    this.unsub.push(this.bus.on('economy:changed', () => this.onEconomyChanged()));
    window.addEventListener('pagehide', this.onPageHide);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  isMuted(): boolean {
    return this.current.muted;
  }

  /** Reserviert für M8-Audio: Mute-Zustand persistieren. */
  setMuted(value: boolean): void {
    if (this.current.muted === value) return;
    this.current.muted = value;
    this.scheduleWrite();
  }

  /** Ausstehenden Write sofort schreiben (idempotent, wenn nichts ansteht). */
  flush(): void {
    if (this.timer !== null) this.writeNow();
  }

  dispose(): void {
    this.flush();
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
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

    const tokens =
      typeof o.tokens === 'number' && Number.isFinite(o.tokens) && o.tokens >= 0
        ? o.tokens
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

    const muted = typeof o.muted === 'boolean' ? o.muted : def.muted;

    return { schemaVersion: BALANCE.save.schemaVersion, tokens, unlockedTips, muted };
  }
}
