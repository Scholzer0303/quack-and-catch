import * as THREE from 'three';
import { BALANCE } from '../config/balance';

/** First-Person-Kamera mit fixer Standpose. Zielen folgt in M2. */
export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  private readonly lookTarget: THREE.Vector3;

  constructor(aspect: number) {
    const r = BALANCE.render;
    this.camera = new THREE.PerspectiveCamera(r.fov, aspect, r.near, r.far);
    this.camera.position.set(...BALANCE.camera.position);
    this.lookTarget = new THREE.Vector3(...BALANCE.camera.lookAt);
    this.camera.lookAt(this.lookTarget);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
