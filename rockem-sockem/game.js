import * as THREE from "../four-corners/vendor/three.module.js";

const canvas = document.getElementById("sceneCanvas");
const fatal = document.getElementById("fatal");
const ui = {
  overlay: document.getElementById("startOverlay"),
  overlayCopy: document.getElementById("overlayCopy"),
  startButton: document.getElementById("startButton"),
  difficultyButtons: [...document.querySelectorAll("[data-difficulty]")],
  announcer: document.getElementById("announcer"),
  timerText: document.getElementById("timerText"),
  roundLabel: document.getElementById("roundLabel"),
  blueHealthText: document.getElementById("blueHealthText"),
  redHealthText: document.getElementById("redHealthText"),
  blueHealthBar: document.getElementById("blueHealthBar"),
  redHealthBar: document.getElementById("redHealthBar"),
  bluePowerBar: document.getElementById("bluePowerBar"),
  redPowerBar: document.getElementById("redPowerBar"),
  comboText: document.getElementById("comboText"),
  pressureText: document.getElementById("pressureText"),
  blueLiftText: document.getElementById("blueLiftText"),
  redLiftText: document.getElementById("redLiftText"),
};

const PUNCHES = {
  punch: {
    label: "punch",
    arm: "rightArm",
    damage: 13,
    stamina: 14,
    range: 1.42,
    duration: 0.54,
    contact: 0.24,
    extension: 0.56,
    recoil: 0.12,
  },
  push: {
    label: "push",
    arm: "leftArm",
    damage: 3,
    stamina: 18,
    range: 1.18,
    duration: 0.56,
    contact: 0.24,
    extension: 0.5,
    recoil: 0.42,
    push: true,
  },
};

const DIFFICULTY = {
  rookie: {
    label: "Rookie",
    aiDamage: 0.82,
    aiSpeed: 0.82,
    aiReaction: 0.72,
    aggression: 0.42,
    guard: 0.28,
    dodge: 0.1,
  },
  contender: {
    label: "Contender",
    aiDamage: 1,
    aiSpeed: 1,
    aiReaction: 0.48,
    aggression: 0.62,
    guard: 0.44,
    dodge: 0.18,
  },
  champ: {
    label: "Champ",
    aiDamage: 1.18,
    aiSpeed: 1.12,
    aiReaction: 0.32,
    aggression: 0.78,
    guard: 0.58,
    dodge: 0.28,
  },
};

const tmpVector = new THREE.Vector3();
const tmpColor = new THREE.Color();
const clock = new THREE.Clock();
const keys = new Set();
const heldControls = {
  advance: false,
  retreat: false,
  guard: false,
};
const DUCK_DURATION = 0.42;

let scene;
let camera;
let renderer;
let player;
let opponent;
let audioCtx = null;

const game = {
  mode: "intro",
  difficulty: "rookie",
  round: 1,
  timer: 90,
  elapsed: 0,
  finishDelay: 0,
  shake: 0,
  combo: 0,
  pressure: 0,
  messageCooldown: 0,
  winner: "",
};

const sparks = [];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(current, target, amount) {
  return current + (target - current) * amount;
}

function easeOutCubic(t) {
  const n = clamp(t, 0, 1);
  return 1 - Math.pow(1 - n, 3);
}

function easeInOut(t) {
  const n = clamp(t, 0, 1);
  return n < 0.5 ? 2 * n * n : 1 - Math.pow(-2 * n + 2, 2) / 2;
}

function material(color, options = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: options.metalness ?? 0.78,
    roughness: options.roughness ?? 0.3,
    clearcoat: options.clearcoat ?? 0.45,
    clearcoatRoughness: options.clearcoatRoughness ?? 0.28,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
  });
}

const mats = {
  black: material(0x151b23, { metalness: 0.5, roughness: 0.48 }),
  rubber: material(0x202832, { metalness: 0.12, roughness: 0.68, clearcoat: 0.1 }),
  chrome: material(0xdde5ee, { metalness: 0.96, roughness: 0.16, clearcoat: 0.9 }),
  darkChrome: material(0x788594, { metalness: 0.86, roughness: 0.23 }),
  brass: material(0xf0c565, { metalness: 0.84, roughness: 0.22, clearcoat: 0.7 }),
  matBlue: material(0x24466c, { metalness: 0.38, roughness: 0.42 }),
  matRed: material(0x6b2725, { metalness: 0.38, roughness: 0.42 }),
  ropeBlue: material(0x5db6ff, { metalness: 0.35, roughness: 0.35, emissive: 0x0b3d6e, emissiveIntensity: 0.15 }),
  ropeRed: material(0xff5c55, { metalness: 0.35, roughness: 0.35, emissive: 0x5c0e0d, emissiveIntensity: 0.15 }),
  canvas: material(0x495664, { metalness: 0.1, roughness: 0.76, clearcoat: 0 }),
  board: material(0x2d3540, { metalness: 0.28, roughness: 0.44 }),
};

