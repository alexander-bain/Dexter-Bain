import { Bullet, ENEMY_TYPES, Enemy, Particle, Player, rectsOverlap } from "./entities.js";
import { MLPolicy } from "./mlPolicy.js";
import { saveHighScore } from "./storage.js";

const WIDTH = 960;
const HEIGHT = 640;
const PLAYER_Y = HEIGHT - 70;
const INVASION_LINE_Y = HEIGHT - 168;
const PLAYER_MIN_Y = INVASION_LINE_Y + 12;
const DIVE_ATTACK_MAX_Y = HEIGHT - 86;
const SAMPLE_INTERVAL = 0.12;

export class Game {
  constructor(canvas, hud, overlay, input, mode = "one") {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.hud = hud;
    this.overlay = overlay;
    this.input = input;
    this.mode = mode;
    this.policy = new MLPolicy().load();
    this.lastTime = 0;
    this.running = false;
    this.paused = false;
    this.levelTransition = 0;
    this.sampleTimer = 0;
    this.enemyFireTimer = 0;
    this.ended = false;
    this.endReason = "Game Over";
    this.idleSampleBudget = 0;
    this.mlDebug = null;
    this.diveTimer = 0;
    this.botActionMemory = { moveX: 0, moveY: 0, fire: false, changedAt: 0 };
    this.scorePopups = [];
    this.selfPlayTimer = 0;
    this.lastBotScore = 0;
    this.lastBotLives = 3;
    this.lastBotAction = { moveX: 0, moveY: 0, fire: false };
    this.evolutionStats = { selfSamples: 0, mistakes: 0, reward: 0 };
    this.stars = Array.from({ length: 110 }, () => ({
      x: Math.random() * WIDTH,
      y: Math.random() * HEIGHT,
      speed: 20 + Math.random() * 70,
      size: 1 + Math.floor(Math.random() * 3),
    }));
  }

  start() {
    this.players = [new Player(this.mode === "two" ? WIDTH * 0.34 : WIDTH / 2, PLAYER_Y, "#55e6ff", "P1")];
    if (this.mode === "two") {
      this.players.push(new Player(WIDTH * 0.66, PLAYER_Y, "#8dffcf", "P2"));
    }
    this.players.forEach((player) => {
      player.lives = 3;
      player.score = 0;
      player.y = PLAYER_Y;
    });
    this.level = 1;
    this.playerBullets = [];
    this.enemyBullets = [];
    this.particles = [];
    this.scorePopups = [];
    this.enemyFireTimer = 1.4;
    this.diveTimer = 3.2;
    this.botActionMemory = { moveX: 0, moveY: 0, fire: false, changedAt: performance.now() };
    this.selfPlayTimer = 0;
    this.lastBotScore = 0;
    this.lastBotLives = 3;
    this.lastBotAction = { moveX: 0, moveY: 0, fire: false };
    this.evolutionStats = { selfSamples: 0, mistakes: 0, reward: 0 };
    this.spawnLevel();
    this.running = true;
    this.paused = false;
    this.ended = false;
    this.endReason = "Game Over";
    this.hideOverlay();
    this.updateHud();
    this.lastTime = performance.now();
    requestAnimationFrame((time) => this.loop(time));
  }

  restart() {
    this.start();
  }

  stop() {
    this.running = false;
  }

  togglePause() {
    if (this.ended) return;
    this.paused = !this.paused;
    this.overlay.innerHTML = this.paused ? "<strong>Paused</strong><br>Press P or Pause to resume." : "";
    this.overlay.classList.toggle("hidden", !this.paused);
  }

  loop(time) {
    if (!this.running) return;
    const dt = Math.min(0.033, (time - this.lastTime) / 1000 || 0);
    this.lastTime = time;

    if (this.input.consumePausePress()) this.togglePause();
    if (!this.paused && !this.ended) this.update(dt);
    this.draw();
    requestAnimationFrame((nextTime) => this.loop(nextTime));
  }

  getDifficultyForLevel(level) {
    return {
      enemyRows: Math.min(5, 2 + Math.floor(level / 2)),
      enemyCols: Math.min(10, 6 + Math.ceil(level / 2)),
      enemySpeed: 30 + level * 10,
      enemyFireRate: 0.24 + level * 0.2,
      enemyBulletSpeed: 138 + level * 24,
      enemyAimAccuracy: Math.min(0.82, 0.2 + level * 0.07),
      enemyDescentSpeed: 0.08 + level * 0.12,
      descentStep: Math.min(8, 1 + level * 1.1),
      diveEvery: Math.max(1.35, 5.8 - level * 0.55),
      diveSpeed: 0.74 + level * 0.1,
      maxDivers: Math.min(4, 1 + Math.floor(level / 3)),
      maxEnemyShots: Math.min(14, 2 + level * 2),
      specialEnemyRatio: Math.min(0.44, 0.04 + level * 0.055),
    };
  }

