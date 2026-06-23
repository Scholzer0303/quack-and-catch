import './styles.css';
import { HUD } from './HUD';
import { IntroScreen } from './IntroScreen';
import { PauseScreen } from './PauseScreen';
import { SummaryScreen } from './SummaryScreen';
import { CardReveal } from './CardReveal';
import { CodexScreen } from './CodexScreen';
import { ShopScreen } from './ShopScreen';
import { MuteButton } from './MuteButton';
import { Toast } from './Toast';
import type { EventBus } from '../events/EventBus';
import type { Economy } from '../systems/Economy';
import type { GameEvents, GamePhase } from '../types/events';

export interface UICallbacks {
  onStart: () => void;
  onRestart: () => void;
  onResume: () => void; // „Weiter" im Tipp-Modal → Runde fortsetzen (aus paused)
  onOpenCodex: () => void; // Codex öffnen (aus Intro/Summary)
  onCloseCodex: () => void; // Codex schließen → zurück zur Quelle
  onOpenShop: () => void; // Shop öffnen (aus Intro/Summary)
  onCloseShop: () => void; // Shop schließen → zurück zur Quelle
  onPause: () => void; // Pause-Button (HUD) → Pause-Menü öffnen
  onEndRound: () => void; // „Runde beenden" im Pause-Menü → Summary
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
  private readonly pauseScreen: PauseScreen;
  private readonly summaryScreen: SummaryScreen;
  private readonly cardReveal: CardReveal;
  private readonly codexScreen: CodexScreen;
  private readonly shopScreen: ShopScreen;
  private readonly muteButton: MuteButton;
  private readonly toast: Toast;
  private readonly unsub: Array<() => void> = [];

  constructor(bus: EventBus<GameEvents>, economy: Economy, callbacks: UICallbacks) {
    this.root = document.createElement('div');
    this.root.className = 'qc-ui';
    document.body.appendChild(this.root);

    this.hud = new HUD(this.root, bus, economy, callbacks.onPause);
    this.introScreen = new IntroScreen(
      this.root,
      callbacks.onStart,
      callbacks.onOpenCodex,
      callbacks.onOpenShop,
    );
    // Pause-Menü: „Weiter" teilt sich onResume mit dem Tipp-Modal (beide → playing,
    // kein Reset). Shop/Codex kehren reset-frei in die Pause zurück.
    this.pauseScreen = new PauseScreen(
      this.root,
      callbacks.onResume,
      callbacks.onEndRound,
      callbacks.onOpenShop,
      callbacks.onOpenCodex,
    );
    this.summaryScreen = new SummaryScreen(
      this.root,
      bus,
      callbacks.onRestart,
      callbacks.onOpenCodex,
      callbacks.onOpenShop,
    );
    this.cardReveal = new CardReveal(this.root, bus, callbacks.onResume);
    this.codexScreen = new CodexScreen(this.root, bus, economy, callbacks.onCloseCodex);
    this.shopScreen = new ShopScreen(this.root, bus, economy, callbacks.onCloseShop);
    // Stummschalt-Button: phasenunabhängig sichtbar (kein setVisible-Routing).
    this.muteButton = new MuteButton(this.root, bus);
    this.toast = new Toast(this.root);

    // Boot-Zustand ist 'start' (kein phase:changed beim Boot) → initial setzen.
    this.hud.setVisible(false);
    this.hud.setPauseButtonVisible(false);
    this.introScreen.setVisible(true);
    this.pauseScreen.setVisible(false);
    this.summaryScreen.setVisible(false);
    this.codexScreen.setVisible(false);
    this.shopScreen.setVisible(false);

    this.unsub.push(bus.on('phase:changed', (e) => this.onPhase(e.to)));
    // Linie gerissen (zu schwer): hook:result mit hit:false UND duck ≠ null → Hinweis.
    // Echter Miss (duck:null) zeigt nichts. (resolveSnap ist die einzige Snap-Quelle.)
    this.unsub.push(
      bus.on('hook:result', (e) => {
        if (!e.hit && e.duck) this.toast.show('💪 Zu schwer — stärkere Rute im Shop!');
      }),
    );
  }

  /** Pro Frame aus Game: HUD-Count-up vorantreiben. */
  animateHud(dt: number): void {
    this.hud.animate(dt);
  }

  private onPhase(to: GamePhase): void {
    this.introScreen.setVisible(to === 'start');
    this.pauseScreen.setVisible(to === 'pausemenu');
    this.summaryScreen.setVisible(to === 'summary');
    this.codexScreen.setVisible(to === 'codex');
    this.shopScreen.setVisible(to === 'shop');
    // HUD bleibt während der Pause (Tipp-Modal) sichtbar; das Pause-Menü deckt es ab.
    this.hud.setVisible(to === 'playing' || to === 'paused');
    // Pause-Button nur im laufenden Spiel (nicht im Tipp-Modal/Menü/Screens).
    this.hud.setPauseButtonVisible(to === 'playing');
  }

  dispose(): void {
    for (const off of this.unsub) off();
    this.unsub.length = 0;
    this.toast.dispose();
    this.muteButton.dispose();
    this.shopScreen.dispose();
    this.codexScreen.dispose();
    this.cardReveal.dispose();
    this.summaryScreen.dispose();
    this.pauseScreen.dispose();
    this.introScreen.dispose();
    this.hud.dispose();
    this.root.remove();
  }
}
