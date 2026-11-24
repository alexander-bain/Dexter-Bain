import Phaser from "phaser";

export class Player extends Phaser.Physics.Arcade.Sprite {
  private walkElapsed = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "player-idle");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true).setDepth(y).setScale(1.05);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(34, 32).setOffset(19, 54);
  }

  move(x: number, y: number, deltaSeconds: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const vector = new Phaser.Math.Vector2(x, y);
    if (vector.lengthSq() > 1) vector.normalize();
    const moving = vector.lengthSq() > .02;
    body.setVelocity(vector.x * 250, vector.y * 220);
    if (moving) {
      this.walkElapsed += deltaSeconds * 9;
      const texture = Math.floor(this.walkElapsed) % 2 === 0 ? "player-walk-a" : "player-walk-b";
      this.setTexture(texture);
      if (Math.abs(vector.x) > .08) this.setFlipX(vector.x < 0);
      this.setScale(1.05, 1.05 + Math.sin(this.walkElapsed * Math.PI) * .015);
    } else {
      this.setTexture("player-idle").setScale(1.05);
    }
    this.setDepth(this.y + 40);
  }
}
