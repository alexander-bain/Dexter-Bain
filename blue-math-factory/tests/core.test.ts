import { describe, expect, it } from "vitest";
import { BALANCE } from "../src/data/balance";
import { ALL_UPGRADES, FACTORY_UPGRADES, STORE_UPGRADES, VALUE_UPGRADES } from "../src/data/upgrades";
import { CUSTOMER_TYPES } from "../src/data/customerTypes";
import { PRODUCTS } from "../src/data/products";
import { EconomySystem } from "../src/systems/EconomySystem";
import { MathEngine, createEmptyMathStats } from "../src/systems/MathEngine";
import { SaveSystem } from "../src/systems/SaveSystem";
import type { LegacyGameSaveV1 } from "../src/types";

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

describe("multiplication progression", () => {
  it("uses factors 1–10, unique choices, 9–3 second timers, and 1–64 rewards", () => {
    const engine = new MathEngine(createEmptyMathStats(), seededRandom());
    for (let streak = 0; streak < 20; streak += 1) {
      for (let sample = 0; sample < 40; sample += 1) {
        const question = engine.createQuestion(streak);
        expect(question.a).toBeGreaterThanOrEqual(1);
        expect(question.a).toBeLessThanOrEqual(10);
        expect(question.b).toBeGreaterThanOrEqual(1);
        expect(question.b).toBeLessThanOrEqual(10);
        expect(question.answer).toBe(question.a * question.b);
        expect(new Set(question.choices).size).toBe(4);
        expect(question.choices).toContain(question.answer);
        expect(question.duration).toBe(BALANCE.timerSteps[Math.min(streak, 6)]);
        expect(question.reward).toBe(BALANCE.rewardSteps[Math.min(streak, 6)]);
      }
    }
  });

  it("records misses, correct answers, streaks, and speed", () => {
    const stats = createEmptyMathStats();
    const engine = new MathEngine(stats, seededRandom(4));
    const question = engine.createQuestion(0);
    engine.record(question, false, 9000, 0);
    engine.record(question, true, 1200, 1);
    expect(stats.answered).toBe(2);
    expect(stats.correct).toBe(1);
    expect(stats.facts[question.key].misses).toBe(1);
    expect(stats.fastestMs).toBe(1200);
  });
});

describe("Version 1 to Version 2 save migration", () => {
  it("backs up the exact V1 text and preserves all known progress", () => {
    const storage = new MemoryStorage();
    const legacy = realisticV1();
    const original = JSON.stringify(legacy);
    storage.setItem(BALANCE.legacySaveKey, original);
    const migrated = SaveSystem.load(storage)!;
    expect(storage.getItem(BALANCE.legacyBackupKey)).toBe(original);
    expect(storage.getItem(BALANCE.legacySaveKey)).toBe(original);
    expect(storage.getItem(BALANCE.saveKey)).toBeTruthy();
    expect(migrated.version).toBe(2);
    expect(migrated.money).toBe(legacy.money);
    expect(migrated.rawBlueberries).toBe(legacy.blueberries);
    expect(migrated.processedProducts).toBe(legacy.products);
    expect(migrated.upgradeLevels).toEqual(legacy.upgradeLevels);
    expect(migrated.mathStats).toMatchObject(legacy.mathStats);
    expect(migrated.totals.playtimeSeconds).toBe(legacy.totals.playtimeSeconds);
    expect(migrated.completedQuests).toEqual(legacy.completedQuests);
    expect(migrated.settings.reducedMotion).toBe(true);
    expect(migrated.settings.graphicsQuality).toBe("high");
    expect(migrated.mathPower).toBe(BALANCE.startingMathPower);
    expect(migrated.storeInventory).toBe(0);
    expect(SaveSystem.load(storage)?.money).toBe(legacy.money);
  });

  it("does not overwrite an invalid old save", () => {
    const storage = new MemoryStorage();
    const broken = JSON.stringify({ version: 1, money: "oops", blueberries: 5 });
    storage.setItem(BALANCE.legacySaveKey, broken);
    expect(SaveSystem.load(storage)).toBeNull();
    expect(storage.getItem(BALANCE.legacySaveKey)).toBe(broken);
    expect(storage.getItem(BALANCE.saveKey)).toBeNull();
    expect(SaveSystem.lastError).toContain("old save is still safe");
  });
});

