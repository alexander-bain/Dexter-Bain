import {
  BOAT_COST,
  CELLS_PER_TROOP,
  GRID_HEIGHT,
  GRID_WIDTH,
  MISSILE_COST,
  PLAYER_COLORS,
  cellCoords,
  cellIndex,
  clamp,
  createWorldGrid,
  decodeGrid,
  hexToRgb,
  neighbors4,
} from "./game-core.js";

const API_BASE = window.WORLD_COMMAND_API_BASE ||
  (new URLSearchParams(location.search).get("api")) ||
  (["localhost", "127.0.0.1"].includes(location.hostname)
    ? "http://127.0.0.1:8080"
    : "https://dexter-bain.onrender.com");
const POLL_MS = 430;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const els = {
  menuScreen: $("#menuScreen"),
  lobbyScreen: $("#lobbyScreen"),
  gameScreen: $("#gameScreen"),
  connectionPill: $("#connectionPill"),
  nameInput: $("#nameInput"),
  photoInput: $("#photoInput"),
  avatarPreview: $("#avatarPreview"),
  avatarInitial: $("#avatarInitial"),
  avatarImage: $("#avatarImage"),
  colorPicker: $("#colorPicker"),
  territorySelect: $("#territorySelect"),
  winSelect: $("#winSelect"),
  hostAiRange: $("#hostAiRange"),
  hostAiOutput: $("#hostAiOutput"),
  practiceAiRange: $("#practiceAiRange"),
  practiceAiOutput: $("#practiceAiOutput"),
  createButton: $("#createButton"),
  joinButton: $("#joinButton"),
  practiceButton: $("#practiceButton"),
  joinCodeInput: $("#joinCodeInput"),
  roomCodeText: $("#roomCodeText"),
  copyCodeButton: $("#copyCodeButton"),
  rosterTitle: $("#rosterTitle"),
  rosterList: $("#rosterList"),
  addAiButton: $("#addAiButton"),
  lobbyTerritories: $("#lobbyTerritories"),
  lobbyWin: $("#lobbyWin"),
  lobbyNameInput: $("#lobbyNameInput"),
  lobbyColorPicker: $("#lobbyColorPicker"),
  lobbyPhotoInput: $("#lobbyPhotoInput"),
  saveProfileButton: $("#saveProfileButton"),
  leaveLobbyButton: $("#leaveLobbyButton"),
  lobbyStatus: $("#lobbyStatus"),
  startMatchButton: $("#startMatchButton"),
  gameRoomCode: $("#gameRoomCode"),
  troopCount: $("#troopCount"),
  controlPercent: $("#controlPercent"),
  leaderboard: $("#leaderboard"),
  objectiveTitle: $("#objectiveTitle"),
  objectiveText: $("#objectiveText"),
  objectiveFill: $("#objectiveFill"),
  warFeed: $("#warFeed"),
  placementBanner: $("#placementBanner"),
  placementCountdown: $("#placementCountdown"),
  placementHelp: $("#placementHelp"),
  mapInstruction: $("#mapInstruction"),
  mapTooltip: $("#mapTooltip"),
  targetReticle: $("#targetReticle"),
  mapStage: $("#mapStage"),
  canvas: $("#worldCanvas"),
  orderTray: $("#orderTray"),
  closeTrayButton: $("#closeTrayButton"),
  trayKicker: $("#trayKicker"),
  trayTitle: $("#trayTitle"),
  trayDescription: $("#trayDescription"),
  trayPrompt: $("#trayPrompt"),
  troopSliderWrap: $("#troopSliderWrap"),
  orderAmountRange: $("#orderAmountRange"),
  orderAmountOutput: $("#orderAmountOutput"),
  boatCostText: $("#boatCostText"),
  missileCostText: $("#missileCostText"),
  gameMenuButton: $("#gameMenuButton"),
  gameOverPanel: $("#gameOverPanel"),
  winnerEmblem: $("#winnerEmblem"),
  winnerTitle: $("#winnerTitle"),
  winnerText: $("#winnerText"),
  rematchButton: $("#rematchButton"),
  toastStack: $("#toastStack"),
};

const ctx = els.canvas.getContext("2d");
const mapLayer = document.createElement("canvas");
const mapCtx = mapLayer.getContext("2d");
const photoCache = new Map();

const app = {
  playerId: getPlayerId(),
  selectedColor: PLAYER_COLORS[0],
  profilePhoto: "",
  room: null,
  grid: createWorldGrid(),
  mapVersion: -1,
  pollTimer: null,
  polling: false,
  requestBusy: false,
  serverOffset: 0,
  connectionFailures: 0,
  screen: "menu",
  activeOrder: "",
  changes: [],
  particles: [],
  centroids: new Map(),
  metrics: { scale: 1, x: 0, y: 0, width: GRID_WIDTH, height: GRID_HEIGHT, dpr: 1 },
  hoverIndex: -1,
  seenEffects: new Set(),
  feed: [],
  lastState: "",
};

