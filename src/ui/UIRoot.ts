import './styles.css';
import { HUD } from './HUD';
import { IntroScreen } from './IntroScreen';
import { SummaryScreen } from './SummaryScreen';
import { CardReveal } from './CardReveal';
import { CodexScreen } from './CodexScreen';
import type { EventBus } from '../events/EventBus';
import type { Economy } from '../systems/Economy';
import type { GameEvents, GamePhase } from '../types/events';

export interface UICallbacks {
  onStart: () => void;
  onRestart: () => void;
  onResume: () => void; // „Weiter" im Tipp-Modal → Runde fortsetzen (aus paused)
  onOpenCodex: () => void; // Codex öffnen (aus Intro/Summary)
  onCloseCodex: () => void; // Codex schließen → zurück zur Quelle
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
  private readonly codexScreen: CodexScreen;
  private readonly unsub: Array<() => void> = [];

  constructor(bus: EventBus<GameEvents>, economy: Economy, callbacks: UICallbacks) {
    this.root = document.createElement('div');
    this.root.className = 'qc-ui';
    document.body.appendChild(this.root);

    this.hud = new HUD(this.root, bus);
    this.introScreen = new IntroScreen(this.root, callbacks.onStart, callbacks.onOpenCodex);
    this.summaryScreen = new SummaryScreen(this.root, bus, callbacks.onRestart, callbacks.onOpenCodex);
    this.cardReveal = new CardReveal(this.root, bus, callbacks.onResume);
    this.codexScreen = new CodexScreen(this.root, bus, economy, callbacks.onCloseCodex);

    // Boot-Zustand ist 'start' (kein phase:changed beim Boot) → initial setzen.
    this.hud.setVisible(false);
    this.introScreen.setVisible(true);
    this.summaryScreen.setVisible(false);
    this.codexScreen.setVisible(false);

    this.unsub.push(bus.on('phase:changed', (e) => this.onPhase(e.to)));
  }

  /** Pro Frame aus Game: HUD-Count-up vorantreiben. */
  animateHud(dt: number): void {
    this.hud.animate(dt);
  }

  private onPhase(to: GamePhase): void {
    this.introScreen.setVisible(to === 'start');
    this.summaryScreen.setVisible(to === 'summary');
    this.codexScreen.setVisible(to === 'codex');
    // HUD bleibt während der Pause (Tipp-Modal) sichtbar.
    this.hud.setVisible(to === 'playing' || to === 'paused');
  }

  dispose(): void {
    for (const off of this.unsub) off();
    this.unsub.length = 0;
    this.codexScreen.dispose();
    this.cardReveal.dispose();
    this.summaryScreen.dispose();
    this.introScreen.dispose();
    this.hud.dispose();
    this.root.remove();
  }
}
