import { BALANCE } from '../config/balance';

/** requestAnimationFrame-Loop mit geclamptem dt und Gesamtzeit. */
export class GameLoop {
  private rafId = 0;
  private last = 0;
  private running = false;
  private elapsed = 0;
  private readonly onTick: (dt: number, elapsed: number) => void;

  constructor(onTick: (dt: number, elapsed: number) => void) {
    this.onTick = onTick;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.rafId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private readonly frame = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min((now - this.last) / 1000, BALANCE.loop.maxDt);
    this.last = now;
    this.elapsed += dt;
    this.onTick(dt, this.elapsed);
    this.rafId = requestAnimationFrame(this.frame);
  };
}
