import { BALANCE } from "../data/balance";
import { PRODUCTS } from "../data/products";
import type { CustomerType, GameSave, StoreAwayReport } from "../types";
import { FactorySystem } from "./FactorySystem";
import { InventorySystem } from "./InventorySystem";
import { StoreSystem, type SaleResult } from "./StoreSystem";
import { UpgradeSystem } from "./UpgradeSystem";

export interface EconomySnapshot {
  productionRate: number;
  processingRate: number;
  rawStorageCapacity: number;
  storage: number;
  warehouseCapacity: number;
  shelfCapacity: number;
  deliveryRate: number;
  productValue: number;
  queueCapacity: number;
  arrivalSeconds: number;
  checkoutSeconds: number;
  patienceSeconds: number;
  cashierLevel: number;
  registers: number;
  activeCheckoutLanes: number;
  factoryLevel: number;
  storeLevel: number;
  mathPowerSpeed: number;
  expectedIncomePerMinute: number;
  selectedProductName: string;
  productionBoost: number;
  valueBoost: number;
}

export interface OfflineResult extends StoreAwayReport {
  seconds: number;
  berries: number;
  processedProducts: number;
}

export class EconomySystem {
  readonly upgrades: UpgradeSystem;
  readonly inventory: InventorySystem;
  readonly factory: FactorySystem;
  readonly store: StoreSystem;
  private storeVisible = false;
  private customerBoostUntil = 0;

  constructor(readonly data: GameSave) {
    this.upgrades = new UpgradeSystem(data);
    this.inventory = new InventorySystem(data);
    this.factory = new FactorySystem(data, this.inventory, () => this.snapshot());
    this.store = new StoreSystem(data, this.inventory, () => this.snapshot());
  }

  snapshot(overrides: Record<string, number> = {}): EconomySnapshot {
    const effect = (name: Parameters<UpgradeSystem["effect"]>[0]) => this.upgrades.effect(name, undefined, overrides);
    const level = (id: string) => overrides[id] ?? this.upgrades.level(id);
    const global = 1 + effect("global");
    const checkoutBoost = Math.min(0.75, effect("checkout"));
    const arrivalBoost = Math.min(0.7, effect("arrival"));
    const selected = PRODUCTS.find((product) => product.id === this.data.selectedProduct) ?? PRODUCTS[0];
    const mathPowerSpeed = this.mathPowerSpeed();
    const boostActive = this.data.activeBoosts.endsAt > Date.now();
    const productionBoost = boostActive ? Math.max(1, this.data.activeBoosts.productionMultiplier) : 1;
    const valueBoost = boostActive ? Math.max(1, this.data.activeBoosts.productValueMultiplier) : 1;
    const productionRate = effect("production") * global * mathPowerSpeed * productionBoost;
    const processingRate = (BALANCE.baseProcessingPerMinute * 8 / selected.productionTime + effect("processing")) * global * mathPowerSpeed * productionBoost;
    const rawStorageCapacity = BALANCE.baseRawStorage + effect("storage");
    const warehouseCapacity = BALANCE.baseWarehouseCapacity + level("packing-machine") * 8 + level("mega-packer") * 20 + level("giant-silo") * 25;
    const shelfCapacity = BALANCE.baseShelfCapacity + effect("shelf") + level("store-expansion") * 30;
    const deliveryRate = (BALANCE.baseDeliveryPerMinute + effect("delivery")) * global * mathPowerSpeed;
    const productValue = selected.saleValue * (1 + effect("value")) * valueBoost;
    const queueCapacity = BALANCE.baseQueueCapacity + Math.floor(effect("queue"));
    const customerBoost = Date.now() < this.customerBoostUntil ? 1.75 : 1;
    const arrivalSeconds = Math.max(1.2, BALANCE.baseArrivalSeconds * (1 - arrivalBoost) / customerBoost);
    const checkoutSeconds = Math.max(1.25, BALANCE.baseCheckoutSeconds * (1 - checkoutBoost));
    const patienceSeconds = BALANCE.basePatienceSeconds * (1 + effect("patience"));
    const cashierLevel = Math.floor(effect("cashier"));
    const registers = 1 + Math.floor(effect("registers"));
    const activeCheckoutLanes = Math.min(cashierLevel, registers);
    const customerRate = Math.min(60 / arrivalSeconds, activeCheckoutLanes > 0 ? activeCheckoutLanes * 60 / checkoutSeconds : 0);
    const averageBasket = 1 + Math.min(3, this.upgrades.categoryLevel("store") / 10);
    return {
      productionRate,
      processingRate,
      rawStorageCapacity,
      storage: rawStorageCapacity,
      warehouseCapacity,
      shelfCapacity,
      deliveryRate,
      productValue,
      queueCapacity,
      arrivalSeconds,
      checkoutSeconds,
      patienceSeconds,
      cashierLevel,
      registers,
      activeCheckoutLanes,
      factoryLevel: this.upgrades.categoryLevel("factory"),
      storeLevel: this.upgrades.categoryLevel("store"),
      mathPowerSpeed,
      expectedIncomePerMinute: this.data.storeInventory > 0 ? customerRate * averageBasket * productValue : 0,
      selectedProductName: selected.name,
      productionBoost,
      valueBoost
    };
  }

