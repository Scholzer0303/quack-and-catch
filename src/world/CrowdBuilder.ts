import * as THREE from 'three';
import { BALANCE } from '../config/balance';
import { CharacterFactory } from './CharacterFactory';
import { buildToonGradient } from './DuckFactory';
import { buildOutlineMaterial } from './materials/OutlineMaterial';
import { prefersReducedMotion } from '../fx/reducedMotion';
import { randRange, type Rng } from '../utils/rng';

interface Spectator {
  x: number;
  z: number;
  baseY: number;
  yaw: number;
  scale: number;
  phase: number; // Wipp-/Hüpf-Phasenversatz (organische Menge statt Gleichtakt)
}

/**
 * Zuschauer-Menge hinter dem Becken (M9): eine InstancedMesh stilisierter
 * Comic-Figuren (Toon) + eine geteilte Inverted-Hull-Outline — gleiches Muster
 * wie der Entenpool (DuckSpawner). Die Figuren stehen statisch in einem Bogen,
 * wippen im Leerlauf und springen bei jedem Fang jubelnd hoch (`cheer`). Bei
 * `prefers-reduced-motion` bleibt die Menge bewegungslos stehen (reine Deko).
 */
export class CrowdBuilder {
  readonly mesh: THREE.InstancedMesh;
  readonly outlineMesh: THREE.InstancedMesh | null;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.MeshToonMaterial;
  private readonly outlineMaterial: THREE.MeshBasicMaterial | null;
  private readonly spectators: Spectator[] = [];
  private readonly dummy = new THREE.Object3D();
  private readonly color = new THREE.Color();
  private readonly reduced = prefersReducedMotion();
  private cheerLevel = 0; // 1 beim Jubel-Impuls, klingt zu 0 ab

  constructor(rng: Rng) {
    const c = BALANCE.crowd;
    this.geometry = CharacterFactory.buildGeometry();
    this.material = new THREE.MeshToonMaterial({
      vertexColors: true,
      gradientMap: buildToonGradient(BALANCE.toon.gradientStops),
    });
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, c.count);
    this.mesh.frustumCulled = false; // statische Hintergrund-Menge, kleine Instanzzahl

    if (BALANCE.outline.enabled) {
      this.outlineMaterial = buildOutlineMaterial(BALANCE.outline.color, BALANCE.outline.thickness);
      this.outlineMesh = new THREE.InstancedMesh(this.geometry, this.outlineMaterial, c.count);
      this.outlineMesh.instanceMatrix = this.mesh.instanceMatrix; // geteilt → Bewegung gratis gespiegelt
      this.outlineMesh.frustumCulled = false;
    } else {
      this.outlineMaterial = null;
      this.outlineMesh = null;
    }

    const basinZ = BALANCE.basin.centerZ;
    const palette = c.clothColors;
    for (let i = 0; i < c.count; i++) {
      const t = c.count > 1 ? i / (c.count - 1) : 0.5;
      const x = (t - 0.5) * c.arcWidth + randRange(rng, -c.posJitter, c.posJitter);
      // Bogen: Mitte am weitesten hinten, Ränder kommen Richtung Kamera nach vorn.
      const z = c.backZ + c.bowDepth * Math.pow(2 * t - 1, 2) + randRange(rng, -c.posJitter, c.posJitter);
      // Blick zur Beckenmitte (Figur ist nach +z modelliert).
      const yaw = Math.atan2(0 - x, basinZ - z);
      this.spectators.push({
        x,
        z,
        baseY: c.floorY,
        yaw,
        scale: c.scale * (1 + randRange(rng, -c.scaleJitter, c.scaleJitter)),
        phase: rng() * Math.PI * 2,
      });
      this.color.setHex(palette[i % palette.length]!);
      this.mesh.setColorAt(i, this.color);
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.writeMatrices(0);
  }

  /** Jubel auslösen (bei jedem Fang): Menge springt hoch und klingt ab. */
  cheer(): void {
    if (this.reduced) return;
    this.cheerLevel = 1;
  }

  update(dt: number, elapsed: number): void {
    if (this.reduced) return; // statisch bei reduced-motion (einmal in writeMatrices(0) gesetzt)
    if (this.cheerLevel > 0) {
      this.cheerLevel = Math.max(0, this.cheerLevel - dt / BALANCE.crowd.cheerDecaySec);
    }
    this.writeMatrices(elapsed);
  }

  private writeMatrices(elapsed: number): void {
    const c = BALANCE.crowd;
    for (let i = 0; i < this.spectators.length; i++) {
      const s = this.spectators[i]!;
      const bob = Math.sin(elapsed * c.bobSpeed + s.phase) * c.bobAmp;
      const jump =
        this.cheerLevel > 0
          ? c.cheerJump * this.cheerLevel * Math.max(0, Math.sin(elapsed * c.cheerFreq + s.phase))
          : 0;
      this.dummy.position.set(s.x, s.baseY + bob + jump, s.z);
      this.dummy.rotation.set(0, s.yaw, 0);
      this.dummy.scale.setScalar(s.scale);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    const gm = this.material.gradientMap;
    if (gm) gm.dispose();
    this.material.dispose();
    this.mesh.dispose();
    if (this.outlineMaterial) this.outlineMaterial.dispose();
    if (this.outlineMesh) this.outlineMesh.dispose();
  }
}
