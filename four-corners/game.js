import * as THREE from "./vendor/three.module.js";

const BOT_COUNT = 20;
const ROUND_MS = 7000;
const FALL_MS = 1700;
const RESTORE_MS = 900;
const ROUND_RESET_MS = 3200;
const FLOOR_TOP_Y = 0.24;
const FLOOR_LIMIT = 7.58;
const SAFE_INSET = 0.56;
const BOT_SPEED = 2.55;
const USER_SPEED = 4.55;

const sectionDefs = [
  { id: 0, number: "1", name: "Red", color: 0xf04455, center: [-4.08, -4.08] },
  { id: 1, number: "2", name: "Blue", color: 0x458cff, center: [4.08, -4.08] },
  { id: 2, number: "3", name: "Green", color: 0x39c86b, center: [-4.08, 4.08] },
  { id: 3, number: "4", name: "Gold", color: 0xffc64a, center: [4.08, 4.08] },
];

const canvas = document.querySelector("#game-canvas");
canvas.tabIndex = 0;
const queryParams = new URLSearchParams(window.location.search);
const captureEnabled = queryParams.has("capture");
const localDebugEnabled = ["127.0.0.1", "localhost"].includes(window.location.hostname);
const forceUserDrop = localDebugEnabled && queryParams.has("force-user-drop");
const leftCountEl = document.querySelector("#left-count");
const roundLabelEl = document.querySelector("#round-label");
const timerLabelEl = document.querySelector("#timer-label");
const cornerCountsEl = document.querySelector("#corner-counts");
const announcementEl = document.querySelector("#announcement");
const startScreen = document.querySelector("#start-screen");
const endScreen = document.querySelector("#end-screen");
const endTitle = document.querySelector("#end-title");
const endCopy = document.querySelector("#end-copy");
const playButton = document.querySelector("#play-button");
const restartButton = document.querySelector("#restart-button");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060914);
scene.fog = new THREE.Fog(0x060914, 20, 58);

const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120);
camera.position.set(0, 13.5, 15.5);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;

const clock = new THREE.Clock();
const MOVEMENT_KEYS = new Set([
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "KeyA",
  "KeyD",
  "KeyS",
  "KeyW",
]);
const MOVEMENT_DIRECTIONS = {
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  KeyA: "left",
  KeyD: "right",
  KeyS: "down",
  KeyW: "up",
};
const KEY_ALIASES = {
  a: "KeyA",
  A: "KeyA",
  d: "KeyD",
  D: "KeyD",
  s: "KeyS",
  S: "KeyS",
  w: "KeyW",
  W: "KeyW",
};
const OPPOSITE_MOVEMENT_DIRECTIONS = {
  down: "up",
  left: "right",
  right: "left",
  up: "down",
};
const KEY_STALE_MS = 1200;
const tmpVec = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
const desiredCameraPosition = new THREE.Vector3();
const centerTarget = new THREE.Vector3(0, 0, 0);

const floorSections = [];
const characters = [];
const timeouts = new Set();
let user = null;
let botMaterials = null;
let userMaterials = null;
let announcementTimer = 0;
let frameCount = 0;
let capturedFrame = false;
const activeMoveKeys = new Map();
let activeMoveKey = null;

const game = {
  started: false,
  ended: false,
  round: 0,
  phase: "ready",
  nextFallAt: 0,
  fallingSection: null,
};

const geometries = {
  head: new THREE.SphereGeometry(0.25, 36, 24),
  hair: new THREE.SphereGeometry(0.255, 32, 16),
  nose: new THREE.ConeGeometry(0.035, 0.1, 16),
  eye: new THREE.SphereGeometry(0.024, 16, 10),
  torso: new THREE.CapsuleGeometry(0.255, 0.55, 12, 28),
  limb: new THREE.CapsuleGeometry(0.072, 0.48, 8, 18),
  hand: new THREE.SphereGeometry(0.082, 18, 12),
  shoe: new THREE.BoxGeometry(0.18, 0.08, 0.3),
  detailBox: new THREE.BoxGeometry(0.055, 0.22, 0.032),
  button: new THREE.SphereGeometry(0.018, 12, 8),
};

