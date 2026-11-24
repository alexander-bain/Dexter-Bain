import { describe, expect, it } from "vitest";
import { BALANCE } from "../src/data/balance";
import { ALL_UPGRADES, FACTORY_UPGRADES, STORE_UPGRADES, VALUE_UPGRADES } from "../src/data/upgrades";
import { CUSTOMER_TYPES } from "../src/data/customerTypes";
import { EconomySystem } from "../src/systems/EconomySystem";
import { MathEngine, createEmptyMathStats } from "../src/systems/MathEngine";
import { SaveSystem } from "../src/systems/SaveSystem";
import type { LegacyGameSaveV1, LegacyGameSaveV2, StoreCustomerState } from "../src/types";

const seededRandom = (seed = 123456) => () => {
  seed = (seed * 1664525 + 1013904223) % 0x100000000;
  return seed / 0x100000000;
};

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

const realisticV1 = (): LegacyGameSaveV1 => ({
  version: 1,
  createdAt: 1_700_000_000_000,
  savedAt: 1_700_000_100_000,
  blueberries: 432.5,
  products: 37,
  money: 9876,
  upgradeLevels: { "starter-conveyor": 1, "hire-cashier": 1, "extra-shelf": 2 },
  unlockedProducts: ["fresh", "basket", "box"],
  selectedProduct: "box",
  mathStats: { answered: 91, correct: 80, bestStreak: 9, fastestMs: 840, facts: { "6x7": { seen: 5, correct: 4, misses: 1, recent: 123 } }, recentFacts: ["6x7"] },
  totals: { blueberriesEarned: 1200, moneyEarned: 9000, productsSold: 240, customersServed: 125, manualCheckouts: 18, upgradesBought: 12, playtimeSeconds: 7200 },
  completedQuests: ["math-5", "streak-3"],
  claimedQuests: ["math-5", "streak-3"],
  settings: { music: .4, sfx: .7, muted: false, reducedMotion: true },
  lastScene: "FactoryScene"
});

const realisticV2 = (): LegacyGameSaveV2 => {
  const v1 = realisticV1();
  return SaveSystem.migrateV1(v1);
};

const customerState = (overrides: Partial<StoreCustomerState> = {}): StoreCustomerState => ({
  id: 1,
  typeId: "kid",
  phase: "browsing",
  browseSeconds: 0,
  patienceSeconds: 30,
  targetPackages: 3,
  carriedPackages: 0,
  shelfId: "shelf-1",
  shoppingProgress: 0,
  ...overrides
});

describe("five-question multiplication rush", () => {
  it("uses factors 1–10, unique choices, exact 5–1 timers, and doubling rewards", () => {
    const engine = new MathEngine(createEmptyMathStats(), seededRandom());
    expect(BALANCE.timerSteps).toEqual([5, 4, 3, 2, 1]);
    expect(BALANCE.rewardSteps).toEqual([1, 2, 4, 8, 16]);
    for (let questionIndex = 0; questionIndex < 5; questionIndex += 1) {
      for (let sample = 0; sample < 60; sample += 1) {
        const question = engine.createQuestion(questionIndex);
        expect(question.a).toBeGreaterThanOrEqual(1);
        expect(question.a).toBeLessThanOrEqual(10);
        expect(question.b).toBeGreaterThanOrEqual(1);
        expect(question.b).toBeLessThanOrEqual(10);
        expect(question.answer).toBe(question.a * question.b);
        expect(new Set(question.choices).size).toBe(4);
        expect(question.choices).toContain(question.answer);
        expect(question.duration).toBe(5 - questionIndex);
        expect(question.reward).toBe(2 ** questionIndex);
      }
    }
  });

  it("records misses, correct answers, mastery streaks, and speed", () => {
    const stats = createEmptyMathStats();
    const engine = new MathEngine(stats, seededRandom(4));
    const question = engine.createQuestion(0);
    engine.record(question, false, 5000, 0);
    engine.record(question, true, 1200, 1);
    expect(stats.answered).toBe(2);
    expect(stats.correct).toBe(1);
    expect(stats.facts[question.key].misses).toBe(1);
    expect(stats.fastestMs).toBe(1200);
  });

  it("awards the exact Perfect Rush bonus and factory boost", () => {
    const data = SaveSystem.createNew();
    data.mathPower = 70;
    const economy = new EconomySystem(data);
    const result = economy.awardPerfectRush();
    expect(result.raw).toBe(50);
    expect(result.power).toBe(20);
    expect(data.mathPower).toBe(90);
    expect(data.totals.perfectRushes).toBe(1);
    expect(economy.snapshot().productionBoost).toBe(2);
  });
});

