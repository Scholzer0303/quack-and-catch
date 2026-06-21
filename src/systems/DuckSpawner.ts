import * as THREE from 'three';
import { BALANCE } from '../config/balance';
import { DuckFactory } from '../world/DuckFactory';
import { ovalPoint, wrap01, TWO_PI } from '../utils/math';
import { randRange, type Rng } from '../utils/rng';
import type { Duck } from '../types/domain';

/**
 * Verwaltet den Entenpool als EINE InstancedMesh. Enten rotieren auf
 * konzentrischen Ovalbahnen, wippen leicht und blicken in Fahrtrichtung.
 * Weltpositionen werden pro Tick gecacht (für den Raycast in M2).
 */
export class DuckSpawner {
  readonly mesh: THREE.InstancedMesh;
  readonly ducks: Duck[] = [];
  private readonly dummy = new THREE.Object3D();
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.Material;
  private readonly count: number;

  constructor(rng: Rng, tier = 0) {
    const b = BALANCE.basin;
    this.count = b.duckCountByTier[tier] ?? b.duckCountByTier[0]!;
    this.geometry = DuckFactory.buildGeometry();
    this.material = DuckFactory.buildMaterial();
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, this.count);
    this.mesh.position.set(0, 0, b.centerZ);
    // Bounding-Sphere des InstancedMesh wird nur einmal berechnet und mit den
    // bewegten Enten stale -> Culling abschalten (max. 14 Instanzen, kein Gewinn).
    this.mesh.frustumCulled = false;

    const speedMul = b.rotationSpeedMulByTier[tier] ?? b.rotationSpeedMulByTier[0]!;
    const baseSpeed = b.baseRotationSpeed * speedMul;

    for (let i = 0; i < this.count; i++) {
      this.ducks.push({
        slot: i,
        rarity: 'common',
        trackT: i / this.count,
        speed: baseSpeed * (1 + randRange(rng, -b.speedVariance, b.speedVariance)),
        laneOffset: randRange(rng, -b.laneJitter, b.laneJitter),
        bobPhase: rng() * TWO_PI,
        alive: true,
        worldX: 0,
        worldY: 0,
        worldZ: 0,
      });
    }
    this.writeMatrices(0);
  }

  update(dt: number, elapsed: number): void {
    for (const duck of this.ducks) {
      if (!duck.alive) continue;
      duck.trackT = wrap01(duck.trackT + duck.speed * dt);
    }
    this.writeMatrices(elapsed);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  private writeMatrices(elapsed: number): void {
    const b = BALANCE.basin;
    for (const duck of this.ducks) {
      const rx = b.radiusX * b.trackInset + duck.laneOffset;
      const rz = b.radiusZ * b.trackInset + duck.laneOffset;
      const [x, z] = ovalPoint(duck.trackT, rx, rz);
      const bob = Math.sin(elapsed * b.bobSpeed + duck.bobPhase) * b.bobAmplitude;
      const y = b.waterY + b.duckFloatY + bob;

      // Blickrichtung = Tangente der Ovalbahn.
      const angle = duck.trackT * TWO_PI;
      const yaw = Math.atan2(-Math.sin(angle) * rx, Math.cos(angle) * rz);

      this.dummy.position.set(x, y, z);
      this.dummy.rotation.set(0, yaw, 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(duck.slot, this.dummy.matrix);

      // Weltposition cachen (Mesh ist um centerZ verschoben).
      duck.worldX = x;
      duck.worldY = y;
      duck.worldZ = z + b.centerZ;
    }
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.mesh.dispose();
  }
}
