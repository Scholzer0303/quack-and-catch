import { RendererManager } from './RendererManager';
import { SceneManager } from './SceneManager';
import { CameraRig } from './CameraRig';
import { GameLoop } from './GameLoop';
import { EventBus } from '../events/EventBus';
import type { GameEvents } from '../types/events';
import { buildStall } from '../world/StallBuilder';
import { BasinBuilder } from '../world/BasinBuilder';
import { DuckSpawner } from '../systems/DuckSpawner';
import { InputSystem } from '../systems/InputSystem';
import { FishingRod } from '../systems/FishingRod';
import { Economy } from '../systems/Economy';
import { RewardSystem } from '../systems/RewardSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { GameStateMachine } from './GameStateMachine';
import { Reticle } from '../ui/Reticle';
import { UIRoot } from '../ui/UIRoot';
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
  private readonly fishingRod: FishingRod;
  private readonly reticle: Reticle;
  private readonly state: GameStateMachine;
  private readonly economy: Economy;
  private readonly reward: RewardSystem;
  private readonly save: SaveSystem;
  private readonly ui: UIRoot;
  private readonly busUnsub: Array<() => void> = [];

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
    if (this.ducks.outlineMesh) this.sceneManager.add(this.ducks.outlineMesh);

    // Kamera in die Szene, sonst werden ihre Kinder nicht gerendert. Die Rute
    // hängt FishingRod selbst als Kind der Kamera ein (Hand-Feel + Animation).
    this.sceneManager.add(this.cameraRig.camera);

    this.loop = new GameLoop((dt, elapsed) => this.update(dt, elapsed));

    const canvas = this.renderer.domElement;

    // Fang-Mechanik: zielt über die Kamera, fängt aus dem Entenpool.
    this.fishingRod = new FishingRod(this.cameraRig.camera, this.ducks, this.bus);
    this.sceneManager.add(this.fishingRod.highlight); // Drop-Zone-Ring auf dem Wasser
    this.sceneManager.add(this.fishingRod.rig); // Schnur + Haken (world-space, reicht ins Wasser)
    this.reticle = new Reticle(); // Fadenkreuz am Wasser-Zielpunkt

    // Belohnung/Ökonomie/Phasen (entkoppelt über den EventBus). Economy zuerst
    // (RewardSystem hält die Referenz für isNewTip); eigener RNG-Seed.
    this.state = new GameStateMachine(this.bus);
    this.economy = new Economy(this.bus);
    this.reward = new RewardSystem(this.bus, this.economy, mulberry32(0x5eed01));
    this.ui = new UIRoot(this.bus, {
      onStart: () => this.state.start(),
      onRestart: () => this.state.restart(),
      onResume: () => this.state.setPhase('playing'),
    });

    // Persistenz: NACH der UIRoot laden, damit der hydrate-Emit (`economy:changed`)
    // das bereits gebaute HUD erreicht und der geladene Token-Saldo erscheint.
    this.save = new SaveSystem(this.bus, this.economy);
    this.save.load();

    // Fang löst die Tipp-Karte aus → Runde pausieren bis „Weiter".
    this.busUnsub.push(this.bus.on('reward:granted', () => this.state.setPhase('paused')));
    // Verlässt das Spiel 'playing', laufenden Hold sauber auflösen (kein stuck Hold).
    this.busUnsub.push(
      this.bus.on('phase:changed', (e) => {
        if (e.to !== 'playing') this.fishingRod.cancel();
      }),
    );

    // Eingabe: Zeiger steuert direktes Fadenkreuz (Reticle + Fang-Strahl) und
    // einen dezenten Parallax-Schwenk; Halten/Loslassen fängt.
    // Auswerfen nur in 'playing' (Phase-Gate); Loslassen/Abbruch bleiben offen,
    // damit ein laufender Hold sich immer auflösen kann.
    this.input = new InputSystem(canvas, {
      onAim: (ax, ay) => {
        this.cameraRig.setAimTarget(ax, ay);
        this.fishingRod.setAim(ax, ay);
        this.reticle.setPointer(ax, ay);
      },
      onPress: (ax, ay) => {
        this.fishingRod.setAim(ax, ay);
        this.reticle.setPointer(ax, ay);
        if (this.state.isPlaying()) this.fishingRod.press(ax, ay);
      },
      onRelease: () => this.fishingRod.release(),
      onCancel: () => this.fishingRod.cancel(),
    });

    window.addEventListener('resize', this.onResize);
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    canvas.addEventListener('webglcontextrestored', this.onContextRestored);
    document.addEventListener('visibilitychange', this.onVisibility);

    // Dev-Hook für Verifikation/Konsole; in Prod via import.meta.env.DEV getreeshakt.
    if (import.meta.env.DEV) {
      (window as unknown as { __qc?: unknown }).__qc = {
        bus: this.bus,
        ducks: this.ducks,
        rod: this.fishingRod,
        state: this.state,
        economy: this.economy,
        save: this.save,
        camera: this.cameraRig.camera,
        scene: this.sceneManager.scene,
      };
    }
  }

  start(): void {
    // Spiel bootet im Start-Screen; der Start-Button startet die Runde.
    this.loop.start();
  }

  private update(dt: number, elapsed: number): void {
    this.cameraRig.update(dt); // Aim anwenden, bevor geraycastet/gerendert wird
    this.state.update(dt); // Rundentimer (zählt nur in 'playing')
    // Becken/Enten nur im Tipp-Modal einfrieren — hinter Start/Summary leben sie.
    if (this.state.getPhase() !== 'paused') {
      this.basin.update(elapsed);
      this.ducks.update(dt, elapsed); // schreibt frische worldX/Y/Z vor dem Raycast
    }
    this.fishingRod.update(dt);
    this.reticle.render(this.fishingRod.getView());
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
    for (const off of this.busUnsub) off();
    this.busUnsub.length = 0;
    this.input.dispose();
    this.ui.dispose();
    this.reward.dispose();
    this.save.dispose(); // vor economy/bus: Flush braucht lebende Economy + Bus
    this.economy.dispose();
    this.state.dispose();
    this.reticle.dispose();
    this.fishingRod.dispose();
    this.ducks.dispose();
    this.basin.dispose();
    this.sceneManager.dispose();
    this.renderer.dispose();
    this.bus.clear();
  }
}
