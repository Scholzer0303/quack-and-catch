import './styles.css';
import { HUD } from './HUD';
import { StartScreen } from './StartScreen';
import type { EventBus } from '../events/EventBus';
import type { GameEvents, GamePhase } from '../types/events';

export interface UICallbacks {
  onStart: () => void;
  onRestart: () => void;
}

/**
 * Wurzel der DOM-UI: hängt einen Root-Container an document.body (wie Reticle)
 * und besitzt die UI-Komponenten. Steuert deren Sichtbarkeit über `phase:changed`.
 * Karten-Modal + Summary kommen in M3-Sub-Task 6 hinzu.
 */
export class UIRoot {
  private readonly root: HTMLDivElement;
  private readonly hud: HUD;
  private readonly startScreen: StartScreen;
  private readonly unsub: Array<() => void> = [];

  constructor(bus: EventBus<GameEvents>, callbacks: UICallbacks) {
    this.root = document.createElement('div');
    this.root.className = 'qc-ui';
    document.body.appendChild(this.root);

    this.hud = new HUD(this.root, bus);
    this.startScreen = new StartScreen(this.root, callbacks.onStart);

    // Boot-Zustand ist 'start' (kein phase:changed beim Boot) → initial setzen.
    this.hud.setVisible(false);
    this.startScreen.setVisible(true);

    this.unsub.push(bus.on('phase:changed', (e) => this.onPhase(e.to)));
  }

  private onPhase(to: GamePhase): void {
    this.startScreen.setVisible(to === 'start');
    // HUD bleibt während der Pause (Tipp-Modal) sichtbar.
    this.hud.setVisible(to === 'playing' || to === 'paused');
  }

  dispose(): void {
    for (const off of this.unsub) off();
    this.unsub.length = 0;
    this.startScreen.dispose();
    this.hud.dispose();
    this.root.remove();
  }
}
