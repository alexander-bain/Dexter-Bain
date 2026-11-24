import type { Game } from "phaser";
import { PRODUCTS } from "../data/products";
import { session } from "../systems/GameSession";
import { SaveSystem } from "../systems/SaveSystem";
import type { MathQuestion, SceneKey, UpgradeDefinition } from "../types";
import { hudMarkup } from "./HUD";
import { upgradePanelMarkup } from "./UpgradePanel";

type Callback = () => void;

export class UIBridge {
  private root = document.querySelector<HTMLElement>("#game-ui")!;
  private status = document.querySelector<HTMLElement>("#screen-reader-status")!;
  private game: Game | null = null;
  private pauseCallback: Callback | null = null;
  private interactCallback: Callback | null = null;
  private touchVectorValue = { x: 0, y: 0 };

  connect(game: Game): void {
    this.game = game;
  }

  clear(): void {
    this.root.innerHTML = "";
    this.pauseCallback = null;
    this.interactCallback = null;
    this.touchVectorValue = { x: 0, y: 0 };
  }

  announce(message: string): void {
    this.status.textContent = message;
  }

  showMenu(callbacks: { newGame: Callback; continueGame: Callback; how: Callback; stats: Callback; settings: Callback }): void {
    this.root.innerHTML = `
      <section class="menu-overlay" aria-label="BlueMath Factory main menu">
        <div class="title-lockup">
          <div class="title-berry"><i></i><i></i><i></i><span>×</span></div>
          <p class="title-kicker">WELCOME TO</p>
          <h1>BlueMath <span>Factory</span></h1>
          <p class="subtitle">Multiply. Harvest. Build. Grow.</p>
        </div>
        <div class="menu-buttons">
          ${session.hasSave() ? '<button class="primary-button continue" data-action="continue">▶ CONTINUE</button>' : ""}
          <button class="primary-button" data-action="new">✦ NEW GAME</button>
          <div class="secondary-grid">
            <button data-action="how">? HOW TO PLAY</button>
            <button data-action="stats">▦ MATH STATS</button>
            <button data-action="settings">⚙ SETTINGS</button>
          </div>
        </div>
        <p class="menu-tip">WASD or arrow keys to move · E or Space to interact</p>
      </section>`;
    this.bindAction("new", callbacks.newGame);
    this.bindAction("continue", callbacks.continueGame);
    this.bindAction("how", callbacks.how);
    this.bindAction("stats", callbacks.stats);
    this.bindAction("settings", callbacks.settings);
  }

  showHUD(scene: SceneKey, pause: Callback): void {
    const snapshot = session.economy.snapshot();
    const quest = session.quests.active();
    const questValue = quest ? session.quests.value(quest) : 0;
    this.root.innerHTML = hudMarkup(session.data, snapshot, quest, questValue) + `
      <div class="touch-controls" aria-label="Touch controls">
        <div class="joystick" id="joystick"><span></span></div>
        <button id="touch-interact" class="touch-interact">INTERACT</button>
      </div>`;
    this.pauseCallback = pause;
    this.bindAction("pause", pause);
    this.bindTouchControls();
    this.root.dataset.scene = scene;
  }

  refreshHUD(scene: SceneKey): void {
    const prompt = this.root.querySelector<HTMLElement>("#interaction-prompt");
    const promptMarkup = prompt?.outerHTML ?? '<div id="interaction-prompt" class="interaction-prompt is-hidden"></div>';
    const toast = this.root.querySelector<HTMLElement>("#toast-stack")?.outerHTML ?? '<div id="toast-stack" class="toast-stack"></div>';
    const touch = this.root.querySelector<HTMLElement>(".touch-controls")?.outerHTML ?? "";
    const snapshot = session.economy.snapshot();
    const quest = session.quests.active();
    this.root.innerHTML = hudMarkup(session.data, snapshot, quest, quest ? session.quests.value(quest) : 0)
      .replace('<div id="interaction-prompt" class="interaction-prompt is-hidden"></div>', promptMarkup)
      .replace('<div id="toast-stack" class="toast-stack"></div>', toast) + touch;
    if (this.pauseCallback) this.bindAction("pause", this.pauseCallback);
    this.bindTouchControls();
    if (this.interactCallback) this.bindInteractionButton();
    this.root.dataset.scene = scene;
  }

