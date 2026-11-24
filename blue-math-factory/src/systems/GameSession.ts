import { BALANCE } from "../data/balance";
import type { GameSave, SceneKey } from "../types";
import { AudioSystem } from "./AudioSystem";
import { EconomySystem } from "./EconomySystem";
import { QuestSystem } from "./QuestSystem";
import { SaveSystem } from "./SaveSystem";

export class GameSession {
  data: GameSave = SaveSystem.createNew();
  economy = new EconomySystem(this.data);
  quests = new QuestSystem(this.economy);
  audio = new AudioSystem(this.data.settings);
  productionBoostUntil = 0;
  mathBoostUntil = 0;
  customerBoostUntil = 0;
  private autosaveElapsed = 0;

  hasSave(): boolean {
    return SaveSystem.hasSave();
  }

  newGame(): void {
    this.bind(SaveSystem.createNew());
    this.save();
  }

  continueGame(): { seconds: number; berries: number } {
    const loaded = SaveSystem.load() ?? SaveSystem.createNew();
    this.bind(loaded);
    const offline = this.economy.applyOffline();
    this.save();
    return offline;
  }

  previewSavedData(): GameSave | null {
    return SaveSystem.load();
  }

  update(deltaSeconds: number): void {
    const productionMultiplier = Date.now() < this.productionBoostUntil ? BALANCE.blueberryRushMultiplier : 1;
    this.economy.tick(Math.min(deltaSeconds, 0.25), productionMultiplier);
    this.audio.updateMusic(deltaSeconds);
    this.autosaveElapsed += deltaSeconds * 1000;
    if (this.autosaveElapsed >= BALANCE.autosaveMs) {
      this.checkQuests();
      this.save();
      this.autosaveElapsed = 0;
    }
  }

  mathMultiplier(): number {
    return Date.now() < this.mathBoostUntil ? BALANCE.mathPowerMultiplier : 1;
  }

  customerMultiplier(): number {
    return Date.now() < this.customerBoostUntil ? 1.75 : 1;
  }

  activateBoost(kind: "production" | "math" | "customers"): void {
    const until = Date.now() + BALANCE.boostSeconds * 1000;
    if (kind === "production") this.productionBoostUntil = until;
    if (kind === "math") this.mathBoostUntil = until;
    if (kind === "customers") this.customerBoostUntil = until;
  }

  checkQuests(): string[] {
    const completed = this.quests.check();
    return completed.map((quest) => `${quest.title}! +$${quest.rewardMoney} and +${quest.rewardBerries} berries`);
  }

  save(scene?: SceneKey): void {
    if (scene) this.data.lastScene = scene;
    SaveSystem.save(this.data);
  }

  resetSave(): void {
    SaveSystem.reset();
    this.bind(SaveSystem.createNew());
  }

  private bind(data: GameSave): void {
    this.data = data;
    this.economy = new EconomySystem(this.data);
    this.quests = new QuestSystem(this.economy);
    this.audio = new AudioSystem(this.data.settings);
    this.autosaveElapsed = 0;
  }
}

export const session = new GameSession();
