const MAP_TEMPLATE = [
  "############################",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#o####.#####.##.#####.####o#",
  "#.####.#####.##.#####.####.#",
  "#..........................#",
  "#.####.##.########.##.####.#",
  "#......##....##....##......#",
  "######.#####.##.#####.######",
  "######.##..........##.######",
  "######.##.###==###.##.######",
  "T........#.##--##.#........T",
  "######.##.#------#.##.######",
  "######.##.########.##.######",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#...##................##...#",
  "###.##.##.########.##.##.###",
  "#......##....##....##......#",
  "#.##########.##.##########.#",
  "#..........................#",
  "#.####.#####.##.#####.####.#",
  "#o..##................##..o#",
  "###.##.##.########.##.##.###",
  "#......##....##....##......#",
  "#.##########.##.##########.#",
  "#..........................#",
  "#.####.#####.##.#####.####.#",
  "#............##............#",
  "############################",
];

const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");
const startButton = document.querySelector("#start-button");
const pauseButton = document.querySelector("#pause-button");
const overlay = document.querySelector("#overlay");
const overlayTitle = document.querySelector("#overlay-title");
const overlayCopy = document.querySelector("#overlay-copy");
const overlayButton = document.querySelector("#overlay-button");
const autopilotButton = document.querySelector("#autopilot-button");
const clearButton = document.querySelector("#clear-button");
const scoreLabel = document.querySelector("#score-label");
const levelLabel = document.querySelector("#level-label");
const livesLabel = document.querySelector("#lives-label");
const dotsLabel = document.querySelector("#dots-label");
const samplesLabel = document.querySelector("#samples-label");
const goodLabel = document.querySelector("#good-label");
const badLabel = document.querySelector("#bad-label");
const lessonLabel = document.querySelector("#lesson-label");
const brainStrength = document.querySelector("#brain-strength");
const brainMeterFill = document.querySelector("#brain-meter-fill");

const COLS = MAP_TEMPLATE[0].length;
const ROWS = MAP_TEMPLATE.length;
const BASE_WIDTH = 672;
const BASE_HEIGHT = 744;
const STORAGE_KEY = "maze-muncher-ml-v1";
const MAX_SAMPLES = 1800;
const DIRECTIONS = {
  left: { key: "left", dx: -1, dy: 0, angle: Math.PI, opposite: "right" },
  right: { key: "right", dx: 1, dy: 0, angle: 0, opposite: "left" },
  up: { key: "up", dx: 0, dy: -1, angle: -Math.PI / 2, opposite: "down" },
  down: { key: "down", dx: 0, dy: 1, angle: Math.PI / 2, opposite: "up" },
};
const DIR_ORDER = ["up", "left", "down", "right"];
const INPUT_TO_DIR = new Map([
  ["ArrowLeft", "left"],
  ["KeyA", "left"],
  ["ArrowRight", "right"],
  ["KeyD", "right"],
  ["ArrowUp", "up"],
  ["KeyW", "up"],
  ["ArrowDown", "down"],
  ["KeyS", "down"],
]);
const FEATURE_NAMES = [
  "bias",
  "ghostSafety",
  "immediateDanger",
  "pelletPull",
  "energizerPull",
  "frightenedGhostPull",
  "fruitPull",
  "routeFreedom",
  "keepsMomentum",
  "deadEndPenalty",
  "tunnelEscape",
];

const game = {
  phase: "ready",
  score: 0,
  level: 1,
  lives: 3,
  time: 0,
  modeTime: 0,
  modeIndex: 0,
  mode: "scatter",
  frightenedUntil: 0,
  frightenedChain: 0,
  paused: false,
  autopilot: false,
  started: false,
  dotsEatenThisLevel: 0,
  fruit: null,
  fruitTriggers: [70, 170],
  fruitTriggerIndex: 0,
  message: "Ready",
  messageUntil: 0,
  lastFrame: performance.now(),
  botTrail: [],
};

const scatterChaseSchedule = [
  { mode: "scatter", seconds: 7 },
  { mode: "chase", seconds: 20 },
  { mode: "scatter", seconds: 7 },
  { mode: "chase", seconds: 20 },
  { mode: "scatter", seconds: 5 },
  { mode: "chase", seconds: 20 },
  { mode: "scatter", seconds: 5 },
  { mode: "chase", seconds: Infinity },
];

let map = MAP_TEMPLATE.map((row) => row.split(""));
let pellets = new Set();
let energizers = new Set();
let totalFood = 0;
let tileSize = 24;
let boardOffsetX = 0;
let boardOffsetY = 0;
let canvasWidth = BASE_WIDTH;
let canvasHeight = BASE_HEIGHT;
let resizeQueued = false;
let player;
let ghosts = [];
let learner = createLearner();
let starfield = [];
const hudCache = new Map();

function createLearner() {
  return {
    weights: new Array(FEATURE_NAMES.length).fill(0),
    samples: [],
    good: 0,
    bad: 0,
    pending: [],
    lastSample: null,
    lastLesson: "None yet",
  };
}

