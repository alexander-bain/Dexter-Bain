import Phaser from "phaser";
import { COLORS } from "../data/balance";
import { CUSTOMER_TYPES } from "../data/customerTypes";

export class ArtFactory {
  static generateTextures(scene: Phaser.Scene): void {
    if (scene.textures.exists("player-idle")) return;
    this.makePersonTexture(scene, "player-idle", COLORS.blueberry, COLORS.gold, 0);
    this.makePersonTexture(scene, "player-walk-a", COLORS.blueberry, COLORS.gold, -4);
    this.makePersonTexture(scene, "player-walk-b", COLORS.blueberry, COLORS.gold, 4);
    CUSTOMER_TYPES.forEach((customer) => this.makePersonTexture(scene, `customer-${customer.id}`, customer.color, customer.accent, 0, true));
    this.makePersonTexture(scene, "worker", 0x5a45c8, 0x5ce0a3, 0, true);
    this.makePersonTexture(scene, "cashier", 0x3657e7, 0xffc84d, 0, true);

    const berry = scene.add.graphics();
    berry.fillStyle(0x17104f, 0.25).fillEllipse(15, 22, 24, 10);
    berry.fillStyle(0x2f3ead).fillCircle(14, 14, 11);
    berry.fillStyle(0x506cf1).fillCircle(11, 10, 7);
    berry.fillStyle(0xaac0ff).fillCircle(8, 7, 2.5);
    berry.lineStyle(2, 0x18206b).strokeCircle(14, 14, 11);
    berry.fillStyle(0x5ce0a3).fillTriangle(14, 4, 9, 0, 19, 0);
    berry.generateTexture("berry", 30, 28).destroy();

    const coin = scene.add.graphics();
    coin.fillStyle(0x9f671d).fillCircle(13, 15, 12);
    coin.fillStyle(COLORS.gold).fillCircle(13, 12, 11);
    coin.lineStyle(2, 0xffed9a).strokeCircle(13, 12, 8);
    coin.generateTexture("coin", 27, 28).destroy();

    const blocker = scene.add.graphics();
    blocker.fillStyle(0xffffff, 0.01).fillRect(0, 0, 8, 8);
    blocker.generateTexture("blocker", 8, 8).destroy();
  }

  static drawWorldGround(scene: Phaser.Scene, width: number, height: number, color = 0x75c86d): void {
    const background = scene.add.graphics().setDepth(-50);
    background.fillStyle(color).fillRect(0, 0, width, height);
    background.fillStyle(0x5aae62, 0.35);
    for (let y = 0; y < height; y += 120) {
      for (let x = (Math.floor(y / 120) % 2) * 60; x < width; x += 120) {
        background.fillCircle(x, y, 3);
        background.fillCircle(x + 25, y + 18, 2);
      }
    }
    background.lineStyle(2, 0xa4e588, 0.17);
    for (let x = -height; x < width; x += 96) background.lineBetween(x, 0, x + height, height);
    for (let x = 0; x < width + height; x += 96) background.lineBetween(x, 0, x - height, height);
  }

  static path(scene: Phaser.Scene, points: Phaser.Types.Math.Vector2Like[], width = 116): Phaser.GameObjects.Graphics {
    const graphics = scene.add.graphics().setDepth(-30);
    graphics.lineStyle(width + 16, 0x4d7f61, 0.23).strokePoints(points, false, false);
    graphics.lineStyle(width, 0xefe2bd).strokePoints(points, false, false);
    graphics.lineStyle(4, 0xffffff, 0.22).strokePoints(points, false, false);
    return graphics;
  }

