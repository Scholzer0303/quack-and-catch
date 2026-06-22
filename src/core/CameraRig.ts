import * as THREE from 'three';
import { BALANCE } from '../config/balance';
import { clamp, damp } from '../utils/math';
import { prefersReducedMotion } from '../fx/reducedMotion';

/**
 * First-Person-Kamera mit fixer Standpose. Das Zielen schwenkt Blick + Rute
 * gedämpft im Cone ±aimYawRange / ±aimPitchRange — die Position bleibt fix.
 */
export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  private readonly baseYaw: number;
  private readonly basePitch: number;
  private targetYaw: number;
  private targetPitch: number;
  private yaw: number;
  private pitch: number;
  // Screenshake (additiver, abklingender Offset auf die fixe Pose).
  private shakeMag = 0;
  private shakeTime = 0;
  private readonly reduced = prefersReducedMotion();

  constructor(aspect: number) {
    const r = BALANCE.render;
    this.camera = new THREE.PerspectiveCamera(r.fov, aspect, r.near, r.far);
    this.camera.position.set(...BALANCE.camera.position);
    this.camera.rotation.order = 'YXZ';

    // Basis-Yaw/Pitch aus der Blickrichtung (lookAt − position) ableiten.
    const dir = new THREE.Vector3(...BALANCE.camera.lookAt)
      .sub(this.camera.position)
      .normalize();
    this.basePitch = Math.asin(clamp(dir.y, -1, 1));
    this.baseYaw = Math.atan2(-dir.x, -dir.z);

    this.yaw = this.targetYaw = this.baseYaw;
    this.pitch = this.targetPitch = this.basePitch;
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  /** Ziel-Aim aus normalisiertem Pointer [-1,1]. Pointer rechts/oben → Blick rechts/oben. */
  setAimTarget(aimX: number, aimY: number): void {
    const c = BALANCE.camera;
    this.targetYaw = this.baseYaw - clamp(aimX, -1, 1) * c.aimYawRange;
    this.targetPitch = this.basePitch + clamp(aimY, -1, 1) * c.aimPitchRange;
  }

  /** Mini-Screenshake auslösen (Impuls; klingt von selbst ab). No-op bei reduced-motion. */
  addShake(intensity: number): void {
    if (this.reduced) return;
    this.shakeMag = Math.min(this.shakeMag + intensity, BALANCE.juice.shake.maxIntensity);
  }

  update(dt: number): void {
    if (BALANCE.camera.aimInstant) {
      // Blick folgt dem Zeiger 1:1 (kein Nachfaden).
      this.yaw = this.targetYaw;
      this.pitch = this.targetPitch;
    } else {
      const lambda = BALANCE.camera.aimSmooth;
      this.yaw = damp(this.yaw, this.targetYaw, lambda, dt);
      this.pitch = damp(this.pitch, this.targetPitch, lambda, dt);
    }

    // Additiver, abklingender Shake-Offset (Oszillation × abklingende Amplitude).
    let sy = 0;
    let sp = 0;
    if (this.shakeMag > 1e-5) {
      this.shakeTime += dt;
      const f = BALANCE.juice.shake.frequency;
      sy = Math.sin(this.shakeTime * f) * this.shakeMag;
      sp = Math.sin(this.shakeTime * f * 1.37 + 1.1) * this.shakeMag;
      this.shakeMag = damp(this.shakeMag, 0, BALANCE.juice.shake.dampLambda, dt);
    } else {
      this.shakeMag = 0;
    }
    this.camera.rotation.set(this.pitch + sp, this.yaw + sy, 0);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