function setupCanvas() {
  const ratio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.max(1, rect.width || BASE_WIDTH);
  const cssHeight = Math.max(1, rect.height || BASE_HEIGHT);
  const deviceWidth = Math.round(cssWidth * ratio);
  const deviceHeight = Math.round(cssHeight * ratio);
  const sizeChanged = Math.round(canvasWidth) !== Math.round(cssWidth) || Math.round(canvasHeight) !== Math.round(cssHeight);

  if (canvas.width !== deviceWidth || canvas.height !== deviceHeight) {
    canvas.width = deviceWidth;
    canvas.height = deviceHeight;
  }

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  canvasWidth = cssWidth;
  canvasHeight = cssHeight;
  tileSize = Math.min(cssWidth / COLS, cssHeight / ROWS);
  boardOffsetX = (cssWidth - tileSize * COLS) / 2;
  boardOffsetY = (cssHeight - tileSize * ROWS) / 2;
  if (sizeChanged || starfield.length === 0) {
    starfield = Array.from({ length: 120 }, () => ({
      x: Math.random() * cssWidth,
      y: Math.random() * cssHeight,
      r: 0.3 + Math.random() * 1.2,
      twinkle: Math.random() * Math.PI * 2,
    }));
  }
}

function queueCanvasResize() {
  if (resizeQueued) return;
  resizeQueued = true;
  requestAnimationFrame(() => {
    resizeQueued = false;
    setupCanvas();
  });
}

function validateMap() {
  const badRows = MAP_TEMPLATE.filter((row) => row.length !== COLS);
  if (badRows.length > 0) {
    throw new Error("All map rows must be the same width.");
  }
}

function resetFood() {
  map = MAP_TEMPLATE.map((row) => row.split(""));
  pellets = new Set();
  energizers = new Set();
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const cell = map[y][x];
      if (cell === ".") pellets.add(keyOf(x, y));
      if (cell === "o") energizers.add(keyOf(x, y));
    }
  }
  totalFood = pellets.size + energizers.size;
  game.dotsEatenThisLevel = 0;
  game.fruitTriggerIndex = 0;
  game.fruit = null;
}

function resetRoundPositions() {
  player = {
    x: 13,
    y: 22,
    target: null,
    dir: "left",
    nextDir: "left",
    speed: 8.15 + Math.min(1.2, (game.level - 1) * 0.16),
    radius: 0.45,
    invulnerableUntil: game.time + 1.4,
    lastDecisionTile: null,
    from: null,
  };

  ghosts = [
    createGhost("Ruby", "#ff4b42", 13, 9, "left", { x: COLS - 3, y: 1 }, 0, "chaser"),
    createGhost("Fuchsia", "#ff74c7", 13, 11, "up", { x: 2, y: 1 }, 2.5, "ambusher"),
    createGhost("Teal", "#47d7ff", 14, 11, "up", { x: COLS - 2, y: ROWS - 2 }, 5.5, "vector"),
    createGhost("Amber", "#ff9b38", 14, 12, "up", { x: 1, y: ROWS - 2 }, 8.2, "rover"),
  ];

  game.mode = "scatter";
  game.modeIndex = 0;
  game.modeTime = 0;
  game.frightenedUntil = 0;
  game.frightenedChain = 0;
  game.botTrail = [];
  game.phase = "playing";
  game.message = "Ready";
  game.messageUntil = game.time + 1.1;
}

function createGhost(name, color, x, y, dir, scatterTarget, releaseDelay, personality) {
  const inHouse = y >= 11;
  return {
    name,
    color,
    x,
    y,
    spawnX: x,
    spawnY: y,
    target: null,
    dir,
    lastDir: dir,
    scatterTarget,
    releaseAt: game.time + releaseDelay,
    inHouse,
    mode: inHouse ? "waiting" : "normal",
    personality,
    speed: 7.2 + Math.min(1.6, (game.level - 1) * 0.13),
    frightenedSpeed: 4.85,
    eatenSpeed: 11.4,
    reviveAt: 0,
  };
}

function startGame(options = {}) {
  const { bot = false } = options;
  game.score = 0;
  game.level = 1;
  game.lives = 3;
  game.time = 0;
  game.started = true;
  game.paused = false;
  game.autopilot = bot;
  pauseButton.textContent = "Pause";
  resetFood();
  resetRoundPositions();
  hideOverlay();
  updateHud();
}

function nextLevel() {
  game.level += 1;
  game.score += 500;
  resetFood();
  resetRoundPositions();
  game.message = "Level up";
  game.messageUntil = game.time + 1.4;
}

function loseLife() {
  if (game.time < player.invulnerableUntil || game.phase !== "playing") return;
  labelRecentPending(-1, "caught by hunter", 3);
  game.lives -= 1;
  game.phase = "dying";
  game.message = "Caught!";
  game.messageUntil = game.time + 1.2;
  if (game.lives <= 0) {
    setTimeout(() => gameOver(), 850);
  } else {
    setTimeout(() => {
      resetRoundPositions();
      updateHud();
    }, 900);
  }
  updateHud();
}

function gameOver() {
  game.phase = "gameover";
  showOverlay("Game Over", "The learner kept training from rewards and penalties. Start again or press ML Bot Turn to let the bot try the next run.", "Play Again");
}

function togglePause() {
  if (!game.started || game.phase === "gameover") return;
  game.paused = !game.paused;
  pauseButton.textContent = game.paused ? "Resume" : "Pause";
  if (game.paused) {
    showOverlay("Paused", "Take a breath. The learner is holding onto every sample.", "Resume");
  } else {
    hideOverlay();
    game.lastFrame = performance.now();
  }
}

