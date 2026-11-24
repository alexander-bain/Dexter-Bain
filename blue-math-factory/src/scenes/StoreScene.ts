import Phaser from "phaser";
import { ArtFactory } from "../art/ArtFactory";
import { BALANCE, COLORS } from "../data/balance";
import { CUSTOMER_TYPES } from "../data/customerTypes";
import { Customer } from "../entities/Customer";
import { session } from "../systems/GameSession";
import type { StoreCustomerState } from "../types";
import { ui } from "../ui/UIBridge";
import { BaseWorldScene } from "./BaseWorldScene";

export class StoreScene extends BaseWorldScene {
  private customers = new Map<number, Customer>();
  private purchased = false;
  private crazeReady = true;
  private queueLabel!: Phaser.GameObjects.Text;
  private inventoryLabel!: Phaser.GameObjects.Text;
  private statusLabel!: Phaser.GameObjects.Text;
  private queueSignature = "";
  private holdSeconds = 0;
  private holdLabel!: Phaser.GameObjects.Text;
  private lastSpecialOrderCreatedAt = 0;

  constructor() { super("StoreScene"); }

  create(): void {
    this.prepareWorld();
    this.customers.clear();
    this.drawStore();
    this.setupWorld(960, 1010);
    this.addInteraction(150, 1000, "Return to Hub", () => this.transitionTo("HubScene"), 120);
    this.addInteraction(960, 465, "Serve Next Customer", () => this.serveNext(), 150);
    this.addInteraction(1360, 940, "Open Special Order", () => this.openSpecialOrder(), 125);
    this.addInteraction(1280, 960, "Start Customer Craze", () => this.activateCraze(), 105);
    this.syncCustomers(true);
    if (this.entryReport) this.time.delayedCall(280, () => ui.showAwaySummary(this.entryReport!));
    this.time.delayedCall(8_000, () => { if (Math.random() < .35) this.spawnGoldenBlueberry(); });
    this.cameras.main.fadeIn(280, 28, 18, 77);
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    if (this.frozen) return;
    this.handleStoreEvents();
    this.syncCustomers(false);
    this.updateLabels();
    this.updateUpgradePlatform(delta / 1000);
    const order = session.data.specialOrder;
    if (order && order.createdAt !== this.lastSpecialOrderCreatedAt) {
      this.lastSpecialOrderCreatedAt = order.createdAt;
      ui.showToast("SPECIAL ORDER READY! Visit the gold order desk.", "info");
    }
  }

  private serveNext(): void {
    const result = session.economy.store.manualServe();
    if (result.sold <= 0) {
      ui.showToast(session.data.storeInventory <= 0 ? "STORE NEEDS MORE PRODUCTS" : "No customer is ready at checkout yet.", "info");
      return;
    }
    session.audio.play("checkout");
    session.save("StoreScene");
    for (const message of session.checkQuests()) ui.showToast(message);
  }

  private handleStoreEvents(): void {
    for (const event of session.economy.store.consumeEvents()) {
      if (event.type === "arrival") continue;
      const customer = this.customers.get(event.customer.id);
      if (!customer) continue;
      this.customers.delete(event.customer.id);
      if (event.type === "sale") {
        session.audio.play("checkout");
        this.coinBurst(customer.sprite.x, customer.sprite.y - 20, event.earned ?? 0);
        customer.leave(1100, 1125, true, () => undefined);
      } else {
        customer.leave(820, 1125, false, () => undefined);
      }
    }
  }

