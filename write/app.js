(() => {
  "use strict";

  const API = "https://draftlab-writing.dexterhbain.chatgpt.site";
  const TOKEN_KEY = "draftlab-session-v1";
  const FEEDBACK_KEY = "draftlab-feedback-v1";
  const categories = ["Imagery", "Characterization", "Conflict"];
  const $ = (id) => document.getElementById(id);
  const state = { category: "Imagery", prompt: null, token: localStorage.getItem(TOKEN_KEY) || "", profile: null, priorFeedback: {} };

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
    const headers = new Headers(options.headers || {});
    if (options.body) headers.set("Content-Type", "application/json");
    if (state.token) headers.set("Authorization", `Bearer ${state.token}`);
    const response = await fetch(`${API}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "DraftLab could not respond.");
    return data;
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
      state.prompt = await api("/api/prompt", { method: "POST", body: JSON.stringify({ category }) });
      $("prompt-title").textContent = state.prompt.title;
      $("prompt-text").textContent = state.prompt.prompt;
      $("handicap-text").textContent = state.prompt.handicap;
      $("coach-tip").textContent = `Tip: ${state.prompt.coachTip}`;
      $("story").value = "";
      updateSentenceCount();
      $("workspace").hidden = false;
    } catch (error) {
      $("workspace").hidden = false;
      setError(error.message);
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

  Promise.all([loadProfile(), loadPrompt(categories[0])]);
})();
