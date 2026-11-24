import Phaser from "phaser";
import { ArtFactory } from "../art/ArtFactory";
import { BALANCE, COLORS } from "../data/balance";
import { session } from "../systems/GameSession";
import { ui } from "../ui/UIBridge";
import { BaseWorldScene } from "./BaseWorldScene";

export class FactoryScene extends BaseWorldScene {
  private beltBerries: Phaser.GameObjects.Image[] = [];
  private outputBoxes: Phaser.GameObjects.Container[] = [];
  private purchased = false;
  private boostReady = true;

  constructor() { super("FactoryScene"); }

  create(): void {
    this.prepareWorld();
    this.drawFactory();
    this.setupWorld(280, 820);
    this.addInteraction(155, 1005, "Return to Hub", () => this.transitionTo("HubScene"), 120);
    this.addInteraction(1660, 905, "Open Factory Upgrades", () => this.openUpgrades(), 135);
    this.addInteraction(1230, 970, "Activate Blueberry Rush", () => this.activateRush(), 105);
    this.cameras.main.fadeIn(280, 28, 18, 77);
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    if (this.frozen) return;
    const speed = 45 + session.economy.snapshot().productionRate * 4;
    for (const berry of this.beltBerries) {
      berry.x += delta / 1000 * speed;
      berry.angle += delta * .11;
      if (berry.x > 1640) berry.x = 320;
    }
    for (const box of this.outputBoxes) {
      box.x += delta / 1000 * 32;
      if (box.x > 1760) box.x = 1150;
    }
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
        ui.announce(result.message);
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
    if (session.economy.upgrades.has("starter-conveyor")) {
      const count = Math.min(18, 6 + Math.floor(snapshot.productionRate));
      for (let index = 0; index < count; index += 1) {
        this.beltBerries.push(this.add.image(310 + index * 82, 548, "berry").setScale(.8).setDepth(590));
      }
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
      if (session.economy.upgrades.has(id) || index === 0) {
        ArtFactory.machine(this, x, y, label, color, session.economy.upgrades.has(id) ? 1 : .72).setAlpha(session.economy.upgrades.has(id) ? 1 : .28);
        this.addBlocker(x, y - 35, 135, 110);
      }
    });

    if (session.economy.upgrades.has("extra-conveyor")) {
      const second = this.add.graphics().setDepth(790);
      second.fillStyle(0x2e3159).fillRoundedRect(370, 760, 1020, 82, 18);
      second.fillStyle(0x94a9bd).fillRoundedRect(383, 772, 995, 32, 10);
      for (let index = 0; index < 8; index += 1) this.outputBoxes.push(ArtFactory.crate(this, 410 + index * 125, 785).setScale(.55).setDepth(800));
    }

    const storageScale = 1 + Math.min(.5, session.economy.upgrades.level("cold-storage") * .08);
    const storage = this.add.container(520, 900).setDepth(900).setScale(storageScale);
    const storageG = this.add.graphics();
    storageG.fillStyle(0x4c6eac).fillRoundedRect(-130, -150, 260, 160, 22);
    storageG.fillStyle(0x95e8ff).fillRoundedRect(-110, -127, 220, 92, 15);
    storageG.lineStyle(6, 0x2d2a6c).strokeRoundedRect(-130, -150, 260, 160, 22);
    storage.add([storageG, this.add.text(0, -92, `COLD STORAGE\n${Math.floor(session.data.blueberries)} / ${Math.floor(snapshot.storage)}`, { align: "center", fontFamily: "Trebuchet MS", fontSize: "20px", fontStyle: "bold", color: "#ffffff", stroke: "#28306e", strokeThickness: 6 }).setOrigin(.5)]);
    this.addBlocker(520, 830, 280, 160);

    const terminal = this.add.container(1660, 865).setDepth(905);
    const terminalG = this.add.graphics();
    terminalG.fillStyle(0x30246f).fillRoundedRect(-80, -125, 160, 150, 18);
    terminalG.fillStyle(0x6ce9ff).fillRoundedRect(-62, -105, 124, 78, 11);
    terminalG.fillStyle(0x17285a).fillRoundedRect(-54, -97, 108, 62, 8);
    terminalG.lineStyle(5, 0x201750).strokeRoundedRect(-80, -125, 160, 150, 18);
    terminal.add([terminalG, this.add.text(0, -66, "UPGRADES\n+$", { align: "center", fontFamily: "Trebuchet MS", fontSize: "18px", fontStyle: "bold", color: "#ffffff" }).setOrigin(.5)]);
    this.tweens.add({ targets: terminal, scale: 1.04, duration: 780, yoyo: true, repeat: -1 });
    this.addBlocker(1660, 820, 170, 145);

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
      const worker = this.add.sprite(410 + index * 185, 700 + (index % 2) * 140, session.economy.upgrades.has("factory-robots") && index % 2 ? "cashier" : "worker").setScale(.8).setDepth(760 + (index % 2) * 140);
      this.tweens.add({ targets: worker, x: worker.x + 45, duration: 900 + index * 120, yoyo: true, repeat: -1 });
    }
    if (session.economy.upgrades.has("solar-power")) {
      for (let index = 0; index < 5; index += 1) this.add.rectangle(1250 + index * 105, 210, 90, 50, 0x263f92).setStrokeStyle(4, 0x83dff0).setDepth(50).setAngle(-5);
    }
  }
}
