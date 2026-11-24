import Phaser from "phaser";
import { BALANCE } from "../data/balance";
import { Player } from "../entities/Player";
import { session } from "../systems/GameSession";
import type { SceneKey } from "../types";
import type { StoreAwayReport } from "../types";
import { ui } from "../ui/UIBridge";

interface InteractionZone {
  x: number;
  y: number;
  radius: number;
  label: string;
  action: () => void;
}

export abstract class BaseWorldScene extends Phaser.Scene {
  protected player!: Player;
  protected interactions: InteractionZone[] = [];
  protected blockers!: Phaser.Physics.Arcade.StaticGroup;
  protected frozen = false;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<"up" | "down" | "left" | "right" | "interact" | "space" | "escape", Phaser.Input.Keyboard.Key>;
  private activeInteraction: InteractionZone | null = null;
  private hudElapsed = 0;
  private tapTarget: Phaser.Math.Vector2 | null = null;
  protected entryReport: StoreAwayReport | null = null;

  protected constructor(readonly sceneKey: SceneKey) {
    super(sceneKey);
  }

  protected setupWorld(startX: number, startY: number): void {
    this.physics.world.setBounds(0, 0, BALANCE.worldWidth, BALANCE.worldHeight);
    this.cameras.main.setBounds(0, 0, BALANCE.worldWidth, BALANCE.worldHeight);
    if (!this.blockers) this.blockers = this.physics.add.staticGroup();
    this.player = new Player(this, startX, startY);
    this.physics.add.collider(this.player, this.blockers);
    this.cameras.main.startFollow(this.player, true, .09, .09).setZoom(this.scale.width < 700 ? .82 : 1);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys({ up: "W", down: "S", left: "A", right: "D", interact: "E", space: "SPACE", escape: "ESC" }) as typeof this.keys;
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.frozen) return;
      const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.tapTarget = new Phaser.Math.Vector2(point.x, point.y);
    });
    this.entryReport = session.enterScene(this.sceneKey);
    ui.showHUD(this.sceneKey, () => this.pauseGame());
  }

  protected prepareWorld(): void {
    this.interactions = [];
    this.activeInteraction = null;
    ui.setInteraction(null);
    this.tapTarget = null;
    this.frozen = false;
    this.blockers = this.physics.add.staticGroup();
  }

  protected addBlocker(x: number, y: number, width: number, height: number): void {
    if (!this.blockers) this.blockers = this.physics.add.staticGroup();
    const blocker = this.blockers.create(x, y, "blocker") as Phaser.Physics.Arcade.Image;
    blocker.setVisible(false).setDisplaySize(width, height).refreshBody();
  }

  protected addInteraction(x: number, y: number, label: string, action: () => void, radius = 120): void {
    this.interactions.push({ x, y, label, action, radius });
  }

  protected transitionTo(key: SceneKey): void {
    this.frozen = true;
    session.audio.play("portal");
    session.save(this.sceneKey);
    this.cameras.main.fadeOut(260, 29, 20, 86);
    this.time.delayedCall(270, () => this.scene.start(key));
  }

  protected pauseGame(): void {
    if (this.frozen) return;
    this.frozen = true;
    this.physics.world.pause();
    ui.showPause(this.sceneKey, () => this.resumeGame(), () => {
      session.save(this.sceneKey);
      session.leaveForMenu();
      this.scene.start("MenuScene");
    });
  }

  protected resumeGame(): void {
    this.frozen = false;
    this.physics.world.resume();
    ui.showHUD(this.sceneKey, () => this.pauseGame());
  }

  update(_time: number, delta: number): void {
    const seconds = delta / 1000;
    if (Phaser.Input.Keyboard.JustDown(this.keys.escape)) {
      if (this.frozen) this.resumeGame(); else this.pauseGame();
      return;
    }
    if (this.frozen) return;
    const touch = ui.touchVector();
    let x = (this.cursors.left.isDown || this.keys.left.isDown ? -1 : 0) + (this.cursors.right.isDown || this.keys.right.isDown ? 1 : 0) + touch.x;
    let y = (this.cursors.up.isDown || this.keys.up.isDown ? -1 : 0) + (this.cursors.down.isDown || this.keys.down.isDown ? 1 : 0) + touch.y;
    if (Math.abs(x) + Math.abs(y) > .08) this.tapTarget = null;
    if (this.tapTarget && Math.abs(x) + Math.abs(y) <= .08) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.tapTarget.x, this.tapTarget.y);
      if (distance < 18) this.tapTarget = null;
      else {
        const direction = new Phaser.Math.Vector2(this.tapTarget.x - this.player.x, this.tapTarget.y - this.player.y).normalize();
        x = direction.x;
        y = direction.y;
      }
    }
    this.player.move(x, y, seconds);
    this.updateInteraction();
    if (this.activeInteraction && (Phaser.Input.Keyboard.JustDown(this.keys.interact) || Phaser.Input.Keyboard.JustDown(this.keys.space))) this.activeInteraction.action();
    this.hudElapsed += delta;
    if (this.hudElapsed >= 400) {
      ui.updateHUD();
      for (const message of session.checkQuests()) ui.showToast(message);
      if (session.data.victory.unlocked && !session.data.victory.celebrated) {
        session.data.victory.celebrated = true;
        this.frozen = true;
        this.physics.world.pause();
        session.save(this.sceneKey);
        session.audio.play("upgrade");
        ui.showVictory(() => {
          this.frozen = false;
          this.physics.world.resume();
          ui.showHUD(this.sceneKey, () => this.pauseGame());
        });
      }
      this.hudElapsed = 0;
    }
  }

  private updateInteraction(): void {
    const nearest = this.interactions
      .map((zone) => ({ zone, distance: Phaser.Math.Distance.Between(this.player.x, this.player.y, zone.x, zone.y) }))
      .filter(({ zone, distance }) => distance <= zone.radius)
      .sort((left, right) => left.distance - right.distance)[0]?.zone ?? null;
    if (nearest !== this.activeInteraction) {
      this.activeInteraction = nearest;
      ui.setInteraction(nearest?.label ?? null, nearest ? () => nearest.action() : undefined);
    }
  }
}
