import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BALANCE } from '../config/balance';
import { buildToonGradient, bakeVertexColor } from './DuckFactory';
import { buildOutlineMaterial } from './materials/OutlineMaterial';
import { prefersReducedMotion } from '../fx/reducedMotion';

/**
 * Comic-Jahrmarkt, der das Sichtfeld rahmt: eigener Stand (Theke, Pfosten,
 * gestreifte Markise), eine Budenreihe hinterm Becken, Wimpel- und Lichterketten
 * sowie eine Fernkulisse (Riesenrad + Zirkuszelt). Rein prozedural.
 *
 * Stilkonsistent zu Enten/Rute: alle massiven Teile teilen sich EINE gemergte,
 * vertex-gefärbte Toon-Geometrie (1 Draw-Call) + eine schwarze Inverted-Hull-
 * Outline (1 Draw-Call). Flache Streifen (Markisen) und doppelseitige Wimpel
 * laufen ohne Outline, die Glühbirnen als eine InstancedMesh. Geometrie/Layout
 * liegt bewusst inline (Projekt-Konvention: nur Farben in `balance.ts`).
 */
export interface StallParts {
  group: THREE.Group;
  /** Pro Frame: Riesenrad drehen + Lichterketten pulsieren/abklingen lassen. */
  update(dt: number, elapsed: number): void;
  /** Kurzes Aufblitzen aller Glühbirnen (bei einem Fang ausgelöst). */
  flash(): void;
  dispose(): void;
}

/** Nur die für mergeGeometries kompatiblen Attribute behalten (sonst wirft das Merge). */
function trim(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  for (const key of Object.keys(geo.attributes)) {
    if (key !== 'position' && key !== 'normal' && key !== 'uv' && key !== 'color') {
      geo.deleteAttribute(key);
    }
  }
  return geo;
}

/** Ein nach unten zeigendes Wimpel-Dreieck (oben aufgehängt, Spitze unten). */
function pennant(w: number, h: number): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-w / 2, 0, 0, w / 2, 0, 0, 0, -h, 0], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 0.5, 0], 2));
  g.setIndex([0, 1, 2]);
  return g;
}

