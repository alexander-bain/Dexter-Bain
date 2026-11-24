import Phaser from "phaser";
import "./styles.css";
import { BootScene } from "./scenes/BootScene";
import { FactoryScene } from "./scenes/FactoryScene";
import { HubScene } from "./scenes/HubScene";
import { MathChallengeScene } from "./scenes/MathChallengeScene";
import { MenuScene } from "./scenes/MenuScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { StoreScene } from "./scenes/StoreScene";
import { session } from "./systems/GameSession";
import { ui } from "./ui/UIBridge";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#181044",
  transparent: false,
  antialias: true,
  roundPixels: false,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight
  },
  physics: {
    default: "arcade",
    arcade: { gravity: { x: 0, y: 0 }, debug: false }
  },
  render: { powerPreference: "high-performance", antialias: true },
  input: { activePointers: 3 },
  scene: [BootScene, PreloadScene, MenuScene, HubScene, MathChallengeScene, FactoryScene, StoreScene]
});

ui.connect(game);
game.events.on(Phaser.Core.Events.STEP, (_time: number, delta: number) => session.update(delta / 1000));
window.addEventListener("beforeunload", () => {
  if (session.hasSave()) session.save();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && session.hasSave()) session.save();
});

declare global {
  interface Window {
    BlueMathDebug?: {
      session: typeof session;
      game: Phaser.Game;
      setResources: (values: Partial<Pick<typeof session.data, "rawBlueberries" | "warehousePackages" | "storeBackroomPackages" | "money" | "mathPower">>) => void;
    };
  }
}

// A small read-only-friendly hook makes automated browser QA possible without
// changing the player experience.
window.BlueMathDebug = {
  session,
  game,
  setResources: (values) => {
    Object.assign(session.data, values);
    session.economy.inventory.clamp();
  }
};
