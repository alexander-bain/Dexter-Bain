import Phaser from "phaser";
import type { CustomerType } from "../types";

export class Customer {
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly berrySprite: Phaser.GameObjects.Image;
  private readonly berryCount: Phaser.GameObjects.Text;
  patience: number;
  state: "entering" | "waiting" | "leaving" = "entering";
  private readonly animationKey: string;

  constructor(private readonly scene: Phaser.Scene, readonly type: CustomerType, x: number, y: number, patienceSeconds: number) {
    this.animationKey = `customer-${type.id}`;
    this.sprite = scene.add.sprite(x, y, this.animationKey, 20).setDepth(y).setScale(.7);
    this.berrySprite = scene.add.image(x + 20, y - 13, "berry").setScale(.72).setDepth(y + 2).setVisible(false);
    this.berryCount = scene.add.text(x + 34, y - 36, "", { fontFamily: "Trebuchet MS", fontSize: "13px", fontStyle: "bold", color: "#ffffff", backgroundColor: "#342277", padding: { x: 4, y: 2 } }).setOrigin(.5).setDepth(y + 3).setVisible(false);
    this.patience = patienceSeconds * type.patience;
  }

  moveTo(x: number, y: number, duration = 500, onComplete?: () => void): void {
    const dx = x - this.sprite.x;
    const dy = y - this.sprite.y;
    const direction = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
    this.sprite.play(`${this.animationKey}-walk-${direction}`, true);
    this.scene.tweens.add({
      targets: this.sprite,
      x,
      y,
      duration,
      ease: "Sine.easeInOut",
      onUpdate: () => {
        this.sprite.setDepth(this.sprite.y);
        this.berrySprite.setPosition(this.sprite.x + 20, this.sprite.y - 13).setDepth(this.sprite.y + 2);
        this.berryCount.setPosition(this.sprite.x + 34, this.sprite.y - 36).setDepth(this.sprite.y + 3);
      },
      onComplete: () => { this.sprite.stop().setFrame({ down: 20, left: 21, right: 22, up: 23 }[direction]); onComplete?.(); }
    });
  }

  setBerryCount(count: number): void {
    const visible = count > 0;
    this.berrySprite.setVisible(visible);
    this.berryCount.setVisible(count > 1).setText(String(count));
  }

  destroy(): void {
    this.sprite.destroy();
    this.berrySprite.destroy();
    this.berryCount.destroy();
  }

  leave(x: number, y: number, happy: boolean, onComplete: () => void): void {
    this.state = "leaving";
    const reaction = this.scene.add.text(this.sprite.x, this.sprite.y - 72, happy ? "★" : "…", { fontSize: "25px", color: happy ? "#ffda59" : "#ffffff", stroke: "#24145f", strokeThickness: 5 }).setOrigin(.5).setDepth(3000);
    this.scene.tweens.add({ targets: reaction, y: reaction.y - 30, alpha: 0, duration: 900, onComplete: () => reaction.destroy() });
    this.moveTo(x, y, 900, () => { this.destroy(); onComplete(); });
  }
}