function getPlayerId() {
  const key = "world-command-player-v2";
  let id = "";
  try { id = localStorage.getItem(key) || ""; } catch {}
  if (!/^[a-zA-Z0-9_-]{8,90}$/.test(id)) {
    id = crypto.randomUUID ? crypto.randomUUID() : `wc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try { localStorage.setItem(key, id); } catch {}
  }
  return id;
}

function setConnection(mode, label) {
  els.connectionPill.classList.toggle("is-waiting", mode === "waiting");
  els.connectionPill.classList.toggle("is-offline", mode === "offline");
  els.connectionPill.querySelector("b").textContent = label;
}

function toast(message, error = false) {
  const node = document.createElement("div");
  node.className = `toast${error ? " is-error" : ""}`;
  node.textContent = message;
  els.toastStack.append(node);
  window.setTimeout(() => node.remove(), 3600);
}

function showScreen(name) {
  app.screen = name;
  els.menuScreen.hidden = name !== "menu";
  els.lobbyScreen.hidden = name !== "lobby";
  els.gameScreen.hidden = name !== "game";
  if (name === "game") window.requestAnimationFrame(resizeCanvas);
}

function initials(name) {
  return String(name || "C").trim().slice(0, 1).toUpperCase() || "C";
}

function currentProfile() {
  return {
    name: els.nameInput.value.trim().slice(0, 18) || "Commander",
    color: app.selectedColor,
    photo: app.profilePhoto,
  };
}

function saveLocalProfile() {
  const profile = currentProfile();
  try {
    localStorage.setItem("world-command-profile-v2", JSON.stringify(profile));
  } catch {}
}

function loadLocalProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem("world-command-profile-v2") || "null");
    if (saved?.name) els.nameInput.value = String(saved.name).slice(0, 18);
    if (PLAYER_COLORS.includes(saved?.color)) app.selectedColor = saved.color;
    if (typeof saved?.photo === "string" && saved.photo.length < 28000) app.profilePhoto = saved.photo;
  } catch {}
  refreshAvatar();
}

function refreshAvatar() {
  els.avatarPreview.style.background = app.selectedColor;
  els.avatarInitial.textContent = initials(els.nameInput.value);
  if (app.profilePhoto) {
    els.avatarImage.src = app.profilePhoto;
    els.avatarImage.hidden = false;
    els.avatarInitial.hidden = true;
  } else {
    els.avatarImage.hidden = true;
    els.avatarInitial.hidden = false;
  }
}

function makeColorPicker(container, selected, taken = [], onPick) {
  container.innerHTML = "";
  PLAYER_COLORS.forEach((color) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "color-swatch";
    button.style.setProperty("--swatch", color);
    button.setAttribute("aria-label", `Choose ${color}`);
    const unavailable = taken.includes(color) && color !== selected;
    button.classList.toggle("is-selected", color === selected);
    button.classList.toggle("is-taken", unavailable);
    button.disabled = unavailable;
    button.addEventListener("click", () => onPick(color));
    container.append(button);
  });
}

function renderMenuColors() {
  makeColorPicker(els.colorPicker, app.selectedColor, [], (color) => {
    app.selectedColor = color;
    renderMenuColors();
    refreshAvatar();
  });
}

async function compressPhoto(file) {
  if (!file || !file.type.startsWith("image/")) throw new Error("Choose a PNG, JPEG, or WebP image.");
  const image = await createImageBitmap(file);
  const size = 72;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  const crop = Math.min(image.width, image.height);
  const sx = (image.width - crop) / 2;
  const sy = (image.height - crop) / 2;
  context.drawImage(image, sx, sy, crop, crop, 0, 0, size, size);
  image.close?.();
  let data = canvas.toDataURL("image/webp", 0.72);
  if (data.length > 27000) data = canvas.toDataURL("image/jpeg", 0.62);
  if (data.length > 28000) throw new Error("That photo is too detailed. Try a simpler crop.");
  return data;
}

async function readPhotoInput(input) {
  const file = input.files?.[0];
  if (!file) return;
  try {
    app.profilePhoto = await compressPhoto(file);
    refreshAvatar();
    if (input === els.lobbyPhotoInput) {
      toast("New photo ready. Press Save to share it.");
    }
  } catch (error) {
    toast(error.message, true);
  }
  input.value = "";
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  let payload = {};
  try { payload = await response.json(); } catch {}
  if (!response.ok) throw new Error(payload.error || "The game server did not answer.");
  return payload;
}

async function busyAction(button, action) {
  if (app.requestBusy) return;
  app.requestBusy = true;
  const original = button?.querySelector("span")?.textContent || button?.textContent;
  if (button) button.disabled = true;
  setConnection("waiting", "Connecting");
  try {
    await action();
    setConnection("online", "Live");
  } catch (error) {
    toast(error.message, true);
    setConnection("offline", "Retry");
  } finally {
    app.requestBusy = false;
    if (button) button.disabled = false;
    if (button?.querySelector("span") && original) button.querySelector("span").textContent = original;
  }
}

function activateRoom(payload) {
  saveLocalProfile();
  receiveRoom(payload);
  startPolling();
}

async function createRoom(aiCount, autoStart = false) {
  const payload = await api("/api/world-command/rooms", {
    method: "POST",
    body: JSON.stringify({
      playerId: app.playerId,
      profile: currentProfile(),
      rules: {
        startingTerritories: Number(els.territorySelect.value),
        winCondition: els.winSelect.value,
      },
      aiCount,
    }),
  });
  activateRoom(payload);
  if (autoStart) {
    const started = await api(`/api/world-command/rooms/${payload.roomCode}/start`, {
      method: "POST",
      body: JSON.stringify({ playerId: app.playerId }),
    });
    receiveRoom(started);
  }
}

async function joinRoom() {
  const code = els.joinCodeInput.value.replace(/\D/g, "").slice(0, 6);
  els.joinCodeInput.value = code;
  if (code.length !== 6) throw new Error("Enter the full six-digit battle code.");
  const payload = await api(`/api/world-command/rooms/${code}/join`, {
    method: "POST",
    body: JSON.stringify({ playerId: app.playerId, profile: currentProfile() }),
  });
  activateRoom(payload);
}

function stopPolling() {
  if (app.pollTimer) clearInterval(app.pollTimer);
  app.pollTimer = null;
  app.polling = false;
}

function startPolling() {
  stopPolling();
  app.pollTimer = setInterval(pollRoom, POLL_MS);
}

async function pollRoom() {
  if (!app.room || app.polling) return;
  app.polling = true;
  try {
    const payload = await api(`/api/world-command/rooms/${app.room.roomCode}?playerId=${encodeURIComponent(app.playerId)}`);
    receiveRoom(payload);
    app.connectionFailures = 0;
    setConnection("online", "Live");
  } catch (error) {
    app.connectionFailures += 1;
    if (app.connectionFailures > 2) setConnection("offline", "Reconnecting");
  } finally {
    app.polling = false;
  }
}

function receiveRoom(payload) {
  if (!payload?.roomCode) return;
  const previousRoom = app.room;
  const previousGrid = app.grid;
  app.room = payload;
  app.serverOffset = Number(payload.serverNow || Date.now()) - Date.now();
  const me = getMe();
  if (me) {
    app.selectedColor = me.color;
    if (me.photo) app.profilePhoto = me.photo;
  }

  if (payload.grid) {
    const nextGrid = decodeGrid(payload.grid);
    if (nextGrid.length === GRID_WIDTH * GRID_HEIGHT) {
      if (previousRoom?.grid && previousGrid.length === nextGrid.length && payload.version !== app.mapVersion) {
        recordGridChanges(previousGrid, nextGrid);
      }
      app.grid = nextGrid;
      if (payload.version !== app.mapVersion) {
        app.mapVersion = payload.version;
        rebuildMapLayer();
      }
    }
  }
  recordEffects(payload.effects || []);
  if (payload.state === "lobby") {
    showScreen("lobby");
    renderLobby();
  } else {
    showScreen("game");
    renderGameUi();
  }
  app.lastState = payload.state;
}

function getMe() {
  return app.room?.players?.find((player) => player.id === app.playerId) || null;
}

function playerForCode(code) {
  return app.room?.players?.find((player) => player.slot + 2 === code) || null;
}

function recordGridChanges(previous, next) {
  const now = performance.now();
  const changed = [];
  for (let i = 0; i < next.length; i += 1) {
    if (previous[i] === next[i]) continue;
    changed.push({ index: i, from: previous[i], to: next[i], started: now + Math.random() * 180 });
  }
  if (changed.length > 1600) {
    const stride = Math.ceil(changed.length / 1600);
    app.changes.push(...changed.filter((_, index) => index % stride === 0));
  } else {
    app.changes.push(...changed);
  }
  app.changes = app.changes.slice(-1900);
  const particleSource = changed.length > 80 ? changed.filter((_, index) => index % Math.ceil(changed.length / 80) === 0) : changed;
  for (const change of particleSource.slice(0, 100)) {
    const [x, y] = cellCoords(change.index);
    app.particles.push({ x: x + 0.5, y: y + 0.5, vx: (Math.random() - 0.5) * 0.8, vy: -0.4 - Math.random() * 0.8, life: 500 + Math.random() * 500, born: now, code: change.to });
  }
}

function recordEffects(effects) {
  for (const effect of effects) {
    if (app.seenEffects.has(effect.id)) continue;
    app.seenEffects.add(effect.id);
    const player = app.room?.players?.find((candidate) => candidate.id === effect.playerId);
    if (!player) continue;
    const messages = {
      boat: `${player.name} launched a landing fleet.`,
      missile: `${player.name} fired a missile.`,
      attack: `${player.name} opened a border offensive.`,
      expand: `${player.name} expanded their frontier.`,
    };
    app.feed.unshift({ text: messages[effect.type] || `${player.name} issued an order.`, hot: effect.type === "missile" || effect.type === "attack" });
    app.feed = app.feed.slice(0, 8);
  }
}

function winLabel(rule) {
  return rule === "last" ? "Last one standing" : `Control ${rule}%`;
}

function renderLobby() {
  const room = app.room;
  const me = getMe();
  if (!room || !me) return;
  const isHost = room.hostId === app.playerId;
  els.roomCodeText.textContent = room.roomCode;
  els.rosterTitle.textContent = `${room.players.length} / 10 commanders`;
  els.lobbyTerritories.textContent = `${room.rules.startingTerritories} each`;
  els.lobbyWin.textContent = winLabel(room.rules.winCondition);
  els.addAiButton.hidden = !isHost;
  els.startMatchButton.hidden = !isHost;
  els.lobbyStatus.textContent = isHost
    ? room.players.length < 2 ? "Add an AI or wait for another commander." : "Everyone in? Launch the 10-second deployment."
    : "Waiting for the host to launch the match.";
  els.startMatchButton.disabled = room.players.length < 2;

  if (document.activeElement !== els.lobbyNameInput) els.lobbyNameInput.value = me.name;
  const taken = room.players.filter((player) => player.id !== me.id).map((player) => player.color);
  makeColorPicker(els.lobbyColorPicker, app.selectedColor, taken, (color) => {
    app.selectedColor = color;
    renderLobby();
  });

  els.rosterList.innerHTML = "";
  room.players.forEach((player) => {
    const card = document.createElement("div");
    card.className = "roster-player";
    card.style.setProperty("--player-color", player.color);
    const avatar = player.photo
      ? `<div class="roster-avatar"><img alt="" src="${player.photo}"></div>`
      : `<div class="roster-avatar">${initials(player.name)}</div>`;
    card.innerHTML = `${avatar}<div class="roster-meta"><b>${escapeHtml(player.name)}${player.id === me.id ? " (you)" : ""}</b><small>${player.isHost ? "Host" : player.isAi ? "AI commander" : "Online"}</small></div>`;
    if (isHost && player.isAi) {
      const remove = document.createElement("button");
      remove.className = "remove-ai";
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Remove ${player.name}`);
      remove.addEventListener("click", () => removeAi(player.id));
      card.append(remove);
    }
    els.rosterList.append(card);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