function makeBox(width, height, depth, mat, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeSphere(radius, mat, x = 0, y = 0, z = 0, widthSegments = 32, heightSegments = 18) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, widthSegments, heightSegments), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeCylinder(radius, height, mat, axis = "y", x = 0, y = 0, z = 0, radialSegments = 28) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, radialSegments), mat);
  mesh.position.set(x, y, z);
  if (axis === "x") {
    mesh.rotation.z = Math.PI / 2;
  }
  if (axis === "z") {
    mesh.rotation.x = Math.PI / 2;
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeRobot({ name, color, accent, eye, x, faceRotation }) {
  const primary = material(color, { metalness: 0.82, roughness: 0.24, clearcoat: 0.78 });
  const secondary = material(accent, { metalness: 0.8, roughness: 0.28, clearcoat: 0.62 });
  const eyeMat = material(eye, { metalness: 0.15, roughness: 0.2, emissive: eye, emissiveIntensity: 1.2 });

  const root = new THREE.Group();
  root.position.set(x, 0, 0);
  root.rotation.y = faceRotation;
  scene.add(root);

  const rig = new THREE.Group();
  root.add(rig);

  const shadowBase = makeCylinder(0.54, 0.09, mats.rubber, "y", -0.02, 0.05, 0, 42);
  shadowBase.scale.z = 0.82;
  rig.add(shadowBase);

  rig.add(makeBox(0.62, 0.18, 0.28, mats.darkChrome, 0.08, 0.18, -0.24));
  rig.add(makeBox(0.62, 0.18, 0.28, mats.darkChrome, 0.08, 0.18, 0.24));
  rig.add(makeBox(0.2, 0.58, 0.2, mats.chrome, -0.05, 0.58, -0.22));
  rig.add(makeBox(0.2, 0.58, 0.2, mats.chrome, -0.05, 0.58, 0.22));
  rig.add(makeCylinder(0.2, 0.58, secondary, "z", -0.04, 0.94, 0, 32));

  const torso = makeBox(0.54, 0.86, 0.78, primary, 0, 1.42, 0);
  rig.add(torso);
  const belly = makeBox(0.06, 0.46, 0.56, secondary, 0.29, 1.42, 0);
  rig.add(belly);
  rig.add(makeCylinder(0.09, 0.95, mats.chrome, "z", 0.02, 1.81, 0, 28));
  rig.add(makeCylinder(0.12, 0.2, mats.chrome, "y", 0.02, 1.96, 0, 28));

  const springGroup = new THREE.Group();
  springGroup.position.set(0.02, 1.94, 0);
  springGroup.visible = false;
  rig.add(springGroup);
  for (let i = 0; i < 6; i += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.016, 12, 36), mats.chrome);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = i * 0.06;
    ring.castShadow = true;
    springGroup.add(ring);
  }

  const headGroup = new THREE.Group();
  headGroup.position.set(0.08, 2.23, 0);
  rig.add(headGroup);

  const head = makeBox(0.5, 0.43, 0.62, primary);
  headGroup.add(head);
  headGroup.add(makeBox(0.05, 0.28, 0.48, mats.darkChrome, 0.275, 0.02, 0));
  headGroup.add(makeBox(0.035, 0.08, 0.12, eyeMat, 0.31, 0.08, -0.14));
  headGroup.add(makeBox(0.035, 0.08, 0.12, eyeMat, 0.31, 0.08, 0.14));
  headGroup.add(makeBox(0.035, 0.035, 0.34, mats.brass, 0.312, -0.12, 0));
  headGroup.add(makeCylinder(0.04, 0.34, mats.chrome, "z", -0.02, 0.26, 0, 18));

  const leftArm = makeArm(-1, primary, secondary);
  const rightArm = makeArm(1, primary, secondary);
  rig.add(leftArm.group);
  rig.add(rightArm.group);

  const fighter = {
    name,
    root,
    rig,
    primaryColor: color,
    eyeMat,
    faceRotation,
    x,
    startX: x,
    health: 100,
    stamina: 100,
    headLift: 0,
    recoil: 0,
    recoilYaw: 0,
    hitFlash: 0,
    punch: null,
    dodgeTimer: 0,
    dodgeCooldown: 0,
    guardWindow: 0,
    guarding: false,
    intent: 0,
    knocked: false,
    ai: false,
    thinkTimer: 0,
    parts: {
      torso,
      headGroup,
      springGroup,
      leftArm,
      rightArm,
    },
  };

  return fighter;
}

function makeArm(zSign, primary, secondary) {
  const group = new THREE.Group();
  group.position.set(0.16, 1.74, zSign * 0.51);
  group.rotation.y = zSign * 0.12;

  const upper = makeBox(0.42, 0.19, 0.2, primary, 0.18, 0, 0);
  const elbow = makeSphere(0.13, mats.chrome, 0.4, 0, 0, 24, 14);
  const fore = new THREE.Group();
  fore.position.set(0.39, 0, 0);
  fore.add(makeBox(0.42, 0.2, 0.22, secondary, 0.19, 0, 0));
  const fist = makeSphere(0.19, primary, 0.45, 0, 0, 32, 18);
  fist.scale.set(1.18, 0.95, 1.02);
  fore.add(fist);
  group.add(upper, elbow, fore);

  return {
    group,
    fore,
    fist,
    zSign,
    base: {
      x: group.position.x,
      y: group.position.y,
      z: group.position.z,
      ry: group.rotation.y,
    },
  };
}

