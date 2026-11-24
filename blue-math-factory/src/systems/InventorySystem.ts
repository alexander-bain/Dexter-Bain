import { BALANCE } from "../data/balance";
import type { GameSave, ShelfInventory } from "../types";

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

  addWarehouse(amount: number, capacity = Number.POSITIVE_INFINITY): number {
    const accepted = Math.min(this.safe(amount), Math.max(0, capacity - this.data.warehousePackages));
    this.data.warehousePackages += accepted;
    this.syncPackageTotal();
    return accepted;
  }

  transferToBackroom(amount: number, capacity: number): number {
    const moved = Math.min(this.safe(amount), this.data.warehousePackages, Math.max(0, capacity - this.data.storeBackroomPackages));
    this.data.warehousePackages -= moved;
    this.data.storeBackroomPackages += moved;
    this.syncPackageTotal();
    return moved;
  }

  totalShelfStock(): number {
    return this.data.shelves.reduce((sum, shelf) => sum + shelf.currentItems, 0);
  }

  shelf(shelfId: string): ShelfInventory | undefined {
    return this.data.shelves.find((entry) => entry.shelfId === shelfId);
  }

  restockShelf(shelfId: string, maximum = Number.POSITIVE_INFINITY): number {
    const shelf = this.shelf(shelfId);
    if (!shelf) return 0;
    const limit = Number.isFinite(maximum) ? Math.floor(this.safe(maximum)) : Number.POSITIVE_INFINITY;
    const moved = Math.min(
      limit,
      Math.floor(this.data.storeBackroomPackages),
      Math.max(0, shelf.capacity - shelf.currentItems)
    );
    shelf.currentItems += moved;
    this.data.storeBackroomPackages -= moved;
    this.syncPackageTotal();
    return moved;
  }

  takeOneFromShelf(shelfId?: string | null): string | null {
    const requested = shelfId ? this.shelf(shelfId) : undefined;
    const shelf = requested?.currentItems ? requested : this.data.shelves.find((entry) => entry.currentItems >= 1);
    if (!shelf) return null;
    shelf.currentItems -= 1;
    this.syncPackageTotal();
    return shelf.shelfId;
  }

  consumeFromShelves(amount: number): number {
    let remaining = Math.floor(this.safe(amount));
    let consumed = 0;
    for (const shelf of this.data.shelves) {
      const fromShelf = Math.min(remaining, shelf.currentItems);
      shelf.currentItems -= fromShelf;
      remaining -= fromShelf;
      consumed += fromShelf;
      if (remaining <= 0) break;
    }
    this.syncPackageTotal();
    return consumed;
  }

  ensureShelfLayout(count: number, capacity: number): void {
    const targetCount = Math.max(BALANCE.baseShelfCount, Math.floor(count));
    const targetCapacity = Math.max(1, Math.floor(capacity));
    while (this.data.shelves.length < targetCount) {
      this.data.shelves.push({
        shelfId: `shelf-${this.data.shelves.length + 1}`,
        capacity: targetCapacity,
        currentItems: 0,
        productType: "blueberry-package",
        restockCost: BALANCE.shelfRestockCost
      });
    }
    for (const shelf of this.data.shelves) shelf.capacity = Math.max(shelf.capacity, targetCapacity, shelf.currentItems);
    this.syncPackageTotal();
  }

  syncPackageTotal(): number {
    this.data.blueberryPackages = this.safe(this.data.warehousePackages)
      + this.safe(this.data.storeBackroomPackages)
      + this.totalShelfStock()
      + this.data.storeState.customers.reduce((sum, customer) => sum + this.safe(customer.carriedPackages), 0);
    return this.data.blueberryPackages;
  }

  clamp(): void {
    this.data.rawBlueberries = this.safe(this.data.rawBlueberries);
    this.data.warehousePackages = this.safe(this.data.warehousePackages);
    this.data.storeBackroomPackages = this.safe(this.data.storeBackroomPackages);
    this.data.money = this.safe(this.data.money);
    for (const shelf of this.data.shelves) {
      shelf.capacity = Math.max(1, Math.floor(this.safe(shelf.capacity)));
      shelf.currentItems = Math.min(shelf.capacity, Math.floor(this.safe(shelf.currentItems)));
    }
    this.syncPackageTotal();
  }

  private safe(value: number): number {
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }
}
