import Phaser from "phaser";
import type { CustomerType } from "../types";

export class Customer {
  readonly sprite: Phaser.GameObjects.Sprite;
  patience: number;
  state: "entering" | "waiting" | "leaving" = "entering";

  constructor(private readonly scene: Phaser.Scene, readonly type: CustomerType, x: number, y: number, patienceSeconds: number) {
    this.sprite = scene.add.sprite(x, y, `customer-${type.id}`).setDepth(y).setScale(.94);
    this.patience = patienceSeconds * type.patience;
  }

  moveTo(x: number, y: number, duration = 500, onComplete?: () => void): void {
    this.scene.tweens.add({
      targets: this.sprite,
      x,
      y,
      duration,
      ease: "Sine.easeInOut",
      onUpdate: () => this.sprite.setDepth(this.sprite.y),
      onComplete: () => onComplete?.()
    });
  }

  leave(x: number, y: number, happy: boolean, onComplete: () => void): void {
    this.state = "leaving";
    const reaction = this.scene.add.text(this.sprite.x, this.sprite.y - 72, happy ? "★" : "…", { fontSize: "25px", color: happy ? "#ffda59" : "#ffffff", stroke: "#24145f", strokeThickness: 5 }).setOrigin(.5).setDepth(3000);
    this.scene.tweens.add({ targets: reaction, y: reaction.y - 30, alpha: 0, duration: 900, onComplete: () => reaction.destroy() });
    this.moveTo(x, y, 900, () => { this.sprite.destroy(); onComplete(); });
  }
}
