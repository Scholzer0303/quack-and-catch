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
 * Injiziert einen Gummi-Gloss in ein `MeshToonMaterial` (M12): weicher
 * Blinn-Phong-Specular-Hotspot + Fresnel-Himmel-Tint am Rand, OHNE die
 * Cel-Bänder/`instanceColor`-Pipeline zu brechen (kein envMap, kein
 * Material-Wechsel). Licht-/Blickrichtung in VIEW-Space (Kamera ist fast fix).
 * Der Glanz wird auf `outgoingLight` addiert, bevor Tonemapping läuft.
 */
function applyToonGloss(mat: THREE.MeshToonMaterial): void {
  const g = BALANCE.duck.gloss;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms['uGlossLightDir'] = { value: new THREE.Vector3(...g.lightDir).normalize() };
    shader.uniforms['uGlossColor'] = { value: new THREE.Color(g.color) };
    shader.uniforms['uGlossShininess'] = { value: g.shininess };
    shader.uniforms['uGlossStrength'] = { value: g.strength };
    shader.uniforms['uFresnelColor'] = { value: new THREE.Color(g.fresnelColor) };
    shader.uniforms['uFresnelPower'] = { value: g.fresnelPower };
    shader.uniforms['uFresnelStrength'] = { value: g.fresnelStrength };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uGlossLightDir;
        uniform vec3 uGlossColor;
        uniform float uGlossShininess;
        uniform float uGlossStrength;
        uniform vec3 uFresnelColor;
        uniform float uFresnelPower;
        uniform float uFresnelStrength;`,
      )
      .replace(
        '#include <opaque_fragment>',
        `// M12 Gummi-Gloss: normal/vViewPosition sind hier (View-Space) gültig.
        vec3 qcViewDir = normalize( vViewPosition );
        vec3 qcHalf = normalize( uGlossLightDir + qcViewDir );
        float qcSpec = pow( max( dot( normal, qcHalf ), 0.0 ), uGlossShininess );
        outgoingLight += uGlossColor * ( qcSpec * uGlossStrength );
        float qcFres = pow( 1.0 - clamp( dot( normal, qcViewDir ), 0.0, 1.0 ), uFresnelPower );
        outgoingLight += uFresnelColor * ( qcFres * uFresnelStrength );
        #include <opaque_fragment>`,
      );
  };
}

/**
 * Baut eine stilisierte Low-Poly-Ente. ZWEI Geometrien/Meshes (geteilte
 * instanceMatrix in DuckSpawner):
 *  - Körper-Geo (Körper/Kopf/Schwanz) WEISS gebacken → per-Instanz-Raritätsfarbe
 *    (InstancedMesh.instanceColor) schlägt durch (`buildGeometry`/`buildMaterial`).
 *  - Detail-Geo (roter Schnabel + weiße Augen mit Pupille) mit EIGENEN Farben und
 *    OHNE instanceColor → bleibt über alle Raritäten farbecht (`buildDetailGeometry`/
 *    `buildDetailMaterial`). Beide tragen den Gummi-Gloss (M12).
 */
export const DuckFactory = {
  buildGeometry(): THREE.BufferGeometry {
    const d = BALANCE.duck;
    const hy = d.headOffset[1];
    const hz = d.headOffset[2];

    // Pummeliger, runder Körper (M12: weniger flach, etwas voller).
    const body = new THREE.SphereGeometry(d.bodyRadius, 18, 14);
    body.scale(1.05, 0.95, 1.12);
    bakeVertexColor(body, 0xffffff);

    const head = new THREE.SphereGeometry(d.headRadius, 16, 12);
    head.translate(0, hy, hz);
    bakeVertexColor(head, 0xffffff);

    const tail = new THREE.ConeGeometry(0.16, 0.3, 8);
    tail.rotateX(-Math.PI / 2);
    tail.translate(0, 0.14, -d.bodyRadius - 0.02);
    bakeVertexColor(tail, 0xffffff);

    const parts = [body, head, tail];
    const merged = mergeGeometries(parts, false);
    parts.forEach((p) => p.dispose());
    if (!merged) {
      throw new Error('DuckFactory: mergeGeometries (Körper) fehlgeschlagen');
    }
    merged.scale(d.scale, d.scale, d.scale);
    merged.computeVertexNormals();
    return merged;
  },

  /** Detail-Geo: roter Schnabel + echte Augen (weiße Sklera + dunkle Pupille).
   *  Eigene gebackene Farben, KEIN instanceColor → über alle Raritäten farbecht. */
  buildDetailGeometry(): THREE.BufferGeometry {
    const d = BALANCE.duck;
    const hy = d.headOffset[1];
    const hz = d.headOffset[2];
    const hr = d.headRadius;

    // Roter, leicht nach oben gekippter Schnabel an der Kopf-Front.
    const beak = new THREE.ConeGeometry(0.13, 0.24, 10);
    beak.rotateX(Math.PI / 2);
    beak.translate(0, hy - 0.01, hz + hr + 0.05);
    bakeVertexColor(beak, d.beakColor);

    // Augen: weiße Sklera-Kugel + kleine dunkle Pupille knapp davor (proud,
    // damit nichts z-fightet). Spiegelsymmetrisch auf der Kopf-Front-Oberseite.
    const parts: THREE.BufferGeometry[] = [beak];
    for (const sx of [1, -1]) {
      const ex = sx * 0.14;
      const ey = hy + 0.11;
      const ez = hz + hr - 0.04;
      const sclera = new THREE.SphereGeometry(0.078, 12, 10);
      sclera.translate(ex, ey, ez);
      bakeVertexColor(sclera, d.eyeScleraColor);
      const pupil = new THREE.SphereGeometry(0.044, 10, 8);
      pupil.translate(ex * 0.92, ey, ez + 0.05);
      bakeVertexColor(pupil, d.eyeColor);
      parts.push(sclera, pupil);
    }

    const merged = mergeGeometries(parts, false);
    parts.forEach((p) => p.dispose());
    if (!merged) {
      throw new Error('DuckFactory: mergeGeometries (Detail) fehlgeschlagen');
    }
    merged.scale(d.scale, d.scale, d.scale);
    merged.computeVertexNormals();
    return merged;
  },

  /** Cel-shaded Körper-Material. `vertexColors:true` lässt die per-Instanz-
   *  Raritätsfarbe (InstancedMesh.instanceColor) durchschlagen; `gradientMap`
   *  erzeugt die Comic-Bänder; `applyToonGloss` den Gummi-Glanz. */
  buildMaterial(): THREE.MeshToonMaterial {
    const mat = new THREE.MeshToonMaterial({
      vertexColors: true,
      gradientMap: buildToonGradient(BALANCE.toon.gradientStops),
    });
    applyToonGloss(mat);
    return mat;
  },

  /** Detail-Material (Schnabel/Augen): gebackene Vertexfarben, KEIN instanceColor.
   *  Gleicher Toon-Gradient + Gloss wie der Körper → stilkonsistent + glänzend. */
  buildDetailMaterial(): THREE.MeshToonMaterial {
    const mat = new THREE.MeshToonMaterial({
      vertexColors: true,
      gradientMap: buildToonGradient(BALANCE.toon.gradientStops),
    });
    applyToonGloss(mat);
    return mat;
  },
};
