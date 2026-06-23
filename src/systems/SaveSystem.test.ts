import { describe, it, expect, beforeEach } from 'vitest';
import { BALANCE } from '../config/balance';
import { EventBus } from '../events/EventBus';
import type { GameEvents } from '../types/events';
import { Economy } from './Economy';
import { HighscoreSystem } from './HighscoreSystem';
import { SaveSystem } from './SaveSystem';

const KEY = BALANCE.save.storageKey;

interface Harness {
  bus: EventBus<GameEvents>;
  economy: Economy;
  highscore: HighscoreSystem;
  save: SaveSystem;
}

function makeHarness(): Harness {
  const bus = new EventBus<GameEvents>();
  const economy = new Economy(bus);
  const highscore = new HighscoreSystem(bus);
  const save = new SaveSystem(bus, economy, highscore);
  return { bus, economy, highscore, save };
}

describe('SaveSystem — Laden/Validierung/Persistenz (M4/M9)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('fällt bei leerem Storage auf Defaults zurück', () => {
    const h = makeHarness();
    h.save.load();
    expect(h.economy.getTokens()).toBe(0);
    expect(h.highscore.getHighScore()).toBe(0);
  });

  it('fällt bei korruptem JSON sauber auf Defaults zurück', () => {
    localStorage.setItem(KEY, '{nicht valides json');
    const h = makeHarness();
    h.save.load();
    expect(h.economy.getTokens()).toBe(0);
  });

  it('verwirft bei Schema-Version-Mismatch komplett', () => {
    localStorage.setItem(KEY, JSON.stringify({ schemaVersion: 999, tokens: 500, highScore: 500 }));
    const h = makeHarness();
    h.save.load();
    expect(h.economy.getTokens()).toBe(0);
    expect(h.highscore.getHighScore()).toBe(0);
  });

  it('lädt gültige Werte inkl. highScore', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        schemaVersion: BALANCE.save.schemaVersion,
        tokens: 42,
        unlockedTips: [],
        ownedRodIds: ['rod-holz'],
        equippedRodId: 'rod-holz',
        upgradeStacks: {},
        muted: false,
        highScore: 99,
      }),
    );
    const h = makeHarness();
    h.save.load();
    expect(h.economy.getTokens()).toBe(42);
    expect(h.highscore.getHighScore()).toBe(99);
  });

  it('repariert einen negativen Token-Wert auf 0', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ schemaVersion: BALANCE.save.schemaVersion, tokens: -50 }),
    );
    const h = makeHarness();
    h.save.load();
    expect(h.economy.getTokens()).toBe(0);
  });

  it('persistiert einen neuen Rekord über einen Neustart hinweg', () => {
    const h1 = makeHarness();
    h1.save.load();
    h1.bus.emit('round:ended', { score: 77 }); // → highscore:changed (isNewRecord) → Write geplant
    h1.save.flush(); // ausstehenden Write sofort schreiben
    h1.save.dispose();

    const h2 = makeHarness();
    h2.save.load();
    expect(h2.highscore.getHighScore()).toBe(77);
  });
});
