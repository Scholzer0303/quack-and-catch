import { BALANCE } from '../config/balance';
import type { RodView } from '../systems/FishingRod';

/**
 * 2D-Overlay über dem Three-Canvas: Fadenkreuz am Zeiger (= Wasser-Zielpunkt).
 * Farbe signalisiert Fangbarkeit (neutral/grün/gold/cooldown); beim Halten zeigt
 * ein Ring den Haken-Senkfortschritt (dip). Wird pro Frame aus RodView gespeist.
 * Die eigentliche Drop-Zone liegt als 3D-Ring auf dem Wasser (FishingRod.highlight).
 */
const RING_R = 30; // px

export class Reticle {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private ndcX = 0; // Zeigerposition (NDC, x rechts/+1, y oben/+1)
  private ndcY = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    const s = this.canvas.style;
    s.position = 'fixed';
    s.inset = '0';
    s.width = '100%';
    s.height = '100%';
    s.pointerEvents = 'none';
    s.touchAction = 'none';
    s.zIndex = '10';

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Reticle: 2D-Context nicht verfügbar');
    this.ctx = ctx;

    document.body.appendChild(this.canvas);
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  private readonly resize = (): void => {
    this.dpr = Math.min(window.devicePixelRatio || 1, BALANCE.render.pixelRatioCap);
    this.canvas.width = Math.floor(window.innerWidth * this.dpr);
    this.canvas.height = Math.floor(window.innerHeight * this.dpr);
  };

  /** Zeigerposition setzen (NDC). Fadenkreuz folgt dem Zeiger. */
  setPointer(ndcX: number, ndcY: number): void {
    this.ndcX = ndcX;
    this.ndcY = ndcY;
  }

  render(view: RodView): void {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const cx = (this.ndcX * 0.5 + 0.5) * w;
    const cy = (0.5 - this.ndcY * 0.5) * h;

    const a = BALANCE.aim;
    let color = a.crosshairColorNoTarget;
    if (view.state === 'cooldown') color = a.crosshairColorCooldown;
    else if (view.inPerfect) color = '#ffcf3f';
    else if (view.hasTarget) color = a.crosshairColorTarget;

    if (view.state === 'lowering') this.drawDipRing(cx, cy, view.dip, color);
    this.drawCrosshair(cx, cy, color);
  }

  private drawCrosshair(cx: number, cy: number, color: string): void {
    const ctx = this.ctx;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    const gap = 6;
    const len = 10;
    ctx.beginPath();
    ctx.moveTo(cx - gap - len, cy);
    ctx.lineTo(cx - gap, cy);
    ctx.moveTo(cx + gap, cy);
    ctx.lineTo(cx + gap + len, cy);
    ctx.moveTo(cx, cy - gap - len);
    ctx.lineTo(cx, cy - gap);
    ctx.moveTo(cx, cy + gap);
    ctx.lineTo(cx, cy + gap + len);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Ring füllt sich mit dem Senkfortschritt (0→1) während des Haltens. */
  private drawDipRing(cx: number, cy: number, dip: number, color: string): void {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, RING_R, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, RING_R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * dip);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  dispose(): void {
    window.removeEventListener('resize', this.resize);
    this.canvas.remove();
  }
}
