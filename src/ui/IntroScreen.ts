/**
 * Intro-Storyboard (Phase `start`): kurze Comic-Sequenz am Jahrmarkt —
 * Bude → Ticket an die Verkäuferin → Angel in der Hand → los. Rein DOM/CSS
 * als Overlay über der bereits lebendigen Szene. „Weiter" steppt durch die
 * Schritte, der letzte Schritt + „Überspringen" starten die Runde (`onStart`).
 * Sichtbarkeit steuert UIRoot via `phase:changed` (sichtbar bei `start`).
 */

interface IntroStep {
  /** Emoji-Bühne: Figuren/Requisiten (HTML-frei, nur Emoji-Strings). */
  build: (scene: HTMLDivElement) => void;
  title?: string;
  text: string;
  cta: string;
}

/** Kleiner DOM-Helfer: Element mit Klasse + optionalem Text. */
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const STEPS: readonly IntroStep[] = [
  {
    build: (scene) => scene.append(el('div', 'qc-intro-booth', '🎪')),
    title: '🦆 Quack & Catch',
    text: 'Willkommen am Enten-Angel-Stand auf dem Jahrmarkt! Schnapp dir so viele Enten wie möglich — jede bringt Tokens und einen echten Claude-Tipp.',
    cta: 'Weiter',
  },
  {
    build: (scene) => {
      scene.append(
        el('div', 'qc-intro-prop qc-intro-ticket', '🎟️'),
        el('div', 'qc-intro-figure', '🧑‍🦰'),
        el('div', 'qc-intro-speech', 'Ein Ticket, bitte!'),
      );
    },
    text: 'Du reichst dein Ticket über den Tresen.',
    cta: 'Weiter',
  },
  {
    build: (scene) => {
      scene.append(
        el('div', 'qc-intro-figure', '🧑‍🦰'),
        el('div', 'qc-intro-prop qc-intro-rod', '🎣'),
        el('div', 'qc-intro-speech', 'Viel Glück — und ruhige Hand!'),
      );
    },
    text: 'Ziele mit Maus oder Finger. Halte gedrückt zum Auswerfen und lass im richtigen Moment los, um eine Ente zu haken — im goldenen Ring gibt es einen Perfect-Bonus. Seltene Enten bringen mehr Tokens und bessere Tipps!',
    cta: "Los geht's!",
  },
];

export class IntroScreen {
  private readonly overlay: HTMLDivElement;
  private readonly card: HTMLDivElement;
  private step = 0;

  constructor(
    parent: HTMLElement,
    private readonly onStart: () => void,
    private readonly onOpenCodex?: () => void,
  ) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'qc-overlay';

    this.card = el('div', 'qc-screen qc-intro');
    this.overlay.appendChild(this.card);

    const skip = el('button', 'qc-intro-skip', 'Überspringen ⏭');
    skip.type = 'button';
    // Springt zum letzten Schritt (Steuerungs-Hinweis), nicht direkt ins Spiel —
    // sonst sähe ein Erststarter die Fang-Steuerung nie (wie die alte StartScreen,
    // die Hinweis + Start zwingend auf einem Screen führte).
    skip.addEventListener('click', () => this.skipToControls());
    this.overlay.appendChild(skip);

    parent.appendChild(this.overlay);
    this.render();
  }

  private render(): void {
    const def = STEPS[this.step]!;
    this.card.dataset.step = String(this.step);

    const scene = el('div', 'qc-intro-scene');
    def.build(scene);

    const nodes: HTMLElement[] = [scene];
    if (def.title) nodes.push(el('h1', 'qc-title', def.title));
    nodes.push(el('p', 'qc-subtitle', def.text));

    const dots = el('div', 'qc-intro-dots');
    for (let i = 0; i < STEPS.length; i++) {
      dots.appendChild(el('span', i === this.step ? 'qc-dot qc-dot-on' : 'qc-dot'));
    }
    nodes.push(dots);

    const btn = el('button', 'qc-btn', def.cta);
    btn.type = 'button';
    btn.addEventListener('click', () => this.advance());
    nodes.push(btn);

    // Letzter Schritt: optionaler Einstieg in den Tipp-Codex (vor dem Spiel stöbern).
    if (this.onOpenCodex && this.step === STEPS.length - 1) {
      const codex = el('button', 'qc-btn qc-btn-ghost', '📖 Tipp-Codex');
      codex.type = 'button';
      codex.addEventListener('click', () => this.onOpenCodex!());
      nodes.push(codex);
    }

    this.card.replaceChildren(...nodes);
  }

  private advance(): void {
    if (this.step < STEPS.length - 1) {
      this.step += 1;
      this.render();
    } else {
      this.onStart();
    }
  }

  /** „Überspringen" → direkt zum letzten Schritt (Steuerungs-Hinweis + Start). */
  private skipToControls(): void {
    if (this.step !== STEPS.length - 1) {
      this.step = STEPS.length - 1;
      this.render();
    }
  }

  setVisible(visible: boolean): void {
    // Reines Sichtbarkeits-Toggle ohne Re-Render: `step` bleibt erhalten. Seit M5
    // kann die Phase aus `codex` nach `start` zurückkehren → Intro wird dann erneut
    // gezeigt (am letzten Step, Start- + Codex-Button da). Bewusst kein Step-Reset.
    this.overlay.hidden = !visible;
  }

  dispose(): void {
    this.overlay.remove();
  }
}
