import './styles.css';
import { HUD } from './HUD';
import { IntroScreen } from './IntroScreen';
import { SummaryScreen } from './SummaryScreen';
import { CardReveal } from './CardReveal';
import type { EventBus } from '../events/EventBus';
import type { GameEvents, GamePhase } from '../types/events';

export interface UICallbacks {
  onStart: () => void;
  onRestart: () => void;
  onResume: () => void; // „Weiter" im Tipp-Modal → Runde fortsetzen (aus paused)
}

/**
 * Wurzel der DOM-UI: hängt einen Root-Container an document.body (wie Reticle)
 * und besitzt alle UI-Komponenten. Steuert die Sichtbarkeit der Screens über
 * `phase:changed`; HUD und Karten-Modal verwalten sich aus ihren Events.
 */
export class UIRoot {
  private readonly root: HTMLDivElement;
  private readonly hud: HUD;
  private readonly introScreen: IntroScreen;
  private readonly summaryScreen: SummaryScreen;
  private readonly cardReveal: CardReveal;
  private readonly unsub: Array<() => void> = [];

  constructor(bus: EventBus<GameEvents>, callbacks: UICallbacks) {
    this.root = document.createElement('div');
    this.root.className = 'qc-ui';
    document.body.appendChild(this.root);

    this.hud = new HUD(this.root, bus);
    this.introScreen = new IntroScreen(this.root, callbacks.onStart);
    this.summaryScreen = new SummaryScreen(this.root, bus, callbacks.onRestart);
    this.cardReveal = new CardReveal(this.root, bus, callbacks.onResume);

    // Boot-Zustand ist 'start' (kein phase:changed beim Boot) → initial setzen.
    this.hud.setVisible(false);
    this.introScreen.setVisible(true);
    this.summaryScreen.setVisible(false);

    this.unsub.push(bus.on('phase:changed', (e) => this.onPhase(e.to)));
  }

  /** Pro Frame aus Game: HUD-Count-up vorantreiben. */
  animateHud(dt: number): void {
    this.hud.animate(dt);
  }

  private onPhase(to: GamePhase): void {
    this.introScreen.setVisible(to === 'start');
    this.summaryScreen.setVisible(to === 'summary');
    // HUD bleibt während der Pause (Tipp-Modal) sichtbar.
    this.hud.setVisible(to === 'playing' || to === 'paused');
  }

  dispose(): void {
    for (const off of this.unsub) off();
    this.unsub.length = 0;
    this.cardReveal.dispose();
    this.summaryScreen.dispose();
    this.introScreen.dispose();
    this.hud.dispose();
    this.root.remove();
  }
}