function buildWorld() {
  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x1a1021, 1.1);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff1cb, 3.2);
  sun.position.set(-8, 14, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 38;
  sun.shadow.camera.left = -15;
  sun.shadow.camera.right = 15;
  sun.shadow.camera.top = 15;
  sun.shadow.camera.bottom = -15;
  scene.add(sun);

  const rim = new THREE.DirectionalLight(0x78b6ff, 1.7);
  rim.position.set(8, 7, -10);
  scene.add(rim);

  const platformGlow = new THREE.Mesh(
    new THREE.CircleGeometry(12.8, 96),
    new THREE.MeshBasicMaterial({
      color: 0x14284d,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  );
  platformGlow.rotation.x = -Math.PI / 2;
  platformGlow.position.y = -1.35;
  scene.add(platformGlow);

  const grid = new THREE.GridHelper(42, 42, 0x48638d, 0x26364f);
  grid.position.y = -2.8;
  grid.material.transparent = true;
  grid.material.opacity = 0.22;
  scene.add(grid);

  createStars();
  createFloor();
}

function createStars() {
  const count = 900;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const radius = 25 + Math.random() * 35;
    const theta = Math.random() * Math.PI * 2;
    const y = 6 + Math.random() * 38;
    positions[i * 3] = Math.cos(theta) * radius;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(theta) * radius;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xcddcff,
      size: 0.055,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    }),
  );
  scene.add(stars);
}

function createFloor() {
  sectionDefs.forEach((def) => {
    const group = new THREE.Group();
    group.position.set(def.center[0], 0, def.center[1]);

    const material = new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: 0.54,
      metalness: 0.08,
      envMapIntensity: 0.6,
    });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(7.82, 0.42, 7.82), material);
    slab.castShadow = true;
    slab.receiveShadow = true;
    group.add(slab);

    const underside = new THREE.Mesh(
      new THREE.BoxGeometry(7.5, 0.16, 7.5),
      new THREE.MeshStandardMaterial({
        color: 0x121722,
        roughness: 0.7,
        metalness: 0.25,
      }),
    );
    underside.position.y = -0.31;
    underside.receiveShadow = true;
    group.add(underside);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(7.84, 0.44, 7.84)),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.42 }),
    );
    group.add(edges);

    const label = createCornerLabel(def.number, def.color);
    label.position.set(0, FLOOR_TOP_Y + 0.015, 0);
    group.add(label);

    scene.add(group);
    floorSections.push({
      id: def.id,
      group,
      baseY: 0,
      state: "stable",
      fallStart: 0,
      restoreStart: 0,
      startY: 0,
      startRotation: new THREE.Euler(),
      spinX: 0,
      spinZ: 0,
    });
  });
}

function createCornerLabel(text, color) {
  const size = 256;
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = size;
  labelCanvas.height = size;
  const ctx = labelCanvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "rgba(5,7,13,0.34)";
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 98, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.72)";
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.fillStyle = "#fff8e7";
  ctx.font = "900 132px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = `#${color.toString(16).padStart(6, "0")}`;
  ctx.shadowBlur = 14;
  ctx.fillText(text, size / 2, size / 2 + 5);

  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 1.35), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 3;
  return mesh;
}

function makeMaterialSet(kind) {
  const isUser = kind === "user";
  return {
    skin: new THREE.MeshStandardMaterial({
      color: isUser ? 0xd8a47f : 0xc8956d,
      roughness: 0.55,
      metalness: 0.02,
    }),
    hair: new THREE.MeshStandardMaterial({
      color: isUser ? 0x202735 : 0x3c251a,
      roughness: 0.72,
    }),
    jacket: new THREE.MeshStandardMaterial({
      color: isUser ? 0x176dff : 0x3f4656,
      roughness: 0.48,
      metalness: isUser ? 0.24 : 0.06,
    }),
    shirt: new THREE.MeshStandardMaterial({
      color: isUser ? 0xfff3cf : 0xd9dde4,
      roughness: 0.62,
    }),
    pants: new THREE.MeshStandardMaterial({
      color: isUser ? 0x11192c : 0x2a2f38,
      roughness: 0.58,
    }),
    shoes: new THREE.MeshStandardMaterial({
      color: isUser ? 0xffffff : 0x111111,
      roughness: 0.36,
      metalness: 0.05,
    }),
    eye: new THREE.MeshStandardMaterial({ color: 0x050507, roughness: 0.35 }),
    glow: new THREE.MeshBasicMaterial({
      color: 0x75dcff,
      transparent: true,
      opacity: 0.84,
      depthWrite: false,
    }),
  };
}