function makeArena() {
  const floor = makeBox(9.5, 0.22, 6.7, mats.board, 0, -0.16, 0);
  floor.receiveShadow = true;
  scene.add(floor);

  const mat = makeBox(5.8, 0.08, 3.75, mats.canvas, 0, 0.0, 0);
  mat.receiveShadow = true;
  scene.add(mat);

  const centerLine = makeBox(0.035, 0.012, 3.2, mats.brass, 0, 0.055, 0);
  centerLine.receiveShadow = true;
  scene.add(centerLine);
  scene.add(makeBox(2.35, 0.014, 0.035, mats.matBlue, -1.5, 0.062, 0));
  scene.add(makeBox(2.35, 0.014, 0.035, mats.matRed, 1.5, 0.062, 0));

  const ropeHeights = [0.52, 0.76, 1.0];
  ropeHeights.forEach((height, index) => {
    const matA = index === 1 ? mats.brass : mats.ropeBlue;
    const matB = index === 1 ? mats.brass : mats.ropeRed;
    scene.add(makeCylinder(0.035, 5.9, matA, "x", 0, height, -1.93, 32));
    scene.add(makeCylinder(0.035, 5.9, matB, "x", 0, height, 1.93, 32));
    scene.add(makeCylinder(0.035, 3.8, matA, "z", -2.95, height, 0, 32));
    scene.add(makeCylinder(0.035, 3.8, matB, "z", 2.95, height, 0, 32));
  });

  [-2.95, 2.95].forEach((x) => {
    [-1.93, 1.93].forEach((z) => {
      const post = makeCylinder(0.09, 1.34, mats.chrome, "y", x, 0.6, z, 32);
      scene.add(post);
      scene.add(makeSphere(0.13, mats.brass, x, 1.29, z, 24, 14));
    });
  });

  for (let i = 0; i < 42; i += 1) {
    const row = i % 2;
    const x = -4.3 + (i % 21) * 0.43;
    const z = i < 21 ? -3.05 - row * 0.18 : 3.05 + row * 0.18;
    const y = 0.25 + row * 0.14;
    const hue = i % 3 === 0 ? 0x4da3ff : i % 3 === 1 ? 0xffc857 : 0xff4b45;
    const crowdMat = material(hue, {
      metalness: 0.12,
      roughness: 0.76,
      emissive: hue,
      emissiveIntensity: 0.08,
      clearcoat: 0.05,
    });
    const body = makeBox(0.2, 0.35 + row * 0.06, 0.18, crowdMat, x, y, z);
    body.rotation.y = z > 0 ? Math.PI : 0;
    scene.add(body);
  }

  const led = material(0xfff2b8, {
    metalness: 0.2,
    roughness: 0.4,
    emissive: 0xffc857,
    emissiveIntensity: 0.55,
  });
  scene.add(makeBox(4.6, 0.06, 0.08, led, 0, 2.2, -2.55));
  scene.add(makeBox(4.6, 0.06, 0.08, led, 0, 2.2, 2.55));
}

function addLights() {
  scene.background = new THREE.Color(0x202a36);
  scene.fog = new THREE.Fog(0x263241, 9, 19);

  const ambient = new THREE.HemisphereLight(0xf2f7ff, 0x4a3824, 2.35);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 3.7);
  key.position.set(-3.2, 5.2, 3.8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 14;
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -5;
  scene.add(key);

  const blue = new THREE.PointLight(0x6ab6ff, 4.1, 8);
  blue.position.set(-2.8, 2.5, -2.2);
  scene.add(blue);

  const red = new THREE.PointLight(0xff766f, 4, 8);
  red.position.set(2.8, 2.4, 2.1);
  scene.add(red);

  const amber = new THREE.SpotLight(0xffe2a4, 3, 8, Math.PI / 5, 0.35, 1.1);
  amber.position.set(0, 4.8, 0.4);
  amber.target.position.set(0, 0.6, 0);
  scene.add(amber, amber.target);
}

function init() {
  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  camera = new THREE.PerspectiveCamera(43, 1, 0.1, 60);
  camera.position.set(0, 2.55, 5.9);
  camera.lookAt(0, 1.1, 0);

  addLights();
  makeArena();

  player = makeRobot({
    name: "Blue Bruiser",
    color: 0x2f7de1,
    accent: 0xa7d8ff,
    eye: 0x81dcff,
    x: -1.28,
    faceRotation: 0,
  });

  opponent = makeRobot({
    name: "Red Ripper",
    color: 0xd53a35,
    accent: 0xffb2a7,
    eye: 0xfff0b8,
    x: 1.28,
    faceRotation: Math.PI,
  });
  opponent.ai = true;

  bindEvents();
  resize();
  window.ROBOT_GAME_SAMPLE = sampleCanvasPixels;
  updateUi();
}