  private syncCustomers(immediate: boolean): void {
    const states = session.data.storeState.customers;
    for (const state of states) {
      if (!this.customers.has(state.id)) {
        const type = CUSTOMER_TYPES.find((entry) => entry.id === state.typeId) ?? CUSTOMER_TYPES[0];
        const customer = new Customer(this, type, 960, immediate ? 1010 : 1110, state.patienceSeconds);
        this.customers.set(state.id, customer);
        if (!immediate) {
          const shelfX = state.id % 2 ? 350 : 1570;
          customer.moveTo(shelfX, 545 + state.id % 3 * 150, 650);
        }
      }
    }
    for (const [id, customer] of this.customers) {
      if (!states.some((state) => state.id === id)) {
        customer.sprite.destroy();
        this.customers.delete(id);
      }
    }
    const signature = states.map((state) => `${state.id}:${state.phase}`).join("|");
    if (signature === this.queueSignature) return;
    this.queueSignature = signature;
    states.forEach((state, index) => this.positionCustomer(state, index, immediate));
  }

  private positionCustomer(state: StoreCustomerState, index: number, immediate: boolean): void {
    const customer = this.customers.get(state.id);
    if (!customer) return;
    let x: number;
    let y: number;
    if (state.phase === "browsing") {
      x = state.id % 2 ? 370 : 1550;
      y = 440 + state.id % 3 * 220;
    } else {
      const waiting = session.data.storeState.customers.filter((entry) => entry.phase === "waiting");
      const queueIndex = waiting.findIndex((entry) => entry.id === state.id);
      x = 895 + queueIndex % 2 * 130;
      y = 585 + Math.floor(queueIndex / 2) * 105;
      customer.state = "waiting";
    }
    if (immediate) customer.sprite.setPosition(x, y).setDepth(y);
    else customer.moveTo(x, y, 460 + index * 35, () => { customer.state = state.phase === "waiting" ? "waiting" : "entering"; });
  }

  private updateLabels(): void {
    const snapshot = session.economy.snapshot();
    const waiting = session.data.storeState.customers.filter((customer) => customer.phase === "waiting").length;
    this.queueLabel.setText(`CUSTOMER LINE  ${waiting}/${snapshot.queueCapacity}\n${snapshot.cashierLevel ? `${snapshot.activeCheckoutLanes} lane${snapshot.activeCheckoutLanes === 1 ? "" : "s"} · ${snapshot.checkoutSeconds.toFixed(1)} sec checkout` : "YOU ARE THE CASHIER"}`);
    this.inventoryLabel.setText(`SHELF STOCK  ${Math.floor(session.data.storeInventory)} / ${Math.floor(snapshot.shelfCapacity)}\n$${snapshot.productValue.toFixed(0)} each · about $${Math.floor(snapshot.expectedIncomePerMinute)}/min`);
    this.statusLabel.setText(session.economy.store.status());
    this.statusLabel.setColor(session.data.storeInventory <= 0 ? "#ff8d8d" : "#79efbd");
  }

