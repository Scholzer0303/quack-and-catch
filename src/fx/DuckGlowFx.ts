import * as THREE from 'three';
import { BALANCE } from '../config/balance';
import { RARITY_DEFS } from '../data/ducks';
import type { DuckSpawner } from '../systems/DuckSpawner';

/** Weiches radiales Glow-Sprite (weiß → transparent), eingefärbt per instanceColor. */
function makeRadialTexture(): THREE.Texture {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('DuckGlowFx: 2D-Context nicht verfügbar');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Additives Glow-Halo um seltene Enten (uncommon+). Eine InstancedMesh aus
 * kamera-zugewandten Quads (Kamera ist fix → eine feste Orientierung). Pro Frame
 * an die Welt-Position jeder lebenden seltenen Ente gesetzt, Farbe = Raritäts-
 * `emissive` × `emissiveIntensity` (heller → blüht stärker im Bloom); common
 * (emissive 0) bleibt unsichtbar. Wird nur bei aktivem Postprocessing gebaut.
 *
 * Nutzt endlich die in RARITY_DEFS gepflegten `emissive`/`emissiveIntensity`.
 */
export class DuckGlowFx {
  readonly mesh: THREE.InstancedMesh;
  private readonly geo: THREE.PlaneGeometry;
  private readonly mat: THREE.MeshBasicMaterial;
  private readonly tex: THREE.Texture;
  private readonly faceQuat: THREE.Quaternion;
  private readonly dummy = new THREE.Object3D();
  private readonly color = new THREE.Color();

  constructor(private readonly ducks: DuckSpawner) {
    this.tex = makeRadialTexture();
    this.geo = new THREE.PlaneGeometry(1, 1);
    this.mat = new THREE.MeshBasicMaterial({
      map: this.tex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false, // roh hell halten → blüht zuverlässig im Bloom
    });
    this.mat.fog = false;

    const n = this.ducks.ducks.length;
    this.mesh = new THREE.InstancedMesh(this.geo, this.mat, n);
    this.mesh.frustumCulled = false; // kleine, bewegte Objekte → keine stale Bounding-Sphere
    this.mesh.renderOrder = 1; // additives Overlay nach den Enten

    // Kamera-zugewandte Orientierung (Kamera ist fix): Quad-Normale → zur Kamera.
    const fwd = new THREE.Vector3(...BALANCE.camera.lookAt)
      .sub(new THREE.Vector3(...BALANCE.camera.position))
      .normalize();
    this.faceQuat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      fwd.negate(),
    );

    // Start: alle unsichtbar.
    this.dummy.scale.setScalar(0);
    this.dummy.updateMatrix();
    for (let i = 0; i < n; i++) this.mesh.setMatrixAt(i, this.dummy.matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  update(): void {
    const g = BALANCE.juice.glow;
    for (const d of this.ducks.ducks) {
      const def = RARITY_DEFS[d.rarity];
      if (d.alive && def.emissiveIntensity >= g.minEmissive) {
        this.dummy.position.set(d.worldX, d.worldY, d.worldZ);
        this.dummy.quaternion.copy(this.faceQuat);
        this.dummy.scale.setScalar(g.haloScale);
        this.color.setHex(def.emissive).multiplyScalar(Math.min(1, def.emissiveIntensity * g.intensity));
        this.mesh.setColorAt(d.slot, this.color);
      } else {
        this.dummy.scale.setScalar(0); // verstecken
      }
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(d.slot, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  dispose(): void {
    this.geo.dispose();
    this.mat.dispose();
    this.tex.dispose();
    this.mesh.dispose();
    this.mesh.removeFromParent();
  }
}
