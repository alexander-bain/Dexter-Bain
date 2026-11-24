import { BALANCE } from "../data/balance";
import type { GameSave, SceneKey, StoreAwayReport } from "../types";
import { AudioSystem } from "./AudioSystem";
import { EconomySystem, type OfflineResult } from "./EconomySystem";
import { QuestSystem } from "./QuestSystem";
import { SaveSystem } from "./SaveSystem";

export class GameSession {
  data: GameSave = SaveSystem.createNew();
  economy = new EconomySystem(this.data);
  quests = new QuestSystem(this.economy);
  audio = new AudioSystem(this.data.settings);
  private autosaveElapsed = 0;
  private activeScene: SceneKey | "MenuScene" = "MenuScene";
  private started = false;

  hasSave(): boolean {
    return SaveSystem.hasSave();
  }

  migrationError(): string | null {
    return SaveSystem.lastError;
  }

  newGame(): void {
    this.bind(SaveSystem.createNew());
    this.started = true;
    this.save();
  }

  continueGame(): OfflineResult | null {
    const loaded = SaveSystem.load();
    if (!loaded) return null;
    this.bind(loaded);
    this.started = true;
    const offline = this.economy.applyOffline();
    this.save();
    return offline;
  }

  retryMigration(): boolean {
    const loaded = SaveSystem.load();
    if (!loaded) return false;
    this.bind(loaded);
    return true;
  }

  previewSavedData(): GameSave | null {
    return SaveSystem.load();
  }

  update(deltaSeconds: number): void {
    const seconds = Math.min(Math.max(0, deltaSeconds), 0.5);
    if (!this.started) {
      this.audio.updateMusic(seconds);
      return;
    }
    this.economy.tick(seconds);
    this.audio.updateMusic(seconds);
    this.autosaveElapsed += seconds * 1000;
    if (this.autosaveElapsed >= BALANCE.autosaveMs) {
      this.checkQuests();
      this.save();
      this.autosaveElapsed = 0;
    }
  }

  enterScene(scene: SceneKey): StoreAwayReport | null {
    this.started = true;
    this.activeScene = scene;
    this.data.lastScene = scene;
    this.economy.setStoreVisible(scene === "StoreScene");
    const report = scene === "StoreScene" ? this.economy.store.consumeAwayReport() : null;
    this.save(scene);
    return report;
  }

  leaveForMenu(): void {
    this.activeScene = "MenuScene";
    this.economy.setStoreVisible(false);
  }

  mathMultiplier(): number {
    return 1;
  }

  customerMultiplier(): number {
    return 1;
  }

  activateBoost(kind: "production" | "math" | "customers"): void {
    if (kind === "production") this.economy.activateProductionBoost();
    if (kind === "math") this.data.mathPower = Math.min(BALANCE.mathPowerMax, this.data.mathPower + 20);
    if (kind === "customers") this.economy.activateCustomerBoost();
  }

  checkQuests(): string[] {
    const completed = this.quests.check();
    return completed.map((quest) => `${quest.title}! +$${quest.rewardMoney} and +${quest.rewardBerries} raw berries`);
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
    this.economy.setStoreVisible(this.activeScene === "StoreScene");
    this.autosaveElapsed = 0;
  }
}

export const session = new GameSession();
