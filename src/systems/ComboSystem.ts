import { BALANCE } from '../config/balance';
import type { EventBus } from '../events/EventBus';
import type { GameEvents } from '../types/events';

/**
 * Fang-Serie (M9): zählt aufeinanderfolgende Fänge. Jeder Treffer (`hook:result`
 * hit) erhöht die Serie, ein Miss/Snap (hit=false) bricht sie. Der daraus
 * abgeleitete Multiplikator skaliert die Token-Belohnung (RewardSystem liest
 * `getMultiplier()` beim Landen — `duck:landed` folgt stets NACH dem `hook:result`
 * dieses Fangs, der Multiplikator ist also schon aktuell).
 *
 * Reset-Vertrag wie GameStateMachine: eine FRISCHE Runde (`playing` aus ≠ `paused`)
 * setzt die Serie zurück; das Tipp-Modal (`paused`) zwischen zwei Fängen NICHT —
 * sonst risse jede Belohnung die eigene Serie ab.
 */
export class ComboSystem {
  private count = 0;
  private readonly unsub: Array<() => void> = [];

  constructor(private readonly bus: EventBus<GameEvents>) {
    this.unsub.push(
      bus.on('hook:result', (e) => {
        if (e.hit) this.register();
        else this.reset();
      }),
    );
    this.unsub.push(
      bus.on('phase:changed', (e) => {
        if (e.to === 'playing' && e.from !== 'paused') this.reset();
      }),
    );
  }

  /** Aktueller Token-Multiplikator (höchster erreichter Tier, sonst ×1). */
  getMultiplier(): number {
    let m = 1;
    for (const t of BALANCE.combo.tiers) if (this.count >= t.streak) m = t.mult;
    return m;
  }

  private register(): void {
    this.count++;
    this.bus.emit('combo:changed', { count: this.count, multiplier: this.getMultiplier() });
  }

  private reset(): void {
    if (this.count === 0) return; // schon zurückgesetzt → kein redundantes Event
    this.count = 0;
    this.bus.emit('combo:changed', { count: 0, multiplier: 1 });
  }

  dispose(): void {
    for (const off of this.unsub) off();
    this.unsub.length = 0;
  }
}
