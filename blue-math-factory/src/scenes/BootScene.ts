import Phaser from "phaser";
import { ArtFactory } from "../art/ArtFactory";
import { session } from "../systems/GameSession";

export class BootScene extends Phaser.Scene {
  constructor() { super("BootScene"); }

  create(): void {
    ArtFactory.generateTextures(this);
    const saved = session.previewSavedData();
    if (saved) session.data.settings = { ...session.data.settings, ...saved.settings };
    this.registry.set("reducedMotion", session.data.settings.reducedMotion);
    this.scene.start("PreloadScene");
  }
}
