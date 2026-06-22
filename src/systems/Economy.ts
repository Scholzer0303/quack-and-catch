import { BALANCE } from '../config/balance';
import type { EventBus } from '../events/EventBus';
import type { GameEvents } from '../types/events';

/**
 * Token-Ökonomie + freigeschaltete Tipps. Hört auf `reward:granted`, addiert
 * Tokens (inkl. Erstfreischalt-Bonus) und meldet den neuen Saldo per
 * `economy:changed`. In-Memory; Persistenz folgt in M4 (SaveSystem).
 */
export class Economy {
  private tokens = 0;
  private readonly unlockedTips = new Set<string>();
  private readonly unsub: Array<() => void> = [];

  constructor(private readonly bus: EventBus<GameEvents>) {
    this.unsub.push(bus.on('reward:granted', (e) => this.onReward(e)));
  }

  private onReward(e: GameEvents['reward:granted']): void {
    this.tokens += e.tokens;
    if (e.tip && e.isNewTip) {
      this.unlockedTips.add(e.tip.id);
      this.tokens += BALANCE.rewards.firstTimeCodexBonus;
    }
    this.bus.emit('economy:changed', { tokens: this.tokens });
  }

  getTokens(): number {
    return this.tokens;
  }

  isUnlocked(id: string): boolean {
    return this.unlockedTips.has(id);
  }

  unlockedCount(): number {
    return this.unlockedTips.size;
  }

  /** Serialisierbarer Economy-Slice fürs SaveSystem (ohne Save-Schema-Wissen). */
  snapshot(): { tokens: number; unlockedTips: string[] } {
    return { tokens: this.tokens, unlockedTips: [...this.unlockedTips] };
  }

  /** Geladenen Stand übernehmen und das HUD über `economy:changed` aktualisieren
   *  (HUD liest den Token-Saldo ausschließlich aus diesem Event). */
  hydrate(data: { tokens: number; unlockedTips: readonly string[] }): void {
    this.tokens = data.tokens;
    this.unlockedTips.clear();
    for (const id of data.unlockedTips) this.unlockedTips.add(id);
    this.bus.emit('economy:changed', { tokens: this.tokens });
  }

  dispose(): void {
    for (const off of this.unsub) off();
    this.unsub.length = 0;
  }
}