async function removeAi(targetId) {
  try {
    const payload = await api(`/api/world-command/rooms/${app.room.roomCode}/ai/${encodeURIComponent(targetId)}`, {
      method: "DELETE",
      body: JSON.stringify({ playerId: app.playerId }),
    });
    receiveRoom(payload);
  } catch (error) {
    toast(error.message, true);
  }
}

function renderGameUi() {
  const room = app.room;
  const me = getMe();
  if (!room || !me) return;
  els.gameRoomCode.textContent = room.roomCode;
  els.troopCount.textContent = Math.floor(me.troops).toLocaleString();
  els.controlPercent.textContent = `${me.landPercent.toFixed(1)}%`;
  els.boatCostText.textContent = room.economy?.boatCost ?? BOAT_COST;
  els.missileCostText.textContent = room.economy?.missileCost ?? MISSILE_COST;

  const active = room.state === "active" && me.alive;
  $$(".order-button").forEach((button) => {
    const order = button.dataset.order;
    const cost = order === "boat" ? room.economy.boatCost : order === "missile" ? room.economy.missileCost : 1;
    button.disabled = !active || me.troops < cost;
    button.classList.toggle("is-active", app.activeOrder === order);
  });

  const maxAmount = Math.max(1, Math.floor(me.troops));
  els.orderAmountRange.max = String(maxAmount);
  if (Number(els.orderAmountRange.value) > maxAmount) els.orderAmountRange.value = String(maxAmount);
  els.orderAmountOutput.textContent = els.orderAmountRange.value;

  els.placementBanner.hidden = room.state !== "placement";
  if (room.state === "placement") {
    const remaining = Math.max(0, Math.ceil((room.placementEndsAt - (Date.now() + app.serverOffset)) / 1000));
    els.placementCountdown.textContent = remaining;
    const left = Math.max(0, room.rules.startingTerritories - me.picks);
    els.placementHelp.textContent = left ? `Choose ${left} more starting ${left === 1 ? "territory" : "territories"}` : "Positions locked — stand by";
    els.mapInstruction.textContent = left ? "Tap open land. Starting points must be far apart." : "Your deployment is ready. The battle begins when the timer ends.";
  } else if (room.state === "active") {
    els.mapInstruction.textContent = app.activeOrder ? instructionForOrder(app.activeOrder) : "Choose an order below, then select a target on the map.";
  } else if (room.state === "ended") {
    els.mapInstruction.textContent = "The battle is complete.";
  }

  renderLeaderboard();
  renderObjective();
  renderFeed();
  renderGameOver();
}

