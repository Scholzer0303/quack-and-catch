import { BALANCE } from '../config/balance';
import type { EventBus } from '../events/EventBus';
import type { GameEvents, GamePhase } from '../types/events';

const TICK_INTERVAL = BALANCE.ui.hudThrottleMs / 1000; // s zwischen round:tick-Emits

/**
 * Phasen + Rundenlebenszyklus (Timer + Score) — bewusst eine gekoppelte Einheit:
 * Score/Timer werden beim Eintritt in `playing` zurückgesetzt, der Timer treibt
 * `playing → summary`. `paused` (Tipp-Modal) friert den Timer ein; das Zurück
 * nach `playing` setzt NICHT zurück (Resume behält die Runde).
 */
export class GameStateMachine {
  private phase: GamePhase = 'start';
  private timeRemaining = 0;
  private score = 0;
  private tickAccum = 0;
  private readonly unsub: Array<() => void> = [];

  constructor(private readonly bus: EventBus<GameEvents>) {
    this.unsub.push(
      bus.on('duck:landed', (e) => {
        if (this.phase !== 'playing') return;
        this.score += e.value;
        // Sofort-Tick: ein Fang pausiert direkt danach (Tipp-Modal) — ohne dies
        // bliebe der HUD-Score bis zum „Weiter" auf dem alten Wert.
        this.bus.emit('round:tick', { timeRemaining: this.timeRemaining, score: this.score });
      }),
    );
  }

  getPhase(): GamePhase {
    return this.phase;
  }
  isPlaying(): boolean {
    return this.phase === 'playing';
  }
  getScore(): number {
    return this.score;
  }
  getTimeRemaining(): number {
    return this.timeRemaining;
  }

  /** Frische Runde (Start oder „Nochmal"). */
  start(): void {
    this.setPhase('playing');
  }
  /** Alias für Klarheit am Summary-Screen. */
  restart(): void {
    this.setPhase('playing');
  }

  setPhase(to: GamePhase): void {
    if (to === this.phase) return;
    const from = this.phase;
    this.phase = to;
    // Reset nur bei einer FRISCHEN Runde — Resume aus der Pause behält Timer/Score.
    if (to === 'playing' && from !== 'paused') this.reset();
    this.bus.emit('phase:changed', { from, to });
  }

  private reset(): void {
    this.timeRemaining = BALANCE.round.durationSec;
    this.score = 0;
    this.tickAccum = 0;
    // Sofort einen Tick, damit das HUD direkt die volle Zeit + Score 0 zeigt.
    this.bus.emit('round:tick', { timeRemaining: this.timeRemaining, score: this.score });
  }

  update(dt: number): void {
    if (this.phase !== 'playing') return;
    this.timeRemaining = Math.max(0, this.timeRemaining - dt);

    this.tickAccum += dt;
    if (this.tickAccum >= TICK_INTERVAL) {
      this.tickAccum = 0;
      this.bus.emit('round:tick', { timeRemaining: this.timeRemaining, score: this.score });
    }

    if (this.timeRemaining <= 0) {
      // Exakter Schluss-Tick (HUD zeigt 0), dann Rundenende + Phasenwechsel.
      this.bus.emit('round:tick', { timeRemaining: 0, score: this.score });
      this.bus.emit('round:ended', { score: this.score });
      this.setPhase('summary');
    }
  }

  dispose(): void {
    for (const off of this.unsub) off();
    this.unsub.length = 0;
  }
}
