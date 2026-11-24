import { BALANCE } from "../data/balance";
import { CUSTOMER_TYPES } from "../data/customerTypes";
import type { CustomerType, GameSave, SpecialOrder, StoreAwayReport, StoreCustomerState } from "../types";
import type { EconomySnapshot } from "./EconomySystem";
import { InventorySystem } from "./InventorySystem";

export interface StoreEvent {
  type: "arrival" | "sale" | "left";
  customer: StoreCustomerState;
  earned?: number;
  sold?: number;
}

export interface SaleResult {
  sold: number;
  earned: number;
  product: string;
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

    for (const customer of state.customers) {
      if (customer.phase === "browsing") {
        customer.browseSeconds -= seconds;
        if (customer.browseSeconds <= 0) customer.phase = "waiting";
      }
      customer.patienceSeconds -= seconds;
    }
    for (const customer of [...state.customers]) {
      if (customer.patienceSeconds <= 0) this.removeCustomer(customer, "left", away);
    }

    if (this.data.storeInventory <= 0) {
      for (const customer of [...state.customers]) this.removeCustomer(customer, "left", away);
      state.arrivalProgress = 0;
      state.checkoutProgress = 0;
    } else {
      state.arrivalProgress += seconds;
      while (state.arrivalProgress >= snapshot.arrivalSeconds) {
        state.arrivalProgress -= snapshot.arrivalSeconds;
        if (state.customers.length < snapshot.queueCapacity) this.addCustomer(snapshot, away);
        else this.recordLostCustomer(away);
      }
    }

    const waiting = () => state.customers.find((customer) => customer.phase === "waiting");
    if (snapshot.cashierLevel > 0 && waiting() && this.data.storeInventory > 0) {
      state.checkoutProgress += seconds * snapshot.activeCheckoutLanes;
      while (state.checkoutProgress >= snapshot.checkoutSeconds && waiting() && this.data.storeInventory > 0) {
        state.checkoutProgress -= snapshot.checkoutSeconds;
        this.sellCustomer(waiting()!, false, away);
      }
    } else if (!waiting()) {
      state.checkoutProgress = 0;
    }

    this.data.specialOrderCooldownSeconds = Math.max(0, this.data.specialOrderCooldownSeconds - seconds);
    if (!this.data.specialOrder && this.data.specialOrderCooldownSeconds <= 0 && this.data.storeInventory >= 6) {
      this.data.specialOrder = this.createSpecialOrder();
    }
  }

  manualServe(): SaleResult {
    const customer = this.data.storeState.customers.find((entry) => entry.phase === "waiting");
    if (!customer) return emptySale("Blueberry product");
    return this.sellCustomer(customer, true, false);
  }

  serveType(customer: CustomerType): SaleResult {
    const temporary: StoreCustomerState = { id: -1, typeId: customer.id, phase: "waiting", browseSeconds: 0, patienceSeconds: 10 };
    return this.sellCustomer(temporary, false, false, false);
  }

  completeSpecialOrder(answer: number): { ok: boolean; message: string; earned: number; correctAnswer: number } {
    const order = this.data.specialOrder;
    if (!order) return { ok: false, message: "That special order has already ended.", earned: 0, correctAnswer: 0 };
    if (answer !== order.requiredProducts) {
      this.data.specialOrder = null;
      this.data.specialOrderCooldownSeconds = BALANCE.specialOrderCooldownSeconds;
      return { ok: false, message: `Nice try! The answer was ${order.requiredProducts}.`, earned: 0, correctAnswer: order.requiredProducts };
    }
    if (this.data.storeInventory < order.requiredProducts) {
      return { ok: false, message: `Stock ${order.requiredProducts} products first.`, earned: 0, correctAnswer: order.requiredProducts };
    }
    this.inventory.consumeStore(order.requiredProducts);
    this.data.money += order.rewardMoney;
    this.data.totals.moneyEarned += order.rewardMoney;
    this.data.totals.productsSold += order.requiredProducts;
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
    if (this.data.storeInventory <= 0) return "STORE NEEDS MORE PRODUCTS";
    if (this.data.storeInventory < Math.max(3, this.snapshot().shelfCapacity * 0.2)) return "SHELVES ARE NEARLY EMPTY";
    if (this.data.storeState.customers.length >= this.snapshot().queueCapacity) return "CUSTOMER LINE IS FULL";
    return "CUSTOMERS ARE SHOPPING";
  }

  private addCustomer(snapshot: EconomySnapshot, away: boolean): void {
    const available = CUSTOMER_TYPES.filter((type) => type.unlockStoreLevel <= snapshot.storeLevel);
    const type = available[Math.floor(Math.random() * available.length)] ?? CUSTOMER_TYPES[0];
    const customer: StoreCustomerState = {
      id: this.data.storeState.nextCustomerId++,
      typeId: type.id,
      phase: "browsing",
      browseSeconds: 2.2 + Math.random() * 1.8,
      patienceSeconds: snapshot.patienceSeconds * type.patience
    };
    this.data.storeState.customers.push(customer);
    if (!away) this.events.push({ type: "arrival", customer: { ...customer } });
  }

  private sellCustomer(customer: StoreCustomerState, manual: boolean, away: boolean, remove = true): SaleResult {
    const type = CUSTOMER_TYPES.find((entry) => entry.id === customer.typeId) ?? CUSTOMER_TYPES[0];
    const snapshot = this.snapshot();
    const basketLevelBonus = Math.floor(snapshot.storeLevel / 5);
    const sold = Math.min(Math.max(0, Math.floor(this.data.storeInventory)), type.basketSize + basketLevelBonus);
    const product = snapshot.selectedProductName;
    if (sold <= 0) return emptySale(product);
    this.inventory.consumeStore(sold);
    const earned = Math.max(1, Math.round(sold * snapshot.productValue * type.valueMultiplier));
    this.data.money += earned;
    this.data.totals.moneyEarned += earned;
    this.data.totals.productsSold += sold;
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
    return { sold, earned, product };
  }

  private removeCustomer(customer: StoreCustomerState, event: "left", away: boolean): void {
    this.data.storeState.customers = this.data.storeState.customers.filter((entry) => entry.id !== customer.id);
    this.data.totals.customersLost += 1;
    if (away) this.data.awayReport.customersLeft += 1;
    if (!away) this.events.push({ type: event, customer: { ...customer } });
  }

  private recordLostCustomer(away: boolean): void {
    this.data.totals.customersLost += 1;
    if (away) this.data.awayReport.customersLeft += 1;
  }

  private createSpecialOrder(): SpecialOrder {
    let a = 2;
    let b = 3;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const nextA = 2 + Math.floor(Math.random() * 5);
      const nextB = 2 + Math.floor(Math.random() * 5);
      if (nextA * nextB <= this.data.storeInventory) { a = nextA; b = nextB; break; }
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