  spawnLevel() {
    this.difficulty = this.getDifficultyForLevel(this.level);
    const { enemyCols, enemyRows } = this.difficulty;
    const margin = 112;
    const usableWidth = WIDTH - margin * 2;
    const gapX = usableWidth / Math.max(1, enemyCols - 1);
    const gapY = 42;
    const startY = 68;
    this.enemies = [];

    for (let row = 0; row < enemyRows; row += 1) {
      for (let col = 0; col < enemyCols; col += 1) {
        const type = this.pickEnemyType(row, col);
        this.enemies.push(new Enemy(margin + col * gapX, startY + row * gapY, type));
      }
    }

    this.formationOffset = 0;
    this.formationDirection = 1;
    this.levelTransition = 1.25;
  }

  pickEnemyType(row, col) {
    const ratio = this.difficulty.specialEnemyRatio;
    if (this.level >= 2 && row === 0 && (col === 1 || col === this.difficulty.enemyCols - 2)) return ENEMY_TYPES.tank;
    if (this.level >= 4 && row === 0 && (row + col) % 4 === 0) return ENEMY_TYPES.tank;
    if (this.level >= 2 && (row * 2 + col) % 6 === 0) return ENEMY_TYPES.shooter;
    if (Math.random() < ratio || (row + col + this.level) % 7 === 0) return ENEMY_TYPES.fast;
    return ENEMY_TYPES.basic;
  }

  update(dt) {
    this.updateStars(dt);
    const actions = this.getActions();
    this.players.forEach((player, index) => {
      if (player.lives <= 0) return;
      player.update(dt, actions[index] ?? { moveX: 0, moveY: 0, fire: false }, {
        width: WIDTH,
        height: HEIGHT,
        minY: PLAYER_MIN_Y,
      });
      if (actions[index]?.fire && player.canFire()) {
        this.playerBullets.push(player.fire());
      }
    });

    this.updateEnemyFormation(dt);
    this.updateBullets(dt);
    this.updateEnemyFire(dt);
    this.updateTractorBeams(dt);
    this.updateParticles(dt);
    this.updateScorePopups(dt);
    this.handleCollisions();
    this.recordTrainingSample(dt, actions[0]);
    this.recordBotEvolution(dt, actions[0]);
    this.checkLevelOrGameEnd();

    this.levelTransition = Math.max(0, this.levelTransition - dt);
    this.updateHud();
  }

  getActions() {
    if (this.mode === "bot") {
      return [this.applyMLPrediction(this.players[0])];
    }
    const actions = [this.input.getPlayerAction(1)];
    if (this.mode === "two") actions.push(this.input.getPlayerAction(2));
    return actions;
  }

  applyMLPrediction(player) {
    const mlState = this.extractMLState(player);
    const prediction = this.policy.predict(mlState.vector);
    const fallback = this.fallbackBotPolicy(player, mlState);
    const weak = !prediction.ready || prediction.confidence < 0.34 || !prediction.fireConfidence;
    let action = weak ? fallback : {
      moveX: prediction.moveX,
      moveY: prediction.moveY,
      fire: prediction.fire,
    };

    const targetDx = fallback.target ? fallback.target.x - player.x : 0;
    if (fallback.dodging) {
      action.moveX = fallback.moveX;
      action.moveY = fallback.moveY;
    } else if (fallback.target) {
      if (Math.abs(targetDx) > 32) action.moveX = Math.sign(targetDx);
      if (Math.abs(targetDx) < 24) action.moveX = 0;
      action.moveY = fallback.moveY;
    }
    if (fallback.target && Math.abs(targetDx) > 90 && !fallback.immediateThreat) {
      action.moveX = Math.sign(targetDx);
    }
    if (!action.fire && fallback.fire && (prediction.fireConfidence < 0.82 || player.timeSinceLastShot > 0.65)) {
      action = { ...action, fire: true };
    }
    if (!action.fire && action.moveX === 0 && action.moveY === 0) {
      action = fallback;
    }
    if (Math.abs(action.moveX) === 0 && fallback.moveX !== 0 && prediction.confidence < 0.5) {
      action.moveX = fallback.moveX;
    }

    // Edge correction prevents a sparse model from camping at a wall forever.
    if ((player.x < 65 && action.moveX < 0) || (player.x > WIDTH - 65 && action.moveX > 0)) {
      action.moveX = -Math.sign(action.moveX || player.x - WIDTH / 2);
    }
    if ((player.y < PLAYER_MIN_Y + 28 && action.moveY < 0) || (player.y > HEIGHT - 48 && action.moveY > 0)) {
      action.moveY = 0;
    }
    action = this.smoothBotAction(action, fallback, player);

    this.mlDebug = {
      ...prediction,
      ...mlState.debug,
      usedFallback: weak,
      targetDx: Math.round(targetDx),
      action,
    };
    return action;
  }