  updateHUD(): void {
    const values = [
      Math.floor(session.data.blueberries).toLocaleString(),
      Math.floor(session.data.products).toLocaleString(),
      `$${Math.floor(session.data.money).toLocaleString()}`,
      `${session.economy.snapshot().productionRate.toFixed(1)}/s`,
      String(session.economy.snapshot().factoryLevel)
    ];
    this.root.querySelectorAll<HTMLElement>(".resource strong").forEach((element, index) => {
      if (values[index] !== undefined) element.textContent = values[index];
    });
    const quest = session.quests.active();
    const track = this.root.querySelector<HTMLElement>(".objective-card .progress-track i");
    if (quest && track) track.style.width = `${Math.min(100, session.quests.value(quest) / quest.target * 100)}%`;
  }

  setInteraction(label: string | null, callback?: Callback): void {
    const prompt = this.root.querySelector<HTMLElement>("#interaction-prompt");
    if (!prompt) return;
    this.interactCallback = callback ?? null;
    if (!label || !callback) {
      prompt.classList.add("is-hidden");
      prompt.innerHTML = "";
      return;
    }
    prompt.classList.remove("is-hidden");
    prompt.innerHTML = `<button data-action="interact"><kbd>E</kbd><span>${label}</span></button>`;
    this.bindInteractionButton();
  }

  touchVector(): { x: number; y: number } {
    return this.touchVectorValue;
  }

  showToast(message: string, kind: "good" | "info" = "good"): void {
    const stack = this.root.querySelector<HTMLElement>("#toast-stack");
    if (!stack) return;
    const toast = document.createElement("div");
    toast.className = `toast ${kind}`;
    toast.textContent = message;
    stack.append(toast);
    window.setTimeout(() => toast.remove(), session.data.settings.reducedMotion ? 1200 : 3200);
    this.announce(message);
  }

  showMath(question: MathQuestion, streak: number, roundBerries: number, selectedIndex: number, onAnswer: (answer: number) => void, onLeave: Callback): void {
    this.root.innerHTML = `
      <section class="math-overlay" aria-label="Multiplication challenge">
        <header class="math-topbar">
          <button data-action="leave-math" class="back-button">‹ HUB</button>
          <div><span>STREAK</span><strong>🔥 ${streak}</strong></div>
          <div><span>ROUND BERRIES</span><strong>🫐 ${roundBerries}</strong></div>
          <div><span>DIFFICULTY</span><strong>${question.difficultyLabel}</strong></div>
          <div class="timer-box"><span>TIME</span><strong id="math-time">${question.duration.toFixed(1)}</strong></div>
        </header>
        <div class="math-card">
          <p class="math-callout">KEEP THE FACTORY POWERED!</p>
          <div class="math-problem" aria-label="${question.a} times ${question.b}"><span>${question.a}</span><b>×</b><span>${question.b}</span></div>
          <div class="answer-grid">
            ${question.choices.map((answer, index) => `<button class="answer-button ${index === selectedIndex ? "selected" : ""}" data-answer="${answer}" data-index="${index}"><small>${index + 1}</small>${answer}</button>`).join("")}
          </div>
          <div class="reward-ribbon">NEXT REWARD <strong>${question.reward * session.mathMultiplier()} BLUEBERRIES</strong></div>
          <p class="keyboard-hint">Use 1–4, arrow keys, or tap an answer</p>
        </div>
      </section>`;
    this.bindAction("leave-math", onLeave);
    this.root.querySelectorAll<HTMLButtonElement>("[data-answer]").forEach((button) => {
      button.addEventListener("click", () => onAnswer(Number(button.dataset.answer)));
    });
  }