function createHumanoid(kind) {
  const materials = kind === "user" ? userMaterials : botMaterials;
  const group = new THREE.Group();
  group.scale.setScalar(kind === "user" ? 0.86 : 0.8);

  const torso = new THREE.Mesh(geometries.torso, materials.jacket);
  torso.position.y = 1.17;
  torso.castShadow = true;
  group.add(torso);

  const shirtPanel = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.58, 0.035), materials.shirt);
  shirtPanel.position.set(0, 1.2, 0.245);
  shirtPanel.castShadow = true;
  group.add(shirtPanel);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.055), materials.pants);
  belt.position.set(0, 0.78, 0.18);
  belt.castShadow = true;
  group.add(belt);

  const lapelLeft = new THREE.Mesh(geometries.detailBox, materials.jacket);
  lapelLeft.position.set(-0.09, 1.31, 0.27);
  lapelLeft.rotation.z = -0.32;
  group.add(lapelLeft);

  const lapelRight = new THREE.Mesh(geometries.detailBox, materials.jacket);
  lapelRight.position.set(0.09, 1.31, 0.27);
  lapelRight.rotation.z = 0.32;
  group.add(lapelRight);

  for (let i = 0; i < 3; i += 1) {
    const button = new THREE.Mesh(geometries.button, materials.shoes);
    button.position.set(0, 1.34 - i * 0.16, 0.292);
    group.add(button);
  }

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.16, 20), materials.skin);
  neck.position.y = 1.65;
  neck.castShadow = true;
  group.add(neck);

  const head = new THREE.Mesh(geometries.head, materials.skin);
  head.position.y = 1.88;
  head.castShadow = true;
  group.add(head);

  const hair = new THREE.Mesh(geometries.hair, materials.hair);
  hair.position.set(0, 1.99, -0.015);
  hair.scale.set(1.04, 0.54, 1);
  hair.castShadow = true;
  group.add(hair);

  const nose = new THREE.Mesh(geometries.nose, materials.skin);
  nose.position.set(0, 1.88, 0.246);
  nose.rotation.x = Math.PI / 2;
  group.add(nose);

  const leftEye = new THREE.Mesh(geometries.eye, materials.eye);
  leftEye.position.set(-0.083, 1.93, 0.232);
  group.add(leftEye);

  const rightEye = new THREE.Mesh(geometries.eye, materials.eye);
  rightEye.position.set(0.083, 1.93, 0.232);
  group.add(rightEye);

  const eyebrowGeo = new THREE.BoxGeometry(0.09, 0.015, 0.018);
  const leftBrow = new THREE.Mesh(eyebrowGeo, materials.hair);
  leftBrow.position.set(-0.083, 1.99, 0.244);
  leftBrow.rotation.z = 0.12;
  group.add(leftBrow);

  const rightBrow = new THREE.Mesh(eyebrowGeo, materials.hair);
  rightBrow.position.set(0.083, 1.99, 0.244);
  rightBrow.rotation.z = -0.12;
  group.add(rightBrow);

  const rig = {};
  rig.leftArm = createArm(-0.34, materials);
  rig.rightArm = createArm(0.34, materials);
  rig.leftArm.rotation.z = 0.2;
  rig.rightArm.rotation.z = -0.2;
  group.add(rig.leftArm, rig.rightArm);

  rig.leftLeg = createLeg(-0.13, materials);
  rig.rightLeg = createLeg(0.13, materials);
  group.add(rig.leftLeg, rig.rightLeg);

  if (kind === "user") {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.025, 10, 58), materials.glow);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.035;
    ring.renderOrder = 4;
    group.add(ring);

    const shoulderLight = new THREE.PointLight(0x8fe8ff, 0.85, 4.2);
    shoulderLight.position.set(0, 1.75, 0.18);
    group.add(shoulderLight);
  }

  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return { group, rig };
}

function createArm(x, materials) {
  const arm = new THREE.Group();
  arm.position.set(x, 1.45, 0.02);
  const sleeve = new THREE.Mesh(geometries.limb, materials.jacket);
  sleeve.position.y = -0.24;
  sleeve.rotation.z = x < 0 ? -0.08 : 0.08;
  arm.add(sleeve);
  const hand = new THREE.Mesh(geometries.hand, materials.skin);
  hand.position.y = -0.57;
  arm.add(hand);
  return arm;
}

function createLeg(x, materials) {
  const leg = new THREE.Group();
  leg.position.set(x, 0.72, 0);
  const pant = new THREE.Mesh(geometries.limb, materials.pants);
  pant.position.y = -0.31;
  leg.add(pant);
  const shoe = new THREE.Mesh(geometries.shoe, materials.shoes);
  shoe.position.set(0, -0.64, 0.055);
  leg.add(shoe);
  return leg;
}

