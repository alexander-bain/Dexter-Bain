import { BALANCE } from "../data/balance";
import type { GameSave, LegacyGameSaveV1, SceneKey } from "../types";
import { createEmptyMathStats } from "./MathEngine";

const STARTING_TOTALS = {
  blueberriesEarned: 0,
  moneyEarned: 0,
  productsSold: 0,
  customersServed: 0,
  manualCheckouts: 0,
  upgradesBought: 0,
  playtimeSeconds: 0,
  productsProcessed: 0,
  productsDelivered: 0,
  customersLost: 0,
  specialOrdersCompleted: 0,
  mathPowerEarned: 0
};

const nonNegative = (value: unknown, fallback = 0): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : fallback;
};

const plainObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const stringArray = (value: unknown): string[] => Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];

export class SaveSystem {
  static lastError: string | null = null;

  static createNew(): GameSave {
    const now = Date.now();
    return {
      version: 2,
      createdAt: now,
      savedAt: now,
      lastSimulationAt: now,
      rawBlueberries: 0,
      processedProducts: 0,
      storeInventory: 0,
      money: 0,
      mathPower: BALANCE.startingMathPower,
      upgradeLevels: {},
      unlockedProducts: ["fresh"],
      selectedProduct: "fresh",
      mathStats: createEmptyMathStats(),
      totals: { ...STARTING_TOTALS },
      completedQuests: [],
      claimedQuests: [],
      settings: { music: 0.24, sfx: 0.58, muted: false, reducedMotion: false, graphicsQuality: "high" },
      lastScene: "HubScene",
      factoryState: { processingProgress: 0, deliveryProgress: 0 },
      storeState: { customers: [], arrivalProgress: 0, checkoutProgress: 0, nextCustomerId: 1 },
      awayReport: { customersServed: 0, productsSold: 0, moneyEarned: 0, customersLeft: 0 },
      activeBoosts: { productionMultiplier: 1, productValueMultiplier: 1, endsAt: 0, label: "" },
      specialOrder: null,
      specialOrderCooldownSeconds: 45
    };
  }

  static hasSave(storage: Storage = localStorage): boolean {
    return Boolean(storage.getItem(BALANCE.saveKey) || storage.getItem(BALANCE.legacySaveKey));
  }

  static load(storage: Storage = localStorage): GameSave | null {
    SaveSystem.lastError = null;
    const v2Raw = storage.getItem(BALANCE.saveKey);
    if (v2Raw) {
      try {
        return SaveSystem.normalizeV2(JSON.parse(v2Raw));
      } catch (error) {
        console.error("BlueMath Version 2 save could not be loaded", error);
      }
    }

    const v1Raw = storage.getItem(BALANCE.legacySaveKey);
    if (!v1Raw) {
      if (v2Raw) SaveSystem.lastError = "Your saved factory could not be read. Nothing was overwritten. Try again or use New Game.";
      return null;
    }

    try {
      if (!storage.getItem(BALANCE.legacyBackupKey)) storage.setItem(BALANCE.legacyBackupKey, v1Raw);
      const parsed = JSON.parse(v1Raw) as LegacyGameSaveV1;
      const migrated = SaveSystem.migrateV1(parsed);
      storage.setItem(BALANCE.saveKey, JSON.stringify(migrated));
      console.info("BlueMath save migrated from Version 1 to Version 2");
      return migrated;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      SaveSystem.lastError = "We could not update your saved factory. Your old save is still safe. Press Retry Save Update.";
      console.error(`BlueMath Version 1 migration failed: ${detail}`, error);
      return null;
    }
  }