  fallbackBotPolicy(player, mlState) {
    const target = this.getBotAimTarget(player);
    const nearestBullet = mlState.nearestBullet;
    let moveX = 0;
    let moveY = 0;
    let dodging = false;
    let immediateThreat = false;

    if (target) {
      const dx = target.x - player.x;
      const desiredY = clamp(target.y + 165, PLAYER_MIN_Y + 42, HEIGHT - 46);
      if (Math.abs(dx) > 28) moveX = Math.sign(dx);
      if (Math.abs(player.y - desiredY) > 28) moveY = Math.sign(desiredY - player.y);
    }

    if (nearestBullet) {
      const dx = nearestBullet.x - player.x;
      const dy = nearestBullet.y - player.y;
      const dangerous = dy < 150 && dy > -45 && Math.abs(dx) < 80;
      if (dangerous) {
        moveX = dx <= 0 ? 1 : -1;
        moveY = player.y > PLAYER_MIN_Y + 80 ? -1 : 1;
        dodging = true;
        immediateThreat = dy > -20 && dy < 75 && Math.abs(dx) < 58;
      }
    }

    const aligned = target && target.y < player.y - 24 && Math.abs(target.x - player.x) < 34;
    return {
      moveX,
      moveY,
      fire: Boolean(aligned),
      target,
      dodging,
      immediateThreat,
    };
  }

  getBotAimTarget(player) {
    const positions = this.enemies.map((enemy) => ({
      enemy,
      x: enemy.drawX ?? enemy.x,
      y: enemy.drawY ?? enemy.y,
    }));
    const shootable = positions.filter((enemy) => enemy.y < player.y - 28);
    const pool = shootable.length > 0 ? shootable : positions;
    return pool.sort((a, b) => {
      const aScore = Math.abs(a.x - player.x) + Math.abs((a.y + 165) - player.y) * 0.35;
      const bScore = Math.abs(b.x - player.x) + Math.abs((b.y + 165) - player.y) * 0.35;
      return aScore - bScore;
    })[0] ?? null;
  }

  smoothBotAction(action, fallback, player) {
    const now = performance.now();
    const previous = this.botActionMemory;
    const targetDx = fallback.target ? fallback.target.x - player.x : 0;
    const nearTarget = fallback.target && Math.abs(targetDx) < 48;

    if (nearTarget && action.moveX === -previous.moveX && now - previous.changedAt < 220) {
      action.moveX = Math.abs(targetDx) < 24 ? 0 : previous.moveX;
    }
    if (fallback.target && Math.abs(targetDx) < 20) action.moveX = 0;
    if (fallback.target && player.x > WIDTH - 120 && targetDx < -50) action.moveX = -1;
    if (fallback.target && player.x < 120 && targetDx > 50) action.moveX = 1;

    if (action.moveX !== previous.moveX || action.moveY !== previous.moveY) {
      this.botActionMemory = { ...action, changedAt: now };
    } else {
      this.botActionMemory = { ...previous, ...action };
    }

    return {
      moveX: action.moveX,
      moveY: action.moveY,
      fire: action.fire,
    };
  }

  updateEnemyFormation(dt) {
    this.updateEnemyDives(dt);
    const formation = this.getFormationBounds();
    const margin = 34;
    const nextOffset = this.formationOffset + this.formationDirection * this.difficulty.enemySpeed * dt;
    const nextLeft = formation.minX + nextOffset;
    const nextRight = formation.maxX + nextOffset;

    if (nextLeft < margin || nextRight > WIDTH - margin) {
      this.formationDirection *= -1;
      this.formationOffset += this.formationDirection * 2;
      this.enemies.forEach((enemy) => {
        if (!enemy.isDiving) enemy.y += this.difficulty.descentStep;
      });
    } else {
      this.formationOffset = nextOffset;
    }

    this.enemies.forEach((enemy) => {
      if (enemy.isDiving) return;
      enemy.y += this.difficulty.enemyDescentSpeed * dt;
      enemy.update(dt, this.formationOffset, this.level);
    });

    if (this.enemies.some((enemy) => !enemy.isDiving && (enemy.drawY ?? enemy.y) + enemy.height / 2 >= INVASION_LINE_Y)) {
      this.finishGame("Invaded — Game Over");
    }
  }