function renderLeaderboard() {
  const players = [...app.room.players].sort((a, b) => b.land - a.land || b.troops - a.troops);
  els.leaderboard.innerHTML = "";
  players.forEach((player, index) => {
    const row = document.createElement("div");
    row.className = `leader-row${player.id === app.playerId ? " is-you" : ""}`;
    row.style.setProperty("--player-color", player.color);
    const avatar = player.photo ? `<img alt="" src="${player.photo}">` : initials(player.name);
    row.innerHTML = `<span class="leader-rank">${index + 1}</span><span class="leader-color">${avatar}</span><span class="leader-name"><b>${escapeHtml(player.name)}</b><small>${player.alive ? `${player.troops.toLocaleString()} troops` : "eliminated"}</small></span><span class="leader-share">${player.landPercent.toFixed(1)}%</span>`;
    els.leaderboard.append(row);
  });
}

function renderObjective() {
  const me = getMe();
  const rule = app.room.rules.winCondition;
  els.objectiveTitle.textContent = winLabel(rule);
  if (rule === "last") {
    const alive = app.room.players.filter((player) => player.alive).length;
    els.objectiveText.textContent = `${alive} commands remain. Eliminate every rival.`;
    els.objectiveFill.style.width = `${clamp((1 - (alive - 1) / Math.max(1, app.room.players.length - 1)) * 100, 0, 100)}%`;
  } else {
    els.objectiveText.textContent = `Reach ${rule}% of all land before another commander.`;
    els.objectiveFill.style.width = `${clamp((me.landPercent / Number(rule)) * 100, 0, 100)}%`;
  }
}

function renderFeed() {
  if (!app.feed.length) return;
  els.warFeed.innerHTML = app.feed.map((item) => `<p class="${item.hot ? "is-hot" : ""}">${escapeHtml(item.text)}</p>`).join("");
}