  static building(scene: Phaser.Scene, x: number, y: number, width: number, height: number, options: { color?: number; roof?: number; label?: string; windows?: number; level?: number } = {}): Phaser.GameObjects.Container {
    const color = options.color ?? 0x6b53d7;
    const roof = options.roof ?? 0x34228d;
    const depth = 42;
    const container = scene.add.container(x, y).setDepth(y);
    const shadow = scene.add.ellipse(20, height / 2 + 36, width + 70, 50, 0x1a124a, 0.22);
    const graphics = scene.add.graphics();
    graphics.fillStyle(0x171040, 0.18).fillRoundedRect(-width / 2 + 10, -height / 2 + 22, width, height, 18);
    graphics.fillStyle(color).fillRoundedRect(-width / 2, -height / 2, width, height, 16);
    graphics.fillStyle(0xffffff, 0.12).fillRoundedRect(-width / 2 + 10, -height / 2 + 12, width - 20, 20, 8);
    graphics.fillStyle(roof).fillPoints([
      new Phaser.Geom.Point(-width / 2 - depth, -height / 2),
      new Phaser.Geom.Point(-width / 2 + 25, -height / 2 - depth),
      new Phaser.Geom.Point(width / 2 + depth, -height / 2 - depth),
      new Phaser.Geom.Point(width / 2, -height / 2)
    ], true);
    graphics.lineStyle(4, 0x20145c, 0.45).strokeRoundedRect(-width / 2, -height / 2, width, height, 16);
    const windows = options.windows ?? 3;
    for (let index = 0; index < windows; index += 1) {
      const wx = -width / 2 + 38 + index * ((width - 76) / Math.max(1, windows - 1));
      graphics.fillStyle(0x9af1ff).fillRoundedRect(wx - 18, -height / 2 + 52, 36, 34, 7);
      graphics.fillStyle(0xffffff, 0.4).fillRoundedRect(wx - 12, -height / 2 + 57, 10, 7, 3);
    }
    graphics.fillStyle(0x2b236c).fillRoundedRect(-25, height / 2 - 62, 50, 62, 9);
    graphics.fillStyle(COLORS.gold).fillCircle(14, height / 2 - 31, 4);
    container.add([shadow, graphics]);
    if (options.label) {
      const sign = scene.add.text(0, -height / 2 + 13, options.label, { fontFamily: "Trebuchet MS", fontSize: "18px", fontStyle: "bold", color: "#ffffff", stroke: "#24145f", strokeThickness: 5 }).setOrigin(0.5);
      container.add(sign);
    }
    if ((options.level ?? 0) >= 10) {
      const flag = scene.add.text(width / 2 - 18, -height / 2 - 47, "★", { fontSize: "32px", color: "#ffd257", stroke: "#24145f", strokeThickness: 5 }).setOrigin(.5);
      container.add(flag);
      scene.tweens.add({ targets: flag, y: flag.y - 5, duration: 900, yoyo: true, repeat: -1 });
    }
    return container;
  }

  static tree(scene: Phaser.Scene, x: number, y: number, scale = 1): Phaser.GameObjects.Container {
    const container = scene.add.container(x, y).setScale(scale).setDepth(y);
    const shadow = scene.add.ellipse(8, 20, 78, 30, 0x153b3a, .22);
    const trunk = scene.add.rectangle(0, -25, 20, 78, 0x86533e).setStrokeStyle(4, 0x583345);
    const crown = scene.add.graphics();
    crown.fillStyle(0x2c7c5b).fillCircle(-27, -79, 39).fillCircle(24, -86, 44).fillCircle(0, -114, 43);
    crown.fillStyle(0x62c86f).fillCircle(-21, -86, 31).fillCircle(22, -95, 34).fillCircle(0, -121, 32);
    crown.fillStyle(0x9be182, .5).fillCircle(-15, -108, 11).fillCircle(18, -121, 9);
    crown.lineStyle(4, 0x215a52, .65).strokeCircle(-27, -79, 39).strokeCircle(24, -86, 44).strokeCircle(0, -114, 43);
    container.add([shadow, trunk, crown]);
    return container;
  }

