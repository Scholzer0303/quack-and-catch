import { RendererManager } from './RendererManager';
import { SceneManager } from './SceneManager';
import { CameraRig } from './CameraRig';
import { GameLoop } from './GameLoop';
import { Postprocessing } from './postprocessing/Postprocessing';
import { EventBus } from '../events/EventBus';
import type { GameEvents } from '../types/events';
import { buildStall, type StallParts } from '../world/StallBuilder';
import { BasinBuilder } from '../world/BasinBuilder';
import { DuckSpawner } from '../systems/DuckSpawner';
import { InputSystem } from '../systems/InputSystem';
import { FishingRod } from '../systems/FishingRod';
import { Economy } from '../systems/Economy';
import { RewardSystem } from '../systems/RewardSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { GameStateMachine } from './GameStateMachine';
import { Reticle } from '../ui/Reticle';
import { SplashFx } from '../fx/SplashFx';
import { UIRoot } from '../ui/UIRoot';
import { mulberry32 } from '../utils/rng';
import { BALANCE } from '../config/balance';

/** Top-Orchestrator: besitzt Systeme, verdrahtet den Loop, hält die Welt. */
export class Game {
  readonly bus = new EventBus<GameEvents>();
  private readonly renderer: RendererManager;
  private readonly sceneManager: SceneManager;
  private readonly cameraRig: CameraRig;
  private readonly post: Postprocessing | null;
  private readonly loop: GameLoop;
  private readonly stall: StallParts;
  private readonly basin: BasinBuilder;
  private readonly ducks: DuckSpawner;
  private readonly input: InputSystem;
  private readonly fishingRod: FishingRod;
  private readonly reticle: Reticle;
  private readonly splashFx: SplashFx;
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
    this.stall = buildStall();
    this.sceneManager.add(this.stall.group);
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
    this.splashFx = new SplashFx(); // Wasser-Splash beim Fang
    this.sceneManager.add(this.splashFx.group);

    // Bloom je nach Quality-Guard; null = direkter Render-Fallback (Mobile/off).
    const postFx = Game.resolvePostFx();
    this.post =
      postFx === 'off'
        ? null
        : new Postprocessing(this.renderer.renderer, this.sceneManager.scene, this.cameraRig.camera, {
            resScale: BALANCE.quality.bloomResolutionScale[postFx] ?? 1,
            strength: BALANCE.quality.bloomStrength,
            radius: BALANCE.quality.bloomRadius,
            threshold: BALANCE.quality.bloomThreshold,
          });

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

    // Juice: Fang-Feedback. Splash am Wasserpunkt W (Shake/Flash folgen additiv).
    this.busUnsub.push(
      this.bus.on('hook:result', (e) => {
        if (!e.hit) return;
        const p = this.fishingRod.getCatchPoint();
        this.splashFx.spawn(p.x, p.z);
        // Screenshake skaliert mit Rarität, Perfect gibt Extra-Punch.
        const sh = BALANCE.juice.shake;
        const mul = e.duck ? (sh.byRarity[e.duck.rarity] ?? 1) : 1;
        this.cameraRig.addShake(sh.catchIntensity * mul + (e.perfect ? sh.perfectBonus : 0));
        if (e.perfect) this.reticle.flash();
      }),
    );

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

  /** Quality-Guard: Mobile (coarse pointer) wird auf die schwächere Stufe gestellt. */
  private static resolvePostFx(): 'off' | 'low' | 'high' {
    const q = BALANCE.quality;
    const coarse =
      typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    return coarse ? q.coarsePointerPostFx : q.postFx;
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
    this.splashFx.update(dt);
    this.ui.animateHud(dt);
    this.reticle.render(this.fishingRod.getView(), dt);
    if (this.post) this.post.render();
    else this.renderer.render(this.sceneManager.scene, this.cameraRig.camera);
  }

  private readonly onResize = (): void => {
    this.renderer.resize();
    this.cameraRig.resize(this.renderer.aspect);
    this.post?.setSize(window.innerWidth, window.innerHeight);
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
    this.splashFx.dispose();
    this.ducks.dispose();
    this.basin.dispose();
    this.stall.dispose();
    this.post?.dispose();
    this.sceneManager.dispose();
    this.renderer.dispose();
    this.bus.clear();
  }
}
