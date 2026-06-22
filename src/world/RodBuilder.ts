import * as THREE from 'three';

/** Haken-Anker in Kamera-lokalen Koordinaten — Single Source für Reel-Ziel (FishingRod). */
export const HOOK_ANCHOR_LOCAL = new THREE.Vector3(0.04, -0.3, -1.73);

/** Rute-Spitze (lokal) — Schnur-Oberkante; Single Source für die Schnur-Streckung. */
export const ROD_TIP_LOCAL = new THREE.Vector3(0.04, 0.12, -1.75);

/** Adressierbare Rute: Teile, die FishingRod pro Frame animiert. */
export interface RodParts {
  group: THREE.Group; // ganze Rute (wird Kind der Kamera)
  hookGroup: THREE.Group; // Ring+Barb; absenken via position.y
  line: THREE.Mesh; // Schnur (Einheits-Zylinder, pro Frame gestreckt)
  tip: THREE.Vector3; // Schnur-Oberkante (lokal)
}

/** Einheits-Zylinder (Höhe 1) zwischen a und b einpassen: Position=Mitte, Länge=scale.y. */
function orientSegment(mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3): void {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.scale.set(1, len, 1);
  if (len > 1e-6) mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.divideScalar(len));
}

/**
 * Angel + Schnur + Haken im Vordergrund (Hand-Feel). Als Kind der Kamera
 * gedacht, daher in Kamera-lokalen Koordinaten (Blickrichtung = -Z).
 * Liefert die animierbaren Teile zurück — FishingRod schwenkt die Rute und
 * senkt/hebt den Haken (Schnur dehnt sich mit).
 */
export function buildRod(): RodParts {
  const group = new THREE.Group();

  const rodMat = new THREE.MeshStandardMaterial({ color: 0x8a2e22, roughness: 0.5, metalness: 0.1 });
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xdfe6ea, roughness: 0.6 });
  const hookMat = new THREE.MeshStandardMaterial({ color: 0xc7ccd1, roughness: 0.3, metalness: 0.8 });
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.9 });
  // Vordergrund-Objekt (Hand-Feel): nicht vom Welt-Fog einfärben lassen.
  for (const m of [rodMat, lineMat, hookMat, gripMat]) m.fog = false;

  // Starres Segment (Rute/Griff): fixe Länge zur Bauzeit.
  const fixedSegment = (a: THREE.Vector3, b: THREE.Vector3, radius: number, mat: THREE.Material): void => {
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
  const tip = ROD_TIP_LOCAL.clone();
  fixedSegment(handle, tip, 0.022, rodMat);

  // Griff-Verdickung
  const gripGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.22, 10);
  const grip = new THREE.Mesh(gripGeo, gripMat);
  grip.position.copy(handle);
  grip.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3().subVectors(tip, handle).normalize(),
  );
  group.add(grip);

  // Schnur: Einheits-Zylinder (Höhe 1), pro Frame zwischen Spitze und Haken gestreckt.
  const lineGeo = new THREE.CylinderGeometry(0.004, 0.004, 1, 8);
  const line = new THREE.Mesh(lineGeo, lineMat);
  orientSegment(line, tip, HOOK_ANCHOR_LOCAL);
  group.add(line);

  // Haken als eigene Group (wird zum Senken/Heben verschoben): schlanker Ring + feine Spitze.
  const hookGroup = new THREE.Group();
  hookGroup.position.copy(HOOK_ANCHOR_LOCAL);

  const ringGeo = new THREE.TorusGeometry(0.045, 0.009, 8, 20, Math.PI * 1.5);
  const ring = new THREE.Mesh(ringGeo, hookMat);
  ring.rotation.set(Math.PI / 2, 0, 0);
  hookGroup.add(ring);

  // Widerhaken: feiner Kegel, leicht nach außen gekippt.
  const barbGeo = new THREE.ConeGeometry(0.013, 0.05, 8);
  const barb = new THREE.Mesh(barbGeo, hookMat);
  barb.position.set(0.045, 0.028, 0);
  barb.rotation.z = Math.PI / 3;
  hookGroup.add(barb);

  group.add(hookGroup);

  return { group, hookGroup, line, tip };
}

/** Schnur zwischen Spitze und aktuellem Haken neu strecken (FishingRod ruft pro Frame). */
export function stretchLine(line: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3): void {
  orientSegment(line, from, to);
}
