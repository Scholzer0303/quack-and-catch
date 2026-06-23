import { BALANCE } from '../config/balance';

/**
 * Kurze, nicht-blockierende Hinweis-Einblendung (z. B. „Linie gerissen — bessere
 * Rute"). Ein DOM-Element über dem Canvas, rein informativ (`pointer-events:none`).
 * `show(text)` blendet ein und nach `BALANCE.ui.toastMs` wieder aus; ein erneuter
 * `show()` setzt den Timer zurück (kein Flackern bei schneller Wiederholung).
 * Ein-/Ausblend-Optik liegt in styles.css (reduced-motion dort gated).
 */
export class Toast {
  private readonly el: HTMLDivElement;
  private timer: number | null = null;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'qc-toast';
    this.el.setAttribute('role', 'status');
    this.el.setAttribute('aria-live', 'polite');
    parent.appendChild(this.el);
  }

  show(text: string): void {
    this.el.textContent = text;
    this.el.classList.add('qc-toast-show');
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.el.classList.remove('qc-toast-show');
      this.timer = null;
    }, BALANCE.ui.toastMs);
  }

  dispose(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    this.el.remove();
  }
}