  updateMathTimer(seconds: number): void {
    const timer = this.root.querySelector<HTMLElement>("#math-time");
    if (timer) {
      timer.textContent = Math.max(0, seconds).toFixed(1);
      timer.classList.toggle("urgent", seconds <= 3);
    }
  }

  markAnswer(answer: number, correctAnswer: number): void {
    this.root.querySelectorAll<HTMLButtonElement>("[data-answer]").forEach((button) => {
      button.disabled = true;
      if (Number(button.dataset.answer) === correctAnswer) button.classList.add("correct");
      else if (Number(button.dataset.answer) === answer) button.classList.add("wrong");
    });
  }

  showMathResult(correctAnswer: number, roundBerries: number, onRetry: Callback, onHub: Callback): void {
    this.root.innerHTML = `
      <div class="panel-backdrop math-result-backdrop">
        <section class="result-card" role="dialog" aria-modal="true">
          <div class="result-icon">🫐</div><span class="eyebrow">STREAK COMPLETE</span>
          <h2>Nice try!</h2><p>The answer was <strong>${correctAnswer}</strong>.</p>
          <div class="round-haul"><span>You keep</span><strong>${roundBerries} blueberries</strong></div>
          <button class="primary-button" data-action="retry">START A NEW STREAK</button>
          <button class="text-button" data-action="hub">RETURN TO HUB</button>
        </section>
      </div>`;
    this.bindAction("retry", onRetry);
    this.bindAction("hub", onHub);
  }

  showUpgradePanel(defaultCategory: UpgradeDefinition["category"], onClose: Callback, onPurchase: (id: string) => void): void {
    let category = defaultCategory;
    const render = () => {
      this.root.innerHTML += `<div id="upgrade-layer">${upgradePanelMarkup(session.data, session.economy.upgrades, category)}</div>`;
      this.bindAction("close-panel", () => {
        this.root.querySelector("#upgrade-layer")?.remove();
        onClose();
      });
      this.root.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((button) => button.addEventListener("click", () => {
        category = button.dataset.tab as UpgradeDefinition["category"];
        this.root.querySelector("#upgrade-layer")?.remove();
        render();
      }));
      this.root.querySelectorAll<HTMLButtonElement>("[data-buy]").forEach((button) => button.addEventListener("click", () => {
        onPurchase(button.dataset.buy!);
        this.root.querySelector("#upgrade-layer")?.remove();
        render();
      }));
      this.root.querySelectorAll<HTMLButtonElement>("[data-product]").forEach((button) => button.addEventListener("click", () => {
        session.data.selectedProduct = button.dataset.product!;
        session.save();
        this.root.querySelector("#upgrade-layer")?.remove();
        render();
      }));
    };
    render();
  }

  showPause(scene: SceneKey, onResume: Callback, onMenu: Callback): void {
    this.root.innerHTML += `
      <div id="modal-layer" class="panel-backdrop">
        <section class="pause-card" role="dialog" aria-modal="true" aria-label="Game paused">
          <span class="eyebrow">BLUEBERRY BREAK</span><h2>Game Paused</h2>
          <button class="primary-button" data-action="resume">RESUME</button>
          <button data-action="how">HOW TO PLAY</button>
          <button data-action="stats">MATH STATS</button>
          <button data-action="settings">SETTINGS</button>
          <button data-action="save">SAVE GAME</button>
          <button class="text-button" data-action="menu">RETURN TO MAIN MENU</button>
        </section>
      </div>`;
    this.bindAction("resume", () => { this.root.querySelector("#modal-layer")?.remove(); onResume(); });
    this.bindAction("how", () => this.showHow(() => this.showPause(scene, onResume, onMenu)));
    this.bindAction("stats", () => this.showStats(() => this.showPause(scene, onResume, onMenu)));
    this.bindAction("settings", () => this.showSettings(() => this.showPause(scene, onResume, onMenu)));
    this.bindAction("save", () => { session.save(scene); this.showToast("Game saved!", "info"); });
    this.bindAction("menu", onMenu);
  }