export function buildStall(): StallParts {
  const c = BALANCE.stall;
  const group = new THREE.Group();

  // Geometrie-Eimer: massiv (Toon + Outline), flach (Streifen, kein Outline),
  // Wimpel (doppelseitig, kein Outline). Werden am Ende je zu einer Geo gemergt.
  const solid: THREE.BufferGeometry[] = [];
  const flat: THREE.BufferGeometry[] = [];
  const flags: THREE.BufferGeometry[] = [];

  const push = (list: THREE.BufferGeometry[], geo: THREE.BufferGeometry, hex: number): void => {
    list.push(bakeVertexColor(trim(geo), hex));
  };
  const box = (
    list: THREE.BufferGeometry[],
    hex: number,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ): void => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y, z);
    push(list, g, hex);
  };

  // ---- Eigener Stand (Vordergrund-Rahmen) ----
  box(solid, c.wood, 5.6, 0.26, 0.4, 0, 0.66, 1.55); // Thekenplatte
  box(solid, c.woodDark, 5.6, 0.8, 0.08, 0, 0.2, 1.74); // Thekenfront
  box(solid, c.woodDark, 0.2, 3.4, 0.2, -2.9, 1.35, 1.4); // Pfosten links
  box(solid, c.woodDark, 0.2, 3.4, 0.2, 2.9, 1.35, 1.4); // Pfosten rechts
  box(solid, c.wood, 6.2, 0.2, 0.25, 0, 2.95, 1.5); // Markisen-Querbalken
  const stripes = 9;
  const stripeW = 6.2 / stripes;
  for (let i = 0; i < stripes; i++) {
    const x = -6.2 / 2 + stripeW * (i + 0.5);
    box(flat, i % 2 === 0 ? c.stripeRed : c.stripeCream, stripeW * 0.96, 0.55, 0.9, x, 2.95, 1.05);
  }

  // ---- Budenreihe hinterm Becken ----
  const boothX = [-4.6, 0, 4.6];
  boothX.forEach((bx, i) => {
    const panel = c.boothPanels[i % c.boothPanels.length]!;
    box(solid, c.woodDark, 3.0, 1.1, 0.7, bx, 0.25, -7.0); // Korpus/Theke
    box(solid, panel, 3.0, 1.9, 0.12, bx, 1.2, -7.35); // farbiges Rückwand-Paneel
    box(solid, c.wood, 0.14, 2.0, 0.14, bx - 1.45, 1.0, -6.6); // Pfosten links
    box(solid, c.wood, 0.14, 2.0, 0.14, bx + 1.45, 1.0, -6.6); // Pfosten rechts
    const bs = 5;
    const bsW = 3.3 / bs;
    for (let j = 0; j < bs; j++) {
      const sx = bx - 3.3 / 2 + bsW * (j + 0.5);
      box(flat, j % 2 === 0 ? c.stripeRed : c.stripeCream, bsW * 0.95, 0.4, 0.85, sx, 2.05, -6.65);
    }
  });

  // ---- Fernkulisse: Riesenrad (rechts) — großer Bogen ragt über die Budenreihe ----
  // Die drehenden Teile (Felge, Nabe, Speichen, Gondeln) liegen um den Ursprung
  // und kommen in eine eigene, an der Nabe positionierte Group (rotiert in `update`).
  // Die Standbeine bleiben statisch im großen `solid`-Merge.
  const ferris: THREE.BufferGeometry[] = [];
  const fx = 5.8;
  const fy = 0.8; // Nabe tief hinter den Buden; oberer Bogen + Gondeln sichtbar
  const fz = -11;
  const R = 2.4;
  {
    const ring = new THREE.TorusGeometry(R, 0.12, 8, 28); // Felge (in XY-Ebene → zur Kamera)
    push(ferris, ring, c.ferrisColor);
    const hub = new THREE.CylinderGeometry(0.28, 0.28, 0.26, 12);
    hub.rotateX(Math.PI / 2);
    push(ferris, hub, c.ferrisColor);
    for (let k = 0; k < 4; k++) {
      const spoke = new THREE.BoxGeometry(0.07, R * 2, 0.07); // 4 Durchmesser-Speichen → 8 Arme
      spoke.rotateZ((k * Math.PI) / 4);
      push(ferris, spoke, c.ferrisColor);
    }
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      const cabin = new THREE.BoxGeometry(0.32, 0.28, 0.22);
      cabin.translate(Math.cos(a) * R, Math.sin(a) * R, 0);
      push(ferris, cabin, c.ferrisCabin);
    }
    // Zwei leicht gespreizte Standbeine (Fuß auf dem Boden, Spitze an der Nabe) — statisch.
    const legLen = fy + 0.4 + 0.35;
    const legMidY = (-0.35 + fy) / 2;
    const legL = new THREE.BoxGeometry(0.12, legLen, 0.12);
    legL.rotateZ(-0.34);
    legL.translate(fx - 0.7, legMidY, fz);
    push(solid, legL, c.ferrisColor);
    const legR = new THREE.BoxGeometry(0.12, legLen, 0.12);
    legR.rotateZ(0.34);
    legR.translate(fx + 0.7, legMidY, fz);
    push(solid, legR, c.ferrisColor);
  }

  // ---- Fernkulisse: Zirkuszelt (links) — große Dachspitze ragt über die Budenreihe ----
  {
    const tx = -5.5;
    const tz = -11;
    const base = new THREE.CylinderGeometry(1.6, 1.6, 1.7, 16);
    base.translate(tx, 0.5, tz);
    push(solid, base, c.tentBase);
    const roof = new THREE.ConeGeometry(2.4, 2.8, 12);
    roof.translate(tx, 1.7, tz); // Apex ~3.1 — über der Budenreihe, unter der Markise
    push(solid, roof, c.tentRoof);
    const tip = new THREE.ConeGeometry(0.16, 0.5, 6);
    tip.translate(tx, 3.0, tz);
    push(solid, tip, c.tentTip);
  }

  // ---- Wimpelketten + Lichterketten ----
  const bulbPos: THREE.Vector3[] = [];
  const bulbCol: number[] = [];
  const flagCycle = [c.stripeRed, c.stripeCream, c.boothPanels[0]!];
  const addGarland = (
    x0: number,
    x1: number,
    z: number,
    topY: number,
    sag: number,
    count: number,
  ): void => {
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const x = x0 + (x1 - x0) * t;
      const y = topY - sag * (1 - Math.pow(2 * t - 1, 2)); // Durchhang (Parabel, Mitte am tiefsten)
      const tri = pennant(0.22, 0.3);
      tri.translate(x, y, z);
      push(flags, tri, flagCycle[i % flagCycle.length]!);
      bulbPos.push(new THREE.Vector3(x, y + 0.07, z)); // Birne sitzt knapp über dem Wimpel
      bulbCol.push(i % 2 === 0 ? c.bulbWarm : c.bulbCool);
    }
  };
  addGarland(-2.7, 2.7, 1.42, 2.78, 0.5, 13); // vorne, zwischen den eigenen Pfosten
  addGarland(-6.6, 6.6, -6.3, 2.7, 0.45, 17); // hinten, über der Budenreihe

  // ---- Merge & Meshes ----
  const grad = buildToonGradient(BALANCE.toon.gradientStops);
  const toonMat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad });
  const flagMat = new THREE.MeshToonMaterial({
    vertexColors: true,
    gradientMap: grad,
    side: THREE.DoubleSide,
  });
  const outlineMat = buildOutlineMaterial(BALANCE.outline.color, BALANCE.outline.thickness);

  const solidGeo = mergeGeometries(solid, false);
  const flatGeo = mergeGeometries(flat, false);
  const flagGeo = mergeGeometries(flags, false);
  const ferrisGeo = mergeGeometries(ferris, false);
  [...solid, ...flat, ...flags, ...ferris].forEach((g) => g.dispose());

  if (!solidGeo || !flatGeo || !flagGeo || !ferrisGeo) {
    throw new Error('StallBuilder: mergeGeometries fehlgeschlagen');
  }
  group.add(new THREE.Mesh(solidGeo, toonMat));
  if (BALANCE.outline.enabled) group.add(new THREE.Mesh(solidGeo, outlineMat));
  group.add(new THREE.Mesh(flatGeo, toonMat));
  group.add(new THREE.Mesh(flagGeo, flagMat));

  // Drehbares Riesenrad: eigene Group an der Nabe, rotiert in `update` um die z-Achse.
  const ferrisGroup = new THREE.Group();
  ferrisGroup.position.set(fx, fy, fz);
  ferrisGroup.add(new THREE.Mesh(ferrisGeo, toonMat));
  if (BALANCE.outline.enabled) ferrisGroup.add(new THREE.Mesh(ferrisGeo, outlineMat));
  group.add(ferrisGroup);

  // ---- Glühbirnen (emissive, eine InstancedMesh, kein Fog) ----
  const bulbGeo = new THREE.SphereGeometry(0.055, 8, 6);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  bulbMat.fog = false; // helle Punkte, nicht vom Welt-Fog gedimmt
  const bulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, bulbPos.length);
  const m = new THREE.Matrix4();
  const col = new THREE.Color();
  for (let i = 0; i < bulbPos.length; i++) {
    const p = bulbPos[i]!;
    m.makeTranslation(p.x, p.y, p.z);
    bulbs.setMatrixAt(i, m);
    bulbs.setColorAt(i, col.set(bulbCol[i]!));
  }
  bulbs.instanceMatrix.needsUpdate = true;
  if (bulbs.instanceColor) bulbs.instanceColor.needsUpdate = true;
  group.add(bulbs);

  // ---- Boden (Jahrmarktplatz, matt — kein Toon-Banding auf großer Fläche) ----
  const floorGeo = new THREE.CircleGeometry(22, 48);
  const floorMat = new THREE.MeshStandardMaterial({ color: c.floor, roughness: 1 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.35;
  group.add(floor);

  const disposables: Array<{ dispose(): void }> = [
    grad,
    toonMat,
    flagMat,
    outlineMat,
    solidGeo,
    flatGeo,
    flagGeo,
    ferrisGeo,
    bulbs, // InstancedMesh: gibt instanceMatrix/instanceColor-Buffer frei (wie DuckSpawner)
    bulbGeo,
    bulbMat,
    floorGeo,
    floorMat,
  ];

  // ---- Reaktive Animation: Riesenrad-Drehung + pulsierende/aufblitzende Birnen ----
  const reduced = prefersReducedMotion();
  const ferrisAngular = (c.ferrisRpm / 60) * Math.PI * 2; // rad/s
  let flashLevel = 0; // 1 beim Fang-Aufblitzen, klingt zu 0 ab
  return {
    group,
    update(dt: number, elapsed: number): void {
      if (reduced) return; // bewegungslos bei reduced-motion (Birnen bleiben auf Grundhelligkeit)
      ferrisGroup.rotation.z = elapsed * ferrisAngular;
      if (flashLevel > 0) flashLevel = Math.max(0, flashLevel - dt / c.bulbFlashDecaySec);
      // Helligkeits-Multiplikator: NUR aufhellend (0…bulbPulseAmp), damit der Wert nie
      // unter 1.0 fällt — sonst dippt die Birnen-Luminanz unter die Bloom-Threshold und
      // das Glühen flackert. So pulsiert die Helligkeit ≥1 (HDR → bleibt im Bloom).
      const pulse = (0.5 + 0.5 * Math.sin(elapsed * c.bulbPulseSpeed)) * c.bulbPulseAmp;
      bulbMat.color.setScalar(1 + pulse + flashLevel * c.bulbFlashGain);
    },
    flash(): void {
      if (reduced) return; // kein Aufblitzen bei reduced-motion (Photosensitivität)
      flashLevel = 1;
    },
    dispose(): void {
      for (const d of disposables) d.dispose();
    },
  };
}
