import { RARITY_DEFS } from '../data/ducks';
import type { EventBus } from '../events/EventBus';
import type { GameEvents } from '../types/events';
import type { DuckRarity } from '../types/domain';

/** Hex-Zahl → CSS-Farbe (#rrggbb). */
function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/**
 * Belohnungs-Modal beim Fang: zeigt Tokens + Tipp-Karte (Rarität-Farbrand,
 * „Neu!"-Badge). Blockierend — der „Weiter"-Button meldet das Fortsetzen per
 * Callback (Game setzt die Runde aus paused fort). Reagiert auf `reward:granted`.
 */
export class CardReveal {
  private readonly overlay: HTMLDivElement;
  private readonly unsub: () => void;

  constructor(
    parent: HTMLElement,
    bus: EventBus<GameEvents>,
    private readonly onResume: () => void,
  ) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'qc-overlay';
    this.overlay.hidden = true;
    parent.appendChild(this.overlay);

    this.unsub = bus.on('reward:granted', (e) => this.show(e));
  }

  private show(e: GameEvents['reward:granted']): void {
    const rarity: DuckRarity | null = e.tip ? e.tip.tier : null;
    const accent = rarity ? hex(RARITY_DEFS[rarity].bodyColor) : 'var(--qc-gold)';

    const card = document.createElement('div');
    card.className = 'qc-card';
    card.style.borderColor = accent;

    const head = document.createElement('div');
    head.className = 'qc-card-head';
    if (rarity) {
      const rar = document.createElement('span');
      rar.className = 'qc-rarity';
      rar.style.color = accent;
      rar.textContent = rarity.toUpperCase();
      head.appendChild(rar);
    }
    const gain = document.createElement('span');
    gain.className = 'qc-tokens-gain';
    gain.textContent = `+${e.tokens} 🪙`;
    head.appendChild(gain);
    card.appendChild(head);

    if (e.tip) {
      const title = document.createElement('h2');
      title.className = 'qc-card-title';
      title.textContent = e.tip.titel;
      if (e.isNewTip) {
        const badge = document.createElement('span');
        badge.className = 'qc-badge';
        badge.textContent = 'Neu!';
        title.appendChild(badge);
      }
      const cat = document.createElement('div');
      cat.className = 'qc-card-cat';
      cat.textContent = e.tip.kategorie;
      const text = document.createElement('p');
      text.className = 'qc-card-text';
      text.textContent = e.tip.text;
      card.append(title, cat, text);
    } else {
      const text = document.createElement('p');
      text.className = 'qc-card-text';
      text.textContent = 'Schöner Fang!';
      card.appendChild(text);
    }

    const btn = document.createElement('button');
    btn.className = 'qc-btn';
    btn.type = 'button';
    btn.textContent = 'Weiter';
    btn.addEventListener('click', () => this.dismiss());
    card.appendChild(btn);

    this.overlay.replaceChildren(card);
    this.overlay.hidden = false;
  }

  private dismiss(): void {
    this.overlay.hidden = true;
    this.overlay.replaceChildren();
    this.onResume();
  }

  dispose(): void {
    this.unsub();
    this.overlay.remove();
  }
}
