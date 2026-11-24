import Phaser from "phaser";
import { ArtFactory } from "../art/ArtFactory";
import { session } from "../systems/GameSession";
import { CUSTOMER_TYPES } from "../data/customerTypes";

const WORKER_SHEETS = ["cashier", "janitor", "packer", "operator", "warehouse", "delivery", "manager"];

export class BootScene extends Phaser.Scene {
  constructor() { super("BootScene"); }

  preload(): void {
    this.load.image("package-art", "assets/blueberry-package.png");
    this.load.spritesheet("player", "assets/sprites/player.png", { frameWidth: 96, frameHeight: 128 });
    for (const customer of CUSTOMER_TYPES) this.load.spritesheet(`customer-${customer.id}`, `assets/sprites/customer-${customer.id}.png`, { frameWidth: 96, frameHeight: 128 });
    for (const worker of WORKER_SHEETS) this.load.spritesheet(worker, `assets/sprites/${worker}.png`, { frameWidth: 96, frameHeight: 128 });
    this.load.spritesheet("worker", "assets/sprites/operator.png", { frameWidth: 96, frameHeight: 128 });
  }

  create(): void {
    ArtFactory.generateTextures(this);
    ArtFactory.generateAnimations(this, ["player", ...CUSTOMER_TYPES.map((customer) => `customer-${customer.id}`), ...WORKER_SHEETS, "worker"]);
    const saved = session.previewSavedData();
    if (saved) session.data.settings = { ...session.data.settings, ...saved.settings };
    this.registry.set("reducedMotion", session.data.settings.reducedMotion);
    this.registry.set("graphicsQuality", session.data.settings.graphicsQuality);
    this.scene.start("PreloadScene");
  }
}
