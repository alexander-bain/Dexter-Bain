import crypto from "node:crypto";
import {
  BOAT_COST,
  CELLS_PER_TROOP,
  GRID_HEIGHT,
  GRID_WIDTH,
  MAX_PLAYERS,
  MISSILE_COST,
  PLAYER_COLORS,
  cellCoords,
  cellIndex,
  clamp,
  createLandMask,
  createWorldGrid,
  encodeGrid,
  isCoastal,
  neighbors4,
} from "./game-core.js";

const ROOM_TTL_MS = 60 * 60 * 1000;
const PLACEMENT_MS = 10_000;
const AUTO_GROW_TICK_MS = 250;
const EFFECT_LINGER_MS = 1_800;
const AI_NAMES = ["Nova", "Atlas", "Rook", "Vega", "Echo", "Onyx", "Blitz", "Sable", "Kilo", "Orbit"];
const LAND_MASK = createLandMask();
const TOTAL_LAND = LAND_MASK.reduce((sum, value) => sum + value, 0);

function gameError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function cleanText(value, maxLength) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanPlayerId(value) {
  return cleanText(value, 90).replace(/[^a-zA-Z0-9_-]/g, "");
}

function makePlayerId(value) {
  return cleanPlayerId(value) || crypto.randomUUID();
}

function cleanRoomCode(value) {
  return cleanText(value, 6).replace(/\D/g, "").slice(0, 6);
}

function cleanPhoto(value) {
  const photo = String(value || "");
  if (!/^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(photo)) return "";
  return photo.length <= 28_000 ? photo : "";
}

function cleanRules(value = {}) {
  const startingTerritories = clamp(Math.round(Number(value.startingTerritories) || 3), 1, 9);
  const allowed = new Set(["last", "80", "60", "50"]);
  const winCondition = allowed.has(String(value.winCondition)) ? String(value.winCondition) : "last";
  return { startingTerritories, winCondition };
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function distanceBetween(a, b) {
  const [ax, ay] = cellCoords(a);
  const [bx, by] = cellCoords(b);
  return Math.hypot(ax - bx, ay - by);
}

function nearbyIndices(center, radius) {
  const [cx, cy] = cellCoords(center);
  const indices = [];
  for (let y = Math.max(0, cy - radius); y <= Math.min(GRID_HEIGHT - 1, cy + radius); y += 1) {
    for (let x = Math.max(0, cx - radius); x <= Math.min(GRID_WIDTH - 1, cx + radius); x += 1) {
      if (Math.hypot(x - cx, y - cy) <= radius) indices.push(cellIndex(x, y));
    }
  }
  return indices;
}

function ownerCode(player) {
  return player.slot + 2;
}

function makeNumericCode(rooms) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const code = String(crypto.randomInt(100000, 1000000));
    if (!rooms.has(code)) return code;
  }
  return "";
}

function nextOpenColor(players, requested) {
  const taken = new Set(players.map((player) => player.color));
  const preferred = PLAYER_COLORS.includes(requested) ? requested : "";
  if (preferred && !taken.has(preferred)) return preferred;
  return PLAYER_COLORS.find((color) => !taken.has(color)) || PLAYER_COLORS[players.length % PLAYER_COLORS.length];
}

function nextSlot(players) {
  for (let slot = 0; slot < MAX_PLAYERS; slot += 1) {
    if (!players.some((player) => player.slot === slot)) return slot;
  }
  return -1;
}

function makePlayer(room, rawProfile = {}, { id, isAi = false } = {}) {
  const slot = nextSlot(room.players);
  if (slot < 0) throw gameError("This lobby is full.", 409);
  const fallbackName = isAi ? `${AI_NAMES[slot % AI_NAMES.length]} AI` : `Commander ${slot + 1}`;
  return {
    id: makePlayerId(id),
    slot,
    name: cleanText(rawProfile.name, 18) || fallbackName,
    color: nextOpenColor(room.players, cleanText(rawProfile.color, 7).toUpperCase()),
    photo: isAi ? "" : cleanPhoto(rawProfile.photo),
    isAi,
    troops: 0,
    alive: true,
    picks: [],
    land: 0,
    joinedAt: Date.now(),
    lastSeenAt: Date.now(),
  };
}

function getRoom(rooms, code) {
  const room = rooms.get(cleanRoomCode(code));
  if (!room) throw gameError("That room no longer exists.", 404);
  return room;
}

