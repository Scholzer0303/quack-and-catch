import { RendererManager } from './RendererManager';
import { SceneManager } from './SceneManager';
import { CameraRig } from './CameraRig';
import { GameLoop } from './GameLoop';
import { EventBus } from '../events/EventBus';
import type { GameEvents } from '../types/events';
import { buildStall } from '../world/StallBuilder';
import { buildRod } from '../world/RodBuilder';
import { BasinBuilder } from '../world/BasinBuilder';
import { DuckSpawner } from '../systems/DuckSpawner';
import { InputSystem } from '../systems/InputSystem';
import { mulberry32 } from '../utils/rng';

/** Top-Orchestrator: besitzt Systeme, verdrahtet den Loop, hält die Welt. */
export class Game {
  readonly bus = new EventBus<GameEvents>();
  private readonly renderer: RendererManager;
  private readonly sceneManager: SceneManager;
  private readonly cameraRig: CameraRig;
  private readonly loop: GameLoop;
  private readonly basin: BasinBuilder;
  private readonly ducks: DuckSpawner;
  private readonly input: InputSystem;

  constructor(container: HTMLElement) {
    this.renderer = new RendererManager();
    container.appendChild(this.renderer.domElement);

    this.sceneManager = new SceneManager();
    this.cameraRig = new CameraRig(this.renderer.aspect);

    // Welt aufbauen
    this.sceneManager.add(buildStall());
    this.basin = new BasinBuilder();
    this.sceneManager.add(this.basin.group);

    // Enten (deterministischer Seed für reproduzierbare Startverteilung)
    this.ducks = new DuckSpawner(mulberry32(0xc0ffee), 0);
    this.sceneManager.add(this.ducks.mesh);

    // Angel als Kind der Kamera (Hand-Feel); Kamera in die Szene, sonst
    // werden ihre Kinder nicht gerendert.
    this.cameraRig.camera.add(buildRod());
    this.sceneManager.add(this.cameraRig.camera);

    this.loop = new GameLoop((dt, elapsed) => this.update(dt, elapsed));

    const canvas = this.renderer.domElement;

    // Eingabe: Pointer schwenkt Blick/Rute im Aim-Cone (press/release ab M2-Fang).
    this.input = new InputSystem(canvas, {
      onAim: (ax, ay) => this.cameraRig.setAimTarget(ax, ay),
    });

    window.addEventListener('resize', this.onResize);
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    canvas.addEventListener('webglcontextrestored', this.onContextRestored);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  start(): void {
    this.loop.start();
    this.bus.emit('phase:changed', { from: 'start', to: 'playing' });
  }

  private update(dt: number, elapsed: number): void {
    this.cameraRig.update(dt); // Aim anwenden, bevor gerendert wird
    this.basin.update(elapsed);
    this.ducks.update(dt, elapsed);
    this.renderer.render(this.sceneManager.scene, this.cameraRig.camera);
  }

  private readonly onResize = (): void => {
    this.renderer.resize();
    this.cameraRig.resize(this.renderer.aspect);
  };

  // GPU-Kontextverlust (v. a. Mobile): Render-Loop anhalten und bei
  // Wiederherstellung fortsetzen — kein Softlock, keine Fehler-Flut.
  private readonly onContextLost = (event: Event): void => {
    event.preventDefault();
    this.loop.stop();
  };

  private readonly onContextRestored = (): void => {
    this.loop.start();
  };

  // Tab versteckt: Loop pausieren (Akku/GPU schonen), bei Rückkehr fortsetzen.
  private readonly onVisibility = (): void => {
    if (document.hidden) this.loop.stop();
    else this.loop.start();
  };

  dispose(): void {
    this.loop.stop();
    const canvas = this.renderer.domElement;
    window.removeEventListener('resize', this.onResize);
    canvas.removeEventListener('webglcontextlost', this.onContextLost);
    canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.input.dispose();
    this.ducks.dispose();
    this.basin.dispose();
    this.sceneManager.dispose();
    this.renderer.dispose();
    this.bus.clear();
  }
}
