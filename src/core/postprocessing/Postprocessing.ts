import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export interface BloomOptions {
  resScale: number; // Bloom-Auflösung × dieser Faktor (mobil < 1.0 = günstiger)
  strength: number;
  radius: number;
  threshold: number; // hoch → nur die hellsten Pixel blühen (kein Zuwaschen)
}

/**
 * Threshold-Bloom-Pipeline (RenderPass → UnrealBloomPass → OutputPass) um den
 * WebGLRenderer. `render()` ersetzt `renderer.render()` (Game schaltet per
 * Quality-Guard zwischen Composer und Direkt-Render). Bloom rendert auf einer
 * herunterskalierten Auflösung (`resScale`) für Mobile-Füllrate.
 */
export class Postprocessing {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly output: OutputPass;
  private readonly resScale: number;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    opts: BloomOptions,
  ) {
    this.renderer = renderer;
    this.resScale = opts.resScale;
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), opts.strength, opts.radius, opts.threshold);
    this.composer.addPass(this.bloom);
    this.output = new OutputPass();
    this.composer.addPass(this.output);
    this.setSize(window.innerWidth, window.innerHeight);
  }

  render(): void {
    this.composer.render();
  }

  setSize(width: number, height: number): void {
    const pr = this.renderer.getPixelRatio();
    this.composer.setPixelRatio(pr);
    this.composer.setSize(width, height);
    // Bloom bewusst kleiner (resScale) — nach composer.setSize, das alle Passes
    // sonst auf volle Effektivgröße zieht.
    const bw = Math.max(1, Math.floor(width * pr * this.resScale));
    const bh = Math.max(1, Math.floor(height * pr * this.resScale));
    this.bloom.setSize(bw, bh);
  }

  dispose(): void {
    // EffectComposer.dispose() gibt nur die RenderTargets frei, NICHT die Passes →
    // Bloom + OutputPass (eigene Materialien) explizit disposen.
    this.composer.dispose();
    this.bloom.dispose();
    this.output.dispose();
  }
}
