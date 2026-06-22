import * as THREE from 'three';
import { BALANCE } from '../config/balance';
import { clamp, lerp, damp } from '../utils/math';
import type { EventBus } from '../events/EventBus';
import type { GameEvents } from '../types/events';
import type { Duck } from '../types/domain';
import { DuckSpawner } from './DuckSpawner';
import { HookRaycaster } from './HookRaycaster';
import { buildRod, stretchLine, type RodParts } from '../world/RodBuilder';
import { RARITY_DEFS } from '../data/ducks';

export type RodState = 'idle' | 'lowering' | 'reel' | 'cooldown';

/** Schnappschuss für das Reticle. */
export interface RodView {
  state: RodState;
  dip: number; // 0 = oben, 1 = Haken im Wasser
  hasTarget: boolean; // Ente in der Drop-Zone
  inPerfect: boolean; // Ente mittig (≤ perfectRadius)
  cooldownProgress: number; // 0..1 während cooldown
}

/**
 * Räumliches Fang-Modell (kein Timing-Fenster):
 * idle → (Press) lowering → (Release) Fang/Heben → cooldown → idle.
 * Maus → Wasserpunkt W (HookRaycaster). Halten senkt den Haken von der
 * Rutenspitze zu W ins Wasser; Loslassen mit Ente ≤ catchRadius um W → Fang
 * (mittig ≤ perfectRadius → Perfect). Rute (stick) schwenkt sichtbar Richtung
 * Zeiger; Schnur+Haken (rig) sind world-space und reichen bis auf die Wasserlinie.
 */
export class FishingRod {
  private readonly raycaster = new HookRaycaster();
  private readonly lineStrength = BALANCE.hook.baseLineStrength;

  private readonly rod: RodParts;
  /** Schnur + Haken (world-space); Game hängt das in die Szene. */
  readonly rig: THREE.Group;
  /** Drop-Zone-Ring auf dem Wasser an W; Game hängt ihn in die Szene. */
  readonly highlight: THREE.Mesh;

  private readonly aimNdc = new THREE.Vector2(0, 0);
  private readonly target = new THREE.Vector3(0, BALANCE.basin.waterY, BALANCE.basin.centerZ); // letzter Wasserpunkt W
  private wValid = false;

  // Scratch (keine Per-Frame-Allocs)
  private readonly tipWorld = new THREE.Vector3();
  private readonly hookWorld = new THREE.Vector3();
  private readonly reelFrom = new THREE.Vector3();
  private readonly reelPos = new THREE.Vector3();

  private state: RodState = 'idle';
  private timer = 0;
  private dip = 0;
  private swingX = 0;
  private swingY = 0;
  private lockDuck: Duck | null = null;
  private near: Duck | null = null; // Ente in der Drop-Zone (pro Frame)
  private nearPerfect = false;
  private perfect = false;