function sampleCanvasPixels() {
  const probe = document.getElementById("pixelProbe");
  if (!canvas || !probe) {
    return { nonDark: 0, sampleAverage: 0 };
  }

  const ctx = probe.getContext("2d", { willReadFrequently: true });
  ctx.clearRect(0, 0, probe.width, probe.height);
  ctx.drawImage(canvas, 0, 0, probe.width, probe.height);
  const data = ctx.getImageData(0, 0, probe.width, probe.height).data;
  let nonDark = 0;
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    const brightness = data[i] + data[i + 1] + data[i + 2];
    total += brightness;
    if (brightness > 45) {
      nonDark += 1;
    }
  }

  return {
    nonDark,
    sampleAverage: Math.round(total / (data.length / 4)),
  };
}

function bindEvents() {
  window.addEventListener("resize", resize);
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", (event) => {
    keys.delete(event.code);
  });

  ui.startButton.addEventListener("click", () => {
    ensureAudio();
    startFight();
  });

  ui.difficultyButtons.forEach((button) => {
    button.addEventListener("click", () => {
      game.difficulty = button.dataset.difficulty || "rookie";
      ui.difficultyButtons.forEach((candidate) => {
        candidate.classList.toggle("is-active", candidate === button);
      });
    });
  });

  document.querySelectorAll("[data-control]").forEach((button) => {
    const control = button.dataset.control;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      button.classList.add("is-held");
      ensureAudio();
      handleControlDown(control);
    });
    const release = (event) => {
      event.preventDefault();
      button.classList.remove("is-held");
      handleControlUp(control);
    };
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", () => {
      button.classList.remove("is-held");
      handleControlUp(control);
    });
  });
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(1, height);
  camera.updateProjectionMatrix();
}

function handleKeyDown(event) {
  if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.code)) {
    event.preventDefault();
  }

  if (event.code === "Space" && game.mode !== "fighting") {
    ensureAudio();
    startFight();
    return;
  }

  if (!event.repeat) {
    if (event.code === "KeyJ") startPunch(player, "punch");
    if (event.code === "KeyK") startPunch(player, "push");
    if (event.code === "KeyS" || event.code === "ArrowDown") dodge(player);
  }

  keys.add(event.code);
}

function handleControlDown(control) {
  if (control === "advance" || control === "retreat" || control === "guard") {
    heldControls[control] = true;
    return;
  }
  if (control === "duck") {
    dodge(player);
    return;
  }
  if (control === "punch" || control === "push") {
    startPunch(player, control);
  }
}

function handleControlUp(control) {
  if (control === "advance" || control === "retreat" || control === "guard") {
    heldControls[control] = false;
  }
}

function resetFighter(fighter, x) {
  fighter.x = x;
  fighter.root.position.set(x, 0, 0);
  fighter.root.rotation.set(0, fighter.faceRotation, 0);
  fighter.health = 100;
  fighter.stamina = 100;
  fighter.headLift = 0;
  fighter.recoil = 0;
  fighter.recoilYaw = 0;
  fighter.hitFlash = 0;
  fighter.punch = null;
  fighter.dodgeTimer = 0;
  fighter.dodgeCooldown = 0;
  fighter.guardWindow = 0;
  fighter.guarding = false;
  fighter.intent = 0;
  fighter.knocked = false;
  fighter.thinkTimer = 0;
  fighter.parts.springGroup.visible = false;
  fighter.rig.scale.set(1, 1, 1);
  fighter.parts.headGroup.position.y = 2.23;
  fighter.parts.headGroup.rotation.set(0, 0, 0);
  fighter.eyeMat.emissiveIntensity = 1.2;
}

function startFight() {
  game.mode = "fighting";
  game.timer = 90;
  game.elapsed = 0;
  game.finishDelay = 0;
  game.shake = 0;
  game.combo = 0;
  game.pressure = 0;
  game.winner = "";
  resetFighter(player, -1.28);
  resetFighter(opponent, 1.28);
  ui.overlay.classList.remove("is-visible");
  ui.startButton.textContent = "Start Fight";
  setMessage(`${DIFFICULTY[game.difficulty].label} match. Fight!`, true);
  playBell();
  updateUi();
}

function endFight(winner, loser, decision = "head pop") {
  if (game.mode !== "fighting") return;
  game.mode = "finished";
  game.winner = winner.name;
  game.finishDelay = 1.15;
  winner.guardWindow = 0;
  loser.knocked = true;
  loser.punch = null;
  loser.dodgeTimer = 0;
  game.shake = Math.max(game.shake, 0.44);
  setMessage(`${winner.name} wins by ${decision}.`, true);
  spawnImpact(loser.parts.headGroup.getWorldPosition(tmpVector), winner.primaryColor, 34, 1.6);
  playKnockout();
}

