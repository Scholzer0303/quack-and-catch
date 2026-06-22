import * as THREE from 'three';
import type { Duck } from '../types/domain';

/**
 * Findet die anvisierte Ente: analytischer Ray-Sphere-Test gegen die pro Tick
 * gecachten `duck.worldX/Y/Z` (kein teures Instanz-Matrix-Raycasting).
 *
 * - Aim-Ray = Strahl durch die Zeigerposition (`pointerNdc`, direktes Fadenkreuz).
 * - Treffer-Kandidat: senkrechter Abstand Ente↔Strahl < `catchRadius`
 *   UND Distanz Haken-Anker↔Ente ≤ `reach`.
 * - Scratch-Vektoren wiederverwendet → keine Per-Frame-Allocs.
 */
export class HookRaycaster {
  private readonly raycaster = new THREE.Raycaster();
  private readonly toDuck = new THREE.Vector3();

  findTarget(
    camera: THREE.Camera,
    pointerNdc: THREE.Vector2,
    hookAnchor: THREE.Vector3,
    ducks: readonly Duck[],
    reach: number,
    catchRadius: number,
  ): Duck | null {
    this.raycaster.setFromCamera(pointerNdc, camera);
    const origin = this.raycaster.ray.origin;
    const dir = this.raycaster.ray.direction; // normalisiert
    const catchR2 = catchRadius * catchRadius;
    const reach2 = reach * reach;

    let best: Duck | null = null;
    let bestT = Infinity;

    for (const duck of ducks) {
      if (!duck.alive) continue;

      // Reichweite ab Haken-Anker (nicht ab Kamera) — sonst wäre nichts erreichbar.
      const hx = duck.worldX - hookAnchor.x;
      const hy = duck.worldY - hookAnchor.y;
      const hz = duck.worldZ - hookAnchor.z;
      if (hx * hx + hy * hy + hz * hz > reach2) continue;

      // Senkrechter Abstand² Ente-Zentrum ↔ Aim-Strahl.
      this.toDuck.set(duck.worldX - origin.x, duck.worldY - origin.y, duck.worldZ - origin.z);
      const t = this.toDuck.dot(dir);
      if (t < 0) continue;
      const perp2 = this.toDuck.lengthSq() - t * t;
      if (perp2 > catchR2) continue;

      // Nächste am Strahl (kleinstes t) gewinnt.
      if (t < bestT) {
        bestT = t;
        best = duck;
      }
    }
    return best;
  }
}
