import Phaser from "phaser";
import { ArtFactory } from "../art/ArtFactory";
import { COLORS } from "../data/balance";
import { session } from "../systems/GameSession";
import { ui } from "../ui/UIBridge";

export class MenuScene extends Phaser.Scene {
  private berryBelt: Phaser.GameObjects.Image[] = [];

  constructor() { super("MenuScene"); }

  create(): void {
    this.drawAnimatedWorld();
    this.renderMenu();
    this.input.once("pointerdown", () => session.audio.unlock());
  }

  update(_time: number, delta: number): void {
    session.audio.updateMusic(delta / 1000);
    for (const berry of this.berryBelt) {
      berry.x += delta * .08;
      berry.angle += delta * .12;
      if (berry.x > this.scale.width + 30) berry.x = this.scale.width * .46;
    }
  }

  private renderMenu(): void {
    ui.showMenu({
      newGame: () => {
        if (session.hasSave() && !window.confirm("Start a brand-new factory? Your current BlueMath Factory save will be replaced.")) return;
        session.newGame();
        this.scene.start("HubScene");
      },
      continueGame: () => {
        const offline = session.continueGame();
        if (offline.berries >= 1) this.registry.set("offlineMessage", `Your factory made ${Math.floor(offline.berries)} berries while you were away!`);
        this.scene.start(session.data.lastScene === "MathChallengeScene" ? "HubScene" : session.data.lastScene);
      },
      how: () => ui.showHow(() => this.renderMenu()),
      stats: () => ui.showStats(() => this.renderMenu()),
      settings: () => ui.showSettings(() => this.renderMenu())
    });
  }

  private drawAnimatedWorld(): void {
    const { width, height } = this.scale;
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x62c8f2, 0x62c8f2, 0xb5f2ee, 0xb5f2ee).fillRect(0, 0, width, height);
    graphics.fillStyle(0xffffff, .22).fillCircle(width * .15, height * .15, 120).fillCircle(width * .82, height * .13, 180);
    graphics.fillStyle(0x8cda73).fillEllipse(width * .2, height * .76, width * .8, height * .58).fillEllipse(width * .8, height * .75, width * .9, height * .55);
    graphics.fillStyle(0x55ae63).fillRect(0, height * .66, width, height * .34);
    graphics.fillStyle(0xe9d6ad).fillEllipse(width * .47, height * .9, width * .74, height * .36);

    for (let index = 0; index < 5; index += 1) {
      const cloud = this.add.container(-100 + index * width * .28, 70 + (index % 2) * 55).setAlpha(.8);
      cloud.add([
        this.add.ellipse(0, 0, 115, 44, 0xffffff),
        this.add.circle(-30, -10, 30, 0xffffff),
        this.add.circle(18, -18, 38, 0xffffff)
      ]);
      this.tweens.add({ targets: cloud, x: cloud.x + 90, duration: 10_000 + index * 1200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }

    const factoryX = Math.max(width * .74, width - 330);
    const factoryY = height * .69;
    const factory = ArtFactory.building(this, factoryX, factoryY, Math.min(380, width * .34), 240, { color: 0x624ad2, roof: 0x2c217d, label: "BLUEBERRY WORKS", windows: 4, level: 12 });
    factory.setScale(width < 700 ? .75 : 1);
    const chimney = this.add.rectangle(factoryX + 100, factoryY - 210, 36, 125, 0x6b6c88).setStrokeStyle(5, 0x3d396a).setDepth(factoryY - 1);
    for (let index = 0; index < 5; index += 1) {
      const puff = this.add.circle(factoryX + 100, factoryY - 290, 22 + index * 4, 0xffffff, .35).setDepth(factoryY - 2);
      this.tweens.add({ targets: puff, y: puff.y - 95, x: puff.x + 20 + index * 8, alpha: 0, scale: 1.8, duration: 2600, delay: index * 520, repeat: -1 });
    }
    chimney.setVisible(width > 650);

    const beltY = height * .79;
    const belt = this.add.graphics().setDepth(2000);
    belt.fillStyle(0x30345f).fillRoundedRect(width * .46, beltY - 18, width * .5, 48, 13);
    belt.fillStyle(0x8293ab).fillRoundedRect(width * .46 + 6, beltY - 13, width * .5 - 12, 22, 8);
    for (let x = width * .48; x < width * .95; x += 45) belt.fillStyle(0x313650).fillCircle(x, beltY + 18, 11);
    for (let index = 0; index < 7; index += 1) {
      const berry = this.add.image(width * .48 + index * 70, beltY - 17, "berry").setScale(.72).setDepth(2001);
      this.berryBelt.push(berry);
    }
    for (let index = 0; index < 4; index += 1) {
      const worker = this.add.sprite(width * (.53 + index * .11), height * (.87 + (index % 2) * .04), index % 2 ? "customer-parent" : "worker").setDepth(2100).setScale(.8);
      this.tweens.add({ targets: worker, y: worker.y - 7, duration: 350, yoyo: true, repeat: -1, delay: index * 140 });
    }
    ArtFactory.tree(this, width * .08, height * .73, .85).setDepth(40);
    ArtFactory.bush(this, width * .15, height * .88, 1.1).setDepth(2002);
    ArtFactory.tree(this, width * .93, height * .68, .72).setDepth(40);
    const shop = ArtFactory.building(this, width * .2, height * .75, Math.min(260, width * .28), 170, { color: 0xf09a78, roof: 0x5c3898, label: "BERRY MARKET", windows: 2 });
    shop.setScale(width < 700 ? .72 : 1);
    this.add.text(width - 20, height - 18, "ORIGINAL GAME ART • v1.0", { fontFamily: "Trebuchet MS", fontSize: "10px", fontStyle: "bold", color: "#e6f6ff", stroke: "#244f60", strokeThickness: 3 }).setOrigin(1).setDepth(3000).setAlpha(.75);
    this.cameras.main.fadeIn(350, COLORS.ink >> 16, (COLORS.ink >> 8) & 255, COLORS.ink & 255);
  }
}
