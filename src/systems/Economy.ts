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

  dispose(): void {
    for (const off of this.unsub) off();
    this.unsub.length = 0;
  }
}