function getPlayer(room, playerId) {
  const id = cleanPlayerId(playerId);
  const player = room.players.find((candidate) => candidate.id === id);
  if (!player) throw gameError("You are not in this room.", 403);
  return player;
}

function requireHost(room, playerId) {
  const player = getPlayer(room, playerId);
  if (player.id !== room.hostId) throw gameError("Only the host can do that.", 403);
  return player;
}

function bump(room) {
  room.version += 1;
  room.updatedAt = Date.now();
}

function countLand(room) {
  const counts = new Map(room.players.map((player) => [ownerCode(player), 0]));
  for (const value of room.grid) {
    if (value >= 2) counts.set(value, (counts.get(value) || 0) + 1);
  }
  room.players.forEach((player) => {
    player.land = counts.get(ownerCode(player)) || 0;
    if (room.state === "active" && player.land === 0) player.alive = false;
  });
}

function claimSeed(room, player, index) {
  const code = ownerCode(player);
  for (const nearby of nearbyIndices(index, 1.45)) {
    if (room.grid[nearby] === 1) room.grid[nearby] = code;
  }
  if (room.grid[index] === 1) room.grid[index] = code;
}

function validStartingCell(room, index) {
  if (!Number.isInteger(index) || index < 0 || index >= room.grid.length || room.grid[index] !== 1) return false;
  const allPicks = room.players.flatMap((player) => player.picks);
  return allPicks.every((pick) => distanceBetween(index, pick) >= 11);
}

function findStartingCell(room) {
  const candidates = [];
  for (let i = 0; i < room.grid.length; i += 1) {
    if (validStartingCell(room, i)) candidates.push(i);
  }
  if (candidates.length) return randomItem(candidates);
  for (let i = 0; i < room.grid.length; i += 1) {
    if (room.grid[i] === 1) return i;
  }
  return -1;
}

function fillMissingPicks(room, player) {
  while (player.picks.length < room.rules.startingTerritories) {
    const index = findStartingCell(room);
    if (index < 0) break;
    player.picks.push(index);
    claimSeed(room, player, index);
  }
}

function frontierCells(room, code, targetValue = 1) {
  const cells = [];
  for (let i = 0; i < room.grid.length; i += 1) {
    if (room.grid[i] !== targetValue) continue;
    if (neighbors4(i).some((neighbor) => room.grid[neighbor] === code)) cells.push(i);
  }
  return cells;
}

function growPlayer(room, player, amount) {
  const code = ownerCode(player);
  let claimed = 0;
  for (let step = 0; step < amount; step += 1) {
    const frontier = frontierCells(room, code, 1);
    if (!frontier.length) break;
    const next = randomItem(frontier);
    room.grid[next] = code;
    claimed += 1;
  }
  return claimed;
}

function floodClaim(room, start, fromValue, toValue, maximum) {
  if (room.grid[start] !== fromValue) return [];
  const changed = [];
  const queue = [start];
  const seen = new Set(queue);
  while (queue.length && changed.length < maximum) {
    const index = queue.shift();
    if (room.grid[index] !== fromValue) continue;
    room.grid[index] = toValue;
    changed.push(index);
    const candidates = neighbors4(index).filter((neighbor) => room.grid[neighbor] === fromValue && !seen.has(neighbor));
    candidates.sort(() => Math.random() - 0.5);
    for (const neighbor of candidates) {
      seen.add(neighbor);
      queue.push(neighbor);
    }
  }
  return changed;
}

function closestOwnedCell(room, player, target, coastalOnly = false) {
  const code = ownerCode(player);
  let closest = -1;
  let closestDistance = Infinity;
  for (let i = 0; i < room.grid.length; i += 1) {
    if (room.grid[i] !== code || (coastalOnly && !isCoastal(i, room.grid))) continue;
    const distance = distanceBetween(i, target);
    if (distance < closestDistance) {
      closest = i;
      closestDistance = distance;
    }
  }
  return closest;
}

function addEffect(room, effect) {
  room.effects.push({ id: `${room.code}-${room.nextEffectId++}`, completed: false, ...effect });
  bump(room);
  return room.effects.at(-1);
}

function resolveBoat(room, effect) {
  const player = room.players.find((candidate) => candidate.id === effect.playerId);
  if (!player?.alive || room.grid[effect.target] === 0) return;
  const targetValue = room.grid[effect.target];
  if (targetValue === ownerCode(player)) return;
  const limit = targetValue === 1 ? 22 : 14;
  floodClaim(room, effect.target, targetValue, ownerCode(player), limit);
}