  showHow(onClose: Callback): void {
    this.root.innerHTML = `
      <div class="panel-backdrop info-backdrop"><section class="info-panel" role="dialog" aria-modal="true">
        <header class="panel-header"><div><span class="eyebrow">QUICK TOUR</span><h2>How to Play</h2></div><button class="close-button" data-action="info-close">×</button></header>
        <div class="how-grid">
          <article><span>➊</span><div><h3>Power up with math</h3><p>Enter the Challenge portal. Every correct multiplication answer earns blueberries. Keep a streak to multiply the reward from 1 up to 64.</p></div></article>
          <article><span>➋</span><div><h3>Build the factory</h3><p>Buy conveyors, pickers, washers, robots, and packing machines. Watch berries travel through the production line.</p></div></article>
          <article><span>➌</span><div><h3>Run the store</h3><p>Walk to the register and press E or Interact to serve customers. Hire a cashier when you have enough money.</p></div></article>
          <article><span>➍</span><div><h3>Grow the business</h3><p>Upgrade product value, expand the line, unlock recipes, finish goals, and turn the tiny workshop into a blueberry empire.</p></div></article>
        </div>
        <div class="controls-card"><strong>MOVE</strong><span>WASD / Arrow Keys / Touch Joystick</span><strong>INTERACT</strong><span>E / Space / Touch Button</span></div>
      </section></div>`;
    this.bindAction("info-close", () => { this.root.innerHTML = ""; onClose(); });
  }

  showStats(onClose: Callback): void {
    const data = session.hasSave() ? (SaveSystem.load() ?? session.data) : session.data;
    const stats = data.mathStats;
    const accuracy = stats.answered ? Math.round(stats.correct / stats.answered * 100) : 0;
    const ranked = Object.entries(stats.facts).sort((a, b) => (b[1].misses / Math.max(1, b[1].seen)) - (a[1].misses / Math.max(1, a[1].seen)));
    const hardest = ranked.filter(([, fact]) => fact.misses > 0).slice(0, 5);
    this.root.innerHTML = `
      <div class="panel-backdrop info-backdrop"><section class="info-panel stats-panel" role="dialog" aria-modal="true">
        <header class="panel-header"><div><span class="eyebrow">YOUR BERRY BRAIN</span><h2>Math Stats</h2></div><button class="close-button" data-action="info-close">×</button></header>
        <div class="stat-cards"><div><strong>${accuracy}%</strong><span>Accuracy</span></div><div><strong>${stats.bestStreak}</strong><span>Best streak</span></div><div><strong>${stats.answered}</strong><span>Questions</span></div><div><strong>${stats.fastestMs ? `${(stats.fastestMs / 1000).toFixed(1)}s` : "—"}</strong><span>Fastest answer</span></div></div>
        <div class="stats-columns"><section><h3>Facts to practice</h3>${hardest.length ? hardest.map(([fact, value]) => `<div class="fact-row"><span>${fact.replace("x", " × ")}</span><span>${value.correct}/${value.seen} right</span></div>`).join("") : "<p>Answer some questions and your helpful practice list will appear here.</p>"}</section>
        <section><h3>1–10 Mastery Grid</h3><div class="mastery-grid">${Array.from({ length: 100 }, (_, index) => { const a = Math.floor(index / 10) + 1; const b = index % 10 + 1; const stat = stats.facts[`${Math.min(a,b)}x${Math.max(a,b)}`]; const mastery = stat && stat.seen >= 3 && stat.correct / stat.seen >= .8 ? "mastered" : stat?.seen ? "learning" : "new"; return `<span class="${mastery}" title="${a} × ${b}">${a * b}</span>`; }).join("")}</div></section></div>
      </section></div>`;
    this.bindAction("info-close", () => { this.root.innerHTML = ""; onClose(); });
  }

