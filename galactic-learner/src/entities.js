export class Player {
  constructor(x, y, color, controlsLabel) {
    this.x = x;
    this.y = y;
    this.width = 34;
    this.height = 28;
    this.color = color;
    this.controlsLabel = controlsLabel;
    this.speed = 340;
    this.lives = 3;
    this.score = 0;
    this.cooldown = 0;
    this.invulnerable = 1.3;
    this.timeSinceLastShot = 1;
    this.tractorExposure = 0;
  }

  update(dt, action, bounds) {
    this.x += (action.moveX || 0) * this.speed * dt;
    this.y += (action.moveY || 0) * this.speed * dt;
    this.x = Math.max(this.width / 2, Math.min(bounds.width - this.width / 2, this.x));
    this.y = Math.max(bounds.minY + this.height / 2, Math.min(bounds.height - this.height / 2, this.y));
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.tractorExposure = Math.max(0, this.tractorExposure - dt * 0.8);
    this.timeSinceLastShot += dt;
  }

  canFire() {
    return this.cooldown <= 0;
  }

  fire() {
    this.cooldown = 0.24;
    this.timeSinceLastShot = 0;
    return new Bullet(this.x, this.y - this.height / 2, 0, -580, "#8dffcf", "player", 5, 12);
  }

  hit() {
    if (this.invulnerable > 0) return false;
    this.lives -= 1;
    this.invulnerable = 1.5;
    return true;
  }

  draw(ctx) {
    ctx.save();
    if (this.invulnerable > 0 && Math.floor(this.invulnerable * 12) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }
    ctx.fillStyle = this.color;
    rect(ctx, this.x - 5, this.y - 17, 10, 8);
    rect(ctx, this.x - 13, this.y - 9, 26, 9);
    rect(ctx, this.x - 20, this.y, 40, 12);
    ctx.fillStyle = "#f6fbff";
    rect(ctx, this.x - 4, this.y - 6, 8, 6);
    ctx.restore();
  }
}

export class Enemy {
  constructor(x, y, type = ENEMY_TYPES.basic) {
    this.x = x;
    this.y = y;
    this.width = 30;
    this.height = 22;
    this.type = type;
    this.health = type.health;
    this.maxHealth = type.health;
    this.flash = 0;
    this.phase = Math.random() * Math.PI * 2;
  }

  update(dt, groupOffsetX, level = 1) {
    const bob = this.type.bob ? Math.sin(performance.now() / 260 + this.phase) * this.type.bob : 0;
    this.drawX = this.x + groupOffsetX + Math.sin(performance.now() / 500 + this.phase) * this.type.wiggle * Math.min(2.2, 1 + level / 6);
    this.drawY = this.y + bob;
    this.flash = Math.max(0, this.flash - dt);
  }

  damage() {
    this.health -= 1;
    this.flash = 0.1;
    return this.health <= 0;
  }

  draw(ctx) {
    const x = this.drawX ?? this.x;
    const y = this.drawY ?? this.y;
    ctx.fillStyle = this.flash > 0 ? "#f6fbff" : "#ff4f9a";
    drawEnemyShape(ctx, x, y, this.type, this.health / this.maxHealth);
  }
}

export class Bullet {
  constructor(x, y, vx, vy, color, owner, width = 4, height = 10) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.owner = owner;
    this.width = width;
    this.height = height;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    rect(ctx, this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
  }
}

export class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 230;
    this.vy = (Math.random() - 0.5) * 230;
    this.life = 0.45 + Math.random() * 0.25;
    this.color = color;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
  }

  draw(ctx) {
    ctx.globalAlpha = Math.max(0, this.life / 0.7);
    ctx.fillStyle = this.color;
    rect(ctx, this.x - 2, this.y - 2, 4, 4);
    ctx.globalAlpha = 1;
  }
}