describe("persistent tycoon economy", () => {
  it("keeps the full catalog", () => {
    expect(FACTORY_UPGRADES.length).toBeGreaterThanOrEqual(20);
    expect(STORE_UPGRADES.length).toBeGreaterThanOrEqual(24);
    expect(VALUE_UPGRADES.length).toBeGreaterThanOrEqual(10);
    expect(ALL_UPGRADES.length).toBe(61);
    expect(PRODUCTS.length).toBe(11);
    expect(CUSTOMER_TYPES.length).toBe(10);
  });

  it("consumes real raw berries, creates packages, and stops at warehouse capacity", () => {
    const data = SaveSystem.createNew();
    data.rawBlueberries = 10_000;
    data.mathPower = 100;
    const economy = new EconomySystem(data);
    const beforeRaw = data.rawBlueberries;
    economy.tick(60);
    expect(data.processedProducts).toBeGreaterThan(0);
    expect(data.rawBlueberries).toBeLessThan(beforeRaw);
    expect(data.totals.productsProcessed).toBe(data.processedProducts + data.storeInventory);
    economy.tick(7200);
    expect(data.processedProducts).toBeLessThanOrEqual(economy.snapshot().warehouseCapacity);
    expect(data.storeInventory).toBeLessThanOrEqual(economy.snapshot().shelfCapacity);
  });

  it("never creates a package without enough raw blueberries", () => {
    const data = SaveSystem.createNew();
    data.rawBlueberries = 9;
    const economy = new EconomySystem(data);
    economy.tick(600);
    expect(data.processedProducts).toBe(0);
    expect(data.storeInventory).toBe(0);
  });

  it("cashiers keep selling away from the store and sales consume inventory", () => {
    const data = SaveSystem.createNew();
    data.storeInventory = 20;
    data.upgradeLevels["hire-cashier"] = 1;
    data.upgradeLevels["queue-ropes"] = 3;
    const economy = new EconomySystem(data);
    economy.setStoreVisible(false);
    const beforeMoney = data.money;
    economy.tick(60);
    expect(data.totals.customersServed).toBeGreaterThan(0);
    expect(data.storeInventory).toBeLessThan(20);
    expect(data.money).toBeGreaterThan(beforeMoney);
    expect(data.awayReport.moneyEarned).toBe(data.money - beforeMoney);
  });

  it("cannot earn money with empty shelves", () => {
    const data = SaveSystem.createNew();
    data.upgradeLevels["hire-cashier"] = 1;
    data.upgradeLevels["queue-ropes"] = 3;
    const economy = new EconomySystem(data);
    economy.tick(180);
    expect(data.money).toBe(0);
    expect(data.totals.productsSold).toBe(0);
    expect(economy.store.status()).toBe("STORE NEEDS MORE PRODUCTS");
  });

  it("applies Math Power speed tiers and streak power/boost rewards", () => {
    const data = SaveSystem.createNew();
    const economy = new EconomySystem(data);
    data.mathPower = 68; expect(economy.mathPowerSpeed()).toBe(1);
    data.mathPower = 30; expect(economy.mathPowerSpeed()).toBe(.75);
    data.mathPower = 10; expect(economy.mathPowerSpeed()).toBe(.5);
    data.mathPower = 0; expect(economy.mathPowerSpeed()).toBe(.25);
    const gain = economy.addMathBerries(8, 7);
    expect(gain.mathPower).toBe(10);
    expect(economy.activateStreakBoost(10)).toContain("2× FACTORY");
    expect(economy.snapshot().productionBoost).toBe(2);
    expect(economy.snapshot().valueBoost).toBe(1.5);
  });

  it("special orders remove the exact inventory and award the exact bonus", () => {
    const data = SaveSystem.createNew();
    data.storeInventory = 30;
    data.specialOrder = { a: 6, b: 4, requiredProducts: 24, rewardMoney: 192, createdAt: Date.now() };
    const economy = new EconomySystem(data);
    const result = economy.store.completeSpecialOrder(24);
    expect(result.ok).toBe(true);
    expect(data.storeInventory).toBe(6);
    expect(data.money).toBe(192);
    expect(data.totals.specialOrdersCompleted).toBe(1);
  });

  it("caps closed-game simulation at two hours", () => {
    const data = SaveSystem.createNew();
    data.lastSimulationAt = 1_000;
    const economy = new EconomySystem(data);
    expect(economy.applyOffline(1_000 + 10 * 60 * 60 * 1000).seconds).toBe(2 * 60 * 60);
  });
});