function showOverlay(title, copy, buttonText) {
  overlayTitle.textContent = title;
  overlayCopy.textContent = copy;
  overlayButton.textContent = buttonText;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function update(dt) {
  if (!game.started || game.paused || game.phase === "gameover") return;
  game.time += dt;

  if (game.phase === "playing") {
    updateMode(dt);
    updatePlayer(dt);
    updateGhosts(dt);
    checkFood();
    checkFruit();
    checkCollisions();
    settlePendingSamples();
    maybeFinishLevel();
  }

  updateHud();
}

function updateMode(dt) {
  if (game.time < game.frightenedUntil) return;
  const current = scatterChaseSchedule[game.modeIndex];
  game.mode = current.mode;
  game.modeTime += dt;
  if (game.modeTime >= current.seconds && game.modeIndex < scatterChaseSchedule.length - 1) {
    game.modeIndex += 1;
    game.modeTime = 0;
    game.mode = scatterChaseSchedule[game.modeIndex].mode;
    ghosts.forEach((ghost) => reverseGhost(ghost));
  }
}

function updatePlayer(dt) {
  if (!player.target) {
    const tile = entityTile(player);
    if (game.autopilot) {
      player.nextDir = chooseAutopilotDirection();
    }

    const nextDirWorks = player.nextDir && canMoveFrom(player, player.nextDir, canEnterPlayer);
    const currentDirWorks = player.dir && canMoveFrom(player, player.dir, canEnterPlayer);
    const chosenDir = nextDirWorks ? player.nextDir : currentDirWorks ? player.dir : null;
    const decisionKey = `${tile.x},${tile.y},${chosenDir || "stop"},${game.autopilot}`;

    if (chosenDir && player.lastDecisionTile !== decisionKey) {
      if (game.autopilot) rememberBotTile(tile);
      captureMoveSample(chosenDir, game.autopilot ? "ml bot move" : "manual move");
      player.lastDecisionTile = decisionKey;
    }

    if (chosenDir) {
      beginMove(player, chosenDir, canEnterPlayer);
    }
  }
  advanceAlongTarget(player, dt, player.speed);
}

function updateGhosts(dt) {
  for (const ghost of ghosts) {
    if (ghost.mode === "waiting" && game.time >= ghost.releaseAt) {
      ghost.mode = "leaving";
      ghost.dir = "up";
    }

    if (!ghost.target) {
      if (ghost.mode === "waiting") {
        ghost.dir = game.time % 1.1 < 0.55 ? "left" : "right";
      } else if (ghost.mode === "leaving") {
        if (ghost.y <= 9) {
          ghost.inHouse = false;
          ghost.mode = "normal";
        }
        chooseGhostDirection(ghost, { x: 13, y: 9 }, true);
      } else if (ghost.mode === "eaten") {
        const homeTarget = ghost.inHouse ? { x: ghost.spawnX, y: ghost.spawnY } : { x: 13, y: 11 };
        chooseGhostDirection(ghost, homeTarget, true);
        if (distance(entityTile(ghost), { x: ghost.spawnX, y: ghost.spawnY }) < 0.5) {
          ghost.mode = "normal";
          ghost.inHouse = false;
          ghost.releaseAt = game.time;
          ghost.x = 13;
          ghost.y = 9;
          ghost.target = null;
          ghost.dir = "left";
        }
      } else if (game.time < game.frightenedUntil) {
        chooseFrightenedDirection(ghost);
      } else {
        chooseGhostDirection(ghost, targetForGhost(ghost), false);
      }
    }

    const speed = ghost.mode === "eaten" ? ghost.eatenSpeed : game.time < game.frightenedUntil && ghost.mode !== "eaten" ? ghost.frightenedSpeed : ghost.speed;
    advanceAlongTarget(ghost, dt, speed);
  }
}

function beginMove(entity, dirKey, canEnter) {
  const dir = DIRECTIONS[dirKey];
  const from = entityTile(entity);
  const next = neighborTile(from.x, from.y, dirKey, canEnter);
  if (!next) return false;
  entity.from = from;
  entity.target = next;
  entity.dir = dirKey;
  return true;
}

function advanceAlongTarget(entity, dt, speed) {
  if (!entity.target) return;
  const step = speed * dt;
  const dx = entity.target.x - entity.x;
  const dy = entity.target.y - entity.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= step || dist < 0.001) {
    entity.x = entity.target.x;
    entity.y = entity.target.y;
    entity.target = null;
    return;
  }
  entity.x += (dx / dist) * step;
  entity.y += (dy / dist) * step;
}

function canMoveFrom(entity, dirKey, canEnter) {
  const from = entityTile(entity);
  return Boolean(neighborTile(from.x, from.y, dirKey, canEnter));
}

function neighborTile(x, y, dirKey, canEnter) {
  const dir = DIRECTIONS[dirKey];
  let nx = x + dir.dx;
  const ny = y + dir.dy;
  if (ny < 0 || ny >= ROWS) return null;
  if (nx < 0) nx = COLS - 1;
  if (nx >= COLS) nx = 0;
  return canEnter(nx, ny) ? { x: nx, y: ny } : null;
}

function canEnterPlayer(x, y) {
  const cell = cellAt(x, y);
  return cell === "." || cell === "o" || cell === " " || cell === "T";
}

function canEnterGhost(x, y) {
  const cell = cellAt(x, y);
  return cell !== "#";
}

function canEnterHuntingGhost(x, y) {
  const cell = cellAt(x, y);
  return cell !== "#" && cell !== "=" && cell !== "-";
}

function cellAt(x, y) {
  if (y < 0 || y >= ROWS) return "#";
  let wrappedX = x;
  if (wrappedX < 0) wrappedX = COLS - 1;
  if (wrappedX >= COLS) wrappedX = 0;
  return map[y][wrappedX];
}