function createEntity(kind, index, position) {
  const { group, rig } = createHumanoid(kind);
  group.position.set(position.x, FLOOR_TOP_Y, position.z);
  scene.add(group);

  const entity = {
    kind,
    index,
    group,
    rig,
    alive: true,
    target: new THREE.Vector3(position.x, FLOOR_TOP_Y, position.z),
    walkTime: Math.random() * Math.PI * 2,
    speed: kind === "user" ? USER_SPEED : BOT_SPEED + Math.random() * 0.35,
    fallVelocity: 0,
    spin: new THREE.Vector3(
      (Math.random() - 0.5) * 2.2,
      (Math.random() - 0.5) * 2.2,
      (Math.random() - 0.5) * 2.2,
    ),
  };
  characters.push(entity);
  return entity;
}

function clearCharacters() {
  characters.splice(0).forEach((entity) => {
    scene.remove(entity.group);
  });
  user = null;
}

function createCharacters() {
  clearCharacters();
  user = createEntity("user", 0, randomSpotInSection(3, 0.8));
  for (let i = 0; i < BOT_COUNT; i += 1) {
    createEntity("bot", i + 1, randomSpotInSection(i % 4, 1.3));
  }
}

function randomSpotInSection(sectionId, radius = 1.9) {
  const def = sectionDefs[sectionId];
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.sqrt(Math.random()) * radius;
  const x = THREE.MathUtils.clamp(
    def.center[0] + Math.cos(angle) * distance,
    def.center[0] < 0 ? -FLOOR_LIMIT : SAFE_INSET,
    def.center[0] < 0 ? -SAFE_INSET : FLOOR_LIMIT,
  );
  const z = THREE.MathUtils.clamp(
    def.center[1] + Math.sin(angle) * distance,
    def.center[1] < 0 ? -FLOOR_LIMIT : SAFE_INSET,
    def.center[1] < 0 ? -SAFE_INSET : FLOOR_LIMIT,
  );
  return new THREE.Vector3(x, FLOOR_TOP_Y, z);
}

function getSectionFromPosition(x, z) {
  if (x < 0 && z < 0) return 0;
  if (x >= 0 && z < 0) return 1;
  if (x < 0 && z >= 0) return 2;
  return 3;
}

function assignBotDestinations() {
  const bots = characters.filter((entity) => entity.kind === "bot" && entity.alive);
  shuffle(bots);

  const assignments = [];
  if (bots.length >= 4) {
    const all = shuffle([0, 1, 2, 3]);
    assignments.push(...all);
    while (assignments.length < bots.length) {
      assignments.push(Math.floor(Math.random() * 4));
    }
    keepCornerAmountsUneven(assignments);
  } else {
    while (assignments.length < bots.length) {
      assignments.push(Math.floor(Math.random() * 4));
    }
  }

  bots.forEach((bot, i) => {
    bot.target.copy(randomSpotInSection(assignments[i], 2.35));
  });
}

function keepCornerAmountsUneven(assignments) {
  const counts = countAssignments(assignments);
  if (new Set(counts).size !== 1 || assignments.length < 5) return;

  const last = assignments.length - 1;
  assignments[last] = (assignments[last] + 1) % 4;
}

