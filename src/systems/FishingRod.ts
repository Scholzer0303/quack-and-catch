import * as THREE from 'three';
import { BALANCE } from '../config/balance';
import { clamp } from '../utils/math';
import type { EventBus } from '../events/EventBus';
import type { GameEvents } from '../types/events';
import type { Duck, DuckRarity } from '../types/domain';
import { DuckSpawner } from './DuckSpawner';
import { HookRaycaster } from './HookRaycaster';

export type RodState = 'idle' | 'casting' | 'window' | 'cooldown';

/** Stat-Block der aktiven Angel (Tier 0 bis M6 echte Rods verdrahtet). */
interface RodStats {
  reach: number;
  castSpeed: number;
  reelSpeed: number;
  timingWindowMul: number;
  lineStrength: number;
}

const TIER0_STATS: RodStats = {
  reach: BALANCE.hook.baseReach,
  castSpeed: 1,
  reelSpeed: 1,
  timingWindowMul: 1,
  lineStrength: BALANCE.hook.baseLineStrength,
};

/** Rarität → Linien-Gewicht + Score-Wert (DESIGN-Tabelle); abgelöst durch data/ducks.ts in M3. */
const RARITY_INFO: Record<DuckRarity, { weight: number; value: number }> = {
  common: { weight: 1, value: 10 },
  uncommon: { weight: 2, value: 25 },
  rare: { weight: 3, value: 60 },
  epic: { weight: 4, value: 140 },
  legendary: { weight: 5, value: 350 },
};

/** Haken-Anker in Kamera-lokalen Koordinaten (deckt sich mit RodBuilder). */
const HOOK_LOCAL = new THREE.Vector3(0.04, -0.3, -1.73);

/** Schnappschuss für das Reticle (kein neuer Event-Typ nötig). */
export interface RodView {
  state: RodState;
  castProgress: number; // 0..1 während casting
  windowProgress: number; // 0..1 während window
  inPerfect: boolean; // gerade im Perfect-Band
  hasTarget: boolean; // anvisierte Ente vorhanden
  cooldownProgress: number; // 0..1 während cooldown
}

/**
 * Fang-State-Machine (Halten-Laden & Loslassen):
 * idle → casting → window → (Treffer | Fehlversuch) → cooldown → idle.
 * Jeder Hold wird zwangsaufgelöst (Window-Timeout / cancel) — kein Softlock.
 */
export class FishingRod {
  private readonly raycaster = new HookRaycaster();
  private readonly stats = TIER0_STATS;
  private readonly hookWorld = new THREE.Vector3();

  private state: RodState = 'idle';
  private timer = 0; // Sekunden im aktuellen Zustand
  private lockDuck: Duck | null = null;
  private hovered: Duck | null = null;
  private perfect = false;

  constructor(
    private readonly camera: THREE.Camera,
    private readonly ducks: DuckSpawner,
    private readonly bus: EventBus<GameEvents>,
  ) {}

  // ---- Dauern (Sekunden), aus BALANCE.hook + Rod-Stats abgeleitet ----
  private get castDur(): number {
    return BALANCE.hook.castDurationMs / 1000 / this.stats.castSpeed;
  }
  private get windowDur(): number {
    return (BALANCE.hook.baseWindowMs / 1000) * this.stats.timingWindowMul;
  }
  private get perfectDur(): number {
    return (BALANCE.hook.perfectWindowMs / 1000) * this.stats.timingWindowMul;
  }
  private get cooldownDur(): number {
    return BALANCE.hook.cooldownMs / 1000;
  }

  /** Haken-Weltposition (Kamera schwenkt → pro Aufruf frisch). */
  private hookAnchor(): THREE.Vector3 {
    return this.camera.localToWorld(this.hookWorld.copy(HOOK_LOCAL));
  }

  private aimTarget(): Duck | null {
    return this.raycaster.findTarget(
      this.camera,
      this.hookAnchor(),
      this.ducks.ducks,
      this.stats.reach,
      BALANCE.hook.catchRadius,
    );
  }

  /** Pointerdown: Ziel locken und Cast starten. Nur aus idle. */
  press(aimX: number, aimY: number): void {
    if (this.state !== 'idle') return;
    this.lockDuck = this.aimTarget();
    this.bus.emit('hook:cast', { aimX, aimY });
    this.state = 'casting';
    this.timer = 0;
    this.perfect = false;
  }

  /** Pointerup: Hold auflösen. */
  release(): void {
    if (this.state === 'casting') {
      this.resolveMiss(); // zu früh losgelassen
    } else if (this.state === 'window') {
      this.resolveAtRelease();
    }
  }

  /** Verlorener Pointer/Fokus: laufenden Hold als Fehlversuch beenden (Softlock-Schutz). */
  cancel(): void {
    if (this.state === 'casting' || this.state === 'window') {
      this.resolveMiss();
    }
  }

  update(dt: number): void {
    switch (this.state) {
      case 'idle':
        this.hovered = this.aimTarget();
        break;
      case 'casting':
        this.timer += dt;
        if (this.timer >= this.castDur) {
          this.state = 'window';
          this.timer = 0;
        }
        break;
      case 'window':
        this.timer += dt;
        // Auto-Resolve am Fensterende: nie hängender Hold (auch ohne release).
        if (this.timer >= this.windowDur) this.resolveAtRelease();
        break;
      case 'cooldown':
        this.timer += dt;
        if (this.timer >= this.cooldownDur) {
          this.state = 'idle';
          this.timer = 0;
        }
        break;
    }
  }

  /** Auflösung beim Loslassen im Window (oder beim Timeout). */
  private resolveAtRelease(): void {
    // Treffer nur mit gültigem, noch lebendem Ziel.
    if (!this.lockDuck || !this.lockDuck.alive) {
      this.resolveMiss();
      return;
    }
    // Perfect = Loslassen im zentralen Band des Fensters.
    const half = this.perfectDur / 2;
    const center = this.windowDur / 2;
    this.perfect = Math.abs(this.timer - center) <= half;
    this.land(this.lockDuck);
  }

  private land(duck: Duck): void {
    const info = RARITY_INFO[duck.rarity];
    this.ducks.removeAndRespawn(duck.slot);
    this.bus.emit('hook:result', { hit: true, perfect: this.perfect, duck });
    this.bus.emit('duck:landed', { rarity: duck.rarity, value: info.value });
    this.lockDuck = null;
    this.toCooldown();
  }

  private resolveMiss(): void {
    this.bus.emit('hook:result', { hit: false, perfect: false, duck: null });
    this.lockDuck = null;
    this.perfect = false;
    this.toCooldown();
  }

  private toCooldown(): void {
    this.state = 'cooldown';
    this.timer = 0;
  }

  getView(): RodView {
    return {
      state: this.state,
      castProgress: this.state === 'casting' ? clamp(this.timer / this.castDur, 0, 1) : 0,
      windowProgress: this.state === 'window' ? clamp(this.timer / this.windowDur, 0, 1) : 0,
      inPerfect:
        this.state === 'window' && Math.abs(this.timer - this.windowDur / 2) <= this.perfectDur / 2,
      hasTarget: this.state === 'idle' && this.hovered !== null,
      cooldownProgress: this.state === 'cooldown' ? clamp(this.timer / this.cooldownDur, 0, 1) : 0,
    };
  }

  dispose(): void {
    // Noch keine eigenen Ressourcen (Highlight-Ring folgt in Schritt 5).
  }
}