  tick(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    let remaining = Math.min(seconds, BALANCE.offlineCapSeconds);
    while (remaining > 0) {
      const step = Math.min(5, remaining);
      this.factory.tick(step);
      this.store.tick(step, !this.storeVisible);
      this.data.totals.playtimeSeconds += step;
      remaining -= step;
    }
    this.unlockProducts();
    this.inventory.clamp();
  }

  setStoreVisible(visible: boolean): void {
    this.storeVisible = visible;
  }

  addMathBerries(amount: number, streak = 0): { berries: number; mathPower: number } {
    const berries = this.inventory.addRaw(amount, this.snapshot().rawStorageCapacity);
    this.data.totals.blueberriesEarned += berries;
    const bonus = streak >= 7 ? 8 : streak >= 5 ? 5 : streak >= 3 ? 3 : 0;
    const before = this.data.mathPower;
    this.data.mathPower = Math.min(BALANCE.mathPowerMax, this.data.mathPower + BALANCE.mathPowerPerAnswer + bonus);
    const gained = this.data.mathPower - before;
    this.data.totals.mathPowerEarned += gained;
    return { berries, mathPower: gained };
  }

  activateStreakBoost(streak: number): string | null {
    const definitions: Record<number, { production: number; value: number; seconds: number; label: string }> = {
      3: { production: 1.25, value: 1, seconds: 30, label: "3 STREAK: 1.25× FACTORY" },
      5: { production: 1.5, value: 1, seconds: 45, label: "5 STREAK: 1.5× FACTORY" },
      7: { production: 2, value: 1, seconds: 60, label: "7 STREAK: 2× FACTORY" },
      10: { production: 2, value: 1.5, seconds: 90, label: "10 STREAK: 2× FACTORY + 1.5× VALUE" }
    };
    const boost = definitions[streak];
    if (!boost) return null;
    this.data.activeBoosts = {
      productionMultiplier: boost.production,
      productValueMultiplier: boost.value,
      endsAt: Date.now() + boost.seconds * 1000,
      label: boost.label
    };
    return `${boost.label} FOR ${boost.seconds} SECONDS`;
  }

  activateProductionBoost(multiplier = 2, seconds = BALANCE.boostSeconds): void {
    this.data.activeBoosts = {
      productionMultiplier: multiplier,
      productValueMultiplier: 1,
      endsAt: Date.now() + seconds * 1000,
      label: `${multiplier}× FACTORY RUSH`
    };
  }

  activateCustomerBoost(seconds = BALANCE.boostSeconds): void {
    this.customerBoostUntil = Date.now() + seconds * 1000;
  }

  serve(customer: CustomerType): SaleResult {
    return this.store.serveType(customer);
  }

  applyOffline(now = Date.now()): OfflineResult {
    const seconds = Math.min(BALANCE.offlineCapSeconds, Math.max(0, (now - this.data.lastSimulationAt) / 1000));
    const beforeRaw = this.data.rawBlueberries;
    const beforeProcessed = this.data.processedProducts;
    const beforeReport = { ...this.data.awayReport };
    this.tick(seconds);
    return {
      seconds,
      berries: this.data.rawBlueberries - beforeRaw,
      processedProducts: this.data.processedProducts - beforeProcessed,
      customersServed: this.data.awayReport.customersServed - beforeReport.customersServed,
      productsSold: this.data.awayReport.productsSold - beforeReport.productsSold,
      moneyEarned: this.data.awayReport.moneyEarned - beforeReport.moneyEarned,
      customersLeft: this.data.awayReport.customersLeft - beforeReport.customersLeft
    };
  }

  mathPowerSpeed(): number {
    if (this.data.mathPower >= 50) return 1;
    if (this.data.mathPower >= 20) return 0.75;
    if (this.data.mathPower > 0) return 0.5;
    return 0.25;
  }

  private unlockProducts(): void {
    const level = this.snapshot().factoryLevel;
    for (const product of PRODUCTS) {
      const requiredMachine = !product.requiredUpgrade || this.upgrades.has(product.requiredUpgrade);
      if (level >= product.unlockFactoryLevel && requiredMachine && !this.data.unlockedProducts.includes(product.id)) this.data.unlockedProducts.push(product.id);
    }
  }
}
