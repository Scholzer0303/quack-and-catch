import { BALANCE } from '../config/balance';
import { randInt, type Rng } from '../utils/rng';
import { TIPS } from '../data/tips';
import type { EventBus } from '../events/EventBus';
import type { GameEvents } from '../types/events';
import { RARITY_ORDER, type DuckRarity, type Tip } from '../types/domain';
import type { Economy } from './Economy';
import type { ComboSystem } from './ComboSystem';

/**
 * Wandelt einen Fang in eine Belohnung: rollt Tokens je Rarität (+Perfect-Bonus)
 * und wählt eine Tipp-Karte des passenden Tiers (bevorzugt noch nicht
 * freigeschaltete). Emittiert `reward:granted`.
 *
 * Reihenfolge-Vertrag: FishingRod feuert `hook:result{hit}` VOR `duck:landed`.
 * Wir cachen das Perfect-Flag aus `hook:result` und verbrauchen es beim Landen.
 * Miss/Snap (`hit:false`) löschen das Flag (kein `duck:landed` folgt).
 */
export class RewardSystem {
  private pendingPerfect = false;
  private readonly unsub: Array<() => void> = [];

  constructor(
    private readonly bus: EventBus<GameEvents>,
    private readonly economy: Economy,
    private readonly rng: Rng,
    private readonly combo: ComboSystem,
  ) {
    this.unsub.push(
      bus.on('hook:result', (e) => {
        this.pendingPerfect = e.hit ? e.perfect : false;
      }),
    );
    this.unsub.push(bus.on('duck:landed', (e) => this.onLanded(e.rarity)));
  }

  private onLanded(rarity: DuckRarity): void {
    const range = BALANCE.rewards.tokensByRarity[rarity] ?? [1, 1];
    let tokens = randInt(this.rng, range[0], range[1]);
    if (this.pendingPerfect) {
      tokens = tokens * (1 + BALANCE.hook.perfectTokenBonus);
    }
    this.pendingPerfect = false; // sofort verbrauchen → kein Leak in den nächsten Fang
    // Fang-Serie skaliert die Belohnung (M9). Combo wurde beim `hook:result` dieses
    // Fangs bereits erhöht → Multiplikator ist aktuell. Rundung am Ende.
    tokens = Math.round(tokens * this.combo.getMultiplier());

    const tip = this.pickTip(rarity);
    const isNewTip = tip ? !this.economy.isUnlocked(tip.id) : false;
    this.bus.emit('reward:granted', { tokens, tip, isNewTip });
  }

  /** Tipp des Ziel-Tiers (ggf. per Crossover höher); bevorzugt noch nicht freigeschaltete. */
  private pickTip(rarity: DuckRarity): Tip | null {
    const tier = this.rollTipTier(rarity);
    const ofTier = TIPS.filter((t) => t.tier === tier);
    if (ofTier.length === 0) return null;
    const fresh = ofTier.filter((t) => !this.economy.isUnlocked(t.id));
    const pool = fresh.length > 0 ? fresh : ofTier;
    return pool[randInt(this.rng, 0, pool.length - 1)] ?? null;
  }

  /**
   * Wissens-Crossover (M11): meist liefert eine Ente eine Karte ihres eigenen Tiers.
   * Mit `crossoverChance` springt sie aber auf ein STRIKT höheres Tier — so gibt auch
   * eine gewöhnliche Ente selten Top-Wissen preis. Das Top-Tier (heilig) hat kein
   * höheres → kein Crossover. Tokens bleiben rarität-gebunden (hier nicht berührt).
   */
  private rollTipTier(rarity: DuckRarity): DuckRarity {
    const idx = RARITY_ORDER.indexOf(rarity);
    const higher = RARITY_ORDER.slice(idx + 1);
    if (higher.length === 0 || this.rng() >= BALANCE.rewards.crossoverChance) return rarity;
    return higher[randInt(this.rng, 0, higher.length - 1)] ?? rarity;
  }

  dispose(): void {
    for (const off of this.unsub) off();
    this.unsub.length = 0;
  }
}
