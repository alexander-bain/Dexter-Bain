import Phaser from "phaser";
import { ArtFactory } from "../art/ArtFactory";
import { BALANCE, COLORS } from "../data/balance";
import { CUSTOMER_TYPES } from "../data/customerTypes";
import { Customer } from "../entities/Customer";
import { session } from "../systems/GameSession";
import { ui } from "../ui/UIBridge";
import { BaseWorldScene } from "./BaseWorldScene";

export class StoreScene extends BaseWorldScene {
  private queue: Customer[] = [];
  private arrivalTimer = 1.4;
  private checkoutTimer = 0;
  private purchased = false;
  private crazeReady = true;
  private queueLabel!: Phaser.GameObjects.Text;

  constructor() { super("StoreScene"); }

  create(): void {
    this.prepareWorld();
    this.queue = [];
    this.arrivalTimer = 1.4;
    this.checkoutTimer = 0;
    this.drawStore();
    this.setupWorld(960, 1010);
    this.addInteraction(150, 1000, "Return to Hub", () => this.transitionTo("HubScene"), 120);
    this.addInteraction(960, 465, "Serve Next Customer", () => this.serveNext(true), 130);
    this.addInteraction(1670, 890, "Open Store Upgrades", () => this.openUpgrades(), 130);
    this.addInteraction(1280, 960, "Start Customer Craze", () => this.activateCraze(), 105);
    this.time.delayedCall(8_000, () => {
      if (Math.random() < .35) this.spawnGoldenBlueberry();
    });
    this.cameras.main.fadeIn(280, 28, 18, 77);
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    if (this.frozen) return;
    const seconds = delta / 1000;
    const snapshot = session.economy.snapshot();
    this.arrivalTimer -= seconds;
    if (this.arrivalTimer <= 0) {
      this.spawnCustomer();
      const waitingCount = this.queue.filter((customer) => customer.state === "waiting").length;
      const socialProof = Math.min(BALANCE.maxSocialProof, waitingCount * BALANCE.socialProofPerCustomer);
      this.arrivalTimer = snapshot.arrivalSeconds / ((1 + socialProof) * session.customerMultiplier());
    }

    for (const customer of [...this.queue]) {
      if (customer.state !== "waiting") continue;
      customer.patience -= seconds;
      if (customer.patience <= 0) this.customerLeaves(customer);
    }

    if (snapshot.cashierLevel > 0 && this.queue.some((customer) => customer.state === "waiting")) {
      this.checkoutTimer += seconds * snapshot.registers;
      if (this.checkoutTimer >= snapshot.checkoutSeconds) {
        this.checkoutTimer = 0;
        this.serveNext(false);
      }
    }
    this.updateQueueLabel();
  }

  private spawnCustomer(): void {
    const snapshot = session.economy.snapshot();
    const activeCount = this.queue.filter((customer) => customer.state !== "leaving").length;
    if (activeCount >= snapshot.queueCapacity) return;
    const available = CUSTOMER_TYPES.filter((type) => type.unlockStoreLevel <= snapshot.storeLevel);
    const type = Phaser.Utils.Array.GetRandom(available);
    const customer = new Customer(this, type, 960, 1110, snapshot.patienceSeconds);
    this.queue.push(customer);
    const browseX = Math.random() < .5 ? 560 : 1360;
    const browseY = Phaser.Math.Between(590, 820);
    customer.moveTo(browseX, browseY, 650, () => {
      const choices = ["🫐", "🧁", "🥤", "🫙"];
      const thought = this.add.text(customer.sprite.x, customer.sprite.y - 72, choices[Phaser.Math.Between(0, choices.length - 1)], { fontSize: "24px", backgroundColor: "#ffffff", padding: { x: 6, y: 4 } }).setOrigin(.5).setDepth(3000);
      this.tweens.add({ targets: thought, y: thought.y - 14, duration: 500, yoyo: true, onComplete: () => thought.destroy() });
      this.time.delayedCall(650, () => {
        if (!customer.sprite.active) return;
        customer.state = "waiting";
        this.repositionQueue();
      });
    });
  }