  static migrateV1(value: LegacyGameSaveV1): GameSave {
    if (!plainObject(value) || value.version !== 1) throw new Error("The old save is not Version 1.");
    if (!Number.isFinite(value.money) || !Number.isFinite(value.blueberries)) throw new Error("The old money or blueberry value is invalid.");
    const fresh = SaveSystem.createNew();
    const savedAt = nonNegative(value.savedAt, Date.now());
    return SaveSystem.normalizeV2({
      ...fresh,
      version: 2,
      createdAt: nonNegative(value.createdAt, fresh.createdAt),
      savedAt,
      lastSimulationAt: savedAt,
      rawBlueberries: nonNegative(value.blueberries),
      processedProducts: nonNegative(value.products),
      storeInventory: 0,
      money: nonNegative(value.money),
      upgradeLevels: plainObject(value.upgradeLevels) ? value.upgradeLevels : {},
      unlockedProducts: stringArray(value.unlockedProducts).length ? stringArray(value.unlockedProducts) : ["fresh"],
      selectedProduct: typeof value.selectedProduct === "string" ? value.selectedProduct : "fresh",
      mathStats: { ...fresh.mathStats, ...(plainObject(value.mathStats) ? value.mathStats : {}) },
      totals: { ...fresh.totals, ...(plainObject(value.totals) ? value.totals : {}) },
      completedQuests: stringArray(value.completedQuests),
      claimedQuests: stringArray(value.claimedQuests),
      settings: { ...fresh.settings, ...(plainObject(value.settings) ? value.settings : {}) },
      lastScene: value.lastScene ?? "HubScene"
    });
  }

  static save(data: GameSave, storage: Storage = localStorage, now = Date.now()): void {
    SaveSystem.clamp(data);
    data.savedAt = now;
    data.lastSimulationAt = now;
    storage.setItem(BALANCE.saveKey, JSON.stringify(data));
  }

  static reset(storage: Storage = localStorage): void {
    storage.removeItem(BALANCE.saveKey);
    storage.removeItem(BALANCE.legacySaveKey);
  }

  static setScene(data: GameSave, scene: SceneKey): void {
    data.lastScene = scene;
    SaveSystem.save(data);
  }

  static clamp(data: GameSave): void {
    data.rawBlueberries = nonNegative(data.rawBlueberries);
    data.processedProducts = nonNegative(data.processedProducts);
    data.storeInventory = nonNegative(data.storeInventory);
    data.money = nonNegative(data.money);
    data.mathPower = Math.min(BALANCE.mathPowerMax, nonNegative(data.mathPower));
    data.factoryState.processingProgress = nonNegative(data.factoryState.processingProgress) % 1;
    data.factoryState.deliveryProgress = nonNegative(data.factoryState.deliveryProgress) % 1;
    data.storeState.arrivalProgress = nonNegative(data.storeState.arrivalProgress);
    data.storeState.checkoutProgress = nonNegative(data.storeState.checkoutProgress);
    data.storeState.nextCustomerId = Math.max(1, Math.floor(nonNegative(data.storeState.nextCustomerId, 1)));
    data.storeState.customers = data.storeState.customers.filter((customer) => Number.isFinite(customer.id) && typeof customer.typeId === "string").map((customer) => ({
      ...customer,
      browseSeconds: nonNegative(customer.browseSeconds),
      patienceSeconds: nonNegative(customer.patienceSeconds)
    }));
    for (const key of Object.keys(data.upgradeLevels)) data.upgradeLevels[key] = Math.max(0, Math.floor(nonNegative(data.upgradeLevels[key])));
  }

  private static normalizeV2(value: unknown): GameSave {
    if (!plainObject(value) || value.version !== 2) throw new Error("The save is not Version 2.");
    const fresh = SaveSystem.createNew();
    const data = {
      ...fresh,
      ...value,
      version: 2,
      upgradeLevels: plainObject(value.upgradeLevels) ? value.upgradeLevels as Record<string, number> : {},
      unlockedProducts: stringArray(value.unlockedProducts).length ? stringArray(value.unlockedProducts) : ["fresh"],
      mathStats: { ...fresh.mathStats, ...(plainObject(value.mathStats) ? value.mathStats : {}) },
      totals: { ...fresh.totals, ...(plainObject(value.totals) ? value.totals : {}) },
      completedQuests: stringArray(value.completedQuests),
      claimedQuests: stringArray(value.claimedQuests),
      settings: { ...fresh.settings, ...(plainObject(value.settings) ? value.settings : {}) },
      factoryState: { ...fresh.factoryState, ...(plainObject(value.factoryState) ? value.factoryState : {}) },
      storeState: { ...fresh.storeState, ...(plainObject(value.storeState) ? value.storeState : {}) },
      awayReport: { ...fresh.awayReport, ...(plainObject(value.awayReport) ? value.awayReport : {}) },
      activeBoosts: { ...fresh.activeBoosts, ...(plainObject(value.activeBoosts) ? value.activeBoosts : {}) }
    } as GameSave;
    if (!Array.isArray(data.storeState.customers)) data.storeState.customers = [];
    SaveSystem.clamp(data);
    return data;
  }
}
