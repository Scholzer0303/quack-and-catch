import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus } from '../events/EventBus';
import type { GameEvents } from '../types/events';
import { Economy } from './Economy';

/** Frische Economy mit `tokens` Guthaben (über hydrate gesetzt). */
function makeEconomy(tokens: number): Economy {
  const bus = new EventBus<GameEvents>();
  const eco = new Economy(bus);
  eco.hydrate({
    tokens,
    unlockedTips: [],
    ownedRodIds: [],
    equippedRodId: 'rod-holz',
    upgradeStacks: {},
  });
  return eco;
}

describe('Economy — Kauf-/Ausrüst-Validierung (M6/M9)', () => {
  let eco: Economy;
  beforeEach(() => {
    eco = makeEconomy(100);
  });

  it('kauft eine Rute bei genug Tokens und zieht den Preis ab', () => {
    expect(eco.buyRod('rod-glueck')).toBe(true); // 45
    expect(eco.owns('rod-glueck')).toBe(true);
    expect(eco.getTokens()).toBe(55);
  });

  it('lehnt Kauf bei zu wenig Tokens ab (kein State-Eingriff)', () => {
    const poor = makeEconomy(10);
    expect(poor.buyRod('rod-glueck')).toBe(false);
    expect(poor.owns('rod-glueck')).toBe(false);
    expect(poor.getTokens()).toBe(10);
  });

  it('lehnt unbekannte und bereits besessene Ruten ab', () => {
    expect(eco.buyRod('rod-gibtsnicht')).toBe(false);
    expect(eco.buyRod('rod-glueck')).toBe(true);
    expect(eco.buyRod('rod-glueck')).toBe(false); // schon besessen
  });

  it('rüstet nur besessene Ruten aus', () => {
    expect(eco.equipRod('rod-glueck')).toBe(false); // nicht besessen
    eco.buyRod('rod-glueck');
    expect(eco.equipRod('rod-glueck')).toBe(true);
    expect(eco.isEquipped('rod-glueck')).toBe(true);
    expect(eco.equipRod('rod-glueck')).toBe(false); // bereits ausgerüstet
  });

  it('respektiert maxStacks beim Upgrade-Kauf', () => {
    // up-schnur: Basispreis 30, maxStacks 2; Preis eskaliert (30 → 51)
    expect(eco.buyUpgrade('up-schnur')).toBe(true);
    expect(eco.buyUpgrade('up-schnur')).toBe(true);
    expect(eco.buyUpgrade('up-schnur')).toBe(false); // maxStacks erreicht
    expect(eco.getStacks('up-schnur')).toBe(2);
    expect(eco.getTokens()).toBe(19); // 100 - 30 - round(30×1.7)=51
  });

  it('eskaliert den Upgrade-Preis je gekaufter Stufe (×growth)', () => {
    const rich = makeEconomy(1000);
    // up-rolle: Basispreis 35, growth 1.7 → 35 → 60 → 101
    expect(rich.getUpgradePrice('up-rolle')).toBe(35);
    rich.buyUpgrade('up-rolle');
    expect(rich.getUpgradePrice('up-rolle')).toBe(60); // round(35 × 1.7)
    rich.buyUpgrade('up-rolle');
    expect(rich.getUpgradePrice('up-rolle')).toBe(101); // round(35 × 1.7²)
  });

  it('lehnt unbekannte Upgrades ab', () => {
    expect(eco.buyUpgrade('up-gibtsnicht')).toBe(false);
  });

  it('spiegelt gekaufte Upgrades in den aktiven Rod-Stats', () => {
    const base = eco.getActiveRodStats().lineStrength;
    eco.buyUpgrade('up-schnur'); // +1 lineStrength
    expect(eco.getActiveRodStats().lineStrength).toBe(base + 1);
  });
});
