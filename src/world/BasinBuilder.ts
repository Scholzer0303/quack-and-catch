import * as THREE from 'three';
import { BALANCE } from '../config/balance';
import { waterVertexShader, waterFragmentShader } from './shaders/water';

/**
 * Ovaler Wasserkanal: animierte Wasseroberfläche (Custom-Shader) + Rand-Ring.
 * `update(elapsed)` treibt die Wellen-Uniform.
 */
export class BasinBuilder {
  readonly group: THREE.Group;
  private readonly waterMaterial: THREE.ShaderMaterial;
  private readonly disposables: Array<THREE.BufferGeometry | THREE.Material> = [];

  constructor() {
    const b = BALANCE.basin;
    this.group = new THREE.Group();
    this.group.position.set(0, 0, b.centerZ);

    // --- Wasseroberfläche ---
    const waterGeo = new THREE.PlaneGeometry(b.radiusX * 2, b.radiusZ * 2, 48, 32);
    this.waterMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_amp: { value: b.waveAmplitude },
        u_freq: { value: b.waveFrequency },
        u_speed: { value: b.rippleSpeed },
        u_color: { value: new THREE.Color(b.waterColor) },
        u_deep: { value: new THREE.Color(b.waterDeepColor) },
        u_rx: { value: b.radiusX },
        u_rz: { value: b.radiusZ },
      },
      vertexShader: waterVertexShader,
      fragmentShader: waterFragmentShader,
      side: THREE.DoubleSide,
    });
    const water = new THREE.Mesh(waterGeo, this.waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.y = b.waterY;
    this.disposables.push(waterGeo, this.waterMaterial);

    // --- Rand-Ring (ovale Röhre aus skaliertem Torus) ---
    const avg = (b.radiusX + b.radiusZ) / 2;
    const rimGeo = new THREE.TorusGeometry(avg, b.rimThickness, 12, 64);
    const rimMat = new THREE.MeshStandardMaterial({ color: b.rimColor, roughness: 0.85, metalness: 0.05 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = -Math.PI / 2;
    rim.scale.set(b.radiusX / avg, b.radiusZ / avg, 1);
    rim.position.y = b.rimY;
    this.disposables.push(rimGeo, rimMat);

    // --- Innenwand (dunkler Zylinder-Ausschnitt für Tiefe) ---
    const wallGeo = new THREE.CylinderGeometry(1, 1, b.innerWallHeight, 48, 1, true);
    const wallMat = new THREE.MeshStandardMaterial({
      color: b.innerWallColor,
      roughness: 1,
      side: THREE.BackSide,
    });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.scale.set(b.radiusX, 1, b.radiusZ);
    wall.position.y = b.waterY - b.innerWallDrop;
    this.disposables.push(wallGeo, wallMat);

    this.group.add(water, rim, wall);
  }

  update(elapsed: number): void {
    this.waterMaterial.uniforms['u_time']!.value = elapsed;
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
  }
}