  static bush(scene: Phaser.Scene, x: number, y: number, scale = 1): Phaser.GameObjects.Container {
    const container = scene.add.container(x, y).setScale(scale).setDepth(y);
    const shadow = scene.add.ellipse(4, 10, 66, 22, 0x163d3d, .2);
    const leaves = scene.add.graphics();
    leaves.fillStyle(0x28684f).fillCircle(-22, -15, 25).fillCircle(20, -17, 27).fillCircle(0, -35, 29);
    leaves.fillStyle(0x55aa63).fillCircle(-18, -21, 19).fillCircle(17, -23, 20).fillCircle(0, -39, 20);
    [[-20,-24],[-3,-45],[15,-27],[25,-11],[-4,-18]].forEach(([bx, by]) => {
      leaves.fillStyle(0x3347bd).fillCircle(bx, by, 7);
      leaves.fillStyle(0x789aff).fillCircle(bx - 2, by - 2, 2);
    });
    container.add([shadow, leaves]);
    return container;
  }

  static crate(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
    const container = scene.add.container(x, y).setDepth(y);
    const graphic = scene.add.graphics();
    graphic.fillStyle(0x7a4b3c).fillRect(-28, -38, 62, 43);
    graphic.fillStyle(0xb7744c).fillRect(-32, -43, 62, 43);
    graphic.lineStyle(5, 0x754232).strokeRect(-32, -43, 62, 43).lineBetween(-28, -39, 26, -4).lineBetween(26, -39, -28, -4);
    const berry = scene.add.image(0, -22, "berry").setScale(.65);
    container.add([graphic, berry]);
    return container;
  }

