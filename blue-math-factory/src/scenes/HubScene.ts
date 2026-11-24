import Phaser from "phaser";
import { ArtFactory } from "../art/ArtFactory";
import { BALANCE, COLORS } from "../data/balance";
import { Portal } from "../entities/Portal";
import { session } from "../systems/GameSession";
import { ui } from "../ui/UIBridge";
import { BaseWorldScene } from "./BaseWorldScene";

export class HubScene extends BaseWorldScene {
  private fountainDrops: Phaser.GameObjects.Arc[] = [];

  constructor() { super("HubScene"); }

  create(): void {
    this.prepareWorld();
    ArtFactory.drawWorldGround(this, BALANCE.worldWidth, BALANCE.worldHeight, 0x72c96d);
    this.drawHub();
    this.setupWorld(960, 1030);
    const offline = this.registry.get("offlineMessage") as string | undefined;
    if (offline) {
      this.registry.remove("offlineMessage");
      this.time.delayedCall(350, () => ui.showToast(offline, "info"));
    }
    this.cameras.main.fadeIn(280, 28, 18, 78);
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    for (const drop of this.fountainDrops) drop.y += Math.sin((time + drop.x * 11) / 300) * .22;
  }

  private drawHub(): void {
    ArtFactory.path(this, [{ x: 960, y: 1120 }, { x: 960, y: 735 }, { x: 430, y: 525 }]);
    ArtFactory.path(this, [{ x: 960, y: 735 }, { x: 960, y: 425 }]);
    ArtFactory.path(this, [{ x: 960, y: 735 }, { x: 1490, y: 525 }]);
    const snapshot = session.economy.snapshot();

    const water = this.add.graphics().setDepth(-29);
    water.fillStyle(0x58cbe3).fillEllipse(960, 754, 310, 176);
    water.lineStyle(9, 0xe5d7ae).strokeEllipse(960, 754, 320, 186);
    water.fillStyle(0xffffff, .32).fillEllipse(920, 726, 110, 22);
    const fountainBase = this.add.graphics().setDepth(756);
    fountainBase.fillStyle(0x7586bd).fillEllipse(960, 770, 150, 55);
    fountainBase.fillStyle(0xa9b9df).fillEllipse(960, 752, 134, 48);
    fountainBase.fillStyle(0x4054c5).fillCircle(960, 704, 42);
    fountainBase.fillStyle(0x6e8cff).fillCircle(946, 690, 14);
    fountainBase.lineStyle(4, 0x283385).strokeCircle(960, 704, 42);
    for (let index = 0; index < 7; index += 1) {
      const angle = index / 7 * Math.PI * 2;
      const drop = this.add.circle(960 + Math.cos(angle) * 52, 689 + Math.sin(angle) * 18, 5, 0xb8f5ff, .9).setDepth(760);
      this.fountainDrops.push(drop);
    }
    this.add.text(960, 820, "BLUEBERRY FOUNTAIN", { fontFamily: "Trebuchet MS", fontSize: "14px", fontStyle: "bold", color: "#2e286d", stroke: "#fff7d8", strokeThickness: 5 }).setOrigin(.5).setDepth(821);

    const portals = [
      new Portal(this, 430, 470, "BLUEBERRY\nCHALLENGE", [0x7ee8ff, 0x4d42d8], () => this.transitionTo("MathChallengeScene")),
      new Portal(this, 960, 370, "FACTORY", [0xffcc57, 0x5f4dd7], () => this.transitionTo("FactoryScene")),
      new Portal(this, 1490, 470, "STORE", [0x65edb0, 0x4264df], () => this.transitionTo("StoreScene"))
    ];
    for (const portal of portals) this.addInteraction(portal.x, portal.y + 35, `Enter ${portal === portals[0] ? "Blueberry Challenge" : portal === portals[1] ? "Factory" : "Store"}`, portal.action, 140);

    ArtFactory.building(this, 960, 180, 360 + Math.min(180, snapshot.factoryLevel * 9), 205 + Math.min(80, snapshot.factoryLevel * 4), { color: 0x6351d3, roof: 0x32278d, label: snapshot.factoryLevel < 10 ? "TINY BERRY WORKSHOP" : "BLUEBERRY FACTORY", windows: Math.min(6, 2 + Math.floor(snapshot.factoryLevel / 5)), level: snapshot.factoryLevel });
    this.addBlocker(960, 192, 500, 215);
    ArtFactory.building(this, 1490, 235, 280 + Math.min(180, snapshot.storeLevel * 8), 170 + Math.min(80, snapshot.storeLevel * 4), { color: 0xec9177, roof: 0x59358e, label: snapshot.storeLevel < 10 ? "BERRY STAND" : "BLUEBERRY MARKET", windows: Math.min(5, 2 + Math.floor(snapshot.storeLevel / 6)), level: snapshot.storeLevel });
    this.addBlocker(1490, 250, 390, 180);

    const signPositions = [[690, 925, "MATH MAKES\nBERRIES"], [1230, 925, "GROW YOUR\nBUSINESS"], [960, 920, "WELCOME!"]];
    for (const [x, y, label] of signPositions) {
      const post = this.add.rectangle(x as number, y as number, 10, 70, 0x7b4e3d).setDepth((y as number));
      const sign = this.add.text(x as number, (y as number) - 48, label as string, { align: "center", fontFamily: "Trebuchet MS", fontSize: "13px", fontStyle: "bold", color: "#ffffff", backgroundColor: "#4d3aba", padding: { x: 12, y: 8 }, stroke: "#24175e", strokeThickness: 4 }).setOrigin(.5).setDepth((y as number) + 1);
      post.setStrokeStyle(2, 0x4a2c2e); sign.setAngle((x as number) < 960 ? -3 : (x as number) > 960 ? 3 : 0);
    }

    const treePositions = [[120,220],[280,810],[1700,820],[1790,260],[80,1010],[1840,1040],[680,140],[1250,120]];
    treePositions.forEach(([x, y], index) => ArtFactory.tree(this, x, y, .8 + (index % 3) * .12));
    [[260,570],[570,310],[720,590],[1200,590],[1360,330],[1650,590],[520,980],[1410,1010]].forEach(([x,y]) => ArtFactory.bush(this, x, y, .9));
    [[360,700],[1545,720],[760,780],[1160,780]].forEach(([x,y]) => ArtFactory.crate(this, x, y));

    if (snapshot.factoryLevel >= 3) {
      for (let index = 0; index < Math.min(5, 1 + Math.floor(snapshot.factoryLevel / 6)); index += 1) {
        const worker = this.add.sprite(760 + index * 95, 275 + (index % 2) * 45, "worker").setDepth(350).setScale(.75);
        this.tweens.add({ targets: worker, x: worker.x + 65, duration: 1600 + index * 230, yoyo: true, repeat: -1 });
      }
    }
    if (session.economy.upgrades.has("delivery-truck")) {
      const truck = this.add.container(1180, 270).setDepth(360);
      const body = this.add.rectangle(0, 0, 130, 62, 0x4c64dc).setStrokeStyle(4, 0x24225c);
      const cab = this.add.rectangle(70, 12, 55, 48, 0x70ddec).setStrokeStyle(4, 0x24225c);
      truck.add([body, cab, this.add.circle(-36, 34, 18, 0x272440), this.add.circle(62, 34, 18, 0x272440)]);
      this.tweens.add({ targets: truck, x: 1380, duration: 4200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
  }
}