describe("lossless Version 3 migration", () => {
  it("backs up exact V2 text and preserves money, upgrades, packages, stats, and settings", () => {
    const storage = new MemoryStorage();
    const legacy = realisticV2();
    legacy.processedProducts = 41;
    legacy.storeInventory = 37;
    const original = JSON.stringify(legacy);
    storage.setItem(BALANCE.v2SaveKey, original);
    const migrated = SaveSystem.load(storage)!;
    expect(storage.getItem(BALANCE.v2BackupKey)).toBe(original);
    expect(storage.getItem(BALANCE.v2SaveKey)).toBe(original);
    expect(storage.getItem(BALANCE.saveKey)).toBeTruthy();
    expect(migrated.version).toBe(3);
    expect(migrated.money).toBe(legacy.money);
    expect(migrated.rawBlueberries).toBe(legacy.rawBlueberries);
    expect(migrated.warehousePackages).toBe(41);
    expect(migrated.shelves.reduce((sum, shelf) => sum + shelf.currentItems, 0)).toBe(30);
    expect(migrated.storeBackroomPackages).toBe(7);
    expect(migrated.blueberryPackages).toBe(78);
    expect(migrated.upgradeLevels).toEqual(legacy.upgradeLevels);
    expect(migrated.mathStats).toMatchObject(legacy.mathStats);
    expect(migrated.settings.reducedMotion).toBe(true);
    expect(migrated.settings.autoRestock).toBe(true);
  });

  it("migrates V1 through V2 without changing the old text", () => {
    const storage = new MemoryStorage();
    const legacy = realisticV1();
    const original = JSON.stringify(legacy);
    storage.setItem(BALANCE.legacySaveKey, original);
    const migrated = SaveSystem.load(storage)!;
    expect(storage.getItem(BALANCE.legacyBackupKey)).toBe(original);
    expect(storage.getItem(BALANCE.legacySaveKey)).toBe(original);
    expect(migrated.version).toBe(3);
    expect(migrated.money).toBe(legacy.money);
    expect(migrated.warehousePackages).toBe(legacy.products);
    expect(migrated.totals.playtimeSeconds).toBe(legacy.totals.playtimeSeconds);
  });

  it("does not overwrite an invalid prior save", () => {
    const storage = new MemoryStorage();
    const broken = JSON.stringify({ version: 2, money: "oops", rawBlueberries: 5 });
    storage.setItem(BALANCE.v2SaveKey, broken);
    expect(SaveSystem.load(storage)).toBeNull();
    expect(storage.getItem(BALANCE.v2SaveKey)).toBe(broken);
    expect(storage.getItem(BALANCE.saveKey)).toBeNull();
    expect(SaveSystem.lastError).toContain("Version 2 save is still safe");
  });
});

