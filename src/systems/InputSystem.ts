import { clamp } from '../utils/math';

/**
 * Vereinheitlicht Maus/Touch/Pen über Pointer Events. Liefert das Aim als
 * normalisierte Pointer-Position [-1,1] (relativ zur Canvas-Mitte) und
 * press/release/cancel als Callbacks. Kein Pointer-Lock (kein Softlock-Risiko).
 */
export interface InputHandlers {
  onAim?: (aimX: number, aimY: number) => void;
  onPress?: (aimX: number, aimY: number) => void;
  onRelease?: () => void;
  /** Verlorener Pointer/Fokus → Hold sicher auflösen (kein hängender Charge). */
  onCancel?: () => void;
}

export class InputSystem {
  private aimX = 0;
  private aimY = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly handlers: InputHandlers,
  ) {
    // Touch-Gesten (Scroll/Zoom) unterbinden, damit Halten sauber funktioniert.
    this.canvas.style.touchAction = 'none';
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerCancel);
    canvas.addEventListener('lostpointercapture', this.onPointerCancel);
    window.addEventListener('blur', this.onPointerCancel);
  }

  private updateAim(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const halfW = rect.width / 2;
    const halfH = rect.height / 2;
    this.aimX = clamp((e.clientX - (rect.left + halfW)) / halfW, -1, 1);
    // Bildschirm-Y zeigt nach unten → invertieren, damit oben = Blick nach oben.
    this.aimY = clamp(-(e.clientY - (rect.top + halfH)) / halfH, -1, 1);
  }

  private readonly onPointerMove = (e: PointerEvent): void => {
    this.updateAim(e);
    this.handlers.onAim?.(this.aimX, this.aimY);
  };

  private readonly onPointerDown = (e: PointerEvent): void => {
    e.preventDefault();
    this.updateAim(e);
    // Capture: pointerup erreicht uns auch außerhalb der Canvas (Softlock-Schutz).
    this.canvas.setPointerCapture(e.pointerId);
    this.handlers.onAim?.(this.aimX, this.aimY);
    this.handlers.onPress?.(this.aimX, this.aimY);
  };

  private readonly onPointerUp = (): void => {
    this.handlers.onRelease?.();
  };

  private readonly onPointerCancel = (): void => {
    this.handlers.onCancel?.();
  };

  dispose(): void {
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel);
    this.canvas.removeEventListener('lostpointercapture', this.onPointerCancel);
    window.removeEventListener('blur', this.onPointerCancel);
  }
}
