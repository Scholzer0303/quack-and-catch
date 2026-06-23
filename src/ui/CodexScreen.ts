import { RARITY_DEFS } from '../data/ducks';
import { TIPS } from '../data/tips';
import type { EventBus } from '../events/EventBus';
import type { Economy } from '../systems/Economy';
import type { GameEvents } from '../types/events';
import { RARITY_ORDER, type DuckRarity, type Tip } from '../types/domain';
import { hex } from '../utils/color';

/** Reihenfolge der Tiers für stabile Sortierung (Basics → Geheimwissen). */
const TIER_ORDER: Record<DuckRarity, number> = Object.fromEntries(
  RARITY_ORDER.map((r, i) => [r, i]),
) as Record<DuckRarity, number>;

/** Kategorien in Erst-Auftritts-Reihenfolge aus TIPS (für die Filter-Chips). */
const CATEGORIES: readonly string[] = [...new Set(TIPS.map((t) => t.kategorie))];

/**
 * Tipp-Codex (Phase `codex`): durchblätterbares Grid aller Tipps. Freigeschaltete
 * zeigen Icon + Titel (Klick → Detail), gesperrte nur 🔒 + Tier-Farbe (kein Spoiler).
 * Kategorie-Filter + Fortschrittsanzeige. Liest live aus `TIPS` + `economy`, rendert
 * bei `economy:changed` neu. Sichtbarkeit steuert UIRoot; `onClose` führt zur Quelle zurück.
 */
export class CodexScreen {
  private readonly overlay: HTMLDivElement;
  private readonly unsub: () => void;
  private filter: string | null = null; // null = alle Kategorien
  private detail: Tip | null = null; // offene Detailkarte (null = Grid)
  private readonly onKeyDown: (e: KeyboardEvent) => void;

  constructor(
    parent: HTMLElement,
    bus: EventBus<GameEvents>,
    private readonly economy: Economy,
    private readonly onClose: () => void,
  ) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'qc-codex-overlay';
    this.overlay.hidden = true;
    parent.appendChild(this.overlay);

    this.unsub = bus.on('economy:changed', () => {
      if (!this.overlay.hidden) this.render();
    });

    // Esc: erst aus dem Detail zurück, sonst Codex schließen.
    this.onKeyDown = (e) => {
      if (e.key !== 'Escape' || this.overlay.hidden) return;
      if (this.detail) {
        this.detail = null;
        this.render();
      } else {
        this.onClose();
      }
    };
  }

  private render(): void {
    if (this.detail) {
      this.overlay.replaceChildren(this.renderDetail(this.detail));
      return;
    }
    const screen = document.createElement('div');
    screen.className = 'qc-codex';
    screen.append(this.renderHeader(), this.renderFilters(), this.renderGrid());
    this.overlay.replaceChildren(screen);
  }

  private renderHeader(): HTMLElement {
    const head = document.createElement('div');
    head.className = 'qc-codex-head';

    const title = document.createElement('h1');
    title.className = 'qc-title';
    title.textContent = 'Tipp-Codex';

    const unlocked = TIPS.reduce((n, t) => (this.economy.isUnlocked(t.id) ? n + 1 : n), 0);
    const progress = document.createElement('span');
    progress.className = 'qc-codex-progress';
    progress.textContent = `${unlocked} / ${TIPS.length} freigeschaltet`;

    const close = document.createElement('button');
    close.className = 'qc-btn qc-btn-ghost';
    close.type = 'button';
    close.textContent = 'Zurück';
    close.addEventListener('click', () => this.onClose());

    head.append(title, progress, close);
    return head;
  }

  private renderFilters(): HTMLElement {
    const bar = document.createElement('div');
    bar.className = 'qc-codex-filters';

    const makeChip = (label: string, value: string | null): HTMLButtonElement => {
      const chip = document.createElement('button');
      chip.className = 'qc-chip';
      chip.type = 'button';
      chip.textContent = label;
      if (this.filter === value) chip.classList.add('is-active');
      chip.addEventListener('click', () => {
        this.filter = value;
        this.render();
      });
      return chip;
    };

    bar.appendChild(makeChip('Alle', null));
    for (const cat of CATEGORIES) bar.appendChild(makeChip(cat, cat));
    return bar;
  }

  private renderGrid(): HTMLElement {
    const grid = document.createElement('div');
    grid.className = 'qc-codex-grid';

    const tips = [...TIPS]
      .filter((t) => this.filter === null || t.kategorie === this.filter)
      .sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);

    for (const tip of tips) grid.appendChild(this.renderCard(tip));
    return grid;
  }

  private renderCard(tip: Tip): HTMLElement {
    const unlocked = this.economy.isUnlocked(tip.id);
    const card = document.createElement('div');
    card.className = 'qc-codex-card';
    card.dataset.rarity = tip.tier;
    card.dataset.locked = unlocked ? 'false' : 'true';
    card.style.setProperty('--qc-accent', hex(RARITY_DEFS[tip.tier].bodyColor));

    const medal = document.createElement('div');
    medal.className = 'qc-codex-medal';
    medal.textContent = unlocked ? tip.icon : '🔒';
    card.appendChild(medal);

    if (unlocked) {
      const title = document.createElement('div');
      title.className = 'qc-codex-card-title';
      title.textContent = tip.titel;
      card.appendChild(title);
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      const open = (): void => {
        this.detail = tip;
        this.render();
      };
      card.addEventListener('click', open);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      });
    } else {
      const hint = document.createElement('div');
      hint.className = 'qc-codex-card-title qc-codex-locked';
      hint.textContent = 'Noch nicht gefangen';
      card.appendChild(hint);
    }
    return card;
  }

  private renderDetail(tip: Tip): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'qc-codex-detail';
    panel.dataset.rarity = tip.tier;
    panel.style.setProperty('--qc-accent', hex(RARITY_DEFS[tip.tier].bodyColor));

    const medal = document.createElement('div');
    medal.className = 'qc-card-medal';
    medal.textContent = tip.icon;

    const chips = document.createElement('div');
    chips.className = 'qc-codex-detail-chips';
    const rarity = document.createElement('span');
    rarity.className = 'qc-rarity';
    rarity.textContent = tip.tier.toUpperCase();
    const cat = document.createElement('span');
    cat.className = 'qc-chip is-static';
    cat.textContent = tip.kategorie;
    chips.append(rarity, cat);

    const title = document.createElement('h2');
    title.className = 'qc-card-title';
    title.textContent = tip.titel;

    const text = document.createElement('p');
    text.className = 'qc-card-text';
    text.textContent = tip.text;

    const back = document.createElement('button');
    back.className = 'qc-btn';
    back.type = 'button';
    back.textContent = 'Zurück zum Codex';
    back.addEventListener('click', () => {
      this.detail = null;
      this.render();
    });

    panel.append(medal, chips, title, text, back);
    return panel;
  }

  setVisible(visible: boolean): void {
    if (visible === !this.overlay.hidden) return;
    if (visible) {
      this.filter = null;
      this.detail = null;
      this.render();
      this.overlay.hidden = false;
      window.addEventListener('keydown', this.onKeyDown);
    } else {
      this.overlay.hidden = true;
      this.overlay.replaceChildren();
      window.removeEventListener('keydown', this.onKeyDown);
    }
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    this.unsub();
    this.overlay.remove();
  }
}
