import { Game } from './core/Game';

const container = document.querySelector<HTMLDivElement>('#app');
if (!container) {
  throw new Error('#app-Container nicht gefunden');
}

try {
  const game = new Game(container);
  game.start();
} catch (err) {
  // Häufigste Ursache: kein/blockiertes WebGL. Statt Blank-Screen eine
  // verständliche Meldung zeigen (kein Softlock).
  console.error('Spielstart fehlgeschlagen:', err);
  container.replaceChildren();
  const box = document.createElement('div');
  box.className = 'fatal';
  const title = document.createElement('h1');
  title.textContent = '🦆 Quack & Catch';
  const msg = document.createElement('p');
  msg.textContent =
    'Dein Browser oder Gerät unterstützt kein WebGL (3D). Bitte aktiviere die Hardware-Beschleunigung oder nutze einen aktuellen Browser.';
  box.append(title, msg);
  container.append(box);
}
