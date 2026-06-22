import { BALANCE } from '../config/balance';
import { RARITY_DEFS } from '../data/ducks';
import type { EventBus } from '../events/EventBus';
import { prefersReducedMotion } from '../fx/reducedMotion';
import type { GameEvents } from '../types/events';
import type { DuckRarity } from '../types/domain';
import { clamp, lerp } from '../utils/math';

/** Hex-Zahl → CSS-Farbe (#rrggbb). */
function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/**
 * Belohnungs-Modal beim Fang: zeigt Tokens + Tipp-Karte mit Rarität-Theming
 * (Akzent-Glow via `data-rarity` + `--qc-accent`), Emoji-Medaillon, animiertem
 * Token-Count-up und „Neu!"-Badge. Blockierend — der „Weiter"-Button meldet das
 * Fortsetzen per Callback (Game setzt die Runde aus paused fort). Reagiert auf
 * `reward:granted`.
 */
export class CardReveal {
  private readonly overlay: HTMLDivElement;
  private readonly unsub: () => void;
  private readonly reduced = prefersReducedMotion(); // einmal cachen (wie HUD/Reticle)
  private raf = 0; // laufender Count-up-Frame (0 = keiner)

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
    this.stopCountUp();

    const rarity: DuckRarity | null = e.tip ? e.tip.tier : null;
    const accent = rarity ? hex(RARITY_DEFS[rarity].bodyColor) : 'var(--qc-gold)';

    const card = document.createElement('div');
    card.className = 'qc-card';
    card.dataset.rarity = rarity ?? 'token';
    card.style.setProperty('--qc-accent', accent);

    const head = document.createElement('div');
    head.className = 'qc-card-head';
    if (rarity) {
      const rar = document.createElement('span');
      rar.className = 'qc-rarity';
      rar.textContent = rarity.toUpperCase();
      head.appendChild(rar);
    }
    const gain = document.createElement('span');
    gain.className = 'qc-tokens-gain';
    head.appendChild(gain);
    card.appendChild(head);

    const medal = document.createElement('div');
    medal.className = 'qc-card-medal';
    medal.textContent = e.tip ? e.tip.icon : '🎣';
    card.appendChild(medal);

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

    this.startCountUp(gain, e.tokens);
  }

  /** Token-Gain von +0 auf +tokens hochzählen (rAF). reduced-motion → sofort. */
  private startCountUp(el: HTMLElement, tokens: number): void {
    if (this.reduced || tokens <= 0) {
      el.textContent = `+${tokens} 🪙`;
      return;
    }
    el.textContent = '+0 🪙'; // sofort sichtbar, bevor der erste Frame zählt
    const dur = BALANCE.juice.hud.countUpMs;
    let start = -1;
    const step = (ts: number): void => {
      if (start < 0) start = ts;
      const t = clamp((ts - start) / dur, 0, 1);
      el.textContent = `+${Math.round(lerp(0, tokens, t))} 🪙`;
      this.raf = t < 1 ? requestAnimationFrame(step) : 0;
    };
    this.raf = requestAnimationFrame(step);
  }

  private stopCountUp(): void {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  private dismiss(): void {
    this.stopCountUp();
    this.overlay.hidden = true;
    this.overlay.replaceChildren();
    this.onResume();
  }

  dispose(): void {
    this.stopCountUp();
    this.unsub();
    this.overlay.remove();
  }
}