function resolveMissile(room, effect) {
  const player = room.players.find((candidate) => candidate.id === effect.playerId);
  if (!player) return;
  const code = ownerCode(player);
  for (const index of nearbyIndices(effect.target, 4.8)) {
    if (room.grid[index] >= 2 && room.grid[index] !== code) room.grid[index] = 1;
  }
  const targetCode = effect.targetOwnerCode;
  const targetPlayer = room.players.find((candidate) => ownerCode(candidate) === targetCode);
  if (targetPlayer) targetPlayer.troops = Math.max(0, targetPlayer.troops - 12);
}

function resolveEffects(room, now) {
  let changed = false;
  for (const effect of room.effects) {
    if (!effect.completed && now >= effect.arrivesAt) {
      if (effect.type === "boat") resolveBoat(room, effect);
      if (effect.type === "missile") resolveMissile(room, effect);
      effect.completed = true;
      changed = true;
    }
  }
  room.effects = room.effects.filter((effect) => now <= effect.arrivesAt + EFFECT_LINGER_MS);
  if (changed) bump(room);
}

function landCentroid(room, player) {
  const code = ownerCode(player);
  let x = 0;
  let y = 0;
  let count = 0;
  for (let i = 0; i < room.grid.length; i += 1) {
    if (room.grid[i] !== code) continue;
    const [cellX, cellY] = cellCoords(i);
    x += cellX;
    y += cellY;
    count += 1;
  }
  if (!count) return null;
  return cellIndex(clamp(Math.round(x / count), 0, GRID_WIDTH - 1), clamp(Math.round(y / count), 0, GRID_HEIGHT - 1));
}

function checkWin(room, now) {
  if (room.state !== "active" || now - room.startedAt < 8_000) return;
  countLand(room);
  const standing = room.players.filter((player) => player.alive && player.land > 0);
  let winner = null;
  if (room.rules.winCondition === "last" && standing.length === 1 && room.players.length > 1) {
    winner = standing[0];
  } else if (room.rules.winCondition !== "last") {
    const target = Number(room.rules.winCondition);
    winner = standing.find((player) => (player.land / TOTAL_LAND) * 100 >= target) || null;
  }
  if (!winner) return;
  room.state = "ended";
  room.winnerId = winner.id;
  room.endedAt = now;
  bump(room);
}

function nearbyEnemyTarget(room, player) {
  const code = ownerCode(player);
  const options = [];
  for (let i = 0; i < room.grid.length; i += 1) {
    if (room.grid[i] < 2 || room.grid[i] === code) continue;
    if (neighbors4(i).some((neighbor) => room.grid[neighbor] === code)) options.push(i);
  }
  return options.length ? randomItem(options) : -1;
}

function neutralTarget(room, player) {
  const options = frontierCells(room, ownerCode(player), 1);
  return options.length ? randomItem(options) : -1;
}

function distantCoastTarget(room, player, enemyOnly = false) {
  const code = ownerCode(player);
  const candidates = [];
  for (let i = 0; i < room.grid.length; i += 1) {
    const value = room.grid[i];
    if (!isCoastal(i, room.grid) || value === code || (enemyOnly && value < 2)) continue;
    if (neighbors4(i).some((neighbor) => room.grid[neighbor] === code)) continue;
    candidates.push(i);
  }
  return candidates.length ? randomItem(candidates) : -1;
}

function missileTarget(room, player) {
  const code = ownerCode(player);
  const enemies = [];
  for (let i = 0; i < room.grid.length; i += 1) {
    if (room.grid[i] >= 2 && room.grid[i] !== code) enemies.push(i);
  }
  return enemies.length ? randomItem(enemies) : -1;
}

