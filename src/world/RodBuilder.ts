import * as THREE from 'three';
import { BALANCE } from '../config/balance';
import { buildToonGradient } from './DuckFactory';
import { buildOutlineMaterial } from './materials/OutlineMaterial';

/** Rute-Spitze in Kamera-lokalen Koordinaten — Schnur-Oberkante (Single Source). */
export const ROD_TIP_LOCAL = new THREE.Vector3(0.06, 0.06, -1.62);

/**
 * Adressierbare Rute, aufgeteilt in:
 * - `stick`: Griff + Rute (Kind der Kamera, schwenkt Richtung Zeiger).
 * - `rig`:   Schnur + Haken/Schwimmer (world-space, Game hängt sie in die Szene;
 *            so kann der Haken bis auf die Wasseroberfläche reichen).
 * `tip` ist die Schnur-Oberkante (lokal zum `stick`).
 */
export interface RodParts {
  stick: THREE.Group;
  rig: THREE.Group;
  line: THREE.Mesh;
  hookGroup: THREE.Group;
  tip: THREE.Vector3;
  dispose(): void;
}

/** Einheits-Zylinder (Höhe 1) zwischen a und b einpassen: Position=Mitte, Länge=scale.y. */
function orientSegment(mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3): void {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.scale.set(1, Math.max(len, 1e-5), 1);
  if (len > 1e-6) mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.divideScalar(len));
}

/** Schnur zwischen Spitze und aktuellem Haken neu strecken (FishingRod ruft pro Frame, world-space). */
export function stretchLine(line: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3): void {
  orientSegment(line, from, to);
}

export function buildRod(): RodParts {
  const grad = buildToonGradient(BALANCE.toon.gradientStops);
  const toon = (color: number): THREE.MeshToonMaterial => {
    const m = new THREE.MeshToonMaterial({ color, gradientMap: grad });
    m.fog = false; // Vordergrund-/Hand-Objekt: nicht vom Welt-Fog einfärben
    return m;
  };
  const outlineMat = buildOutlineMaterial(BALANCE.outline.color, BALANCE.outline.thickness);
  outlineMat.fog = false;

  const woodMat = toon(0x9a5a2c); // helles Comic-Holz
  const gripMat = toon(0x2c2c30); // dunkler Griff
  const hookMat = toon(0xcfd4d9); // helles Metall
  const bobberMat = toon(0xf2564e); // roter Schwimmer
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf3f5f7 });
  lineMat.fog = false;
  const mats: THREE.Material[] = [woodMat, gripMat, hookMat, bobberMat, lineMat, outlineMat];
  const geos: THREE.BufferGeometry[] = [];

  /** Toon-Mesh an Pose setzen + (optional) Inverted-Hull-Outline mit identischer Pose dahinter. */
  const place = (
    parent: THREE.Object3D,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    pos: THREE.Vector3,
    quat: THREE.Quaternion | null,
    outline: boolean,
  ): void => {
    geos.push(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    if (quat) mesh.quaternion.copy(quat);
    parent.add(mesh);
    if (outline && BALANCE.outline.enabled) {
      const o = new THREE.Mesh(geo, outlineMat);
      o.position.copy(pos);
      if (quat) o.quaternion.copy(quat);
      parent.add(o);
    }
  };

  // ---- stick (Kamera-Kind) ----
  const stick = new THREE.Group();
  const handle = new THREE.Vector3(0.6, -0.66, -0.42);
  const tip = ROD_TIP_LOCAL.clone();

  const rodDir = new THREE.Vector3().subVectors(tip, handle);
  const rodQuat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    rodDir.clone().normalize(),
  );
  const rodMid = handle.clone().add(tip).multiplyScalar(0.5);
  place(stick, new THREE.CylinderGeometry(0.016, 0.03, rodDir.length(), 10), woodMat, rodMid, rodQuat, true);
  place(stick, new THREE.CylinderGeometry(0.052, 0.052, 0.24, 12), gripMat, handle, rodQuat, true);

  // ---- rig (world-space): Schnur + Haken/Schwimmer ----
  const rig = new THREE.Group();

  const lineGeo = new THREE.CylinderGeometry(0.006, 0.006, 1, 6);
  geos.push(lineGeo);
  const line = new THREE.Mesh(lineGeo, lineMat);
  rig.add(line);

  // Schwimmer sitzt auf der Wasserlinie (= hookWorld), Haken darunter.
  const hookGroup = new THREE.Group();
  const Z = new THREE.Vector3();
  place(hookGroup, new THREE.SphereGeometry(0.06, 12, 10), bobberMat, Z, null, true);
  place(
    hookGroup,
    new THREE.TorusGeometry(0.045, 0.01, 8, 18, Math.PI * 1.5),
    hookMat,
    new THREE.Vector3(0, -0.09, 0),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
    true,
  );
  place(
    hookGroup,
    new THREE.ConeGeometry(0.018, 0.07, 8),
    hookMat,
    new THREE.Vector3(0.04, -0.14, 0),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 3)),
    true,
  );
  rig.add(hookGroup);

  const dispose = (): void => {
    for (const g of geos) g.dispose();
    for (const m of mats) m.dispose();
    grad.dispose();
  };

  return { stick, rig, line, hookGroup, tip, dispose };
}
