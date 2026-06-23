import type { EventBus } from '../events/EventBus';
import type { GameEvents } from '../types/events';

/**
 * Persistenter Stummschalt-Button (🔊/🔇) oben rechts — in ALLEN Phasen sichtbar
 * (kein phase:changed-Gating). Klick emittiert `audio:muteChanged` (Single Source
 * of Truth); das Icon folgt dem Event (auch dem Lade-Emit beim Boot), nie dem
 * lokalen Klick-Zustand allein.
 */
export class MuteButton {
  private readonly el: HTMLButtonElement;
  private muted = false;
  private readonly unsub: () => void;

  constructor(parent: HTMLElement, bus: EventBus<GameEvents>) {
    this.el = document.createElement('button');
    this.el.className = 'qc-mute';
    this.el.type = 'button';
    this.render();
    this.el.addEventListener('click', () => bus.emit('audio:muteChanged', { muted: !this.muted }));
    parent.appendChild(this.el);

    this.unsub = bus.on('audio:muteChanged', (e) => {
      this.muted = e.muted;
      this.render();
    });
  }

  private render(): void {
    this.el.textContent = this.muted ? '🔇' : '🔊';
    this.el.setAttribute('aria-label', this.muted ? 'Ton einschalten' : 'Ton ausschalten');
    this.el.setAttribute('aria-pressed', String(this.muted));
  }

  dispose(): void {
    this.unsub();
    this.el.remove();
  }
}
