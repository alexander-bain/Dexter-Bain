import Phaser from "phaser";

export class Player extends Phaser.Physics.Arcade.Sprite {
  private facing: "down" | "left" | "right" | "up" = "down";

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "player", 20);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true).setDepth(y).setScale(.78);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(42, 38).setOffset(27, 84);
  }

  move(x: number, y: number, deltaSeconds: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const vector = new Phaser.Math.Vector2(x, y);
    if (vector.lengthSq() > 1) vector.normalize();
    const moving = vector.lengthSq() > .02;
    body.setVelocity(vector.x * 250, vector.y * 220);
    if (moving) {
      if (Math.abs(vector.x) > Math.abs(vector.y)) this.facing = vector.x < 0 ? "left" : "right";
      else this.facing = vector.y < 0 ? "up" : "down";
      this.play(`player-walk-${this.facing}`, true).setScale(.78);
    } else {
      this.stop().setFrame({ down: 20, left: 21, right: 22, up: 23 }[this.facing]).setScale(.78);
    }
    this.setDepth(this.y + 40);
  }
}