  static portal(scene: Phaser.Scene, x: number, y: number, label: string, colors: [number, number]): Phaser.GameObjects.Container {
    const container = scene.add.container(x, y).setDepth(y + 20);
    const shadow = scene.add.ellipse(0, 8, 170, 48, 0x171044, .28);
    const glow = scene.add.ellipse(0, -67, 116, 162, colors[0], .22).setBlendMode(Phaser.BlendModes.ADD);
    const inner = scene.add.graphics();
    inner.fillStyle(colors[1], .88).fillEllipse(0, -67, 94, 142);
    inner.lineStyle(8, colors[0], .95).strokeEllipse(0, -67, 112, 162);
    inner.lineStyle(5, 0xffffff, .72).strokeEllipse(0, -67, 88, 134);
    const arch = scene.add.graphics();
    arch.lineStyle(22, 0x35257f).strokeEllipse(0, -67, 142, 194);
    arch.lineStyle(6, 0x8d82dc).strokeEllipse(0, -67, 142, 194);
    arch.fillStyle(0x35257f).fillRoundedRect(-88, 2, 176, 26, 8);
    const symbol = scene.add.text(0, -72, label === "BLUEBERRY\nCHALLENGE" ? "×" : label === "FACTORY" ? "⚙" : "🛍", { fontFamily: "Trebuchet MS", fontSize: "48px", fontStyle: "bold", color: "#ffffff", stroke: "#2a1a75", strokeThickness: 7 }).setOrigin(.5);
    const signBack = scene.add.rectangle(0, 48, label.includes("\n") ? 226 : 170, label.includes("\n") ? 58 : 42, 0x241765, .98).setStrokeStyle(4, 0xffffff, .7);
    const sign = scene.add.text(0, 48, label, { align: "center", fontFamily: "Trebuchet MS", fontSize: label.includes("\n") ? "16px" : "18px", fontStyle: "bold", color: "#ffffff" }).setOrigin(.5);
    container.add([shadow, glow, inner, arch, symbol, signBack, sign]);
    if (!scene.sys.game.device.os.desktop || !scene.registry.get("reducedMotion")) {
      scene.tweens.add({ targets: glow, scaleX: 1.15, scaleY: .92, alpha: .4, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      scene.tweens.add({ targets: symbol, angle: label === "FACTORY" ? 360 : 4, duration: label === "FACTORY" ? 6000 : 900, yoyo: label !== "FACTORY", repeat: -1 });
    }
    for (let index = 0; index < 6; index += 1) {
      const particle = scene.add.image(Phaser.Math.Between(-48, 48), Phaser.Math.Between(-130, -10), "berry").setScale(.2 + Math.random() * .15).setAlpha(.75);
      container.add(particle);
      scene.tweens.add({ targets: particle, y: particle.y - 35, x: particle.x + Phaser.Math.Between(-16, 16), alpha: .15, duration: 1400 + index * 160, yoyo: true, repeat: -1, delay: index * 120 });
    }
    return container;
  }

  static machine(scene: Phaser.Scene, x: number, y: number, label: string, color = 0x5a49c8, scale = 1): Phaser.GameObjects.Container {
    const container = scene.add.container(x, y).setScale(scale).setDepth(y);
    const shadow = scene.add.ellipse(8, 10, 130, 36, 0x101048, .22);
    const graphic = scene.add.graphics();
    graphic.fillStyle(0x353a6e).fillRoundedRect(-64, -84, 128, 94, 15);
    graphic.fillStyle(color).fillRoundedRect(-60, -88, 120, 88, 15);
    graphic.fillStyle(0x9af1ff).fillRoundedRect(-40, -72, 80, 34, 8);
    graphic.fillStyle(0x143c63).fillRect(-34, -66, 68, 22);
    graphic.fillStyle(COLORS.gold).fillCircle(-44, -20, 7);
    graphic.fillStyle(COLORS.mint).fillCircle(-20, -20, 7);
    graphic.fillStyle(0xff7373).fillCircle(4, -20, 7);
    graphic.lineStyle(4, 0x252159).strokeRoundedRect(-60, -88, 120, 88, 15);
    const title = scene.add.text(0, -108, label, { fontFamily: "Trebuchet MS", fontSize: "14px", fontStyle: "bold", color: "#ffffff", stroke: "#23165f", strokeThickness: 5 }).setOrigin(.5);
    const gear = scene.add.text(42, -20, "⚙", { fontSize: "30px", color: "#e1eafa" }).setOrigin(.5);
    container.add([shadow, graphic, title, gear]);
    scene.tweens.add({ targets: gear, angle: 360, duration: 3200, repeat: -1 });
    return container;
  }

  private static makePersonTexture(scene: Phaser.Scene, key: string, shirt: number, accent: number, step: number, customer = false): void {
    const graphics = scene.add.graphics();
    graphics.fillStyle(0x151044, .24).fillEllipse(34, 82, 47, 15);
    graphics.fillStyle(0x273164).fillRoundedRect(22 + step, 59, 12, 24, 5).fillRoundedRect(39 - step, 59, 12, 24, 5);
    graphics.fillStyle(0x18214e).fillRoundedRect(18 + step, 77, 20, 8, 4).fillRoundedRect(36 - step, 77, 20, 8, 4);
    graphics.fillStyle(shirt).fillRoundedRect(16, 34, 40, 35, 12);
    graphics.fillStyle(accent).fillRoundedRect(16, 38, 40, 8, 4);
    graphics.fillStyle(0xf0b98b).fillRoundedRect(7, 38, 12, 28, 6).fillRoundedRect(53, 38, 12, 28, 6);
    graphics.fillStyle(0xf2bd91).fillCircle(36, 26, 18);
    graphics.fillStyle(0x5d342e).fillEllipse(36, 17, 35, 18);
    if (!customer) {
      graphics.fillStyle(accent).fillEllipse(35, 12, 39, 14).fillRoundedRect(16, 11, 38, 8, 4);
      graphics.fillStyle(shirt).fillRoundedRect(34, 6, 22, 10, 5);
    }
    graphics.fillStyle(0x23204a).fillCircle(30, 26, 2).fillCircle(42, 26, 2);
    graphics.lineStyle(2, 0x8c493e).beginPath().arc(36, 31, 5, .25, 2.8).strokePath();
    graphics.lineStyle(2, 0x171044, .6).strokeRoundedRect(16, 34, 40, 35, 12);
    graphics.generateTexture(key, 72, 92).destroy();
  }
}
