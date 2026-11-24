import { describe, expect, it } from "vitest";
import { BALANCE } from "../src/data/balance";
import { ALL_UPGRADES, FACTORY_UPGRADES, STORE_UPGRADES, VALUE_UPGRADES } from "../src/data/upgrades";
import { CUSTOMER_TYPES } from "../src/data/customerTypes";
import { PRODUCTS } from "../src/data/products";
import { EconomySystem } from "../src/systems/EconomySystem";
import { MathEngine, createEmptyMathStats } from "../src/systems/MathEngine";
import { SaveSystem } from "../src/systems/SaveSystem";

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

describe("multiplication progression", () => {
  it("uses factors 1–10, valid answer choices, 9–3 second timers, and 1–64 rewards", () => {
    const stats = createEmptyMathStats();
    const engine = new MathEngine(stats, seededRandom());
    for (let streak = 0; streak < 20; streak += 1) {
      for (let sample = 0; sample < 40; sample += 1) {
        const question = engine.createQuestion(streak);
        expect(question.a).toBeGreaterThanOrEqual(1);
        expect(question.a).toBeLessThanOrEqual(10);
        expect(question.b).toBeGreaterThanOrEqual(1);
        expect(question.b).toBeLessThanOrEqual(10);
        expect(question.answer).toBe(question.a * question.b);
        expect(question.choices).toHaveLength(4);
        expect(new Set(question.choices).size).toBe(4);
        expect(question.choices).toContain(question.answer);
        expect(question.duration).toBe(BALANCE.timerSteps[Math.min(streak, 6)]);
        expect(question.reward).toBe(BALANCE.rewardSteps[Math.min(streak, 6)]);
      }
    }
  });

  it("records friendly local math stats without losing earned progress", () => {
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

describe("tycoon economy", () => {
  it("contains the full upgrade and product catalog", () => {
    expect(FACTORY_UPGRADES.length).toBeGreaterThanOrEqual(20);
    expect(STORE_UPGRADES.length).toBeGreaterThanOrEqual(24);
    expect(VALUE_UPGRADES.length).toBeGreaterThanOrEqual(10);
    expect(ALL_UPGRADES.length).toBe(61);
    expect(PRODUCTS.length).toBe(11);
    expect(CUSTOMER_TYPES.length).toBe(10);
  });

  it("unlocks passive production, respects storage, and sells inventory", () => {
    const data = SaveSystem.createNew();
    data.money = 10_000;
    const economy = new EconomySystem(data);
    expect(economy.snapshot().productionRate).toBe(0);
    expect(economy.upgrades.buy("starter-conveyor").ok).toBe(true);
    expect(economy.snapshot().productionRate).toBeGreaterThan(0);
    economy.tick(200);
    expect(data.blueberries).toBeLessThanOrEqual(economy.snapshot().storage);
    expect(data.blueberries).toBeGreaterThan(0);
    const beforeMoney = data.money;
    const sale = economy.serve(CUSTOMER_TYPES[0]);
    expect(sale.sold).toBe(1);
    expect(data.money).toBeGreaterThan(beforeMoney);
    expect(data.totals.customersServed).toBe(1);
  });
});

describe("save safety", () => {
  it("uses the required versioned key and survives a storage round trip", () => {
    const storage = new MemoryStorage();
    const data = SaveSystem.createNew();
    data.money = 321;
    data.blueberries = 45;
    SaveSystem.save(data, storage);
    expect(storage.getItem("blueMathFactory_save_v1")).toBeTruthy();
    const loaded = SaveSystem.load(storage);
    expect(loaded?.money).toBe(321);
    expect(loaded?.blueberries).toBe(45);
    SaveSystem.reset(storage);
    expect(SaveSystem.hasSave(storage)).toBe(false);
  });

  it("rejects invalid save JSON", () => {
    const storage = new MemoryStorage();
    storage.setItem(BALANCE.saveKey, "not json");
    expect(SaveSystem.load(storage)).toBeNull();
  });
});