function keyOf(x, y) {
  return `${x},${y}`;
}

function entityTile(entity) {
  return { x: Math.round(entity.x), y: Math.round(entity.y) };
}

function legalDirectionsFrom(tile, canEnter, excludeReverseOf = null) {
  return DIR_ORDER.filter((dirKey) => {
    if (excludeReverseOf && dirKey === DIRECTIONS[excludeReverseOf].opposite) return false;
    return Boolean(neighborTile(tile.x, tile.y, dirKey, canEnter));
  });
}

function chooseGhostDirection(ghost, target, allowReverse) {
  const tile = entityTile(ghost);
  const canEnter = ghost.mode === "eaten" || ghost.mode === "leaving" ? canEnterGhost : canEnterHuntingGhost;
  let options = legalDirectionsFrom(tile, canEnter, allowReverse ? null : ghost.dir);
  if (options.length === 0) options = legalDirectionsFrom(tile, canEnter);
  if (options.length === 0) return;

  let best = options[0];
  let bestDistance = Infinity;
  for (const dirKey of options) {
    const next = neighborTile(tile.x, tile.y, dirKey, canEnter);
    const d = distance(next, target);
    if (d < bestDistance) {
      bestDistance = d;
      best = dirKey;
    }
  }
  beginMove(ghost, best, canEnter);
}

function chooseFrightenedDirection(ghost) {
  const tile = entityTile(ghost);
  let options = legalDirectionsFrom(tile, canEnterHuntingGhost, ghost.dir);
  if (options.length === 0) options = legalDirectionsFrom(tile, canEnterHuntingGhost);
  if (options.length === 0) return;
  const scored = options.map((dirKey) => {
    const next = neighborTile(tile.x, tile.y, dirKey, canEnterHuntingGhost);
    const playerDist = distance(next, entityTile(player));
    return { dirKey, score: playerDist + Math.random() * 2.5 };
  });
  scored.sort((a, b) => b.score - a.score);
  beginMove(ghost, scored[0].dirKey, canEnterHuntingGhost);
}

function targetForGhost(ghost) {
  if (game.mode === "scatter") return ghost.scatterTarget;
  const p = entityTile(player);
  if (ghost.personality === "chaser") return p;
  if (ghost.personality === "ambusher") return offsetFromPlayer(4);
  if (ghost.personality === "vector") {
    const ruby = ghosts.find((candidate) => candidate.personality === "chaser") || ghost;
    const ahead = offsetFromPlayer(2);
    return { x: ahead.x + (ahead.x - Math.round(ruby.x)), y: ahead.y + (ahead.y - Math.round(ruby.y)) };
  }
  if (ghost.personality === "rover") {
    return distance(entityTile(ghost), p) >= 8 ? p : ghost.scatterTarget;
  }
  return p;
}

function offsetFromPlayer(amount) {
  const p = entityTile(player);
  const dir = DIRECTIONS[player.dir] || DIRECTIONS.left;
  let x = p.x + dir.dx * amount;
  let y = p.y + dir.dy * amount;
  if (player.dir === "up") x -= amount;
  return { x, y };
}

function reverseGhost(ghost) {
  if (ghost.mode === "waiting" || ghost.mode === "eaten") return;
  ghost.x = Math.round(ghost.x);
  ghost.y = Math.round(ghost.y);
  ghost.target = null;
  ghost.dir = DIRECTIONS[ghost.dir]?.opposite || ghost.dir;
}

function checkFood() {
  const tile = entityTile(player);
  const key = keyOf(tile.x, tile.y);
  if (pellets.has(key)) {
    pellets.delete(key);
    map[tile.y][tile.x] = " ";
    game.score += 10;
    game.dotsEatenThisLevel += 1;
    labelLatestPending(1, "ate a dot");
  }
  if (energizers.has(key)) {
    energizers.delete(key);
    map[tile.y][tile.x] = " ";
    game.score += 50;
    game.dotsEatenThisLevel += 1;
    triggerFrightenedMode();
    labelLatestPending(1, "used energizer");
  }
}

function triggerFrightenedMode() {
  game.frightenedUntil = game.time + Math.max(2.2, 7.5 - game.level * 0.32);
  game.frightenedChain = 0;
  ghosts.forEach((ghost) => reverseGhost(ghost));
  game.message = "Hunters vulnerable";
  game.messageUntil = game.time + 1.1;
}

function checkFruit() {
  if (!game.fruit && game.fruitTriggerIndex < game.fruitTriggers.length && game.dotsEatenThisLevel >= game.fruitTriggers[game.fruitTriggerIndex]) {
    game.fruit = {
      x: 13,
      y: 16,
      bornAt: game.time,
      expiresAt: game.time + 9.5,
      value: Math.min(5000, 100 + game.level * 150),
    };
    game.fruitTriggerIndex += 1;
  }
  if (game.fruit && game.time > game.fruit.expiresAt) {
    game.fruit = null;
  }
  if (game.fruit && distance(entityTile(player), game.fruit) < 0.45) {
    game.score += game.fruit.value;
    labelLatestPending(1, "grabbed bonus");
    game.message = `Bonus +${game.fruit.value}`;
    game.messageUntil = game.time + 1.1;
    game.fruit = null;
  }
}

