import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BALANCE } from '../config/balance';
import { bakeVertexColor } from './DuckFactory';

/**
 * Baut eine simple Comic-Zuschauerfigur (runder Körper + Kopf, zwei hoch
 * gereckte Arme = Jubel-Pose, zwei Augenpunkte) als EINE gemergte Geometrie —
 * eine InstancedMesh, ein Draw-Call. Körper/Kopf/Arme sind WEISS gebacken, damit
 * die per-Instanz-Kleidungsfarbe (InstancedMesh.instanceColor) die ganze Figur
 * einfärbt; nur die kleinen Augen behalten ihren dunklen Ton (werden minimal
 * mitgetönt). Spiegelt das Muster aus DuckFactory.
 *
 * Ursprung liegt an den Füßen (y≈0, nach +z blickend), damit Instanzen einfach
 * auf den Boden gesetzt und Richtung Becken gedreht werden können.
 */
export const CharacterFactory = {
  buildGeometry(): THREE.BufferGeometry {
    const face = BALANCE.crowd.faceColor;

    // Körper: gestreckte Kugel (rundlicher Rumpf), Boden ~y=0.
    const body = new THREE.SphereGeometry(0.32, 14, 12);
    body.scale(1, 1.4, 0.9);
    body.translate(0, 0.5, 0);
    bakeVertexColor(body, 0xffffff);

    // Kopf
    const head = new THREE.SphereGeometry(0.24, 14, 10);
    head.translate(0, 1.08, 0);
    bakeVertexColor(head, 0xffffff);

    // Zwei hoch gereckte Arme (Jubel): schmale Boxen, von der Schulter schräg nach oben.
    const armL = new THREE.BoxGeometry(0.11, 0.5, 0.11);
    armL.translate(0, 0.25, 0); // Drehpunkt an die Schulter
    armL.rotateZ(-0.95);
    armL.translate(0.3, 0.8, 0);
    bakeVertexColor(armL, 0xffffff);

    const armR = new THREE.BoxGeometry(0.11, 0.5, 0.11);
    armR.translate(0, 0.25, 0);
    armR.rotateZ(0.95);
    armR.translate(-0.3, 0.8, 0);
    bakeVertexColor(armR, 0xffffff);

    // Augenpunkte (vorn am Kopf)
    const eyeL = new THREE.SphereGeometry(0.045, 8, 6);
    eyeL.translate(0.09, 1.12, 0.2);
    bakeVertexColor(eyeL, face);

    const eyeR = new THREE.SphereGeometry(0.045, 8, 6);
    eyeR.translate(-0.09, 1.12, 0.2);
    bakeVertexColor(eyeR, face);

    const parts = [body, head, armL, armR, eyeL, eyeR];
    const merged = mergeGeometries(parts, false);
    parts.forEach((p) => p.dispose());
    if (!merged) {
      throw new Error('CharacterFactory: mergeGeometries fehlgeschlagen');
    }
    merged.computeVertexNormals();
    return merged;
  },
};
