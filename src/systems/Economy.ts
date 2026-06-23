import { BALANCE } from '../config/balance';
import { findRod, findUpgrade, STARTER_ROD_ID } from '../data/rods';
import type { EventBus } from '../events/EventBus';
import type { GameEvents } from '../types/events';
import type { RodStats } from '../types/domain';

/**
 * Token-Ökonomie + freigeschaltete Tipps + Ruten-Besitz/Ausrüstung/Upgrades (M6).
 * Hört auf `reward:granted` (Tokens + Erstfreischalt-Bonus) und meldet den neuen
 * Saldo per `economy:changed`. Kauf/Equip/Upgrade validieren hier (Single Source
 * der Kaufregeln); aktive Rod-Stats werden über `rod:statsChanged` an die Engine
 * gemeldet. In-Memory; persistiert das SaveSystem über snapshot()/hydrate().
 */
export class Economy {
  private tokens = 0;
  private readonly unlockedTips = new Set<string>();
  // Ruten-Besitz: Starter ist immer dabei und initial ausgerüstet (bis hydrate lädt).
  private readonly ownedRodIds = new Set<string>([STARTER_ROD_ID]);
  private equippedRodId: string = STARTER_ROD_ID;
  private readonly upgradeStacks = new Map<string, number>();
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

  // —— Shop (M6) ——

  owns(rodId: string): boolean {
    return this.ownedRodIds.has(rodId);
  }

  isEquipped(rodId: string): boolean {
    return this.equippedRodId === rodId;
  }

  getEquippedRodId(): string {
    return this.equippedRodId;
  }

  getStacks(upgradeId: string): number {
    return this.upgradeStacks.get(upgradeId) ?? 0;
  }

  canAfford(price: number): boolean {
    return this.tokens >= price;
  }

  /** Rute kaufen (nicht ausrüsten). false, wenn unbekannt/schon besessen/zu teuer. */
  buyRod(rodId: string): boolean {
    const rod = findRod(rodId);
    if (!rod || this.ownedRodIds.has(rodId) || this.tokens < rod.price) return false;
    this.tokens -= rod.price;
    this.ownedRodIds.add(rodId);
    this.bus.emit('economy:changed', { tokens: this.tokens });
    return true;
  }

  /** Besessene Rute ausrüsten. false, wenn nicht besessen oder bereits ausgerüstet. */
  equipRod(rodId: string): boolean {
    if (!this.ownedRodIds.has(rodId) || this.equippedRodId === rodId) return false;
    this.equippedRodId = rodId;
    this.emitStatsChanged();
    this.bus.emit('economy:changed', { tokens: this.tokens }); // UI-Refresh + Save-Trigger
    return true;
  }

  /** Stapelbares Upgrade kaufen. false, wenn unbekannt/maxStacks erreicht/zu teuer. */
  buyUpgrade(upgradeId: string): boolean {
    const up = findUpgrade(upgradeId);
    if (!up) return false;
    const current = this.upgradeStacks.get(upgradeId) ?? 0;
    if (current >= up.maxStacks || this.tokens < up.price) return false;
    this.tokens -= up.price;
    this.upgradeStacks.set(upgradeId, current + 1);
    this.emitStatsChanged();
    this.bus.emit('economy:changed', { tokens: this.tokens });
    return true;
  }

  /** Aktive Stats = ausgerüstete Rute + Summe aller gestapelten Upgrade-Deltas. */
  getActiveRodStats(): RodStats {
    const rod = findRod(this.equippedRodId) ?? findRod(STARTER_ROD_ID)!;
    const stats: RodStats = { ...rod.stats };
    for (const [id, count] of this.upgradeStacks) {
      if (count <= 0) continue;
      const up = findUpgrade(id);
      if (!up) continue;
      for (const k of Object.keys(up.apply) as (keyof RodStats)[]) {
        const delta = up.apply[k];
        if (delta !== undefined) stats[k] += delta * count;
      }
    }
    return stats;
  }

  private emitStatsChanged(): void {
    const tier = findRod(this.equippedRodId)?.tier ?? 0;
    this.bus.emit('rod:statsChanged', { stats: this.getActiveRodStats(), tier });
  }

  /** Serialisierbarer Economy-Slice fürs SaveSystem (ohne Save-Schema-Wissen). */
  snapshot(): {
    tokens: number;
    unlockedTips: string[];
    ownedRodIds: string[];
    equippedRodId: string;
    upgradeStacks: Record<string, number>;
  } {
    return {
      tokens: this.tokens,
      unlockedTips: [...this.unlockedTips],
      ownedRodIds: [...this.ownedRodIds],
      equippedRodId: this.equippedRodId,
      upgradeStacks: Object.fromEntries(this.upgradeStacks),
    };
  }

  /** Geladenen Stand übernehmen. Feuert `economy:changed` (HUD) UND
   *  `rod:statsChanged` (Engine übernimmt geladene Rute/Upgrades). */
  hydrate(data: {
    tokens: number;
    unlockedTips: readonly string[];
    ownedRodIds: readonly string[];
    equippedRodId: string;
    upgradeStacks: Readonly<Record<string, number>>;
  }): void {
    this.tokens = data.tokens;
    this.unlockedTips.clear();
    for (const id of data.unlockedTips) this.unlockedTips.add(id);

    this.ownedRodIds.clear();
    this.ownedRodIds.add(STARTER_ROD_ID); // Starter ist nie verlierbar
    for (const id of data.ownedRodIds) this.ownedRodIds.add(id);
    this.equippedRodId = this.ownedRodIds.has(data.equippedRodId)
      ? data.equippedRodId
      : STARTER_ROD_ID;

    this.upgradeStacks.clear();
    for (const [id, count] of Object.entries(data.upgradeStacks)) {
      this.upgradeStacks.set(id, count);
    }

    this.bus.emit('economy:changed', { tokens: this.tokens });
    this.emitStatsChanged();
  }

  dispose(): void {
    for (const off of this.unsub) off();
    this.unsub.length = 0;
  }
}
