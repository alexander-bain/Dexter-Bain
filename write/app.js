(() => {
  "use strict";

  const API = "https://draftlab-writing.dexterhbain.chatgpt.site";
  const TOKEN_KEY = "draftlab-session-v1";
  const FEEDBACK_KEY = "draftlab-feedback-v1";
  const OUTLINE_BEST_KEY = "draftlab-outline-best-v1";
  const categories = ["Imagery", "Characterization", "Dialogue"];
  const quickPrompts = {
    Imagery: [
      { category: "Imagery", title: "Rush Hour", prompt: "Describe a packed train station during rush hour.", handicap: "Do not use loud, noisy, roar, or booming.", forbiddenWords: ["loud", "noisy", "roar", "booming"], coachTip: "Use movement, color, and small physical details." },
      { category: "Imagery", title: "Thin Shoes", prompt: "Describe climbing a rocky trail in shoes with thin soles.", handicap: "Do not use pain, hurt, ache, or sore.", forbiddenWords: ["pain", "hurt", "ache", "sore"], coachTip: "Show the feeling through movement and texture." },
      { category: "Imagery", title: "Oven Trouble", prompt: "Describe a bakery after every oven overheats at once.", handicap: "Do not use hot, heat, smoke, or smell.", forbiddenWords: ["hot", "heat", "smoke", "smell"], coachTip: "Show the scene through objects and reactions." },
    ],
    Characterization: [
      { category: "Characterization", title: "The Selfish Teammate", prompt: "Gradually reveal a selfish teammate during practice.", handicap: "Do not use insults, threats, or physical aggression.", forbiddenWords: ["selfish", "punch", "hit", "kick"], coachTip: "Reveal personality through choices and body language." },
      { category: "Characterization", title: "The Loyal Neighbor", prompt: "Gradually reveal a loyal neighbor during a difficult morning.", handicap: "Do not use loyal, kind, helpful, or caring.", forbiddenWords: ["loyal", "kind", "helpful", "caring"], coachTip: "Let actions prove the character trait." },
      { category: "Characterization", title: "The Curious Camper", prompt: "Gradually reveal a curious camper exploring a new trail.", handicap: "Every sentence must begin with an action.", forbiddenWords: [], coachTip: "Use repeated choices to reveal curiosity." },
    ],
    Dialogue: [
      { category: "Dialogue", title: "The Shared Room", prompt: "Write a conversation between cousins who disagree about sharing a room.", handicap: "Neither character may raise their voice.", forbiddenWords: ["yelled", "shouted", "screamed"], coachTip: "Give each speaker a different way of talking." },
      { category: "Dialogue", title: "Rules Expert", prompt: "Write a coach helping a player who knows the rules better.", handicap: "The player must correct the coach politely.", forbiddenWords: [], coachTip: "Use the conversation to shift who has control." },
      { category: "Dialogue", title: "Final Inning", prompt: "Write a baseball dugout conversation before the final pitch.", handicap: "Do not use common sports clichés.", forbiddenWords: ["believe", "heart", "champions"], coachTip: "Keep each line brief and purposeful." },
    ],
  };
  const quickOutlinePrompts = [
    { id: "best-season", question: "Which season of the year is the best?" },
    { id: "good-friend", question: "What is the most important quality in a friend?" },
    { id: "useful-skill", question: "What skill should every student learn?" },
  ];
  const $ = (id) => document.getElementById(id);
  const state = { category: "Imagery", prompt: null, token: localStorage.getItem(TOKEN_KEY) || "", profile: null, priorFeedback: {} };
  const outlineState = { prompt: null, loaded: false, startedAt: 0, elapsedMs: 0, running: false, timer: 0, bestTime: Number(localStorage.getItem(OUTLINE_BEST_KEY)) || null };

  try { state.priorFeedback = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || "{}"); } catch { state.priorFeedback = {}; }

  const hashToken = new URLSearchParams(location.hash.slice(1)).get("session");
  if (hashToken && /^[a-f0-9]{64}$/.test(hashToken)) {
    state.token = hashToken;
    localStorage.setItem(TOKEN_KEY, hashToken);
    history.replaceState(null, "", `${location.pathname}${location.search}`);
  }

  function sentenceCount(text) {
    const clean = text.trim();
    if (!clean) return 0;
    return clean.split(/(?<=[.!?])["']?\s+/).map((sentence) => sentence.trim()).filter(Boolean).length;
  }

  async function api(path, options = {}) {
    const { timeoutMs, ...fetchOptions } = options;
    const headers = new Headers(options.headers || {});
    if (options.body) headers.set("Content-Type", "application/json");
    if (state.token) headers.set("Authorization", `Bearer ${state.token}`);
    const controller = timeoutMs ? new AbortController() : null;
    const timeout = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const response = await fetch(`${API}${path}`, { ...fetchOptions, headers, signal: controller?.signal });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "DraftLab could not respond.");
      return data;
    } finally {
      if (timeout) window.clearTimeout(timeout);
    }
  }

  function setError(message = "") {
    $("editor-error").textContent = message;
    $("editor-error").hidden = !message;
  }

  function updateStats(profile) {
    const stats = profile?.stats || { highScore: 0, averageScore: 0, streak: 0, attempts: 0 };
    $("high-score").textContent = stats.highScore;
    $("average-score").textContent = stats.averageScore;
    $("attempts").textContent = stats.attempts;
    $("streak").textContent = stats.streak;
    $("account-button").textContent = profile?.username || (profile?.authenticated ? "Account" : "Save progress");
  }

  async function loadProfile() {
    try {
      state.profile = await api("/api/profile");
      if (!state.profile.authenticated && state.token) {
        state.token = "";
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      state.profile = { authenticated: false, stats: { highScore: 0, averageScore: 0, streak: 0, attempts: 0 } };
    }
    updateStats(state.profile);
  }

  async function loadPrompt(category) {
    state.category = category;
    $("loading").hidden = false;
    $("workspace").hidden = true;
    $("results").hidden = true;
    setError();
    document.querySelectorAll("[data-category]").forEach((button) => button.classList.toggle("active", button.dataset.category === category));
    try {
      state.prompt = await api("/api/prompt", { method: "POST", body: JSON.stringify({ category }), timeoutMs: 2800 });
    } catch {
      const choices = quickPrompts[category];
      state.prompt = choices[Math.floor(Math.random() * choices.length)];
    }
    try {
      $("prompt-title").textContent = state.prompt.title;
      $("prompt-text").textContent = state.prompt.prompt;
      $("handicap-text").textContent = state.prompt.handicap;
      $("coach-tip").textContent = `Tip: ${state.prompt.coachTip}`;
      $("story").value = "";
      updateSentenceCount();
      $("workspace").hidden = false;
    } catch {
      $("workspace").hidden = false;
      setError("Could not prepare a prompt. Tap a category to try again.");
    } finally {
      $("loading").hidden = true;
    }
  }

  function updateSentenceCount() {
    const count = sentenceCount($("story").value);
    const ready = count >= 4 && count <= 5;
    $("sentence-count").textContent = `${count} / 4–5 sentences`;
    $("sentence-count").classList.toggle("ready", ready);
    $("score-button").disabled = !ready || !state.prompt;
  }

  function showResults(result) {
    $("workspace").hidden = true;
    $("results").hidden = false;
    $("score").textContent = result.score;
    $("result-title").textContent = result.score === 100 ? "A perfect draft." : result.strength;
    $("result-subtitle").textContent = `Your ${state.prompt.category.toLowerCase()} challenge has been scored against the prompt and handicap.`;
    $("carryover-score").textContent = `${result.feedbackCarryoverScore}/10`;
    $("carryover-note").textContent = result.feedbackCarryoverNote;
    $("perfect-example").textContent = result.perfectExample;
    $("feedback-title").textContent = result.score === 100 ? "What worked" : "Five ways to improve";
    const list = $("feedback-list");
    list.replaceChildren();
    result.improvements.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.append(li);
    });
    if (result.improvements.length) {
      state.priorFeedback[state.prompt.category] = result.improvements;
      localStorage.setItem(FEEDBACK_KEY, JSON.stringify(state.priorFeedback));
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function scoreStory() {
    const story = $("story").value.trim();
    if (!state.prompt || sentenceCount(story) < 4 || sentenceCount(story) > 5) return;
    const button = $("score-button");
    button.disabled = true;
    button.textContent = "Scoring…";
    setError();
    try {
      const result = await api("/api/evaluate", {
        method: "POST",
        body: JSON.stringify({ prompt: state.prompt, story, priorFeedback: state.priorFeedback[state.prompt.category] || [] }),
      });
      showResults(result);
      await loadProfile();
    } catch (error) {
      setError(error.message);
    } finally {
      button.textContent = "Score my story";
      updateSentenceCount();
    }
  }

  function openAccount() {
    const signedIn = Boolean(state.profile?.authenticated);
    $("signed-out-box").hidden = signedIn;
    $("signed-in-box").hidden = !signedIn;
    if (signedIn) {
      $("account-email").textContent = state.profile.email || "Signed in";
      $("username").value = state.profile.username || "";
    }
    $("account-dialog").showModal();
  }

  function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function showMode(mode) {
    const outlineMode = mode === "outline";
    $("story-mode").hidden = outlineMode;
    $("outline-mode").hidden = !outlineMode;
    $("story-mode-button").classList.toggle("active", !outlineMode);
    $("outline-mode-button").classList.toggle("active", outlineMode);
    if (outlineMode && !outlineState.loaded) loadOutlinePrompt();
  }

  function renderOutlineTimer() {
    $("outline-time").textContent = formatTime(outlineState.elapsedMs);
    $("outline-best").textContent = outlineState.bestTime ? formatTime(outlineState.bestTime) : "—";
  }

  function startOutlineTimer() {
    window.clearInterval(outlineState.timer);
    outlineState.running = true;
    outlineState.timer = window.setInterval(() => {
      if (!outlineState.running) return;
      outlineState.elapsedMs = Date.now() - outlineState.startedAt;
      renderOutlineTimer();
    }, 250);
  }

  function resetOutlineFields() {
    $("outline-answer").value = "";
    for (let reasonIndex = 0; reasonIndex < 3; reasonIndex += 1) {
      $(`outline-reason-${reasonIndex}`).value = "";
      for (let supportIndex = 0; supportIndex < 3; supportIndex += 1) {
        $(`outline-support-${reasonIndex}-${supportIndex}`).value = "";
      }
    }
    $("outline-results").hidden = true;
    $("outline-form").hidden = false;
    $("outline-error").hidden = true;
    updateOutlineReady();
  }

  function outlineValues() {
    return {
      answer: $("outline-answer").value.trim(),
      reasons: [0, 1, 2].map((reasonIndex) => ({
        reason: $(`outline-reason-${reasonIndex}`).value.trim(),
        supports: [0, 1, 2].map((supportIndex) => $(`outline-support-${reasonIndex}-${supportIndex}`).value.trim()),
      })),
    };
  }

  function outlineComplete(outline) {
    return outline.answer.length > 1 && outline.reasons.every((item) => item.reason.length > 1 && item.supports.every((support) => support.length > 1));
  }

  function updateOutlineReady() {
    $("outline-grade").disabled = !outlineComplete(outlineValues()) || !outlineState.prompt;
  }

  async function loadOutlinePrompt() {
    outlineState.loaded = true;
    outlineState.running = false;
    window.clearInterval(outlineState.timer);
    resetOutlineFields();
    $("outline-question").textContent = "Preparing your question…";
    try {
      outlineState.prompt = await api("/api/outline-prompt", { method: "POST", timeoutMs: 2800 });
    } catch {
      outlineState.prompt = quickOutlinePrompts[Math.floor(Math.random() * quickOutlinePrompts.length)];
    }
    $("outline-question").textContent = outlineState.prompt.question;
    outlineState.startedAt = Date.now();
    outlineState.elapsedMs = 0;
    renderOutlineTimer();
    startOutlineTimer();
    updateOutlineReady();
  }

  function addOutlineGradeCard(container, title, score, feedback, supportScores = []) {
    const card = document.createElement("article");
    card.className = "part-grade";
    const heading = document.createElement("div");
    const label = document.createElement("span");
    const badge = document.createElement("strong");
    label.textContent = title;
    badge.textContent = `${score}/10`;
    heading.append(label, badge);
    const note = document.createElement("p");
    note.textContent = feedback;
    card.append(heading, note);
    if (supportScores.length) {
      const row = document.createElement("div");
      row.className = "support-score-row";
      supportScores.forEach((detailScore, index) => {
        const item = document.createElement("span");
        item.textContent = `Detail ${index + 1}: ${detailScore}/10`;
        row.append(item);
      });
      card.append(row);
    }
    container.append(card);
  }

  function showOutlineResults(result) {
    $("outline-form").hidden = true;
    $("outline-results").hidden = false;
    $("outline-score").textContent = result.score;
    $("outline-strength").textContent = result.strength;
    $("outline-summary").textContent = `Finished in ${formatTime(outlineState.elapsedMs)}. Organization: ${result.organizationScore}/10.`;
    $("outline-next-step").textContent = result.nextStep;
    const grid = $("outline-grade-grid");
    grid.replaceChildren();
    addOutlineGradeCard(grid, "Overall answer", result.answer.score, result.answer.feedback);
    result.reasons.forEach((reason, index) => addOutlineGradeCard(grid, `Reason ${index + 1}`, reason.score, reason.feedback, reason.supportScores));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function gradeOutline() {
    const outline = outlineValues();
    if (!outlineState.prompt || !outlineComplete(outline)) return;
    outlineState.elapsedMs = Date.now() - outlineState.startedAt;
    outlineState.running = false;
    window.clearInterval(outlineState.timer);
    renderOutlineTimer();
    $("outline-grade").disabled = true;
    $("outline-grade").textContent = "Grading…";
    $("outline-error").hidden = true;
    try {
      const result = await api("/api/evaluate-outline", {
        method: "POST",
        body: JSON.stringify({ prompt: outlineState.prompt.question, outline }),
      });
      if (!outlineState.bestTime || outlineState.elapsedMs < outlineState.bestTime) {
        outlineState.bestTime = outlineState.elapsedMs;
        localStorage.setItem(OUTLINE_BEST_KEY, String(outlineState.bestTime));
        renderOutlineTimer();
      }
      showOutlineResults(result);
    } catch (error) {
      $("outline-error").textContent = error.message;
      $("outline-error").hidden = false;
      outlineState.startedAt = Date.now() - outlineState.elapsedMs;
      startOutlineTimer();
    } finally {
      $("outline-grade").textContent = "Stop timer & grade";
      updateOutlineReady();
    }
  }

  document.querySelectorAll("[data-category]").forEach((button) => button.addEventListener("click", () => loadPrompt(button.dataset.category)));
  $("story").addEventListener("input", updateSentenceCount);
  $("score-button").addEventListener("click", scoreStory);
  $("edit-button").addEventListener("click", () => { $("results").hidden = true; $("workspace").hidden = false; });
  $("next-button").addEventListener("click", () => loadPrompt(state.category));
  $("account-button").addEventListener("click", openAccount);
  $("close-account").addEventListener("click", () => $("account-dialog").close());
  $("account-dialog").addEventListener("click", (event) => { if (event.target === $("account-dialog")) $("account-dialog").close(); });
  $("username-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    $("account-message").textContent = "Saving…";
    try {
      state.profile = await api("/api/profile", { method: "POST", body: JSON.stringify({ username: $("username").value }) });
      $("account-message").textContent = "Username saved.";
      updateStats(state.profile);
    } catch (error) { $("account-message").textContent = error.message; }
  });
  $("forget-device").addEventListener("click", () => {
    state.token = "";
    localStorage.removeItem(TOKEN_KEY);
    $("account-dialog").close();
    loadProfile();
  });
  $("story-mode-button").addEventListener("click", () => showMode("story"));
  $("outline-mode-button").addEventListener("click", () => showMode("outline"));
  $("outline-mode").querySelectorAll("textarea, input").forEach((field) => field.addEventListener("input", updateOutlineReady));
  $("outline-grade").addEventListener("click", gradeOutline);
  $("outline-skip").addEventListener("click", loadOutlinePrompt);
  $("outline-new").addEventListener("click", loadOutlinePrompt);
  $("outline-edit").addEventListener("click", () => {
    $("outline-results").hidden = true;
    $("outline-form").hidden = false;
    outlineState.startedAt = Date.now() - outlineState.elapsedMs;
    startOutlineTimer();
  });

  Promise.all([loadProfile(), loadPrompt(categories[0])]);
})();
