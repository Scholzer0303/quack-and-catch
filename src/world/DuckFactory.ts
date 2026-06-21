import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BALANCE } from '../config/balance';

/** Färbt alle Vertices einer Geometrie einfarbig (für gebackene Vertex-Farben). */
function paint(geo: THREE.BufferGeometry, hex: number): THREE.BufferGeometry {
  const c = new THREE.Color(hex);
  const count = geo.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geo;
}

/**
 * Baut eine stilisierte Low-Poly-Ente (Kugel-Körper + Kopf, Kegel-Schnabel,
 * Augen, Schwanz) als EINE gemergte Geometrie — eine InstancedMesh, ein
 * Draw-Call. Körper/Kopf/Schwanz sind WEISS gebacken, damit die per-Instanz-
 * Raritätsfarbe (InstancedMesh.instanceColor, multipliziert mit der Vertex-Farbe)
 * exakt durchschlägt. Schnabel/Augen behalten ihre Farbe (werden leicht mitgetönt).
 */
export const DuckFactory = {
  buildGeometry(): THREE.BufferGeometry {
    const d = BALANCE.duck;
    const hy = d.headOffset[1];
    const hz = d.headOffset[2];

    const body = new THREE.SphereGeometry(d.bodyRadius, 16, 12);
    body.scale(1, 0.85, 1.15);
    paint(body, 0xffffff);

    const head = new THREE.SphereGeometry(d.headRadius, 14, 10);
    head.translate(0, hy, hz);
    paint(head, 0xffffff);

    const beak = new THREE.ConeGeometry(0.12, 0.26, 8);
    beak.rotateX(Math.PI / 2);
    beak.translate(0, hy - 0.02, hz + 0.3);
    paint(beak, d.beakColor);

    const eyeL = new THREE.SphereGeometry(0.05, 8, 6);
    eyeL.translate(0.12, hy + 0.08, hz + 0.18);
    paint(eyeL, d.eyeColor);

    const eyeR = new THREE.SphereGeometry(0.05, 8, 6);
    eyeR.translate(-0.12, hy + 0.08, hz + 0.18);
    paint(eyeR, d.eyeColor);

    const tail = new THREE.ConeGeometry(0.16, 0.3, 8);
    tail.rotateX(-Math.PI / 2);
    tail.translate(0, 0.12, -d.bodyRadius - 0.04);
    paint(tail, 0xffffff);

    const parts = [body, head, beak, eyeL, eyeR, tail];
    const merged = mergeGeometries(parts, false);
    parts.forEach((p) => p.dispose());
    if (!merged) {
      throw new Error('DuckFactory: mergeGeometries fehlgeschlagen');
    }
    merged.scale(d.scale, d.scale, d.scale);
    merged.computeVertexNormals();
    return merged;
  },

  buildMaterial(): THREE.Material {
    return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05 });
  },
};
