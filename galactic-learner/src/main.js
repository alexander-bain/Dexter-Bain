import { Game } from "./game.js";
import { Input } from "./input.js";
import { MLPolicy } from "./mlPolicy.js";
import { clearTrainingSamples, loadHighScores, loadTrainingSamples } from "./storage.js";

const screens = {
  landing: document.querySelector("#landing-screen"),
  play: document.querySelector("#play-screen"),
  game: document.querySelector("#game-screen"),
  scores: document.querySelector("#scores-screen"),
  ml: document.querySelector("#ml-screen"),
};

const canvas = document.querySelector("#game-canvas");
const hud = document.querySelector("#hud");
const overlay = document.querySelector("#overlay");
const input = new Input();
let game = null;

document.querySelector("#show-play").addEventListener("click", () => {
  updateBotButton();
  showScreen("play");
});
document.querySelector("#show-scores").addEventListener("click", () => {
  renderScores();
  showScreen("scores");
});
document.querySelector("#show-ml").addEventListener("click", () => {
  renderMlStats();
  showScreen("ml");
});

document.querySelector("#start-one").addEventListener("click", () => startGame("one"));
document.querySelector("#start-two").addEventListener("click", () => startGame("two"));
document.querySelector("#start-bot").addEventListener("click", () => {
  const stats = new MLPolicy().load().getStats();
  if (!stats.ready) {
    document.querySelector("#bot-warning").textContent = "Play a few rounds first to train the bot.";
    return;
  }
  startGame("bot");
});

document.querySelector("#pause-game").addEventListener("click", () => game?.togglePause());
document.querySelector("#restart-game").addEventListener("click", () => game?.restart());
document.querySelector("#exit-game").addEventListener("click", () => {
  game?.stop();
  game = null;
  renderScores();
  showScreen("landing");
});

document.querySelector("#clear-training").addEventListener("click", () => {
  clearTrainingSamples();
  renderMlStats();
});

document.querySelector("#export-training").addEventListener("click", () => {
  const samples = loadTrainingSamples();
  const blob = new Blob([JSON.stringify(samples, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `galactic-learner-training-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

document.querySelectorAll(".back-menu").forEach((button) => {
  button.addEventListener("click", () => {
    game?.stop();
    game = null;
    showScreen("landing");
  });
});

function startGame(mode) {
  game?.stop();
  game = new Game(canvas, hud, overlay, input, mode);
  showScreen("game");
  game.start();
}

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  screens[name].classList.add("active");
}

function renderScores() {
  const list = document.querySelector("#scores-list");
  const scores = loadHighScores();
  if (scores.length === 0) {
    list.innerHTML = "<li>No scores yet. Launch a run and set the bar.</li>";
    return;
  }
  list.innerHTML = scores
    .slice(0, 10)
    .map((score) => `<li>${score.score} - ${score.mode} - Level ${score.level} - ${score.date}</li>`)
    .join("");
}

function renderMlStats() {
  const stats = new MLPolicy().load().getStats();
  document.querySelector("#ml-stats").innerHTML = `
    <p><strong>Samples:</strong> ${stats.sampleCount} / ${stats.maxSamples}</p>
    <p><strong>Bot ready:</strong> ${stats.ready ? "Yes" : "No, needs at least 50 samples"}</p>
    <p><strong>Policy:</strong> weighted kNN with k=${stats.k}</p>
    <p><strong>Schema:</strong> v${stats.schemaVersion}, moveX + moveY + fire</p>
    <p><strong>Self-play samples:</strong> ${stats.selfSampleCount}</p>
  `;
}

function updateBotButton() {
  const stats = new MLPolicy().load().getStats();
  const warning = document.querySelector("#bot-warning");
  document.querySelector("#start-bot").disabled = false;
  warning.textContent = stats.ready ? "Bot demo is ready." : "Play a few rounds first to train the bot.";
}

window.addEventListener("keydown", (event) => {
  if (event.code === "KeyR" && screens.game.classList.contains("active")) {
    game?.restart();
  }
});

renderMlStats();
renderScores();
updateBotButton();
