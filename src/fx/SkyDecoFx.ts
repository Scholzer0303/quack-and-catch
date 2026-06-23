import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BALANCE } from '../config/balance';
import { buildToonGradient, bakeVertexColor } from '../world/DuckFactory';
import { prefersReducedMotion } from './reducedMotion';
import { mulberry32 } from '../utils/rng';

/**
 * Himmel-Deko (M9): bunte Ballons steigen langsam auf und wrappen am oberen
 * Rand, dunkle Vogel-Silhouetten ziehen ihre Bahn quer über den Himmel — beide
 * als je eine InstancedMesh hinter der Welt. Reine Hintergrund-Belebung ohne
 * Gameplay-Bezug. Positionen werden deterministisch aus `elapsed` berechnet
 * (kein Aufintegrieren). Bei `prefers-reduced-motion` steht alles still.
 */
export class SkyDecoFx {
  readonly group = new THREE.Group();
  private readonly balloons: THREE.InstancedMesh;
  private readonly birds: THREE.InstancedMesh;
  private readonly balloonGeo: THREE.BufferGeometry;
  private readonly birdGeo: THREE.BufferGeometry;
  private readonly balloonMat: THREE.MeshToonMaterial;
  private readonly birdMat: THREE.MeshBasicMaterial;
  private readonly grad: THREE.DataTexture;
  private readonly dummy = new THREE.Object3D();
  private readonly color = new THREE.Color();
  // Deterministische Phasen-/Positions-Offsets je Instanz.
  private readonly balloonX: number[] = [];
  private readonly balloonOff: number[] = [];
  private readonly balloonPhase: number[] = [];
  private readonly birdRowY: number[] = [];
  private readonly birdOff: number[] = [];
  private readonly reduced = prefersReducedMotion();

  constructor() {
    const s = BALANCE.skyDeco;
    const rng = mulberry32(0x5e1a17);

    // ---- Ballons: Kugel + kleiner Knoten, weiß gebacken (instanceColor färbt) ----
    this.grad = buildToonGradient(BALANCE.toon.gradientStops);
    const body = new THREE.SphereGeometry(0.35, 12, 10);
    body.scale(1, 1.18, 1);
    bakeVertexColor(body, 0xffffff);
    const knot = new THREE.ConeGeometry(0.08, 0.14, 6);
    knot.rotateX(Math.PI);
    knot.translate(0, -0.42, 0);
    bakeVertexColor(knot, 0xffffff);
    const bGeo = mergeGeometries([body, knot], false);
    body.dispose();
    knot.dispose();
    if (!bGeo) throw new Error('SkyDecoFx: Ballon-Merge fehlgeschlagen');
    bGeo.computeVertexNormals();
    this.balloonGeo = bGeo;
    this.balloonMat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: this.grad });
    this.balloons = new THREE.InstancedMesh(this.balloonGeo, this.balloonMat, s.balloonCount);
    this.balloons.frustumCulled = false;

    const range = s.balloonYMax - s.balloonYMin;
    for (let i = 0; i < s.balloonCount; i++) {
      const t = s.balloonCount > 1 ? i / (s.balloonCount - 1) : 0.5;
      this.balloonX.push((t - 0.5) * s.balloonSpreadX);
      this.balloonOff.push(rng() * range); // gestaffelte Starthöhe
      this.balloonPhase.push(rng() * Math.PI * 2);
      this.color.setHex(s.balloonColors[i % s.balloonColors.length]!);
      this.balloons.setColorAt(i, this.color);
    }
    if (this.balloons.instanceColor) this.balloons.instanceColor.needsUpdate = true;

    // ---- Vögel: flache „V"-Silhouette (zwei geneigte Flügel), dunkel ----
    const wingL = new THREE.BoxGeometry(0.5, 0.06, 0.16);
    wingL.translate(0.25, 0, 0);
    wingL.rotateZ(0.45);
    const wingR = new THREE.BoxGeometry(0.5, 0.06, 0.16);
    wingR.translate(-0.25, 0, 0);
    wingR.rotateZ(-0.45);
    const birdGeo = mergeGeometries([wingL, wingR], false);
    wingL.dispose();
    wingR.dispose();
    if (!birdGeo) throw new Error('SkyDecoFx: Vogel-Merge fehlgeschlagen');
    this.birdGeo = birdGeo;
    this.birdMat = new THREE.MeshBasicMaterial({ color: s.birdColor });
    this.birds = new THREE.InstancedMesh(this.birdGeo, this.birdMat, s.birdCount);
    this.birds.frustumCulled = false;

    for (let i = 0; i < s.birdCount; i++) {
      this.birdRowY.push(s.birdY + (i - (s.birdCount - 1) / 2) * s.birdRowGap);
      this.birdOff.push(rng() * s.birdSpreadX * 2);
    }

    this.group.add(this.balloons, this.birds);
    this.writeMatrices(0);
  }

  update(elapsed: number): void {
    if (this.reduced) return; // statisch bei reduced-motion (einmal in writeMatrices(0) gesetzt)
    this.writeMatrices(elapsed);
  }

  private writeMatrices(elapsed: number): void {
    const s = BALANCE.skyDeco;
    const range = s.balloonYMax - s.balloonYMin;

    for (let i = 0; i < s.balloonCount; i++) {
      const y = s.balloonYMin + ((elapsed * s.balloonRiseSpeed + this.balloonOff[i]!) % range);
      const x =
        this.balloonX[i]! + Math.sin(elapsed * s.balloonSwaySpeed + this.balloonPhase[i]!) * s.balloonSwayAmp;
      this.dummy.position.set(x, y, s.balloonZ);
      this.dummy.scale.setScalar(s.balloonScale); // Rotation bleibt Identität (Dummy nie gedreht)
      this.dummy.updateMatrix();
      this.balloons.setMatrixAt(i, this.dummy.matrix);
    }
    this.balloons.instanceMatrix.needsUpdate = true;

    const span = s.birdSpreadX * 2;
    for (let i = 0; i < s.birdCount; i++) {
      const x = ((elapsed * s.birdSpeed + this.birdOff[i]!) % span) - s.birdSpreadX;
      const y = this.birdRowY[i]! + Math.sin(elapsed * s.birdBobSpeed + i) * s.birdBobAmp;
      this.dummy.position.set(x, y, s.birdZ);
      this.dummy.scale.setScalar(s.birdScale);
      this.dummy.updateMatrix();
      this.birds.setMatrixAt(i, this.dummy.matrix);
    }
    this.birds.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.balloonGeo.dispose();
    this.birdGeo.dispose();
    this.balloonMat.dispose();
    this.birdMat.dispose();
    this.grad.dispose();
    this.balloons.dispose();
    this.birds.dispose();
    this.group.removeFromParent();
  }
}
