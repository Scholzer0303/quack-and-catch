import * as THREE from 'three';
import { BALANCE } from '../config/balance';
import { waterVertexShader, waterFragmentShader } from './shaders/water';
import { buildToonGradient } from './DuckFactory';
import { buildOutlineMaterial } from './materials/OutlineMaterial';

/**
 * Ovaler Wasserkanal: animierte Wasseroberfläche (Custom-Shader) + schlanker
 * Holz-Plankenrand (Toon + schwarze Outline, stilkonsistent zu Enten/Rute).
 * `update(elapsed)` treibt die Wellen-Uniform.
 */
export class BasinBuilder {
  readonly group: THREE.Group;
  private readonly waterMaterial: THREE.ShaderMaterial;
  private readonly disposables: Array<{ dispose(): void }> = [];

  constructor() {
    const b = BALANCE.basin;
    this.group = new THREE.Group();
    this.group.position.set(0, 0, b.centerZ);

    // --- Wasseroberfläche ---
    const waterGeo = new THREE.PlaneGeometry(b.radiusX * 2, b.radiusZ * 2, 48, 32);
    // Sonnenrichtung (world) für den Crest-Glitzer = Position des Sonnen-DirLights.
    const sunDir = new THREE.Vector3(...BALANCE.render.dirPosition).normalize();
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
        u_fresnelColor: { value: new THREE.Color(b.waterFresnelColor) },
        u_fresnelPower: { value: b.waterFresnelPower },
        u_fresnelStrength: { value: b.waterFresnelStrength },
        u_sunDir: { value: sunDir },
        u_specColor: { value: new THREE.Color(b.waterSpecColor) },
        u_shininess: { value: b.waterSpecShininess },
        u_specStrength: { value: b.waterSpecStrength },
      },
      vertexShader: waterVertexShader,
      fragmentShader: waterFragmentShader,
      side: THREE.DoubleSide,
    });
    const water = new THREE.Mesh(waterGeo, this.waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.y = b.waterY;
    this.disposables.push(waterGeo, this.waterMaterial);

    // Gemeinsamer Comic-Look: Toon-Gradient + Inverted-Hull-Outline (wie Enten/Rute).
    const grad = buildToonGradient(BALANCE.toon.gradientStops);
    const outlineMat = buildOutlineMaterial(BALANCE.outline.color, BALANCE.outline.thickness);
    this.disposables.push(grad, outlineMat);

    // --- Schlanker Holz-Plankenrand (ovale Röhre aus skaliertem Torus, toon) ---
    const avg = (b.radiusX + b.radiusZ) / 2;
    const rimGeo = new THREE.TorusGeometry(avg, b.rimThickness, 12, 72);
    const rimMat = new THREE.MeshToonMaterial({ color: b.rimColor, gradientMap: grad });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = -Math.PI / 2;
    rim.scale.set(b.radiusX / avg, b.radiusZ / avg, 1);
    rim.position.y = b.rimY;
    // Schwarze Kontur: zweites, aufgeblähtes Mesh mit identischer Pose (teilt rimGeo).
    const rimOutline = new THREE.Mesh(rimGeo, outlineMat);
    rimOutline.rotation.x = -Math.PI / 2;
    rimOutline.scale.set(b.radiusX / avg, b.radiusZ / avg, 1);
    rimOutline.position.y = b.rimY;
    this.disposables.push(rimGeo, rimMat);

    // --- Innenwand (Zylinder-Ausschnitt für Tiefe, toon) ---
    const wallGeo = new THREE.CylinderGeometry(1, 1, b.innerWallHeight, 48, 1, true);
    const wallMat = new THREE.MeshToonMaterial({
      color: b.innerWallColor,
      gradientMap: grad,
      side: THREE.BackSide,
    });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.scale.set(b.radiusX, 1, b.radiusZ);
    wall.position.y = b.waterY - b.innerWallDrop;
    this.disposables.push(wallGeo, wallMat);

    this.group.add(water, rim, rimOutline, wall);
  }

  update(elapsed: number): void {
    this.waterMaterial.uniforms['u_time']!.value = elapsed;
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
  }
}
