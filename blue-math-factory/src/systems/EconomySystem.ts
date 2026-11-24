import { BALANCE } from "../data/balance";
import { PRODUCTS } from "../data/products";
import type { CustomerType, GameSave } from "../types";
import { UpgradeSystem } from "./UpgradeSystem";

export interface EconomySnapshot {
  productionRate: number;
  processingRate: number;
  storage: number;
  productValue: number;
  queueCapacity: number;
  arrivalSeconds: number;
  checkoutSeconds: number;
  patienceSeconds: number;
  cashierLevel: number;
  registers: number;
  factoryLevel: number;
  storeLevel: number;
}

export class EconomySystem {
  readonly upgrades: UpgradeSystem;
  private productProgress = 0;

  constructor(readonly data: GameSave) {
    this.upgrades = new UpgradeSystem(data);
  }

  snapshot(): EconomySnapshot {
    const global = 1 + this.upgrades.effect("global");
    const checkoutBoost = Math.min(0.75, this.upgrades.effect("checkout"));
    const arrivalBoost = Math.min(0.7, this.upgrades.effect("arrival"));
    return {
      productionRate: this.upgrades.effect("production") * global,
      processingRate: this.upgrades.effect("processing") * global,
      storage: BALANCE.baseStorage + this.upgrades.effect("storage"),
      productValue: BALANCE.baseProductValue * (1 + this.upgrades.effect("value")),
      queueCapacity: BALANCE.baseQueueCapacity + Math.floor(this.upgrades.effect("queue")),
      arrivalSeconds: Math.max(1.7, BALANCE.baseArrivalSeconds * (1 - arrivalBoost)),
      checkoutSeconds: Math.max(1.25, BALANCE.baseCheckoutSeconds * (1 - checkoutBoost)),
      patienceSeconds: BALANCE.basePatienceSeconds * (1 + this.upgrades.effect("patience")),
      cashierLevel: Math.floor(this.upgrades.effect("cashier")),
      registers: 1 + Math.floor(this.upgrades.effect("registers")),
      factoryLevel: this.upgrades.categoryLevel("factory"),
      storeLevel: this.upgrades.categoryLevel("store")
    };
  }

  tick(seconds: number, productionMultiplier = 1): void {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    const snapshot = this.snapshot();
    const room = Math.max(0, snapshot.storage - this.data.blueberries);
    this.data.blueberries += Math.min(room, snapshot.productionRate * productionMultiplier * seconds);

    const selected = PRODUCTS.find((product) => product.id === this.data.selectedProduct) ?? PRODUCTS[0];
    if (selected.id !== "fresh" && snapshot.processingRate > 0 && this.data.blueberries >= selected.productionCost) {
      this.productProgress += snapshot.processingRate * seconds / selected.productionTime;
      const possible = Math.min(Math.floor(this.productProgress), Math.floor(this.data.blueberries / selected.productionCost));
      if (possible > 0) {
        this.data.blueberries -= possible * selected.productionCost;
        this.data.products += possible;
        this.productProgress -= possible;
      }
    }
    this.data.totals.playtimeSeconds += seconds;
    this.unlockProducts();
  }

  addMathBerries(amount: number): void {
    this.data.blueberries += amount;
    this.data.totals.blueberriesEarned += amount;
  }

  serve(customer: CustomerType): { sold: number; earned: number; product: string } {
    const selected = PRODUCTS.find((product) => product.id === this.data.selectedProduct) ?? PRODUCTS[0];
    const useProducts = selected.id !== "fresh" && this.data.products > 0;
    const available = useProducts ? this.data.products : this.data.blueberries;
    const sold = Math.min(Math.max(0, Math.floor(available)), customer.basketSize);
    if (sold <= 0) return { sold: 0, earned: 0, product: selected.name };
    if (useProducts) this.data.products -= sold;
    else this.data.blueberries -= sold;
    const base = useProducts ? selected.saleValue : this.snapshot().productValue;
    const earned = Math.max(1, Math.round(sold * base * customer.valueMultiplier));
    this.data.money += earned;
    this.data.totals.moneyEarned += earned;
    this.data.totals.productsSold += sold;
    this.data.totals.customersServed += 1;
    return { sold, earned, product: useProducts ? selected.name : "Fresh Blueberries" };
  }

  applyOffline(now = Date.now()): { seconds: number; berries: number } {
    const seconds = Math.min(BALANCE.offlineCapSeconds, Math.max(0, (now - this.data.savedAt) / 1000));
    const before = this.data.blueberries;
    this.tick(seconds);
    return { seconds, berries: this.data.blueberries - before };
  }

  private unlockProducts(): void {
    const level = this.snapshot().factoryLevel;
    for (const product of PRODUCTS) {
      const requiredMachine = !product.requiredUpgrade || this.upgrades.has(product.requiredUpgrade);
      if (level >= product.unlockFactoryLevel && requiredMachine && !this.data.unlockedProducts.includes(product.id)) {
        this.data.unlockedProducts.push(product.id);
      }
    }
  }
}