function countAssignments(assignments) {
  const counts = [0, 0, 0, 0];
  assignments.forEach((id) => {
    counts[id] += 1;
  });
  return counts;
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function startGame() {
  for (const id of timeouts) window.clearTimeout(id);
  timeouts.clear();
  clearMovementInput();

  game.started = true;
  game.ended = false;
  game.round = 0;
  game.phase = "ready";
  game.nextFallAt = 0;
  game.fallingSection = null;
  startScreen.classList.add("hidden");
  endScreen.classList.add("hidden");

  resetFloorSections();
  createCharacters();
  startRound();
  canvas.focus();
}

function resetFloorSections() {
  floorSections.forEach((section) => {
    section.group.position.y = section.baseY;
    section.group.rotation.set(0, 0, 0);
    section.state = "stable";
    section.fallStart = 0;
    section.restoreStart = 0;
  });
}

function startRound() {
  if (!game.started || game.ended) return;

  game.round += 1;
  game.phase = "running";
  game.fallingSection = null;
  game.nextFallAt = performance.now() + ROUND_MS;
  assignBotDestinations();
  showAnnouncement(`Round ${game.round}`);
}

function triggerFall(now) {
  if (game.phase !== "running" || game.ended) return;

  const sectionId = chooseFallingSection();
  const section = floorSections[sectionId];
  const def = sectionDefs[sectionId];
  game.phase = "falling";
  game.fallingSection = sectionId;

  section.state = "falling";
  section.fallStart = now;
  section.startY = section.group.position.y;
  section.startRotation.copy(section.group.rotation);
  section.spinX = (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.35);
  section.spinZ = (Math.random() > 0.5 ? 1 : -1) * (0.28 + Math.random() * 0.28);

  const eliminated = characters.filter(
    (entity) =>
      entity.alive &&
      getSectionFromPosition(entity.group.position.x, entity.group.position.z) === sectionId,
  );
  eliminated.forEach((entity) => eliminate(entity));

  const outText =
    eliminated.length === 1 ? "1 player out" : `${eliminated.length} players out`;
  showAnnouncement(`${def.name} corner fell. ${outText}.`);

  schedule(() => restoreSection(sectionId), FALL_MS + 300);
  if (eliminated.includes(user)) {
    schedule(() => finishGame(false), 650);
    return;
  }
  schedule(() => finishRoundOrContinue(), ROUND_RESET_MS);
}

function chooseFallingSection() {
  if (forceUserDrop && user?.alive) {
    return getSectionFromPosition(user.group.position.x, user.group.position.z);
  }

  const occupied = new Set();
  characters.forEach((entity) => {
    if (entity.alive) {
      occupied.add(getSectionFromPosition(entity.group.position.x, entity.group.position.z));
    }
  });
  const choices = occupied.size ? Array.from(occupied) : [0, 1, 2, 3];
  return choices[Math.floor(Math.random() * choices.length)];
}

function restoreSection(sectionId) {
  const section = floorSections[sectionId];
  section.state = "restoring";
  section.restoreStart = performance.now();
  section.startY = section.group.position.y;
  section.startRotation.copy(section.group.rotation);
}

function finishRoundOrContinue() {
  if (game.ended) return;
  if (!user?.alive) {
    finishGame(false);
    return;
  }
  if (aliveCount() <= 1) {
    finishGame(Boolean(user?.alive) && aliveCount() === 1);
    return;
  }
  startRound();
}

function finishGame(won) {
  const alive = aliveCount();
  game.ended = true;
  game.phase = "ended";
  game.nextFallAt = 0;
  clearMovementInput();
  endTitle.textContent = won ? "You Survived" : "Eliminated";
  if (won) {
    endCopy.textContent = `You were the last one standing after ${game.round} rounds.`;
  } else if (!user?.alive) {
    endCopy.textContent = `Your corner dropped in round ${game.round}.`;
  } else if (alive === 1) {
    endCopy.textContent = `One bot survived after ${game.round} rounds.`;
  } else {
    endCopy.textContent = `No one survived after ${game.round} rounds.`;
  }
  endScreen.classList.remove("hidden");
}

function eliminate(entity) {
  entity.alive = false;
  entity.fallVelocity = 0.8 + Math.random() * 0.75;
  entity.spin.set(
    (Math.random() - 0.5) * 2.4,
    (Math.random() - 0.5) * 2.4,
    (Math.random() - 0.5) * 2.4,
  );
}

function schedule(fn, delay) {
  const id = window.setTimeout(() => {
    timeouts.delete(id);
    fn();
  }, delay);
  timeouts.add(id);
}

function updateFloor(now) {
  floorSections.forEach((section) => {
    if (section.state === "falling") {
      const t = THREE.MathUtils.clamp((now - section.fallStart) / FALL_MS, 0, 1);
      const eased = easeInCubic(t);
      section.group.position.y = THREE.MathUtils.lerp(section.startY, -9.5, eased);
      section.group.rotation.x = section.startRotation.x + section.spinX * eased;
      section.group.rotation.z = section.startRotation.z + section.spinZ * eased;
      if (t >= 1) section.state = "down";
    }

    if (section.state === "restoring") {
      const t = THREE.MathUtils.clamp((now - section.restoreStart) / RESTORE_MS, 0, 1);
      const eased = easeOutBack(t);
      section.group.position.y = THREE.MathUtils.lerp(section.startY, section.baseY, eased);
      section.group.rotation.x = THREE.MathUtils.lerp(section.startRotation.x, 0, t);
      section.group.rotation.z = THREE.MathUtils.lerp(section.startRotation.z, 0, t);
      if (t >= 1) {
        section.group.position.y = section.baseY;
        section.group.rotation.set(0, 0, 0);
        section.state = "stable";
      }
    }
  });
}

function updateUser(dt) {
  if (!user || !user.alive || !game.started || game.ended) return;

  const { xAxis, zAxis } = getMovementInput(performance.now());

  tmpVec.set(xAxis, 0, zAxis);
  const moving = tmpVec.lengthSq() > 0;
  if (moving) {
    tmpVec.normalize();
    const nextX = THREE.MathUtils.clamp(
      user.group.position.x + tmpVec.x * USER_SPEED * dt,
      -FLOOR_LIMIT,
      FLOOR_LIMIT,
    );
    const nextZ = THREE.MathUtils.clamp(
      user.group.position.z + tmpVec.z * USER_SPEED * dt,
      -FLOOR_LIMIT,
      FLOOR_LIMIT,
    );
    const nextSection = getSectionFromPosition(nextX, nextZ);

    if (isSectionWalkable(nextSection)) {
      user.group.position.x = nextX;
      user.group.position.z = nextZ;
    }

    faceDirection(user, tmpVec.x, tmpVec.z, dt);
  }

  updateCharacterMotion(user, moving ? USER_SPEED : 0, dt);
}

function getMovementInput(now) {
  pruneStaleMovementInput(now);

  let xAxis = 0;
  let zAxis = 0;
  for (const key of activeMoveKeys.keys()) {
    switch (MOVEMENT_DIRECTIONS[key]) {
      case "left":
        xAxis -= 1;
        break;
      case "right":
        xAxis += 1;
        break;
      case "up":
        zAxis -= 1;
        break;
      case "down":
        zAxis += 1;
        break;
    }
  }

  return { xAxis, zAxis };
}

function setMovementKey(code, now) {
  const direction = MOVEMENT_DIRECTIONS[code];
  if (!direction) return;

  clearMovementDirection(OPPOSITE_MOVEMENT_DIRECTIONS[direction]);
  activeMoveKeys.set(code, now);
  activeMoveKey = code;
}

function releaseMovementKey(code) {
  activeMoveKeys.delete(code);
  if (activeMoveKey === code) {
    activeMoveKey = getLatestMoveKey();
  }
}

function clearMovementDirection(direction) {
  for (const key of activeMoveKeys.keys()) {
    if (MOVEMENT_DIRECTIONS[key] === direction) {
      activeMoveKeys.delete(key);
    }
  }
  if (activeMoveKey && MOVEMENT_DIRECTIONS[activeMoveKey] === direction) {
    activeMoveKey = getLatestMoveKey();
  }
}

function pruneStaleMovementInput(now) {
  let pruned = false;
  for (const [key, lastSeenAt] of activeMoveKeys) {
    if (now - lastSeenAt > KEY_STALE_MS) {
      activeMoveKeys.delete(key);
      pruned = true;
    }
  }
  if (pruned && activeMoveKey && !activeMoveKeys.has(activeMoveKey)) {
    activeMoveKey = getLatestMoveKey();
  }
}

function getLatestMoveKey() {
  let latestKey = null;
  let latestSeenAt = -Infinity;
  for (const [key, lastSeenAt] of activeMoveKeys) {
    if (lastSeenAt > latestSeenAt) {
      latestKey = key;
      latestSeenAt = lastSeenAt;
    }
  }
  return latestKey;
}

function clearMovementInput() {
  activeMoveKeys.clear();
  activeMoveKey = null;
}

function normalizeMoveCode(event) {
  if (MOVEMENT_KEYS.has(event.code)) return event.code;
  return KEY_ALIASES[event.key] || null;
}

function isSectionWalkable(sectionId) {
  const section = floorSections[sectionId];
  return section.state === "stable" || (section.state === "restoring" && section.group.position.y > -0.08);
}

function updateBots(dt) {
  if (!game.started || game.ended) return;

  characters.forEach((bot) => {
    if (bot.kind !== "bot" || !bot.alive) return;

    let speed = 0;
    if (game.phase === "running" && bot.target) {
      const dx = bot.target.x - bot.group.position.x;
      const dz = bot.target.z - bot.group.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance > 0.05) {
        const step = Math.min(distance, bot.speed * dt);
        bot.group.position.x += (dx / distance) * step;
        bot.group.position.z += (dz / distance) * step;
        faceDirection(bot, dx / distance, dz / distance, dt);
        speed = bot.speed;
      }
    }

    updateCharacterMotion(bot, speed, dt);
  });
}

