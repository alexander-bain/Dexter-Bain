import Phaser from "phaser";
import { ArtFactory } from "../art/ArtFactory";
import { BALANCE, COLORS } from "../data/balance";
import { session } from "../systems/GameSession";
import { ui } from "../ui/UIBridge";
import { BaseWorldScene } from "./BaseWorldScene";

export class FactoryScene extends BaseWorldScene {
  private beltBerries: Phaser.GameObjects.Image[] = [];
  private outputBoxes: Phaser.GameObjects.Image[] = [];
  private purchased = false;
  private boostReady = true;
  private statusText!: Phaser.GameObjects.Text;
  private resourceText!: Phaser.GameObjects.Text;
  private powerText!: Phaser.GameObjects.Text;
  private beltStatusText!: Phaser.GameObjects.Text;
  private holdLabel!: Phaser.GameObjects.Text;
  private holdSeconds = 0;

  constructor() { super("FactoryScene"); }

  create(): void {
    this.prepareWorld();
    this.drawFactory();
    this.setupWorld(280, 820);
    this.addInteraction(155, 1005, "Return to Hub", () => this.transitionTo("HubScene"), 120);
    this.addInteraction(1230, 970, "Activate Blueberry Rush", () => this.activateRush(), 105);
    this.cameras.main.fadeIn(280, 28, 18, 77);
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    if (this.frozen) return;
    const snapshot = session.economy.snapshot();
    const wholeBerries = Math.floor(session.data.rawBlueberries);
    const packing = wholeBerries >= BALANCE.packageRecipeRaw && session.data.warehousePackages < snapshot.warehouseCapacity;
    const visibleBerries = Math.min(this.beltBerries.length, wholeBerries);
    const speed = wholeBerries > 0 ? (packing ? 62 + snapshot.processingRate * 3 : 42) : 0;
    for (const [index, berry] of this.beltBerries.entries()) {
      berry.x += delta / 1000 * speed;
      berry.angle += delta * .11;
      if (berry.x > 1640) berry.x = 320;
      berry.setVisible(index < visibleBerries);
    }
    for (const box of this.outputBoxes) {
      box.x += delta / 1000 * (packing ? 32 : 0);
      if (box.x > 1760) box.x = 1150;
      box.setVisible(session.data.warehousePackages > this.outputBoxes.indexOf(box));
    }
    const warehouseFull = session.data.warehousePackages >= snapshot.warehouseCapacity - .001;
    this.beltStatusText.setText(warehouseFull && wholeBerries > 0
      ? `🫐 ${wholeBerries} BLUEBERRIES MOVING SLOWLY · WAREHOUSE FULL`
      : wholeBerries >= BALANCE.packageRecipeRaw
        ? `🫐 ${wholeBerries} BLUEBERRIES MOVING  →  10 BERRIES = 1 PACKAGE`
        : wholeBerries > 0
          ? `🫐 ${wholeBerries}/10 BLUEBERRIES MOVING  ·  ANSWER MATH FOR ${BALANCE.packageRecipeRaw - wholeBerries} MORE`
          : "ANSWER MATH TO PUT BLUEBERRIES ON THIS BELT");
    this.statusText.setText(session.economy.factory.bottleneck());
    this.statusText.setColor(session.economy.factory.bottleneck() === "PRODUCTION FLOWING" ? "#74efb4" : "#ffd36b");
    this.resourceText.setText(`RAW  ${Math.floor(session.data.rawBlueberries)} / ${Math.floor(snapshot.rawStorageCapacity)}\nWAREHOUSE PACKAGES  ${Math.floor(session.data.warehousePackages)} / ${Math.floor(snapshot.warehouseCapacity)}\nTO BACKROOM  ${snapshot.deliveryRate.toFixed(1)} packages/min`);
    this.powerText.setText(`MATH POWER  ${Math.floor(session.data.mathPower)}/100\nFACTORY SPEED  ${Math.round(snapshot.mathPowerSpeed * 100)}%\nPROCESSING  ${snapshot.processingRate.toFixed(1)} packs/min`);
    this.updateUpgradePlatform(delta / 1000);
  }