  private updateUpgradePlatform(seconds: number): void {
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, 1670, 885);
    if (distance <= 92) {
      this.holdSeconds = Math.min(5, this.holdSeconds + seconds);
      this.holdLabel.setText(`BUILDING MENU ${Math.ceil(5 - this.holdSeconds)}s\n${"●".repeat(Math.floor(this.holdSeconds))}${"○".repeat(5 - Math.floor(this.holdSeconds))}`);
      if (this.holdSeconds >= 5) {
        this.holdSeconds = 0;
        this.openUpgrades();
      }
    } else {
      this.holdSeconds = 0;
      this.holdLabel.setText("STAND HERE 5 SECONDS\nTO UPGRADE STORE");
    }
  }

  private openUpgrades(): void {
    if (this.frozen) return;
    this.frozen = true;
    this.physics.world.pause();
    this.purchased = false;
    ui.showUpgradePanel("store", () => {
      this.frozen = false;
      this.physics.world.resume();
      if (this.purchased) this.scene.restart();
    }, (id) => {
      const result = session.economy.upgrades.buy(id);
      if (result.ok) {
        this.purchased = true;
        session.audio.play("upgrade");
        session.save("StoreScene");
        ui.showPurchaseCelebration(result.message);
      } else {
        session.audio.play("wrong");
        ui.announce(result.message);
      }
    });
  }

  private openSpecialOrder(): void {
    const order = session.data.specialOrder;
    if (!order) {
      ui.showToast("No special order yet. Keep the shelves stocked!", "info");
      return;
    }
    this.frozen = true;
    this.physics.world.pause();
    ui.showSpecialOrder(order, (answer) => {
      const result = session.economy.store.completeSpecialOrder(answer);
      if (result.ok) session.audio.play("correct"); else session.audio.play("wrong");
      session.save("StoreScene");
      ui.showToast(result.message, result.ok ? "good" : "info");
      this.frozen = false;
      this.physics.world.resume();
      ui.showHUD("StoreScene", () => this.pauseGame());
    }, () => {
      this.frozen = false;
      this.physics.world.resume();
      ui.showHUD("StoreScene", () => this.pauseGame());
    });
  }

  private activateCraze(): void {
    if (!this.crazeReady) { ui.showToast("Customer Craze is recharging.", "info"); return; }
    this.crazeReady = false;
    session.activateBoost("customers");
    session.audio.play("upgrade");
    ui.showToast("CUSTOMER CRAZE! More shoppers for 30 seconds.");
    for (let index = 0; index < 18; index += 1) {
      const sparkle = this.add.text(1280, 900, index % 2 ? "★" : "🫐", { fontSize: "22px", color: "#ffdb63", stroke: "#2c1a70", strokeThickness: 4 }).setOrigin(.5).setDepth(3000);
      const angle = index / 18 * Math.PI * 2;
      this.tweens.add({ targets: sparkle, x: sparkle.x + Math.cos(angle) * Phaser.Math.Between(80, 180), y: sparkle.y + Math.sin(angle) * Phaser.Math.Between(60, 140), alpha: 0, duration: 800, onComplete: () => sparkle.destroy() });
    }
    this.time.delayedCall(30_000, () => { this.crazeReady = true; });
  }

  private coinBurst(x: number, y: number, earned: number): void {
    for (let index = 0; index < 8; index += 1) {
      const coin = this.add.image(x, y, "coin").setScale(.55).setDepth(3000);
      const angle = index / 8 * Math.PI * 2;
      this.tweens.add({ targets: coin, x: x + Math.cos(angle) * Phaser.Math.Between(50, 120), y: y + Math.sin(angle) * Phaser.Math.Between(40, 95), angle: 180, alpha: 0, duration: 650, onComplete: () => coin.destroy() });
    }
    const amount = this.add.text(x, y - 60, `+$${earned}`, { fontFamily: "Trebuchet MS", fontSize: "28px", fontStyle: "bold", color: "#ffda59", stroke: "#26186d", strokeThickness: 7 }).setOrigin(.5).setDepth(3001);
    this.tweens.add({ targets: amount, y: y - 125, alpha: 0, duration: 950, onComplete: () => amount.destroy() });
  }

  private spawnGoldenBlueberry(): void {
    if (this.frozen) return;
    const golden = this.add.image(1450, 720, "berry").setTint(0xffd34e).setScale(1.25).setDepth(2200).setInteractive({ useHandCursor: true });
    const glow = this.add.circle(1450, 720, 42, COLORS.gold, .2).setDepth(2199);
    const label = this.add.text(1450, 665, "GOLDEN BERRY!", { fontFamily: "Trebuchet MS", fontSize: "16px", fontStyle: "bold", color: "#fff4a8", stroke: "#3a247a", strokeThickness: 6 }).setOrigin(.5).setDepth(2201);
    this.tweens.add({ targets: [golden, glow], scale: 1.5, duration: 550, yoyo: true, repeat: -1 });
    golden.once("pointerdown", () => {
      session.data.money += 50;
      session.data.totals.moneyEarned += 50;
      session.audio.play("coin");
      ui.showToast("Golden Blueberry! +$50");
      this.coinBurst(golden.x, golden.y, 50);
      golden.destroy(); glow.destroy(); label.destroy(); session.save("StoreScene");
    });
    this.time.delayedCall(9_000, () => { if (golden.active) { golden.destroy(); glow.destroy(); label.destroy(); } });
  }

  private drawStore(): void {
    const snapshot = session.economy.snapshot();
    const graphics = this.add.graphics().setDepth(-50);
    graphics.fillGradientStyle(0x2a2368, 0x2a2368, 0x4c3994, 0x4c3994).fillRect(0, 0, BALANCE.worldWidth, BALANCE.worldHeight);
    graphics.fillStyle(0xead5ad).fillRoundedRect(55, 80, 1810, 1040, 34);
    graphics.fillStyle(session.economy.upgrades.has("store-expansion") ? 0xfff5df : 0xf8ead0).fillRoundedRect(85, 110, 1750, 975, 27);
    graphics.fillStyle(0xd2b98a, .24);
    for (let x = 95; x < 1825; x += 88) for (let y = 275; y < 1080; y += 88) graphics.fillRect(x - 38, y - 18, 76, 36);
    graphics.fillStyle(0x513596).fillRoundedRect(70, 90, 1780, 170, 25);
    graphics.fillStyle(0x80eaff, .18).fillRoundedRect(130, 118, 470, 95, 18).fillRoundedRect(725, 118, 470, 95, 18).fillRoundedRect(1320, 118, 470, 95, 18);
    this.add.text(960, 166, session.economy.upgrades.has("megastore") ? "BLUEBERRY MEGASTORE" : snapshot.storeLevel < 10 ? "THE LITTLE BLUEBERRY SHOP" : "BLUEBERRY MARKET", { fontFamily: "Trebuchet MS", fontSize: "35px", fontStyle: "bold", color: "#ffffff", stroke: "#281769", strokeThickness: 9 }).setOrigin(.5).setDepth(20);

    if (session.economy.upgrades.has("parking")) {
      const parking = this.add.graphics().setDepth(40);
      parking.fillStyle(0x4c4f68).fillRoundedRect(655, 1025, 610, 125, 16);
      parking.lineStyle(4, 0xf7e7a7, .85);
      for (let x = 700; x <= 1190; x += 120) parking.lineBetween(x, 1040, x - 30, 1135);
      for (let index = 0; index < Math.min(3, session.economy.upgrades.level("parking")); index += 1) {
        const car = this.add.container(760 + index * 170, 1090).setDepth(45);
        car.add([this.add.rectangle(0, 0, 105, 42, [0x65d6e8,0xef7777,0xffc65d][index]).setStrokeStyle(4, 0x25234b), this.add.rectangle(0, -18, 58, 26, 0xbcefff).setStrokeStyle(3, 0x25234b), this.add.circle(-32, 24, 12, 0x222238), this.add.circle(32, 24, 12, 0x222238)]);
      }
    }

    if (session.economy.upgrades.has("better-lighting")) {
      for (let x = 260; x <= 1660; x += 280) {
        this.add.ellipse(x, 278, 170, 34, 0xfff4bd, .3).setBlendMode(Phaser.BlendModes.ADD).setDepth(30);
        this.add.rectangle(x, 245, 112, 16, 0xffe681).setStrokeStyle(3, 0xffffff, .6).setDepth(31);
      }
    }
    if (session.economy.upgrades.has("music-system")) {
      [250, 1670].forEach((x) => this.add.text(x, 210, "🔊", { fontSize: "34px" }).setOrigin(.5).setDepth(35));
    }
    if (session.economy.upgrades.has("neon-sign")) {
      const neon = this.add.text(960, 225, "🫐  FRESH • FUN • BLUE  🫐", { fontFamily: "Trebuchet MS", fontSize: "23px", fontStyle: "bold", color: "#92f4ff", stroke: "#3e28a0", strokeThickness: 7 }).setOrigin(.5).setDepth(42);
      this.tweens.add({ targets: neon, alpha: .6, duration: 650, yoyo: true, repeat: -1 });
    }

    const registerCount = Math.min(3, snapshot.registers);
    for (let index = 0; index < registerCount; index += 1) {
      const x = 960 + (index - (registerCount - 1) / 2) * 265;
      const counter = this.add.container(x, 420).setDepth(500);
      const counterG = this.add.graphics();
      counterG.fillStyle(0x513aaf).fillRoundedRect(-112, -66, 224, 108, 18);
      counterG.fillStyle(0x8b72e6).fillRoundedRect(-104, -80, 208, 28, 10);
      counterG.lineStyle(5, 0x2d216b).strokeRoundedRect(-112, -66, 224, 108, 18);
      const register = this.add.graphics();
      register.fillStyle(0x2e355d).fillRoundedRect(-38, -130, 76, 68, 12);
      register.fillStyle(0x7ce8ff).fillRoundedRect(-28, -119, 56, 31, 7);
      counter.add([counterG, register, this.add.text(0, -103, `$${index + 1}`, { fontFamily: "Trebuchet MS", fontSize: "18px", fontStyle: "bold", color: "#244c70" }).setOrigin(.5), this.add.text(0, -8, "CHECKOUT", { fontFamily: "Trebuchet MS", fontSize: "15px", fontStyle: "bold", color: "#ffffff", stroke: "#342074", strokeThickness: 5 }).setOrigin(.5)]);
      this.addBlocker(x, 410, 235, 120);
      if (index < snapshot.activeCheckoutLanes) {
        const cashier = this.add.sprite(x, 320, "cashier").setScale(.85).setDepth(380);
        this.tweens.add({ targets: cashier, y: cashier.y - 4, duration: 620 + index * 100, yoyo: true, repeat: -1 });
      }
    }
    if (!snapshot.cashierLevel) this.add.text(960, 325, "YOU ARE THE CASHIER", { fontFamily: "Trebuchet MS", fontSize: "13px", fontStyle: "bold", color: "#5c3fae", backgroundColor: "#fff6dc", padding: { x: 10, y: 6 } }).setOrigin(.5).setDepth(390);

    if (session.economy.upgrades.has("queue-ropes")) {
      const rows = Math.ceil(snapshot.queueCapacity / 2);
      const rope = this.add.graphics().setDepth(570);
      rope.lineStyle(8, 0xd84c78).lineBetween(805, 535, 805, 535 + rows * 105).lineBetween(1115, 535, 1115, 535 + rows * 105);
      for (let row = 0; row <= rows; row += 1) {
        rope.fillStyle(0xffd15d).fillCircle(805, 535 + row * 105, 12).fillCircle(1115, 535 + row * 105, 12);
        rope.fillStyle(0x4b327b).fillRect(799, 535 + row * 105, 12, 38).fillRect(1109, 535 + row * 105, 12, 38);
      }
    }
    this.queueLabel = this.add.text(960, 510, "", { align: "center", fontFamily: "Trebuchet MS", fontSize: "13px", fontStyle: "bold", color: "#5c3b9f", backgroundColor: "#fff8e6", padding: { x: 12, y: 6 }, stroke: "#ffffff", strokeThickness: 2 }).setOrigin(.5).setDepth(580);

    const shelfCount = Math.min(8, 3 + session.economy.upgrades.level("extra-shelf"));
    const fillRatio = snapshot.shelfCapacity ? session.data.storeInventory / snapshot.shelfCapacity : 0;
    const totalVisibleProducts = Math.round(fillRatio * shelfCount * 8);
    for (let index = 0; index < shelfCount; index += 1) {
      const column = index % 2;
      const x = column ? 1580 : 340;
      const y = 390 + Math.floor(index / 2) * 205;
      const shelf = this.add.container(x, y).setDepth(y).setScale(1 + Math.min(.16, session.economy.upgrades.level("better-display") * .032));
      const shelfG = this.add.graphics();
      shelfG.fillStyle(0x3b244e, .22).fillEllipse(12, 70, 330, 42);
      shelfG.fillStyle(0x7d4d3e).fillRoundedRect(-155, -82, 310, 152, 18);
      shelfG.fillStyle(0xd79b5d).fillRoundedRect(-145, -72, 290, 132, 12);
      shelfG.fillStyle(0x704133).fillRect(-146, -18, 292, 14).fillRect(-146, 42, 292, 14);
      shelfG.lineStyle(5, 0x5d3740).strokeRoundedRect(-155, -82, 310, 152, 18);
      shelf.add(shelfG);
      const visible = Math.max(0, Math.min(8, totalVisibleProducts - index * 8));
      for (let item = 0; item < visible; item += 1) {
        shelf.add(this.add.text(-112 + item % 4 * 74, item < 4 ? -49 : 12, ["🫐", "📦", "🧺", "🫙", "🧁", "🥤"][index % 6], { fontSize: "27px" }).setOrigin(.5));
      }
      const label = visible ? `${snapshot.selectedProductName.toUpperCase()}  $${snapshot.productValue.toFixed(0)}` : "OUT OF STOCK";
      shelf.add(this.add.text(0, 88, label, { fontFamily: "Trebuchet MS", fontSize: "12px", fontStyle: "bold", color: visible ? "#ffffff" : "#ff8b8b", backgroundColor: visible ? "#4c368f" : "#6f283d", padding: { x: 8, y: 5 } }).setOrigin(.5));
      this.addBlocker(x, y, 320, 160);
    }

    if (session.economy.upgrades.has("premium-display")) {
      const premium = this.add.container(610, 745).setDepth(760);
      premium.add([this.add.ellipse(0, 44, 230, 50, 0x261947, .22), this.add.rectangle(0, 0, 210, 100, 0x5637a4).setStrokeStyle(6, 0xffd95e), this.add.text(0, -10, "✨ PREMIUM PICKS ✨\n🫙  🧁  🥤", { align: "center", fontFamily: "Trebuchet MS", fontSize: "17px", fontStyle: "bold", color: "#fff7c8" }).setOrigin(.5)]);
      this.tweens.add({ targets: premium, scale: 1.03, duration: 900, yoyo: true, repeat: -1 });
    }
    if (session.economy.upgrades.has("seating")) {
      for (let index = 0; index < Math.min(3, session.economy.upgrades.level("seating")); index += 1) {
        const bench = this.add.container(1240 + index * 125, 720).setDepth(730);
        bench.add([this.add.rectangle(0, 0, 105, 26, 0x81503e).setStrokeStyle(4, 0x593449), this.add.rectangle(-38, 30, 10, 55, 0x593449), this.add.rectangle(38, 30, 10, 55, 0x593449)]);
      }
    }
    if (session.economy.upgrades.has("decorations")) {
      [[600,340],[1320,340],[630,850],[1290,850]].forEach(([x,y]) => {
        const pot = this.add.container(x,y).setDepth(y);
        pot.add([this.add.rectangle(0,0,42,34,0xc76573), this.add.circle(-12,-30,18,0x61bd6f), this.add.circle(12,-34,20,0x76d87b)]);
      });
    }
    if (session.economy.upgrades.has("cold-storage")) {
      const fridge = this.add.container(620, 950).setDepth(960);
      fridge.add([this.add.rectangle(0, 0, 190, 180, 0xbdefff).setStrokeStyle(7, 0x456bb0), this.add.rectangle(0, -5, 155, 135, 0x78c6e8, .55).setStrokeStyle(3, 0xffffff, .7), this.add.text(0, -78, "CHILLED", { fontFamily: "Trebuchet MS", fontSize: "14px", fontStyle: "bold", color: "#284c8d" }).setOrigin(.5), this.add.text(0, 12, "🥤  ❄️\n🧃  🫐", { align: "center", fontSize: "28px" }).setOrigin(.5)]);
      this.addBlocker(620, 950, 205, 190);
    }

    this.inventoryLabel = this.add.text(1240, 315, "", { fontFamily: "Trebuchet MS", fontSize: "15px", fontStyle: "bold", color: "#fff8d8", backgroundColor: "#38277e", padding: { x: 14, y: 9 }, stroke: "#21145d", strokeThickness: 4 }).setOrigin(.5).setDepth(600);
    this.statusLabel = this.add.text(680, 315, "", { fontFamily: "Trebuchet MS", fontSize: "16px", fontStyle: "bold", color: "#79efbd", backgroundColor: "#25195f", padding: { x: 14, y: 9 }, stroke: "#150d45", strokeThickness: 4 }).setOrigin(.5).setDepth(600);

    const terminal = this.add.container(1670, 885).setDepth(900);
    terminal.add([this.add.ellipse(0, 70, 210, 74, 0x392b80).setStrokeStyle(8, COLORS.mint), this.add.rectangle(0, -25, 170, 180, 0x392b80).setStrokeStyle(6, 0x24185f), this.add.rectangle(0, -50, 126, 75, 0x6be8ff).setStrokeStyle(4, 0xffffff, .5), this.add.text(0, -50, "STORE\nUPGRADES", { align: "center", fontFamily: "Trebuchet MS", fontSize: "17px", fontStyle: "bold", color: "#25316c" }).setOrigin(.5)]);
    this.holdLabel = this.add.text(1670, 1010, "STAND HERE 5 SECONDS\nTO UPGRADE STORE", { align: "center", fontFamily: "Trebuchet MS", fontSize: "13px", fontStyle: "bold", color: "#eafff6", backgroundColor: "#2d246f", padding: { x: 10, y: 7 } }).setOrigin(.5).setDepth(1000);
    this.addBlocker(1670, 830, 180, 160);

    const orderDesk = this.add.container(1360, 920).setDepth(930);
    orderDesk.add([this.add.rectangle(0, 0, 180, 95, 0x9a642c).setStrokeStyle(6, 0x5d3528), this.add.text(0, -58, "⭐ SPECIAL ORDER", { fontFamily: "Trebuchet MS", fontSize: "15px", fontStyle: "bold", color: "#fff1a6", stroke: "#3f246b", strokeThickness: 6 }).setOrigin(.5), this.add.text(0, 0, "MULTIPLY\nFOR A BONUS!", { align: "center", fontFamily: "Trebuchet MS", fontSize: "14px", fontStyle: "bold", color: "#ffffff" }).setOrigin(.5)]);
    const craze = this.add.container(1180, 970).setDepth(970);
    craze.add([this.add.ellipse(0, 0, 188, 72, 0x4d3ab0).setStrokeStyle(8, COLORS.mint), this.add.text(0, -4, "CUSTOMER CRAZE", { fontFamily: "Trebuchet MS", fontSize: "17px", fontStyle: "bold", color: "#d6ffe9", stroke: "#2a1c72", strokeThickness: 5 }).setOrigin(.5)]);
    this.tweens.add({ targets: craze, alpha: .72, duration: 650, yoyo: true, repeat: -1 });
    ArtFactory.portal(this, 150, 955, "HUB", [0x75e6ff, 0x4b45c9]).setScale(.72).setDepth(990);
    this.add.text(960, 1050, session.economy.upgrades.has("bigger-entrance") ? "GRAND ENTRANCE" : "ENTRANCE", { fontFamily: "Trebuchet MS", fontSize: "18px", fontStyle: "bold", color: "#6a4a95", backgroundColor: "#fff4cf", padding: { x: 16, y: 8 } }).setOrigin(.5).setDepth(1080);
    if (session.economy.upgrades.has("bigger-entrance")) {
      this.add.rectangle(960, 1090, 360, 18, 0x6d4ec5).setStrokeStyle(4, 0xffe38b).setDepth(1075);
      this.add.rectangle(790, 1038, 24, 112, 0x6d4ec5).setStrokeStyle(4, 0xffe38b).setDepth(1075);
      this.add.rectangle(1130, 1038, 24, 112, 0x6d4ec5).setStrokeStyle(4, 0xffe38b).setDepth(1075);
    }
    this.updateLabels();
  }
}
