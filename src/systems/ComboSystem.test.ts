import { describe, it, expect } from 'vitest';
import { EventBus } from '../events/EventBus';
import type { GameEvents } from '../types/events';
import { ComboSystem } from './ComboSystem';

/** Einen Fang (hook:result hit) feuern. */
function hit(bus: EventBus<GameEvents>): void {
  bus.emit('hook:result', { hit: true, perfect: false, duck: null });
}

describe('ComboSystem — Reset-Vertrag (M9/M10)', () => {
  it('zählt Fänge in Folge hoch und hebt den Multiplikator', () => {
    const bus = new EventBus<GameEvents>();
    const combo = new ComboSystem(bus);
    expect(combo.getMultiplier()).toBe(1);
    hit(bus);
    hit(bus); // Serie 2 → ×1.25 (balance.combo.tiers)
    expect(combo.getMultiplier()).toBe(1.25);
  });

  it('bricht die Serie bei Miss/Snap (hit=false)', () => {
    const bus = new EventBus<GameEvents>();
    const combo = new ComboSystem(bus);
    hit(bus);
    hit(bus);
    bus.emit('hook:result', { hit: false, perfect: false, duck: null });
    expect(combo.getMultiplier()).toBe(1);
  });

  it('behält die Serie beim Resume aus dem Tipp-Modal (paused → playing)', () => {
    const bus = new EventBus<GameEvents>();
    const combo = new ComboSystem(bus);
    hit(bus);
    hit(bus);
    bus.emit('phase:changed', { from: 'playing', to: 'paused' });
    bus.emit('phase:changed', { from: 'paused', to: 'playing' });
    expect(combo.getMultiplier()).toBe(1.25);
  });

  it('behält die Serie beim Resume aus dem Pause-Menü (pausemenu → playing)', () => {
    const bus = new EventBus<GameEvents>();
    const combo = new ComboSystem(bus);
    hit(bus);
    hit(bus);
    bus.emit('phase:changed', { from: 'playing', to: 'pausemenu' });
    bus.emit('phase:changed', { from: 'pausemenu', to: 'playing' });
    // M10-Fix: pausemenu zählt wie paused als Pause → Serie überlebt.
    expect(combo.getMultiplier()).toBe(1.25);
  });

  it('resettet die Serie bei einer frischen Runde (summary → playing)', () => {
    const bus = new EventBus<GameEvents>();
    const combo = new ComboSystem(bus);
    hit(bus);
    hit(bus);
    bus.emit('phase:changed', { from: 'summary', to: 'playing' });
    expect(combo.getMultiplier()).toBe(1);
  });
});