  private openUpgrades(): void {
    this.frozen = true;
    this.physics.world.pause();
    this.purchased = false;
    ui.showUpgradePanel("factory", () => {
      this.frozen = false;
      this.physics.world.resume();
      if (this.purchased) this.scene.restart();
    }, (id) => {
      const result = session.economy.upgrades.buy(id);
      if (result.ok) {
        this.purchased = true;
        session.audio.play("upgrade");
        session.save("FactoryScene");
        ui.showPurchaseCelebration(result.message);
      } else {
        session.audio.play("wrong");
        ui.announce(result.message);
      }
    });
  }

  private activateRush(): void {
    if (!this.boostReady) {
      ui.showToast("The Blueberry Rush machine is recharging.", "info");
      return;
    }
    this.boostReady = false;
    session.activateBoost("production");
    session.audio.play("upgrade");
    ui.showToast("BLUEBERRY RUSH! Production doubled for 30 seconds.");
    const burst = this.add.text(1230, 870, "2×", { fontFamily: "Trebuchet MS", fontSize: "64px", fontStyle: "bold", color: "#ffd85c", stroke: "#2c1b72", strokeThickness: 10 }).setOrigin(.5).setDepth(3000);
    this.tweens.add({ targets: burst, y: 790, alpha: 0, duration: 1100, onComplete: () => burst.destroy() });
    this.time.delayedCall(30_000, () => { this.boostReady = true; });
  }

