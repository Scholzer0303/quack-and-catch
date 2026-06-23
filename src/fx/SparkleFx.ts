import * as THREE from 'three';
import { BALANCE } from '../config/balance';
import { prefersReducedMotion } from './reducedMotion';
import { mulberry32 } from '../utils/rng';

/**
 * Gold-Funken-Burst bei epic/legendary-Fang: ein `InstancedMesh` kleiner
 * Oktaeder, die aus dem Fangpunkt nach außen/oben poppen, mit Gravitation
 * zurückfallen und gemeinsam ausblenden. Additive HDR-Gold-Farbe → blüht im
 * Bloom (wie `DuckGlowFx`). Ein Burst zur Zeit (seltene Top-Momente); ein neuer
 * `spawn()` startet ihn neu. `reduced-motion` → `spawn()` ist ein No-op.
 */
export class SparkleFx {
  readonly mesh: THREE.InstancedMesh;
  private readonly geo: THREE.OctahedronGeometry;
  private readonly mat: THREE.MeshBasicMaterial;
  private readonly dummy = new THREE.Object3D();
  // Konstante Einheits-Geschwindigkeiten je Partikel (deterministisch über Index).
  private readonly vx: number[] = [];
  private readonly vy: number[] = [];
  private readonly vz: number[] = [];
  private readonly origin = new THREE.Vector3();
  private age = 0;
  private live = false;
  private readonly reduced = prefersReducedMotion();

  constructor() {
    const s = BALANCE.juice.sparkle;
    this.geo = new THREE.OctahedronGeometry(s.size, 0);
    // HDR-Gold (Kanäle > 1) → überschreitet die Bloom-Threshold (wie der Glow).
    const c = new THREE.Color(s.color).multiplyScalar(s.hdrBoost);
    this.mat = new THREE.MeshBasicMaterial({
      color: c,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.mat.fog = false;
    this.mesh = new THREE.InstancedMesh(this.geo, this.mat, s.count);
    this.mesh.frustumCulled = false; // kleine Objekte nahe bewegter Ebene
    this.mesh.visible = false;

    const dur = s.durationMs / 1000;
    const speed = s.spread / dur; // erreicht ~spread über die Lebensdauer
    // Streuung über den bestehenden Seed-RNG (echte Varianz statt Index-Modulo,
    // das bei count=14 entartet). Fester Seed → deterministischer Burst.
    const rng = mulberry32(0x5a5c1e);
    for (let i = 0; i < s.count; i++) {
      const ang = (i / s.count) * Math.PI * 2;
      const rVar = 0.6 + 0.4 * rng();
      const hVar = 0.7 + 0.3 * rng();
      this.vx.push(Math.cos(ang) * speed * rVar);
      this.vz.push(Math.sin(ang) * speed * rVar);
      this.vy.push((s.rise / dur) * hVar);
    }
  }

  /** Burst am Fangpunkt (x, z) auf der Wasserlinie starten. */
  spawn(x: number, z: number): void {
    if (this.reduced) return;
    this.origin.set(x, BALANCE.basin.waterY, z);
    this.age = 0;
    this.live = true;
    this.mesh.visible = true;
    this.mat.opacity = 1;
    this.update(0); // Matrizen sofort auf den Fangpunkt setzen (kein Origin-Flash bei Default-Identität)
  }

  update(dt: number): void {
    if (!this.live) return;
    const s = BALANCE.juice.sparkle;
    const dur = s.durationMs / 1000;
    this.age += dt;
    const t = this.age / dur;
    if (t >= 1) {
      this.live = false;
      this.mesh.visible = false;
      this.mat.opacity = 0;
      return;
    }
    const a = this.age;
    const fall = 0.5 * s.gravity * a * a; // Gravitations-Versatz nach unten
    for (let i = 0; i < s.count; i++) {
      this.dummy.position.set(
        this.origin.x + this.vx[i]! * a,
        Math.max(this.origin.y, this.origin.y + this.vy[i]! * a - fall),
        this.origin.z + this.vz[i]! * a,
      );
      const sc = 1 - t * 0.6; // schrumpft leicht
      this.dummy.scale.setScalar(sc);
      this.dummy.rotation.set(a * 6 + i, a * 5 + i, 0); // funkelt durch Drehung
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mat.opacity = 1 - t;
  }

  dispose(): void {
    this.geo.dispose();
    this.mat.dispose();
    this.mesh.dispose();
    this.mesh.removeFromParent();
  }
}
