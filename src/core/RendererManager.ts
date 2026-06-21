import * as THREE from 'three';
import { BALANCE } from '../config/balance';

/** Kapselt den WebGLRenderer inkl. pixelRatio-Cap und Resize. */
export class RendererManager {
  readonly renderer: THREE.WebGLRenderer;

  constructor() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(BALANCE.render.clearColor);
    this.resize();
  }

  get domElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, BALANCE.render.pixelRatioCap));
    this.renderer.setSize(width, height);
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer.render(scene, camera);
  }

  get aspect(): number {
    return window.innerWidth / window.innerHeight;
  }

  dispose(): void {
    this.renderer.dispose();
  }
}