function endByDecision() {
  const winner = player.health >= opponent.health ? player : opponent;
  const loser = winner === player ? opponent : player;
  endFight(winner, loser, "decision");
}

function setMessage(text, force = false) {
  if (!force && game.messageCooldown > 0) return;
  ui.announcer.textContent = text;
  game.messageCooldown = 0.45;
}

function startPunch(fighter, type) {
  if (game.mode !== "fighting") return false;
  const spec = PUNCHES[type];
  if (!spec || fighter.punch || fighter.knocked || fighter.dodgeTimer > 0.04) return false;
  if (fighter.stamina < spec.stamina) {
    setMessage(`${fighter.name} needs power.`);
    return false;
  }

  fighter.punch = {
    type,
    elapsed: 0,
    hitDone: false,
  };
  fighter.stamina = clamp(fighter.stamina - spec.stamina, 0, 100);
  fighter.guarding = false;
  fighter.guardWindow = 0;
  playSwing(type);
  return true;
}

function dodge(fighter) {
  if (game.mode !== "fighting") return;
  if (fighter.dodgeCooldown > 0 || fighter.punch || fighter.stamina < 12) return;
  fighter.dodgeTimer = DUCK_DURATION;
  fighter.dodgeCooldown = 0.95;
  fighter.stamina = clamp(fighter.stamina - 12, 0, 100);
  setMessage(`${fighter.name} ducks.`);
  playSlip();
}

function updateFight(dt) {
  game.timer = Math.max(0, game.timer - dt);
  game.messageCooldown = Math.max(0, game.messageCooldown - dt);
  if (game.timer <= 0) {
    endByDecision();
  }

  updatePlayerIntent();
  updateAi(dt);
  updateFighter(player, opponent, dt);
  updateFighter(opponent, player, dt);
  separateFighters();

  game.combo = game.combo > 0 && game.elapsed - (player.lastHitAt || 0) < 2.4 ? game.combo : 0;
  game.pressure = lerp(game.pressure, opponent.punch || opponent.guarding ? 100 : Math.max(0, 100 - opponent.stamina), dt * 2.8);
}

function updatePlayerIntent() {
  const advance = heldControls.advance || keys.has("KeyD") || keys.has("ArrowRight");
  const retreat = heldControls.retreat || keys.has("KeyA") || keys.has("ArrowLeft");
  player.intent = (advance ? 1 : 0) - (retreat ? 1 : 0);
  player.guarding = (heldControls.guard || keys.has("KeyW") || keys.has("ArrowUp")) && !player.punch && player.dodgeTimer <= 0;
}

function updateAi(dt) {
  const cfg = DIFFICULTY[game.difficulty];
  const distance = opponent.x - player.x;
  const playerThreat = player.punch && player.punch.elapsed < PUNCHES[player.punch.type].contact + 0.08;

  opponent.thinkTimer -= dt;
  opponent.guardWindow = Math.max(0, opponent.guardWindow - dt);
  opponent.guarding = opponent.guardWindow > 0 && !opponent.punch && opponent.dodgeTimer <= 0;

  if (opponent.punch || opponent.dodgeTimer > 0.04) {
    opponent.intent = 0;
  } else if (distance > 1.42) {
    opponent.intent = -1;
  } else if (distance < 0.94) {
    opponent.intent = 1;
  } else {
    opponent.intent = Math.sin(game.elapsed * 2.1) * 0.24;
  }

  if (opponent.thinkTimer > 0) return;
  opponent.thinkTimer = cfg.aiReaction + Math.random() * 0.18;

  if (playerThreat && Math.random() < cfg.guard) {
    opponent.guardWindow = 0.32 + Math.random() * 0.28;
    return;
  }

  if (playerThreat && Math.random() < cfg.dodge) {
    dodge(opponent);
    return;
  }

  if (opponent.stamina < 24 && Math.random() < 0.55) {
    opponent.guardWindow = 0.45;
    opponent.intent = 1;
    return;
  }

  if (distance < 1.55 && opponent.stamina > 18 && Math.random() < cfg.aggression) {
    const roll = Math.random();
    if (distance < 1.05 && roll < 0.36) {
      startPunch(opponent, "push");
    } else {
      startPunch(opponent, "punch");
    }
  }
}

