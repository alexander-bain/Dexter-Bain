(function () {
  "use strict";

  const Core = window.BlueberryMath;
  const STORAGE_KEY = "blueberry-boom-save-v1";
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const elements = {
    coins: $("#coinsStat"),
    berries: $("#berriesStat"),
    rate: $("#rateStat"),
    value: $("#valueStat"),
    mission: $("#missionText"),
    factoryLevel: $("#factoryLevel"),
    nearby: $("#nearbyText"),
    queue: $("#queueStat"),
    queueCap: $("#queueCapStat"),
    sold: $("#soldStat"),
    streak: $("#streakStat"),
    harvest: $("#harvestStat"),
    flowGrow: $("#flowGrow"),
    flowServe: $("#flowServe"),
    flowPrice: $("#flowPrice"),
    achievements: $("#achievementList"),
    achievementCount: $("#achievementCount"),
    actionButton: $("#actionButton"),
    actionIcon: $("#actionIcon"),
    actionLabel: $("#actionLabel"),
    soundButton: $("#soundButton"),
    toastStack: $("#toastStack"),
    liveRegion: $("#liveRegion"),
    canvas: $("#worldCanvas"),
    welcomeModal: $("#welcomeModal"),
    mathModal: $("#mathModal"),
    upgradesModal: $("#upgradesModal"),
    problem: $("#problemText"),
    answers: $("#answerGrid"),
    feedback: $("#mathFeedback"),
    combo: $("#comboText"),
    timerBar: $("#timerBar"),
    timerText: $("#timerText"),
    difficulty: $("#difficultyText"),
    rushBerries: $("#rushBerries"),
    modalCoins: $("#modalCoins"),
    upgradeGrid: $("#upgradeGrid"),
    zoneIntro: $("#upgradeZoneIntro")
  };

  const ctx = elements.canvas.getContext("2d");
  const worldBackground = new Image();
  worldBackground.decoding = "async";
  worldBackground.src = "world-bg.webp";
  let state = loadState();
  let stats = Core.getStats(state);
  let activeUpgradeZone = "field";
  let platformAccessZone = null;
  let lastFrame = performance.now();
  let lastUiUpdate = 0;
  let lastSave = 0;
  let lastAchievementCheck = 0;
  let worldTime = 0;
  let audioContext = null;
  let currentProblem = null;
  let mathStartedAt = 0;
  let mathLocked = false;
  let rushBerries = 0;
  let resetArmed = false;
  let saleSparkCooldown = 0;
  let platformZone = null;
  let platformProgress = 0;
  let platformTriggered = false;
  const heldKeys = new Set();
  const heldDirections = new Set();
  const particles = [];

  const player = {
    x: 245,
    y: 430,
    targetX: null,
    targetY: null,
    facing: 1,
    walking: false
  };

  const ZONES = {
    field: { x: 205, y: 425, radius: 88, name: "Berry Field", icon: "🧺", action: "Harvest with math!", color: "#7a4fd0" },
    factory: { x: 470, y: 405, radius: 88, name: "Factory", icon: "🏭", action: "Stand here 5 seconds", color: "#4175d5" },
    store: { x: 730, y: 320, radius: 82, name: "Blueberry Store", icon: "🏪", action: "Stand here 5 seconds", color: "#d26c51" },
    town: { x: 805, y: 165, radius: 82, name: "Town Square", icon: "📣", action: "Advertise in town", color: "#cf7e28" }
  };

  const ZONE_INTROS = {
    field: "Stronger baskets boost every correct answer, while bushes and bees grow blueberries automatically.",
    factory: "Build the conveyor first, then add faster belts, sorters, robots, and a giant factory tower.",
    store: "Raise each berry's value, make a longer line, hire a cashier, and serve bigger customer orders.",
    town: "Bring in more customers with signs, a dancing mascot, radio jingles, and a blueberry festival."
  };

  function loadState() {
    try {
      return Core.normaliseState(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"));
    } catch (error) {
      return Core.createState();
    }
  }

  function saveState() {
    state.lastSaved = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      // The game remains playable if private browsing blocks storage.
    }
  }

  function applyOfflineGrowth() {
    if (!state.hasStarted || !state.lastSaved) return 0;
    const awaySeconds = Math.min(7200, Math.max(0, (Date.now() - state.lastSaved) / 1000));
    if (awaySeconds < 10) return 0;
    const offlineBerries = stats.berryRate * awaySeconds * 0.65;
    state.berries += offlineBerries;
    return offlineBerries;
  }

  function openModal(element) {
    element.hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      const focusable = element.querySelector("button:not([disabled])");
      if (focusable) focusable.focus({ preventScroll: true });
    });
  }

  function closeModal(element) {
    element.hidden = true;
    if (!$$('.modal-backdrop:not([hidden])').length) document.body.style.overflow = "";
    elements.canvas.focus({ preventScroll: true });
  }

  function toast(message, emoji) {
    const item = document.createElement("div");
    item.className = "toast";
    item.innerHTML = `<span>${emoji || "🫐"}</span><div>${message}</div>`;
    elements.toastStack.append(item);
    elements.liveRegion.textContent = message.replace(/<[^>]*>/g, "");
    window.setTimeout(() => item.classList.add("is-leaving"), 2800);
    window.setTimeout(() => item.remove(), 3050);
  }

  function ensureAudio() {
    if (!state.soundOn || audioContext) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) audioContext = new AudioCtx();
  }

  function playSound(type) {
    if (!state.soundOn) return;
    ensureAudio();
    if (!audioContext) return;
    if (audioContext.state === "suspended") audioContext.resume();
    const now = audioContext.currentTime;
    const notes = type === "correct" ? [523, 659, 784] : type === "buy" ? [392, 523, 659] : type === "wrong" ? [220, 180] : [520];
    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type === "wrong" ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + index * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.09, now + index * 0.07 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.07 + 0.14);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(now + index * 0.07);
      oscillator.stop(now + index * 0.07 + 0.16);
    });
  }

  function updateSoundButton() {
    elements.soundButton.textContent = state.soundOn ? "🔊" : "🔇";
    elements.soundButton.setAttribute("aria-label", state.soundOn ? "Turn sound off" : "Turn sound on");
  }

  function nearestZone() {
    let closest = null;
    let closestDistance = Infinity;
    Object.entries(ZONES).forEach(([id, zone]) => {
      const distance = Math.hypot(player.x - zone.x, player.y - zone.y);
      if (distance < closestDistance) {
        closest = { id, zone, distance };
        closestDistance = distance;
      }
    });
    return closest && closest.distance <= closest.zone.radius ? closest : null;
  }

  function interact() {
    const nearby = nearestZone();
    if (!nearby) {
      toast("Walk closer to a glowing business spot first!", "👟");
      return;
    }
    if (nearby.id === "field") openMathRush();
    else if (nearby.id === "factory" || nearby.id === "store") {
      toast(`Stay on the ${nearby.zone.name} pad for ${Math.max(1, Math.ceil(5 - platformProgress))} more seconds!`, "⏱️");
    } else openUpgrades(nearby.id);
  }

  function updateAction() {
    const nearby = nearestZone();
    if (nearby) {
      elements.nearby.textContent = `Near: ${nearby.zone.name}`;
      elements.actionIcon.textContent = nearby.zone.icon;
      if (nearby.id === "factory" || nearby.id === "store") {
        elements.actionLabel.textContent = platformTriggered ? "Upgrade shop opened!" : `Stand still: ${Math.max(1, Math.ceil(5 - platformProgress))}s`;
      } else {
        elements.actionLabel.textContent = nearby.zone.action;
      }
      elements.actionButton.style.opacity = "1";
    } else {
      elements.nearby.textContent = "Exploring the valley";
      elements.actionIcon.textContent = "👟";
      elements.actionLabel.textContent = "Walk to a glowing spot";
      elements.actionButton.style.opacity = "0.82";
    }
  }

  function updateUI(force) {
    const now = performance.now();
    if (!force && now - lastUiUpdate < 160) return;
    lastUiUpdate = now;
    stats = Core.getStats(state);
    elements.coins.textContent = Core.formatNumber(state.coins, true);
    elements.berries.textContent = Core.formatNumber(state.berries);
    elements.rate.textContent = `${Core.formatNumber(stats.berryRate)}/sec`;
    elements.value.textContent = Core.formatNumber(stats.berryValue, true);
    elements.mission.textContent = Core.getMission(state);
    elements.factoryLevel.textContent = `Level ${stats.factoryLevel}`;
    elements.queue.textContent = Math.floor(state.customerQueue);
    elements.queueCap.textContent = stats.queueCap;
    elements.sold.textContent = Core.formatNumber(state.totalSold);
    elements.streak.textContent = state.highStreak;
    elements.harvest.textContent = `${Core.formatNumber(stats.harvestPower)}+`;
    elements.flowGrow.textContent = `${Core.formatNumber(stats.berryRate)}/sec`;
    elements.flowServe.textContent = `${Core.formatNumber(stats.serviceRate)}/sec`;
    elements.flowPrice.textContent = Core.formatNumber(stats.berryValue, true);
    elements.modalCoins.textContent = Core.formatNumber(state.coins, true);
    updateAction();
    renderAchievements();
  }

  function renderAchievements() {
    const earned = new Set(state.achievements);
    elements.achievementCount.textContent = `${earned.size}/${Core.ACHIEVEMENTS.length}`;
    elements.achievements.innerHTML = Core.ACHIEVEMENTS.map((achievement) => {
      const complete = earned.has(achievement.id);
      const title = complete ? `${achievement.name} — earned ${achievement.rewardText}` : `${achievement.name}: ${achievement.hint}`;
      return `<div class="achievement-dot${complete ? " is-earned" : ""}" title="${title}" aria-label="${title}">${achievement.emoji}${complete ? "<span>✓</span>" : ""}</div>`;
    }).join("");
  }

  function checkAchievements() {
    Core.checkAchievements(state).forEach((achievement) => {
      toast(`<strong>${achievement.name}!</strong> Reward: ${achievement.rewardText}`, achievement.emoji);
      playSound("buy");
      burst(player.x, player.y - 25, "⭐", 7);
    });
  }

  function openMathRush() {
    if (!elements.mathModal.hidden) return;
    rushBerries = 0;
    state.mathStreak = 0;
    elements.rushBerries.textContent = "0";
    openModal(elements.mathModal);
    nextProblem();
  }

  function closeMathRush() {
    state.mathStreak = 0;
    mathLocked = true;
    closeModal(elements.mathModal);
    if (rushBerries > 0) toast(`Rush complete! You harvested <strong>${Core.formatNumber(rushBerries)} blueberries.</strong>`, "🧺");
    saveState();
  }

  function nextProblem() {
    if (elements.mathModal.hidden) return;
    currentProblem = Core.createProblem(state.mathStreak);
    mathLocked = false;
    mathStartedAt = performance.now();
    elements.problem.textContent = `${currentProblem.a} × ${currentProblem.b} = ?`;
    elements.combo.textContent = `×${Math.max(1, Math.min(10, state.mathStreak || 1))}`;
    elements.difficulty.textContent = `Factors up to ${currentProblem.maxFactor}`;
    elements.feedback.className = "math-feedback";
    elements.feedback.textContent = state.mathStreak ? "Keep the streak going!" : "Choose the answer before the timer runs out!";
    elements.answers.innerHTML = currentProblem.choices.map((choice, index) => (
      `<button class="answer-button" type="button" data-answer="${choice}" aria-label="Answer ${choice}"><span class="sr-only">Choice ${index + 1}: </span>${choice}</button>`
    )).join("");
    elements.answers.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => handleAnswer(Number(button.dataset.answer), button));
    });
  }

  function handleAnswer(answer, button) {
    if (mathLocked || !currentProblem) return;
    mathLocked = true;
    const answerButtons = [...elements.answers.querySelectorAll("button")];
    answerButtons.forEach((item) => { item.disabled = true; });
    const correctButton = answerButtons.find((item) => Number(item.dataset.answer) === currentProblem.answer);
    const remaining = Math.max(0, 9 - (performance.now() - mathStartedAt) / 1000);

    if (answer === currentProblem.answer) {
      state.mathStreak += 1;
      state.highStreak = Math.max(state.highStreak, state.mathStreak);
      state.correctAnswers += 1;
      stats = Core.getStats(state);
      const multiplier = Math.min(10, state.mathStreak);
      const speedReward = remaining >= 6 ? stats.speedBonus : 0;
      const reward = stats.harvestPower * multiplier + speedReward;
      state.berries += reward;
      state.totalHarvested += reward;
      rushBerries += reward;
      elements.rushBerries.textContent = Core.formatNumber(rushBerries);
      elements.combo.textContent = `×${multiplier}`;
      if (button) button.classList.add("is-correct");
      elements.feedback.className = "math-feedback good";
      elements.feedback.textContent = `Berry brilliant! +${Core.formatNumber(reward)} 🫐${speedReward ? " including a speed bonus!" : ""}`;
      playSound("correct");
      burst(205, 350, "🫐", Math.min(12, 4 + multiplier));
    } else {
      state.mathStreak = 0;
      if (button) button.classList.add("is-wrong");
      if (correctButton) correctButton.classList.add("is-correct");
      elements.combo.textContent = "×1";
      elements.feedback.className = "math-feedback oops";
      elements.feedback.textContent = answer === null ? `Time's up! ${currentProblem.a} × ${currentProblem.b} = ${currentProblem.answer}.` : `Almost! ${currentProblem.a} × ${currentProblem.b} = ${currentProblem.answer}. New streak starts next!`;
      playSound("wrong");
    }

    checkAchievements();
    updateUI(true);
    saveState();
    window.setTimeout(nextProblem, answer === currentProblem.answer ? 620 : 1050);
  }

  function updateMathTimer(now) {
    if (elements.mathModal.hidden || mathLocked || !currentProblem) return;
    const remaining = Math.max(0, 9 - (now - mathStartedAt) / 1000);
    const ratio = remaining / 9;
    elements.timerText.textContent = remaining.toFixed(1);
    elements.timerBar.style.transform = `scaleX(${ratio})`;
    elements.timerBar.style.background = ratio < 0.28 ? "linear-gradient(90deg, #ff806e, #ffbd48)" : "linear-gradient(90deg, #64e69c, #ffd95a)";
    if (remaining <= 0) handleAnswer(null, null);
  }

  function openUpgrades(zone, viaPlatform) {
    activeUpgradeZone = zone || "field";
    platformAccessZone = viaPlatform ? activeUpgradeZone : null;
    renderUpgrades();
    openModal(elements.upgradesModal);
  }

  function renderUpgrades() {
    stats = Core.getStats(state);
    elements.modalCoins.textContent = Core.formatNumber(state.coins, true);
    elements.zoneIntro.textContent = ZONE_INTROS[activeUpgradeZone];
    $$(".upgrade-tabs button").forEach((button) => {
      const padLocked = (button.dataset.zone === "factory" || button.dataset.zone === "store") && platformAccessZone !== button.dataset.zone;
      button.classList.toggle("is-active", button.dataset.zone === activeUpgradeZone);
      button.classList.toggle("is-pad-locked", padLocked);
      button.setAttribute("aria-disabled", padLocked ? "true" : "false");
      button.title = padLocked ? `Stand on the ${button.dataset.zone} pad for 5 seconds to enter.` : "";
    });
    const upgrades = Core.UPGRADES.filter((upgrade) => upgrade.zone === activeUpgradeZone);
    elements.upgradeGrid.innerHTML = upgrades.map((upgrade) => {
      const level = Core.levelOf(state, upgrade.id);
      const maxed = level >= upgrade.max;
      const unlocked = Core.isUnlocked(state, upgrade);
      const cost = Core.costFor(upgrade.id, level);
      const affordable = state.coins + 1e-8 >= cost;
      const requirement = upgrade.requires ? Core.UPGRADE_MAP[upgrade.requires.id] : null;
      let buttonText = `Buy · ${Core.formatNumber(cost, true)}`;
      if (maxed) buttonText = "✓ MAX LEVEL";
      else if (!unlocked) buttonText = `🔒 Need ${requirement.name} Lv. ${upgrade.requires.level}`;
      return `
        <article class="upgrade-card${!unlocked ? " is-locked" : ""}${maxed ? " is-maxed" : ""}">
          <div class="upgrade-card-top">
            <span class="upgrade-emoji">${upgrade.emoji}</span>
            <div><h3>${upgrade.name}</h3><div class="upgrade-level">Level ${level} / ${upgrade.max}</div></div>
          </div>
          <p>${upgrade.desc}</p>
          <div class="upgrade-effect">${upgrade.effectText}</div>
          <button type="button" data-buy="${upgrade.id}"${maxed || !unlocked || !affordable ? " disabled" : ""}>${buttonText}</button>
        </article>`;
    }).join("");
    elements.upgradeGrid.querySelectorAll("[data-buy]").forEach((button) => {
      button.addEventListener("click", () => purchaseUpgrade(button.dataset.buy));
    });
  }

  function purchaseUpgrade(id) {
    const result = Core.buyUpgrade(state, id);
    if (!result.ok) {
      toast(result.reason === "Not enough coins" ? `You need ${Core.formatNumber(result.cost - state.coins, true)} more.` : result.reason, "💡");
      return;
    }
    stats = Core.getStats(state);
    playSound("buy");
    toast(`<strong>${result.upgrade.name} upgraded!</strong> ${result.upgrade.effectText}`, result.upgrade.emoji);
    burst(ZONES[result.upgrade.zone].x, ZONES[result.upgrade.zone].y - 25, "✨", 9);
    checkAchievements();
    renderUpgrades();
    updateUI(true);
    saveState();
  }

  function burst(x, y, emoji, amount) {
    for (let i = 0; i < amount; i += 1) {
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 115,
        vy: -40 - Math.random() * 90,
        life: 0.75 + Math.random() * 0.55,
        maxLife: 1.3,
        emoji,
        size: 15 + Math.random() * 9
      });
    }
  }

  function updateParticles(delta) {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];
      particle.life -= delta;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vy += 130 * delta;
      if (particle.life <= 0) particles.splice(i, 1);
    }
  }

  function updatePlayer(delta) {
    if (!$$('.modal-backdrop:not([hidden])').length) {
      let dx = 0;
      let dy = 0;
      if (heldKeys.has("arrowleft") || heldKeys.has("a") || heldDirections.has("left")) dx -= 1;
      if (heldKeys.has("arrowright") || heldKeys.has("d") || heldDirections.has("right")) dx += 1;
      if (heldKeys.has("arrowup") || heldKeys.has("w") || heldDirections.has("up")) dy -= 1;
      if (heldKeys.has("arrowdown") || heldKeys.has("s") || heldDirections.has("down")) dy += 1;

      if (dx || dy) {
        const length = Math.hypot(dx, dy);
        dx /= length;
        dy /= length;
        player.x += dx * 180 * delta;
        player.y += dy * 180 * delta;
        player.targetX = null;
        player.targetY = null;
        player.walking = true;
        if (dx) player.facing = Math.sign(dx);
      } else if (player.targetX !== null) {
        const targetDx = player.targetX - player.x;
        const targetDy = player.targetY - player.y;
        const distance = Math.hypot(targetDx, targetDy);
        if (distance < 5) {
          player.targetX = null;
          player.targetY = null;
          player.walking = false;
        } else {
          player.x += (targetDx / distance) * Math.min(distance, 175 * delta);
          player.y += (targetDy / distance) * Math.min(distance, 175 * delta);
          player.walking = true;
          if (Math.abs(targetDx) > 3) player.facing = Math.sign(targetDx);
        }
      } else {
        player.walking = false;
      }
    } else {
      player.walking = false;
    }

    player.x = Math.max(42, Math.min(918, player.x));
    player.y = Math.max(78, Math.min(495, player.y));
  }

  function updateUpgradePlatforms(delta) {
    const nearby = nearestZone();
    const onUpgradePad = nearby && (nearby.id === "factory" || nearby.id === "store");
    if (!onUpgradePad) {
      platformZone = null;
      platformProgress = 0;
      platformTriggered = false;
      return;
    }

    if (platformZone !== nearby.id) {
      platformZone = nearby.id;
      platformProgress = 0;
      platformTriggered = false;
    }

    if (platformTriggered || $$('.modal-backdrop:not([hidden])').length) return;
    platformProgress = Math.min(5, platformProgress + delta);
    if (platformProgress >= 5) {
      platformTriggered = true;
      playSound("buy");
      burst(nearby.zone.x, nearby.zone.y - 15, "✨", 10);
      toast(`${nearby.zone.name} upgrade pad activated!`, nearby.zone.icon);
      openUpgrades(nearby.id, true);
    }
  }

  function roundRectPath(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function fillRoundRect(x, y, width, height, radius, fill, stroke) {
    roundRectPath(x, y, width, height, radius);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }

  function drawShadow(x, y, rx, ry, alpha) {
    ctx.save();
    ctx.fillStyle = `rgba(33, 54, 68, ${alpha || 0.2})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawTree(x, y, scale) {
    ctx.fillStyle = "#795039";
    fillRoundRect(x - 6 * scale, y, 12 * scale, 31 * scale, 4 * scale, "#795039");
    ctx.fillStyle = "#3c9b58";
    [[-13, 0, 20], [9, -2, 19], [0, -17, 22]].forEach(([dx, dy, r]) => {
      ctx.beginPath();
      ctx.arc(x + dx * scale, y + dy * scale, r * scale, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = "rgba(255,255,255,.16)";
    ctx.beginPath();
    ctx.arc(x - 8 * scale, y - 16 * scale, 7 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBush(x, y, scale, ripe) {
    drawShadow(x, y + 12 * scale, 28 * scale, 9 * scale, 0.14);
    ctx.fillStyle = "#29764c";
    [[-15, 0, 18], [1, -7, 22], [17, 1, 17]].forEach(([dx, dy, r]) => {
      ctx.beginPath();
      ctx.arc(x + dx * scale, y + dy * scale, r * scale, 0, Math.PI * 2);
      ctx.fill();
    });
    if (ripe) {
      ctx.fillStyle = "#4d35b9";
      [[-13, -5], [0, 4], [11, -9], [18, 4], [-2, -17]].forEach(([dx, dy]) => {
        ctx.beginPath();
        ctx.arc(x + dx * scale, y + dy * scale, 4 * scale, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  function drawWorld() {
    const width = elements.canvas.width;
    const height = elements.canvas.height;
    if (worldBackground.complete && worldBackground.naturalWidth) {
      ctx.drawImage(worldBackground, 0, 0, width, height);
    } else {
      const fallback = ctx.createLinearGradient(0, 0, width, height);
      fallback.addColorStop(0, "#24104f");
      fallback.addColorStop(0.5, "#45157a");
      fallback.addColorStop(1, "#160a39");
      ctx.fillStyle = fallback;
      ctx.fillRect(0, 0, width, height);
    }

    // Animated fireflies tie the interactive layer into the painted night world.
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 18; i += 1) {
      const x = 36 + ((i * 173 + Math.sin(worldTime * (0.35 + i * 0.01)) * 23) % 885);
      const y = 72 + ((i * 97 + Math.cos(worldTime * (0.42 + i * 0.015)) * 17) % 390);
      const glow = 0.35 + Math.sin(worldTime * 2.2 + i) * 0.2;
      const firefly = ctx.createRadialGradient(x, y, 0, x, y, 11);
      firefly.addColorStop(0, `rgba(255, 231, 114, ${glow + 0.35})`);
      firefly.addColorStop(0.25, `rgba(255, 196, 65, ${glow})`);
      firefly.addColorStop(1, "rgba(255, 178, 37, 0)");
      ctx.fillStyle = firefly;
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    drawField();
    drawFactory();
    drawStore();
    drawTown();
    drawCustomers();
    drawZoneSpots();
    drawPlayer();
    drawParticles();

    const vignette = ctx.createRadialGradient(480, 260, 210, 480, 270, 640);
    vignette.addColorStop(0, "rgba(13, 5, 42, 0)");
    vignette.addColorStop(1, "rgba(9, 3, 31, .22)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  function drawField() {
    ctx.save();
    const fieldLevel = Core.levelOf(state, "sunnyRows");
    if (fieldLevel) {
      ctx.globalCompositeOperation = "screen";
      const sparkCount = 5 + fieldLevel * 4;
      for (let i = 0; i < sparkCount; i += 1) {
        const x = 52 + (i * 47) % 270;
        const y = 155 + ((i * 31) % 138);
        const pulse = 2.2 + Math.sin(worldTime * 3.5 + i) * 1.2;
        const berryGlow = ctx.createRadialGradient(x, y, 0, x, y, 10);
        berryGlow.addColorStop(0, "rgba(110, 205, 255, .95)");
        berryGlow.addColorStop(0.28, "rgba(77, 89, 255, .65)");
        berryGlow.addColorStop(1, "rgba(80, 41, 212, 0)");
        ctx.fillStyle = berryGlow;
        ctx.beginPath();
        ctx.arc(x, y, 7 + pulse, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }
    if (Core.levelOf(state, "sprinklers")) {
      [[135, 230], [255, 265]].forEach(([x, y], index) => {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.strokeStyle = "rgba(111, 221, 255, .82)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(x, y, 38 + index * 4, Math.PI + 0.18, Math.PI * 2 - 0.18);
        ctx.stroke();
        ctx.fillStyle = "#8f78bb";
        fillRoundRect(x - 4, y - 3, 8, 24, 3, "#8f78bb");
        ctx.restore();
      });
    }
    if (Core.levelOf(state, "beeBuddies")) {
      [[105, 174, 0], [246, 232, 2]].forEach(([x, y, offset]) => {
        const bx = x + Math.sin(worldTime * 2.2 + offset) * 12;
        const by = y + Math.cos(worldTime * 3 + offset) * 6;
        ctx.fillStyle = "#ffd34d";
        ctx.beginPath();
        ctx.ellipse(bx, by, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#392848";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx - 1, by - 4);
        ctx.lineTo(bx - 1, by + 4);
        ctx.stroke();
        ctx.fillStyle = "rgba(210, 242, 255, .72)";
        ctx.beginPath();
        ctx.ellipse(bx - 3, by - 6, 4, 2.5, -0.4, 0, Math.PI * 2);
        ctx.ellipse(bx + 3, by - 6, 4, 2.5, 0.4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.restore();
  }

  function drawFactory() {
    const unlocked = Core.levelOf(state, "conveyor") > 0;
    drawShadow(480, 365, 125, 28, 0.34);
    if (!unlocked) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.shadowColor = "#55ddff";
      ctx.shadowBlur = 20;
      ctx.strokeStyle = "rgba(103, 222, 255, .88)";
      ctx.lineWidth = 3;
      ctx.setLineDash([7, 6]);
      ctx.beginPath();
      ctx.moveTo(390, 319);
      ctx.lineTo(390, 254);
      ctx.lineTo(430, 225);
      ctx.lineTo(462, 254);
      ctx.lineTo(505, 225);
      ctx.lineTo(570, 256);
      ctx.lineTo(570, 319);
      ctx.closePath();
      ctx.stroke();
      ctx.strokeRect(414, 272, 34, 29);
      ctx.strokeRect(466, 272, 34, 29);
      ctx.strokeRect(518, 272, 30, 47);
      ctx.beginPath();
      ctx.ellipse(480, 335, 105, 25, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalCompositeOperation = "source-over";
      ctx.shadowBlur = 0;
      fillRoundRect(414, 325, 132, 36, 12, "rgba(30, 18, 84, .9)", "rgba(104, 222, 255, .65)");
      ctx.fillStyle = "#8ae9ff";
      ctx.font = "900 14px ui-rounded, system-ui";
      ctx.textAlign = "center";
      ctx.fillText("FACTORY BLUEPRINT", 480, 341);
      ctx.fillStyle = "#f4ce65";
      ctx.font = "800 10px ui-rounded, system-ui";
      ctx.fillText("BUILD CONVEYOR · $35", 480, 355);
      ctx.restore();
      return;
    }

    ctx.save();
    const mega = Core.levelOf(state, "megaFactory") > 0;
    ctx.shadowColor = "rgba(92, 76, 255, .75)";
    ctx.shadowBlur = 20;
    const factoryWall = ctx.createLinearGradient(382, 210, 578, 355);
    factoryWall.addColorStop(0, "#d8d7ff");
    factoryWall.addColorStop(0.45, "#8b8bd2");
    factoryWall.addColorStop(1, "#4b468d");
    fillRoundRect(382, mega ? 175 : 218, 196, mega ? 174 : 131, 15, factoryWall, "rgba(213,229,255,.65)");
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#322f65";
    ctx.fillRect(398, mega ? 150 : 192, 31, mega ? 65 : 50);
    ctx.fillStyle = "rgba(142, 224, 255, .72)";
    ctx.beginPath();
    ctx.arc(414 + Math.sin(worldTime) * 4, mega ? 135 : 179, 15, 0, Math.PI * 2);
    ctx.arc(427 + Math.sin(worldTime * 0.8) * 6, mega ? 118 : 162, 20, 0, Math.PI * 2);
    ctx.fill();
    const roofGradient = ctx.createLinearGradient(370, 165, 590, 250);
    roofGradient.addColorStop(0, "#a66cff");
    roofGradient.addColorStop(0.55, "#5e3bc4");
    roofGradient.addColorStop(1, "#342875");
    ctx.fillStyle = roofGradient;
    ctx.beginPath();
    ctx.moveTo(370, mega ? 197 : 239);
    ctx.lineTo(418, mega ? 164 : 205);
    ctx.lineTo(452, mega ? 197 : 239);
    ctx.lineTo(500, mega ? 164 : 205);
    ctx.lineTo(590, mega ? 197 : 239);
    ctx.lineTo(590, mega ? 216 : 254);
    ctx.lineTo(370, mega ? 216 : 254);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < (mega ? 4 : 3); i += 1) {
      ctx.save();
      ctx.shadowColor = "#66e5ff";
      ctx.shadowBlur = 12;
      fillRoundRect(405 + i * 43, mega ? 235 : 271, 28, 31, 5, "#6de7ff", "rgba(223,252,255,.8)");
      ctx.restore();
      ctx.fillStyle = "rgba(255,255,255,.55)";
      ctx.fillRect(410 + i * 43, mega ? 240 : 276, 4, 20);
    }
    ctx.fillStyle = "#26224f";
    ctx.font = "900 15px ui-rounded, system-ui";
    ctx.textAlign = "center";
    ctx.fillText(mega ? "MEGA BERRY WORKS" : "BERRY WORKS", 480, mega ? 289 : 320);

    // Pipes, tanks, and glowing status lights add detail as the factory grows.
    ctx.strokeStyle = "#292552";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(570, 275);
    ctx.lineTo(600, 275);
    ctx.lineTo(600, 325);
    ctx.stroke();
    ctx.fillStyle = "#ffcb53";
    ctx.shadowColor = "#ffb22e";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(600, 326, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Conveyor belt.
    ctx.shadowColor = "rgba(62, 221, 255, .7)";
    ctx.shadowBlur = 14;
    fillRoundRect(342, 335, 280, 34, 12, "#26254f", "#8a7fd1");
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#9da3d7";
    for (let x = 355; x < 614; x += 24) {
      ctx.beginPath();
      ctx.arc(x, 352, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    const beltCount = Math.min(9, 3 + Math.floor(stats.berryRate / 10));
    ctx.font = "19px serif";
    for (let i = 0; i < beltCount; i += 1) {
      const progress = (worldTime * (0.7 + Core.levelOf(state, "speedyBelts") * 0.14) + i / beltCount) % 1;
      ctx.fillText("🫐", 350 + progress * 263, 345);
    }
    if (Core.levelOf(state, "roboPicker")) {
      ctx.font = "34px serif";
      ctx.fillText("🤖", 584, 326 + Math.sin(worldTime * 4) * 2);
    }
    ctx.restore();
  }

  function drawStore() {
    const storefront = Core.levelOf(state, "storefront") > 0;
    drawShadow(789, 369, storefront ? 105 : 72, 25, 0.4);
    ctx.save();
    if (!storefront) {
      ctx.shadowColor = "rgba(255, 181, 55, .55)";
      ctx.shadowBlur = 15;
      ctx.fillStyle = "#6d3d4b";
      ctx.fillRect(744, 270, 9, 92);
      ctx.fillRect(833, 270, 9, 92);
      const awning = ctx.createLinearGradient(730, 242, 856, 278);
      awning.addColorStop(0, "#e989d9");
      awning.addColorStop(0.5, "#6940c5");
      awning.addColorStop(1, "#3d2a8a");
      ctx.fillStyle = awning;
      ctx.beginPath();
      ctx.moveTo(730, 278);
      ctx.lineTo(856, 278);
      ctx.lineTo(839, 242);
      ctx.lineTo(747, 242);
      ctx.closePath();
      ctx.fill();
      for (let i = 0; i < 6; i += 1) {
        ctx.fillStyle = i % 2 ? "#ffd974" : "#7251d7";
        ctx.fillRect(747 + i * 15.5, 242, 15.5, 36);
      }
      ctx.shadowBlur = 0;
      fillRoundRect(735, 316, 115, 46, 7, "#4b2d6f", "#d998ff");
      ctx.fillStyle = "#ffe987";
      ctx.font = "900 14px ui-rounded, system-ui";
      ctx.textAlign = "center";
      ctx.fillText("BERRY STAND", 792, 337);
      ctx.font = "18px serif";
      ctx.fillText("🫐 🫐 🫐", 792, 358);
    } else {
      ctx.shadowColor = "rgba(219, 111, 255, .6)";
      ctx.shadowBlur = 20;
      const shopWall = ctx.createLinearGradient(697, 221, 871, 370);
      shopWall.addColorStop(0, "#f2d6ff");
      shopWall.addColorStop(0.5, "#aa83d1");
      shopWall.addColorStop(1, "#5b447f");
      fillRoundRect(697, 221, 174, 149, 16, shopWall, "rgba(241,218,255,.7)");
      ctx.shadowBlur = 0;
      const shopRoof = ctx.createLinearGradient(685, 198, 883, 242);
      shopRoof.addColorStop(0, "#dc6fd4");
      shopRoof.addColorStop(0.5, "#7951db");
      shopRoof.addColorStop(1, "#402a8b");
      ctx.fillStyle = shopRoof;
      ctx.beginPath();
      ctx.moveTo(685, 242);
      ctx.lineTo(883, 242);
      ctx.lineTo(844, 198);
      ctx.lineTo(724, 198);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffdd66";
      ctx.shadowColor = "#ffc13c";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(784, 215, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.font = "23px serif";
      ctx.textAlign = "center";
      ctx.fillText("🫐", 784, 223);
      ctx.save();
      ctx.shadowColor = "#59dcff";
      ctx.shadowBlur = 12;
      fillRoundRect(720, 262, 59, 48, 8, "#72def4", "#d7faff");
      ctx.restore();
      fillRoundRect(805, 260, 43, 110, 8, "#67407d", "#d39ce7");
      ctx.fillStyle = "#2f2252";
      ctx.font = "900 13px ui-rounded, system-ui";
      ctx.fillText("BLUEBERRY BOOM", 783, 253);
      if (Core.levelOf(state, "cashier")) {
        ctx.font = "26px serif";
        ctx.fillText("🧑‍💼", 750, 304);
      }
      if (Core.levelOf(state, "berryCafe")) {
        ctx.font = "24px serif";
        ctx.fillText("🧁", 683, 346);
        ctx.font = "700 10px ui-rounded, system-ui";
        ctx.fillText("CAFE", 683, 363);
      }
    }
    ctx.restore();
  }

  function drawTown() {
    ctx.save();
    if (Core.levelOf(state, "chalkboardAd")) {
      ctx.shadowColor = "#d35cff";
      ctx.shadowBlur = 14;
      fillRoundRect(876, 96, 64, 52, 8, "#2b1859", "#d98cff");
      ctx.font = "16px serif";
      ctx.textAlign = "center";
      ctx.fillText("🫐", 908, 118);
      ctx.fillStyle = "#ffe56d";
      ctx.font = "800 8px ui-rounded, system-ui";
      ctx.fillText("BERRY BOOM", 908, 137);
      ctx.shadowBlur = 0;
    }
    if (Core.levelOf(state, "berryMascot")) {
      const mascotY = 145 + Math.abs(Math.sin(worldTime * 5)) * -8;
      ctx.shadowColor = "rgba(71, 66, 255, .8)";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#4f3cc7";
      ctx.beginPath();
      ctx.arc(722, mascotY, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(716, mascotY - 3, 3, 0, Math.PI * 2);
      ctx.arc(728, mascotY - 3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffcf52";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(722, mascotY + 3, 8, 0.1, Math.PI - 0.1);
      ctx.stroke();
      ctx.strokeStyle = "#3a286e";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(710, mascotY + 11);
      ctx.lineTo(703, mascotY + 28);
      ctx.moveTo(734, mascotY + 11);
      ctx.lineTo(741, mascotY + 28);
      ctx.stroke();
    }
    if (Core.levelOf(state, "radioAd")) {
      ctx.shadowColor = "#60e7ff";
      ctx.shadowBlur = 10;
      fillRoundRect(687, 92, 31, 41, 7, "#29204f", "#70e5ff");
      ctx.fillStyle = "#7c6bd3";
      ctx.beginPath();
      ctx.arc(702, 117, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffe475";
      ctx.beginPath();
      ctx.arc(702, 99, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    if (Core.levelOf(state, "festival")) {
      ctx.strokeStyle = "#ffcf52";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(676, 79);
      ctx.quadraticCurveTo(805, 121, 934, 76);
      ctx.stroke();
      for (let i = 0; i < 9; i += 1) {
        ctx.fillStyle = i % 2 ? "#55d8ff" : "#f06fe3";
        ctx.beginPath();
        ctx.moveTo(680 + i * 31, 83 + Math.sin(i) * 7);
        ctx.lineTo(689 + i * 31, 101 + Math.sin(i) * 7);
        ctx.lineTo(698 + i * 31, 83 + Math.sin(i) * 7);
        ctx.closePath();
        ctx.fill();
      }
    }
    if (Core.levelOf(state, "billboard")) {
      ctx.shadowColor = "#ff5ad9";
      ctx.shadowBlur = 20;
      fillRoundRect(752, 49, 111, 46, 10, "#321863", "#ff8ae8");
      ctx.fillStyle = "#ffe869";
      ctx.font = "900 13px ui-rounded, system-ui";
      ctx.textAlign = "center";
      ctx.fillText("BLUEBERRY #1", 807, 77);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  function drawCustomers() {
    const count = Math.min(8, Math.floor(state.customerQueue));
    const skin = ["#f2c29e", "#9a654b", "#d99770", "#f0b58a"];
    const shirts = ["#ef6d6d", "#4c79db", "#f0ae39", "#4ba978", "#9b65ce"];
    for (let i = count - 1; i >= 0; i -= 1) {
      const x = 690 - i * 39;
      const y = 397 + Math.sin(i * 2.4) * 9;
      drawPerson(x, y, skin[i % skin.length], shirts[i % shirts.length], i % 2 ? -1 : 1, false);
    }
    if (state.customerQueue > 8) {
      fillRoundRect(347, 377, 62, 25, 12, "rgba(43,39,79,.78)");
      ctx.fillStyle = "white";
      ctx.font = "800 11px ui-rounded, system-ui";
      ctx.textAlign = "center";
      ctx.fillText(`+${Math.floor(state.customerQueue - 8)} more`, 378, 394);
    }
  }

  function drawPerson(x, y, skin, shirt, facing, isPlayer) {
    const bounce = isPlayer && player.walking ? Math.sin(worldTime * 12) * 2.5 : 0;
    drawShadow(x, y + 16, isPlayer ? 17 : 12, 6, 0.2);
    ctx.save();
    ctx.translate(x, y + bounce);
    ctx.scale(facing || 1, 1);
    ctx.strokeStyle = "#263145";
    ctx.lineWidth = isPlayer ? 5 : 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-7, 10);
    ctx.lineTo(-9, 25);
    ctx.moveTo(7, 10);
    ctx.lineTo(10, 25);
    ctx.stroke();
    fillRoundRect(-14, -15, 28, 30, 9, shirt, "rgba(34,38,66,.15)");
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(0, -25, isPlayer ? 14 : 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a2836";
    ctx.beginPath();
    ctx.arc(-4, -27, 1.5, 0, Math.PI * 2);
    ctx.arc(5, -27, 1.5, 0, Math.PI * 2);
    ctx.fill();
    if (isPlayer) {
      ctx.fillStyle = "#5533b8";
      ctx.beginPath();
      ctx.arc(-2, -35, 13, Math.PI, Math.PI * 2);
      ctx.lineTo(16, -33);
      ctx.lineTo(5, -30);
      ctx.closePath();
      ctx.fill();
      ctx.font = "12px serif";
      ctx.fillText("🫐", -7, -32);
    }
    ctx.restore();
  }

  function drawZoneSpots() {
    const nearest = nearestZone();
    Object.entries(ZONES).forEach(([id, zone]) => {
      const active = nearest && nearest.id === id;
      const pulse = 1 + Math.sin(worldTime * 3) * 0.08;
      ctx.save();
      ctx.globalAlpha = active ? 0.95 : 0.67;
      ctx.shadowColor = zone.color;
      ctx.shadowBlur = active ? 24 : 12;
      ctx.fillStyle = "rgba(20, 12, 55, .78)";
      ctx.beginPath();
      ctx.ellipse(zone.x, zone.y + 11, 52, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = active ? "#ffcf45" : "rgba(255,255,255,.92)";
      ctx.lineWidth = active ? 6 : 4;
      ctx.setLineDash(active ? [] : [8, 6]);
      ctx.beginPath();
      ctx.ellipse(zone.x, zone.y + 8, 43 * pulse, 17 * pulse, 0, 0, Math.PI * 2);
      ctx.fillStyle = zone.color;
      ctx.globalAlpha = active ? 0.48 : 0.28;
      ctx.fill();
      ctx.globalAlpha = active ? 0.95 : 0.67;
      ctx.stroke();
      for (let light = 0; light < 8; light += 1) {
        const angle = (light / 8) * Math.PI * 2;
        const lx = zone.x + Math.cos(angle) * 44;
        const ly = zone.y + 10 + Math.sin(angle) * 17;
        ctx.fillStyle = active ? "#ffe36d" : "#89e9ff";
        ctx.beginPath();
        ctx.arc(lx, ly, active ? 3.2 : 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      if ((id === "factory" || id === "store") && platformZone === id && platformProgress > 0) {
        ctx.strokeStyle = "#ffcf45";
        ctx.lineWidth = 7;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.ellipse(zone.x, zone.y + 8, 49, 22, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (platformProgress / 5));
        ctx.stroke();
      }
      ctx.setLineDash([]);
      fillRoundRect(zone.x - 43, zone.y + 25, 86, 22, 9, active ? "#4b339d" : "rgba(45,50,79,.78)");
      ctx.fillStyle = "white";
      ctx.font = "800 10px ui-rounded, system-ui";
      ctx.textAlign = "center";
      const padLabel = (id === "factory" || id === "store") && active
        ? (platformTriggered ? "PAD READY!" : `UPGRADE IN ${Math.max(1, Math.ceil(5 - platformProgress))}s`)
        : zone.name;
      ctx.fillText(padLabel, zone.x, zone.y + 40);
      ctx.restore();
    });
  }

  function drawPlayer() {
    const bounce = player.walking ? Math.sin(worldTime * 12) * 2.2 : Math.sin(worldTime * 2) * 0.6;
    const stride = player.walking ? Math.sin(worldTime * 12) * 5 : 0;
    drawShadow(player.x, player.y + 19, 22, 8, 0.45);
    ctx.save();
    ctx.translate(player.x, player.y + bounce);
    ctx.scale(player.facing || 1, 1);

    // Warm rim light keeps the boy readable against the dark-purple ground.
    ctx.shadowColor = "rgba(95, 215, 255, .75)";
    ctx.shadowBlur = 13;
    ctx.strokeStyle = "#202149";
    ctx.lineCap = "round";

    // Jeans and sneakers.
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-7, 8);
    ctx.lineTo(-9 - stride * 0.35, 27);
    ctx.moveTo(7, 8);
    ctx.lineTo(9 + stride * 0.35, 27);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#ebf5ff";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-13 - stride * 0.35, 28);
    ctx.lineTo(-5 - stride * 0.35, 28);
    ctx.moveTo(5 + stride * 0.35, 28);
    ctx.lineTo(14 + stride * 0.35, 28);
    ctx.stroke();

    // Hoodie body with a bright zipper and blueberry shoulder bag.
    const hoodie = ctx.createLinearGradient(-18, -19, 18, 16);
    hoodie.addColorStop(0, "#ffd95a");
    hoodie.addColorStop(0.55, "#f5a83d");
    hoodie.addColorStop(1, "#c96738");
    fillRoundRect(-18, -20, 36, 35, 11, hoodie, "rgba(255,240,180,.55)");
    ctx.strokeStyle = "#7b3d33";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.lineTo(0, 13);
    ctx.stroke();
    ctx.fillStyle = "#3b2a8f";
    ctx.beginPath();
    ctx.arc(15, 5, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8373ff";
    ctx.beginPath();
    ctx.arc(12, 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Arms swing while walking.
    ctx.strokeStyle = "#e6a277";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-15, -12);
    ctx.lineTo(-22, 6 + stride * 0.45);
    ctx.moveTo(15, -12);
    ctx.lineTo(22, 6 - stride * 0.45);
    ctx.stroke();

    // Face, ears, and short hair make the avatar clearly a boy rather than a generic icon.
    ctx.fillStyle = "#d89469";
    ctx.fillRect(-5, -27, 10, 11);
    ctx.fillStyle = "#e2a176";
    ctx.beginPath();
    ctx.arc(0, -37, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-16, -37, 4, 0, Math.PI * 2);
    ctx.arc(16, -37, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a2434";
    ctx.beginPath();
    ctx.arc(-8, -47, 10, Math.PI, Math.PI * 2);
    ctx.arc(5, -49, 12, Math.PI, Math.PI * 2);
    ctx.arc(13, -43, 6, Math.PI * 1.1, Math.PI * 2.05);
    ctx.fill();

    // Indigo baseball cap with a blueberry badge.
    const cap = ctx.createLinearGradient(-16, -55, 17, -40);
    cap.addColorStop(0, "#6a52e0");
    cap.addColorStop(1, "#2e237a");
    ctx.fillStyle = cap;
    ctx.beginPath();
    ctx.arc(-1, -49, 15, Math.PI, Math.PI * 2);
    ctx.lineTo(15, -46);
    ctx.lineTo(20, -43);
    ctx.lineTo(5, -43);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#79d2ff";
    ctx.beginPath();
    ctx.arc(-2, -49, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Friendly expression.
    ctx.fillStyle = "#2b2337";
    ctx.beginPath();
    ctx.arc(-5, -37, 1.8, 0, Math.PI * 2);
    ctx.arc(6, -37, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8d4b4c";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(1, -31, 5, 0.15, Math.PI - 0.1);
    ctx.stroke();
    ctx.restore();
  }

  function drawParticles() {
    ctx.save();
    ctx.textAlign = "center";
    particles.forEach((particle) => {
      ctx.globalAlpha = Math.max(0, Math.min(1, particle.life / 0.35));
      ctx.font = `${particle.size}px serif`;
      ctx.fillText(particle.emoji, particle.x, particle.y);
    });
    ctx.restore();
  }

  function handleCanvasPointer(event) {
    if (!elements.welcomeModal.hidden) return;
    const rect = elements.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (elements.canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (elements.canvas.height / rect.height);
    let target = { x, y };
    Object.values(ZONES).forEach((zone) => {
      if (Math.hypot(x - zone.x, y - zone.y) < 76) target = { x: zone.x, y: zone.y };
    });
    player.targetX = Math.max(42, Math.min(918, target.x));
    player.targetY = Math.max(78, Math.min(495, target.y));
  }

  function gameLoop(now) {
    const delta = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    worldTime += delta;
    updatePlayer(delta);
    updateUpgradePlatforms(delta);
    updateParticles(delta);
    updateMathTimer(now);

    const economy = Core.tickEconomy(state, delta);
    saleSparkCooldown -= delta;
    if (economy.sold > 0 && saleSparkCooldown <= 0) {
      burst(790, 300, "💰", 2);
      saleSparkCooldown = 0.28;
    }

    if (now - lastAchievementCheck > 900) {
      lastAchievementCheck = now;
      checkAchievements();
    }
    if (now - lastSave > 5000) {
      lastSave = now;
      saveState();
    }

    updateUI(false);
    drawWorld();
    requestAnimationFrame(gameLoop);
  }

  function bindEvents() {
    elements.actionButton.addEventListener("click", interact);
    $("#quickHarvestButton").addEventListener("click", openMathRush);
    $("#allUpgradesButton").addEventListener("click", () => openUpgrades("field", false));
    $("#finishMathButton").addEventListener("click", closeMathRush);
    $("#startGameButton").addEventListener("click", () => {
      state.hasStarted = true;
      closeModal(elements.welcomeModal);
      saveState();
      window.setTimeout(openMathRush, 140);
    });
    $("#helpButton").addEventListener("click", () => openModal(elements.welcomeModal));
    elements.soundButton.addEventListener("click", () => {
      state.soundOn = !state.soundOn;
      updateSoundButton();
      if (state.soundOn) playSound("tap");
      saveState();
    });
    $("#resetButton").addEventListener("click", (event) => {
      if (!resetArmed) {
        resetArmed = true;
        event.currentTarget.textContent = "Tap again to confirm";
        toast("Tap “Start over” again within 4 seconds to erase this factory.", "⚠️");
        window.setTimeout(() => {
          resetArmed = false;
          event.currentTarget.textContent = "↻ Start over";
        }, 4000);
        return;
      }
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    });

    $$("[data-close]").forEach((button) => {
      button.addEventListener("click", () => closeModal(document.getElementById(button.dataset.close)));
    });
    $$(".upgrade-tabs button").forEach((button) => {
      button.addEventListener("click", () => {
        if ((button.dataset.zone === "factory" || button.dataset.zone === "store") && platformAccessZone !== button.dataset.zone) {
          toast(`Stand on the ${button.dataset.zone} pad for 5 seconds to unlock those upgrades.`, "⏱️");
          return;
        }
        activeUpgradeZone = button.dataset.zone;
        renderUpgrades();
      });
    });

    elements.canvas.addEventListener("pointerdown", handleCanvasPointer);
    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if (["arrowleft", "arrowright", "arrowup", "arrowdown", " "].includes(key)) event.preventDefault();
      if (!elements.mathModal.hidden && /^[1-4]$/.test(key) && !mathLocked) {
        const button = elements.answers.querySelectorAll("button")[Number(key) - 1];
        if (button) button.click();
        return;
      }
      if (key === "escape") {
        if (!elements.mathModal.hidden) closeMathRush();
        else if (!elements.upgradesModal.hidden) closeModal(elements.upgradesModal);
        else if (!elements.welcomeModal.hidden && state.hasStarted) closeModal(elements.welcomeModal);
        return;
      }
      if ((key === " " || key === "e") && !$$('.modal-backdrop:not([hidden])').length) {
        interact();
        return;
      }
      heldKeys.add(key);
    });
    window.addEventListener("keyup", (event) => heldKeys.delete(event.key.toLowerCase()));
    window.addEventListener("blur", () => {
      heldKeys.clear();
      heldDirections.clear();
    });

    $$(".move-button").forEach((button) => {
      const start = (event) => {
        event.preventDefault();
        heldDirections.add(button.dataset.move);
        button.classList.add("is-held");
        button.setPointerCapture?.(event.pointerId);
      };
      const stop = () => {
        heldDirections.delete(button.dataset.move);
        button.classList.remove("is-held");
      };
      button.addEventListener("pointerdown", start);
      button.addEventListener("pointerup", stop);
      button.addEventListener("pointercancel", stop);
      button.addEventListener("lostpointercapture", stop);
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) saveState();
      else lastFrame = performance.now();
    });
    window.addEventListener("beforeunload", saveState);
  }

  const offlineBerries = applyOfflineGrowth();
  bindEvents();
  updateSoundButton();
  updateUI(true);
  renderUpgrades();
  if (!state.hasStarted) openModal(elements.welcomeModal);
  else if (offlineBerries >= 1) window.setTimeout(() => toast(`Your factory grew <strong>${Core.formatNumber(offlineBerries)} blueberries</strong> while you were away!`, "🌙"), 450);
  requestAnimationFrame(gameLoop);
})();