  updateEnemyDives(dt) {
    this.diveTimer -= dt;
    const divers = this.enemies.filter((enemy) => enemy.isDiving).length;
    if (this.diveTimer <= 0 && divers < this.difficulty.maxDivers) {
      this.startEnemyDive();
      this.diveTimer = this.difficulty.diveEvery * (0.65 + Math.random() * 0.8);
    }

    for (const enemy of this.enemies) {
      if (!enemy.isDiving) continue;
      this.updateDivingEnemy(enemy, dt);
    }
  }

  startEnemyDive() {
    const candidates = this.enemies.filter((enemy) => !enemy.isDiving);
    const target = this.players.filter((player) => player.lives > 0).sort(() => Math.random() - 0.5)[0];
    if (!candidates.length || !target) return;

    const enemy = weightedPick(candidates, (candidate) => candidate.type.diveWeight);
    const startX = enemy.drawX ?? enemy.x + this.formationOffset;
    const startY = enemy.drawY ?? enemy.y;
    enemy.isDiving = true;
    enemy.diveTime = 0;
    enemy.diveDuration = (2.55 + Math.random() * 0.7) / this.difficulty.diveSpeed;
    enemy.diveStartX = startX;
    enemy.diveStartY = startY;
    enemy.diveAttackX = clamp(target.x + (Math.random() - 0.5) * 130, 44, WIDTH - 44);
    enemy.diveAttackY = clamp(target.y - 44 + Math.random() * 30, startY + 130, DIVE_ATTACK_MAX_Y);
    enemy.diveSide = Math.random() < 0.5 ? -1 : 1;
    enemy.diveShotTimer = Math.max(0.55, 1.3 - this.level * 0.09) + Math.random() * 0.55;
    enemy.tractorActive = false;
  }

  updateDivingEnemy(enemy, dt) {
    enemy.diveTime += dt;
    enemy.flash = Math.max(0, enemy.flash - dt);
    enemy.diveShotTimer -= dt;

    const t = Math.min(1, enemy.diveTime / enemy.diveDuration);
    if (t < 0.72) {
      const p = easeInOut(t / 0.72);
      enemy.drawX = lerp(enemy.diveStartX, enemy.diveAttackX, p) + Math.sin(p * Math.PI) * enemy.diveSide * 86;
      enemy.drawY = lerp(enemy.diveStartY, enemy.diveAttackY, p) + Math.sin(p * Math.PI) * 26;
    } else {
      const p = easeInOut((t - 0.72) / 0.28);
      const homeX = enemy.x + this.formationOffset;
      const homeY = enemy.y;
      enemy.drawX = lerp(enemy.diveAttackX, homeX, p) + Math.sin(p * Math.PI) * -enemy.diveSide * 34;
      enemy.drawY = lerp(enemy.diveAttackY, homeY, p);
    }
    enemy.tractorActive = enemy.type.role === "abductor" && t > 0.32 && t < 0.68;

    if (enemy.diveShotTimer <= 0 && this.enemyBullets.length < this.difficulty.maxEnemyShots) {
      this.fireEnemyBullet(enemy);
      enemy.diveShotTimer = Math.max(0.45, 1.25 - this.level * 0.08) + Math.random() * 0.65;
    }

    if (t >= 1) {
      enemy.isDiving = false;
      enemy.drawX = enemy.x + this.formationOffset;
      enemy.drawY = enemy.y;
    }
  }

  updateTractorBeams(dt) {
    for (const enemy of this.enemies) {
      if (!enemy.tractorActive) continue;
      const beamX = enemy.drawX ?? enemy.x;
      const beamTop = (enemy.drawY ?? enemy.y) + enemy.height / 2;
      const beamBottom = Math.min(HEIGHT, beamTop + 230);
      for (const player of this.players) {
        if (player.lives <= 0 || player.invulnerable > 0) continue;
        const insideBeam = Math.abs(player.x - beamX) < 64 && player.y > beamTop && player.y < beamBottom;
        if (!insideBeam) continue;
        player.tractorExposure = (player.tractorExposure || 0) + dt;
        player.x += Math.sign(beamX - player.x) * 70 * dt;
        player.y = Math.max(player.y - 18 * dt, PLAYER_MIN_Y + player.height / 2);
        if (player.tractorExposure > 0.75) {
          if (player.hit()) this.burst(player.x, player.y, "#9d8cff");
          player.tractorExposure = 0;
          enemy.tractorActive = false;
        }
      }
    }
  }

  updateScorePopups(dt) {
    for (const popup of this.scorePopups) {
      popup.y -= 34 * dt;
      popup.life -= dt;
    }
    this.scorePopups = this.scorePopups.filter((popup) => popup.life > 0);
  }

  addScorePopup(x, y, points, color) {
    this.scorePopups.push({
      x,
      y,
      text: `+${points}`,
      color,
      life: 1.25,
    });
  }