function updateFighter(fighter, defender, dt) {
  const cfg = fighter.ai ? DIFFICULTY[game.difficulty] : null;
  const speed = 1.55 * (fighter.ai ? cfg.aiSpeed : 1);
  const movePenalty = (fighter.guarding ? 0.45 : 1) * (fighter.punch ? 0.36 : 1);
  fighter.x += fighter.intent * speed * movePenalty * dt;
  fighter.x = clamp(fighter.x, fighter === player ? -2.28 : 0.22, fighter === player ? -0.22 : 2.28);

  if (fighter.punch) {
    updatePunch(fighter, defender, dt);
  }

  fighter.stamina = clamp(fighter.stamina + (fighter.guarding ? 11 : 19) * dt, 0, 100);
  fighter.recoil = Math.max(0, fighter.recoil - dt * 3.3);
  fighter.recoilYaw = lerp(fighter.recoilYaw, 0, dt * 8);
  fighter.hitFlash = Math.max(0, fighter.hitFlash - dt);
  fighter.dodgeTimer = Math.max(0, fighter.dodgeTimer - dt);
  fighter.dodgeCooldown = Math.max(0, fighter.dodgeCooldown - dt);
}

function updatePunch(fighter, defender, dt) {
  const punch = fighter.punch;
  const spec = PUNCHES[punch.type];
  const speed = fighter.ai ? DIFFICULTY[game.difficulty].aiSpeed : 1;
  punch.elapsed += dt * speed;

  if (!punch.hitDone && punch.elapsed >= spec.contact) {
    punch.hitDone = true;
    resolveHit(fighter, defender, spec);
  }

  if (punch.elapsed >= spec.duration) {
    fighter.punch = null;
  }
}

function resolveHit(attacker, defender, spec) {
  const distance = opponent.x - player.x;
  const inRange = distance <= spec.range;
  const defenderDodging = defender.dodgeTimer > 0.06;
  const defenderBlocking = defender.guarding && !defender.punch && !defenderDodging;

  if (!inRange || defenderDodging) {
    setMessage(defenderDodging ? `${defender.name} ducks under the ${spec.label}.` : `${attacker.name} misses.`);
    playWhiff();
    return;
  }

  const aiDamage = attacker.ai ? DIFFICULTY[game.difficulty].aiDamage : 1;
  const blockScale = defenderBlocking ? 0.32 : 1;
  const comboBonus = attacker === player ? Math.min(1.22, 1 + game.combo * 0.04) : 1;
  const damage = spec.damage * aiDamage * blockScale * comboBonus;
  defender.health = clamp(defender.health - damage, 0, 100);
  defender.recoil = clamp(defender.recoil + spec.recoil + damage / 80, 0, 0.9);
  defender.recoilYaw = (attacker === player ? 1 : -1) * clamp(damage / 100, 0.04, 0.16);
  defender.hitFlash = 0.18;
  defender.x += attacker === player ? spec.recoil : -spec.recoil;
  if (spec.push && !defenderBlocking) {
    defender.punch = null;
    defender.guardWindow = 0;
    defender.stamina = clamp(defender.stamina - 8, 0, 100);
  }
  game.shake = Math.max(game.shake, defenderBlocking ? 0.12 : 0.28);

  spec.arm && attacker.parts[spec.arm].fist.getWorldPosition(tmpVector);
  spawnImpact(tmpVector, attacker.primaryColor, defenderBlocking ? 10 : 18, defenderBlocking ? 0.7 : 1.1);
  playHit(damage, defenderBlocking);

  if (attacker === player && !defenderBlocking && !spec.push) {
    game.combo += 1;
    player.lastHitAt = game.elapsed;
  }

  if (defenderBlocking) {
    setMessage(`${defender.name} blocks the ${spec.label}.`);
  } else if (spec.push) {
    setMessage(`${attacker.name} pushes ${defender.name} back.`);
  } else {
    setMessage(`${attacker.name} lands a ${spec.label}.`);
  }

  if (defender.health <= 0) {
    endFight(attacker, defender);
  }
}

function separateFighters() {
  const minDistance = 0.82;
  player.x = clamp(player.x, -2.28, -0.18);
  opponent.x = clamp(opponent.x, 0.18, 2.28);
  if (opponent.x - player.x < minDistance) {
    const middle = (player.x + opponent.x) / 2;
    player.x = clamp(middle - minDistance / 2, -2.28, -0.18);
    opponent.x = clamp(middle + minDistance / 2, 0.18, 2.28);
  }
}

function updateVisuals(dt) {
  updateRobotPose(player, dt);
  updateRobotPose(opponent, dt);
  updateSparks(dt);

  if (game.mode === "finished") {
    game.finishDelay -= dt;
    if (game.finishDelay <= 0 && !ui.overlay.classList.contains("is-visible")) {
      ui.overlayCopy.textContent = `${game.winner} owns the arena.`;
      ui.startButton.textContent = "Fight Again";
      ui.overlay.classList.add("is-visible");
    }
  }

  game.shake = Math.max(0, game.shake - dt * 1.7);
  const shakeX = (Math.random() - 0.5) * game.shake * 0.11;
  const shakeY = (Math.random() - 0.5) * game.shake * 0.08;
  const mobile = window.innerWidth < 720;
  camera.position.set(shakeX, mobile ? 2.18 + shakeY : 2.55 + shakeY, mobile ? 6.65 : 5.9);
  camera.lookAt(0, 1.14, 0);

  updateUi();
}