  constructor(
    private readonly camera: THREE.Camera,
    private readonly ducks: DuckSpawner,
    private readonly bus: EventBus<GameEvents>,
  ) {
    this.rod = buildRod();
    this.rig = this.rod.rig;
    this.camera.add(this.rod.stick); // Rute = Kind der Kamera (Hand-Feel)

    const geo = new THREE.TorusGeometry(BALANCE.hook.catchRadius, 0.03, 8, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0x5cf2a0, transparent: true, opacity: 0.85 });
    mat.fog = false;
    this.highlight = new THREE.Mesh(geo, mat);
    this.highlight.rotation.x = Math.PI / 2; // flach aufs Wasser
    this.highlight.visible = false;
  }

  private get lowerDur(): number {
    return BALANCE.hook.lowerDurationMs / 1000;
  }
  private get reelDur(): number {
    return BALANCE.hook.reelDurationMs / 1000;
  }
  private get cooldownDur(): number {
    return BALANCE.hook.cooldownMs / 1000;
  }

  setAim(ndcX: number, ndcY: number): void {
    this.aimNdc.set(ndcX, ndcY);
  }

  /** Pointerdown: Haken senken (immer; Ziel zählt erst beim Loslassen). */
  press(aimX: number, aimY: number): void {
    if (this.state !== 'idle') return;
    this.bus.emit('hook:cast', { aimX, aimY });
    this.state = 'lowering';
    this.timer = 0;
    this.perfect = false;
    this.lockDuck = null;
  }

  /** Pointerup: räumlich auflösen. */
  release(): void {
    if (this.state !== 'lowering') return;
    const armed = this.dip >= BALANCE.hook.armProgress;
    if (armed && this.wValid && this.near && this.near.alive) {
      const duck = this.near;
      if (RARITY_DEFS[duck.rarity].weight > this.lineStrength) {
        this.resolveSnap(duck); // zu schwer → reißt ab
        return;
      }
      this.perfect = this.nearPerfect;
      this.lockDuck = duck;
      this.land(duck);
      return;
    }
    if (armed) {
      this.resolveMiss(); // im Wasser, aber keine Ente
      return;
    }
    this.toCooldown(); // zu flach → nur heben, kein Event
  }

  /** Verlorener Pointer/Fokus: Haken heben, kein Fang (Softlock-Schutz). */
  cancel(): void {
    if (this.state === 'lowering') this.toCooldown();
  }

  update(dt: number): void {
    // Maus → Wasserpunkt W; nächste Ente in der Drop-Zone bestimmen.
    const w = this.raycaster.resolveWaterPoint(this.camera, this.aimNdc, BALANCE.basin.waterY);
    this.wValid = w !== null;
    if (w) this.target.copy(w);
    this.near = this.wValid ? this.raycaster.nearestDuck(this.target, this.ducks.ducks, BALANCE.hook.catchRadius) : null;
    this.nearPerfect = false;
    if (this.near) {
      const dx = this.near.worldX - this.target.x;
      const dz = this.near.worldZ - this.target.z;
      this.nearPerfect = dx * dx + dz * dz <= BALANCE.hook.perfectRadius * BALANCE.hook.perfectRadius;
    }

    switch (this.state) {
      case 'lowering':
        this.timer += dt;
        this.dip = Math.min(1, this.dip + dt / this.lowerDur);
        break;
      case 'reel':
        this.updateReel(dt);
        this.dip = damp(this.dip, 0, BALANCE.hook.dipDampLambda, dt);
        break;
      case 'cooldown':
        this.timer += dt;
        this.dip = damp(this.dip, 0, BALANCE.hook.dipDampLambda, dt);
        if (this.timer >= this.cooldownDur) {
          this.state = 'idle';
          this.timer = 0;
        }
        break;
      default: // idle
        this.dip = damp(this.dip, 0, BALANCE.hook.dipDampLambda, dt);
    }

    this.animateRod(dt);
    this.updateHighlight();
  }

  /** Rute schwenkt Richtung Zeiger; Schnur+Haken (world) von der Spitze ins Wasser. */
  private animateRod(dt: number): void {
    const h = BALANCE.hook;
    // Rute schwenkt sichtbar dem Zeiger nach: yaw über Maus-X, pitch über Maus-Y.
    this.swingX = damp(this.swingX, this.aimNdc.x * h.swingAmount, h.swingDampLambda, dt);
    this.swingY = damp(this.swingY, this.aimNdc.y * h.swingAmount, h.swingDampLambda, dt);
    this.rod.stick.rotation.set(-this.swingY, -this.swingX, 0);
    this.rod.stick.updateWorldMatrix(true, false);

    this.tipWorld.copy(this.rod.tip);
    this.rod.stick.localToWorld(this.tipWorld);
    if (this.state === 'reel') {
      this.hookWorld.copy(this.reelPos); // Haken hält die Ente beim Einholen
    } else {
      this.hookWorld.copy(this.tipWorld).lerp(this.target, this.dip);
    }
    stretchLine(this.rod.line, this.tipWorld, this.hookWorld);
    this.rod.hookGroup.position.copy(this.hookWorld);
  }

  private updateHighlight(): void {
    const show = this.wValid && (this.state === 'idle' || this.state === 'lowering');
    this.highlight.visible = show;
    if (!show) return;
    this.highlight.position.set(this.target.x, BALANCE.basin.waterY + 0.04, this.target.z);
    const mat = this.highlight.material as THREE.MeshBasicMaterial;
    mat.color.set(this.nearPerfect ? 0xffcf3f : this.near ? 0x5cf2a0 : 0xbfead8);
    mat.opacity = this.near ? 0.9 : 0.45;
  }

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
    // Ziel = aktuelle Rutenspitze (world): die Ente wird zur Rute hochgezogen.
    this.tipWorld.copy(this.rod.tip);
    this.rod.stick.updateWorldMatrix(true, false);
    this.rod.stick.localToWorld(this.tipWorld);
    this.reelPos.copy(this.reelFrom).lerp(this.tipWorld, e);
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

  /** Linien-Abriss: Ente bleibt auf der Bahn, nur Feedback + Cooldown. */
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
    const active = this.state === 'idle' || this.state === 'lowering';
    return {
      state: this.state,
      dip: this.dip,
      hasTarget: active && this.near !== null,
      inPerfect: active && this.nearPerfect,
      cooldownProgress: this.state === 'cooldown' ? clamp(this.timer / this.cooldownDur, 0, 1) : 0,
    };
  }

  dispose(): void {
    this.highlight.geometry.dispose();
    (this.highlight.material as THREE.Material).dispose();
    this.highlight.removeFromParent();
    this.rod.stick.removeFromParent();
    this.rod.rig.removeFromParent();
    this.rod.dispose();
  }
}
