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

  constructor(
    parent: HTMLElement,
    bus: EventBus<GameEvents>,
    onRestart: () => void,
    private readonly onOpenCodex?: () => void,
    private readonly onOpenShop?: () => void,
  ) {
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
    // Rendert aus `highscore:changed` (folgt unmittelbar auf `round:ended`): trägt
    // Punktzahl + aktuellen Rekord + ob er gerade gebrochen wurde.
    this.unsub.push(bus.on('highscore:changed', (e) => this.render(e, onRestart)));
  }

  private render(e: GameEvents['highscore:changed'], onRestart: () => void): void {
    const title = document.createElement('h1');
    title.className = 'qc-title';
    title.textContent = e.isNewRecord ? '🏆 Neuer Rekord!' : 'Runde vorbei';

    const scoreEl = document.createElement('div');
    scoreEl.className = 'qc-score-big';
    scoreEl.textContent = String(e.score);

    const sub = document.createElement('p');
    sub.className = 'qc-subtitle';
    const n = this.collected.length;
    sub.textContent = n > 0 ? `${n} Tipp${n === 1 ? '' : 's'} gesammelt` : 'Punkte';

    // Rekord-Zeile: bei neuem Rekord bestätigend, sonst der zu schlagende Bestwert.
    const record = document.createElement('p');
    record.className = 'qc-record';
    record.textContent = e.isNewRecord
      ? `🏆 Bestwert: ${e.highScore}`
      : `Rekord: ${e.highScore} — schlag ihn!`;

    const nodes: HTMLElement[] = [title, scoreEl, sub, record];

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

    if (this.onOpenShop) {
      const shop = document.createElement('button');
      shop.className = 'qc-btn qc-btn-ghost';
      shop.type = 'button';
      shop.textContent = '🎣 Angel-Shop';
      shop.addEventListener('click', this.onOpenShop);
      nodes.push(shop);
    }

    if (this.onOpenCodex) {
      const codex = document.createElement('button');
      codex.className = 'qc-btn qc-btn-ghost';
      codex.type = 'button';
      codex.textContent = '📖 Tipp-Codex';
      codex.addEventListener('click', this.onOpenCodex);
      nodes.push(codex);
    }

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
