/**
 * Pause-Menü (Phase `pausemenu`): vom Spieler über den Pause-Button (HUD) oder
 * ESC ausgelöst. „Weiter" setzt die Runde fort (Timer/Score bleiben), „Runde
 * beenden" wertet sie zur Zusammenfassung. Optional Shop/Codex-Einstieg (kehrt
 * reset-frei in die Pause zurück). Statisches DOM-Overlay (Muster SummaryScreen);
 * Sichtbarkeit steuert UIRoot.
 */
export class PauseScreen {
  private readonly overlay: HTMLDivElement;

  constructor(
    parent: HTMLElement,
    onResume: () => void,
    onEndRound: () => void,
    onOpenShop?: () => void,
    onOpenCodex?: () => void,
  ) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'qc-overlay';
    this.overlay.hidden = true;

    const screen = document.createElement('div');
    screen.className = 'qc-screen';

    const title = document.createElement('h1');
    title.className = 'qc-title';
    title.textContent = 'Pause';

    const sub = document.createElement('p');
    sub.className = 'qc-subtitle';
    sub.textContent = 'Kurz verschnauft — die Enten warten, bis du bereit bist.';

    const resume = document.createElement('button');
    resume.className = 'qc-btn';
    resume.type = 'button';
    resume.textContent = '▶ Weiter';
    resume.addEventListener('click', onResume);

    const nodes: HTMLElement[] = [title, sub, resume];

    if (onOpenShop) {
      const shop = document.createElement('button');
      shop.className = 'qc-btn qc-btn-ghost';
      shop.type = 'button';
      shop.textContent = '🎣 Angel-Shop';
      shop.addEventListener('click', onOpenShop);
      nodes.push(shop);
    }

    if (onOpenCodex) {
      const codex = document.createElement('button');
      codex.className = 'qc-btn qc-btn-ghost';
      codex.type = 'button';
      codex.textContent = '📖 Tipp-Codex';
      codex.addEventListener('click', onOpenCodex);
      nodes.push(codex);
    }

    const end = document.createElement('button');
    end.className = 'qc-btn qc-btn-ghost';
    end.type = 'button';
    end.textContent = '⏹ Runde beenden';
    end.addEventListener('click', onEndRound);
    nodes.push(end);

    screen.append(...nodes);
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
