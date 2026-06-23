import * as THREE from 'three';
import { BALANCE } from '../config/balance';
import type { Duck } from '../types/domain';

/**
 * Räumliches Zielen fürs Fang-Modell:
 * - `resolveWaterPoint`: Strahl durch die Zeigerposition ∩ Wasser-Ebene (y=waterY)
 *   = Zielpunkt W, auf das Becken-Oval geclamped (knapp innerhalb des Rands).
 * - `nearestDuck`: nächste lebende Ente mit XZ-Abstand zu W ≤ catchRadius.
 * Scratch-Objekte wiederverwendet → keine Per-Frame-Allocs.
 */
export class HookRaycaster {
  private readonly raycaster = new THREE.Raycaster();
  private readonly point = new THREE.Vector3();

  /** Zeiger → Punkt auf der Wasseroberfläche, geclamped aufs Becken-Oval. */
  resolveWaterPoint(camera: THREE.Camera, pointerNdc: THREE.Vector2, waterY: number): THREE.Vector3 | null {
    this.raycaster.setFromCamera(pointerNdc, camera);
    const origin = this.raycaster.ray.origin;
    const dir = this.raycaster.ray.direction;
    if (dir.y >= -1e-4) return null; // Blick nicht nach unten → keine Wasser-Schnittstelle
    const t = (waterY - origin.y) / dir.y;
    if (t <= 0) return null;
    this.point.set(origin.x + dir.x * t, waterY, origin.z + dir.z * t);

    // Auf das Becken-Oval clampen (Mittelpunkt z = centerZ).
    const b = BALANCE.basin;
    const rx = b.radiusX * BALANCE.hook.basinInset;
    const rz = b.radiusZ * BALANCE.hook.basinInset;
    const lx = this.point.x;
    const lz = this.point.z - b.centerZ;
    const norm = (lx * lx) / (rx * rx) + (lz * lz) / (rz * rz);
    if (norm > 1) {
      const s = 1 / Math.sqrt(norm);
      this.point.x = lx * s;
      this.point.z = b.centerZ + lz * s;
    }
    return this.point;
  }

  /** Nächste lebende Ente in ihrer rarität-abhängigen Fang-Zone (XZ-Abstand) zu W.
   *  Effektiver Radius = catchRadius × catchMulByRarity[rarity] (seltener = kleiner).
   *  Magnet (magnetRadius > 0): zieht W anteilig zur nächsten Ente im Magnet-Radius,
   *  bevor gefangt wird — assistiert das Zielen (mutiert W = Fang-/Highlight-Punkt). */
  nearestDuck(
    w: THREE.Vector3,
    ducks: readonly Duck[],
    catchRadius: number,
    magnetRadius = 0,
  ): Duck | null {
    if (magnetRadius > 0) {
      let mBest: Duck | null = null;
      let mBestD2 = magnetRadius * magnetRadius;
      for (const duck of ducks) {
        if (!duck.alive) continue;
        const dx = duck.worldX - w.x;
        const dz = duck.worldZ - w.z;
        const d2 = dx * dx + dz * dz;
        if (d2 <= mBestD2) {
          mBestD2 = d2;
          mBest = duck;
        }
      }
      if (mBest) {
        const f = BALANCE.shop.magnetPullFraction;
        w.x += (mBest.worldX - w.x) * f;
        w.z += (mBest.worldZ - w.z) * f;
      }
    }

    const muls = BALANCE.hook.catchMulByRarity;
    let best: Duck | null = null;
    let bestD2 = Infinity;
    for (const duck of ducks) {
      if (!duck.alive) continue;
      const r = catchRadius * (muls[duck.rarity] ?? 1);
      const dx = duck.worldX - w.x;
      const dz = duck.worldZ - w.z;
      const d2 = dx * dx + dz * dz;
      if (d2 <= r * r && d2 < bestD2) {
        bestD2 = d2;
        best = duck;
      }
    }
    return best;
  }
}
