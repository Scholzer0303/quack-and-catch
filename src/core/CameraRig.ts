import * as THREE from 'three';
import { BALANCE } from '../config/balance';
import { clamp, damp } from '../utils/math';

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

  update(dt: number): void {
    const lambda = BALANCE.camera.aimSmooth;
    this.yaw = damp(this.yaw, this.targetYaw, lambda, dt);
    this.pitch = damp(this.pitch, this.targetPitch, lambda, dt);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
