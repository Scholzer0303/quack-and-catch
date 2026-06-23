import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BALANCE } from '../config/balance';

/** Winzige Gradient-Textur für Cel-Shading: diskrete Helligkeitsstufen.
 *  RGBA (alle Kanäle = Stufe), NearestFilter → harte Bänder statt weicher Verlauf.
 *  Exportiert, damit auch die Rute (RodBuilder) denselben Comic-Look nutzt. */
export function buildToonGradient(stops: readonly number[]): THREE.DataTexture {
  const data = new Uint8Array(stops.length * 4);
  for (let i = 0; i < stops.length; i++) {
    const v = Math.round(Math.max(0, Math.min(1, stops[i] ?? 1)) * 255);
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, stops.length, 1);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

/** Färbt alle Vertices einer Geometrie einfarbig (für gebackene Vertex-Farben).
 *  Exportiert, damit Welt/FX denselben Helfer nutzen (statt eigener Kopien). */
export function bakeVertexColor(geo: THREE.BufferGeometry, hex: number): THREE.BufferGeometry {
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
    bakeVertexColor(body, 0xffffff);

    const head = new THREE.SphereGeometry(d.headRadius, 14, 10);
    head.translate(0, hy, hz);
    bakeVertexColor(head, 0xffffff);

    const beak = new THREE.ConeGeometry(0.12, 0.26, 8);
    beak.rotateX(Math.PI / 2);
    beak.translate(0, hy - 0.02, hz + 0.3);
    bakeVertexColor(beak, d.beakColor);

    const eyeL = new THREE.SphereGeometry(0.05, 8, 6);
    eyeL.translate(0.12, hy + 0.08, hz + 0.18);
    bakeVertexColor(eyeL, d.eyeColor);

    const eyeR = new THREE.SphereGeometry(0.05, 8, 6);
    eyeR.translate(-0.12, hy + 0.08, hz + 0.18);
    bakeVertexColor(eyeR, d.eyeColor);

    const tail = new THREE.ConeGeometry(0.16, 0.3, 8);
    tail.rotateX(-Math.PI / 2);
    tail.translate(0, 0.12, -d.bodyRadius - 0.04);
    bakeVertexColor(tail, 0xffffff);

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

  /** Cel-shaded Material. `vertexColors:true` lässt die per-Instanz-Raritätsfarbe
   *  (InstancedMesh.instanceColor) durch denselben color_vertex-Chunk durchschlagen.
   *  `gradientMap` erzeugt die harten Comic-Bänder. */
  buildMaterial(): THREE.MeshToonMaterial {
    return new THREE.MeshToonMaterial({
      vertexColors: true,
      gradientMap: buildToonGradient(BALANCE.toon.gradientStops),
    });
  },
};