  getFormationBounds() {
    if (this.enemies.length === 0) return { minX: 0, maxX: 0, centerX: WIDTH / 2 };
    const xs = this.enemies.map((enemy) => enemy.x);
    const minX = Math.min(...xs) - 28;
    const maxX = Math.max(...xs) + 28;
    return { minX, maxX, centerX: (minX + maxX) / 2 + this.formationOffset };
  }

  updateBullets(dt) {
    for (const bullet of [...this.playerBullets, ...this.enemyBullets]) bullet.update(dt);
    this.playerBullets = this.playerBullets.filter((bullet) => bullet.y > -24);
    this.enemyBullets = this.enemyBullets.filter((bullet) => bullet.y < HEIGHT + 24 && bullet.x > -30 && bullet.x < WIDTH + 30);
  }

  updateEnemyFire(dt) {
    this.enemyFireTimer -= dt;
    if (this.enemyFireTimer > 0 || this.enemies.length === 0) return;
    if (this.enemyBullets.length >= this.difficulty.maxEnemyShots) {
      this.enemyFireTimer = 0.12;
      return;
    }

    const shotsThisBurst = this.level >= 4 && Math.random() < 0.35 ? 2 : 1;
    for (let i = 0; i < shotsThisBurst; i += 1) {
      const enemy = this.pickFiringEnemy();
      if (enemy) this.fireEnemyBullet(enemy);
    }
    this.enemyFireTimer = 1 / this.difficulty.enemyFireRate;
  }

  pickFiringEnemy() {
    const diving = this.enemies.filter((enemy) => enemy.isDiving);
    const pool = diving.length > 0 && Math.random() < 0.7 ? diving : this.enemies;
    return weightedPick(pool, (enemy) => enemy.type.fireWeight);
  }

  fireEnemyBullet(enemy) {
    const target = this.pickEnemyTarget(enemy);
    if (!target) return;
    const startX = enemy.drawX ?? enemy.x;
    const startY = (enemy.drawY ?? enemy.y) + 17;
    const aim = this.difficulty.enemyAimAccuracy + enemy.type.aimBonus;
    const spread = (1 - Math.max(0.05, Math.min(0.95, aim))) * 180;
    const targetX = target.x + (Math.random() - 0.5) * spread;
    const targetY = target.y + (Math.random() - 0.5) * spread * 0.55;
    const dx = targetX - startX;
    const dy = targetY - startY;
    const length = Math.max(1, Math.hypot(dx, dy));
    const speed = this.difficulty.enemyBulletSpeed * (enemy.type.id === "fast" ? 1.12 : 1);
    this.enemyBullets.push(
      new Bullet(
        startX,
        startY,
        (dx / length) * speed,
        (dy / length) * speed,
        enemy.type.id === "shooter" ? "#ff6b8b" : "#ffcf7a",
        "enemy",
        6,
        12,
      ),
    );
  }

  pickEnemyTarget(enemy) {
    const living = this.players.filter((player) => player.lives > 0);
    if (living.length === 0) return null;
    if (living.length === 1 || Math.random() < 0.7) {
      const x = enemy.drawX ?? enemy.x;
      return living.sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
    }
    return living[Math.floor(Math.random() * living.length)];
  }

  handleCollisions() {
    for (const bullet of [...this.playerBullets]) {
      const enemy = this.enemies.find((candidate) =>
        rectsOverlap(bullet, {
          x: candidate.drawX ?? candidate.x,
          y: candidate.drawY ?? candidate.y,
          width: candidate.width,
          height: candidate.height,
        }),
      );
      if (!enemy) continue;
      this.playerBullets = this.playerBullets.filter((item) => item !== bullet);
      if (enemy.damage()) {
        this.enemies = this.enemies.filter((item) => item !== enemy);
        const scorer = this.closestLivingPlayer(bullet.x) ?? this.players[0];
        const points = this.getEnemyScore(enemy);
        scorer.score += points;
        this.addScorePopup(enemy.drawX ?? enemy.x, enemy.drawY ?? enemy.y, points, enemy.type.color);
        this.burst(enemy.drawX ?? enemy.x, enemy.drawY ?? enemy.y, enemy.type.color);
      }
    }

    for (const bullet of [...this.enemyBullets]) {
      for (const player of this.players) {
        if (player.lives <= 0) continue;
        if (!rectsOverlap(bullet, player)) continue;
        this.enemyBullets = this.enemyBullets.filter((item) => item !== bullet);
        if (player.hit()) this.burst(player.x, player.y, player.color);
        break;
      }
    }

    for (const enemy of this.enemies) {
      for (const player of this.players) {
        if (player.lives > 0 && rectsOverlap({ x: enemy.drawX ?? enemy.x, y: enemy.drawY ?? enemy.y, width: enemy.width, height: enemy.height }, player)) {
          this.finishGame("Invaded — Game Over");
        }
      }
    }
  }

