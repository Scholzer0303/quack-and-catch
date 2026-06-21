import * as THREE from 'three';

/** Haken-Anker in Kamera-lokalen Koordinaten — Single Source für Reel-Ziel (FishingRod). */
export const HOOK_ANCHOR_LOCAL = new THREE.Vector3(0.04, -0.3, -1.73);

/**
 * Angel + Schnur + Haken im Vordergrund (Hand-Feel). Als Kind der Kamera
 * gedacht, daher in Kamera-lokalen Koordinaten (Blickrichtung = -Z).
 */
export function buildRod(): THREE.Group {
  const group = new THREE.Group();

  const rodMat = new THREE.MeshStandardMaterial({ color: 0x8a2e22, roughness: 0.5, metalness: 0.1 });
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xdfe6ea, roughness: 0.6 });
  const hookMat = new THREE.MeshStandardMaterial({ color: 0xc7ccd1, roughness: 0.3, metalness: 0.8 });
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.9 });
  // Vordergrund-Objekt (Hand-Feel): nicht vom Welt-Fog einfärben lassen.
  for (const m of [rodMat, lineMat, hookMat, gripMat]) m.fog = false;

  const segment = (a: THREE.Vector3, b: THREE.Vector3, radius: number, mat: THREE.Material): void => {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const geo = new THREE.CylinderGeometry(radius, radius, len, 8);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    group.add(mesh);
  };

  // Angelrute: vom Griff (unten rechts) zur Spitze (vorne mittig).
  const handle = new THREE.Vector3(0.62, -0.62, -0.45);
  const tip = new THREE.Vector3(0.04, 0.12, -1.75);
  segment(handle, tip, 0.022, rodMat);

  // Griff-Verdickung
  const gripGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.22, 10);
  const grip = new THREE.Mesh(gripGeo, gripMat);
  grip.position.copy(handle);
  grip.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3().subVectors(tip, handle).normalize(),
  );
  group.add(grip);

  // Schnur: von der Spitze nach unten zum Haken (Anker = Reel-Ziel).
  const hookTop = tip.clone();
  const hookBottom = HOOK_ANCHOR_LOCAL.clone();
  segment(hookTop, hookBottom, 0.004, lineMat);

  // Haken (kleiner Torus + Spitze).
  const ringGeo = new THREE.TorusGeometry(0.05, 0.012, 8, 16, Math.PI * 1.4);
  const ring = new THREE.Mesh(ringGeo, hookMat);
  ring.position.copy(hookBottom);
  ring.rotation.set(Math.PI / 2, 0, 0);
  group.add(ring);

  const barbGeo = new THREE.ConeGeometry(0.018, 0.06, 8);
  const barb = new THREE.Mesh(barbGeo, hookMat);
  barb.position.copy(hookBottom).add(new THREE.Vector3(0.05, 0.03, 0));
  barb.rotation.z = Math.PI / 3;
  group.add(barb);

  return group;
}
