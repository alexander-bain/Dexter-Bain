import Phaser from "phaser";
import { COLORS } from "../data/balance";

export class PreloadScene extends Phaser.Scene {
  constructor() { super("PreloadScene"); }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(COLORS.ink);
    const berry = this.add.image(width / 2, height / 2 - 65, "berry").setScale(2.4);
    const title = this.add.text(width / 2, height / 2, "Warming up the factory…", { fontFamily: "Trebuchet MS", fontSize: "22px", fontStyle: "bold", color: "#ffffff" }).setOrigin(.5);
    const track = this.add.rectangle(width / 2, height / 2 + 50, 260, 14, 0x31277b).setStrokeStyle(2, 0xffffff, .4);
    const fill = this.add.rectangle(width / 2 - 126, height / 2 + 50, 0, 8, COLORS.cyan).setOrigin(0, .5);
    this.tweens.add({ targets: berry, y: berry.y - 12, duration: 400, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: fill, width: 252, duration: 480, ease: "Sine.easeInOut", onComplete: () => this.scene.start("MenuScene") });
    track.setDepth(-1);
    title.setAlpha(.9);
  }
}
