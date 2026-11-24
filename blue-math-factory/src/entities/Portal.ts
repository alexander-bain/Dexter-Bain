import Phaser from "phaser";
import { ArtFactory } from "../art/ArtFactory";

export class Portal {
  readonly view: Phaser.GameObjects.Container;
  constructor(scene: Phaser.Scene, readonly x: number, readonly y: number, label: string, colors: [number, number], readonly action: () => void) {
    this.view = ArtFactory.portal(scene, x, y, label, colors);
  }
}
