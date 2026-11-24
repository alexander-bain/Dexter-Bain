import { BALANCE } from "../data/balance";
import type { GameSave, LegacyGameSaveV1, LegacyGameSaveV2, SceneKey, ShelfInventory, StoreCustomerState } from "../types";
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
  mathPowerEarned: 0,
  totalPackagesProduced: 0,
  totalPackagesSold: 0,
  shelfRestockCount: 0,
  perfectRushes: 0
};

const nonNegative = (value: unknown, fallback = 0): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : fallback;
};

const plainObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const stringArray = (value: unknown): string[] => Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];

const starterShelves = (): ShelfInventory[] => Array.from({ length: BALANCE.baseShelfCount }, (_, index) => ({
  shelfId: `shelf-${index + 1}`,
  capacity: BALANCE.baseShelfCapacity,
  currentItems: 0,
  productType: "fresh-blueberry"
}));

export class SaveSystem {
  static lastError: string | null = null;

  static createNew(): GameSave {
    const now = Date.now();
    return {
      version: 3,
      createdAt: now,
      savedAt: now,
      lastSimulationAt: now,
      rawBlueberries: 0,
      blueberryPackages: 0,
      warehousePackages: 0,
      storeBackroomPackages: 0,
      shelves: starterShelves(),
      money: 0,
      mathPower: BALANCE.startingMathPower,
      upgradeLevels: {},
      unlockedProducts: ["fresh"],
      selectedProduct: "fresh",
      mathStats: createEmptyMathStats(),
      totals: { ...STARTING_TOTALS },
      completedQuests: [],
      claimedQuests: [],
      settings: { music: 0.24, sfx: 0.58, muted: false, reducedMotion: false, graphicsQuality: "high", autoRestock: true, animationQuality: "full" },
      lastScene: "HubScene",
      factoryState: { processingProgress: 0, deliveryProgress: 0 },
      storeState: {
        customers: [],
        arrivalProgress: 0,
        checkoutProgress: 0,
        nextCustomerId: 1,
        janitor: { phase: "idle", targetShelfId: null, progress: 0, carryingPackages: 0 }
      },
      awayReport: { customersServed: 0, productsSold: 0, moneyEarned: 0, customersLeft: 0 },
      activeBoosts: { productionMultiplier: 1, productValueMultiplier: 1, endsAt: 0, label: "" },
      specialOrder: null,
      specialOrderCooldownSeconds: 45,
      victory: { unlocked: false, celebrated: false, endlessMode: false, trophyEarned: false }
    };
  }

  static hasSave(storage: Storage = localStorage): boolean {
    return Boolean(storage.getItem(BALANCE.saveKey) || storage.getItem(BALANCE.v2SaveKey) || storage.getItem(BALANCE.legacySaveKey));
  }

  static load(storage: Storage = localStorage): GameSave | null {
    SaveSystem.lastError = null;
    const v3Raw = storage.getItem(BALANCE.saveKey);
    if (v3Raw) {
      try {
        return SaveSystem.normalizeV3(JSON.parse(v3Raw));
      } catch (error) {
        console.error("BlueMath Version 3 save could not be loaded", error);
      }
    }

    const v2Raw = storage.getItem(BALANCE.v2SaveKey);
    if (v2Raw) {
      try {
        if (!storage.getItem(BALANCE.v2BackupKey)) storage.setItem(BALANCE.v2BackupKey, v2Raw);
        const migrated = SaveSystem.migrateV2(JSON.parse(v2Raw));
        storage.setItem(BALANCE.saveKey, JSON.stringify(migrated));
        console.info("BlueMath save migrated from Version 2 to Version 3");
        return migrated;
      } catch (error) {
        SaveSystem.lastError = "We could not update your saved factory. Your Version 2 save is still safe. Press Retry Save Update.";
        console.error("BlueMath Version 2 migration failed", error);
        return null;
      }
    }

    const v1Raw = storage.getItem(BALANCE.legacySaveKey);
    if (!v1Raw) {
      if (v3Raw) SaveSystem.lastError = "Your saved factory could not be read. Nothing was overwritten. Try again or use New Game.";
      return null;
    }

    try {
      if (!storage.getItem(BALANCE.legacyBackupKey)) storage.setItem(BALANCE.legacyBackupKey, v1Raw);
      const v2 = SaveSystem.migrateV1(JSON.parse(v1Raw) as LegacyGameSaveV1);
      const migrated = SaveSystem.migrateV2(v2);
      storage.setItem(BALANCE.saveKey, JSON.stringify(migrated));
      console.info("BlueMath save migrated from Version 1 to Version 3");
      return migrated;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      SaveSystem.lastError = "We could not update your saved factory. Your old save is still safe. Press Retry Save Update.";
      console.error(`BlueMath Version 1 migration failed: ${detail}`, error);
      return null;
    }
  }

