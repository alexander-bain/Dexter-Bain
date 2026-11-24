import type { GameSave } from "../types";

export class InventorySystem {
  constructor(readonly data: GameSave) {}

  addRaw(amount: number, capacity = Number.POSITIVE_INFINITY): number {
    const accepted = Math.min(this.safe(amount), Math.max(0, capacity - this.data.rawBlueberries));
    this.data.rawBlueberries += accepted;
    return accepted;
  }

  consumeRaw(amount: number): number {
    const consumed = Math.min(this.safe(amount), this.data.rawBlueberries);
    this.data.rawBlueberries -= consumed;
    return consumed;
  }

  addProcessed(amount: number, capacity = Number.POSITIVE_INFINITY): number {
    const accepted = Math.min(this.safe(amount), Math.max(0, capacity - this.data.processedProducts));
    this.data.processedProducts += accepted;
    return accepted;
  }

  transferToStore(amount: number, shelfCapacity: number): number {
    const moved = Math.min(this.safe(amount), this.data.processedProducts, Math.max(0, shelfCapacity - this.data.storeInventory));
    this.data.processedProducts -= moved;
    this.data.storeInventory += moved;
    return moved;
  }

  consumeStore(amount: number): number {
    const consumed = Math.min(this.safe(amount), this.data.storeInventory);
    this.data.storeInventory -= consumed;
    return consumed;
  }

  clamp(): void {
    this.data.rawBlueberries = this.safe(this.data.rawBlueberries);
    this.data.processedProducts = this.safe(this.data.processedProducts);
    this.data.storeInventory = this.safe(this.data.storeInventory);
    this.data.money = this.safe(this.data.money);
  }

  private safe(value: number): number {
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }
}
