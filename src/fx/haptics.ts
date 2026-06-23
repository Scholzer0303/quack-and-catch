import { prefersReducedMotion } from './reducedMotion';

/**
 * Mobile-Haptik (navigator.vibrate). No-op, wenn die API fehlt (Desktop) oder
 * der Nutzer reduzierte Bewegung bevorzugt. `vibrate()` darf laut Spec werfen,
 * wenn ohne vorherige Geste aufgerufen → in try/catch gekapselt.
 */
export function vibrate(pattern: number | number[]): void {
  if (prefersReducedMotion()) return;
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  if (typeof nav.vibrate !== 'function') return;
  try {
    nav.vibrate(pattern);
  } catch {
    // manche Browser werfen ohne User-Aktivierung — ignorieren
  }
}
