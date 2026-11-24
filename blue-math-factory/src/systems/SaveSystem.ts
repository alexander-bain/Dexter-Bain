import { BALANCE } from "../data/balance";
import type { GameSave, SceneKey } from "../types";
import { createEmptyMathStats } from "./MathEngine";

const STARTING_TOTALS = {
  blueberriesEarned: 0,
  moneyEarned: 0,
  productsSold: 0,
  customersServed: 0,
  manualCheckouts: 0,
  upgradesBought: 0,
  playtimeSeconds: 0
};

export class SaveSystem {
  static createNew(): GameSave {
    const now = Date.now();
    return {
      version: 1,
      createdAt: now,
      savedAt: now,
      blueberries: 0,
      products: 0,
      money: 0,
      upgradeLevels: {},
      unlockedProducts: ["fresh"],
      selectedProduct: "fresh",
      mathStats: createEmptyMathStats(),
      totals: { ...STARTING_TOTALS },
      completedQuests: [],
      claimedQuests: [],
      settings: { music: 0.24, sfx: 0.58, muted: false, reducedMotion: false },
      lastScene: "HubScene"
    };
  }

  static hasSave(storage: Storage = localStorage): boolean {
    return Boolean(storage.getItem(BALANCE.saveKey));
  }

  static load(storage: Storage = localStorage): GameSave | null {
    try {
      const raw = storage.getItem(BALANCE.saveKey);
      if (!raw) return null;
      const value = JSON.parse(raw) as Partial<GameSave>;
      if (value.version !== 1 || typeof value.money !== "number" || typeof value.blueberries !== "number") return null;
      const fresh = SaveSystem.createNew();
      return {
        ...fresh,
        ...value,
        money: Math.max(0, Number(value.money) || 0),
        blueberries: Math.max(0, Number(value.blueberries) || 0),
        products: Math.max(0, Number(value.products) || 0),
        upgradeLevels: value.upgradeLevels && typeof value.upgradeLevels === "object" ? value.upgradeLevels : {},
        mathStats: { ...fresh.mathStats, ...(value.mathStats ?? {}) },
        totals: { ...fresh.totals, ...(value.totals ?? {}) },
        settings: { ...fresh.settings, ...(value.settings ?? {}) }
      };
    } catch {
      return null;
    }
  }

  static save(data: GameSave, storage: Storage = localStorage): void {
    data.savedAt = Date.now();
    storage.setItem(BALANCE.saveKey, JSON.stringify(data));
  }

  static reset(storage: Storage = localStorage): void {
    storage.removeItem(BALANCE.saveKey);
  }

  static setScene(data: GameSave, scene: SceneKey): void {
    data.lastScene = scene;
    SaveSystem.save(data);
  }
}
