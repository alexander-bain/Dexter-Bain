import { BALANCE } from "../data/balance";
import { CUSTOMER_TYPES } from "../data/customerTypes";
import type { CustomerType, GameSave, SpecialOrder, StoreAwayReport, StoreCustomerState } from "../types";
import type { EconomySnapshot } from "./EconomySystem";
import { InventorySystem } from "./InventorySystem";

export interface StoreEvent {
  type: "arrival" | "picked" | "sale" | "left" | "restocked";
  customer?: StoreCustomerState;
  earned?: number;
  sold?: number;
  shelfId?: string;
  moved?: number;
  automatic?: boolean;
}

export interface SaleResult {
  sold: number;
  earned: number;
  product: string;
}

export interface RestockResult {
  ok: boolean;
  moved: number;
  charged: number;
  message: string;
}

const emptySale = (product: string): SaleResult => ({ sold: 0, earned: 0, product });

export class StoreSystem {
  private events: StoreEvent[] = [];

  constructor(
    readonly data: GameSave,
    private readonly inventory: InventorySystem,
    private readonly snapshot: () => EconomySnapshot
  ) {}

  tick(seconds: number, away: boolean): void {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    const snapshot = this.snapshot();
    const state = this.data.storeState;

    for (const customer of [...state.customers]) {
      if (customer.phase === "browsing") this.shop(customer, seconds, away);
      customer.patienceSeconds -= seconds;
      if (customer.patienceSeconds <= 0) this.removeCustomer(customer, "left", away);
    }

    const shelfStock = this.inventory.totalShelfStock();
    if (shelfStock <= 0) {
      for (const customer of [...state.customers]) {
        if (customer.carriedPackages <= 0) this.removeCustomer(customer, "left", away);
        else customer.phase = "waiting";
      }
      state.arrivalProgress = 0;
    } else {
      state.arrivalProgress += seconds;
      while (state.arrivalProgress >= snapshot.arrivalSeconds) {
        state.arrivalProgress -= snapshot.arrivalSeconds;
        if (state.customers.length < snapshot.queueCapacity) this.addCustomer(snapshot, away);
        else this.recordLostCustomer(away);
      }
    }

    const waiting = () => state.customers.find((customer) => customer.phase === "waiting" && customer.carriedPackages > 0);
    if (snapshot.cashierLevel > 0 && waiting()) {
      state.checkoutProgress += seconds * snapshot.activeCheckoutLanes;
      while (state.checkoutProgress >= snapshot.checkoutSeconds && waiting()) {
        state.checkoutProgress -= snapshot.checkoutSeconds;
        this.sellCustomer(waiting()!, false, away);
      }
    } else if (!waiting()) {
      state.checkoutProgress = 0;
    }

    this.tickJanitor(seconds, away);
    this.data.specialOrderCooldownSeconds = Math.max(0, this.data.specialOrderCooldownSeconds - seconds);
    if (!this.data.specialOrder && this.data.specialOrderCooldownSeconds <= 0 && this.inventory.totalShelfStock() >= 6) {
      this.data.specialOrder = this.createSpecialOrder();
    }
    this.inventory.syncPackageTotal();
  }

  manualServe(): SaleResult {
    const customer = this.data.storeState.customers.find((entry) => entry.phase === "waiting" && entry.carriedPackages > 0);
    if (!customer) return emptySale("Blueberry Package");
    return this.sellCustomer(customer, true, false);
  }

  serveType(customer: CustomerType): SaleResult {
    const targetPackages = customer.basketSize + Math.floor(this.snapshot().storeLevel / 5);
    const temporary: StoreCustomerState = {
      id: -1,
      typeId: customer.id,
      phase: "waiting",
      browseSeconds: 0,
      patienceSeconds: 10,
      targetPackages,
      carriedPackages: 0,
      shelfId: null,
      shoppingProgress: 0
    };
    while (temporary.carriedPackages < targetPackages) {
      const shelfId = this.inventory.takeOneFromShelf(temporary.shelfId);
      if (!shelfId) break;
      temporary.shelfId = shelfId;
      temporary.carriedPackages += 1;
    }
    this.inventory.syncPackageTotal();
    return this.sellCustomer(temporary, false, false, false);
  }

  restockShelf(shelfId: string, automatic = false): RestockResult {
    const shelf = this.inventory.shelf(shelfId);
    if (!shelf) return { ok: false, moved: 0, charged: 0, message: "That shelf could not be found." };
    if (shelf.currentItems >= shelf.capacity) return { ok: false, moved: 0, charged: 0, message: "That shelf is already full. No charge." };
    if (this.data.storeBackroomPackages < 1) return { ok: false, moved: 0, charged: 0, message: "The backroom has no packages. No charge." };
    if (this.data.money < shelf.restockCost) return { ok: false, moved: 0, charged: 0, message: `You need $${shelf.restockCost} to restock. No charge.` };
    const moved = this.inventory.restockShelf(shelfId);
    if (moved <= 0) return { ok: false, moved: 0, charged: 0, message: "Nothing moved. No charge." };
    this.data.money -= shelf.restockCost;
    this.data.totals.shelfRestockCount += 1;
    this.events.push({ type: "restocked", shelfId, moved, automatic });
    return { ok: true, moved, charged: shelf.restockCost, message: `${automatic ? "Janitor" : "You"} stocked ${moved} package${moved === 1 ? "" : "s"} for $${shelf.restockCost}.` };
  }

