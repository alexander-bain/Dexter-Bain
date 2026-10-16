(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const W = canvas.width;
  const H = canvas.height;
  ctx.imageSmoothingEnabled = false;

  const $ = (id) => document.getElementById(id);
  const ui = {
    viewLabel: $("viewLabel"), holeTitle: $("holeTitle"), holeStat: $("holeStat"), distanceStat: $("distanceStat"),
    strokeStat: $("strokeStat"), scoreStat: $("scoreStat"), windChip: $("windChip"), sceneChip: $("sceneChip"),
    shotConsole: $("shotConsole"), clubButton: $("clubButton"), clubName: $("clubName"), clubRange: $("clubRange"),
    powerBlock: $("powerBlock"), aimBlock: $("aimBlock"), powerReadout: $("powerReadout"), aimReadout: $("aimReadout"),
    powerSweet: $("powerSweet"), powerNeedle: $("powerNeedle"), aimNeedle: $("aimNeedle"), powerHint: $("powerHint"),
    aimHint: $("aimHint"), actionButton: $("actionButton"), mapProgress: $("mapProgress"), flightPercent: $("flightPercent"),
    flightBar: $("flightBar"), flightTravel: $("flightTravel"), flightRemain: $("flightRemain"), puttPanel: $("puttPanel"),
    puttDistance: $("puttDistance"), toast: $("toast"), continueButton: $("continueButton"), introModal: $("introModal"),
    playButton: $("playButton"), practiceButton: $("practiceButton"), scoreButton: $("scoreButton"), soundButton: $("soundButton"),
    scoreModal: $("scoreModal"), closeScore: $("closeScore"), scoreGrid: $("scoreGrid"), roundTotal: $("roundTotal"),
    resultModal: $("resultModal"), resultKicker: $("resultKicker"), resultTitle: $("resultTitle"), resultCopy: $("resultCopy"),
    resultStrokes: $("resultStrokes"), replayButton: $("replayButton")
  };

  const HOLES = [
    { name: "Bluewater Bend", length: 96, wind: [0.7, 0.2], curve: -0.22, green: 19, break: [0.22, -0.05], theme: "lake", hazards: [{ type: "water", t: 0.54, offset: -0.28, rx: 0.34, ry: 0.10 }, { type: "bunker", t: 0.88, offset: 0.46, rx: 0.20, ry: 0.07 }] },
    { name: "Pine Needle", length: 112, wind: [-1.1, -0.2], curve: 0.18, green: 18, break: [-0.18, 0.12], theme: "pine", hazards: [{ type: "bunker", t: 0.74, offset: -0.48, rx: 0.22, ry: 0.08 }, { type: "bunker", t: 0.90, offset: 0.42, rx: 0.17, ry: 0.06 }] },
    { name: "Sunset Quarry", length: 128, wind: [1.6, 0.4], curve: 0.34, green: 20, break: [0.28, 0.08], theme: "cliff", hazards: [{ type: "bunker", t: 0.55, offset: 0.10, rx: 0.28, ry: 0.08 }, { type: "rough", t: 0.78, offset: -0.55, rx: 0.24, ry: 0.10 }] },
    { name: "Island Postcard", length: 141, wind: [-1.9, 0.3], curve: -0.12, green: 22, break: [-0.30, -0.04], theme: "island", hazards: [{ type: "water", t: 0.73, offset: 0, rx: 0.74, ry: 0.14 }, { type: "bunker", t: 0.92, offset: -0.38, rx: 0.16, ry: 0.06 }] },
    { name: "Canyon Echo", length: 154, wind: [0.3, -0.6], curve: 0.45, green: 17, break: [0.12, 0.22], theme: "canyon", hazards: [{ type: "bunker", t: 0.48, offset: -0.42, rx: 0.22, ry: 0.08 }, { type: "bunker", t: 0.84, offset: 0.48, rx: 0.22, ry: 0.08 }] },
    { name: "Twin Falls", length: 169, wind: [2.1, -0.1], curve: -0.38, green: 21, break: [0.34, -0.12], theme: "falls", hazards: [{ type: "water", t: 0.44, offset: 0.38, rx: 0.30, ry: 0.12 }, { type: "water", t: 0.68, offset: -0.40, rx: 0.28, ry: 0.10 }] },
    { name: "Highland Stair", length: 187, wind: [-2.4, -0.8], curve: 0.24, green: 19, break: [-0.36, 0.14], theme: "highland", hazards: [{ type: "bunker", t: 0.63, offset: -0.34, rx: 0.27, ry: 0.08 }, { type: "rough", t: 0.82, offset: 0.55, rx: 0.25, ry: 0.10 }] },
    { name: "Ocean Teeth", length: 205, wind: [2.8, 0.5], curve: -0.52, green: 23, break: [0.42, 0.05], theme: "ocean", hazards: [{ type: "water", t: 0.58, offset: -0.58, rx: 0.46, ry: 0.18 }, { type: "bunker", t: 0.90, offset: 0.40, rx: 0.23, ry: 0.07 }] },
    { name: "Champion's Window", length: 224, wind: [-1.5, -0.4], curve: 0.08, green: 20, break: [-0.26, -0.18], theme: "champion", hazards: [{ type: "bunker", t: 0.62, offset: -0.44, rx: 0.20, ry: 0.08 }, { type: "bunker", t: 0.79, offset: 0.46, rx: 0.24, ry: 0.08 }, { type: "water", t: 0.42, offset: 0.60, rx: 0.30, ry: 0.13 }] }
  ].map((hole) => ({ ...hole, par: 3 }));

  const CLUBS = [
    { name: "LOB WEDGE", short: "LW", range: 68 },
    { name: "SAND WEDGE", short: "SW", range: 82 },
    { name: "9 IRON", short: "9I", range: 102 },
    { name: "7 IRON", short: "7I", range: 128 },
    { name: "5 IRON", short: "5I", range: 154 },
    { name: "3 IRON", short: "3I", range: 181 },
    { name: "3 WOOD", short: "3W", range: 211 },
    { name: "DRIVER", short: "DR", range: 242 }
  ];

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t * t * (3 - 2 * t);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const snap = (value, size = 4) => Math.round(value / size) * size;
  const scoreText = (score) => score === 0 ? "E" : score > 0 ? `+${score}` : `${score}`;
  const currentHole = () => HOLES[state.holeIndex];
  const currentClub = () => CLUBS[state.clubIndex];

  const state = {
    phase: "intro",
    holeIndex: 0,
    scores: Array(9).fill(null),
    holeStrokes: 0,
    totalStrokes: 0,
    ballAlong: 0,
    ballLateral: 0,
    lie: "Tee",
    clubIndex: 2,
    meterTime: 0,
    power: 0,
    lockedPower: null,
    aim: 0,
    lockedAim: null,
    swingTime: 0,
    impactDone: false,
    shotStart: null,
    shotResult: null,
    mapTime: 0,
    toastTime: 0,
    muted: false,
    practice: false,
    puttBall: null,
    cup: null,
    puttScale: 10,
    puttDistanceMeters: 0,
    swipe: null,
    puttFlight: null,
    cameraAngle: 0,
    particles: [],
    lastTime: performance.now()
  };

  let audioContext = null;

  function ensureAudio() {
    if (state.muted) return null;
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    if (!AudioEngine) return null;
    if (!audioContext) audioContext = new AudioEngine();
    if (audioContext.state === "suspended") audioContext.resume();
    return audioContext;
  }

  function tone(kind) {
    const ac = ensureAudio();
    if (!ac) return;
    const now = ac.currentTime;
    const gain = ac.createGain();
    const osc = ac.createOscillator();
    const settings = {
      click: [420, 0.05, "square", 0.035],
      lock: [690, 0.08, "square", 0.045],
      swing: [180, 0.24, "sawtooth", 0.035],
      impact: [96, 0.18, "square", 0.11],
      land: [120, 0.14, "triangle", 0.06],
      cup: [880, 0.42, "square", 0.055],
      water: [72, 0.34, "sine", 0.08]
    }[kind] || [300, 0.08, "square", 0.04];
    osc.frequency.setValueAtTime(settings[0], now);
    if (kind === "swing") osc.frequency.exponentialRampToValueAtTime(70, now + settings[1]);
    if (kind === "cup") osc.frequency.setValueAtTime(1174, now + 0.18);
    gain.gain.setValueAtTime(settings[3], now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + settings[1]);
    osc.type = settings[2];
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + settings[1] + 0.02);
  }

  function showToast(message, duration = 1.8) {
    ui.toast.textContent = message;
    ui.toast.classList.add("is-visible");
    state.toastTime = duration;
  }

  function hideToast() {
    ui.toast.classList.remove("is-visible");
    state.toastTime = 0;
  }

  function remainingDistance(along = state.ballAlong, lateral = state.ballLateral) {
    return Math.hypot(currentHole().length - along, lateral);
  }

  function courseHalfWidth(t) {
    return lerp(18, 28, clamp(t, 0, 1));
  }

  function autoClub() {
    const distance = remainingDistance();
    const liePenalty = state.lie === "Bunker" ? 0.72 : state.lie === "Rough" ? 0.86 : 1;
    const needed = distance / liePenalty;
    let index = CLUBS.findIndex((club) => club.range >= needed * 0.95);
    if (index < 0) index = CLUBS.length - 1;
    state.clubIndex = index;
  }

  function targetPower() {
    const liePenalty = state.lie === "Bunker" ? 0.72 : state.lie === "Rough" ? 0.86 : 1;
    const windHelp = currentHole().wind[1] * 2.2;
    const needed = Math.max(8, remainingDistance() - windHelp);
    return clamp((needed / (currentClub().range * liePenalty) - 0.48) / 0.57, 0.08, 0.95);
  }

  function scoreRelative() {
    const completed = state.scores.filter((score) => score !== null);
    const strokes = completed.reduce((sum, score) => sum + score, 0);
    return strokes - completed.length * 3;
  }

  function setDialog(dialog, open) {
    if (open && !dialog.open) {
      if (dialog.showModal) dialog.showModal(); else dialog.setAttribute("open", "");
    } else if (!open && dialog.open) {
      if (dialog.close) dialog.close(); else dialog.removeAttribute("open");
    }
  }

  function prepareHole(index, practice = false) {
    state.holeIndex = index;
    state.practice = practice;
    state.holeStrokes = 0;
    state.ballAlong = 0;
    state.ballLateral = 0;
    state.lie = "Tee";
    state.shotStart = null;
    state.shotResult = null;
    state.puttBall = null;
    state.puttFlight = null;
    state.swipe = null;
    hideToast();
    ui.continueButton.hidden = true;
    if (practice) {
      state.ballAlong = currentHole().length - 8;
      state.lie = "Green";
      beginPutting();
    } else {
      beginFullShot();
    }
    updateScorecard();
  }

  function beginRound() {
    state.scores = Array(9).fill(null);
    state.totalStrokes = 0;
    state.practice = false;
    setDialog(ui.introModal, false);
    setDialog(ui.resultModal, false);
    prepareHole(0);
    ensureAudio();
  }

  function beginFullShot() {
    state.phase = "power";
    state.meterTime = 0;
    state.power = 0;
    state.aim = -1;
    state.lockedPower = null;
    state.lockedAim = null;
    state.swingTime = 0;
    state.impactDone = false;
    state.cameraAngle = (state.holeIndex + state.holeStrokes) % 3;
    autoClub();
    ui.shotConsole.classList.remove("is-hidden");
    ui.mapProgress.hidden = true;
    ui.puttPanel.hidden = true;
    ui.continueButton.hidden = true;
    ui.powerBlock.classList.remove("is-locked");
    ui.aimBlock.classList.add("is-locked");
    ui.powerHint.textContent = "Tap when the marker reaches the glowing target";
    ui.aimHint.textContent = "Distance comes first";
    ui.actionButton.disabled = false;
    ui.actionButton.innerHTML = "<span>SET DISTANCE</span><small>SPACE / TAP</small>";
    ui.viewLabel.textContent = state.lie === "Tee" ? "TEE VIEW" : `${state.lie.toUpperCase()} VIEW`;
    ui.sceneChip.textContent = ["PLAYER CAMERA", "REVERSE CAMERA", "CLOSE CAMERA"][state.cameraAngle];
    syncUI();
  }

  function lockDistance() {
    if (state.phase !== "power") return;
    state.lockedPower = state.power;
    state.phase = "aim";
    state.meterTime = 0;
    state.aim = -1;
    ui.powerBlock.classList.add("is-locked");
    ui.aimBlock.classList.remove("is-locked");
    ui.powerHint.textContent = `${Math.round(predictedCarry(state.lockedPower))}m selected`;
    ui.aimHint.textContent = "Tap near center for a straight strike";
    ui.actionButton.innerHTML = "<span>SET AIM</span><small>SPACE / TAP</small>";
    tone("lock");
  }

  function lockAim() {
    if (state.phase !== "aim") return;
    state.lockedAim = state.aim;
    state.phase = "address";
    state.swingTime = 0;
    ui.aimBlock.classList.add("is-locked");
    ui.aimHint.textContent = Math.abs(state.lockedAim) < 0.10 ? "Perfect strike" : state.lockedAim < 0 ? "Drawing left" : "Fading right";
    ui.actionButton.disabled = true;
    ui.actionButton.innerHTML = "<span>SWINGING…</span><small>EYES ON THE BALL</small>";
    showToast("Distance locked · aim locked", 1.1);
    tone("lock");
  }

  function handleAction() {
    ensureAudio();
    if (state.phase === "power") lockDistance();
    else if (state.phase === "aim") lockAim();
  }

  function predictedCarry(power) {
    const liePenalty = state.lie === "Bunker" ? 0.72 : state.lie === "Rough" ? 0.86 : 1;
    return currentClub().range * (0.48 + power * 0.57) * liePenalty + currentHole().wind[1] * 2.2;
  }

  function calculateShot() {
    const hole = currentHole();
    const start = { along: state.ballAlong, lateral: state.ballLateral };
    const baseCarry = predictedCarry(state.lockedPower ?? state.power);
    const aimError = (state.lockedAim ?? state.aim) * (Math.PI / 15);
    const targetAngle = Math.atan2(-state.ballLateral, hole.length - state.ballAlong);
    const angle = targetAngle + aimError;
    const alongDelta = Math.cos(angle) * baseCarry;
    const lateralDelta = Math.sin(angle) * baseCarry + hole.wind[0] * baseCarry * 0.016;
    const end = {
      along: start.along + alongDelta,
      lateral: start.lateral + lateralDelta
    };
    const t = end.along / hole.length;
    let lie = Math.abs(end.lateral) > courseHalfWidth(t) ? "Rough" : "Fairway";
    let hazard = null;

    for (const item of hole.hazards) {
      const dt = Math.abs(t - item.t) / item.ry;
      const lateralNorm = end.lateral / 38;
      const dx = Math.abs(lateralNorm - item.offset) / item.rx;
      if (dt * dt + dx * dx <= 1) {
        if (item.type === "water") { hazard = "Water"; lie = "Water"; break; }
        if (item.type === "bunker") lie = "Bunker";
        if (item.type === "rough") lie = "Rough";
      }
    }

    const remaining = Math.hypot(hole.length - end.along, end.lateral);
    if (!hazard && remaining <= hole.green) lie = "Green";
    const holed = !hazard && remaining < 0.85;
    if (holed) lie = "Hole";
    return { start, end, lie, hazard, carry: baseCarry, remaining, holed };
  }

  function impactShot() {
    if (state.impactDone) return;
    state.impactDone = true;
    state.shotStart = { along: state.ballAlong, lateral: state.ballLateral, lie: state.lie };
    state.shotResult = calculateShot();
    state.holeStrokes += 1;
    state.totalStrokes += 1;
    spawnImpactParticles();
    tone("impact");
    showToast(`${currentClub().name} · ${Math.round(state.shotResult.carry)}m`, 1.15);
    syncUI();
  }

  function openMapFlight() {
    state.phase = "mapFlight";
    state.mapTime = 0;
    ui.shotConsole.classList.add("is-hidden");
    ui.mapProgress.hidden = false;
    ui.viewLabel.textContent = "LIVE BALL TRACKER";
    ui.sceneChip.textContent = "HOLE MAP";
  }

  function commitShot() {
    const result = state.shotResult;
    if (!result) return;
    if (result.hazard === "Water") {
      state.holeStrokes += 1;
      state.totalStrokes += 1;
      state.ballAlong = state.shotStart.along;
      state.ballLateral = state.shotStart.lateral;
      state.lie = state.shotStart.lie === "Tee" ? "Tee" : "Rough";
      showToast("WATER · ONE-STROKE PENALTY", 3);
      tone("water");
    } else {
      state.ballAlong = result.end.along;
      state.ballLateral = result.end.lateral;
      state.lie = result.lie;
      tone("land");
      if (result.holed) showToast(state.holeStrokes === 1 ? "HOLE IN ONE!" : "DROPPED FROM THE FAIRWAY!", 3);
      else if (result.lie === "Green") showToast(`${remainingDistance().toFixed(1)}m PUTT · ON THE GREEN`, 2.5);
      else showToast(`${result.lie.toUpperCase()} · ${Math.round(remainingDistance())}m LEFT`, 2.3);
    }
    state.phase = "mapLanded";
    ui.continueButton.hidden = false;
    ui.continueButton.innerHTML = result.holed ? "FINISH HOLE <span>›</span>" : state.lie === "Green" ? "GO TO GREEN <span>›</span>" : "NEXT SHOT <span>›</span>";
    syncUI();
  }

  function continueAfterMap() {
    if (state.phase !== "mapLanded") return;
    ui.mapProgress.hidden = true;
    ui.continueButton.hidden = true;
    if (state.shotResult?.holed) finishHole();
    else if (state.lie === "Green") beginPutting();
    else beginFullShot();
  }

  function beginPutting() {
    state.phase = "puttReady";
    state.swipe = null;
    state.puttFlight = null;
    const distance = clamp(remainingDistance(), 1.5, currentHole().green);
    state.puttDistanceMeters = distance;
    state.puttScale = clamp(240 / distance, 10, 24);
    state.cup = { x: 610, y: 178 };
    const angle = (state.holeIndex * 0.71 + state.holeStrokes * 0.17) - 0.35;
    state.puttBall = {
      x: state.cup.x + Math.sin(angle) * distance * state.puttScale * 0.34,
      y: state.cup.y + Math.cos(angle) * distance * state.puttScale
    };
    if (state.puttBall.y > 450) {
      state.puttScale *= 0.78;
      state.puttBall.y = state.cup.y + Math.cos(angle) * distance * state.puttScale;
      state.puttBall.x = state.cup.x + Math.sin(angle) * distance * state.puttScale * 0.34;
    }
    ui.shotConsole.classList.add("is-hidden");
    ui.mapProgress.hidden = true;
    ui.puttPanel.hidden = false;
    ui.continueButton.hidden = true;
    ui.viewLabel.textContent = "PUTTING GREEN";
    ui.sceneChip.textContent = "GREEN CAMERA";
    showToast("SWIPE TOWARD THE CUP", 2.1);
    syncUI();
  }

  function launchPutt(dx, dy) {
    if (state.phase !== "puttReady") return;
    const length = Math.hypot(dx, dy);
    if (length < 18) {
      showToast("SWIPE A LITTLE FARTHER", 1.5);
      return;
    }
    const distancePx = Math.hypot(state.cup.x - state.puttBall.x, state.cup.y - state.puttBall.y);
    const recommended = clamp(state.puttDistanceMeters * 12, 56, 185);
    const powerRatio = clamp(length / recommended, 0.18, 2.15);
    const dir = { x: dx / length, y: dy / length };
    const travel = distancePx * powerRatio;
    const hole = currentHole();
    const breakX = hole.break[0] * 42 * powerRatio;
    const breakY = hole.break[1] * 28 * powerRatio;
    let end = {
      x: state.puttBall.x + dir.x * travel + breakX,
      y: state.puttBall.y + dir.y * travel + breakY
    };
    const closest = distanceToSegment(state.cup, state.puttBall, end);
    const holed = closest < 8 && powerRatio >= 0.72 && powerRatio <= 1.32;
    if (holed) end = { ...state.cup };
    state.holeStrokes += 1;
    state.totalStrokes += 1;
    state.puttFlight = { start: { ...state.puttBall }, end, elapsed: 0, duration: clamp(0.72 + powerRatio * 0.42, 0.82, 1.7), holed, breakX, breakY };
    state.phase = "puttFlight";
    state.swipe = null;
    ui.puttPanel.hidden = true;
    tone("click");
    syncUI();
  }

  function distanceToSegment(point, start, end) {
    const vx = end.x - start.x;
    const vy = end.y - start.y;
    const lengthSq = vx * vx + vy * vy || 1;
    const t = clamp(((point.x - start.x) * vx + (point.y - start.y) * vy) / lengthSq, 0, 1);
    return Math.hypot(point.x - (start.x + vx * t), point.y - (start.y + vy * t));
  }

  function finishPutt() {
    const flight = state.puttFlight;
    if (flight.holed) {
      state.puttBall = { ...state.cup };
      tone("cup");
      showToast(scoreName(state.holeStrokes).toUpperCase(), 2.5);
      finishHole();
      return;
    }
    state.puttBall = {
      x: clamp(flight.end.x, 190, 795),
      y: clamp(flight.end.y, 145, 466)
    };
    const distancePx = Math.hypot(state.cup.x - state.puttBall.x, state.cup.y - state.puttBall.y);
    state.puttDistanceMeters = Math.max(0.4, distancePx / state.puttScale);
    state.phase = "puttReady";
    state.puttFlight = null;
    ui.puttPanel.hidden = false;
    showToast(`${state.puttDistanceMeters.toFixed(1)}m REMAINS`, 1.7);
    syncUI();
  }

  function scoreName(strokes) {
    if (strokes <= 1) return "Hole in one";
    if (strokes === 2) return "Birdie";
    if (strokes === 3) return "Par";
    if (strokes === 4) return "Bogey";
    if (strokes === 5) return "Double bogey";
    return `+${strokes - 3}`;
  }

  function finishHole() {
    if (state.practice) {
      state.phase = "roundComplete";
      ui.resultKicker.textContent = "PUTT PRACTICE";
      ui.resultTitle.textContent = "CENTER CUP";
      ui.resultCopy.textContent = `Holed in ${state.holeStrokes} ${state.holeStrokes === 1 ? "stroke" : "strokes"}.`;
      ui.resultStrokes.textContent = state.holeStrokes;
      setDialog(ui.resultModal, true);
      return;
    }
    if (state.scores[state.holeIndex] === null) state.scores[state.holeIndex] = state.holeStrokes;
    updateScorecard();
    state.phase = "holeComplete";
    ui.puttPanel.hidden = true;
    ui.continueButton.hidden = false;
    if (state.holeIndex === 8) {
      ui.continueButton.innerHTML = "FINAL SCORE <span>›</span>";
    } else {
      ui.continueButton.innerHTML = `HOLE ${state.holeIndex + 2} <span>›</span>`;
    }
  }

  function nextHoleOrFinish() {
    if (state.phase !== "holeComplete") return;
    ui.continueButton.hidden = true;
    if (state.holeIndex < 8) {
      prepareHole(state.holeIndex + 1);
    } else {
      showRoundResult();
    }
  }

  function showRoundResult() {
    state.phase = "roundComplete";
    const strokes = state.scores.reduce((sum, value) => sum + (value || 0), 0);
    const relative = strokes - 27;
    let best = 0;
    try { best = Number(localStorage.getItem("pixel-golf-best")); } catch (_) { best = 0; }
    if (!best || strokes < best) {
      best = strokes;
      try { localStorage.setItem("pixel-golf-best", String(strokes)); } catch (_) { /* Storage can be unavailable in private browsing. */ }
    }
    ui.resultKicker.textContent = "ROUND COMPLETE";
    ui.resultTitle.textContent = relative === 0 ? "EVEN PAR" : relative < 0 ? `${Math.abs(relative)} UNDER` : `${relative} OVER`;
    ui.resultCopy.textContent = strokes === best ? "New personal best. The clubhouse is buzzing." : `Personal best: ${best} strokes.`;
    ui.resultStrokes.textContent = strokes;
    setDialog(ui.resultModal, true);
  }

  function updateScorecard() {
    ui.scoreGrid.innerHTML = HOLES.map((hole, index) => {
      const score = state.scores[index];
      return `<div class="score-cell${index === state.holeIndex ? " is-current" : ""}"><small>H${index + 1}</small><b>${score ?? "–"}</b><span>${hole.length}m</span></div>`;
    }).join("");
    const completeStrokes = state.scores.reduce((sum, value) => sum + (value || 0), 0);
    const completeHoles = state.scores.filter((value) => value !== null).length;
    ui.roundTotal.textContent = scoreText(completeStrokes - completeHoles * 3);
  }

  function syncUI() {
    const hole = currentHole();
    const distance = state.phase.startsWith("putt") ? state.puttDistanceMeters : remainingDistance();
    ui.holeStat.textContent = `${state.holeIndex + 1}/9`;
    ui.holeTitle.textContent = `Hole ${state.holeIndex + 1} · ${hole.name}`;
    ui.distanceStat.textContent = `${distance < 10 ? distance.toFixed(1) : Math.round(distance)}m`;
    ui.strokeStat.textContent = state.holeStrokes;
    ui.scoreStat.textContent = scoreText(scoreRelative());
    const windArrow = hole.wind[0] > 0.25 ? "→" : hole.wind[0] < -0.25 ? "←" : hole.wind[1] > 0 ? "↑" : "↓";
    ui.windChip.innerHTML = `<span>WIND</span><b>${windArrow} ${Math.hypot(...hole.wind).toFixed(1)}</b>`;
    ui.clubName.textContent = currentClub().name;
    ui.clubRange.textContent = `${currentClub().range}m max`;
    const target = targetPower();
    ui.powerSweet.style.left = `${target * 100}%`;
    ui.powerNeedle.style.left = `${(state.lockedPower ?? state.power) * 100}%`;
    ui.aimNeedle.style.left = `${((state.lockedAim ?? state.aim) + 1) * 50}%`;
    ui.powerReadout.textContent = `${Math.round(predictedCarry(state.lockedPower ?? state.power))}m`;
    const aimValue = state.lockedAim ?? state.aim;
    ui.aimReadout.textContent = Math.abs(aimValue) < 0.08 ? "CENTER" : aimValue < 0 ? "LEFT" : "RIGHT";
    ui.puttDistance.textContent = `${state.puttDistanceMeters.toFixed(1)}m putt`;
  }

  function update(dt) {
    if (state.toastTime > 0) {
      state.toastTime -= dt;
      if (state.toastTime <= 0) hideToast();
    }

    if (state.phase === "power") {
      state.meterTime += dt * 0.72;
      state.power = 0.5 - 0.5 * Math.cos((state.meterTime % 1) * Math.PI * 2);
      syncUI();
    } else if (state.phase === "aim") {
      state.meterTime += dt * 0.92;
      state.aim = Math.sin(state.meterTime * Math.PI * 2);
      syncUI();
    } else if (state.phase === "address") {
      state.swingTime += dt;
      if (state.swingTime > 0.34) {
        state.phase = "swing";
        state.swingTime = 0;
        tone("swing");
        ui.sceneChip.textContent = `SWING CAMERA · ${state.cameraAngle + 1}`;
      }
    } else if (state.phase === "swing") {
      state.swingTime += dt;
      if (!state.impactDone && state.swingTime >= 0.63) impactShot();
      if (state.swingTime >= 1.55) openMapFlight();
      updateParticles(dt);
    } else if (state.phase === "mapFlight") {
      state.mapTime += dt;
      const progress = clamp(state.mapTime / 2.55, 0, 1);
      const traveled = state.shotResult.carry * progress;
      const left = lerp(remainingDistance(state.shotStart.along, state.shotStart.lateral), state.shotResult.remaining, progress);
      ui.flightPercent.textContent = `${Math.round(progress * 100)}%`;
      ui.flightBar.style.width = `${progress * 100}%`;
      ui.flightTravel.textContent = `${Math.round(traveled)}m flown`;
      ui.flightRemain.textContent = `${Math.round(left)}m left`;
      if (progress >= 1) commitShot();
    } else if (state.phase === "puttFlight" && state.puttFlight) {
      state.puttFlight.elapsed += dt;
      const progress = clamp(state.puttFlight.elapsed / state.puttFlight.duration, 0, 1);
      const t = easeOut(progress);
      state.puttBall.x = lerp(state.puttFlight.start.x, state.puttFlight.end.x, t);
      state.puttBall.y = lerp(state.puttFlight.start.y, state.puttFlight.end.y, t);
      if (progress >= 1) finishPutt();
    }
  }

  function spawnImpactParticles() {
    state.particles = Array.from({ length: 11 }, (_, index) => ({
      x: 414, y: 410, vx: 34 + index * 11, vy: -45 - (index % 4) * 18, life: 0.45 + (index % 3) * 0.12
    }));
  }

  function updateParticles(dt) {
    state.particles.forEach((particle) => {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 150 * dt;
      particle.life -= dt;
    });
    state.particles = state.particles.filter((particle) => particle.life > 0);
  }

  function fill(color) { ctx.fillStyle = color; }
  function rect(x, y, width, height, color) { fill(color); ctx.fillRect(snap(x), snap(y), snap(width), snap(height)); }
  function polygon(points, color) {
    fill(color);
    ctx.beginPath();
    points.forEach(([x, y], index) => (index ? ctx.lineTo(snap(x), snap(y)) : ctx.moveTo(snap(x), snap(y))));
    ctx.closePath();
    ctx.fill();
  }

  function pixelLine(x1, y1, x2, y2, width, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";
    ctx.beginPath();
    ctx.moveTo(snap(x1, 2), snap(y1, 2));
    ctx.lineTo(snap(x2, 2), snap(y2, 2));
    ctx.stroke();
  }

  function drawCloud(x, y, scale = 1) {
    const s = 8 * scale;
    rect(x + s, y, s * 3, s, "#fffdf1");
    rect(x, y + s, s * 7, s, "#fffdf1");
    rect(x - s, y + s * 2, s * 9, s, "#fffdf1");
  }

  function drawTree(x, base, scale, dark = false) {
    const trunk = dark ? "#704424" : "#8c542b";
    const back = dark ? "#123d31" : "#18533a";
    const leaf = dark ? "#18523a" : "#21643c";
    rect(x - 7 * scale, base - 62 * scale, 14 * scale, 62 * scale, trunk);
    rect(x - 28 * scale, base - 86 * scale, 56 * scale, 34 * scale, back);
    rect(x - 20 * scale, base - 110 * scale, 40 * scale, 58 * scale, leaf);
    rect(x - 10 * scale, base - 128 * scale, 20 * scale, 28 * scale, leaf);
    rect(x - 35 * scale, base - 72 * scale, 22 * scale, 25 * scale, back);
    rect(x + 15 * scale, base - 74 * scale, 22 * scale, 24 * scale, back);
  }

  function drawSideBackground() {
    const hole = currentHole();
    const sky = ctx.createLinearGradient(0, 0, 0, 340);
    sky.addColorStop(0, "#258cf9");
    sky.addColorStop(1, "#45a5ff");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    drawCloud(70, 58, 1.0);
    drawCloud(755, 52, 1.15);
    drawCloud(535, 125, 0.62);

    const mountainShift = hole.curve * 60;
    polygon([[520, 260], [520, 235], [575, 235], [575, 218], [625, 218], [625, 198], [680, 198], [680, 210], [730, 210], [730, 185], [790, 185], [790, 164], [850, 164], [850, 180], [910, 180], [910, 150], [960, 150], [960, 335], [500, 335]], "#4474cb");
    polygon([[0, 315], [0, 140], [34, 140], [34, 170], [65, 170], [65, 198], [105, 198], [105, 225], [150, 225], [150, 255], [210, 255], [210, 285], [270, 285], [270, 330]], "#1c5839");
    polygon([[155, 330], [155, 270], [195, 270], [195, 248], [230, 248], [230, 273], [270, 273], [270, 250], [310, 250], [310, 275], [350, 275], [350, 244], [395, 244], [395, 268], [438, 268], [438, 238], [480, 238], [480, 272], [530, 272], [530, 250], [575, 250], [575, 270], [620, 270], [620, 235], [662, 235], [662, 262], [705, 262], [705, 230], [750, 230], [750, 260], [795, 260], [795, 222], [840, 222], [840, 250], [885, 250], [885, 215], [930, 215], [930, 240], [960, 240], [960, 350], [145, 350]], "#1a5838");
    polygon([[0, 345], [0, 278], [55, 278], [55, 298], [108, 298], [108, 275], [165, 275], [165, 316], [220, 316], [220, 288], [280, 288], [280, 322], [342, 322], [342, 292], [405, 292], [405, 318], [470, 318], [470, 286], [530, 286], [530, 316], [590, 316], [590, 282], [650, 282], [650, 314], [710, 314], [710, 278], [770, 278], [770, 312], [830, 312], [830, 274], [900, 274], [900, 305], [960, 305], [960, 360], [0, 360]], "#164a36");

    if (["lake", "island", "falls", "ocean"].includes(hole.theme)) {
      polygon([[75, 336], [960, 330], [960, 420], [95, 414], [95, 390], [45, 390]], "#187ee8");
      rect(150, 352, 120, 8, "#4bacff");
      rect(350, 380, 82, 7, "#4bacff");
      rect(590, 345, 105, 7, "#4bacff");
      rect(760, 392, 72, 7, "#4bacff");
      rect(250, 402, 52, 6, "#49a5ff");
    }

    polygon([[0, 330], [210, 326], [315, 344], [470, 326], [625, 336], [770, 315], [960, 300], [960, 540], [0, 540]], "#5db946");
    polygon([[0, 373], [210, 366], [340, 382], [530, 366], [700, 374], [960, 356], [960, 410], [0, 424]], "#3f9341");
    polygon([[0, 430], [960, 410], [960, 469], [0, 482]], "#6cc153");
    polygon([[0, 482], [960, 469], [960, 540], [0, 540]], "#3f8d42");

    if (hole.theme === "cliff" || hole.theme === "canyon") {
      polygon([[720, 300], [760, 272], [812, 280], [850, 248], [900, 256], [960, 225], [960, 345], [710, 350]], "#8e6844");
      rect(765, 302, 160, 17, "#d4a45d");
    }
    if (hole.theme !== "ocean") {
      drawTree(24, 345, 0.8, true);
      drawTree(92, 342, 0.63, false);
      drawTree(905, 330, 0.58, true);
    }

    if (hole.hazards.some((item) => item.type === "bunker")) {
      polygon([[760 + mountainShift, 343], [820 + mountainShift, 330], [908 + mountainShift, 336], [934 + mountainShift, 353], [890 + mountainShift, 363], [800 + mountainShift, 360]], "#f5d58d");
      rect(802 + mountainShift, 338, 90, 7, "#ffe4a6");
    }

    const flagX = 852 + hole.curve * 54;
    rect(flagX, 254, 7, 80, "#fff8df");
    rect(flagX + 7, 254, 34, 19, "#f0444e");
    rect(flagX - 7, 330, 23, 7, "#173b28");
  }

  function swingPose() {
    if (state.phase === "address") return 0;
    if (state.phase !== "swing") return 0;
    return clamp(state.swingTime / 1.22, 0, 1);
  }

  function swingKeyframes(p) {
    const keys = [
      { t: 0, hand: [292, 327], elbow: [270, 300], tip: [410, 410], lean: 0 },
      { t: 0.34, hand: [262, 248], elbow: [286, 270], tip: [350, 174], lean: -5 },
      { t: 0.54, hand: [280, 274], elbow: [295, 295], tip: [390, 220], lean: 2 },
      { t: 0.63, hand: [304, 326], elbow: [284, 307], tip: [414, 410], lean: 7 },
      { t: 0.82, hand: [266, 228], elbow: [296, 255], tip: [432, 190], lean: 9 },
      { t: 1, hand: [250, 212], elbow: [284, 240], tip: [470, 260], lean: 3 }
    ];
    let a = keys[0];
    let b = keys[1];
    for (let i = 0; i < keys.length - 1; i += 1) {
      if (p >= keys[i].t && p <= keys[i + 1].t) { a = keys[i]; b = keys[i + 1]; break; }
    }
    const t = ease(clamp((p - a.t) / Math.max(0.001, b.t - a.t), 0, 1));
    return {
      hand: [lerp(a.hand[0], b.hand[0], t), lerp(a.hand[1], b.hand[1], t)],
      elbow: [lerp(a.elbow[0], b.elbow[0], t), lerp(a.elbow[1], b.elbow[1], t)],
      tip: [lerp(a.tip[0], b.tip[0], t), lerp(a.tip[1], b.tip[1], t)],
      lean: lerp(a.lean, b.lean, t)
    };
  }

  function drawGolfer() {
    const p = swingPose();
    const pose = swingKeyframes(p);
    const x = 250;
    const ground = 425;
    rect(x - 98, ground + 10, 170, 11, "rgba(9,48,38,.74)");
    rect(x + 39, ground + 3, 43, 9, "#0a172d");
    rect(x - 26, ground + 2, 34, 8, "#eef5ff");
    polygon([[x - 19, ground - 92], [x + 10, ground - 92], [x + 2, ground - 18], [x - 13, ground - 18]], "#d68443");
    polygon([[x + 13, ground - 91], [x + 39, ground - 88], [x + 43, ground - 12], [x + 27, ground - 12]], "#ee9a51");
    rect(x - 15, ground - 25, 18, 25, "#f5f6ed");
    rect(x - 5, ground - 8, 29, 10, "#f5f6ed");
    rect(x + 29, ground - 19, 17, 20, "#f7f7ee");
    rect(x + 34, ground - 6, 36, 14, "#11172b");
    polygon([[x - 26, ground - 145], [x + 30, ground - 144], [x + 43, ground - 88], [x - 18, ground - 88]], "#f3e9d2");
    rect(x - 31, ground - 145, 76, 12, "#fff7df");
    rect(x - 3, ground - 141, 9, 48, "#c8bea9");
    polygon([[x - 30 + pose.lean, ground - 208], [x + 21 + pose.lean, ground - 208], [x + 33, ground - 143], [x - 25, ground - 143]], "#123776");
    rect(x - 24 + pose.lean, ground - 213, 46, 12, "#194288");
    polygon([[x - 22 + pose.lean, ground - 208], [x - 40, ground - 172], [x - 21, ground - 151], [x - 3, ground - 192]], "#e58943");
    const shoulder = [x + 16 + pose.lean, ground - 196];
    pixelLine(shoulder[0], shoulder[1], pose.elbow[0], pose.elbow[1], 18, "#f29b50");
    pixelLine(pose.elbow[0], pose.elbow[1], pose.hand[0], pose.hand[1], 16, "#df813c");
    pixelLine(x - 3 + pose.lean, ground - 192, pose.hand[0] - 3, pose.hand[1] + 2, 14, "#ef9850");
    rect(pose.hand[0] - 6, pose.hand[1] - 5, 13, 13, "#7a3a20");
    rect(x - 17 + pose.lean, ground - 239, 40, 34, "#f09a51");
    rect(x + 13 + pose.lean, ground - 231, 18, 23, "#f5a25c");
    rect(x - 24 + pose.lean, ground - 251, 43, 17, "#f5f4e9");
    rect(x + 9 + pose.lean, ground - 245, 31, 11, "#f5f4e9");
    rect(x - 23 + pose.lean, ground - 258, 28, 9, "#0a1a31");
    rect(x + 1 + pose.lean, ground - 251, 18, 9, "#173970");
    pixelLine(pose.hand[0], pose.hand[1], pose.tip[0], pose.tip[1], 7, "#07152a");
    pixelLine(pose.tip[0] - 10, pose.tip[1] - 3, pose.tip[0] + 8, pose.tip[1] + 4, 10, "#0b1525");
  }

  function drawBallAndFlight() {
    const ballX = 414;
    const ballY = 410;
    if (state.phase !== "swing" || state.swingTime < 0.63) {
      rect(ballX - 6, ballY - 7, 12, 12, "#ffffff");
      rect(ballX - 2, ballY + 5, 5, 12, "#122d30");
      rect(ballX - 11, ballY + 16, 25, 5, "#173c32");
      return;
    }
    const p = clamp((state.swingTime - 0.63) / 0.83, 0, 1);
    const x = ballX + p * 610;
    const y = ballY - Math.sin(p * Math.PI) * 245 - p * 62;
    for (let i = 1; i <= 4; i += 1) {
      const tp = clamp(p - i * 0.025, 0, 1);
      const tx = ballX + tp * 610;
      const ty = ballY - Math.sin(tp * Math.PI) * 245 - tp * 62;
      rect(tx - 3, ty - 3, 7, 7, `rgba(255,255,255,${0.5 - i * 0.09})`);
    }
    rect(x - 7, y - 7, 14, 14, "#ffffff");
    rect(x - 3, y - 3, 4, 4, "#d4e7ef");
  }

  function drawImpactParticles() {
    state.particles.forEach((particle, index) => rect(particle.x, particle.y, index % 2 ? 5 : 7, index % 2 ? 5 : 7, index % 3 ? "#79c85d" : "#3b843d"));
  }

  function centerFor(t) {
    const hole = currentHole();
    return 480 + hole.curve * 210 * Math.sin(Math.PI * t) + Math.sin(Math.PI * t * 2) * 24;
  }

  function mapPoint(along, lateral) {
    const t = clamp(along / currentHole().length, -0.08, 1.14);
    return {
      x: centerFor(t) + lateral * 4.2,
      y: lerp(472, 137, t)
    };
  }

  function mapHazardPoint(hazard) {
    return { x: centerFor(hazard.t) + hazard.offset * 152, y: lerp(472, 137, hazard.t) };
  }

  function drawMapGround() {
    rect(0, 0, W, H, "#123f2d");
    const tile = 48;
    for (let y = 0; y < H; y += tile) {
      for (let x = 0; x < W; x += tile) {
        if ((x / tile + y / tile) % 2 === 0) rect(x, y, tile, tile, "#174832");
      }
    }
    for (let i = 0; i < 95; i += 1) {
      const x = (i * 83 + state.holeIndex * 47) % W;
      const y = (i * 131 + 89) % H;
      rect(x, y, 4, 6, i % 3 ? "#1e5f3e" : "#734730");
    }
  }

  function drawHoleMap() {
    drawMapGround();
    const left = [];
    const right = [];
    for (let i = 0; i <= 22; i += 1) {
      const t = i / 22;
      const half = lerp(48, 82, t) + Math.sin(t * Math.PI) * 16;
      left.push([centerFor(t) - half, lerp(472, 137, t)]);
      right.unshift([centerFor(t) + half, lerp(472, 137, t)]);
    }
    polygon([...left, ...right], "#52aa48");
    ctx.strokeStyle = "#88d665";
    ctx.lineWidth = 5;
    ctx.beginPath();
    [...left, ...right].forEach(([x, y], index) => index ? ctx.lineTo(snap(x), snap(y)) : ctx.moveTo(snap(x), snap(y)));
    ctx.closePath();
    ctx.stroke();
    for (let i = 0; i < 11; i += 1) {
      const t = i / 10;
      const p = mapPoint(t * currentHole().length, 0);
      rect(p.x - 3, p.y - 3, 7, 7, i % 2 ? "#5cb650" : "#489a42");
    }
    currentHole().hazards.forEach((hazard) => {
      const p = mapHazardPoint(hazard);
      const rx = hazard.rx * 140;
      const ry = hazard.ry * 325;
      ctx.fillStyle = hazard.type === "water" ? "#2389e8" : hazard.type === "bunker" ? "#f2d489" : "#28643b";
      ctx.beginPath();
      ctx.ellipse(snap(p.x), snap(p.y), snap(rx), snap(ry), 0, 0, Math.PI * 2);
      ctx.fill();
      if (hazard.type === "water") {
        rect(p.x - rx * .55, p.y - 2, rx * .7, 5, "#60b6ff");
        rect(p.x, p.y + ry * .34, rx * .56, 5, "#60b6ff");
      }
    });
    const green = mapPoint(currentHole().length, 0);
    ctx.fillStyle = "#65cc5e";
    ctx.beginPath();
    ctx.ellipse(snap(green.x), snap(green.y), 91, 55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#b4ee82";
    ctx.lineWidth = 5;
    ctx.stroke();
    rect(green.x + 4, green.y - 65, 6, 68, "#fff8df");
    rect(green.x + 10, green.y - 65, 33, 18, "#f34852");
    rect(green.x - 5, green.y - 3, 20, 7, "#17382a");
    const tee = mapPoint(0, 0);
    rect(tee.x - 22, tee.y - 8, 44, 16, "#76cb60");
  }

  function drawMapBall() {
    let along = state.ballAlong;
    let lateral = state.ballLateral;
    let progress = 1;
    if (state.phase === "mapFlight") {
      progress = ease(clamp(state.mapTime / 2.55, 0, 1));
      along = lerp(state.shotResult.start.along, state.shotResult.end.along, progress);
      lateral = lerp(state.shotResult.start.lateral, state.shotResult.end.lateral, progress);
      for (let i = 1; i < 8; i += 1) {
        const t = clamp(progress - i * .055, 0, 1);
        const trail = mapPoint(lerp(state.shotResult.start.along, state.shotResult.end.along, t), lerp(state.shotResult.start.lateral, state.shotResult.end.lateral, t));
        rect(trail.x - 3, trail.y - 3, 6, 6, `rgba(255,255,255,${0.62 - i * .07})`);
      }
    } else if (state.shotResult) {
      along = state.shotResult.end.along;
      lateral = state.shotResult.end.lateral;
    }
    const ball = mapPoint(along, lateral);
    const lift = state.phase === "mapFlight" ? Math.sin(progress * Math.PI) * 35 : 0;
    rect(ball.x - 11, ball.y - 11 - lift, 22, 22, "#07162b");
    rect(ball.x - 7, ball.y - 7 - lift, 14, 14, "#ffffff");
    if (state.phase === "mapFlight") {
      rect(ball.x - 15, ball.y + 11, 30, 5, "rgba(7,22,43,.42)");
    }
  }

  function drawMapLabels() {
    ctx.textAlign = "center";
    ctx.font = "900 14px 'Courier New', monospace";
    ctx.fillStyle = "#fff7d6";
    const green = mapPoint(currentHole().length, 0);
    ctx.fillText(`${currentHole().length}m · PAR 3`, green.x, 124);
    ctx.textAlign = "left";
  }

  function drawPuttingGreen() {
    rect(0, 0, W, H, "#286d3e");
    for (let y = 0; y < H; y += 28) {
      rect(0, y, W, 14, y % 56 ? "#2d7842" : "#327f46");
    }
    ctx.fillStyle = "#5bbf55";
    ctx.beginPath();
    ctx.ellipse(500, 310, 380, 225, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8ad66a";
    ctx.lineWidth = 18;
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(500, 310, 365, 210, -0.08, 0, Math.PI * 2);
    ctx.clip();
    for (let x = 110; x < 890; x += 34) rect(x, 90, 17, 430, "rgba(255,255,255,.035)");
    ctx.restore();
    const cup = state.cup || { x: 610, y: 178 };
    rect(cup.x + 5, cup.y - 102, 7, 102, "#fff8df");
    rect(cup.x + 12, cup.y - 102, 40, 21, "#f0444e");
    ctx.fillStyle = "#08271e";
    ctx.beginPath();
    ctx.ellipse(cup.x, cup.y, 11, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    polygon([[cup.x + 10, cup.y + 3], [cup.x + 128, cup.y + 55], [cup.x + 118, cup.y + 61]], "rgba(9,55,38,.35)");

    const hole = currentHole();
    const arrowX = 250;
    const arrowY = 210;
    const ax = hole.break[0] * 80;
    const ay = hole.break[1] * 70;
    pixelLine(arrowX, arrowY, arrowX + ax, arrowY + ay, 7, "rgba(255,247,214,.62)");
    polygon([[arrowX + ax, arrowY + ay], [arrowX + ax - Math.sign(ax || 1) * 14, arrowY + ay - 10], [arrowX + ax - Math.sign(ax || 1) * 14, arrowY + ay + 10]], "rgba(255,247,214,.62)");
    ctx.fillStyle = "rgba(255,247,214,.75)";
    ctx.font = "900 13px 'Courier New', monospace";
    ctx.fillText("BREAK", 210, 185);

    if (state.puttBall) {
      const recommended = clamp(state.puttDistanceMeters * 12, 56, 185);
      const toCupX = cup.x - state.puttBall.x;
      const toCupY = cup.y - state.puttBall.y;
      const distance = Math.hypot(toCupX, toCupY) || 1;
      const guideX = state.puttBall.x + toCupX / distance * recommended;
      const guideY = state.puttBall.y + toCupY / distance * recommended;
      ctx.setLineDash([10, 9]);
      ctx.strokeStyle = "rgba(255,247,214,.64)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(state.puttBall.x, state.puttBall.y);
      ctx.lineTo(guideX, guideY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(255,214,75,.75)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(state.puttBall.x, state.puttBall.y, recommended, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (state.swipe && state.puttBall) {
      const dx = state.swipe.current.x - state.swipe.start.x;
      const dy = state.swipe.current.y - state.swipe.start.y;
      pixelLine(state.puttBall.x, state.puttBall.y, state.puttBall.x + dx, state.puttBall.y + dy, 8, "#ffd64b");
      const length = Math.hypot(dx, dy);
      if (length > 1) polygon([[state.puttBall.x + dx, state.puttBall.y + dy], [state.puttBall.x + dx - dx / length * 22 - dy / length * 10, state.puttBall.y + dy - dy / length * 22 + dx / length * 10], [state.puttBall.x + dx - dx / length * 22 + dy / length * 10, state.puttBall.y + dy - dy / length * 22 - dx / length * 10]], "#ffd64b");
    }

    if (state.puttBall) {
      rect(state.puttBall.x - 10, state.puttBall.y + 7, 22, 7, "rgba(11,52,37,.35)");
      rect(state.puttBall.x - 8, state.puttBall.y - 8, 16, 16, "#ffffff");
      rect(state.puttBall.x - 3, state.puttBall.y - 4, 4, 4, "#cbdfe7");
    }
  }

  function drawIntroBackdrop() {
    drawSideBackground();
    drawGolfer();
    drawBallAndFlight();
    rect(0, 0, W, H, "rgba(5,18,34,.18)");
  }

  function draw() {
    ctx.imageSmoothingEnabled = false;
    if (["mapFlight", "mapLanded"].includes(state.phase)) {
      drawHoleMap();
      drawMapBall();
      drawMapLabels();
    } else if (["puttReady", "puttFlight", "holeComplete"].includes(state.phase) && state.puttBall) {
      drawPuttingGreen();
    } else if (["intro", "roundComplete"].includes(state.phase)) {
      drawIntroBackdrop();
    } else {
      ctx.save();
      if (state.cameraAngle === 1) {
        ctx.translate(W, 0);
        ctx.scale(-1, 1);
      } else if (state.cameraAngle === 2) {
        ctx.translate(W / 2, H / 2);
        ctx.scale(1.08, 1.08);
        ctx.translate(-W / 2, -H / 2);
      }
      drawSideBackground();
      drawGolfer();
      drawBallAndFlight();
      drawImpactParticles();
      ctx.restore();
    }
  }

  function frame(now) {
    const dt = Math.min(0.033, (now - state.lastTime) / 1000 || 0);
    state.lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function pointerPosition(event) {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * W / bounds.width,
      y: (event.clientY - bounds.top) * H / bounds.height
    };
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (state.phase !== "puttReady") return;
    ensureAudio();
    const point = pointerPosition(event);
    state.swipe = { pointerId: event.pointerId, start: point, current: point };
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!state.swipe || state.swipe.pointerId !== event.pointerId) return;
    state.swipe.current = pointerPosition(event);
  });

  function finishSwipe(event) {
    if (!state.swipe || state.swipe.pointerId !== event.pointerId) return;
    const point = pointerPosition(event);
    const dx = point.x - state.swipe.start.x;
    const dy = point.y - state.swipe.start.y;
    state.swipe = null;
    launchPutt(dx, dy);
  }

  canvas.addEventListener("pointerup", finishSwipe);
  canvas.addEventListener("pointercancel", (event) => {
    if (state.swipe?.pointerId === event.pointerId) state.swipe = null;
  });

  ui.actionButton.addEventListener("click", handleAction);
  ui.clubButton.addEventListener("click", () => {
    if (!['power', 'aim'].includes(state.phase)) return;
    state.clubIndex = (state.clubIndex + 1) % CLUBS.length;
    state.lockedPower = null;
    if (state.phase === "aim") beginFullShot();
    tone("click");
    syncUI();
  });
  ui.continueButton.addEventListener("click", () => {
    ensureAudio();
    if (state.phase === "mapLanded") continueAfterMap();
    else if (state.phase === "holeComplete") nextHoleOrFinish();
  });
  ui.playButton.addEventListener("click", beginRound);
  ui.practiceButton.addEventListener("click", () => {
    setDialog(ui.introModal, false);
    prepareHole(0, true);
    ensureAudio();
  });
  ui.replayButton.addEventListener("click", beginRound);
  ui.scoreButton.addEventListener("click", () => { updateScorecard(); setDialog(ui.scoreModal, true); });
  ui.closeScore.addEventListener("click", () => setDialog(ui.scoreModal, false));
  ui.soundButton.addEventListener("click", () => {
    state.muted = !state.muted;
    ui.soundButton.textContent = state.muted ? "×" : "♪";
    ui.soundButton.setAttribute("aria-label", state.muted ? "Turn sound on" : "Mute sound");
    if (!state.muted) tone("click");
  });

  window.addEventListener("keydown", (event) => {
    if ((event.code === "Space" || event.code === "Enter") && (state.phase === "power" || state.phase === "aim")) {
      event.preventDefault();
      handleAction();
    }
    if (event.key.toLowerCase() === "m") ui.soundButton.click();
  });

  document.addEventListener("visibilitychange", () => { state.lastTime = performance.now(); });
  updateScorecard();
  syncUI();
  requestAnimationFrame(frame);
})();