function updateEliminated(dt) {
  characters.forEach((entity) => {
    if (entity.alive) return;
    entity.fallVelocity -= 8.7 * dt;
    entity.group.position.y += entity.fallVelocity * dt;
    entity.group.rotation.x += entity.spin.x * dt;
    entity.group.rotation.y += entity.spin.y * dt;
    entity.group.rotation.z += entity.spin.z * dt;
    if (entity.group.position.y < -10) entity.group.visible = false;
  });
}

function updateCharacterMotion(entity, speed, dt) {
  const currentSection = getSectionFromPosition(entity.group.position.x, entity.group.position.z);
  const floorY = floorSections[currentSection].group.position.y + FLOOR_TOP_Y;
  const moving = speed > 0.02 && entity.alive;

  if (moving) {
    entity.walkTime += dt * speed * 4.1;
  } else {
    entity.walkTime += dt * 1.5;
  }

  const stride = Math.sin(entity.walkTime);
  const bob = moving ? Math.abs(stride) * 0.055 : Math.sin(entity.walkTime * 0.5) * 0.009;
  entity.group.position.y = floorY + bob;

  const swing = moving ? stride * 0.58 : Math.sin(entity.walkTime * 0.5) * 0.045;
  entity.rig.leftArm.rotation.x = swing;
  entity.rig.rightArm.rotation.x = -swing;
  entity.rig.leftLeg.rotation.x = -swing * 0.78;
  entity.rig.rightLeg.rotation.x = swing * 0.78;
}