  completeSpecialOrder(answer: number): { ok: boolean; message: string; earned: number; correctAnswer: number } {
    const order = this.data.specialOrder;
    if (!order) return { ok: false, message: "That special order has already ended.", earned: 0, correctAnswer: 0 };
    if (answer !== order.requiredProducts) {
      this.data.specialOrder = null;
      this.data.specialOrderCooldownSeconds = BALANCE.specialOrderCooldownSeconds;
      return { ok: false, message: `Nice try! The answer was ${order.requiredProducts}.`, earned: 0, correctAnswer: order.requiredProducts };
    }
    if (this.inventory.totalShelfStock() < order.requiredProducts) {
      return { ok: false, message: `Stock ${order.requiredProducts} packages on shelves first.`, earned: 0, correctAnswer: order.requiredProducts };
    }
    this.inventory.consumeFromShelves(order.requiredProducts);
    this.data.money += order.rewardMoney;
    this.data.totals.moneyEarned += order.rewardMoney;
    this.recordPackagesSold(order.requiredProducts);
    this.data.totals.specialOrdersCompleted += 1;
    this.data.mathPower = Math.min(BALANCE.mathPowerMax, this.data.mathPower + 10);
    this.data.totals.mathPowerEarned += 10;
    this.data.specialOrder = null;
    this.data.specialOrderCooldownSeconds = BALANCE.specialOrderCooldownSeconds;
    return { ok: true, message: `Special order complete! +$${order.rewardMoney} and +10 Math Power`, earned: order.rewardMoney, correctAnswer: order.requiredProducts };
  }

  consumeEvents(): StoreEvent[] {
    const result = this.events;
    this.events = [];
    return result;
  }

  consumeAwayReport(): StoreAwayReport | null {
    const report = { ...this.data.awayReport };
    if (report.customersServed + report.customersLeft + report.productsSold + report.moneyEarned <= 0) return null;
    this.data.awayReport = { customersServed: 0, productsSold: 0, moneyEarned: 0, customersLeft: 0 };
    return report;
  }

  status(): string {
    const stock = this.inventory.totalShelfStock();
    if (stock <= 0 && this.data.storeBackroomPackages > 0) return "RESTOCK A SHELF FOR $10";
    if (stock <= 0) return "STORE NEEDS BLUEBERRY PACKAGES";
    if (stock < Math.max(3, this.snapshot().shelfCapacity * 0.2)) return "SHELVES ARE NEARLY EMPTY";
    if (this.data.storeState.customers.length >= this.snapshot().queueCapacity) return "CUSTOMER LINE IS FULL";
    return "CUSTOMERS ARE BUYING PACKAGES";
  }

  private shop(customer: StoreCustomerState, seconds: number, away: boolean): void {
    customer.browseSeconds -= seconds;
    if (customer.browseSeconds > 0) return;
    customer.shoppingProgress += seconds;
    while (customer.shoppingProgress >= 0.45 && customer.carriedPackages < customer.targetPackages) {
      customer.shoppingProgress -= 0.45;
      const shelfId = this.inventory.takeOneFromShelf(customer.shelfId);
      if (!shelfId) break;
      customer.shelfId = shelfId;
      customer.carriedPackages += 1;
      if (!away) this.events.push({ type: "picked", customer: { ...customer }, shelfId });
    }
    if (customer.carriedPackages >= customer.targetPackages || this.inventory.totalShelfStock() <= 0) {
      if (customer.carriedPackages > 0) customer.phase = "waiting";
      else this.removeCustomer(customer, "left", away);
    }
  }

