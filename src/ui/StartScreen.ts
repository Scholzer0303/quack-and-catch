/**
 * Startbildschirm: Titel, kurzer Steuerungs-Hinweis, Start-Button.
 * Liegt als Overlay über der (bereits lebendigen) Szene. Sichtbarkeit steuert
 * UIRoot via `phase:changed`; der Button meldet den Start per Callback.
 */
export class StartScreen {
  private readonly overlay: HTMLDivElement;

  constructor(parent: HTMLElement, onStart: () => void) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'qc-overlay';

    const screen = document.createElement('div');
    screen.className = 'qc-screen';

    const title = document.createElement('h1');
    title.className = 'qc-title';
    title.textContent = '🦆 Quack & Catch';

    const sub = document.createElement('p');
    sub.className = 'qc-subtitle';
    sub.textContent =
      'Ziele mit Maus oder Finger. Halte gedrückt zum Auswerfen und lass im richtigen Moment los, um eine Ente zu haken — im goldenen Ring gibt es einen Perfect-Bonus. Seltene Enten bringen mehr Tokens und bessere Tipps!';

    const btn = document.createElement('button');
    btn.className = 'qc-btn';
    btn.type = 'button';
    btn.textContent = 'Start';
    btn.addEventListener('click', onStart);

    screen.append(title, sub, btn);
    this.overlay.appendChild(screen);
    parent.appendChild(this.overlay);
  }

  setVisible(visible: boolean): void {
    this.overlay.hidden = !visible;
  }

  dispose(): void {
    this.overlay.remove();
  }
}