function faceDirection(entity, x, z, dt) {
  const target = Math.atan2(x, z);
  let diff = target - entity.group.rotation.y;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  entity.group.rotation.y += diff * Math.min(1, dt * 12);
}

function updateCamera(dt) {
  const mobile = window.innerWidth < 700;
  if (user?.alive) {
    centerTarget.set(user.group.position.x * 0.16, 0, user.group.position.z * 0.16);
  } else {
    centerTarget.set(0, 0, 0);
  }

  desiredCameraPosition.set(
    centerTarget.x,
    mobile ? 16.2 : 13.2,
    centerTarget.z + (mobile ? 18.5 : 15.5),
  );
  camera.position.lerp(desiredCameraPosition, 1 - Math.pow(0.006, dt));
  lookTarget.lerp(new THREE.Vector3(centerTarget.x, 0.15, centerTarget.z), 1 - Math.pow(0.002, dt));
  camera.lookAt(lookTarget);
}

function updateHud(now) {
  const alive = aliveCount();
  leftCountEl.textContent = String(alive);
  roundLabelEl.textContent = game.started ? `Round ${Math.max(game.round, 1)}` : "Round 1";

  if (game.phase === "running") {
    const seconds = Math.max(0, (game.nextFallAt - now) / 1000);
    timerLabelEl.textContent = `${seconds.toFixed(1)}s`;
  } else if (game.phase === "falling") {
    timerLabelEl.textContent = "FALLING";
  } else if (game.phase === "ended") {
    timerLabelEl.textContent = "DONE";
  } else {
    timerLabelEl.textContent = "7.0s";
  }

  const counts = [0, 0, 0, 0];
  characters.forEach((entity) => {
    if (!entity.alive) return;
    counts[getSectionFromPosition(entity.group.position.x, entity.group.position.z)] += 1;
  });

  if (!cornerCountsEl.children.length) {
    sectionDefs.forEach((def) => {
      const pill = document.createElement("div");
      pill.className = "corner-pill";
      pill.style.setProperty("--corner-color", `#${def.color.toString(16).padStart(6, "0")}`);
      cornerCountsEl.append(pill);
    });
  }
  Array.from(cornerCountsEl.children).forEach((child, i) => {
    child.textContent = `${sectionDefs[i].number}: ${counts[i]}`;
  });

  document.body.dataset.phase = game.phase;
  document.body.dataset.round = String(game.round);
  document.body.dataset.alive = String(alive);
  document.body.dataset.cornerCounts = counts.join(",");
  document.body.dataset.activeMoveKey = activeMoveKey || "";
  if (user) {
    document.body.dataset.userX = user.group.position.x.toFixed(3);
    document.body.dataset.userZ = user.group.position.z.toFixed(3);
  } else {
    delete document.body.dataset.userX;
    delete document.body.dataset.userZ;
  }
  document.body.dataset.floorStates = floorSections
    .map((section) => `${section.id}:${section.state}:${section.group.position.y.toFixed(2)}`)
    .join(",");
}