function checkCollisions() {
  for (const ghost of ghosts) {
    if (ghost.mode === "waiting" || ghost.mode === "eaten") continue;
    const d = Math.hypot(player.x - ghost.x, player.y - ghost.y);
    if (d > 0.62) continue;
    if (game.time < game.frightenedUntil) {
      eatGhost(ghost);
    } else {
      loseLife();
      break;
    }
  }
}

function eatGhost(ghost) {
  game.frightenedChain += 1;
  const value = 100 * 2 ** game.frightenedChain;
  game.score += value;
  ghost.mode = "eaten";
  ghost.target = null;
  ghost.inHouse = false;
  labelLatestPending(1, `ate hunter +${value}`);
  game.message = `Hunter eaten +${value}`;
  game.messageUntil = game.time + 0.9;
}

function maybeFinishLevel() {
  if (pellets.size + energizers.size > 0) return;
  game.phase = "level-clear";
  game.message = "Maze clear";
  game.messageUntil = game.time + 1.2;
  labelRecentPending(1, "cleared maze", 4);
  setTimeout(() => nextLevel(), 950);
}

function captureMoveSample(action, source) {
  const features = featuresForAction(action);
  if (!features) return;
  const tile = entityTile(player);
  const sample = {
    features,
    action,
    label: 0,
    source,
    createdAt: game.time,
    tileKey: keyOf(tile.x, tile.y),
  };
  learner.pending.push(sample);
  learner.lastSample = sample;
  if (learner.pending.length > 28) learner.pending.shift();
}

function labelLatestPending(label, reason) {
  const sample = [...learner.pending].reverse().find((candidate) => candidate.label === 0);
  if (!sample) return;
  commitSample(sample, label, reason);
  learner.pending = learner.pending.filter((candidate) => candidate !== sample);
}

function labelRecentPending(label, reason, seconds) {
  const cutoff = game.time - seconds;
  const toLabel = learner.pending.filter((sample) => sample.createdAt >= cutoff && sample.label === 0);
  toLabel.forEach((sample) => commitSample(sample, label, reason));
  learner.pending = learner.pending.filter((sample) => !toLabel.includes(sample));
}

function settlePendingSamples() {
  const ready = learner.pending.filter((sample) => game.time - sample.createdAt > 2.15 && sample.label === 0);
  ready.forEach((sample) => commitSample(sample, 1, "survived the turn"));
  learner.pending = learner.pending.filter((sample) => !ready.includes(sample));
}

function commitSample(sample, label, reason) {
  sample.label = label;
  sample.reason = reason;
  learner.samples.push({
    features: sample.features,
    action: sample.action,
    label,
    reason,
    createdAt: Date.now(),
  });
  if (learner.samples.length > MAX_SAMPLES) learner.samples.shift();
  if (label > 0) learner.good += 1;
  else learner.bad += 1;
  learner.lastLesson = `${label > 0 ? "Reward" : "Penalty"}: ${reason}`;
  trainOnSample(sample.features, label);
  saveLearner();
}

function trainOnSample(features, label) {
  const target = label > 0 ? 1 : 0;
  const score = dot(learner.weights, features);
  const prediction = sigmoid(score);
  const error = target - prediction;
  const lr = label > 0 ? 0.075 : 0.095;
  for (let i = 0; i < learner.weights.length; i += 1) {
    learner.weights[i] += lr * error * features[i];
    learner.weights[i] *= 0.9992;
  }
}

function featuresForAction(action) {
  const tile = entityTile(player);
  const next = neighborTile(tile.x, tile.y, action, canEnterPlayer);
  if (!next) {
    return [1, -1, 1, 0, 0, 0, 0, -1, -1, 1, 0];
  }

  const activeGhosts = ghosts.filter((ghost) => ghost.mode !== "eaten" && ghost.mode !== "waiting");
  const threatGhosts = activeGhosts.filter(() => game.time >= game.frightenedUntil);
  const frightenedGhosts = activeGhosts.filter(() => game.time < game.frightenedUntil);
  const nearestThreat = nearestDistance(next, threatGhosts.map(entityTile));
  const nearestFrightened = nearestDistance(next, frightenedGhosts.map(entityTile));
  const pelletDist = nearestFoodDistance(next, false);
  const energizerDist = nearestFoodDistance(next, true);
  const fruitDist = game.fruit ? gridDistance(next, game.fruit) : Infinity;
  const routeFreedom = legalDirectionsFrom(next, canEnterPlayer).length / 4;
  const isDeadEnd = legalDirectionsFrom(next, canEnterPlayer).length <= 1 ? 1 : 0;
  const keepsMomentum = action === player.dir ? 1 : action === DIRECTIONS[player.dir]?.opposite ? -0.6 : 0.2;
  const tunnelEscape = cellAt(next.x, next.y) === "T" ? 1 : 0;

  return [
    1,
    clamp(nearestThreat / 8, 0, 1),
    nearestThreat <= 2 ? 1 : nearestThreat <= 4 ? 0.35 : 0,
    proximity(pelletDist),
    proximity(energizerDist) * (nearestThreat <= 5 ? 1.35 : 0.55),
    proximity(nearestFrightened),
    proximity(fruitDist),
    routeFreedom,
    keepsMomentum,
    isDeadEnd,
    tunnelEscape,
  ];
}