function performAction(room, player, rawAction, now, fromAi = false) {
  if (room.state !== "active") throw gameError("The battle has not started.", 409);
  if (!player.alive) throw gameError("Your command has been eliminated.", 409);
  const type = cleanText(rawAction?.type, 16);
  const target = Math.round(Number(rawAction?.target));
  if (!Number.isInteger(target) || target < 0 || target >= room.grid.length || room.grid[target] === 0) {
    throw gameError("Choose a land pixel.");
  }
  const code = ownerCode(player);

  if (type === "expand") {
    if (room.grid[target] !== 1 || !neighbors4(target).some((neighbor) => room.grid[neighbor] === code)) {
      throw gameError("Expansion must begin on your neutral border.");
    }
    if (player.troops < 1) throw gameError("You need more troops.");
    const amount = clamp(Math.floor(Number(rawAction.amount) || 1), 1, Math.floor(player.troops));
    const changed = floodClaim(room, target, 1, code, amount * CELLS_PER_TROOP);
    const spent = Math.max(1, Math.ceil(changed.length / CELLS_PER_TROOP));
    player.troops = Math.max(0, player.troops - spent);
    addEffect(room, { type: "expand", playerId: player.id, from: target, target, startsAt: now, arrivesAt: now + 420 });
  } else if (type === "attack") {
    const targetCode = room.grid[target];
    if (targetCode < 2 || targetCode === code || !neighbors4(target).some((neighbor) => room.grid[neighbor] === code)) {
      throw gameError("Attack a rival touching your border.");
    }
    if (player.troops < 1) throw gameError("You need more troops.");
    const amount = clamp(Math.floor(Number(rawAction.amount) || 1), 1, Math.floor(player.troops));
    player.troops -= amount;
    const localDefense = nearbyIndices(target, 3.2).filter((index) => room.grid[index] === targetCode).length / 5;
    const attackPower = amount * (0.84 + Math.random() * 0.42);
    const captureCount = Math.max(0, Math.floor((attackPower - localDefense * 0.32) * 1.7));
    if (captureCount > 0) floodClaim(room, target, targetCode, code, captureCount);
    const defender = room.players.find((candidate) => ownerCode(candidate) === targetCode);
    if (defender) defender.troops = Math.max(0, defender.troops - Math.ceil(amount * 0.28));
    const from = closestOwnedCell(room, player, target) || target;
    addEffect(room, { type: "attack", playerId: player.id, from, target, startsAt: now, arrivesAt: now + 720, success: captureCount > 0 });
  } else if (type === "boat") {
    if (player.troops < BOAT_COST) throw gameError(`A landing fleet costs ${BOAT_COST} troops.`);
    if (!isCoastal(target, room.grid) || room.grid[target] === code) throw gameError("Send boats to another coastline.");
    if (neighbors4(target).some((neighbor) => room.grid[neighbor] === code)) throw gameError("That border is close enough for a ground attack.");
    // Keep fleets simple: the game chooses the nearest launch point, so a
    // player never has to build or hunt for a special port first.
    const from = closestOwnedCell(room, player, target);
    if (from < 0) throw gameError("You need territory before launching a boat.");
    player.troops -= BOAT_COST;
    const travel = clamp(Math.round(distanceBetween(from, target) * 24), 1000, 2800);
    addEffect(room, { type: "boat", playerId: player.id, from, target, startsAt: now, arrivesAt: now + travel });
  } else if (type === "missile") {
    const targetCode = room.grid[target];
    if (player.troops < MISSILE_COST) throw gameError(`A missile costs ${MISSILE_COST} troops.`);
    if (targetCode < 2 || targetCode === code) throw gameError("Missiles can only target rival territory.");
    const from = landCentroid(room, player);
    if (from === null) throw gameError("You have no launch territory.");
    player.troops -= MISSILE_COST;
    addEffect(room, { type: "missile", playerId: player.id, from, target, targetOwnerCode: targetCode, startsAt: now, arrivesAt: now + 1450 });
  } else {
    throw gameError("Choose expand, attack, boat, or missile.");
  }

  if (!fromAi) player.lastSeenAt = now;
  countLand(room);
  bump(room);
}

function runAi(room, now) {
  for (const player of room.players.filter((candidate) => candidate.isAi && candidate.alive)) {
    try {
      const enemy = nearbyEnemyTarget(room, player);
      const neutral = neutralTarget(room, player);
      if (player.troops >= MISSILE_COST + 22 && Math.random() < 0.12) {
        const target = missileTarget(room, player);
        if (target >= 0) performAction(room, player, { type: "missile", target }, now, true);
      } else if (enemy >= 0 && player.troops >= 10) {
        performAction(room, player, { type: "attack", target: enemy, amount: Math.max(5, Math.floor(player.troops * (0.3 + Math.random() * 0.28))) }, now, true);
      } else if (neutral >= 0 && player.troops >= 3) {
        performAction(room, player, { type: "expand", target: neutral, amount: Math.min(Math.floor(player.troops), 8 + Math.floor(Math.random() * 12)) }, now, true);
      } else if (player.troops >= BOAT_COST + 12 && Math.random() < 0.3) {
        const target = distantCoastTarget(room, player);
        if (target >= 0) performAction(room, player, { type: "boat", target }, now, true);
      }
    } catch {
      // A changing frontier can invalidate an AI choice between scans. It can retry next tick.
    }
  }
}

