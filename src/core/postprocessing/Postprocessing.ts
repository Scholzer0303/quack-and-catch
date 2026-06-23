import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

export interface BloomOptions {
  resScale: number; // Bloom-Auflösung × dieser Faktor (mobil < 1.0 = günstiger)
  strength: number;
  radius: number;
  threshold: number; // hoch → nur die hellsten Pixel blühen (kein Zuwaschen)
  exposure: number; // Grade-Pass: Belichtung vor ACES
  saturation: number; // Grade-Pass: Sättigungs-Boost (> 1 = satter)
}

/**
 * Finaler Grade-Pass (M12) — ersetzt OutputPass: ACES-Filmic-Tonemapping +
 * Sättigungs-Boost + Linear→sRGB-Encoding in EINEM Pass. Läuft NACH dem Bloom,
 * daher bleibt die Bloom-Threshold (in linearem HDR) unberührt. Eingang ist das
 * lineare HDR-RenderTarget; Ausgang ist sRGB-encodiert für den Canvas. Der
 * Renderer bleibt deshalb auf `NoToneMapping` (sonst doppeltes Tonemapping).
 */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uExposure: { value: 1.0 },
    uSaturation: { value: 1.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uExposure;
    uniform float uSaturation;
    varying vec2 vUv;

    // ACES Filmic (Narkowicz-Approximation) — auf linearem HDR, Ausgabe ~[0,1].
    vec3 aces(vec3 x) {
      const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
    }
    // Linear → sRGB (Display-Transfer).
    vec3 lin2srgb(vec3 c) {
      vec3 lo = c * 12.92;
      vec3 hi = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
      return mix(hi, lo, step(c, vec3(0.0031308)));
    }
    void main() {
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      col *= uExposure;
      col = aces(col);
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = clamp(mix(vec3(l), col, uSaturation), 0.0, 1.0);
      gl_FragColor = vec4(lin2srgb(col), 1.0);
    }
  `,
};

/**
 * Threshold-Bloom-Pipeline (RenderPass → UnrealBloomPass → Grade-Pass) um den
 * WebGLRenderer. `render()` ersetzt `renderer.render()` (Game schaltet per
 * Quality-Guard zwischen Composer und Direkt-Render). Bloom rendert auf einer
 * herunterskalierten Auflösung (`resScale`) für Mobile-Füllrate.
 */
export class Postprocessing {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly grade: ShaderPass;
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
    this.grade = new ShaderPass(GradeShader);
    this.grade.uniforms['uExposure']!.value = opts.exposure;
    this.grade.uniforms['uSaturation']!.value = opts.saturation;
    this.composer.addPass(this.grade);
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
    // Bloom + Grade-Pass (eigene Materialien) explizit disposen.
    this.composer.dispose();
    this.bloom.dispose();
    this.grade.dispose();
  }
}
