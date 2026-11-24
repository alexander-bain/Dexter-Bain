import type { GameSettings } from "../types";

type SoundName = "button" | "correct" | "wrong" | "coin" | "upgrade" | "portal" | "checkout";

const SOUNDS: Record<SoundName, [number, number, OscillatorType]> = {
  button: [420, 0.06, "sine"],
  correct: [740, 0.16, "sine"],
  wrong: [220, 0.18, "triangle"],
  coin: [980, 0.1, "square"],
  upgrade: [540, 0.28, "sine"],
  portal: [310, 0.35, "sine"],
  checkout: [820, 0.12, "square"]
};

export class AudioSystem {
  private context: AudioContext | null = null;
  private musicTimer = 0;

  constructor(private readonly settings: GameSettings) {}

  unlock(): void {
    if (!this.context) this.context = new AudioContext();
    if (this.context.state === "suspended") void this.context.resume();
  }

  play(name: SoundName): void {
    if (this.settings.muted || this.settings.sfx <= 0) return;
    this.unlock();
    if (!this.context) return;
    const [frequency, duration, type] = SOUNDS[name];
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
    if (name === "correct" || name === "upgrade") oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.5, this.context.currentTime + duration);
    gain.gain.setValueAtTime(0.0001, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, this.settings.sfx * 0.13), this.context.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start();
    oscillator.stop(this.context.currentTime + duration + 0.02);
  }

  updateMusic(deltaSeconds: number): void {
    if (this.settings.muted || this.settings.music <= 0 || !this.context) return;
    this.musicTimer -= deltaSeconds;
    if (this.musicTimer > 0) return;
    const notes = [261.6, 329.6, 392, 523.3, 392, 329.6];
    const note = notes[Math.floor(performance.now() / 700) % notes.length];
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = note;
    gain.gain.setValueAtTime(this.settings.music * 0.025, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + 0.45);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start();
    oscillator.stop(this.context.currentTime + 0.5);
    this.musicTimer = 0.7;
  }
}