function updateRobotPose(fighter, dt) {
  const moving = Math.abs(fighter.intent) > 0.05;
  const bob = moving && game.mode === "fighting" ? Math.abs(Math.sin(game.elapsed * 11)) * 0.035 : 0;
  const duckAmount = fighter.dodgeTimer > 0 ? Math.sin((fighter.dodgeTimer / DUCK_DURATION) * Math.PI) : 0;
  const recoilX = fighter === player ? -fighter.recoil * 0.16 : fighter.recoil * 0.16;

  fighter.root.position.set(fighter.x + recoilX, bob - duckAmount * 0.28, 0);
  fighter.root.rotation.y = fighter.faceRotation + fighter.recoilYaw;
  fighter.root.rotation.z = lerp(fighter.root.rotation.z, -fighter.intent * 0.04 - duckAmount * 0.18, dt * 10);
  fighter.rig.scale.y = lerp(fighter.rig.scale.y, 1 - duckAmount * 0.16, dt * 12);
  fighter.rig.scale.x = lerp(fighter.rig.scale.x, 1 + duckAmount * 0.05, dt * 12);

  const healthLift = (100 - fighter.health) / 100;
  const targetLift = fighter.knocked ? 0.95 : clamp(healthLift * 0.24 + fighter.recoil * 0.1, 0, 0.28);
  fighter.headLift = lerp(fighter.headLift, targetLift, dt * (fighter.knocked ? 7 : 5));
  fighter.parts.headGroup.position.y = 2.23 + fighter.headLift * 0.72 - duckAmount * 0.32;
  fighter.parts.headGroup.rotation.z = lerp(
    fighter.parts.headGroup.rotation.z,
    fighter.knocked ? (fighter === player ? -0.42 : 0.42) : fighter.recoilYaw * 1.7,
    dt * 8
  );
  fighter.parts.headGroup.rotation.x = lerp(fighter.parts.headGroup.rotation.x, fighter.knocked ? -0.25 : -duckAmount * 0.2, dt * 8);
  fighter.parts.springGroup.visible = fighter.headLift > 0.23 || fighter.knocked;
  fighter.parts.springGroup.scale.y = clamp(0.6 + fighter.headLift * 2.5, 0.6, 2.9);
  fighter.eyeMat.emissiveIntensity = fighter.hitFlash > 0 ? 2.6 : fighter.guarding ? 1.8 : 1.2;

  poseArm(fighter, fighter.parts.leftArm, dt);
  poseArm(fighter, fighter.parts.rightArm, dt);
}

function poseArm(fighter, arm, dt) {
  const base = arm.base;
  let extension = 0;
  let lift = 0;
  let guard = 0;
  let roll = 0;
  let foreBend = 0;
  let zTuck = 0;
  const duckAmount = fighter.dodgeTimer > 0 ? Math.sin((fighter.dodgeTimer / DUCK_DURATION) * Math.PI) : 0;

  if (fighter.guarding) {
    guard = 1;
  }

  if (fighter.punch && PUNCHES[fighter.punch.type].arm === (arm === fighter.parts.leftArm ? "leftArm" : "rightArm")) {
    const spec = PUNCHES[fighter.punch.type];
    const t = fighter.punch.elapsed / spec.duration;
    let strike = 0;
    if (t < 0.28) {
      strike = -easeOutCubic(t / 0.28) * 0.18;
    } else if (t < 0.58) {
      strike = -0.18 + easeOutCubic((t - 0.28) / 0.3) * (spec.extension + 0.18);
    } else {
      strike = spec.extension * (1 - easeInOut((t - 0.58) / 0.42));
    }
    extension = strike;
    lift = spec.lift ? easeOutCubic(clamp((t - 0.2) / 0.38, 0, 1)) * 0.28 : 0;
    roll = (spec.lift ? -0.72 : 0.02) * easeOutCubic(clamp((t - 0.18) / 0.26, 0, 1));
    foreBend = spec.lift ? -0.36 : 0;
  }

  if (fighter.punch && PUNCHES[fighter.punch.type].arm !== (arm === fighter.parts.leftArm ? "leftArm" : "rightArm")) {
    guard = Math.max(guard, 0.45);
  }

  if (guard > 0) {
    extension += 0.08 * guard;
    lift += 0.12 * guard;
    zTuck = -arm.zSign * 0.24 * guard;
    roll += -arm.zSign * 0.25 * guard;
    foreBend += -0.22 * guard;
  }

  if (duckAmount > 0) {
    extension -= 0.04 * duckAmount;
    lift -= 0.16 * duckAmount;
    zTuck += -arm.zSign * 0.1 * duckAmount;
    roll += -0.34 * duckAmount;
    foreBend += -0.28 * duckAmount;
  }

  arm.group.position.x = lerp(arm.group.position.x, base.x + extension, dt * 18);
  arm.group.position.y = lerp(arm.group.position.y, base.y + lift, dt * 18);
  arm.group.position.z = lerp(arm.group.position.z, base.z + zTuck, dt * 18);
  arm.group.rotation.y = lerp(arm.group.rotation.y, base.ry + arm.zSign * 0.08 * guard, dt * 18);
  arm.group.rotation.z = lerp(arm.group.rotation.z, roll, dt * 18);
  arm.fore.position.x = lerp(arm.fore.position.x, 0.39 + Math.max(0, extension) * 0.32, dt * 18);
  arm.fore.rotation.z = lerp(arm.fore.rotation.z, foreBend, dt * 18);
  const fistScale = fighter.punch && PUNCHES[fighter.punch.type].arm === (arm === fighter.parts.leftArm ? "leftArm" : "rightArm")
    ? 1.1
    : 1;
  arm.fist.scale.set(1.18 * fistScale, 0.95 * fistScale, 1.02 * fistScale);
}