  getEnemyScore(enemy) {
    const diveBonus = enemy.isDiving ? 35 : 0;
    const levelBonus = this.level * 20;
    return enemy.type.score + levelBonus + diveBonus;
  }

  recordTrainingSample(dt, action) {
    if (this.mode !== "one" || this.players[0].lives <= 0) return;
    this.sampleTimer += dt;
    if (this.sampleTimer < SAMPLE_INTERVAL) return;
    this.sampleTimer = 0;

    const normalizedAction = {
      moveX: Math.sign(action.moveX || 0),
      moveY: Math.sign(action.moveY || 0),
      fire: action.fire ? 1 : 0,
    };
    const isIdle = normalizedAction.moveX === 0 && normalizedAction.moveY === 0 && !normalizedAction.fire;
    const underThreat = this.nearestEnemyBullet(this.players[0])?.distance < 180;

    // Keep fire/movement samples, but downsample pure idle so the bot does not learn to freeze.
    if (isIdle) {
      this.idleSampleBudget += 1;
      const keepEvery = underThreat ? 3 : 8;
      if (this.idleSampleBudget % keepEvery !== 0) return;
    }

    this.policy.addSample(this.extractMLState(this.players[0]).vector, normalizedAction);
    this.policy.save();
  }

  recordBotEvolution(dt, action) {
    if (this.mode !== "bot" || this.players[0].lives <= 0) return;
    this.selfPlayTimer += dt;
    if (this.selfPlayTimer < 0.32) return;
    this.selfPlayTimer = 0;

    const player = this.players[0];
    const mlState = this.extractMLState(player);
    const scoreDelta = player.score - this.lastBotScore;
    const lifeDelta = player.lives - this.lastBotLives;
    const target = this.getBotAimTarget(player);
    const targetDx = target ? target.x - player.x : 0;
    const aligned = target && target.y < player.y - 24 && Math.abs(targetDx) < 36;
    const tooHigh = player.y < PLAYER_MIN_Y + 46 && !(mlState.nearestBullet && mlState.nearestBullet.distance < 90);
    const jitter = action.moveX !== 0 && action.moveX === -this.lastBotAction.moveX && Math.abs(targetDx) < 70;

    let reward = 0;
    if (scoreDelta > 0) reward += Math.min(3, scoreDelta / 160);
    if (aligned && action.fire) reward += 0.45;
    if (lifeDelta < 0) reward -= 2.6;
    if (tooHigh && action.moveY < 0) reward -= 0.7;
    if (jitter) reward -= 0.35;

    if (reward > 0.25) {
      this.policy.addSample(mlState.vector, action, {
        source: "self",
        quality: 1 + reward,
        reward,
      });
      this.evolutionStats.selfSamples += 1;
      this.evolutionStats.reward += reward;
      this.policy.save();
    } else if (reward < -0.65) {
      const correction = this.fallbackBotPolicy(player, mlState);
      if (tooHigh) correction.moveY = 1;
      if (jitter && target) correction.moveX = Math.sign(targetDx);
      this.policy.addSample(mlState.vector, correction, {
        source: "self",
        quality: 0.75,
        reward,
      });
      this.evolutionStats.selfSamples += 1;
      this.evolutionStats.mistakes += 1;
      this.evolutionStats.reward += reward;
      this.policy.save();
    }

    this.lastBotScore = player.score;
    this.lastBotLives = player.lives;
    this.lastBotAction = { moveX: action.moveX || 0, moveY: action.moveY || 0, fire: Boolean(action.fire) };
  }

