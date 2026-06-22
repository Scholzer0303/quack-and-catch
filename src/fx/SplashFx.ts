import * as THREE from 'three';
import { BALANCE } from '../config/balance';
import { prefersReducedMotion } from './reducedMotion';

/**
 * Wasser-Splash beim Fang: ein kleiner Pool flacher Ringe, die am Fang-XZ
 * aufpoppen, sich ausdehnen und ausblenden — knapp über der Wasserlinie.
 * EINE geteilte Torus-Geometrie (Radius 1, pro Ring skaliert); je Ring ein
 * eigenes transparentes Material (eigene Opacity). Helle Schaumfarbe → blüht
 * zusätzlich in Bloom. `reduced-motion` → `spawn()` ist ein No-op.
 *
 * Bau gespiegelt an `FishingRod.highlight` (MeshBasic, `fog=false`, flach gelegt).
 */
export class SplashFx {
  readonly group = new THREE.Group();
  private readonly geo: THREE.TorusGeometry;
  private readonly rings: THREE.Mesh[] = [];
  private readonly mats: THREE.MeshBasicMaterial[] = [];
  private readonly age: number[] = [];
  private readonly active: boolean[] = [];
  private next = 0;
  private readonly reduced = prefersReducedMotion();

  constructor() {
    const s = BALANCE.juice.splash;
    this.geo = new THREE.TorusGeometry(1, s.tubeRadius, s.radialSegments, s.tubularSegments);
    for (let i = 0; i < s.poolSize; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0 });
      mat.fog = false;
      const ring = new THREE.Mesh(this.geo, mat);
      ring.rotation.x = Math.PI / 2; // flach aufs Wasser
      ring.visible = false;
      ring.frustumCulled = false; // kleines Objekt nahe bewegter Ebene → keine stale Bounding-Sphere
      this.mats.push(mat);
      this.rings.push(ring);
      this.age.push(0);
      this.active.push(false);
      this.group.add(ring);
    }
  }

  /** Ring am Wasserpunkt (x, z) starten (round-robin durch den Pool). */
  spawn(x: number, z: number): void {
    if (this.reduced) return;
    const s = BALANCE.juice.splash;
    const i = this.next;
    this.next = (this.next + 1) % this.rings.length;
    this.rings[i]!.position.set(x, BALANCE.basin.waterY + s.yOffset, z);
    this.rings[i]!.scale.setScalar(s.startRadius);
    this.rings[i]!.visible = true;
    this.mats[i]!.opacity = s.startOpacity;
    this.age[i] = 0;
    this.active[i] = true;
  }

  update(dt: number): void {
    const s = BALANCE.juice.splash;
    const dur = s.durationMs / 1000;
    for (let i = 0; i < this.rings.length; i++) {
      if (!this.active[i]) continue;
      const a = (this.age[i]! + dt);
      this.age[i] = a;
      const t = a / dur;
      if (t >= 1) {
        this.active[i] = false;
        this.rings[i]!.visible = false;
        this.mats[i]!.opacity = 0;
        continue;
      }
      const e = t * t * (3 - 2 * t); // smoothstep: schneller Start, weiches Auslaufen
      this.rings[i]!.scale.setScalar(s.startRadius + (s.endRadius - s.startRadius) * e);
      this.mats[i]!.opacity = s.startOpacity * (1 - t);
    }
  }

  dispose(): void {
    this.geo.dispose();
    for (const m of this.mats) m.dispose();
    this.group.clear();
    this.group.removeFromParent();
  }
}
