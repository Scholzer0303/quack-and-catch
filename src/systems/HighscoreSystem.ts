import type { EventBus } from '../events/EventBus';
import type { GameEvents } from '../types/events';

/**
 * Persistenter Rundenrekord (M9). Hält die beste Punktzahl in-memory (vom
 * SaveSystem via `hydrate` geladen) und wertet jede Runde am `round:ended` aus:
 * emittiert `highscore:changed` mit Punktzahl, aktuellem Rekord und ob er gerade
 * gebrochen wurde. SummaryScreen rendert daraus; SaveSystem persistiert bei einem
 * neuen Rekord. Reines Lese-/Vergleichsmodell — kein UI-, kein Storage-Wissen.
 */
export class HighscoreSystem {
  private highScore = 0;
  private readonly unsub: Array<() => void> = [];

  constructor(private readonly bus: EventBus<GameEvents>) {
    this.unsub.push(
      bus.on('round:ended', (e) => {
        const isNewRecord = e.score > this.highScore;
        if (isNewRecord) this.highScore = e.score;
        this.bus.emit('highscore:changed', { score: e.score, highScore: this.highScore, isNewRecord });
      }),
    );
  }

  /** Geladenen Rekord übernehmen (SaveSystem.load). Kein Emit nötig (nur am Rundenende sichtbar). */
  hydrate(highScore: number): void {
    this.highScore = highScore;
  }

  getHighScore(): number {
    return this.highScore;
  }

  dispose(): void {
    for (const off of this.unsub) off();
    this.unsub.length = 0;
  }
}