function chooseAutopilotDirection() {
  const tile = entityTile(player);
  const options = legalDirectionsFrom(tile, canEnterPlayer);
  if (options.length === 0) return player.dir;
  const samplePower = clamp(learner.samples.length / 90, 0.08, 0.72);
  const reverseDir = DIRECTIONS[player.dir]?.opposite;
  const forcedReverse = options.length === 1 && options[0] === reverseDir;

  const scored = options.map((action) => {
    const features = featuresForAction(action);
    const learned = Math.tanh(dot(learner.weights, features)) * 1.4;
    const heuristic = heuristicForAction(action, features);
    const next = neighborTile(tile.x, tile.y, action, canEnterPlayer);
    const revisitPenalty = botRevisitPenalty(next);
    const reversePenalty = action === reverseDir && !forcedReverse ? 2.8 : 0;
    const corridorBonus = action === player.dir && options.length <= 2 ? 0.85 : 0;
    const score = learned * samplePower + heuristic * (1 - samplePower) + corridorBonus - revisitPenalty - reversePenalty;
    return { action, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].action;
}

function rememberBotTile(tile) {
  const key = keyOf(tile.x, tile.y);
  game.botTrail.push(key);
  if (game.botTrail.length > 18) game.botTrail.shift();
}

function botRevisitPenalty(tile) {
  if (!tile || game.botTrail.length === 0) return 0;
  const key = keyOf(tile.x, tile.y);
  const ageFromEnd = [...game.botTrail].reverse().findIndex((trailKey) => trailKey === key);
  if (ageFromEnd < 0) return 0;
  if (ageFromEnd === 0) return 3.2;
  if (ageFromEnd === 1) return 2.35;
  return clamp(1.5 - ageFromEnd * 0.13, 0.25, 1.5);
}

function heuristicForAction(action, features) {
  const [bias, safety, danger, pellet, energizer, frightened, fruit, freedom, momentum, deadEnd, tunnel] = features;
  void bias;
  return safety * 2.2 - danger * 2.65 + pellet * 1.25 + energizer * 1.5 + frightened * 2.1 + fruit * 1.25 + freedom * 0.55 + momentum * 0.24 - deadEnd * 1.15 + tunnel * 0.32;
}

function nearestFoodDistance(from, onlyEnergizer) {
  const set = onlyEnergizer ? energizers : new Set([...pellets, ...energizers]);
  if (set.size === 0) return Infinity;
  let best = Infinity;
  for (const key of set) {
    const [x, y] = key.split(",").map(Number);
    const d = gridDistance(from, { x, y });
    if (d < best) best = d;
    if (best <= 1) break;
  }
  return best;
}

function nearestDistance(from, points) {
  if (points.length === 0) return Infinity;
  return points.reduce((best, point) => Math.min(best, gridDistance(from, point)), Infinity);
}

function gridDistance(a, b) {
  const directX = Math.abs(a.x - b.x);
  const wrapX = COLS - directX;
  return Math.min(directX, wrapX) + Math.abs(a.y - b.y);
}

function proximity(dist) {
  if (!Number.isFinite(dist)) return 0;
  return 1 / (1 + dist);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function dot(weights, features) {
  return weights.reduce((sum, weight, index) => sum + weight * features[index], 0);
}

function sigmoid(value) {
  if (value < -30) return 0;
  if (value > 30) return 1;
  return 1 / (1 + Math.exp(-value));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function saveLearner() {
  const compact = {
    weights: learner.weights,
    samples: learner.samples.slice(-MAX_SAMPLES),
    good: learner.good,
    bad: learner.bad,
    lastLesson: learner.lastLesson,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
  updateLearnerHud();
}

function loadLearner() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    learner.weights = Array.isArray(data.weights) && data.weights.length === FEATURE_NAMES.length ? data.weights : learner.weights;
    learner.samples = Array.isArray(data.samples) ? data.samples : [];
    learner.good = Number.isFinite(data.good) ? data.good : learner.samples.filter((sample) => sample.label > 0).length;
    learner.bad = Number.isFinite(data.bad) ? data.bad : learner.samples.filter((sample) => sample.label < 0).length;
    learner.lastLesson = data.lastLesson || learner.lastLesson;
  } catch (error) {
    console.warn("Could not load learner data", error);
  }
}

function clearLearner() {
  learner = createLearner();
  learner.lastLesson = "Brain reset; rewards will retrain it";
  localStorage.removeItem(STORAGE_KEY);
  updateLearnerHud();
}

function updateHud() {
  setText(scoreLabel, game.score.toLocaleString());
  setText(levelLabel, String(game.level));
  setText(livesLabel, String(game.lives));
  setText(dotsLabel, String(pellets.size + energizers.size));
  updateLearnerHud();
}

function updateLearnerHud() {
  setText(samplesLabel, learner.samples.length.toLocaleString());
  setText(goodLabel, learner.good.toLocaleString());
  setText(badLabel, learner.bad.toLocaleString());
  setText(lessonLabel, learner.lastLesson);
  const strength = Math.round(clamp(learner.samples.length / 60, 0, 1) * 100);
  setText(brainStrength, `${strength}%`);
  const strengthWidth = `${strength}%`;
  if (brainMeterFill.style.width !== strengthWidth) brainMeterFill.style.width = strengthWidth;
  setText(autopilotButton, `ML Bot Turn: ${game.autopilot ? "On" : "Off"}`);
  autopilotButton.classList.toggle("secondary", !game.autopilot);
}

function setText(element, value) {
  if (hudCache.get(element) === value) return;
  hudCache.set(element, value);
  element.textContent = value;
}

function draw() {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  drawBackground(canvasWidth, canvasHeight);
  drawMaze();
  drawFood();
  drawFruit();
  drawPlayer();
  drawGhosts();
  drawMessages();
}

function drawBackground(width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#030711");
  gradient.addColorStop(0.56, "#03040a");
  gradient.addColorStop(1, "#10100a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.75;
  for (const star of starfield) {
    const pulse = 0.45 + Math.sin(game.time * 1.7 + star.twinkle) * 0.25;
    ctx.fillStyle = `rgba(246,242,216,${pulse})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMaze() {
  ctx.save();
  ctx.translate(boardOffsetX, boardOffsetY);

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (cellAt(x, y) !== "#") continue;
      const px = x * tileSize;
      const py = y * tileSize;
      const radius = tileSize * 0.28;
      ctx.shadowColor = "rgba(24, 167, 255, 0.85)";
      ctx.shadowBlur = tileSize * 0.28;
      ctx.fillStyle = "rgba(15, 79, 173, 0.72)";
      roundRect(ctx, px + 1.2, py + 1.2, tileSize - 2.4, tileSize - 2.4, radius);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(122, 217, 255, 0.58)";
      ctx.lineWidth = Math.max(1, tileSize * 0.045);
      ctx.stroke();
    }
  }

  ctx.strokeStyle = "rgba(255, 213, 74, 0.8)";
  ctx.lineWidth = Math.max(2, tileSize * 0.11);
  const doorY = 10 * tileSize + tileSize * 0.5;
  ctx.beginPath();
  ctx.moveTo(13 * tileSize, doorY);
  ctx.lineTo(15 * tileSize, doorY);
  ctx.stroke();

  ctx.restore();
}

function drawFood() {
  ctx.save();
  ctx.translate(boardOffsetX, boardOffsetY);
  for (const key of pellets) {
    const [x, y] = key.split(",").map(Number);
    drawDot(x, y, tileSize * 0.095, "rgba(255, 235, 180, 0.92)");
  }
  const pulse = 0.72 + Math.sin(game.time * 8) * 0.18;
  for (const key of energizers) {
    const [x, y] = key.split(",").map(Number);
    drawDot(x, y, tileSize * (0.24 + pulse * 0.04), `rgba(255, 213, 74, ${pulse})`);
  }
  ctx.restore();
}

function drawDot(x, y, radius, fillStyle) {
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  ctx.arc((x + 0.5) * tileSize, (y + 0.5) * tileSize, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawFruit() {
  if (!game.fruit) return;
  ctx.save();
  ctx.translate(boardOffsetX, boardOffsetY);
  const x = (game.fruit.x + 0.5) * tileSize;
  const y = (game.fruit.y + 0.5) * tileSize;
  const bob = Math.sin(game.time * 7) * tileSize * 0.06;
  ctx.shadowColor = "rgba(108, 255, 155, 0.8)";
  ctx.shadowBlur = tileSize * 0.35;
  ctx.fillStyle = "#6cff9b";
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / 6;
    const r = i % 2 === 0 ? tileSize * 0.31 : tileSize * 0.18;
    ctx.lineTo(x + Math.cos(angle) * r, y + bob + Math.sin(angle) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPlayer() {
  ctx.save();
  ctx.translate(boardOffsetX, boardOffsetY);
  const x = (player.x + 0.5) * tileSize;
  const y = (player.y + 0.5) * tileSize;
  const radius = tileSize * 0.43;
  const dir = DIRECTIONS[player.dir] || DIRECTIONS.left;
  const mouth = 0.15 + Math.abs(Math.sin(game.time * 13)) * 0.36;
  const invulnBlink = game.time < player.invulnerableUntil && Math.floor(game.time * 12) % 2 === 0;

  ctx.shadowColor = "rgba(255, 213, 74, 0.75)";
  ctx.shadowBlur = tileSize * 0.35;
  ctx.fillStyle = invulnBlink ? "rgba(255, 245, 170, 0.72)" : "#ffd54a";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, radius, dir.angle + mouth, dir.angle + Math.PI * 2 - mouth, false);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "rgba(41, 31, 0, 0.92)";
  const eyeAngle = dir.angle - Math.PI / 2;
  ctx.beginPath();
  ctx.arc(x + Math.cos(eyeAngle) * radius * 0.32 + Math.cos(dir.angle) * radius * 0.2, y + Math.sin(eyeAngle) * radius * 0.32 + Math.sin(dir.angle) * radius * 0.2, radius * 0.085, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGhosts() {
  ctx.save();
  ctx.translate(boardOffsetX, boardOffsetY);
  ghosts.forEach(drawGhost);
  ctx.restore();
}

function drawGhost(ghost) {
  const x = (ghost.x + 0.5) * tileSize;
  const y = (ghost.y + 0.5) * tileSize;
  const radius = tileSize * 0.42;
  const frightened = game.time < game.frightenedUntil && ghost.mode !== "eaten" && ghost.mode !== "waiting";
  const flashing = frightened && game.frightenedUntil - game.time < 1.6 && Math.floor(game.time * 9) % 2 === 0;
  const fill = ghost.mode === "eaten" ? "transparent" : frightened ? (flashing ? "#f8f2df" : "#2147ff") : ghost.color;

  if (ghost.mode !== "eaten") {
    ctx.save();
    ctx.shadowColor = frightened ? "rgba(70, 110, 255, 0.8)" : ghost.color;
    ctx.shadowBlur = tileSize * 0.32;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y - radius * 0.06, radius, Math.PI, 0, false);
    ctx.lineTo(x + radius, y + radius * 0.64);
    for (let i = 0; i < 4; i += 1) {
      const px = x + radius - (i + 0.5) * (radius * 2 / 4);
      const waveY = y + radius * (0.52 + (i % 2) * 0.16);
      ctx.quadraticCurveTo(px, waveY, x + radius - (i + 1) * (radius * 2 / 4), y + radius * 0.64);
    }
    ctx.lineTo(x - radius, y - radius * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawGhostEyes(ghost, x, y, radius, frightened && ghost.mode !== "eaten");
}

function drawGhostEyes(ghost, x, y, radius, frightened) {
  const dir = DIRECTIONS[ghost.dir] || DIRECTIONS.left;
  const eyeOffsetX = radius * 0.34;
  const pupilOffsetX = dir.dx * radius * 0.11;
  const pupilOffsetY = dir.dy * radius * 0.11;
  const eyeY = y - radius * 0.18;

  if (frightened) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.86)";
    ctx.lineWidth = Math.max(1.4, tileSize * 0.075);
    ctx.beginPath();
    ctx.arc(x - eyeOffsetX * 0.52, eyeY, radius * 0.11, 0, Math.PI * 2);
    ctx.arc(x + eyeOffsetX * 0.52, eyeY, radius * 0.11, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  ctx.fillStyle = "#fff7e9";
  ctx.beginPath();
  ctx.ellipse(x - eyeOffsetX, eyeY, radius * 0.22, radius * 0.28, 0, 0, Math.PI * 2);
  ctx.ellipse(x + eyeOffsetX, eyeY, radius * 0.22, radius * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#082244";
  ctx.beginPath();
  ctx.arc(x - eyeOffsetX + pupilOffsetX, eyeY + pupilOffsetY, radius * 0.1, 0, Math.PI * 2);
  ctx.arc(x + eyeOffsetX + pupilOffsetX, eyeY + pupilOffsetY, radius * 0.1, 0, Math.PI * 2);
  ctx.fill();
}

function drawMessages() {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 18px Trebuchet MS, sans-serif";
  ctx.fillStyle = "rgba(246, 242, 216, 0.92)";
  const modeText = game.time < game.frightenedUntil ? "FRIGHTENED" : game.mode.toUpperCase();
  ctx.fillText(`${modeText}  |  ${game.autopilot ? "ML BOT" : "MANUAL"}`, canvasWidth / 2, boardOffsetY + tileSize * 0.54);

  if (game.message && game.time < game.messageUntil) {
    ctx.font = "950 38px Trebuchet MS, sans-serif";
    ctx.fillStyle = "rgba(255, 213, 74, 0.96)";
    ctx.shadowColor = "rgba(255, 213, 74, 0.7)";
    ctx.shadowBlur = 18;
    ctx.fillText(game.message, canvasWidth / 2, canvasHeight * 0.48);
  }
  ctx.restore();
}

function roundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function frame(now) {
  const dt = Math.min(0.05, (now - game.lastFrame) / 1000 || 0);
  game.lastFrame = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

function setDirection(dirKey) {
  if (!game.started) startGame();
  if (game.autopilot) {
    game.autopilot = false;
    learner.lastLesson = "Manual control restored";
    updateLearnerHud();
  }
  if (player.target && dirKey === DIRECTIONS[player.dir]?.opposite && player.from) {
    player.target = player.from;
    player.from = entityTile(player);
    player.dir = dirKey;
  }
  player.nextDir = dirKey;
}

function toggleAutopilot() {
  const activeRun = game.started && game.phase !== "gameover";
  const shouldEnableBot = !activeRun || !game.autopilot;

  if (!activeRun) {
    startGame({ bot: true });
  } else {
    game.autopilot = shouldEnableBot;
  }

  if (game.autopilot && game.paused) {
    game.paused = false;
    pauseButton.textContent = "Pause";
    hideOverlay();
    game.lastFrame = performance.now();
  }

  learner.lastLesson = game.autopilot ? "ML bot is choosing and self-training" : "Manual control restored";
  updateLearnerHud();
}

function bindEvents() {
  startButton.addEventListener("click", startGame);
  overlayButton.addEventListener("click", () => {
    if (game.paused) togglePause();
    else startGame();
  });
  pauseButton.addEventListener("click", togglePause);
  autopilotButton.addEventListener("click", toggleAutopilot);
  clearButton.addEventListener("click", clearLearner);
  window.addEventListener("resize", queueCanvasResize);
  if ("ResizeObserver" in window) {
    new ResizeObserver(queueCanvasResize).observe(canvas);
  }
  window.addEventListener("keydown", (event) => {
    if (INPUT_TO_DIR.has(event.code)) {
      event.preventDefault();
      setDirection(INPUT_TO_DIR.get(event.code));
      return;
    }
    if (event.code === "KeyP" || event.code === "Space") {
      event.preventDefault();
      togglePause();
    }
    if (event.code === "KeyR") startGame();
    if (event.code === "KeyM") toggleAutopilot();
  });
}

window.__mazeMuncherDebug = {
  getState() {
    return {
      autopilot: game.autopilot,
      botTrail: [...game.botTrail],
      dir: player.dir,
      dots: pellets.size + energizers.size,
      phase: game.phase,
      player: { x: Number(player.x.toFixed(2)), y: Number(player.y.toFixed(2)) },
      score: game.score,
      samples: learner.samples.length,
    };
  },
};

validateMap();
loadLearner();
resetFood();
resetRoundPositions();
game.started = false;
setupCanvas();
bindEvents();
updateHud();
requestAnimationFrame(frame);
