import * as THREE from 'three';
import { BALANCE } from '../config/balance';

/** Besitzt die Three-Szene inkl. Licht und Fog; bietet add/remove/dispose. */
export class SceneManager {
  readonly scene: THREE.Scene;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BALANCE.render.clearColor);
    this.scene.fog = new THREE.Fog(BALANCE.render.clearColor, BALANCE.render.fogNear, BALANCE.render.fogFar);

    const ambient = new THREE.AmbientLight(0xffffff, BALANCE.render.ambientIntensity);
    const dir = new THREE.DirectionalLight(BALANCE.render.dirColor, BALANCE.render.dirIntensity);
    dir.position.set(...BALANCE.render.dirPosition);
    // Kühles Gegenlicht für etwas Tiefe, ohne teure Schatten.
    const rim = new THREE.DirectionalLight(BALANCE.render.rimColor, BALANCE.render.rimIntensity);
    rim.position.set(...BALANCE.render.rimPosition);

    this.scene.add(ambient, dir, rim);
  }

  add(...objects: THREE.Object3D[]): void {
    this.scene.add(...objects);
  }

  remove(...objects: THREE.Object3D[]): void {
    this.scene.remove(...objects);
  }

  /** Gibt alle Geometrien/Materialien der Szene frei. */
  dispose(): void {
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const material = obj.material as THREE.Material | THREE.Material[];
        if (Array.isArray(material)) {
          material.forEach((m) => m.dispose());
        } else {
          material.dispose();
        }
      }
    });
    this.scene.clear();
  }
}