describe("physical blueberry-package economy", () => {
  it("keeps a large upgrade catalog and ten visually distinct shopper types", () => {
    expect(FACTORY_UPGRADES.length).toBeGreaterThanOrEqual(22);
    expect(STORE_UPGRADES.length).toBeGreaterThanOrEqual(33);
    expect(VALUE_UPGRADES.length).toBeGreaterThanOrEqual(10);
    expect(ALL_UPGRADES.length).toBeGreaterThanOrEqual(65);
    expect(CUSTOMER_TYPES.length).toBe(10);
  });

  it("requires exactly 10 raw blueberries and a full 8-second base cycle", () => {
    const data = SaveSystem.createNew();
    data.rawBlueberries = 10;
    data.mathPower = 100;
    const economy = new EconomySystem(data);
    economy.tick(7.9);
    expect(data.warehousePackages).toBe(0);
    economy.tick(.1);
    expect(data.warehousePackages).toBe(1);
    expect(data.rawBlueberries).toBe(0);
    expect(data.totals.totalPackagesProduced).toBe(1);
  });

  it("never creates a package with only 9 raw blueberries", () => {
    const data = SaveSystem.createNew();
    data.rawBlueberries = 9;
    const economy = new EconomySystem(data);
    economy.tick(600);
    expect(data.warehousePackages).toBe(0);
    expect(data.storeBackroomPackages).toBe(0);
  });

  it("delivers warehouse packages to the store backroom, not directly to shelves", () => {
    const data = SaveSystem.createNew();
    data.warehousePackages = 12;
    const economy = new EconomySystem(data);
    economy.tick(60);
    expect(data.storeBackroomPackages).toBeGreaterThan(0);
    expect(economy.inventory.totalShelfStock()).toBe(0);
  });

  it("charges exactly $10 only if a manual restock moves packages", () => {
    const data = SaveSystem.createNew();
    data.storeBackroomPackages = 8;
    data.money = 30;
    const economy = new EconomySystem(data);
    const stocked = economy.store.restockShelf("shelf-1");
    expect(stocked).toMatchObject({ ok: true, moved: 8, charged: 10 });
    expect(data.money).toBe(20);
    expect(data.shelves[0].currentItems).toBe(8);
    const noPackages = economy.store.restockShelf("shelf-2");
    expect(noPackages).toMatchObject({ ok: false, moved: 0, charged: 0 });
    expect(data.money).toBe(20);
  });

  it("removes one visible shelf package per shopping pick and pays only at checkout", () => {
    const data = SaveSystem.createNew();
    data.shelves[0].currentItems = 10;
    data.storeState.customers.push(customerState());
    data.storeState.nextCustomerId = 2;
    const economy = new EconomySystem(data);
    economy.tick(.45);
    expect(data.shelves[0].currentItems).toBe(9);
    expect(data.storeState.customers[0].carriedPackages).toBe(1);
    expect(data.money).toBe(0);
    economy.tick(.9);
    expect(data.shelves[0].currentItems).toBe(7);
    expect(data.storeState.customers[0].phase).toBe("waiting");
    const sale = economy.store.manualServe();
    expect(sale.sold).toBe(3);
    expect(data.totals.totalPackagesSold).toBe(3);
    expect(data.money).toBeGreaterThan(0);
  });

  it("lets bulk shoppers carry more but never more than shelf stock", () => {
    const data = SaveSystem.createNew();
    data.shelves[0].currentItems = 10;
    data.shelves[1].currentItems = 10;
    const economy = new EconomySystem(data);
    const starterSale = economy.store.serveType(CUSTOMER_TYPES[0]);
    expect(starterSale.sold).toBe(3);
    const buyer = CUSTOMER_TYPES.find((customer) => customer.id === "buyer")!;
    const bulkSale = economy.store.serveType(buyer);
    expect(bulkSale.sold).toBe(17);
    expect(economy.inventory.totalShelfStock()).toBe(0);
  });

  it("does not create customers or money when every shelf is empty", () => {
    const data = SaveSystem.createNew();
    data.upgradeLevels["hire-cashier"] = 1;
    const economy = new EconomySystem(data);
    economy.tick(180);
    expect(data.storeState.customers).toHaveLength(0);
    expect(data.money).toBe(0);
    expect(data.totals.totalPackagesSold).toBe(0);
  });

  it("janitor restocks shelves at 25% or lower and pays the same $10 cost", () => {
    const data = SaveSystem.createNew();
    data.upgradeLevels["hire-janitor"] = 1;
    data.settings.autoRestock = true;
    data.shelves[0].currentItems = 2;
    data.storeState.arrivalProgress = -1000;
    data.storeBackroomPackages = 8;
    data.money = 20;
    const economy = new EconomySystem(data);
    economy.tick(20);
    expect(data.shelves[0].currentItems).toBe(10);
    expect(data.storeBackroomPackages).toBe(0);
    expect(data.money).toBe(10);
    expect(data.totals.shelfRestockCount).toBe(1);
  });

  it("special orders remove the exact shelf inventory and award the exact bonus", () => {
    const data = SaveSystem.createNew();
    data.shelves.forEach((shelf) => { shelf.currentItems = 10; });
    data.specialOrder = { a: 6, b: 4, requiredProducts: 24, rewardMoney: 192, createdAt: Date.now() };
    const economy = new EconomySystem(data);
    const result = economy.store.completeSpecialOrder(24);
    expect(result.ok).toBe(true);
    expect(economy.inventory.totalShelfStock()).toBe(6);
    expect(data.money).toBe(192);
    expect(data.totals.totalPackagesSold).toBe(24);
  });

  it("unlocks golden endless victory at 10,000 sold", () => {
    const data = SaveSystem.createNew();
    data.totals.totalPackagesSold = 10_000;
    const economy = new EconomySystem(data);
    economy.tick(.1);
    expect(data.victory).toMatchObject({ unlocked: true, endlessMode: true, trophyEarned: true });
  });

  it("caps closed-game simulation at two hours", () => {
    const data = SaveSystem.createNew();
    data.lastSimulationAt = 1_000;
    const economy = new EconomySystem(data);
    expect(economy.applyOffline(1_000 + 10 * 60 * 60 * 1000).seconds).toBe(2 * 60 * 60);
  });
});
