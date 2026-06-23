import { BALANCE } from '../config/balance';
import type { EventBus } from '../events/EventBus';
import type { GameEvents } from '../types/events';

/** Eine geplante Note (relativ zum Sequenz-Start). */
interface Note {
  freq: number;
  durMs: number;
  type?: OscillatorType;
  peak?: number; // Spitzen-Gain (vor masterGain), Default 0.3
  delayMs?: number; // Versatz ab Sequenz-Start
  freqEnd?: number; // Glide-Ziel über die Dauer
}

type SoundName =
  | 'cast'
  | 'hook'
  | 'perfect'
  | 'fail'
  | 'reel'
  | 'reward'
  | 'rewardSparkle'
  | 'roundEnd'
  | 'lowTick';

// Sound-Definitionen als Daten (kein Logik-Magic — Präzedenz: RARITY_DEFS / tips.ts
// liegen ebenfalls außerhalb balance.ts). Helle Chiptune-Stimmung (square/triangle).
const SOUNDS: Record<SoundName, Note[]> = {
  cast: [{ freq: 300, freqEnd: 620, durMs: 90, type: 'square', peak: 0.22 }],
  hook: [
    { freq: 440, durMs: 70, type: 'square', peak: 0.28 },
    { freq: 660, durMs: 100, delayMs: 65, type: 'square', peak: 0.28 },
  ],
  perfect: [
    { freq: 523, durMs: 75, type: 'triangle', peak: 0.3 },
    { freq: 659, durMs: 75, delayMs: 70, type: 'triangle', peak: 0.3 },
    { freq: 784, durMs: 75, delayMs: 140, type: 'triangle', peak: 0.3 },
    { freq: 1047, durMs: 150, delayMs: 210, type: 'triangle', peak: 0.32 },
  ],
  fail: [{ freq: 300, freqEnd: 110, durMs: 240, type: 'sawtooth', peak: 0.22 }],
  reel: [{ freq: 240, freqEnd: 400, durMs: 90, type: 'triangle', peak: 0.26 }],
  reward: [
    { freq: 988, durMs: 80, type: 'square', peak: 0.3 },
    { freq: 1319, durMs: 170, delayMs: 80, type: 'square', peak: 0.3 },
  ],
  rewardSparkle: [{ freq: 1760, durMs: 180, delayMs: 250, type: 'triangle', peak: 0.26 }],
  roundEnd: [
    { freq: 523, durMs: 110, type: 'triangle', peak: 0.3 },
    { freq: 659, durMs: 110, delayMs: 110, type: 'triangle', peak: 0.3 },
    { freq: 784, durMs: 260, delayMs: 220, type: 'triangle', peak: 0.32 },
  ],
  lowTick: [{ freq: 880, durMs: 60, type: 'square', peak: 0.18 }],
};

/**
 * Prozeduraler WebAudio-Synth (keine Assets — Töne aus Oszillatoren, wie alle
 * Welt-Meshes aus Primitives). Spielt kurze Chiptune-Sounds auf EventBus-Events.
 *
 * Autoplay-Policy: Der `AudioContext` wird erst bei der ERSTEN Nutzergeste
 * erzeugt/resumed (einmaliger window-Listener → `audio:unlocked`). Davor sind
 * alle Sounds No-ops (headless/SSR-sicher, kein Crash ohne Geste).
 *
 * Mute läuft über `audio:muteChanged` (Single Source of Truth): MuteButton
 * emittiert, hier wird der Master-Gain auf 0 geschaltet (Kontext bleibt offen).
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private lastTickSec = -1; // Low-Time-Tick: nur bei Sekundenwechsel
  private readonly unsub: Array<() => void> = [];

  constructor(private readonly bus: EventBus<GameEvents>) {
    // Lazy-Unlock bei erster Geste (Pointer/Touch/Taste).
    window.addEventListener('pointerdown', this.unlock);
    window.addEventListener('keydown', this.unlock);
    window.addEventListener('touchstart', this.unlock);

    this.unsub.push(this.bus.on('audio:muteChanged', (e) => this.setMuted(e.muted)));
    this.unsub.push(this.bus.on('hook:cast', () => this.play('cast')));
    this.unsub.push(
      this.bus.on('hook:result', (e) => {
        if (!e.hit) this.play('fail');
        else if (e.perfect) this.play('perfect');
        else this.play('hook');
      }),
    );
    this.unsub.push(this.bus.on('duck:landed', () => this.play('reel')));
    this.unsub.push(
      this.bus.on('reward:granted', (e) => {
        this.play('reward');
        if (e.isNewTip) this.play('rewardSparkle');
      }),
    );
    this.unsub.push(this.bus.on('round:ended', () => this.play('roundEnd')));
    this.unsub.push(this.bus.on('round:tick', (e) => this.onTick(e.timeRemaining)));
  }

  private setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : BALANCE.audio.masterGain;
  }

  private onTick(timeRemaining: number): void {
    const sec = Math.ceil(timeRemaining);
    if (sec > BALANCE.round.lowTimeWarnSec || sec <= 0) {
      this.lastTickSec = -1; // außerhalb der Warnzone wieder scharf stellen
      return;
    }
    if (sec === this.lastTickSec) return;
    this.lastTickSec = sec;
    this.play('lowTick');
  }

  /** Erste Nutzergeste: Kontext anlegen/resumen, Listener entfernen, melden. */
  private readonly unlock = (): void => {
    window.removeEventListener('pointerdown', this.unlock);
    window.removeEventListener('keydown', this.unlock);
    window.removeEventListener('touchstart', this.unlock);

    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return; // WebAudio nicht verfügbar → still bleiben (kein Crash)
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : BALANCE.audio.masterGain;
      this.master.connect(this.ctx.destination);
      void this.ctx.resume();
      this.bus.emit('audio:unlocked', {});
    } catch {
      this.ctx = null;
      this.master = null;
    }
  };

  private play(name: SoundName): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || this.muted) return; // gemutet/gesperrt → nichts planen
    const now = ctx.currentTime;
    for (const n of SOUNDS[name]) {
      const start = now + (n.delayMs ?? 0) / 1000;
      const dur = n.durMs / 1000;
      const peak = n.peak ?? 0.3;
      const osc = ctx.createOscillator();
      osc.type = n.type ?? 'square';
      osc.frequency.setValueAtTime(n.freq, start);
      if (n.freqEnd !== undefined) osc.frequency.linearRampToValueAtTime(n.freqEnd, start + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(peak, start + 0.008); // kurzer Attack
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur); // Decay
      osc.connect(g);
      g.connect(master);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    }
  }

  dispose(): void {
    window.removeEventListener('pointerdown', this.unlock);
    window.removeEventListener('keydown', this.unlock);
    window.removeEventListener('touchstart', this.unlock);
    for (const off of this.unsub) off();
    this.unsub.length = 0;
    if (this.ctx) void this.ctx.close();
    this.ctx = null;
    this.master = null;
  }
}
