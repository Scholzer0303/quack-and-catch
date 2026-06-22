import * as THREE from 'three';
import { BALANCE } from '../config/balance';

/**
 * Jahrmarkt-Stand, der das Sichtfeld rahmt: Boden, Theke, zwei Pfosten,
 * gestreifte Markise und ein Hintergrund-Banner. Rein prozedural.
 */
export function buildStall(): THREE.Group {
  const group = new THREE.Group();
  const disposeGeos: THREE.BufferGeometry[] = [];
  const c = BALANCE.stall;

  const wood = new THREE.MeshStandardMaterial({ color: c.wood, roughness: 0.8 });
  const woodDark = new THREE.MeshStandardMaterial({ color: c.woodDark, roughness: 0.85 });
  const stripeRed = new THREE.MeshStandardMaterial({ color: c.stripeRed, roughness: 0.7 });
  const stripeCream = new THREE.MeshStandardMaterial({ color: c.stripeCream, roughness: 0.7 });

  const addBox = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
  ): void => {
    const geo = new THREE.BoxGeometry(w, h, d);
    disposeGeos.push(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    group.add(mesh);
  };

  // Boden (großer Jahrmarktplatz)
  const floorGeo = new THREE.CircleGeometry(22, 48);
  disposeGeos.push(floorGeo);
  const floorMat = new THREE.MeshStandardMaterial({ color: c.floor, roughness: 1 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.35;
  group.add(floor);

  // Flache Theke als unterer Bildrahmen (verdeckt das Becken nicht)
  addBox(5.6, 0.26, 0.4, 0, 0.66, 1.55, wood);
  addBox(5.6, 0.8, 0.08, 0, 0.2, 1.74, woodDark);

  // Zwei Eckpfosten
  addBox(0.2, 3.4, 0.2, -2.9, 1.35, 1.4, woodDark);
  addBox(0.2, 3.4, 0.2, 2.9, 1.35, 1.4, woodDark);

  // Markisen-Querbalken (oben, ragt in den oberen Bildrand)
  addBox(6.2, 0.2, 0.25, 0, 2.95, 1.5, wood);

  // Gestreifte Markise (abwechselnd rot/creme), leicht nach vorn geneigt
  const stripes = 9;
  const stripeW = 6.2 / stripes;
  for (let i = 0; i < stripes; i++) {
    const x = -6.2 / 2 + stripeW * (i + 0.5);
    addBox(stripeW * 0.96, 0.55, 0.9, x, 2.95, 1.05, i % 2 === 0 ? stripeRed : stripeCream);
  }

  // Hintergrund-Wand hinter dem Becken (Tiefe + kein Leeraum)
  addBox(18, 4.2, 0.3, 0, 1.7, -6.6, new THREE.MeshStandardMaterial({ color: c.back, roughness: 1 }));

  return group;
}