function renderGameOver() {
  const ended = app.room.state === "ended";
  els.gameOverPanel.hidden = !ended;
  if (!ended) return;
  const winner = app.room.players.find((player) => player.id === app.room.winnerId);
  if (!winner) return;
  els.winnerEmblem.textContent = initials(winner.name);
  els.winnerEmblem.style.setProperty("--winner-color", winner.color);
  els.winnerTitle.textContent = winner.id === app.playerId ? "World secured" : `${winner.name} wins`;
  els.winnerText.textContent = winner.id === app.playerId
    ? `Your command finished with ${winner.landPercent.toFixed(1)}% of the world.`
    : `${winner.name} ended the battle with ${winner.landPercent.toFixed(1)}% of the world.`;
}

function instructionForOrder(order) {
  return ({
    expand: "Choose a neutral pixel touching your territory.",
    attack: "Choose rival land touching your border.",
    boat: "Choose a distant coastline for the landing fleet.",
    missile: "Choose any rival pixel to erase the surrounding territory.",
  })[order] || "Choose a target.";
}

function selectOrder(order) {
  const me = getMe();
  if (!me || app.room.state !== "active" || !me.alive) return;
  app.activeOrder = app.activeOrder === order ? "" : order;
  const config = {
    expand: ["GROUND ORDER", "Expand your border", `Each troop captures up to ${app.room.economy?.cellsPerTroop || CELLS_PER_TROOP} neutral pixels.`, "Choose a neutral border pixel"],
    attack: ["BORDER WAR", "Commit an attack force", "Send any number of available troops into adjacent rival territory.", "Choose a rival border pixel"],
    boat: ["NAVAL ORDER", "Launch a landing fleet", `${app.room.economy?.boatCost || BOAT_COST} troops buy a fleet and a new coastal beachhead.`, "Choose a distant coastline"],
    missile: ["STRIKE ORDER", "Launch a missile", `${app.room.economy?.missileCost || MISSILE_COST} troops erase rival control around the impact point.`, "Choose rival territory"],
  };
  if (!app.activeOrder) {
    els.orderTray.hidden = true;
  } else {
    const [kicker, title, description, prompt] = config[app.activeOrder];
    els.trayKicker.textContent = kicker;
    els.trayTitle.textContent = title;
    els.trayDescription.textContent = description;
    els.trayPrompt.textContent = prompt;
    els.troopSliderWrap.hidden = !["expand", "attack"].includes(app.activeOrder);
    els.orderTray.hidden = false;
  }
  renderGameUi();
}

function closeOrder() {
  app.activeOrder = "";
  els.orderTray.hidden = true;
  renderGameUi();
}

async function sendMapAction(target) {
  if (!app.room || app.requestBusy) return;
  if (app.room.state === "placement") {
    app.requestBusy = true;
    try {
      receiveRoom(await api(`/api/world-command/rooms/${app.room.roomCode}/pick`, {
        method: "POST",
        body: JSON.stringify({ playerId: app.playerId, target }),
      }));
    } catch (error) {
      toast(error.message, true);
    } finally {
      app.requestBusy = false;
    }
    return;
  }
  if (app.room.state !== "active" || !app.activeOrder) return;
  app.requestBusy = true;
  try {
    const action = { type: app.activeOrder, target };
    if (["expand", "attack"].includes(app.activeOrder)) action.amount = Number(els.orderAmountRange.value);
    receiveRoom(await api(`/api/world-command/rooms/${app.room.roomCode}/action`, {
      method: "POST",
      body: JSON.stringify({ playerId: app.playerId, action }),
    }));
    if (["boat", "missile"].includes(app.activeOrder)) closeOrder();
  } catch (error) {
    toast(error.message, true);
  } finally {
    app.requestBusy = false;
  }
}

function resizeCanvas() {
  if (app.screen !== "game") return;
  const rect = els.mapStage.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (els.canvas.width !== width || els.canvas.height !== height) {
    els.canvas.width = width;
    els.canvas.height = height;
    mapLayer.width = width;
    mapLayer.height = height;
  }
  const scale = Math.min(rect.width / GRID_WIDTH, rect.height / GRID_HEIGHT) * 0.93;
  app.metrics = {
    dpr,
    scale,
    width: GRID_WIDTH * scale,
    height: GRID_HEIGHT * scale,
    x: (rect.width - GRID_WIDTH * scale) / 2,
    y: (rect.height - GRID_HEIGHT * scale) / 2,
  };
  rebuildMapLayer();
}

