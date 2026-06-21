// Einstiegspunkt. In M1 wird hier das Spiel (core/Game) gebootstrappt.
// Vorerst nur ein Lebenszeichen, damit das Setup verifizierbar ist.

const app = document.querySelector<HTMLDivElement>('#app');

if (app) {
  app.textContent = 'Quack & Catch — Setup OK. Das Spiel folgt in Meilenstein 1 …';
}
