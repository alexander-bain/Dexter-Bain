import type { GameSettings, SceneKey } from "../types";

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
  private currentMusic: HTMLAudioElement | null = null;
  private previousMusic: HTMLAudioElement | null = null;
  private theme: "hub" | "factory" | "store" | "math" = "hub";
  private unlocked = false;

  constructor(private readonly settings: GameSettings) {}

  unlock(): void {
    this.unlocked = true;
    if (!this.context) this.context = new AudioContext();
    if (this.context.state === "suspended") void this.context.resume();
    if (!this.currentMusic) this.startTheme();
  }

  setScene(scene: SceneKey | "MenuScene"): void {
    const next = scene === "FactoryScene" ? "factory" : scene === "StoreScene" ? "store" : scene === "MathChallengeScene" ? "math" : "hub";
    if (next === this.theme && this.currentMusic) return;
    this.theme = next;
    if (this.unlocked) this.startTheme();
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
    const target = this.settings.muted ? 0 : this.settings.music * .42;
    if (this.currentMusic) this.currentMusic.volume += (target - this.currentMusic.volume) * Math.min(1, deltaSeconds * 2.6);
    if (this.previousMusic) {
      this.previousMusic.volume = Math.max(0, this.previousMusic.volume - deltaSeconds * .35);
      if (this.previousMusic.volume <= .005) {
        this.previousMusic.pause();
        this.previousMusic = null;
      }
    }
  }

  private startTheme(): void {
    if (typeof Audio === "undefined") return;
    if (this.currentMusic) this.previousMusic = this.currentMusic;
    const next = new Audio(`audio/${this.theme}.wav`);
    next.loop = true;
    next.preload = "auto";
    next.volume = 0;
    this.currentMusic = next;
    void next.play().catch(() => undefined);
  }
}