  static migrateV1(value: LegacyGameSaveV1): LegacyGameSaveV2 {
    if (!plainObject(value) || value.version !== 1) throw new Error("The old save is not Version 1.");
    if (!Number.isFinite(value.money) || !Number.isFinite(value.blueberries)) throw new Error("The old money or blueberry value is invalid.");
    const fresh = SaveSystem.createNew();
    const savedAt = nonNegative(value.savedAt, Date.now());
    return {
      version: 2,
      createdAt: nonNegative(value.createdAt, fresh.createdAt),
      savedAt,
      lastSimulationAt: savedAt,
      rawBlueberries: nonNegative(value.blueberries),
      processedProducts: nonNegative(value.products),
      storeInventory: 0,
      money: nonNegative(value.money),
      mathPower: BALANCE.startingMathPower,
      upgradeLevels: plainObject(value.upgradeLevels) ? value.upgradeLevels as Record<string, number> : {},
      unlockedProducts: stringArray(value.unlockedProducts).length ? stringArray(value.unlockedProducts) : ["fresh"],
      selectedProduct: typeof value.selectedProduct === "string" ? value.selectedProduct : "fresh",
      mathStats: { ...fresh.mathStats, ...(plainObject(value.mathStats) ? value.mathStats : {}) },
      totals: { ...fresh.totals, ...(plainObject(value.totals) ? value.totals : {}) },
      completedQuests: stringArray(value.completedQuests),
      claimedQuests: stringArray(value.claimedQuests),
      settings: { ...fresh.settings, ...(plainObject(value.settings) ? value.settings : {}) },
      lastScene: value.lastScene ?? "HubScene",
      factoryState: { processingProgress: 0, deliveryProgress: 0 },
      storeState: { customers: [], arrivalProgress: 0, checkoutProgress: 0, nextCustomerId: 1 },
      awayReport: { customersServed: 0, productsSold: 0, moneyEarned: 0, customersLeft: 0 },
      activeBoosts: { productionMultiplier: 1, productValueMultiplier: 1, endsAt: 0, label: "" },
      specialOrder: null,
      specialOrderCooldownSeconds: 45
    };
  }

  static migrateV2(value: LegacyGameSaveV2): GameSave {
    if (!plainObject(value) || value.version !== 2) throw new Error("The save is not Version 2.");
    if (!Number.isFinite(value.money) || !Number.isFinite(value.rawBlueberries)) throw new Error("The Version 2 money or blueberry value is invalid.");
    const fresh = SaveSystem.createNew();
    const shelfStock = Math.floor(nonNegative(value.storeInventory));
    let remaining = shelfStock;
    for (const shelf of fresh.shelves) {
      shelf.currentItems = Math.min(shelf.capacity, remaining);
      remaining -= shelf.currentItems;
    }
    const data: GameSave = {
      ...fresh,
      createdAt: nonNegative(value.createdAt, fresh.createdAt),
      savedAt: nonNegative(value.savedAt, fresh.savedAt),
      lastSimulationAt: nonNegative(value.lastSimulationAt, value.savedAt),
      rawBlueberries: nonNegative(value.rawBlueberries),
      warehousePackages: nonNegative(value.processedProducts),
      storeBackroomPackages: remaining,
      money: nonNegative(value.money),
      mathPower: nonNegative(value.mathPower, BALANCE.startingMathPower),
      upgradeLevels: plainObject(value.upgradeLevels) ? value.upgradeLevels as Record<string, number> : {},
      unlockedProducts: stringArray(value.unlockedProducts).length ? stringArray(value.unlockedProducts) : ["fresh"],
      selectedProduct: typeof value.selectedProduct === "string" ? value.selectedProduct : "fresh",
      mathStats: { ...fresh.mathStats, ...(plainObject(value.mathStats) ? value.mathStats : {}) },
      totals: { ...fresh.totals, ...(plainObject(value.totals) ? value.totals : {}) },
      completedQuests: stringArray(value.completedQuests),
      claimedQuests: stringArray(value.claimedQuests),
      settings: { ...fresh.settings, ...(plainObject(value.settings) ? value.settings : {}) },
      lastScene: value.lastScene ?? "HubScene",
      factoryState: { ...fresh.factoryState, ...(plainObject(value.factoryState) ? value.factoryState : {}) },
      storeState: { ...fresh.storeState, ...(plainObject(value.storeState) ? value.storeState : {}), janitor: fresh.storeState.janitor },
      awayReport: { ...fresh.awayReport, ...(plainObject(value.awayReport) ? value.awayReport : {}) },
      activeBoosts: { ...fresh.activeBoosts, ...(plainObject(value.activeBoosts) ? value.activeBoosts : {}) },
      specialOrder: plainObject(value.specialOrder) ? value.specialOrder as unknown as GameSave["specialOrder"] : null,
      specialOrderCooldownSeconds: nonNegative(value.specialOrderCooldownSeconds, 45)
    };
    data.totals.totalPackagesProduced = nonNegative(value.totals?.totalPackagesProduced, value.totals?.productsProcessed ?? 0);
    data.totals.totalPackagesSold = nonNegative(value.totals?.totalPackagesSold, value.totals?.productsSold ?? 0);
    SaveSystem.clamp(data);
    return data;
  }

