import Phaser from "phaser";
import { ArtFactory } from "../art/ArtFactory";
import { COLORS } from "../data/balance";
import { MathEngine } from "../systems/MathEngine";
import { session } from "../systems/GameSession";
import type { MathQuestion } from "../types";
import { ui } from "../ui/UIBridge";

export class MathChallengeScene extends Phaser.Scene {
  private engine!: MathEngine;
  private question!: MathQuestion;
  private streak = 0;
  private roundBerries = 0;
  private remaining = 5;
  private selectedIndex = 0;
  private startedAt = 0;
  private locked = false;
  private beltBerries: Phaser.GameObjects.Image[] = [];
  private feedback!: Phaser.GameObjects.Text;
  private keys!: { left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key; enter: Phaser.Input.Keyboard.Key; escape: Phaser.Input.Keyboard.Key; numbers: Phaser.Input.Keyboard.Key[] };

  constructor() { super("MathChallengeScene"); }

  create(): void {
    session.enterScene("MathChallengeScene");
    this.engine = new MathEngine(session.data.mathStats);
    this.drawArena();
    this.feedback = this.add.text(this.scale.width / 2, this.scale.height * .2, "", { fontFamily: "Trebuchet MS", fontSize: "34px", fontStyle: "bold", color: "#ffffff", stroke: "#26136d", strokeThickness: 8 }).setOrigin(.5).setDepth(2000);
    this.keys = {
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      enter: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      escape: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
      numbers: [
        this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
        this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
        this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
        this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR)
      ]
    };
    this.startQuestion();
    this.cameras.main.fadeIn(280, 28, 16, 77);
  }

  update(_time: number, delta: number): void {
    for (const berry of this.beltBerries) {
      berry.x += delta * .09;
      berry.angle += delta * .1;
      if (berry.x > this.scale.width + 30) berry.x = -30;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.escape)) this.returnHub();
    if (this.locked) return;
    this.remaining -= delta / 1000;
    ui.updateMathTimer(this.remaining);
    if (this.remaining <= 0) {
      this.answer(-1);
      return;
    }
    this.keys.numbers.forEach((key, index) => {
      if (Phaser.Input.Keyboard.JustDown(key)) this.answer(this.question.choices[index]);
    });
    if (Phaser.Input.Keyboard.JustDown(this.keys.left)) this.moveSelection(-1);
    if (Phaser.Input.Keyboard.JustDown(this.keys.right)) this.moveSelection(1);
    if (Phaser.Input.Keyboard.JustDown(this.keys.enter)) this.answer(this.question.choices[this.selectedIndex]);
  }

  private startQuestion(): void {
    this.locked = false;
    this.selectedIndex = 0;
    this.question = this.engine.createQuestion(this.streak);
    this.remaining = this.question.duration;
    this.startedAt = performance.now();
    ui.showMath(this.question, this.streak, this.roundBerries, this.selectedIndex, (answer) => this.answer(answer), () => this.returnHub());
    ui.announce(`${this.question.a} times ${this.question.b}. ${this.question.duration} seconds.`);
  }

  private moveSelection(direction: number): void {
    this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex + direction, 0, 4);
    this.renderCurrentQuestion();
  }

  private renderCurrentQuestion(): void {
    ui.showMath(this.question, this.streak, this.roundBerries, this.selectedIndex, (answer) => this.answer(answer), () => this.returnHub());
  }

  private answer(answer: number): void {
    if (this.locked) return;
    this.locked = true;
    const correct = answer === this.question.answer;
    const responseMs = Math.max(1, performance.now() - this.startedAt);
    this.engine.record(this.question, correct, responseMs, correct ? this.streak + 1 : 0);
    ui.markAnswer(answer, this.question.answer);
    if (correct) {
      this.streak += 1;
      const reward = this.question.reward;
      const gains = session.economy.addMathBerries(reward, this.streak);
      this.roundBerries += gains.berries;
      session.audio.play("correct");
      const messages = ["CORRECT!", "BERRY IMPRESSIVE!", "PERFECT!", "FACTORY POWER +!", "AWESOME MATH!"];
      this.showFeedback(messages[(this.streak - 1) % messages.length], 0x7af0b7);
      this.berryBurst();
      const boost = this.streak < 5 ? session.economy.activateStreakBoost(this.streak) : null;
      if (boost) this.time.delayedCall(180, () => this.showFeedback(boost, COLORS.cyan));
      session.save("MathChallengeScene");
      if (this.streak === 5) {
        const perfect = session.economy.awardPerfectRush();
        this.roundBerries += perfect.raw;
        session.audio.play("upgrade");
        this.showFeedback("PERFECT RUSH!", COLORS.gold);
        session.save("MathChallengeScene");
        this.time.delayedCall(750, () => ui.showPerfectRush(this.roundBerries, perfect.power, () => {
          this.streak = 0;
          this.roundBerries = 0;
          this.startQuestion();
        }, () => this.returnHub()));
      } else {
        this.time.delayedCall(520, () => this.startQuestion());
      }
    } else {
      session.audio.play("wrong");
      this.showFeedback(answer < 0 ? "TIME'S UP — NICE TRY!" : "SO CLOSE — KEEP GOING!", 0xffb57c);
      session.save("MathChallengeScene");
      this.time.delayedCall(900, () => ui.showMathResult(this.question.answer, this.roundBerries, () => {
        this.streak = 0;
        this.roundBerries = 0;
        this.startQuestion();
      }, () => this.returnHub()));
    }
  }

  private showFeedback(message: string, color: number): void {
    this.feedback.setText(message).setColor(`#${color.toString(16).padStart(6, "0")}`).setScale(.6).setAlpha(1);
    this.tweens.killTweensOf(this.feedback);
    this.tweens.add({ targets: this.feedback, scale: 1, duration: 180, ease: "Back.easeOut", yoyo: true, hold: 500 });
    ui.announce(message);
  }

  private berryBurst(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    for (let index = 0; index < 14; index += 1) {
      const berry = this.add.image(centerX, centerY, "berry").setScale(.35 + Math.random() * .3).setDepth(1900);
      const angle = index / 14 * Math.PI * 2;
      this.tweens.add({ targets: berry, x: centerX + Math.cos(angle) * Phaser.Math.Between(110, 260), y: centerY + Math.sin(angle) * Phaser.Math.Between(90, 200), angle: Phaser.Math.Between(-180, 180), alpha: 0, duration: 650, ease: "Cubic.easeOut", onComplete: () => berry.destroy() });
    }
  }

  private returnHub(): void {
    session.save("HubScene");
    this.cameras.main.fadeOut(230, 25, 15, 72);
    this.time.delayedCall(240, () => this.scene.start("HubScene"));
  }

  private drawArena(): void {
    const { width, height } = this.scale;
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x171050, 0x171050, 0x34238d, 0x34238d).fillRect(0, 0, width, height);
    graphics.fillStyle(0x4639a8).fillEllipse(width / 2, height * .66, width * .86, height * .6);
    graphics.lineStyle(8, 0x7ee8ff, .38).strokeEllipse(width / 2, height * .66, width * .86, height * .6);
    graphics.lineStyle(2, 0x8c78ed, .35);
    for (let x = 0; x < width; x += 70) graphics.lineBetween(x, height * .48, x + 180, height);
    for (let x = 0; x < width + 180; x += 70) graphics.lineBetween(x, height, x - 180, height * .48);

    const leftMachine = ArtFactory.machine(this, Math.max(90, width * .12), height * .58, "MATH MIXER", 0x4a6ee6, width < 700 ? .65 : 1);
    const rightMachine = ArtFactory.machine(this, Math.min(width - 90, width * .88), height * .58, "BERRY BLASTER", 0x9a4fd0, width < 700 ? .65 : 1);
    leftMachine.setDepth(30); rightMachine.setDepth(30);
    const belt = this.add.graphics().setDepth(25);
    belt.fillStyle(0x24245c).fillRoundedRect(0, height * .86, width, 70, 18);
    belt.fillStyle(0x8595b2).fillRect(0, height * .86 + 8, width, 28);
    for (let x = 20; x < width; x += 54) belt.fillStyle(0x32344d).fillCircle(x, height * .86 + 51, 16);
    for (let index = 0; index < 10; index += 1) this.beltBerries.push(this.add.image(index * width / 9, height * .86 + 4, "berry").setScale(.7).setDepth(26));
    for (let index = 0; index < 18; index += 1) {
      const star = this.add.circle(Phaser.Math.Between(20, width - 20), Phaser.Math.Between(100, Math.floor(height * .75)), Phaser.Math.Between(1, 3), 0xb3f5ff, .6);
      this.tweens.add({ targets: star, alpha: .1, duration: 700 + index * 35, yoyo: true, repeat: -1 });
    }
  }
}