function aliveCount() {
  return characters.reduce((total, entity) => total + (entity.alive ? 1 : 0), 0);
}

function showAnnouncement(message) {
  announcementEl.textContent = message;
  announcementEl.classList.add("visible");
  if (announcementTimer) window.clearTimeout(announcementTimer);
  announcementTimer = window.setTimeout(() => {
    announcementEl.classList.remove("visible");
  }, 1800);
}

function easeInCubic(t) {
  return t * t * t;
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.033);
  const now = performance.now();

  if (game.started && game.phase === "running" && now >= game.nextFallAt) {
    triggerFall(now);
  }

  updateFloor(now);
  updateUser(dt);
  updateBots(dt);
  updateEliminated(dt);
  updateCamera(dt);
  updateHud(now);
  renderer.render(scene, camera);
  updateRenderStats();
  requestAnimationFrame(animate);
}

function updateRenderStats() {
  frameCount += 1;
  if (frameCount % 30 !== 0) return;

  const gl = renderer.getContext();
  const width = renderer.domElement.width;
  const height = renderer.domElement.height;
  if (!gl || width < 1 || height < 1) return;

  const coords = [
    [Math.floor(width * 0.5), Math.floor(height * 0.5)],
    [Math.floor(width * 0.38), Math.floor(height * 0.57)],
    [Math.floor(width * 0.62), Math.floor(height * 0.57)],
    [Math.floor(width * 0.5), Math.floor(height * 0.73)],
    [Math.floor(width * 0.22), Math.floor(height * 0.46)],
    [Math.floor(width * 0.78), Math.floor(height * 0.46)],
  ];
  const pixel = new Uint8Array(4);
  const samples = coords.map(([x, y]) => {
    gl.readPixels(x, height - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    return `${pixel[0]},${pixel[1]},${pixel[2]},${pixel[3]}`;
  });
  const energy = samples.reduce((total, sample) => {
    const [r, g, b] = sample.split(",").map(Number);
    return total + r + g + b;
  }, 0);

  canvas.dataset.pixelUnique = String(new Set(samples).size);
  canvas.dataset.pixelEnergy = String(energy);
  canvas.dataset.pixelSamples = samples.join("|");

  if (captureEnabled && !capturedFrame && game.started && frameCount > 30) {
    const captureCanvas = document.createElement("canvas");
    captureCanvas.width = 720;
    captureCanvas.height = 405;
    const ctx = captureCanvas.getContext("2d");
    ctx.drawImage(renderer.domElement, 0, 0, captureCanvas.width, captureCanvas.height);
    document.body.dataset.canvasCapture = captureCanvas.toDataURL("image/png");
    capturedFrame = true;
  }
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  const moveCode = normalizeMoveCode(event);
  if (moveCode) {
    event.preventDefault();
    setMovementKey(moveCode, performance.now());
  }
});
window.addEventListener("keyup", (event) => {
  const moveCode = normalizeMoveCode(event);
  if (!moveCode) return;
  event.preventDefault();
  releaseMovementKey(moveCode);
});
window.addEventListener("blur", clearMovementInput);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) clearMovementInput();
});
canvas.addEventListener("pointerdown", () => {
  canvas.focus();
});

playButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);

window.__fourCorners = {
  getState: () => ({
    started: game.started,
    ended: game.ended,
    phase: game.phase,
    round: game.round,
    alive: aliveCount(),
    botsAlive: characters.filter((entity) => entity.kind === "bot" && entity.alive).length,
    userAlive: Boolean(user?.alive),
    userPosition: user
      ? {
          x: Number(user.group.position.x.toFixed(3)),
          z: Number(user.group.position.z.toFixed(3)),
        }
      : null,
    userSection: user
      ? getSectionFromPosition(user.group.position.x, user.group.position.z)
      : null,
    activeMoveKey,
    fallingSection: game.fallingSection,
    floorStates: floorSections.map((section) => ({
      id: section.id,
      state: section.state,
      y: Number(section.group.position.y.toFixed(3)),
    })),
  }),
};

botMaterials = makeMaterialSet("bot");
userMaterials = makeMaterialSet("user");
buildWorld();
resize();
updateHud(performance.now());
animate();

if (queryParams.has("autostart")) {
  startGame();
}
