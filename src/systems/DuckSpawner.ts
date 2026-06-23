import * as THREE from 'three';
import { BALANCE } from '../config/balance';
import { DuckFactory } from '../world/DuckFactory';
import { buildOutlineMaterial } from '../world/materials/OutlineMaterial';
import { ovalPoint, wrap01, TWO_PI } from '../utils/math';
import { randRange, type Rng } from '../utils/rng';
import type { Duck, DuckRarity } from '../types/domain';
import { RARITY_DEFS, rollRarity } from '../data/ducks';

/**
 * Verwaltet den Entenpool als EINE InstancedMesh. Enten rotieren auf
 * konzentrischen Ovalbahnen, wippen leicht und blicken in Fahrtrichtung.
 * Weltpositionen werden pro Tick gecacht (für den Raycast in M2).
 */
export class DuckSpawner {
  readonly mesh: THREE.InstancedMesh;
  /** Schwarze Kontur als 2. InstancedMesh (teilt Geometrie + instanceMatrix). */
  readonly outlineMesh: THREE.InstancedMesh | null;
  /** Detail-Mesh (Schnabel/Augen, M12): 3. InstancedMesh, teilt die instanceMatrix
   *  (folgt Bewegung/Reel/Park gratis), aber KEIN instanceColor → farbecht. */
  readonly detailMesh: THREE.InstancedMesh;
  readonly ducks: Duck[] = [];
  private readonly dummy = new THREE.Object3D();
  private readonly reelDummy = new THREE.Object3D(); // eigener Dummy (Scale ≠ 1 beim Reel)
  private readonly reeling = new Set<number>(); // Slots, deren Pose extern (FishingRod) gesetzt wird
  private readonly color = new THREE.Color(); // Scratch für per-Instanz-Raritätsfarbe
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.Material;
  private readonly outlineMaterial: THREE.MeshBasicMaterial | null;
  private readonly detailGeometry: THREE.BufferGeometry;
  private readonly detailMaterial: THREE.MeshToonMaterial;
  /** Feste InstancedMesh-Kapazität = max. Entenzahl über alle Tiers (M7). */
  private readonly capacity: number;
  /** Aktuell aktive (sichtbare/fangbare) Enten = duckCountByTier[tier]. */
  private activeCount: number;
  /** Null-Skala-Matrix zum Verstecken geparkter Slots (Tier < max). */
  private readonly parkMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
  private readonly rng: Rng;
  private tier: number; // M7: per setTier wechselbar (Rod-Tier)
  private luck = 0; // M6: Rod-Glück verschiebt die Respawn-Loot-Table (setLuck)

  constructor(rng: Rng, tier = 0) {
    this.rng = rng;
    this.tier = tier;
    const b = BALANCE.basin;
    // Auf max. Kapazität allozieren (InstancedMesh-Größe ist fix); per Tier sind
    // nur activeCount Slots aktiv, der Rest ist geparkt (M7).
    this.capacity = Math.max(...b.duckCountByTier);
    this.activeCount = b.duckCountByTier[tier] ?? b.duckCountByTier[0]!;
    this.geometry = DuckFactory.buildGeometry();
    this.material = DuckFactory.buildMaterial();
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, this.capacity);
    this.mesh.position.set(0, 0, b.centerZ);
    // Bounding-Sphere des InstancedMesh wird nur einmal berechnet und mit den
    // bewegten Enten stale -> Culling abschalten (max. 14 Instanzen, kein Gewinn).
    this.mesh.frustumCulled = false;

    // Inverted-Hull-Kontur: zweites InstancedMesh, teilt Geometrie + dieselbe
    // instanceMatrix (by reference) → Bewegung/Reel/Respawn spiegeln gratis.
    if (BALANCE.outline.enabled) {
      this.outlineMaterial = buildOutlineMaterial(BALANCE.outline.color, BALANCE.outline.thickness);
      this.outlineMesh = new THREE.InstancedMesh(this.geometry, this.outlineMaterial, this.capacity);
      this.outlineMesh.instanceMatrix = this.mesh.instanceMatrix; // geteilt
      this.outlineMesh.position.copy(this.mesh.position);
      this.outlineMesh.frustumCulled = false;
    } else {
      this.outlineMaterial = null;
      this.outlineMesh = null;
    }

