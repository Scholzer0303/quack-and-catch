import './styles.css';
import { HUD } from './HUD';
import type { EventBus } from '../events/EventBus';
import type { GameEvents, GamePhase } from '../types/events';

/**
 * Wurzel der DOM-UI: hängt einen Root-Container an document.body (wie Reticle)
 * und besitzt die UI-Komponenten. Steuert deren Sichtbarkeit über `phase:changed`.
 * Screens (Start/Summary) und Karten-Modal kommen in M3-Sub-Tasks 5/6 hinzu.
 */
export class UIRoot {
  private readonly root: HTMLDivElement;
  private readonly hud: HUD;
  private readonly unsub: Array<() => void> = [];

  constructor(bus: EventBus<GameEvents>) {
    this.root = document.createElement('div');
    this.root.className = 'qc-ui';
    document.body.appendChild(this.root);

    this.hud = new HUD(this.root, bus);
    this.hud.setVisible(false);

    this.unsub.push(bus.on('phase:changed', (e) => this.onPhase(e.to)));
  }

  private onPhase(to: GamePhase): void {
    // HUD bleibt während der Pause (Tipp-Modal) sichtbar.
    this.hud.setVisible(to === 'playing' || to === 'paused');
  }

  dispose(): void {
    for (const off of this.unsub) off();
    this.unsub.length = 0;
    this.hud.dispose();
    this.root.remove();
  }
}
