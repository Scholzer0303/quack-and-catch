import { BALANCE } from '../config/balance';
import type { RodView } from '../systems/FishingRod';

/**
 * 2D-Overlay über dem Three-Canvas: zentriertes Fadenkreuz + Timing-Feedback
 * fürs Halten-Modell (Cast-Ring → Window-Bogen mit Perfect-Band + Marker).
 * Erstes ui/-File; M3 (UIRoot) faltet es ein. Wird pro Frame aus RodView gespeist.
 */
const PERFECT_FRAC = BALANCE.hook.perfectWindowMs / BALANCE.hook.baseWindowMs;
const RING_R = 34; // px
const ARC_START = -Math.PI * 0.7;
const ARC_SPAN = Math.PI * 1.4;

export class Reticle {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private dpr = 1;

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

  render(view: RodView): void {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;

    let color = 'rgba(255,255,255,0.5)';
    if (view.state === 'idle' && view.hasTarget) color = '#5cf2a0';
    else if (view.state === 'cooldown') color = 'rgba(255,255,255,0.22)';
    this.drawCrosshair(cx, cy, color);

    if (view.state === 'casting') this.drawCastRing(cx, cy, view.castProgress);
    else if (view.state === 'window') this.drawWindow(cx, cy, view.windowProgress, view.inPerfect);
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

  private drawCastRing(cx: number, cy: number, p: number): void {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, RING_R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
    ctx.stroke();
  }

  private drawWindow(cx: number, cy: number, p: number, inPerfect: boolean): void {
    const ctx = this.ctx;
    ctx.lineCap = 'round';
    ctx.lineWidth = 4;

    // Window-Bogen (grün) = fangbar.
    ctx.strokeStyle = 'rgba(92,242,160,0.7)';
    ctx.beginPath();
    ctx.arc(cx, cy, RING_R, ARC_START, ARC_START + ARC_SPAN);
    ctx.stroke();

    // Perfect-Band (gold), zentriert.
    const pStart = ARC_START + ARC_SPAN * (0.5 - PERFECT_FRAC / 2);
    ctx.strokeStyle = '#ffcf3f';
    ctx.beginPath();
    ctx.arc(cx, cy, RING_R, pStart, pStart + ARC_SPAN * PERFECT_FRAC);
    ctx.stroke();

    // Marker an aktueller Window-Position → im Gold loslassen = Perfect.
    const a = ARC_START + ARC_SPAN * p;
    ctx.fillStyle = inPerfect ? '#ffcf3f' : '#ffffff';
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * RING_R, cy + Math.sin(a) * RING_R, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  dispose(): void {
    window.removeEventListener('resize', this.resize);
    this.canvas.remove();
  }
}