function spawnImpact(position, color, count = 14, power = 1) {
  tmpColor.set(color).lerp(new THREE.Color(0xfff2b8), 0.42);
  for (let i = 0; i < count; i += 1) {
    const sparkMat = new THREE.MeshBasicMaterial({ color: tmpColor.clone() });
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.025 + Math.random() * 0.028, 8, 6), sparkMat);
    spark.position.copy(position);
    spark.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2.2 * power,
      (0.3 + Math.random() * 1.9) * power,
      (Math.random() - 0.5) * 2.2 * power
    );
    spark.userData.life = 0.34 + Math.random() * 0.28;
    spark.userData.maxLife = spark.userData.life;
    scene.add(spark);
    sparks.push(spark);
  }
}

function updateSparks(dt) {
  for (let i = sparks.length - 1; i >= 0; i -= 1) {
    const spark = sparks[i];
    spark.userData.life -= dt;
    spark.userData.velocity.y -= 3.8 * dt;
    spark.position.addScaledVector(spark.userData.velocity, dt);
    const scale = clamp(spark.userData.life / spark.userData.maxLife, 0, 1);
    spark.scale.setScalar(scale);
    if (spark.userData.life <= 0) {
      scene.remove(spark);
      spark.geometry.dispose();
      spark.material.dispose();
      sparks.splice(i, 1);
    }
  }
}

function updateUi() {
  ui.blueHealthText.textContent = String(Math.ceil(player.health));
  ui.redHealthText.textContent = String(Math.ceil(opponent.health));
  ui.blueHealthBar.style.width = `${clamp(player.health, 0, 100)}%`;
  ui.redHealthBar.style.width = `${clamp(opponent.health, 0, 100)}%`;
  ui.bluePowerBar.style.width = `${clamp(player.stamina, 0, 100)}%`;
  ui.redPowerBar.style.width = `${clamp(opponent.stamina, 0, 100)}%`;
  ui.timerText.textContent = String(Math.ceil(game.timer));
  ui.roundLabel.textContent = `Round ${game.round}`;
  ui.comboText.textContent = String(game.combo);
  ui.pressureText.textContent = `${Math.round(game.pressure)}%`;
  ui.blueLiftText.textContent = `${Math.round(player.headLift * 100)}%`;
  ui.redLiftText.textContent = `${Math.round(opponent.headLift * 100)}%`;
}

function ensureAudio() {
  if (audioCtx) {
    if (audioCtx.state === "suspended") audioCtx.resume();
    return;
  }
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  audioCtx = new AudioContext();
}

function playTone(frequency, duration, type = "square", gainValue = 0.05, slide = 0) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  if (slide) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, frequency + slide), now + duration);
  }
  gain.gain.setValueAtTime(gainValue, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain).connect(audioCtx.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function playBell() {
  playTone(740, 0.12, "triangle", 0.08, -80);
  setTimeout(() => playTone(920, 0.16, "triangle", 0.06, -120), 95);
}

function playSwing(type) {
  const base = type === "push" ? 165 : 235;
  playTone(base, 0.08, "sawtooth", 0.028, -70);
}

function playWhiff() {
  playTone(140, 0.08, "sine", 0.018, -55);
}

function playSlip() {
  playTone(320, 0.07, "triangle", 0.018, 45);
}

function playHit(power, blocked) {
  const weight = blocked ? 0.58 : 1;
  playTone(92 + power * 2, 0.1, "square", 0.08 * weight, -40);
  playTone(420 + power * 7, 0.055, "triangle", 0.045 * weight, -180);
}

function playKnockout() {
  playTone(76, 0.28, "sawtooth", 0.1, -35);
  setTimeout(() => playTone(520, 0.18, "square", 0.065, -210), 90);
  setTimeout(() => playTone(900, 0.22, "triangle", 0.06, -280), 190);
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.033);
  game.elapsed += dt;
  if (game.mode === "fighting") {
    updateFight(dt);
  } else {
    game.messageCooldown = Math.max(0, game.messageCooldown - dt);
  }
  updateVisuals(dt);
  renderer.render(scene, camera);
}

try {
  init();
  animate();
} catch (error) {
  fatal.classList.add("is-visible");
  console.error(error);
}
