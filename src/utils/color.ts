/** Hex-Zahl (0xRRGGBB) → CSS-Farbe `#rrggbb`. Gemeinsame Quelle für UI-Theming. */
export function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