  private serveNext(manual: boolean): void {
    const customer = this.queue.find((entry) => entry.state === "waiting");
    if (!customer) {
      ui.showToast("No one is at the register yet.", "info");
      return;
    }
    this.queue = this.queue.filter((entry) => entry !== customer);
    const sale = session.economy.serve(customer.type);
    if (sale.sold <= 0) {
      ui.showToast("Out of stock! Win berries in the Math Challenge.", "info");
      customer.leave(1040, 1125, false, () => undefined);
      this.repositionQueue();
      return;
    }
    if (manual) session.data.totals.manualCheckouts += 1;
    session.audio.play("checkout");
    session.save("StoreScene");
    this.coinBurst(customer.sprite.x, customer.sprite.y - 30, sale.earned);
    customer.leave(1100, 1125, true, () => undefined);
    this.repositionQueue();
    for (const message of session.checkQuests()) ui.showToast(message);
  }

  private customerLeaves(customer: Customer): void {
    this.queue = this.queue.filter((entry) => entry !== customer);
    customer.leave(820, 1125, false, () => undefined);
    ui.showToast(`${customer.type.name} ran out of patience. A faster checkout will help!`, "info");
    this.repositionQueue();
  }

  private repositionQueue(): void {
    this.queue.filter((customer) => customer.state === "waiting").forEach((customer, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = 900 + column * 120;
      const y = 590 + row * 105;
      customer.moveTo(x, y, 520 + index * 60, () => { customer.state = "waiting"; });
    });
  }

  private updateQueueLabel(): void {
    const snapshot = session.economy.snapshot();
    const waitingCount = this.queue.filter((customer) => customer.state === "waiting").length;
    const socialProof = Math.min(BALANCE.maxSocialProof, waitingCount * BALANCE.socialProofPerCustomer);
    this.queueLabel.setText(`CUSTOMER LINE  ${waitingCount}/${snapshot.queueCapacity}\nSOCIAL PROOF  +${Math.round(socialProof * 100)}% VISITS`);
  }