    // Detail-Mesh (Schnabel/Augen, M12): teilt die instanceMatrix by reference
    // (wie die Outline) → Bewegung/Reel/Park spiegeln gratis; kein instanceColor.
    this.detailGeometry = DuckFactory.buildDetailGeometry();
    this.detailMaterial = DuckFactory.buildDetailMaterial();
    this.detailMesh = new THREE.InstancedMesh(this.detailGeometry, this.detailMaterial, this.capacity);
    this.detailMesh.instanceMatrix = this.mesh.instanceMatrix; // geteilt
    this.detailMesh.position.copy(this.mesh.position);
    this.detailMesh.frustumCulled = false;

    const baseSpeed = this.tierBaseSpeed(tier);
    for (let i = 0; i < this.capacity; i++) {
      const active = i < this.activeCount;
      const rarity = rollRarity(rng, tier);
      this.ducks.push({
        slot: i,
        rarity,
        trackT: active ? i / this.activeCount : rng(),
        speed: baseSpeed * (1 + randRange(rng, -b.speedVariance, b.speedVariance)),
        laneOffset: randRange(rng, -b.laneJitter, b.laneJitter),
        bobPhase: rng() * TWO_PI,
        alive: active,
        worldX: 0,
        worldY: 0,
        worldZ: 0,
      });
      this.setInstanceColor(i, rarity);
      if (!active) this.mesh.setMatrixAt(i, this.parkMatrix); // geparkt: unsichtbar
    }
    this.writeMatrices(0);
  }

  /** Basis-Rotationsgeschwindigkeit eines Tiers (baseRotationSpeed × Tier-Multiplikator). */
  private tierBaseSpeed(tier: number): number {
    const b = BALANCE.basin;
    const speedMul = b.rotationSpeedMulByTier[tier] ?? b.rotationSpeedMulByTier[0]!;
    return b.baseRotationSpeed * speedMul;
  }

  /**
   * Rod-Tier setzen (M7): wählt Becken-Speed/-Anzahl + Loot-Table. Mehr aktive
   * Enten + schnellere Rotation bei besseren Ruten; geparkte Slots werden bei
   * höherem Tier reaktiviert, überzählige bei niedrigerem geparkt. Der lebende
   * Pool würfelt mit der neuen Loot-Table neu (wie setLuck). Guard hält das
   * Tier-0-Boot deterministisch. Laufende Reels werden nicht angefasst.
   */
  setTier(tier: number): void {
    if (tier === this.tier) return;
    this.tier = tier;
    const b = BALANCE.basin;
    this.activeCount = b.duckCountByTier[tier] ?? b.duckCountByTier[0]!;
    const baseSpeed = this.tierBaseSpeed(tier);
    for (const duck of this.ducks) {
      if (this.reeling.has(duck.slot)) continue; // laufenden Reel nicht stören
      if (duck.slot < this.activeCount) {
        if (!duck.alive) {
          // war geparkt → mit frischer Bahnposition reaktivieren
          duck.trackT = this.rng();
          duck.laneOffset = randRange(this.rng, -b.laneJitter, b.laneJitter);
          duck.bobPhase = this.rng() * TWO_PI;
          duck.alive = true;
        }
        duck.speed = baseSpeed * (1 + randRange(this.rng, -b.speedVariance, b.speedVariance));
        duck.rarity = rollRarity(this.rng, this.tier, this.luck);
        this.setInstanceColor(duck.slot, duck.rarity);
      } else {
        duck.alive = false;
        this.mesh.setMatrixAt(duck.slot, this.parkMatrix); // parken: unsichtbar
      }
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /** Rod-Glück setzen (M6): Loot-Table-Shift für Respawns. Ändert sich das Glück
   *  (Laden/Equip/Upgrade), würfelt der sichtbare Pool sofort neu — sonst behielten
   *  die Boot-Enten luck=0, bis sie gefangen werden. Guard hält den luck=0-Boot
   *  deterministisch (kein RNG-Verbrauch) und vermeidet Churn bei Nicht-Glück-Equips. */
  setLuck(luck: number): void {
    if (luck === this.luck) return;
    this.luck = luck;
    for (const duck of this.ducks) {
      if (!duck.alive) continue; // gehakte/eingeholte Enten nicht anfassen
      duck.rarity = rollRarity(this.rng, this.tier, this.luck);
      this.setInstanceColor(duck.slot, duck.rarity);
    }
  }

  /** Setzt die Raritäts-Körperfarbe eines Slots (InstancedMesh.instanceColor). */
  private setInstanceColor(slot: number, rarity: DuckRarity): void {
    this.color.setHex(RARITY_DEFS[rarity].bodyColor);
    this.mesh.setColorAt(slot, this.color);
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt: number, elapsed: number): void {
    const speedMul = BALANCE.duck.speedMulByRarity;
    for (const duck of this.ducks) {
      if (!duck.alive) continue;
      // Seltenere Enten driften schneller (live mit der Rarität — gilt auch nach Reroll).
      duck.trackT = wrap01(duck.trackT + duck.speed * (speedMul[duck.rarity] ?? 1) * dt);
    }
    this.writeMatrices(elapsed);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  private writeMatrices(elapsed: number): void {
    const b = BALANCE.basin;
    for (const duck of this.ducks) {
      if (duck.slot >= this.activeCount) continue; // geparkt (Tier < max) — bleibt unsichtbar
      // Gehakte Enten: Pose kommt von FishingRod (setReelPose) — hier nicht überschreiben.
      if (this.reeling.has(duck.slot)) continue;
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

  /** Reel starten: Ente einfrieren, ihre Pose steuert ab jetzt FishingRod. */
  beginReel(slot: number): Duck | null {
    const duck = this.ducks[slot];
    if (!duck) return null;
    duck.alive = false;
    this.reeling.add(slot);
    return duck;
  }

  /** Pose einer gehakten Ente extern setzen (Einhol-Animation). */
  setReelPose(slot: number, x: number, y: number, z: number, scale: number): void {
    this.reelDummy.position.set(x, y, z);
    this.reelDummy.scale.setScalar(scale);
    this.reelDummy.updateMatrix();
    this.mesh.setMatrixAt(slot, this.reelDummy.matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Gefangene Ente entfernen und an neuer Bahnposition wiederbeleben — das
   * Becken bleibt dauerhaft voll. Rarität wird neu gewürfelt (Loot-Table des Tiers).
   */
  removeAndRespawn(slot: number): void {
    const duck = this.ducks[slot];
    if (!duck) return;
    this.reeling.delete(slot);
    duck.trackT = this.rng();
    duck.bobPhase = this.rng() * TWO_PI;
    duck.rarity = rollRarity(this.rng, this.tier, this.luck);
    duck.alive = true;
    this.setInstanceColor(slot, duck.rarity);
  }

  dispose(): void {
    this.geometry.dispose();
    // Cel-Gradient-Textur des Toon-Materials mit freigeben (kein Leak).
    const gm = (this.material as THREE.MeshToonMaterial).gradientMap;
    if (gm) gm.dispose();
    this.material.dispose();
    this.mesh.dispose();
    if (this.outlineMaterial) this.outlineMaterial.dispose();
    if (this.outlineMesh) this.outlineMesh.dispose();
    // Detail-Mesh (M12): eigene Geo/Material + Cel-Gradient-Textur freigeben.
    this.detailGeometry.dispose();
    if (this.detailMaterial.gradientMap) this.detailMaterial.gradientMap.dispose();
    this.detailMaterial.dispose();
    this.detailMesh.dispose();
  }
}