  static save(data: GameSave, storage: Storage = localStorage, now = Date.now()): void {
    SaveSystem.clamp(data);
    data.savedAt = now;
    data.lastSimulationAt = now;
    storage.setItem(BALANCE.saveKey, JSON.stringify(data));
  }

  static reset(storage: Storage = localStorage): void {
    storage.removeItem(BALANCE.saveKey);
    storage.removeItem(BALANCE.v2SaveKey);
    storage.removeItem(BALANCE.legacySaveKey);
  }

  static setScene(data: GameSave, scene: SceneKey): void {
    data.lastScene = scene;
    SaveSystem.save(data);
  }

  static clamp(data: GameSave): void {
    data.rawBlueberries = nonNegative(data.rawBlueberries);
    data.warehousePackages = nonNegative(data.warehousePackages);
    data.storeBackroomPackages = nonNegative(data.storeBackroomPackages);
    data.money = nonNegative(data.money);
    data.mathPower = Math.min(BALANCE.mathPowerMax, nonNegative(data.mathPower));
    data.factoryState.processingProgress = nonNegative(data.factoryState.processingProgress) % 1;
    data.factoryState.deliveryProgress = nonNegative(data.factoryState.deliveryProgress) % 1;
    data.storeState.arrivalProgress = nonNegative(data.storeState.arrivalProgress);
    data.storeState.checkoutProgress = nonNegative(data.storeState.checkoutProgress);
    data.storeState.nextCustomerId = Math.max(1, Math.floor(nonNegative(data.storeState.nextCustomerId, 1)));
    data.shelves = (Array.isArray(data.shelves) ? data.shelves : starterShelves()).map((shelf, index) => ({
      shelfId: typeof shelf.shelfId === "string" ? shelf.shelfId : `shelf-${index + 1}`,
      capacity: BALANCE.baseShelfCapacity,
      currentItems: Math.max(0, Math.min(Math.floor(nonNegative(shelf.currentItems)), BALANCE.baseShelfCapacity)),
      productType: "fresh-blueberry"
    }));
    data.storeState.customers = (Array.isArray(data.storeState.customers) ? data.storeState.customers : [])
      .filter((customer) => Number.isFinite(customer.id) && typeof customer.typeId === "string")
      .map((customer) => SaveSystem.normalizeCustomer(customer));
    data.blueberryPackages = data.warehousePackages + data.storeBackroomPackages;
    for (const key of Object.keys(data.upgradeLevels)) data.upgradeLevels[key] = Math.max(0, Math.floor(nonNegative(data.upgradeLevels[key])));
  }

  private static normalizeCustomer(customer: Partial<StoreCustomerState> & Pick<StoreCustomerState, "id" | "typeId">): StoreCustomerState {
    return {
      id: customer.id,
      typeId: customer.typeId,
      phase: customer.phase === "waiting" ? "waiting" : "browsing",
      browseSeconds: nonNegative(customer.browseSeconds),
      patienceSeconds: nonNegative(customer.patienceSeconds),
      targetPackages: Math.max(1, Math.floor(nonNegative(customer.targetPackages, 1))),
      carriedPackages: Math.floor(nonNegative(customer.carriedPackages)),
      shelfId: typeof customer.shelfId === "string" ? customer.shelfId : null,
      shoppingProgress: nonNegative(customer.shoppingProgress)
    };
  }

  private static normalizeV3(value: unknown): GameSave {
    if (!plainObject(value) || value.version !== 3) throw new Error("The save is not Version 3.");
    const fresh = SaveSystem.createNew();
    const data = {
      ...fresh,
      ...value,
      version: 3,
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
      activeBoosts: { ...fresh.activeBoosts, ...(plainObject(value.activeBoosts) ? value.activeBoosts : {}) },
      victory: { ...fresh.victory, ...(plainObject(value.victory) ? value.victory : {}) }
    } as GameSave;
    data.storeState.janitor = { ...fresh.storeState.janitor, ...(plainObject(data.storeState.janitor) ? data.storeState.janitor : {}) };
    SaveSystem.clamp(data);
    return data;
  }
}
