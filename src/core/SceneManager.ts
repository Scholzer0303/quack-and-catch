import * as THREE from 'three';
import { BALANCE } from '../config/balance';

/** Vertikaler Himmel-Verlauf (oben → unten) als 1×N-CanvasTexture für scene.background. */
function buildSkyGradient(top: number, bottom: number): THREE.CanvasTexture {
  const hex = (n: number): string => '#' + n.toString(16).padStart(6, '0');
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, hex(top));
  grad.addColorStop(1, hex(bottom));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Besitzt die Three-Szene inkl. Licht und Fog; bietet add/remove/dispose. */
export class SceneManager {
  readonly scene: THREE.Scene;
  private readonly bgTexture: THREE.CanvasTexture;

  constructor() {
    this.scene = new THREE.Scene();
    // Abend-Verlaufshimmel (M9) statt flacher Farbe; Fog am warmen Horizont-Ton.
    this.bgTexture = buildSkyGradient(BALANCE.render.skyTop, BALANCE.render.skyBottom);
    this.scene.background = this.bgTexture;
    this.scene.fog = new THREE.Fog(BALANCE.render.clearColor, BALANCE.render.fogNear, BALANCE.render.fogFar);

    const ambient = new THREE.AmbientLight(BALANCE.render.ambientColor, BALANCE.render.ambientIntensity);
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
    this.bgTexture.dispose(); // Hintergrund-Textur ist kein Mesh → explizit freigeben
    this.scene.clear();
  }
}
