import { BALANCE } from '../config/balance';
import { clamp, lerp } from '../utils/math';
import { prefersReducedMotion } from '../fx/reducedMotion';
import type { EventBus } from '../events/EventBus';
import type { GameEvents } from '../types/events';

interface CountAnim {
  from: number;
  to: number;
  elapsed: number;
}

const ROD_NAME = 'Bambusrute'; // M6: dynamisch aus rod:equipped

/** mm:ss aus Restsekunden (aufgerundet, nie negativ). */
function formatTime(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

/** Erstellt eine HUD-Statgruppe und gibt das Wertelement zurück. */
function statGroup(
  parent: HTMLElement,
  label: string,
  valueClass: string,
  extraGroupClass = '',
): HTMLSpanElement {
  const group = document.createElement('div');
  group.className = `qc-hud-group ${extraGroupClass}`.trim();
  const lab = document.createElement('span');
  lab.className = 'qc-stat-label';
  lab.textContent = label;
  const val = document.createElement('span');
  val.className = valueClass;
  group.append(lab, val);
  parent.appendChild(group);
  return val;
}

/**
 * Spiel-HUD: Score / Zeit / Tokens (Top-Bar) + Rod-Chip (unten links).
 * Speist sich aus `round:tick` (Score+Timer) und `economy:changed` (Tokens).
 */
export class HUD {
  private readonly bar: HTMLDivElement;
  private readonly rod: HTMLDivElement;
  private readonly scoreEl: HTMLSpanElement;
  private readonly timerEl: HTMLSpanElement;
  private readonly tokensEl: HTMLSpanElement;
  private readonly unsub: Array<() => void> = [];
  // Count-up: zeigt aktuell dargestellte Zahl + laufende Animation (Score/Tokens).
  private scoreShown = 0;
  private tokenShown = 0;
  private scoreAnim: CountAnim | null = null;
  private tokenAnim: CountAnim | null = null;
  private readonly reduced = prefersReducedMotion();

  constructor(parent: HTMLElement, bus: EventBus<GameEvents>) {
    this.bar = document.createElement('div');
    this.bar.className = 'qc-hud';

    this.scoreEl = statGroup(this.bar, 'Score', 'qc-stat-value', 'qc-hud-left');
    this.timerEl = statGroup(this.bar, 'Zeit', 'qc-timer');
    this.tokensEl = statGroup(this.bar, 'Tokens', 'qc-stat-value qc-tokens', 'qc-hud-right');

    this.rod = document.createElement('div');
    this.rod.className = 'qc-rod';
    this.rod.textContent = `🎣 ${ROD_NAME}`;

    parent.append(this.bar, this.rod);

    // Sinnvolle Startwerte, bevor das erste Event kommt.
    this.scoreEl.textContent = '0';
    this.tokensEl.textContent = '0';
    this.timerEl.textContent = formatTime(BALANCE.round.durationSec);

    this.unsub.push(bus.on('round:tick', (e) => this.onTick(e)));
    this.unsub.push(bus.on('economy:changed', (e) => this.onEconomy(e)));
  }

  private onTick(e: GameEvents['round:tick']): void {
    // Timer zeigt echte Sekunden sofort (kein Count-up); Score zählt hoch.
    this.timerEl.textContent = formatTime(e.timeRemaining);
    this.timerEl.classList.toggle('low-time', e.timeRemaining <= BALANCE.round.lowTimeWarnSec);
    // Bei Abnahme (Runden-Neustart: round:tick mit score 0) sofort snappen statt
    // rückwärts zählen; nur Hochzählen wird animiert.
    if (this.reduced || e.score < this.scoreShown) {
      this.scoreShown = e.score;
      this.scoreEl.textContent = String(e.score);
      this.scoreAnim = null;
    } else {
      this.scoreAnim = { from: this.scoreShown, to: e.score, elapsed: 0 };
    }
  }

  private onEconomy(e: GameEvents['economy:changed']): void {
    if (this.reduced || e.tokens < this.tokenShown) {
      this.tokenShown = e.tokens;
      this.tokensEl.textContent = String(e.tokens);
      this.tokenAnim = null;
    } else {
      this.tokenAnim = { from: this.tokenShown, to: e.tokens, elapsed: 0 };
    }
  }

  /** Pro Frame aus Game (über UIRoot): Count-up-Animationen vorantreiben. */
  animate(dt: number): void {
    const dur = BALANCE.juice.hud.countUpMs / 1000;
    if (this.scoreAnim) {
      this.scoreAnim.elapsed += dt;
      const t = clamp(this.scoreAnim.elapsed / dur, 0, 1);
      const v = Math.round(lerp(this.scoreAnim.from, this.scoreAnim.to, t));
      if (v !== this.scoreShown) {
        this.scoreShown = v;
        this.scoreEl.textContent = String(v);
      }
      if (t >= 1) this.scoreAnim = null;
    }
    if (this.tokenAnim) {
      this.tokenAnim.elapsed += dt;
      const t = clamp(this.tokenAnim.elapsed / dur, 0, 1);
      const v = Math.round(lerp(this.tokenAnim.from, this.tokenAnim.to, t));
      if (v !== this.tokenShown) {
        this.tokenShown = v;
        this.tokensEl.textContent = String(v);
      }
      if (t >= 1) this.tokenAnim = null;
    }
  }

  setVisible(visible: boolean): void {
    const display = visible ? '' : 'none';
    this.bar.style.display = display;
    this.rod.style.display = display;
  }

  dispose(): void {
    for (const off of this.unsub) off();
    this.unsub.length = 0;
    this.bar.remove();
    this.rod.remove();
  }
}