  private openUpgrades(): void {
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
        ui.announce(result.message);
      } else {
        session.audio.play("wrong");
        ui.announce(result.message);
      }
    });
  }

  private activateCraze(): void {
    if (!this.crazeReady) {
      ui.showToast("Customer Craze is recharging.", "info");
      return;
    }
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
      golden.destroy();
      glow.destroy();
      label.destroy();
      session.save("StoreScene");
    });
    this.time.delayedCall(9_000, () => {
      if (golden.active) {
        golden.destroy();
        glow.destroy();
        label.destroy();
      }
    });
  }

  private drawStore(): void {
    const snapshot = session.economy.snapshot();
    const graphics = this.add.graphics().setDepth(-50);
    graphics.fillStyle(0x383080).fillRect(0, 0, BALANCE.worldWidth, BALANCE.worldHeight);
    graphics.fillStyle(0xf4dfbd).fillRoundedRect(70, 90, 1780, 1020, 30);
    graphics.fillStyle(0xf9efd9).fillRoundedRect(95, 115, 1730, 960, 24);
    graphics.fillStyle(0xd8c59e, .35);
    for (let x = 95; x < 1825; x += 105) graphics.fillRect(x, 115, 4, 960);
    for (let y = 115; y < 1075; y += 105) graphics.fillRect(95, y, 1730, 4);
    graphics.fillStyle(0x5a3da6).fillRect(70, 90, 1780, 170);
    graphics.fillStyle(0x77e8ff, .22).fillRoundedRect(150, 120, 420, 88, 18).fillRoundedRect(750, 120, 420, 88, 18).fillRoundedRect(1350, 120, 420, 88, 18);
    this.add.text(960, 166, snapshot.storeLevel < 10 ? "THE LITTLE BLUEBERRY SHOP" : snapshot.storeLevel < 24 ? "BLUEBERRY MARKET" : "BLUEBERRY MEGASTORE", { fontFamily: "Trebuchet MS", fontSize: "35px", fontStyle: "bold", color: "#ffffff", stroke: "#2b1a70", strokeThickness: 8 }).setOrigin(.5).setDepth(20);

    // Checkout counter and register.
    const counter = this.add.container(960, 420).setDepth(500);
    const counterG = this.add.graphics();
    counterG.fillStyle(0x6b4ac9).fillRoundedRect(-235, -70, 470, 110, 18);
    counterG.fillStyle(0x8669e2).fillRoundedRect(-225, -82, 450, 30, 10);
    counterG.lineStyle(5, 0x352471).strokeRoundedRect(-235, -70, 470, 110, 18);
    const register = this.add.graphics();
    register.fillStyle(0x323860).fillRoundedRect(-45, -135, 90, 75, 12);
    register.fillStyle(0x7ce8ff).fillRoundedRect(-32, -123, 64, 36, 8);
    counter.add([counterG, register, this.add.text(0, -104, "$", { fontFamily: "Trebuchet MS", fontSize: "24px", fontStyle: "bold", color: "#244c70" }).setOrigin(.5), this.add.text(0, -10, "CHECKOUT", { fontFamily: "Trebuchet MS", fontSize: "19px", fontStyle: "bold", color: "#ffffff", stroke: "#342074", strokeThickness: 5 }).setOrigin(.5)]);
    this.addBlocker(960, 410, 480, 120);
    if (snapshot.cashierLevel > 0) {
      const count = Math.min(snapshot.registers, 3);
      for (let index = 0; index < count; index += 1) {
        const cashier = this.add.sprite(870 + index * 90, 322, "cashier").setScale(.85).setDepth(380);
        this.tweens.add({ targets: cashier, y: cashier.y - 4, duration: 600 + index * 110, yoyo: true, repeat: -1 });
      }
    } else {
      this.add.text(960, 325, "YOU ARE THE CASHIER", { fontFamily: "Trebuchet MS", fontSize: "13px", fontStyle: "bold", color: "#5c3fae", backgroundColor: "#fff6dc", padding: { x: 10, y: 6 } }).setOrigin(.5).setDepth(390);
    }

    // Queue ropes grow with capacity.
    const capacity = snapshot.queueCapacity;
    const queueRows = Math.ceil(capacity / 2);
    const rope = this.add.graphics().setDepth(570);
    rope.lineStyle(8, 0xd84c78).lineBetween(820, 535, 820, 535 + queueRows * 105).lineBetween(1100, 535, 1100, 535 + queueRows * 105);
    for (let row = 0; row <= queueRows; row += 1) {
      rope.fillStyle(0xffd15d).fillCircle(820, 535 + row * 105, 12).fillCircle(1100, 535 + row * 105, 12);
      rope.fillStyle(0x4b327b).fillRect(814, 535 + row * 105, 12, 38).fillRect(1094, 535 + row * 105, 12, 38);
    }
    this.queueLabel = this.add.text(960, 515, "", { align: "center", fontFamily: "Trebuchet MS", fontSize: "13px", fontStyle: "bold", color: "#5c3b9f", backgroundColor: "#fff8e6", padding: { x: 12, y: 6 }, stroke: "#ffffff", strokeThickness: 2 }).setOrigin(.5).setDepth(580);
    this.updateQueueLabel();

    const shelfCount = Math.min(6, 1 + session.economy.upgrades.level("extra-shelf"));
    for (let index = 0; index < shelfCount; index += 1) {
      const left = index % 2 === 0;
      const x = left ? 330 : 1590;
      const y = 420 + Math.floor(index / 2) * 235;
      const shelf = this.add.container(x, y).setDepth(y);
      const shelfG = this.add.graphics();
      shelfG.fillStyle(0x9a624c).fillRoundedRect(-150, -75, 300, 135, 18);
      shelfG.fillStyle(0xe4b46f).fillRect(-140, -55, 280, 18).fillRect(-140, 5, 280, 18);
      shelfG.lineStyle(5, 0x6f453c).strokeRoundedRect(-150, -75, 300, 135, 18);
      shelf.add(shelfG);
      const icons = ["🫐", "🧺", "🫙", "🧁", "🥤", "🥧"];
      for (let item = 0; item < 4; item += 1) shelf.add(this.add.text(-105 + item * 70, item % 2 ? -35 : 25, icons[(index + item) % icons.length], { fontSize: "28px" }).setOrigin(.5));
      this.addBlocker(x, y, 310, 150);
    }

    if (session.economy.upgrades.has("seating")) {
      for (let index = 0; index < 3; index += 1) {
        const bench = this.add.container(1300 + index * 120, 710).setDepth(710);
        bench.add([this.add.rectangle(0, 0, 105, 26, 0x81503e).setStrokeStyle(4, 0x593449), this.add.rectangle(-38, 30, 10, 55, 0x593449), this.add.rectangle(38, 30, 10, 55, 0x593449)]);
      }
    }
    if (session.economy.upgrades.has("decorations")) {
      [[620,330],[1300,330],[560,930],[1380,930]].forEach(([x,y]) => {
        const pot = this.add.container(x,y).setDepth(y);
        pot.add([this.add.rectangle(0,0,42,34,0xc76573), this.add.circle(-12,-30,18,0x61bd6f), this.add.circle(12,-34,20,0x76d87b)]);
      });
    }
    if (session.economy.upgrades.has("neon-sign")) {
      const neon = this.add.text(960, 230, "🫐  FRESH • FUN • BLUE  🫐", { fontFamily: "Trebuchet MS", fontSize: "24px", fontStyle: "bold", color: "#8df0ff", stroke: "#4b31b2", strokeThickness: 7 }).setOrigin(.5).setDepth(30);
      this.tweens.add({ targets: neon, alpha: .65, duration: 650, yoyo: true, repeat: -1 });
    }

    // Upgrade terminal, temporary boost pad, and hub portal.
    const terminal = this.add.container(1670, 850).setDepth(900);
    terminal.add([
      this.add.rectangle(0, 0, 170, 180, 0x392b80).setStrokeStyle(6, 0x24185f),
      this.add.rectangle(0, -35, 126, 75, 0x6be8ff).setStrokeStyle(4, 0xffffff, .5),
      this.add.text(0, -36, "STORE\nUPGRADES", { align: "center", fontFamily: "Trebuchet MS", fontSize: "17px", fontStyle: "bold", color: "#25316c" }).setOrigin(.5),
      this.add.text(0, 54, "BUILD!", { fontFamily: "Trebuchet MS", fontSize: "18px", fontStyle: "bold", color: "#ffe279" }).setOrigin(.5)
    ]);
    this.tweens.add({ targets: terminal, scale: 1.04, duration: 800, yoyo: true, repeat: -1 });
    this.addBlocker(1670, 850, 180, 190);
    const craze = this.add.container(1280, 960).setDepth(970);
    craze.add([this.add.ellipse(0, 0, 188, 72, 0x4d3ab0).setStrokeStyle(8, COLORS.mint), this.add.text(0, -4, "CUSTOMER CRAZE", { fontFamily: "Trebuchet MS", fontSize: "17px", fontStyle: "bold", color: "#d6ffe9", stroke: "#2a1c72", strokeThickness: 5 }).setOrigin(.5)]);
    this.tweens.add({ targets: craze, alpha: .72, duration: 650, yoyo: true, repeat: -1 });
    ArtFactory.portal(this, 150, 955, "HUB", [0x75e6ff, 0x4b45c9]).setScale(.72).setDepth(990);

    this.add.text(960, 1050, "ENTRANCE", { fontFamily: "Trebuchet MS", fontSize: "18px", fontStyle: "bold", color: "#6a4a95", backgroundColor: "#fff4cf", padding: { x: 16, y: 8 } }).setOrigin(.5).setDepth(1080);
  }
}