  extractMLState(player) {
    const nearestEnemy = this.nearestEnemy(player);
    const nearestBullet = this.nearestEnemyBullet(player);
    const bulletDx = nearestBullet ? nearestBullet.x - player.x : 0;
    const bulletDy = nearestBullet ? nearestBullet.y - player.y : 0;
    const bulletDistance = nearestBullet ? nearestBullet.distance : HEIGHT;
    const enemyDistance = nearestEnemy ? nearestEnemy.distance : WIDTH;
    const formation = this.getFormationBounds();
    const enemyBottom = this.enemies.length
      ? Math.max(...this.enemies.map((enemy) => (enemy.drawY ?? enemy.y) + enemy.height / 2))
      : 0;
    const enemyDistanceToBottom = Math.max(0, INVASION_LINE_Y - enemyBottom);

    const vector = [
      player.x / WIDTH,
      player.y / HEIGHT,
      player.lives / 3,
      Math.min(1, Math.log10(player.score + 1) / 5),
      Math.min(1, this.level / 12),
      nearestEnemy ? nearestEnemy.x / WIDTH : -1,
      nearestEnemy ? nearestEnemy.y / HEIGHT : -1,
      Math.min(1, enemyDistance / WIDTH),
      nearestBullet ? nearestBullet.x / WIDTH : -1,
      nearestBullet ? nearestBullet.y / HEIGHT : -1,
      Math.min(1, bulletDistance / HEIGHT),
      Number(nearestBullet && bulletDx < -18 && Math.abs(bulletDx) < 135 && bulletDy < 240 && bulletDy > -40),
      Number(nearestBullet && Math.abs(bulletDx) <= 42 && bulletDy < 280 && bulletDy > -45),
      Number(nearestBullet && bulletDx > 18 && Math.abs(bulletDx) < 135 && bulletDy < 240 && bulletDy > -40),
      Math.min(1, this.enemies.length / 72),
      Math.min(1, this.playerBullets.length / 8),
      Math.min(1, player.timeSinceLastShot / 2),
      Math.min(1, enemyDistanceToBottom / HEIGHT),
      formation.centerX / WIDTH,
      nearestEnemy ? clamp01((nearestEnemy.x - player.x + WIDTH) / (WIDTH * 2)) : 0.5,
      nearestBullet ? clamp01((nearestBullet.x - player.x + WIDTH) / (WIDTH * 2)) : 0.5,
      nearestBullet ? clamp01((nearestBullet.y - player.y + HEIGHT) / (HEIGHT * 2)) : 0.5,
    ];

    return {
      vector,
      nearestEnemy,
      nearestBullet,
      debug: {
        nearestEnemyDistance: Math.round(enemyDistance),
        nearestBulletDistance: Math.round(bulletDistance),
        enemyDistanceToBottom: Math.round(enemyDistanceToBottom),
      },
    };
  }

  nearestEnemy(player) {
    let best = null;
    let bestDistance = Infinity;
    for (const enemy of this.enemies) {
      const x = enemy.drawX ?? enemy.x;
      const y = enemy.drawY ?? enemy.y;
      const d = distance(player.x, player.y, x, y);
      if (d < bestDistance) {
        bestDistance = d;
        best = { x, y, distance: d, enemy };
      }
    }
    return best;
  }

  nearestEnemyBullet(player) {
    let best = null;
    let bestDistance = Infinity;
    for (const bullet of this.enemyBullets) {
      const d = distance(player.x, player.y, bullet.x, bullet.y);
      if (d < bestDistance) {
        bestDistance = d;
        best = { ...bullet, distance: d };
      }
    }
    return best;
  }

  closestLivingPlayer(x) {
    return this.players
      .filter((player) => player.lives > 0)
      .sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
  }