function rebuildMapLayer() {
  if (!mapLayer.width || !mapLayer.height) return;
  const { dpr, scale, x: ox, y: oy } = app.metrics;
  mapCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  mapCtx.clearRect(0, 0, mapLayer.width / dpr, mapLayer.height / dpr);
  app.centroids.clear();
  const sums = new Map();

  for (let y = 0; y < GRID_HEIGHT; y += 1) {
    for (let x = 0; x < GRID_WIDTH; x += 1) {
      const index = cellIndex(x, y);
      const value = app.grid[index];
      if (value === 0) continue;
      const player = value >= 2 ? playerForCode(value) : null;
      let fill = "#243443";
      if (player) {
        const [r, g, b] = hexToRgb(player.color);
        const variation = ((x * 17 + y * 11) % 5) - 2;
        fill = `rgb(${clamp(r + variation * 2, 0, 255)},${clamp(g + variation * 2, 0, 255)},${clamp(b + variation * 2, 0, 255)})`;
        const sum = sums.get(value) || { x: 0, y: 0, count: 0 };
        sum.x += x;
        sum.y += y;
        sum.count += 1;
        sums.set(value, sum);
      }
      mapCtx.fillStyle = fill;
      mapCtx.fillRect(ox + x * scale, oy + y * scale, Math.ceil(scale + 0.12), Math.ceil(scale + 0.12));
    }
  }

  mapCtx.lineWidth = Math.max(0.7, scale * 0.16);
  for (let y = 0; y < GRID_HEIGHT; y += 1) {
    for (let x = 0; x < GRID_WIDTH; x += 1) {
      const index = cellIndex(x, y);
      const value = app.grid[index];
      if (value === 0) continue;
      const px = ox + x * scale;
      const py = oy + y * scale;
      for (const neighbor of neighbors4(index)) {
        const other = app.grid[neighbor];
        if (other === value) continue;
        const [nx, ny] = cellCoords(neighbor);
        mapCtx.strokeStyle = other === 0 ? "rgba(135,202,230,.4)" : value >= 2 && other >= 2 ? "rgba(255,255,255,.62)" : "rgba(4,9,16,.32)";
        mapCtx.beginPath();
        if (nx < x) { mapCtx.moveTo(px, py); mapCtx.lineTo(px, py + scale); }
        else if (nx > x) { mapCtx.moveTo(px + scale, py); mapCtx.lineTo(px + scale, py + scale); }
        else if (ny < y) { mapCtx.moveTo(px, py); mapCtx.lineTo(px + scale, py); }
        else { mapCtx.moveTo(px, py + scale); mapCtx.lineTo(px + scale, py + scale); }
        mapCtx.stroke();
      }
    }
  }

  for (const [code, sum] of sums) {
    app.centroids.set(code, { x: sum.x / sum.count, y: sum.y / sum.count, count: sum.count });
  }
}

function screenPoint(index) {
  const [x, y] = cellCoords(index);
  return {
    x: app.metrics.x + (x + 0.5) * app.metrics.scale,
    y: app.metrics.y + (y + 0.5) * app.metrics.scale,
  };
}

function cellFromEvent(event) {
  const rect = els.canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const gx = Math.floor((x - app.metrics.x) / app.metrics.scale);
  const gy = Math.floor((y - app.metrics.y) / app.metrics.scale);
  if (gx < 0 || gx >= GRID_WIDTH || gy < 0 || gy >= GRID_HEIGHT) return -1;
  return cellIndex(gx, gy);
}

function drawAnimatedMap(now) {
  if (app.screen !== "game") {
    requestAnimationFrame(drawAnimatedMap);
    return;
  }
  const { dpr, scale, x: ox, y: oy } = app.metrics;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, els.canvas.width / dpr, els.canvas.height / dpr);
  ctx.drawImage(mapLayer, 0, 0, mapLayer.width / dpr, mapLayer.height / dpr);

  app.changes = app.changes.filter((change) => now - change.started < 720);
  for (const change of app.changes) {
    const age = now - change.started;
    if (age < 0) continue;
    const alpha = Math.max(0, 1 - age / 720);
    const [x, y] = cellCoords(change.index);
    const player = playerForCode(change.to);
    ctx.fillStyle = player ? `${player.color}${Math.round(alpha * 180).toString(16).padStart(2, "0")}` : `rgba(255,255,255,${alpha * 0.5})`;
    const pulse = scale * (1 + alpha * 0.9);
    ctx.fillRect(ox + (x + 0.5) * scale - pulse / 2, oy + (y + 0.5) * scale - pulse / 2, pulse, pulse);
  }

  app.particles = app.particles.filter((particle) => now - particle.born < particle.life);
  for (const particle of app.particles) {
    const age = now - particle.born;
    const t = age / particle.life;
    const player = playerForCode(particle.code);
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = player?.color || "#fff";
    ctx.fillRect(ox + (particle.x + particle.vx * t * 10) * scale, oy + (particle.y + particle.vy * t * 10) * scale, Math.max(1.5, scale * 0.45), Math.max(1.5, scale * 0.45));
  }
  ctx.globalAlpha = 1;

  drawEffects(Date.now() + app.serverOffset);
  drawPlayerLabels();
  drawHover();
  requestAnimationFrame(drawAnimatedMap);
}

function quadraticPoint(from, to, progress, lift = 0) {
  const control = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - lift };
  const inv = 1 - progress;
  return {
    x: inv * inv * from.x + 2 * inv * progress * control.x + progress * progress * to.x,
    y: inv * inv * from.y + 2 * inv * progress * control.y + progress * progress * to.y,
  };
}

