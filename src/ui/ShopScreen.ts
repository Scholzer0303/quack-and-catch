import { RODS, UPGRADES } from '../data/rods';
import type { EventBus } from '../events/EventBus';
import type { Economy } from '../systems/Economy';
import type { GameEvents } from '../types/events';
import type { Rod, RodStats, Upgrade } from '../types/domain';

/** Stat → kurzes Chip-Label (nur sinnvolle/abweichende Werte zeigen). */
function statChips(stats: RodStats): string[] {
  const chips: string[] = [`🪢 Stärke ${stats.lineStrength}`];
  const pct = (mul: number): string => `+${Math.round((mul - 1) * 100)} %`;
  if (stats.reach > 1) chips.push(`🎯 Reichweite ${pct(stats.reach)}`);
  if (stats.castSpeed > 1) chips.push(`⏬ Auswurf ${pct(stats.castSpeed)}`);
  if (stats.reelSpeed > 1) chips.push(`🎣 Einholen ${pct(stats.reelSpeed)}`);
  if (stats.luck > 0) chips.push(`🍀 Glück +${Math.round(stats.luck * 100)} %`);
  if (stats.magnetRadius > 0) chips.push('🧲 Magnet');
  return chips;
}

/** Upgrade-Delta → Chip-Label. */
function upgradeChips(apply: Partial<RodStats>): string[] {
  const chips: string[] = [];
  if (apply.lineStrength) chips.push(`🪢 +${apply.lineStrength} Stärke`);
  if (apply.reelSpeed) chips.push(`🎣 +${Math.round(apply.reelSpeed * 100)} % Einholen`);
  if (apply.castSpeed) chips.push(`⏬ +${Math.round(apply.castSpeed * 100)} % Auswurf`);
  if (apply.reach) chips.push(`🎯 +${Math.round(apply.reach * 100)} % Reichweite`);
  if (apply.luck) chips.push(`🍀 +${Math.round(apply.luck * 100)} % Glück`);
  if (apply.magnetRadius) chips.push('🧲 +Magnet');
  return chips;
}

/**
 * Upgrade-Shop (Phase `shop`): Ruten kaufen/ausrüsten + stapelbare Upgrades.
 * Liest live aus `economy`, rendert bei `economy:changed` neu (deckt Kauf/Equip/
 * Upgrade ab). Lifecycle spiegelt CodexScreen; Sichtbarkeit steuert UIRoot,
 * `onClose` führt zur Quelle (Intro/Summary) zurück.
 */
export class ShopScreen {
  private readonly overlay: HTMLDivElement;
  private readonly unsub: () => void;
  private readonly onKeyDown: (e: KeyboardEvent) => void;

  constructor(
    parent: HTMLElement,
    bus: EventBus<GameEvents>,
    private readonly economy: Economy,
    private readonly onClose: () => void,
  ) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'qc-shop-overlay';
    this.overlay.hidden = true;
    parent.appendChild(this.overlay);

    this.unsub = bus.on('economy:changed', () => {
      if (!this.overlay.hidden) this.render();
    });

    this.onKeyDown = (e) => {
      if (e.key === 'Escape' && !this.overlay.hidden) this.onClose();
    };
  }

  private render(): void {
    const screen = document.createElement('div');
    screen.className = 'qc-shop';
    screen.append(
      this.renderHeader(),
      this.renderSection('Ruten', RODS.map((r) => this.renderRod(r))),
      this.renderSection(
        'Upgrades',
        UPGRADES.map((u) => this.renderUpgrade(u)),
      ),
    );
    this.overlay.replaceChildren(screen);
  }

  private renderHeader(): HTMLElement {
    const head = document.createElement('div');
    head.className = 'qc-shop-head';

    const title = document.createElement('h1');
    title.className = 'qc-title';
    title.textContent = 'Angel-Shop';

    const tokens = document.createElement('span');
    tokens.className = 'qc-shop-tokens';
    tokens.textContent = `🪙 ${this.economy.getTokens()}`;

    const close = document.createElement('button');
    close.className = 'qc-btn qc-btn-ghost';
    close.type = 'button';
    close.textContent = 'Zurück';
    close.addEventListener('click', () => this.onClose());

    head.append(title, tokens, close);
    return head;
  }

  private renderSection(label: string, cards: HTMLElement[]): HTMLElement {
    const section = document.createElement('div');
    section.className = 'qc-shop-section';

    const heading = document.createElement('h2');
    heading.className = 'qc-shop-heading';
    heading.textContent = label;

    const grid = document.createElement('div');
    grid.className = 'qc-shop-grid';
    grid.append(...cards);

    section.append(heading, grid);
    return section;
  }

  private renderRod(rod: Rod): HTMLElement {
    const owned = this.economy.owns(rod.id);
    const equipped = this.economy.isEquipped(rod.id);
    const card = this.makeCard(rod.name, rod.description, statChips(rod.stats));
    card.dataset.state = equipped ? 'equipped' : owned ? 'owned' : 'shop';

    const action = document.createElement('button');
    action.className = 'qc-btn qc-shop-buy';
    action.type = 'button';
    if (equipped) {
      action.textContent = '✓ Ausgerüstet';
      action.disabled = true;
    } else if (owned) {
      action.textContent = 'Ausrüsten';
      action.addEventListener('click', () => this.economy.equipRod(rod.id));
    } else {
      action.textContent = `Kaufen · 🪙 ${rod.price}`;
      action.disabled = !this.economy.canAfford(rod.price);
      action.addEventListener('click', () => this.economy.buyRod(rod.id));
    }
    card.appendChild(action);
    return card;
  }

  private renderUpgrade(up: Upgrade): HTMLElement {
    const stacks = this.economy.getStacks(up.id);
    const maxed = stacks >= up.maxStacks;
    const card = this.makeCard(up.name, up.description, upgradeChips(up.apply));
    card.dataset.state = maxed ? 'owned' : 'shop';

    const meta = document.createElement('div');
    meta.className = 'qc-shop-stacks';
    meta.textContent = `Stufe ${stacks} / ${up.maxStacks}`;
    card.appendChild(meta);

    const action = document.createElement('button');
    action.className = 'qc-btn qc-shop-buy';
    action.type = 'button';
    if (maxed) {
      action.textContent = '✓ Maximal';
      action.disabled = true;
    } else {
      action.textContent = `Kaufen · 🪙 ${up.price}`;
      action.disabled = !this.economy.canAfford(up.price);
      action.addEventListener('click', () => this.economy.buyUpgrade(up.id));
    }
    card.appendChild(action);
    return card;
  }

  /** Gemeinsames Kartengerüst: Titel, Beschreibung, Stat-Chips. */
  private makeCard(name: string, description: string, chips: string[]): HTMLDivElement {
    const card = document.createElement('div');
    card.className = 'qc-shop-card';

    const title = document.createElement('div');
    title.className = 'qc-shop-card-title';
    title.textContent = name;

    const desc = document.createElement('p');
    desc.className = 'qc-shop-card-desc';
    desc.textContent = description;

    const chipRow = document.createElement('div');
    chipRow.className = 'qc-shop-chips';
    for (const c of chips) {
      const chip = document.createElement('span');
      chip.className = 'qc-chip is-static';
      chip.textContent = c;
      chipRow.appendChild(chip);
    }

    card.append(title, desc, chipRow);
    return card;
  }

  setVisible(visible: boolean): void {
    if (visible === !this.overlay.hidden) return;
    if (visible) {
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
