(() => {
  "use strict";

  const API = "https://draftlab-writing.dexterhbain.chatgpt.site";
  const TOKEN_KEY = "draftlab-session-v1";
  const FEEDBACK_KEY = "draftlab-feedback-v1";
  const OUTLINE_BEST_KEY = "draftlab-outline-best-v1";
  const PROMPT_HISTORY_KEY = "draftlab-prompt-history-v2";
  const PROMPT_HISTORY_LIMIT = 50;
  const categories = ["Imagery", "Characterization", "Dialogue"];
  const quickPrompts = {
    Imagery: [
      { category: "Imagery", title: "Mid-Cycle", prompt: "Describe a busy laundromat when every machine stops at once.", handicap: "Do not use broken, quiet, still, or waiting.", forbiddenWords: ["broken", "quiet", "still", "waiting"], coachTip: "Use unfinished motions and small reactions." },
      { category: "Imagery", title: "Hail on Glass", prompt: "Describe a greenhouse during a sudden hailstorm.", handicap: "Do not use loud, glass, storm, or scared.", forbiddenWords: ["loud", "glass", "storm", "scared"], coachTip: "Build the scene with movement, color, and texture." },
      { category: "Imagery", title: "After the Credits", prompt: "Describe a movie theater after the final audience leaves.", handicap: "Do not use empty, dark, quiet, or lonely.", forbiddenWords: ["empty", "dark", "quiet", "lonely"], coachTip: "Let abandoned objects show what just happened." },
      { category: "Imagery", title: "Fog Crossing", prompt: "Describe a crowded ferry entering a thick fog bank.", handicap: "Do not use fog, mist, white, or see.", forbiddenWords: ["fog", "mist", "white", "see"], coachTip: "Use touch, distance, and uncertain shapes." },
      { category: "Imagery", title: "Loose Lanterns", prompt: "Describe a street market as paper lanterns tear free.", handicap: "Do not use wind, blow, fly, or gust.", forbiddenWords: ["wind", "blow", "fly", "gust"], coachTip: "Show motion through objects and people." },
      { category: "Imagery", title: "Noon Meltdown", prompt: "Describe an ice cream cart that loses power at noon.", handicap: "Do not use melt, hot, sun, or sticky.", forbiddenWords: ["melt", "hot", "sun", "sticky"], coachTip: "Use shape, color, and hurried movement." },
      { category: "Imagery", title: "Sprinkler Surprise", prompt: "Describe a library when the ceiling sprinklers turn on.", handicap: "Do not use water, wet, rain, or soaked.", forbiddenWords: ["water", "wet", "rain", "soaked"], coachTip: "Focus on books, clothing, and reactions." },
      { category: "Imagery", title: "First Flakes", prompt: "Describe a city rooftop as the season's first snow begins.", handicap: "Do not use snow, cold, white, or freeze.", forbiddenWords: ["snow", "cold", "white", "freeze"], coachTip: "Use changing surfaces and sounds." },
      { category: "Imagery", title: "Lights Out", prompt: "Describe a pet store during a brief blackout.", handicap: "Do not use dark, black, scared, or light.", forbiddenWords: ["dark", "black", "scared", "light"], coachTip: "Use animal movement and nearby sounds." },
      { category: "Imagery", title: "Radio Mix-Up", prompt: "Describe a garage when every radio changes stations together.", handicap: "Do not use music, song, noise, or loud.", forbiddenWords: ["music", "song", "noise", "loud"], coachTip: "Layer reactions, rhythm, and physical details." },
      { category: "Imagery", title: "Morning Discovery", prompt: "Describe a campsite after a raccoon raids it overnight.", handicap: "Do not use mess, trash, animal, or hungry.", forbiddenWords: ["mess", "trash", "animal", "hungry"], coachTip: "Show the evidence one detail at a time." },
      { category: "Imagery", title: "Closing Bell", prompt: "Describe a flower shop during the final minute before closing.", handicap: "Do not use flower, smell, pretty, or color.", forbiddenWords: ["flower", "smell", "pretty", "color"], coachTip: "Use hands, shadows, shapes, and movement." },
    ],
    Characterization: [
      { category: "Characterization", title: "The Patient Driver", prompt: "Reveal a patient bus driver during a long detour.", handicap: "Do not use patient, calm, kind, or helpful.", forbiddenWords: ["patient", "calm", "kind", "helpful"], coachTip: "Let small choices reveal the driver's character." },
      { category: "Characterization", title: "The Dishonest Partner", prompt: "Reveal a dishonest student during a group project.", handicap: "Do not use lie, liar, cheat, or dishonest.", forbiddenWords: ["lie", "liar", "cheat", "dishonest"], coachTip: "Use contradictions between words and actions." },
      { category: "Characterization", title: "The Resourceful Sibling", prompt: "Reveal a resourceful sibling during a power outage.", handicap: "Do not use smart, clever, prepared, or solution.", forbiddenWords: ["smart", "clever", "prepared", "solution"], coachTip: "Show useful choices instead of naming the trait." },
      { category: "Characterization", title: "The Cautious Keeper", prompt: "Reveal a cautious goalkeeper before a penalty kick.", handicap: "Do not use afraid, nervous, worried, or careful.", forbiddenWords: ["afraid", "nervous", "worried", "careful"], coachTip: "Use repeated checks and deliberate movement." },
      { category: "Characterization", title: "The Generous Rival", prompt: "Reveal a generous rival at a science fair.", handicap: "Do not use generous, kind, share, or help.", forbiddenWords: ["generous", "kind", "share", "help"], coachTip: "Let an unexpected choice reveal the trait." },
      { category: "Characterization", title: "The Stubborn Chef", prompt: "Reveal a stubborn chef when one ingredient is missing.", handicap: "Do not use stubborn, refuse, change, or quit.", forbiddenWords: ["stubborn", "refuse", "change", "quit"], coachTip: "Show the trait through decisions and body language." },
      { category: "Characterization", title: "The Observant Guard", prompt: "Reveal an observant museum guard on a busy afternoon.", handicap: "Do not use notice, watch, see, or observe.", forbiddenWords: ["notice", "watch", "see", "observe"], coachTip: "Use precise reactions to tiny details." },
      { category: "Characterization", title: "The Jealous Musician", prompt: "Reveal a jealous musician during rehearsal.", handicap: "Do not use jealous, envy, better, or unfair.", forbiddenWords: ["jealous", "envy", "better", "unfair"], coachTip: "Let attention and choices expose the feeling." },
      { category: "Characterization", title: "The Dependable Friend", prompt: "Reveal a dependable friend after the last bus leaves.", handicap: "Do not use reliable, promise, help, or stay.", forbiddenWords: ["reliable", "promise", "help", "stay"], coachTip: "Make actions prove dependability." },
      { category: "Characterization", title: "The Impulsive Shopper", prompt: "Reveal an impulsive shopper at a flea market.", handicap: "Every sentence must begin with a different action.", forbiddenWords: [], coachTip: "Use quick decisions to build the personality." },
      { category: "Characterization", title: "The Lonely Lifeguard", prompt: "Reveal a lonely lifeguard after the pool closes.", handicap: "Do not use alone, lonely, sad, or friend.", forbiddenWords: ["alone", "lonely", "sad", "friend"], coachTip: "Use habits and attention to empty spaces." },
      { category: "Characterization", title: "The Proud Apprentice", prompt: "Reveal a proud apprentice after finishing a difficult repair.", handicap: "Do not use proud, smile, perfect, or best.", forbiddenWords: ["proud", "smile", "perfect", "best"], coachTip: "Show pride through posture, speech, and choices." },
    ],
    Dialogue: [
      { category: "Dialogue", title: "Found Kitten", prompt: "Write siblings deciding who will care for a found kitten.", handicap: "One sibling may speak only in questions.", forbiddenWords: [], coachTip: "Give each speaker a different goal." },
      { category: "Dialogue", title: "Delayed Launch", prompt: "Write an astronaut and mechanic debating a delayed launch.", handicap: "Neither speaker may use the word no.", forbiddenWords: ["no"], coachTip: "Let technical details raise the tension." },
      { category: "Dialogue", title: "Longer Hours", prompt: "Write a student asking a principal to extend library hours.", handicap: "Do not use school, book, study, or homework.", forbiddenWords: ["school", "book", "study", "homework"], coachTip: "Make both sides sound reasonable." },
      { category: "Dialogue", title: "Matching Desserts", prompt: "Write two bakers discovering identical contest entries.", handicap: "One speaker cannot use I, me, or my.", forbiddenWords: ["I", "me", "my"], coachTip: "Create distinct voices without dialogue tags." },
      { category: "Dialogue", title: "Schedule Secret", prompt: "Write cousins planning a party around conflicting schedules.", handicap: "Do not use surprise, secret, busy, or plan.", forbiddenWords: ["surprise", "secret", "busy", "plan"], coachTip: "Let interruptions reveal the problem." },
      { category: "Dialogue", title: "Changed Call", prompt: "Write a referee explaining a changed call to a captain.", handicap: "Include exactly one apology.", forbiddenWords: [], coachTip: "Use calm language while the stakes stay high." },
      { category: "Dialogue", title: "The Canoe", prompt: "Write a counselor and camper discussing a refused canoe trip.", handicap: "Neither speaker may name an emotion.", forbiddenWords: ["afraid", "scared", "angry", "nervous"], coachTip: "Let word choice reveal how each person feels." },
      { category: "Dialogue", title: "Missing Packages", prompt: "Write neighbors comparing two missing deliveries.", handicap: "Neither neighbor may accuse anyone.", forbiddenWords: ["stole", "thief", "blame", "fault"], coachTip: "Build suspicion through careful questions." },
      { category: "Dialogue", title: "Missing Prop", prompt: "Write two actors backstage when an important prop disappears.", handicap: "Each line must be eight words or fewer.", forbiddenWords: [], coachTip: "Keep the exchange quick and purposeful." },
      { category: "Dialogue", title: "Failed Experiment", prompt: "Write a scientist explaining a failed experiment to a reporter.", handicap: "The scientist cannot use technical jargon.", forbiddenWords: [], coachTip: "Use questions to make the explanation clearer." },
      { category: "Dialogue", title: "Last Line", prompt: "Write a singer and drummer rewriting a song's final line.", handicap: "They must disagree without using but or wrong.", forbiddenWords: ["but", "wrong"], coachTip: "Give each speaker a different creative priority." },
      { category: "Dialogue", title: "Wrong Order", prompt: "Write a chef and customer discussing the wrong meal.", handicap: "Both speakers must remain polite.", forbiddenWords: ["stupid", "terrible", "hate"], coachTip: "Use subtext to keep the disagreement alive." },
    ],
  };
  const quickOutlinePrompts = [
    { id: "best-season", question: "Which season of the year is the best?" },
    { id: "good-friend", question: "What is the most important quality in a friend?" },
    { id: "useful-skill", question: "What skill should every student learn?" },
  ];
  const $ = (id) => document.getElementById(id);
  const state = { category: "Imagery", prompt: null, token: localStorage.getItem(TOKEN_KEY) || "", profile: null, priorFeedback: {}, promptHistory: Object.fromEntries(categories.map((category) => [category, []])), promptHistoryAll: [] };
  const outlineState = { prompt: null, loaded: false, startedAt: 0, elapsedMs: 0, running: false, timer: 0, bestTime: Number(localStorage.getItem(OUTLINE_BEST_KEY)) || null };

  try { state.priorFeedback = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || "{}"); } catch { state.priorFeedback = {}; }
  try {
    const savedHistory = JSON.parse(localStorage.getItem(PROMPT_HISTORY_KEY) || "{}");
    categories.forEach((category) => {
      if (Array.isArray(savedHistory[category])) {
        state.promptHistory[category] = savedHistory[category]
          .filter((prompt) => typeof prompt === "string" && prompt.trim())
          .slice(-PROMPT_HISTORY_LIMIT);
      }
    });
    state.promptHistoryAll = (Array.isArray(savedHistory.all) ? savedHistory.all : categories.flatMap((category) => state.promptHistory[category]))
      .filter((prompt) => typeof prompt === "string" && prompt.trim())
      .slice(-PROMPT_HISTORY_LIMIT);
  } catch {
    state.promptHistory = Object.fromEntries(categories.map((category) => [category, []]));
    state.promptHistoryAll = [];
  }

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

  function normalizedPrompt(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function promptWords(text) {
    const ignored = new Set(["a", "an", "and", "as", "at", "between", "during", "for", "in", "of", "on", "the", "to", "when", "with", "write", "describe", "gradually", "reveal"]);
    return new Set(normalizedPrompt(text).split(" ").filter((word) => word.length > 2 && !ignored.has(word)));
  }

  function promptsAreNearDuplicates(first, second) {
    const normalizedFirst = normalizedPrompt(first);
    const normalizedSecond = normalizedPrompt(second);
    if (!normalizedFirst || !normalizedSecond) return false;
    if (normalizedFirst === normalizedSecond) return true;
    if (normalizedFirst.length > 24 && normalizedSecond.length > 24 && (normalizedFirst.includes(normalizedSecond) || normalizedSecond.includes(normalizedFirst))) return true;
    const firstWords = promptWords(normalizedFirst);
    const secondWords = promptWords(normalizedSecond);
    if (!firstWords.size || !secondWords.size) return false;
    const overlap = [...firstWords].filter((word) => secondWords.has(word)).length;
    return overlap >= 4 && (overlap / Math.min(firstWords.size, secondWords.size) >= 0.8 || overlap / new Set([...firstWords, ...secondWords]).size >= 0.7);
  }

  function recentPrompts() {
    return state.promptHistoryAll;
  }

  function wasPromptSeen(prompt) {
    return recentPrompts().some((seenPrompt) => promptsAreNearDuplicates(prompt, seenPrompt));
  }

  function rememberPrompt(category, prompt) {
    const history = state.promptHistory[category].filter((seenPrompt) => !promptsAreNearDuplicates(prompt, seenPrompt));
    state.promptHistory[category] = [...history, prompt].slice(-PROMPT_HISTORY_LIMIT);
    state.promptHistoryAll = [...state.promptHistoryAll.filter((seenPrompt) => !promptsAreNearDuplicates(prompt, seenPrompt)), prompt].slice(-PROMPT_HISTORY_LIMIT);
    try {
      localStorage.setItem(PROMPT_HISTORY_KEY, JSON.stringify({ ...state.promptHistory, all: state.promptHistoryAll }));
    } catch {
      // Keep protecting this browser session if persistent storage is unavailable.
    }
  }

  function unseenFallback(category) {
    const choices = quickPrompts[category].filter((prompt) => !wasPromptSeen(prompt.prompt));
    return choices.length ? choices[Math.floor(Math.random() * choices.length)] : null;
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
    state.prompt = null;
    try {
      const candidate = await api("/api/prompt", {
        method: "POST",
        body: JSON.stringify({ category, recentPrompts: recentPrompts() }),
        timeoutMs: 22000,
      });
      if (!candidate || candidate.category !== category || typeof candidate.prompt !== "string" || wasPromptSeen(candidate.prompt)) {
        throw new Error("DraftLab returned a prompt you already saw.");
      }
      state.prompt = candidate;
    } catch {
      state.prompt = unseenFallback(category);
    }
    if (!state.prompt) {
      $("workspace").hidden = false;
      setError("DraftLab could not find a new prompt without repeating one you already saw. Please try again in a moment.");
      $("loading").hidden = true;
      return;
    }
    rememberPrompt(category, state.prompt.prompt);
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
