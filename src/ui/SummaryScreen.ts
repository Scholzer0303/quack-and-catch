import type { EventBus } from '../events/EventBus';
import type { GameEvents } from '../types/events';
import type { Tip } from '../types/domain';

/**
 * Runden-Zusammenfassung: Endstand + in dieser Runde gesammelte Tipps +
 * „Nochmal spielen". Sammelt Tipps über `reward:granted`, leert sie bei
 * Rundenstart (`phase:changed` → playing) und rendert bei `round:ended`.
 * Sichtbarkeit steuert UIRoot.
 */
export class SummaryScreen {
  private readonly overlay: HTMLDivElement;
  private readonly screen: HTMLDivElement;
  private readonly collected: Tip[] = [];
  private readonly unsub: Array<() => void> = [];

  constructor(parent: HTMLElement, bus: EventBus<GameEvents>, onRestart: () => void) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'qc-overlay';
    this.overlay.hidden = true;
    this.screen = document.createElement('div');
    this.screen.className = 'qc-screen';
    this.overlay.appendChild(this.screen);
    parent.appendChild(this.overlay);

    this.unsub.push(
      bus.on('reward:granted', (e) => {
        if (e.tip) this.collected.push(e.tip);
      }),
    );
    this.unsub.push(
      bus.on('phase:changed', (e) => {
        // Nur eine FRISCHE Runde leert die Liste — Resume aus der Pause behält sie.
        if (e.to === 'playing' && e.from !== 'paused') this.collected.length = 0;
      }),
    );
    this.unsub.push(bus.on('round:ended', (e) => this.render(e.score, onRestart)));
  }

  private render(score: number, onRestart: () => void): void {
    const title = document.createElement('h1');
    title.className = 'qc-title';
    title.textContent = 'Runde vorbei';

    const scoreEl = document.createElement('div');
    scoreEl.className = 'qc-score-big';
    scoreEl.textContent = String(score);

    const sub = document.createElement('p');
    sub.className = 'qc-subtitle';
    const n = this.collected.length;
    sub.textContent = n > 0 ? `${n} Tipp${n === 1 ? '' : 's'} gesammelt` : 'Punkte';

    const nodes: HTMLElement[] = [title, scoreEl, sub];

    if (n > 0) {
      const list = document.createElement('ul');
      list.className = 'qc-tip-list';
      for (const tip of this.collected) {
        const li = document.createElement('li');
        const cat = document.createElement('span');
        cat.className = 'qc-tip-cat';
        cat.textContent = `${tip.tier} · ${tip.kategorie}`;
        li.appendChild(cat);
        li.append(`${tip.icon} ${tip.titel}`);
        list.appendChild(li);
      }
      nodes.push(list);
    } else {
      const empty = document.createElement('p');
      empty.className = 'qc-empty';
      empty.textContent = 'Diesmal kein neuer Tipp — fang mehr Enten!';
      nodes.push(empty);
    }

    const btn = document.createElement('button');
    btn.className = 'qc-btn';
    btn.type = 'button';
    btn.textContent = 'Nochmal spielen';
    btn.addEventListener('click', onRestart);
    nodes.push(btn);

    this.screen.replaceChildren(...nodes);
  }

  setVisible(visible: boolean): void {
    this.overlay.hidden = !visible;
  }

  dispose(): void {
    for (const off of this.unsub) off();
    this.unsub.length = 0;
    this.overlay.remove();
  }
}
