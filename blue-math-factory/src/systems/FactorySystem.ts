import { BALANCE } from "../data/balance";
import { PRODUCTS } from "../data/products";
import type { GameSave } from "../types";
import type { EconomySnapshot } from "./EconomySystem";
import { InventorySystem } from "./InventorySystem";

export class FactorySystem {
  constructor(
    private readonly data: GameSave,
    private readonly inventory: InventorySystem,
    private readonly snapshot: () => EconomySnapshot
  ) {}

  tick(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    const snapshot = this.snapshot();
    const recipe = PRODUCTS.find((product) => product.id === this.data.selectedProduct) ?? PRODUCTS[0];

    const harvested = this.inventory.addRaw(snapshot.productionRate * seconds, snapshot.rawStorageCapacity);
    if (harvested > 0) this.data.totals.blueberriesEarned += harvested;

    const canProcess = this.data.rawBlueberries >= recipe.productionCost && this.data.processedProducts < snapshot.warehouseCapacity;
    if (canProcess && snapshot.processingRate > 0) {
      this.data.factoryState.processingProgress += snapshot.processingRate * seconds / 60;
      const ready = Math.floor(this.data.factoryState.processingProgress);
      const byRaw = Math.floor(this.data.rawBlueberries / recipe.productionCost);
      const byWarehouse = Math.floor(snapshot.warehouseCapacity - this.data.processedProducts);
      const packages = Math.max(0, Math.min(ready, byRaw, byWarehouse));
      if (packages > 0) {
        this.inventory.consumeRaw(packages * recipe.productionCost);
        this.inventory.addProcessed(packages, snapshot.warehouseCapacity);
        this.data.factoryState.processingProgress -= packages;
        this.data.totals.productsProcessed += packages;
      }
    }

    if (this.data.processedProducts > 0 && this.data.storeInventory < snapshot.shelfCapacity) {
      this.data.factoryState.deliveryProgress += snapshot.deliveryRate * seconds / 60;
      const ready = Math.floor(this.data.factoryState.deliveryProgress);
      if (ready > 0) {
        const moved = this.inventory.transferToStore(ready, snapshot.shelfCapacity);
        this.data.factoryState.deliveryProgress -= moved;
        this.data.totals.productsDelivered += moved;
      }
    }

    const machinesRunning = harvested > 0 || canProcess || this.data.factoryState.processingProgress > 0;
    if (machinesRunning) this.data.mathPower = Math.max(0, this.data.mathPower - BALANCE.mathPowerDrainPerSecond * seconds);
    this.inventory.clamp();
  }

  bottleneck(): string {
    const snapshot = this.snapshot();
    const recipe = PRODUCTS.find((product) => product.id === this.data.selectedProduct) ?? PRODUCTS[0];
    if (this.data.processedProducts >= snapshot.warehouseCapacity - 0.001) return "WAREHOUSE FULL";
    if (this.data.rawBlueberries < recipe.productionCost && snapshot.productionRate <= 0) return "NEED MORE BLUEBERRIES";
    if (this.data.storeInventory >= snapshot.shelfCapacity - 0.001 && this.data.processedProducts > 0) return "STORE SHELVES FULL";
    if (this.data.storeInventory <= 0 && this.data.processedProducts <= 0) return "SEND PRODUCTS TO THE STORE";
    if (this.data.mathPower < 20) return "ANSWER MATH QUESTIONS TO BOOST YOUR FACTORY";
    return "PRODUCTION FLOWING";
  }
}