function beginActive(room, now) {
  room.players.forEach((player) => fillMissingPicks(room, player));
  room.state = "active";
  room.startedAt = now;
  room.lastTickAt = now;
  room.autoGrowStep = 0;
  room.nextAiAt = now + 900;
  countLand(room);
  bump(room);
}

function advanceRoom(room, now = Date.now()) {
  if (room.state === "placement") {
    room.players.filter((player) => player.isAi).forEach((player) => fillMissingPicks(room, player));
    if (now >= room.placementEndsAt) beginActive(room, now);
  }
  if (room.state !== "active") return;

  const elapsed = clamp(now - room.lastTickAt, 0, 60_000);
  if (elapsed > 0) {
    room.players.filter((player) => player.alive).forEach((player) => {
      player.troops = Math.min(9999, player.troops + elapsed * 0.006);
    });
  }

  const targetGrowStep = Math.min(40, Math.floor((now - room.startedAt) / AUTO_GROW_TICK_MS));
  const steps = Math.max(0, targetGrowStep - room.autoGrowStep);
  for (let step = 0; step < steps; step += 1) {
    room.players.filter((player) => player.alive).forEach((player) => growPlayer(room, player, Math.max(1, player.picks.length)));
  }
  if (steps) bump(room);
  room.autoGrowStep = targetGrowStep;
  room.lastTickAt = now;

  resolveEffects(room, now);
  if (now >= room.nextAiAt) {
    runAi(room, now);
    room.nextAiAt = now + 1250 + Math.floor(Math.random() * 900);
  }
  countLand(room);
  checkWin(room, now);
}

function publicPlayer(player, room) {
  return {
    id: player.id,
    name: player.name,
    color: player.color,
    photo: player.photo,
    isAi: player.isAi,
    isHost: player.id === room.hostId,
    troops: Math.floor(player.troops),
    alive: player.alive,
    picks: player.picks.length,
    land: player.land,
    landPercent: Number(((player.land / TOTAL_LAND) * 100).toFixed(1)),
    slot: player.slot,
  };
}

function roomSummary(room, playerId, now = Date.now()) {
  advanceRoom(room, now);
  const player = getPlayer(room, playerId);
  player.lastSeenAt = now;
  const hasMap = room.state !== "lobby";
  return {
    roomCode: room.code,
    playerId: player.id,
    hostId: room.hostId,
    state: room.state,
    rules: room.rules,
    players: room.players.map((candidate) => publicPlayer(candidate, room)),
    grid: hasMap ? encodeGrid(room.grid) : "",
    version: room.version,
    serverNow: now,
    placementEndsAt: room.placementEndsAt,
    startedAt: room.startedAt,
    winnerId: room.winnerId,
    effects: room.effects.map(({ targetOwnerCode, completed, ...effect }) => ({ ...effect, completed })),
    economy: { cellsPerTroop: CELLS_PER_TROOP, boatCost: BOAT_COST, missileCost: MISSILE_COST, troopsPerSecond: 6 },
  };
}

