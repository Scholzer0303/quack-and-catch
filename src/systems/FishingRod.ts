import * as THREE from 'three';
import { BALANCE } from '../config/balance';
import { clamp, lerp, damp } from '../utils/math';
import type { EventBus } from '../events/EventBus';
import type { GameEvents } from '../types/events';
import type { Duck } from '../types/domain';
import { DuckSpawner } from './DuckSpawner';
import { HookRaycaster } from './HookRaycaster';
import { buildRod, stretchLine, HOOK_ANCHOR_LOCAL, type RodParts } from '../world/RodBuilder';
import { RARITY_DEFS } from '../data/ducks';

export type RodState = 'idle' | 'casting' | 'window' | 'reel' | 'cooldown';

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
  private readonly reelFrom = new THREE.Vector3(); // Fangposition beim Hit
  private readonly reelPos = new THREE.Vector3(); // Scratch für die Lerp-Pose

  /** Flacher Ring um die anvisierte Ente; Game hängt ihn in die Szene. */
  readonly highlight: THREE.Mesh;

  // Sichtbare Rute (Kind der Kamera) + animierte Pose. Rein visuell, getrieben
  // von State/getView() + Aim — die Fang-Logik bleibt unberührt.
  private readonly rod: RodParts;
  private readonly hookLocal = new THREE.Vector3().copy(HOOK_ANCHOR_LOCAL); // Scratch für die Schnur
  private dip = 0; // 0 = Ruhe/oben, 1 = ganz abgesenkt (gedämpft)
  private swingX = 0; // gedämpfte Rute-Neigung Richtung Zeiger
  private swingY = 0;

  private readonly aimNdc = new THREE.Vector2(0, 0); // Zeigerposition (direktes Fadenkreuz)
  private state: RodState = 'idle';
  private timer = 0; // Sekunden im aktuellen Zustand
  private lockDuck: Duck | null = null;
  private hovered: Duck | null = null;
  private perfect = false;

  constructor(
    private readonly camera: THREE.Camera,
    private readonly ducks: DuckSpawner,
    private readonly bus: EventBus<GameEvents>,
  ) {
    const geo = new THREE.TorusGeometry(BALANCE.hook.catchRadius * 0.8, 0.03, 8, 24);
    const mat = new THREE.MeshBasicMaterial({ color: 0x5cf2a0, transparent: true, opacity: 0.85 });
    mat.fog = false;
    this.highlight = new THREE.Mesh(geo, mat);
    this.highlight.rotation.x = Math.PI / 2; // flach auf die Wasserfläche
    this.highlight.visible = false;

    // Rute als Kind der Kamera (Hand-Feel); FishingRod hält die Referenz und animiert sie.
    this.rod = buildRod();
    this.camera.add(this.rod.group);
  }

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
  private get reelDur(): number {
    return BALANCE.hook.reelDurationMs / 1000 / this.stats.reelSpeed;
  }

  /** Haken-Weltposition (Kamera schwenkt → pro Aufruf frisch). */
  private hookAnchor(): THREE.Vector3 {
    return this.camera.localToWorld(this.hookWorld.copy(HOOK_ANCHOR_LOCAL));
  }

  /** Aktuelle Zeigerposition setzen (normalisiertes NDC, x rechts/+1, y oben/+1). */
  setAim(ndcX: number, ndcY: number): void {
    this.aimNdc.set(ndcX, ndcY);
  }

  private aimTarget(): Duck | null {
    return this.raycaster.findTarget(
      this.camera,
      this.aimNdc,
      this.hookAnchor(),
      this.ducks.ducks,
      this.stats.reach,
      BALANCE.hook.catchRadius,
    );
  }

  /** Pointerdown: Haken absenken (physisches Modell) — auch ohne Ziel. Das Ziel
   *  wird erst beim Loslassen festgelegt (Lock-bei-Release). Das Fadenkreuz
   *  signalisiert per Farbe, ob eine Ente unter dem Zeiger ist. */
  press(aimX: number, aimY: number): void {
    if (this.state !== 'idle') return;
    this.lockDuck = null; // Lock erst beim Release
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
        // Nicht im Fenster losgelassen → Fehlversuch (Halten allein fängt nicht;
        // zugleich Softlock-Schutz: nie hängender Hold).
        if (this.timer >= this.windowDur) this.resolveMiss();
        break;
      case 'reel':
        this.updateReel(dt);
        break;
      case 'cooldown':
        this.timer += dt;
        if (this.timer >= this.cooldownDur) {
          this.state = 'idle';
          this.timer = 0;
        }
        break;
    }
    this.updateHighlight();
    this.animateRod(dt);
  }

  /** Sichtbare Rute beleben: Schwenk Richtung Zeiger + Haken senken/heben.
   *  Rein visuell (getrieben von State + Aim), greift nicht in die Fang-Logik ein. */
  private animateRod(dt: number): void {
    const h = BALANCE.hook;

    // Haken-Tiefe aus dem State: Halten senkt, Loslassen/Reel hebt (gedämpft).
    let targetDip = 0;
    if (this.state === 'casting') targetDip = clamp(this.timer / this.castDur, 0, 1);
    else if (this.state === 'window') targetDip = 1;
    // reel/cooldown/idle → 0 (Haken hebt; beim Reel hebt er die Ente mit).
    this.dip = damp(this.dip, targetDip, h.dipDampLambda, dt);
    this.hookLocal.copy(HOOK_ANCHOR_LOCAL);
    this.hookLocal.y = HOOK_ANCHOR_LOCAL.y - this.dip * h.dipDepth;
    this.rod.hookGroup.position.copy(this.hookLocal);
    stretchLine(this.rod.line, this.rod.tip, this.hookLocal);

    // Rute neigt sich sichtbar Richtung Zeiger (kleiner Lean, gedämpft).
    this.swingX = damp(this.swingX, this.aimNdc.x * h.swingAmount, h.swingDampLambda, dt);
    this.swingY = damp(this.swingY, this.aimNdc.y * h.swingAmount, h.swingDampLambda, dt);
    this.rod.group.rotation.z = -this.swingX;
    this.rod.group.rotation.x = this.swingY;
  }

  private updateHighlight(): void {
    const show = this.state === 'idle' && this.hovered !== null;
    this.highlight.visible = show;
    if (show && this.hovered) {
      this.highlight.position.set(
        this.hovered.worldX,
        BALANCE.basin.waterY + 0.05,
        this.hovered.worldZ,
      );
    }
  }

  /** Auflösung beim Loslassen im Window (oder beim Timeout). Lock-bei-Release:
   *  Ziel wird genau jetzt evaluiert (was unter dem Haken liegt). */
  private resolveAtRelease(): void {
    const target = this.aimTarget();
    // Treffer nur mit gültigem, noch lebendem Ziel.
    if (!target || !target.alive) {
      this.resolveMiss();
      return;
    }
    // lineStrength-Gate: zu schwere Ente reißt ab (Feedback, kein Softlock).
    if (RARITY_DEFS[target.rarity].weight > this.stats.lineStrength) {
      this.resolveSnap(target);
      return;
    }
    // Perfect = Loslassen im zentralen Band des Fensters.
    const half = this.perfectDur / 2;
    const center = this.windowDur / 2;
    this.perfect = Math.abs(this.timer - center) <= half;
    this.lockDuck = target; // ab hier für die Reel-Phase gehalten
    this.land(target);
  }

  /** Treffer steht: Reel-Animation starten (Ente lerpt zum Haken). */
  private land(duck: Duck): void {
    this.bus.emit('hook:result', { hit: true, perfect: this.perfect, duck });
    this.ducks.beginReel(duck.slot);
    this.reelFrom.set(duck.worldX, duck.worldY, duck.worldZ);
    this.state = 'reel';
    this.timer = 0;
  }

  private updateReel(dt: number): void {
    this.timer += dt;
    const duck = this.lockDuck;
    if (!duck) {
      this.toCooldown();
      return;
    }
    const p = clamp(this.timer / this.reelDur, 0, 1);
    const e = p * p * (3 - 2 * p); // smoothstep
    const to = this.hookAnchor();
    this.reelPos.copy(this.reelFrom).lerp(to, e);
    const scale = lerp(1, BALANCE.hook.reelEndScale, e);
    this.ducks.setReelPose(duck.slot, this.reelPos.x, this.reelPos.y, this.reelPos.z, scale);
    if (p >= 1) this.finishLand(duck);
  }

  private finishLand(duck: Duck): void {
    const value = RARITY_DEFS[duck.rarity].baseValue;
    this.ducks.removeAndRespawn(duck.slot);
    this.bus.emit('duck:landed', { rarity: duck.rarity, value });
    this.lockDuck = null;
    this.toCooldown();
  }

  private resolveMiss(): void {
    this.bus.emit('hook:result', { hit: false, perfect: false, duck: null });
    this.lockDuck = null;
    this.perfect = false;
    this.toCooldown();
  }

  /** Linien-Abriss: Ente bleibt auf der Bahn (nie gehakt), nur Feedback + Cooldown. */
  private resolveSnap(duck: Duck): void {
    this.bus.emit('hook:result', { hit: false, perfect: false, duck });
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
    this.highlight.geometry.dispose();
    (this.highlight.material as THREE.Material).dispose();
    this.highlight.removeFromParent();

    // Rute von der Kamera lösen und alle Geometrien/Materialien freigeben.
    this.rod.group.removeFromParent();
    this.rod.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    });
  }
}