function drawEffects(serverNow) {
  for (const effect of app.room?.effects || []) {
    const from = screenPoint(effect.from);
    const to = screenPoint(effect.target);
    const duration = Math.max(1, effect.arrivesAt - effect.startsAt);
    const progress = clamp((serverNow - effect.startsAt) / duration, 0, 1);
    const player = app.room.players.find((candidate) => candidate.id === effect.playerId);
    const color = player?.color || "#00d4ff";
    const lift = Math.min(120, Math.abs(to.x - from.x) * 0.16 + 28);

    if (effect.type === "boat") {
      ctx.save();
      ctx.setLineDash([6, 8]);
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = `${color}99`;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.quadraticCurveTo((from.x + to.x) / 2, Math.min(from.y, to.y) - lift * 0.32, to.x, to.y);
      ctx.stroke();
      const point = quadraticPoint(from, to, progress, lift * 0.32);
      const ahead = quadraticPoint(from, to, Math.min(1, progress + 0.02), lift * 0.32);
      ctx.translate(point.x, point.y);
      ctx.rotate(Math.atan2(ahead.y - point.y, ahead.x - point.x));
      ctx.fillStyle = "#eefaff";
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(-7, -5);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-7, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (effect.type === "missile") {
      ctx.save();
      ctx.lineCap = "round";
      const point = quadraticPoint(from, to, progress, lift);
      const ahead = quadraticPoint(from, to, Math.min(1, progress + 0.015), lift);
      for (let trail = 0; trail < 9; trail += 1) {
        const trailP = Math.max(0, progress - trail * 0.018);
        const trailPoint = quadraticPoint(from, to, trailP, lift);
        ctx.strokeStyle = `rgba(255,${150 + trail * 8},70,${(9 - trail) / 12})`;
        ctx.lineWidth = Math.max(1, 5 - trail * 0.4);
        ctx.beginPath();
        ctx.moveTo(trailPoint.x, trailPoint.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }
      ctx.translate(point.x, point.y);
      ctx.rotate(Math.atan2(ahead.y - point.y, ahead.x - point.x));
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "#ff8a00";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-7, -3.5);
      ctx.lineTo(-7, 3.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      if (serverNow >= effect.arrivesAt) drawExplosion(to, serverNow - effect.arrivesAt);
    } else if (effect.type === "attack") {
      ctx.save();
      ctx.setLineDash([4, 5]);
      ctx.lineWidth = 2.3;
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      const point = quadraticPoint(from, to, progress, 12);
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (effect.type === "expand") {
      const fade = 1 - progress;
      ctx.strokeStyle = `${color}${Math.round(fade * 220).toString(16).padStart(2, "0")}`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(to.x, to.y, 8 + progress * 28, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawExplosion(point, age) {
  const progress = clamp(age / 1750, 0, 1);
  if (progress >= 1) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const radius = 12 + progress * 70;
  const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
  gradient.addColorStop(0, `rgba(255,255,255,${1 - progress})`);
  gradient.addColorStop(0.25, `rgba(255,190,38,${0.8 - progress * 0.6})`);
  gradient.addColorStop(0.62, `rgba(255,50,40,${0.55 - progress * 0.45})`);
  gradient.addColorStop(1, "rgba(255,20,0,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(255,220,130,${1 - progress})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius * 0.82, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function getPhotoImage(player) {
  if (!player.photo) return null;
  if (photoCache.has(player.photo)) return photoCache.get(player.photo);
  const image = new Image();
  image.src = player.photo;
  photoCache.set(player.photo, image);
  return image;
}

function drawPlayerLabels() {
  if (!app.room || app.metrics.scale < 2.4) return;
  for (const player of app.room.players) {
    const center = app.centroids.get(player.slot + 2);
    if (!center || center.count < 5) continue;
    const x = app.metrics.x + (center.x + 0.5) * app.metrics.scale;
    const y = app.metrics.y + (center.y + 0.5) * app.metrics.scale;
    const label = `${player.name}  ${player.landPercent.toFixed(1)}%`;
    ctx.save();
    ctx.font = "800 10px Inter, system-ui, sans-serif";
    const width = Math.min(150, ctx.measureText(label).width + 36);
    ctx.fillStyle = "rgba(4,8,14,.78)";
    ctx.strokeStyle = `${player.color}aa`;
    ctx.lineWidth = 1;
    roundRect(ctx, x - width / 2, y - 12, width, 24, 8);
    ctx.fill();
    ctx.stroke();
    const image = getPhotoImage(player);
    ctx.beginPath();
    ctx.arc(x - width / 2 + 13, y, 8, 0, Math.PI * 2);
    ctx.clip();
    if (image?.complete) ctx.drawImage(image, x - width / 2 + 5, y - 8, 16, 16);
    else {
      ctx.fillStyle = player.color;
      ctx.fillRect(x - width / 2 + 5, y - 8, 16, 16);
    }
    ctx.restore();
    ctx.save();
    ctx.font = "800 10px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#f5f8ff";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x - width / 2 + 27, y + 0.5, width - 31);
    ctx.restore();
  }
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

function drawHover() {
  if (app.hoverIndex < 0 || app.grid[app.hoverIndex] === 0) return;
  const [x, y] = cellCoords(app.hoverIndex);
  ctx.strokeStyle = app.activeOrder === "missile" ? "#ffd60a" : "#fff";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(app.metrics.x + x * app.metrics.scale - 1, app.metrics.y + y * app.metrics.scale - 1, app.metrics.scale + 2, app.metrics.scale + 2);
}

function updatePointer(event) {
  if (app.screen !== "game") return;
  const index = cellFromEvent(event);
  app.hoverIndex = index;
  if (index < 0 || app.grid[index] === 0) {
    els.mapTooltip.hidden = true;
    els.targetReticle.hidden = true;
    return;
  }
  const rect = els.mapStage.getBoundingClientRect();
  const point = screenPoint(index);
  els.targetReticle.hidden = false;
  els.targetReticle.style.left = `${point.x}px`;
  els.targetReticle.style.top = `${point.y}px`;
  const value = app.grid[index];
  const player = playerForCode(value);
  const label = value === 1 ? "Unclaimed land" : `${player?.name || "Unknown"} · ${player?.landPercent?.toFixed(1) || 0}%`;
  els.mapTooltip.textContent = label;
  els.mapTooltip.hidden = false;
  els.mapTooltip.style.left = `${clamp(event.clientX - rect.left + 13, 8, rect.width - 220)}px`;
  els.mapTooltip.style.top = `${clamp(event.clientY - rect.top + 13, 8, rect.height - 50)}px`;
}

function leaveRoom() {
  stopPolling();
  app.room = null;
  app.activeOrder = "";
  app.grid = createWorldGrid();
  app.mapVersion = -1;
  app.feed = [];
  app.seenEffects.clear();
  showScreen("menu");
  setConnection("online", "Ready");
}

function wireEvents() {
  els.nameInput.addEventListener("input", refreshAvatar);
  els.photoInput.addEventListener("change", () => readPhotoInput(els.photoInput));
  els.lobbyPhotoInput.addEventListener("change", () => readPhotoInput(els.lobbyPhotoInput));
  els.hostAiRange.addEventListener("input", () => { els.hostAiOutput.textContent = els.hostAiRange.value; });
  els.practiceAiRange.addEventListener("input", () => { els.practiceAiOutput.textContent = els.practiceAiRange.value; });
  els.joinCodeInput.addEventListener("input", () => { els.joinCodeInput.value = els.joinCodeInput.value.replace(/\D/g, "").slice(0, 6); });
  els.joinCodeInput.addEventListener("keydown", (event) => { if (event.key === "Enter") els.joinButton.click(); });
  $$(".mode-tab").forEach((tab) => tab.addEventListener("click", () => {
    $$(".mode-tab").forEach((other) => {
      const active = other === tab;
      other.classList.toggle("is-active", active);
      other.setAttribute("aria-selected", String(active));
    });
    $$(".mode-panel").forEach((panel) => panel.classList.remove("is-active"));
    $(`#${tab.dataset.mode}Panel`).classList.add("is-active");
  }));
  els.createButton.addEventListener("click", () => busyAction(els.createButton, () => createRoom(Number(els.hostAiRange.value))));
  els.joinButton.addEventListener("click", () => busyAction(els.joinButton, joinRoom));
  els.practiceButton.addEventListener("click", () => busyAction(els.practiceButton, () => createRoom(Number(els.practiceAiRange.value), true)));
  els.copyCodeButton.addEventListener("click", async () => {
    const invite = `${location.origin}${location.pathname}?room=${app.room.roomCode}`;
    try { await navigator.clipboard.writeText(invite); toast("Invite link copied."); }
    catch { toast(`Battle code: ${app.room.roomCode}`); }
  });
  els.addAiButton.addEventListener("click", async () => {
    try {
      receiveRoom(await api(`/api/world-command/rooms/${app.room.roomCode}/ai`, { method: "POST", body: JSON.stringify({ playerId: app.playerId }) }));
    } catch (error) { toast(error.message, true); }
  });
  els.saveProfileButton.addEventListener("click", async () => {
    try {
      receiveRoom(await api(`/api/world-command/rooms/${app.room.roomCode}/profile`, {
        method: "PATCH",
        body: JSON.stringify({ playerId: app.playerId, profile: { name: els.lobbyNameInput.value, color: app.selectedColor, photo: app.profilePhoto } }),
      }));
      els.nameInput.value = getMe().name;
      saveLocalProfile();
      refreshAvatar();
      toast("Lobby profile saved.");
    } catch (error) { toast(error.message, true); }
  });
  els.startMatchButton.addEventListener("click", () => busyAction(els.startMatchButton, async () => {
    receiveRoom(await api(`/api/world-command/rooms/${app.room.roomCode}/start`, { method: "POST", body: JSON.stringify({ playerId: app.playerId }) }));
  }));
  els.leaveLobbyButton.addEventListener("click", leaveRoom);
  $$(".order-button").forEach((button) => button.addEventListener("click", () => selectOrder(button.dataset.order)));
  els.closeTrayButton.addEventListener("click", closeOrder);
  els.orderAmountRange.addEventListener("input", () => { els.orderAmountOutput.textContent = els.orderAmountRange.value; });
  els.canvas.addEventListener("pointermove", updatePointer);
  els.canvas.addEventListener("pointerleave", () => {
    app.hoverIndex = -1;
    els.mapTooltip.hidden = true;
    els.targetReticle.hidden = true;
  });
  els.canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const target = cellFromEvent(event);
    if (target >= 0) sendMapAction(target);
  });
  els.gameMenuButton.addEventListener("click", () => toast("Expand uses 1 troop for up to 4 pixels. Ground attacks require a shared border. Fleets cross oceans for 18 troops. Missiles remove rival control around impact for 30 troops."));
  els.rematchButton.addEventListener("click", leaveRoom);
  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && app.room) pollRoom();
  });
}

function initialize() {
  loadLocalProfile();
  renderMenuColors();
  wireEvents();
  els.hostAiOutput.textContent = els.hostAiRange.value;
  els.practiceAiOutput.textContent = els.practiceAiRange.value;
  const inviteCode = new URLSearchParams(location.search).get("room")?.replace(/\D/g, "").slice(0, 6);
  if (inviteCode?.length === 6) {
    els.joinCodeInput.value = inviteCode;
    $(".mode-tab[data-mode='join']").click();
  }
  showScreen("menu");
  requestAnimationFrame(drawAnimatedMap);
}

initialize();
