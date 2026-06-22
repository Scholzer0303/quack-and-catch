/**
 * Einmal-Abfrage der Bewegungs-Präferenz. Juice-Effekte rufen das im Konstruktor
 * und cachen das Ergebnis — bei `true` werden Animationen übersprungen
 * (Accessibility). Kein Live-Listener: ein Reload liest neu, genau wie die
 * `prefers-reduced-motion`-Media-Query in styles.css.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