  showSettings(onClose: Callback): void {
    const settings = session.data.settings;
    this.root.innerHTML = `
      <div class="panel-backdrop info-backdrop"><section class="info-panel settings-panel" role="dialog" aria-modal="true">
        <header class="panel-header"><div><span class="eyebrow">MAKE IT YOURS</span><h2>Settings</h2></div><button class="close-button" data-action="info-close">×</button></header>
        <label><span>Music volume</span><input id="music-volume" type="range" min="0" max="1" step="0.05" value="${settings.music}"></label>
        <label><span>Sound effects</span><input id="sfx-volume" type="range" min="0" max="1" step="0.05" value="${settings.sfx}"></label>
        <label class="toggle-row"><span>Mute all sound</span><input id="mute-toggle" type="checkbox" ${settings.muted ? "checked" : ""}></label>
        <label class="toggle-row"><span>Reduced motion</span><input id="motion-toggle" type="checkbox" ${settings.reducedMotion ? "checked" : ""}></label>
        <div class="danger-zone"><div><strong>Reset game</strong><span>Erases this device's BlueMath progress.</span></div><button data-action="reset-save">RESET SAVE</button></div>
      </section></div>`;
    const saveSetting = () => session.save();
    this.root.querySelector<HTMLInputElement>("#music-volume")?.addEventListener("input", (event) => { settings.music = Number((event.target as HTMLInputElement).value); saveSetting(); });
    this.root.querySelector<HTMLInputElement>("#sfx-volume")?.addEventListener("input", (event) => { settings.sfx = Number((event.target as HTMLInputElement).value); saveSetting(); });
    this.root.querySelector<HTMLInputElement>("#mute-toggle")?.addEventListener("change", (event) => { settings.muted = (event.target as HTMLInputElement).checked; saveSetting(); });
    this.root.querySelector<HTMLInputElement>("#motion-toggle")?.addEventListener("change", (event) => { settings.reducedMotion = (event.target as HTMLInputElement).checked; saveSetting(); });
    this.bindAction("reset-save", () => {
      if (window.confirm("Reset every BlueMath Factory upgrade and math stat? This cannot be undone.")) {
        session.resetSave();
        this.announce("BlueMath Factory save reset.");
        onClose();
      }
    });
    this.bindAction("info-close", () => { this.root.innerHTML = ""; onClose(); });
  }

  selectedProductName(): string {
    return PRODUCTS.find((product) => product.id === session.data.selectedProduct)?.name ?? PRODUCTS[0].name;
  }

  private bindAction(action: string, callback: Callback): void {
    this.root.querySelectorAll<HTMLElement>(`[data-action="${action}"]`).forEach((element) => element.addEventListener("click", () => {
      session.audio.play("button");
      callback();
    }, { once: true }));
  }

  private bindInteractionButton(): void {
    const callback = this.interactCallback;
    if (!callback) return;
    this.root.querySelector<HTMLElement>('[data-action="interact"]')?.addEventListener("click", callback, { once: true });
  }

  private bindTouchControls(): void {
    const joystick = this.root.querySelector<HTMLElement>("#joystick");
    const knob = joystick?.querySelector<HTMLElement>("span");
    if (joystick && knob) {
      const move = (event: PointerEvent) => {
        const box = joystick.getBoundingClientRect();
        let x = event.clientX - (box.left + box.width / 2);
        let y = event.clientY - (box.top + box.height / 2);
        const length = Math.hypot(x, y);
        const max = box.width * 0.32;
        if (length > max) { x = x / length * max; y = y / length * max; }
        knob.style.transform = `translate(${x}px, ${y}px)`;
        this.touchVectorValue = { x: x / max, y: y / max };
      };
      const reset = () => { knob.style.transform = "translate(0,0)"; this.touchVectorValue = { x: 0, y: 0 }; };
      joystick.addEventListener("pointerdown", (event) => { joystick.setPointerCapture(event.pointerId); move(event); });
      joystick.addEventListener("pointermove", (event) => { if (joystick.hasPointerCapture(event.pointerId)) move(event); });
      joystick.addEventListener("pointerup", reset);
      joystick.addEventListener("pointercancel", reset);
    }
    this.root.querySelector<HTMLElement>("#touch-interact")?.addEventListener("click", () => this.interactCallback?.());
  }
}

export const ui = new UIBridge();