  private updateUpgradePlatform(seconds: number): void {
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, 1660, 900);
    if (distance <= 95) {
      this.holdSeconds = Math.min(5, this.holdSeconds + seconds);
      this.holdLabel.setText(`BUILDING MENU ${Math.ceil(5 - this.holdSeconds)}s\n${"●".repeat(Math.floor(this.holdSeconds))}${"○".repeat(5 - Math.floor(this.holdSeconds))}`);
      if (this.holdSeconds >= 5) {
        this.holdSeconds = 0;
        this.openUpgrades();
      }
    } else {
      this.holdSeconds = 0;
      this.holdLabel.setText("STAND HERE 5 SECONDS\nTO UPGRADE FACTORY");
    }
  }

  private drawFactory(): void {
    const graphics = this.add.graphics().setDepth(-50);
    graphics.fillStyle(0x25205c).fillRect(0, 0, BALANCE.worldWidth, BALANCE.worldHeight);
    graphics.fillStyle(0x4b5287).fillRect(70, 120, 1780, 980);
    graphics.fillStyle(0x596398).fillRect(90, 140, 1740, 920);
    graphics.lineStyle(3, 0x7680b0, .45);
    for (let x = 90; x < 1830; x += 92) graphics.lineBetween(x, 140, x, 1060);
    for (let y = 140; y < 1060; y += 92) graphics.lineBetween(90, y, 1830, y);
    graphics.fillStyle(0x302875).fillRect(70, 80, 1780, 180);
    graphics.fillStyle(0x7fe6ff, .22).fillRect(120, 112, 420, 95).fillRect(750, 112, 420, 95).fillRect(1380, 112, 420, 95);
    graphics.fillStyle(COLORS.gold).fillRect(80, 250, 1760, 12);
    this.add.text(960, 166, "BLUE MATH PRODUCTION FLOOR", { fontFamily: "Trebuchet MS", fontSize: "34px", fontStyle: "bold", color: "#ffffff", stroke: "#261967", strokeThickness: 8 }).setOrigin(.5).setDepth(10);

    const snapshot = session.economy.snapshot();
    const belt = this.add.graphics().setDepth(580);
    belt.fillStyle(0x2e3159).fillRoundedRect(260, 535, 1420, 105, 20);
    belt.fillStyle(0x94a9bd).fillRoundedRect(275, 548, 1390, 46, 13);
    for (let x = 300; x < 1650; x += 66) belt.fillStyle(0x31334c).fillCircle(x, 615, 22);
    belt.lineStyle(5, 0xd7e3ec, .45).strokeRoundedRect(260, 535, 1420, 105, 20);
    {
      const count = 18;
      for (let index = 0; index < count; index += 1) {
        const berry = this.add.image(310 + index * 74, 552, "berry")
          .setScale(1.06 + index % 3 * .1)
          .setAngle(index * 47)
          .setDepth(620);
        if (index % 4 === 1) berry.setTint(0x94a8ff);
        if (index % 4 === 3) berry.setTint(0x6f82ec);
        this.beltBerries.push(berry);
        this.tweens.add({ targets: berry, y: 546, duration: 360 + index % 3 * 70, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      }
      for (let index = 0; index < 5; index += 1) this.outputBoxes.push(this.add.image(1240 + index * 92, 562, "package-art").setScale(.25).setDepth(600));
    }

    const machines: Array<[string, string, number, number, number]> = [
      ["automatic-picker", "AUTO PICKER", 340, 470, 0x4cb77b],
      ["berry-washer", "BERRY WASHER", 600, 470, 0x3e93d6],
      ["smart-sorter", "SMART SORTER", 860, 470, 0x835ad6],
      ["packing-machine", "PACKING", 1120, 470, 0xe28658],
      ["quality-scanner", "QUALITY SCAN", 1380, 470, 0xd94f89],
      ["mega-packer", "MEGA PACKER", 1600, 470, 0xffb64f]
    ];
    machines.forEach(([id, label, x, y, color], index) => {
      const starterPacker = id === "packing-machine" && !session.economy.upgrades.has(id);
      if (session.economy.upgrades.has(id) || index === 0 || starterPacker) {
        const active = session.economy.upgrades.has(id) || starterPacker;
        ArtFactory.machine(this, x, y, starterPacker ? "STARTER PACKER" : label, color, active ? 1 : .72).setAlpha(active ? 1 : .28);
        this.addBlocker(x, y - 35, 135, 110);
      }
    });

    if (session.economy.upgrades.has("extra-conveyor")) {
      const second = this.add.graphics().setDepth(790);
      second.fillStyle(0x2e3159).fillRoundedRect(370, 760, 1020, 82, 18);
      second.fillStyle(0x94a9bd).fillRoundedRect(383, 772, 995, 32, 10);
      for (let index = 0; index < 8; index += 1) this.outputBoxes.push(this.add.image(410 + index * 125, 775, "package-art").setScale(.27).setDepth(800));
    }

    const storageScale = 1 + Math.min(.5, session.economy.upgrades.level("cold-storage") * .08);
    const storage = this.add.container(520, 900).setDepth(900).setScale(storageScale);
    const storageG = this.add.graphics();
    storageG.fillStyle(0x4c6eac).fillRoundedRect(-130, -150, 260, 160, 22);
    storageG.fillStyle(0x95e8ff).fillRoundedRect(-110, -127, 220, 92, 15);
    storageG.lineStyle(6, 0x2d2a6c).strokeRoundedRect(-130, -150, 260, 160, 22);
    storage.add([storageG, this.add.text(0, -92, `RAW COLD STORAGE\n${Math.floor(session.data.rawBlueberries)} / ${Math.floor(snapshot.rawStorageCapacity)}`, { align: "center", fontFamily: "Trebuchet MS", fontSize: "20px", fontStyle: "bold", color: "#ffffff", stroke: "#28306e", strokeThickness: 6 }).setOrigin(.5)]);
    this.addBlocker(520, 830, 280, 160);
    const warehouse = this.add.container(840, 930).setDepth(940);
    const warehouseG = this.add.graphics();
    warehouseG.fillStyle(0x2b225f, .28).fillEllipse(8, 38, 250, 54);
    warehouseG.fillStyle(0x9b6845).fillRoundedRect(-120, -105, 240, 125, 18);
    warehouseG.fillStyle(0xd79a59).fillRoundedRect(-108, -94, 216, 100, 12);
    warehouseG.lineStyle(6, 0x633b38).strokeRoundedRect(-120, -105, 240, 125, 18);
    warehouse.add([warehouseG, this.add.text(0, -58, `PACKAGE WAREHOUSE\n${Math.floor(session.data.warehousePackages)} / ${Math.floor(snapshot.warehouseCapacity)}\n📦  📦  📦`, { align: "center", fontFamily: "Trebuchet MS", fontSize: "16px", fontStyle: "bold", color: "#ffffff", stroke: "#4b2e42", strokeThickness: 5 }).setOrigin(.5)]);
    this.addBlocker(840, 875, 250, 135);

    const terminal = this.add.container(1660, 865).setDepth(905);
    const terminalG = this.add.graphics();
    terminalG.fillStyle(0x30246f).fillRoundedRect(-80, -125, 160, 150, 18);
    terminalG.fillStyle(0x6ce9ff).fillRoundedRect(-62, -105, 124, 78, 11);
    terminalG.fillStyle(0x17285a).fillRoundedRect(-54, -97, 108, 62, 8);
    terminalG.lineStyle(5, 0x201750).strokeRoundedRect(-80, -125, 160, 150, 18);
    terminal.add([terminalG, this.add.text(0, -66, "FACTORY\nUPGRADES", { align: "center", fontFamily: "Trebuchet MS", fontSize: "17px", fontStyle: "bold", color: "#ffffff" }).setOrigin(.5), this.add.ellipse(0, 46, 210, 76, 0x2b2474).setStrokeStyle(8, COLORS.gold)]);
    this.tweens.add({ targets: terminal, scale: 1.04, duration: 780, yoyo: true, repeat: -1 });
    this.addBlocker(1660, 820, 170, 145);
    this.holdLabel = this.add.text(1660, 1010, "STAND HERE 5 SECONDS\nTO UPGRADE FACTORY", { align: "center", fontFamily: "Trebuchet MS", fontSize: "13px", fontStyle: "bold", color: "#fff3bd", backgroundColor: "#2d246f", padding: { x: 10, y: 7 } }).setOrigin(.5).setDepth(1010);

    const rushPad = this.add.container(1230, 970).setDepth(970);
    const padG = this.add.graphics();
    padG.fillStyle(0x2b2474).fillEllipse(0, 0, 175, 70);
    padG.lineStyle(8, COLORS.gold, .9).strokeEllipse(0, 0, 175, 70);
    rushPad.add([padG, this.add.text(0, -4, "2× RUSH", { fontFamily: "Trebuchet MS", fontSize: "20px", fontStyle: "bold", color: "#fff4b3", stroke: "#2a1d73", strokeThickness: 5 }).setOrigin(.5)]);
    this.tweens.add({ targets: rushPad, alpha: .7, duration: 600, yoyo: true, repeat: -1 });

    const exit = ArtFactory.portal(this, 155, 955, "HUB", [0x75e6ff, 0x4b45c9]).setScale(.72);
    exit.setDepth(980);
    const workers = Math.min(7, Math.floor(snapshot.factoryLevel / 4));
    for (let index = 0; index < workers; index += 1) {
      const workerKey = index % 3 === 0 ? "packer" : index % 3 === 1 ? "operator" : "warehouse";
      const worker = this.add.sprite(410 + index * 185, 700 + (index % 2) * 140, workerKey, 20).setScale(.66).setDepth(760 + (index % 2) * 140).play(`${workerKey}-work`);
      this.tweens.add({ targets: worker, x: worker.x + 45, duration: 900 + index * 120, yoyo: true, repeat: -1 });
    }
    if (session.economy.upgrades.has("solar-power")) {
      for (let index = 0; index < 5; index += 1) this.add.rectangle(1250 + index * 105, 210, 90, 50, 0x263f92).setStrokeStyle(4, 0x83dff0).setDepth(50).setAngle(-5);
    }
    if (session.economy.upgrades.has("berry-washer")) {
      for (let index = 0; index < 8; index += 1) {
        const bubble = this.add.circle(570 + Phaser.Math.Between(-35, 35), 420 + Phaser.Math.Between(-15, 25), Phaser.Math.Between(4, 9), 0xb9f5ff, .55).setStrokeStyle(2, 0xffffff, .7).setDepth(610);
        this.tweens.add({ targets: bubble, y: bubble.y - 75, alpha: 0, duration: 950 + index * 120, repeat: -1, delay: index * 120 });
      }
    }
    if (session.economy.upgrades.has("smart-sorter")) {
      const scan = this.add.rectangle(860, 515, 12, 105, 0x76f4ff, .7).setDepth(615);
      this.tweens.add({ targets: scan, x: 920, duration: 650, yoyo: true, repeat: -1 });
    }
    if (session.economy.upgrades.has("drone-harvester")) {
      for (let index = 0; index < Math.min(4, session.economy.upgrades.level("drone-harvester")); index += 1) {
        const drone = this.add.text(280 + index * 130, 320 + index % 2 * 45, "🚁", { fontSize: "34px" }).setOrigin(.5).setDepth(650);
        this.tweens.add({ targets: drone, x: drone.x + 210, y: drone.y - 30, duration: 1900 + index * 250, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      }
    }
    if (session.economy.upgrades.has("delivery-truck")) {
      const trucks = session.economy.upgrades.has("truck-fleet") ? 3 : 1;
      for (let index = 0; index < trucks; index += 1) {
        const truck = this.add.container(900 + index * 190, 990).setDepth(1000);
        truck.add([this.add.rectangle(0, 0, 120, 55, 0x4b62d5).setStrokeStyle(4, 0x24225c), this.add.rectangle(70, 12, 48, 42, 0x70ddec).setStrokeStyle(4, 0x24225c), this.add.circle(-35, 33, 15, 0x272440), this.add.circle(60, 33, 15, 0x272440)]);
        this.tweens.add({ targets: truck, x: truck.x + 180, duration: 3500 + index * 500, yoyo: true, repeat: -1 });
      }
    }
    if (session.economy.upgrades.has("giant-silo")) {
      const silo = this.add.container(180, 420).setDepth(430).setScale(1 + session.economy.upgrades.level("giant-silo") * .06);
      silo.add([this.add.ellipse(0, 40, 145, 45, 0x171044, .25), this.add.rectangle(0, -70, 120, 220, 0x7287a9).setStrokeStyle(6, 0x343b68), this.add.ellipse(0, -180, 120, 44, 0xb8cce0).setStrokeStyle(5, 0x343b68), this.add.text(0, -75, "🫐\nSILO", { align: "center", fontFamily: "Trebuchet MS", fontSize: "18px", fontStyle: "bold", color: "#ffffff", stroke: "#334277", strokeThickness: 5 }).setOrigin(.5)]);
    }
    if (session.economy.upgrades.has("ultimate-factory")) {
      const crown = this.add.text(960, 250, "★ ULTIMATE BLUE FACTORY ★", { fontFamily: "Trebuchet MS", fontSize: "24px", fontStyle: "bold", color: "#fff19a", stroke: "#342078", strokeThickness: 8 }).setOrigin(.5).setDepth(100);
      this.tweens.add({ targets: crown, scale: 1.05, duration: 700, yoyo: true, repeat: -1 });
    }
    this.beltStatusText = this.add.text(960, 680, "", { fontFamily: "Trebuchet MS", fontSize: "18px", fontStyle: "bold", color: "#fff4b8", backgroundColor: "#29216d", padding: { x: 16, y: 9 }, stroke: "#16103f", strokeThickness: 4 }).setOrigin(.5).setDepth(850);
    this.statusText = this.add.text(960, 300, session.economy.factory.bottleneck(), { fontFamily: "Trebuchet MS", fontSize: "20px", fontStyle: "bold", color: "#74efb4", backgroundColor: "#241962", padding: { x: 16, y: 9 }, stroke: "#130c43", strokeThickness: 5 }).setOrigin(.5).setDepth(620);
    this.resourceText = this.add.text(690, 960, "", { fontFamily: "Trebuchet MS", fontSize: "15px", fontStyle: "bold", color: "#e7f4ff", backgroundColor: "#282168", padding: { x: 13, y: 9 }, stroke: "#151044", strokeThickness: 4 }).setOrigin(.5).setDepth(1000);
    this.powerText = this.add.text(1480, 955, "", { fontFamily: "Trebuchet MS", fontSize: "15px", fontStyle: "bold", color: "#fff1a0", backgroundColor: "#282168", padding: { x: 13, y: 9 }, stroke: "#151044", strokeThickness: 4 }).setOrigin(.5).setDepth(1000);
  }
}