export function rectsOverlap(a, b) {
  return (
    Math.abs(a.x - b.x) * 2 < a.width + b.width &&
    Math.abs(a.y - b.y) * 2 < a.height + b.height
  );
}

function rect(ctx, x, y, width, height) {
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

export const ENEMY_TYPES = {
  basic: {
    id: "basic",
    label: "Drone",
    role: "basic",
    color: "#ff4f9a",
    accent: "#ffe66d",
    health: 1,
    score: 100,
    fireWeight: 1,
    diveWeight: 0.8,
    aimBonus: 0,
    speedScale: 1,
    wiggle: 1,
    bob: 0,
  },
  fast: {
    id: "fast",
    label: "Diver",
    role: "diver",
    color: "#55e6ff",
    accent: "#8dffcf",
    health: 1,
    score: 130,
    fireWeight: 0.8,
    diveWeight: 2.4,
    aimBonus: -0.08,
    speedScale: 1.35,
    wiggle: 5,
    bob: 3,
  },
  shooter: {
    id: "shooter",
    label: "Shooter",
    role: "shooter",
    color: "#ffcf7a",
    accent: "#ff6b8b",
    health: 1,
    score: 170,
    fireWeight: 3.2,
    diveWeight: 0.9,
    aimBonus: 0.18,
    speedScale: 0.95,
    wiggle: 2,
    bob: 1,
  },
  tank: {
    id: "tank",
    label: "Boss",
    role: "abductor",
    color: "#9d8cff",
    accent: "#f6fbff",
    health: 3,
    score: 360,
    fireWeight: 1.1,
    diveWeight: 1.25,
    aimBonus: 0.05,
    speedScale: 0.75,
    wiggle: 0,
    bob: 0,
  },
};

function drawEnemyShape(ctx, x, y, type, healthRatio) {
  ctx.fillStyle = type.color;

  if (type.id === "fast") {
    rect(ctx, x - 5, y - 18, 10, 7);
    rect(ctx, x - 11, y - 11, 22, 8);
    rect(ctx, x - 17, y - 3, 34, 8);
    rect(ctx, x - 25, y - 9, 10, 8);
    rect(ctx, x + 15, y - 9, 10, 8);
    rect(ctx, x - 23, y + 6, 8, 7);
    rect(ctx, x + 15, y + 6, 8, 7);
    rect(ctx, x - 7, y + 5, 14, 10);
  } else if (type.id === "shooter") {
    rect(ctx, x - 16, y - 10, 32, 11);
    rect(ctx, x - 9, y - 18, 18, 8);
    rect(ctx, x - 22, y + 2, 12, 9);
    rect(ctx, x + 10, y + 2, 12, 9);
    rect(ctx, x - 4, y + 10, 8, 8);
  } else if (type.id === "tank") {
    rect(ctx, x - 9, y - 20, 18, 8);
    rect(ctx, x - 19, y - 12, 38, 12);
    rect(ctx, x - 27, y, 54, 13);
    rect(ctx, x - 21, y + 13, 12, 8);
    rect(ctx, x + 9, y + 13, 12, 8);
  } else {
    rect(ctx, x - 15, y - 8, 30, 10);
    rect(ctx, x - 9, y - 15, 18, 8);
    rect(ctx, x - 21, y + 2, 10, 8);
    rect(ctx, x + 11, y + 2, 10, 8);
  }

  ctx.fillStyle = type.accent;
  if (type.id === "fast") {
    rect(ctx, x - 3, y - 12, 3, 3);
    rect(ctx, x + 1, y - 12, 3, 3);
    rect(ctx, x - 16, y + 1, 6, 4);
    rect(ctx, x + 10, y + 1, 6, 4);
  } else {
    rect(ctx, x - 5, y - 4, 4, 4);
    rect(ctx, x + 2, y - 4, 4, 4);
  }

  if (healthRatio < 1) {
    ctx.fillStyle = "#f6fbff";
    rect(ctx, x - 15, y + 21, 30 * healthRatio, 3);
  }
}