export function createWorldCommandService() {
  const rooms = new Map();

  function cleanup() {
    const now = Date.now();
    for (const [code, room] of rooms.entries()) {
      if (now - room.updatedAt > ROOM_TTL_MS) rooms.delete(code);
    }
  }

  function createRoom({ playerId, profile, rules, aiCount = 0 } = {}) {
    cleanup();
    const code = makeNumericCode(rooms);
    if (!code) throw gameError("Could not create a room code.", 500);
    const now = Date.now();
    const room = {
      code,
      hostId: makePlayerId(playerId),
      rules: cleanRules(rules),
      state: "lobby",
      players: [],
      grid: createWorldGrid(LAND_MASK),
      effects: [],
      version: 1,
      nextEffectId: 1,
      createdAt: now,
      updatedAt: now,
      placementEndsAt: null,
      startedAt: null,
      endedAt: null,
      winnerId: null,
    };
    room.players.push(makePlayer(room, profile, { id: room.hostId }));
    const wantedAi = clamp(Math.floor(Number(aiCount) || 0), 0, MAX_PLAYERS - 1);
    for (let i = 0; i < wantedAi; i += 1) room.players.push(makePlayer(room, {}, { isAi: true }));
    rooms.set(code, room);
    return roomSummary(room, room.hostId, now);
  }

  function joinRoom(code, { playerId, profile } = {}) {
    cleanup();
    const room = getRoom(rooms, code);
    if (room.state !== "lobby") throw gameError("That match has already started.", 409);
    const id = makePlayerId(playerId);
    let player = room.players.find((candidate) => candidate.id === id);
    if (!player) {
      if (room.players.length >= MAX_PLAYERS) throw gameError("That lobby is full.", 409);
      player = makePlayer(room, profile, { id });
      room.players.push(player);
      bump(room);
    }
    return roomSummary(room, player.id);
  }

  function getSummary(code, playerId) {
    cleanup();
    return roomSummary(getRoom(rooms, code), playerId);
  }

  function updateProfile(code, playerId, profile = {}) {
    const room = getRoom(rooms, code);
    if (room.state !== "lobby") throw gameError("Profiles lock when the match starts.", 409);
    const player = getPlayer(room, playerId);
    if (player.isAi) throw gameError("AI profiles cannot be edited.");
    const requestedColor = cleanText(profile.color, 7).toUpperCase();
    const taken = room.players.some((candidate) => candidate.id !== player.id && candidate.color === requestedColor);
    if (requestedColor && (!PLAYER_COLORS.includes(requestedColor) || taken)) {
      throw gameError("Choose a different command color.", 409);
    }
    player.name = cleanText(profile.name, 18) || player.name;
    if (requestedColor) player.color = requestedColor;
    if (profile.photo !== undefined) player.photo = cleanPhoto(profile.photo);
    bump(room);
    return roomSummary(room, player.id);
  }

  function addAi(code, playerId) {
    const room = getRoom(rooms, code);
    requireHost(room, playerId);
    if (room.state !== "lobby") throw gameError("AI can only join in the lobby.", 409);
    if (room.players.length >= MAX_PLAYERS) throw gameError("The lobby is full.", 409);
    room.players.push(makePlayer(room, {}, { isAi: true }));
    bump(room);
    return roomSummary(room, playerId);
  }

  function removeAi(code, playerId, targetId) {
    const room = getRoom(rooms, code);
    requireHost(room, playerId);
    if (room.state !== "lobby") throw gameError("AI can only be removed in the lobby.", 409);
    const target = room.players.find((candidate) => candidate.id === targetId && candidate.isAi);
    if (!target) throw gameError("That AI is not in this lobby.", 404);
    room.players = room.players.filter((candidate) => candidate.id !== target.id);
    bump(room);
    return roomSummary(room, playerId);
  }

  function startRoom(code, playerId) {
    const room = getRoom(rooms, code);
    requireHost(room, playerId);
    if (room.state !== "lobby") throw gameError("This match has already started.", 409);
    if (room.players.length < 2) throw gameError("Add an AI or wait for another player.", 409);
    room.state = "placement";
    room.placementEndsAt = Date.now() + PLACEMENT_MS;
    room.grid = createWorldGrid(LAND_MASK);
    room.players.forEach((player) => {
      player.picks = [];
      player.troops = 0;
      player.alive = true;
      player.land = 0;
    });
    room.players.filter((player) => player.isAi).forEach((player) => fillMissingPicks(room, player));
    bump(room);
    return roomSummary(room, playerId);
  }

  function pickStart(code, playerId, target) {
    const room = getRoom(rooms, code);
    advanceRoom(room);
    if (room.state !== "placement") throw gameError("Starting positions are closed.", 409);
    const player = getPlayer(room, playerId);
    if (player.picks.length >= room.rules.startingTerritories) throw gameError("You already chose every starting territory.", 409);
    const index = Math.round(Number(target));
    if (!validStartingCell(room, index)) throw gameError("Choose open land farther from another capital.");
    player.picks.push(index);
    claimSeed(room, player, index);
    bump(room);
    return roomSummary(room, playerId);
  }

  function action(code, playerId, rawAction) {
    const room = getRoom(rooms, code);
    const now = Date.now();
    advanceRoom(room, now);
    const player = getPlayer(room, playerId);
    performAction(room, player, rawAction, now);
    checkWin(room, now);
    return roomSummary(room, playerId, now);
  }

  return { createRoom, joinRoom, getSummary, updateProfile, addAi, removeAi, startRoom, pickStart, action, _rooms: rooms };
}