  updateParticles(dt) {
    for (const particle of this.particles) particle.update(dt);
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  burst(x, y, color) {
    for (let i = 0; i < 16; i += 1) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  checkLevelOrGameEnd() {
    if (this.enemies.length === 0) {
      this.level += 1;
      this.playerBullets = [];
      this.enemyBullets = [];
      this.spawnLevel();
    }

    if (!this.ended && this.players.every((player) => player.lives <= 0)) {
      this.finishGame("Game Over");
    }
  }

  finishGame(reason = "Game Over") {
    if (this.ended) return;
    this.ended = true;
    this.endReason = reason;
    const totalScore = this.players.reduce((sum, player) => sum + player.score, 0);
    saveHighScore({
      score: totalScore,
      mode: this.mode === "two" ? "2 Player" : this.mode === "bot" ? "ML Bot Demo" : "1 Player",
      level: this.level,
      date: new Date().toLocaleDateString(),
    });
    this.overlay.innerHTML = `
      <div>
        <strong>${reason}</strong><br>
        Score: ${totalScore}<br>
        Level: ${this.level}<br>
        Press Restart to fly again.
      </div>
    `;
    this.overlay.classList.remove("hidden");
  }

  updateStars(dt) {
    for (const star of this.stars) {
      star.y += star.speed * dt;
      if (star.y > HEIGHT) {
        star.x = Math.random() * WIDTH;
        star.y = -4;
      }
    }
  }

  updateHud() {
    const stats = this.policy.getStats();
    const score = this.players.reduce((sum, player) => sum + player.score, 0);
    const lives = this.players.map((player, index) => `<span class="player-life">P${index + 1} <b class="lives-hearts">${hearts(player.lives)}</b></span>`).join(" ");
    const modeLabel = this.mode === "two" ? "2 Player" : this.mode === "bot" ? "ML Bot Demo" : "1 Player";
    const mlStatus = this.mode === "bot" && this.mlDebug
      ? `<span class="ml-readout">ML ${this.mlDebug.ready ? "live" : "low data"} X:${this.mlDebug.action.moveX} Y:${this.mlDebug.action.moveY} Fire:${this.mlDebug.action.fire ? "Y" : "N"} AimDx:${this.mlDebug.targetDx} Conf:${this.mlDebug.confidence.toFixed(2)} Self:${stats.selfSampleCount} Evo:${this.evolutionStats.selfSamples} Mistakes:${this.evolutionStats.mistakes} Enemy:${this.mlDebug.nearestEnemyDistance} Bullet:${this.mlDebug.nearestBulletDistance}</span>`
      : "";
    this.hud.innerHTML = `
      <span class="hud-stat score-stat"><span class="hud-label">Score</span><span class="hud-value">${score}</span></span>
      <span class="hud-stat"><span class="hud-label">Level</span><span class="hud-value">${this.level}</span></span>
      <span class="hud-stat"><span class="hud-label">Mode</span><span class="hud-value">${modeLabel}</span></span>
      <span class="hud-stat life-stat"><span class="hud-label">Lives</span><span class="hud-value">${lives}</span></span>
      <span class="hud-stat"><span class="hud-label">Samples</span><span class="hud-value">${stats.sampleCount}</span></span>
      <span class="hud-stat"><span class="hud-label">Enemies</span><span class="hud-value">${this.enemies.length}</span></span>
      ${mlStatus}
    `;
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#050712";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    this.drawStars(ctx);
    this.drawDangerLine(ctx);
    this.enemies.forEach((enemy) => enemy.draw(ctx));
    this.drawTractorBeams(ctx);
    this.playerBullets.forEach((bullet) => bullet.draw(ctx));
    this.enemyBullets.forEach((bullet) => bullet.draw(ctx));
    this.players.forEach((player) => {
      if (player.lives > 0) player.draw(ctx);
    });
    this.particles.forEach((particle) => particle.draw(ctx));
    this.drawScorePopups(ctx);

    if (this.levelTransition > 0 && !this.ended) {
      ctx.fillStyle = `rgba(255, 230, 109, ${Math.min(1, this.levelTransition)})`;
      ctx.font = "700 30px Courier New";
      ctx.textAlign = "center";
      ctx.fillText(`LEVEL ${this.level}`, WIDTH / 2, HEIGHT / 2);
    }
  }

  drawStars(ctx) {
    for (const star of this.stars) {
      ctx.fillStyle = star.size > 1 ? "#bed7ff" : "#66799f";
      ctx.fillRect(Math.round(star.x), Math.round(star.y), star.size, star.size);
    }
  }

  drawDangerLine(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.sin(performance.now() / 180) * 0.12;
    ctx.fillStyle = "#ff6b8b";
    ctx.fillRect(0, INVASION_LINE_Y, WIDTH, 3);
    ctx.font = "700 12px Courier New";
    ctx.fillText("INVASION LINE", 18, INVASION_LINE_Y - 8);
    ctx.restore();
  }

  drawTractorBeams(ctx) {
    ctx.save();
    for (const enemy of this.enemies) {
      if (!enemy.tractorActive) continue;
      const x = enemy.drawX ?? enemy.x;
      const y = (enemy.drawY ?? enemy.y) + enemy.height / 2;
      const bottom = Math.min(HEIGHT, y + 230);
      const pulse = 0.25 + Math.sin(performance.now() / 70) * 0.08;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = "#9d8cff";
      ctx.beginPath();
      ctx.moveTo(x - 14, y);
      ctx.lineTo(x + 14, y);
      ctx.lineTo(x + 70, bottom);
      ctx.lineTo(x - 70, bottom);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = "#f6fbff";
      ctx.fillRect(Math.round(x - 2), Math.round(y), 4, Math.round(bottom - y));
    }
    ctx.restore();
  }

  drawScorePopups(ctx) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "700 22px Courier New";
    for (const popup of this.scorePopups) {
      ctx.globalAlpha = Math.max(0, popup.life);
      ctx.fillStyle = popup.color;
      ctx.fillText(popup.text, popup.x, popup.y);
    }
    ctx.restore();
  }

  hideOverlay() {
    this.overlay.innerHTML = "";
    this.overlay.classList.add("hidden");
  }
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function easeInOut(value) {
  return value * value * (3 - 2 * value);
}

function weightedPick(items, getWeight) {
  const totalWeight = items.reduce((sum, item) => sum + Math.max(0.01, getWeight(item)), 0);
  let roll = Math.random() * totalWeight;
  for (const item of items) {
    roll -= Math.max(0.01, getWeight(item));
    if (roll <= 0) return item;
  }
  return items[0];
}

function hearts(lives) {
  const full = Math.max(0, lives);
  return `${"♥".repeat(full)}${"♡".repeat(Math.max(0, 3 - full))}`;
}
