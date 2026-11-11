import assert from "node:assert/strict";
import { createWorldCommandService } from "../world-command/server-game.js";
import { isCoastal, neighbors4 } from "../world-command/game-core.js";

const game = createWorldCommandService();
let host = game.createRoom({
  playerId: "test-host",
  profile: { name: "Host", color: "#00D4FF" },
  rules: { startingTerritories: 3, winCondition: "60" },
  aiCount: 3,
});

assert.match(host.roomCode, /^\d{6}$/);
assert.equal(host.players.length, 4);
assert.equal(new Set(host.players.map((player) => player.color)).size, 4);

const guest = game.joinRoom(host.roomCode, {
  playerId: "test-guest",
  profile: { name: "Guest", color: "#00D4FF" },
});
assert.equal(guest.players.length, 5);
assert.notEqual(
  guest.players.find((player) => player.id === "test-guest").color,
  guest.players.find((player) => player.id === "test-host").color,
  "duplicate requested colors must be separated",
);

host = game.startRoom(host.roomCode, "test-host");
const room = game._rooms.get(host.roomCode);
room.placementEndsAt = Date.now() - 1;
host = game.getSummary(host.roomCode, "test-host");
assert.equal(host.state, "active");

room.startedAt = Date.now() - 10_000;
room.lastTickAt = Date.now() - 10_000;
host = game.getSummary(host.roomCode, "test-host");
let me = host.players.find((player) => player.id === "test-host");
assert.ok(me.troops >= 59 && me.troops <= 61, `expected 60 troops after 10 seconds, got ${me.troops}`);

const hostPlayer = room.players.find((player) => player.id === "test-host");
const hostCode = hostPlayer.slot + 2;
const neutralBorder = room.grid.findIndex((value, index) =>
  value === 1 && neighbors4(index).some((neighbor) => room.grid[neighbor] === hostCode));
assert.ok(neutralBorder >= 0, "host should have a neutral frontier");
const landBeforeExpand = me.land;
host = game.action(host.roomCode, "test-host", { type: "expand", target: neutralBorder, amount: 5 });
me = host.players.find((player) => player.id === "test-host");
assert.ok(me.land > landBeforeExpand, "expansion should capture land");

hostPlayer.troops = 100;
const distantCoast = room.grid.findIndex((value, index) =>
  value > 0 &&
  value !== hostCode &&
  isCoastal(index, room.grid) &&
  !neighbors4(index).some((neighbor) => room.grid[neighbor] === hostCode));
assert.ok(distantCoast >= 0, "a distant coastline should exist");
host = game.action(host.roomCode, "test-host", { type: "boat", target: distantCoast });
const boat = room.effects.find((effect) => effect.type === "boat" && !effect.completed);
assert.ok(boat, "boat action should schedule a visible trip");
boat.arrivesAt = Date.now() - 1;
game.getSummary(host.roomCode, "test-host");
assert.equal(boat.completed, true);

hostPlayer.troops = 100;
const enemyTarget = room.grid.findIndex((value) => value >= 2 && value !== hostCode);
assert.ok(enemyTarget >= 0, "an enemy missile target should exist");
game.action(host.roomCode, "test-host", { type: "missile", target: enemyTarget });
const missile = room.effects.find((effect) => effect.type === "missile" && !effect.completed);
assert.ok(missile, "missile action should schedule a visible strike");
missile.arrivesAt = Date.now() - 1;
game.getSummary(host.roomCode, "test-host");
assert.equal(missile.completed, true);

console.log("World Command contract tests passed.");