  private tickJanitor(seconds: number, away: boolean): void {
    const janitor = this.data.storeState.janitor;
    const hired = this.data.upgradeLevels["hire-janitor"] > 0;
    if (!hired || !this.data.settings.autoRestock) {
      janitor.phase = "idle";
      janitor.targetShelfId = null;
      janitor.progress = 0;
      janitor.carryingPackages = 0;
      return;
    }
    if (janitor.phase === "idle") {
      const target = this.data.shelves.find((shelf) => shelf.currentItems / shelf.capacity <= BALANCE.shelfLowThreshold);
      if (!target || this.data.storeBackroomPackages < 1 || this.data.money < BALANCE.shelfRestockCost) return;
      janitor.phase = "to-backroom";
      janitor.targetShelfId = target.shelfId;
      janitor.progress = 0;
    }
    const durations = { "to-backroom": 1.2, "to-shelf": 2.2, restocking: 0.9, returning: 1.5, idle: 1 } as const;
    janitor.progress += seconds / durations[janitor.phase];
    if (janitor.progress < 1) return;
    janitor.progress = 0;
    if (janitor.phase === "to-backroom") {
      const shelf = janitor.targetShelfId ? this.inventory.shelf(janitor.targetShelfId) : undefined;
      janitor.carryingPackages = shelf ? Math.min(this.data.storeBackroomPackages, shelf.capacity - shelf.currentItems) : 0;
      janitor.phase = janitor.carryingPackages > 0 ? "to-shelf" : "returning";
    } else if (janitor.phase === "to-shelf") {
      janitor.phase = "restocking";
    } else if (janitor.phase === "restocking") {
      if (janitor.targetShelfId) this.restockShelf(janitor.targetShelfId, true);
      janitor.carryingPackages = 0;
      janitor.phase = "returning";
    } else if (janitor.phase === "returning") {
      janitor.phase = "idle";
      janitor.targetShelfId = null;
      if (away) this.events = this.events.filter((event) => event.type !== "restocked");
    }
  }

  private addCustomer(snapshot: EconomySnapshot, away: boolean): void {
    const available = CUSTOMER_TYPES.filter((type) => type.unlockStoreLevel <= snapshot.storeLevel);
    const type = available[Math.floor(Math.random() * available.length)] ?? CUSTOMER_TYPES[0];
    const customer: StoreCustomerState = {
      id: this.data.storeState.nextCustomerId++,
      typeId: type.id,
      phase: "browsing",
      browseSeconds: 0.7 + Math.random() * 0.8,
      patienceSeconds: snapshot.patienceSeconds * type.patience,
      targetPackages: type.basketSize + Math.floor(snapshot.storeLevel / 5),
      carriedPackages: 0,
      shelfId: this.data.shelves.find((shelf) => shelf.currentItems > 0)?.shelfId ?? null,
      shoppingProgress: 0
    };
    this.data.storeState.customers.push(customer);
    if (!away) this.events.push({ type: "arrival", customer: { ...customer } });
  }

  private sellCustomer(customer: StoreCustomerState, manual: boolean, away: boolean, remove = true): SaleResult {
    const type = CUSTOMER_TYPES.find((entry) => entry.id === customer.typeId) ?? CUSTOMER_TYPES[0];
    const snapshot = this.snapshot();
    const sold = Math.max(0, Math.floor(customer.carriedPackages));
    const product = "Blueberry Package";
    if (sold <= 0) return emptySale(product);
    const earned = Math.max(1, Math.round(sold * snapshot.productValue * type.valueMultiplier));
    customer.carriedPackages = 0;
    this.data.money += earned;
    this.data.totals.moneyEarned += earned;
    this.recordPackagesSold(sold);
    this.data.totals.customersServed += 1;
    if (manual) this.data.totals.manualCheckouts += 1;
    if (away) {
      this.data.awayReport.customersServed += 1;
      this.data.awayReport.productsSold += sold;
      this.data.awayReport.moneyEarned += earned;
    }
    if (remove) {
      this.data.storeState.customers = this.data.storeState.customers.filter((entry) => entry.id !== customer.id);
      if (!away) this.events.push({ type: "sale", customer: { ...customer }, earned, sold });
    }
    this.inventory.syncPackageTotal();
    return { sold, earned, product };
  }

  private recordPackagesSold(amount: number): void {
    this.data.totals.productsSold += amount;
    this.data.totals.totalPackagesSold += amount;
  }

  private removeCustomer(customer: StoreCustomerState, event: "left", away: boolean): void {
    if (customer.carriedPackages > 0) this.data.storeBackroomPackages += customer.carriedPackages;
    customer.carriedPackages = 0;
    this.data.storeState.customers = this.data.storeState.customers.filter((entry) => entry.id !== customer.id);
    this.data.totals.customersLost += 1;
    if (away) this.data.awayReport.customersLeft += 1;
    if (!away) this.events.push({ type: event, customer: { ...customer } });
    this.inventory.syncPackageTotal();
  }

  private recordLostCustomer(away: boolean): void {
    this.data.totals.customersLost += 1;
    if (away) this.data.awayReport.customersLeft += 1;
  }

  private createSpecialOrder(): SpecialOrder {
    let a = 2;
    let b = 3;
    const stock = this.inventory.totalShelfStock();
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const nextA = 2 + Math.floor(Math.random() * 5);
      const nextB = 2 + Math.floor(Math.random() * 5);
      if (nextA * nextB <= stock) { a = nextA; b = nextB; break; }
    }
    const requiredProducts = a * b;
    return {
      a,
      b,
      requiredProducts,
      rewardMoney: Math.max(25, Math.round(requiredProducts * this.snapshot().productValue * 2)),
      createdAt: Date.now()
    };
  }
}
