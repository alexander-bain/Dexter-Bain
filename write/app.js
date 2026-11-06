(() => {
  "use strict";

  const API = "https://draftlab-writing.dexterhbain.chatgpt.site";
  const TOKEN_KEY = "draftlab-session-v1";
  const FEEDBACK_KEY = "draftlab-feedback-v1";
  const OUTLINE_BEST_KEY = "draftlab-outline-best-v1";
  const OUTLINE_HISTORY_KEY = "draftlab-outline-prompt-history-v1";
  const OUTLINE_HISTORY_LIMIT = 1000;
  const PROMPT_HISTORY_KEY = "draftlab-prompt-history-v2";
  const PROMPT_HISTORY_LIMIT = 50;
  const ESSAY_MIN_WORDS = 50;
  const ESSAY_MAX_WORDS = 3500;
  const ESSAY_MAX_CHARACTERS = 20000;
  const ESSAY_MAX_ASSIGNMENT_CHARACTERS = 600;
  const ESSAY_CRITERIA = [
    ["focusAndIdeas", "Focus & ideas"],
    ["evidenceAndReasoning", "Support & development"],
    ["organization", "Organization"],
    ["styleAndConventions", "Style & conventions"],
  ];
  const MISSING_WORD_STOP_WORDS = new Set([
    "about", "after", "again", "also", "among", "another", "because", "before", "being", "between", "could", "does", "doing", "during", "each", "every", "from", "have", "having", "into", "itself", "might", "more", "most", "much", "must", "other", "ours", "should", "some", "such", "than", "that", "their", "theirs", "them", "then", "there", "these", "they", "this", "those", "through", "under", "until", "very", "what", "when", "where", "which", "while", "who", "will", "with", "would", "your", "yours",
  ]);
  const MISSING_WORD_FALLBACKS = ["important", "different", "community", "creative", "evidence", "purpose", "support", "change", "future", "careful", "strong", "helpful"];
  const IDEA_QUEST_WIDTH = 7;
  const IDEA_QUEST_HEIGHT = 5;
  const IDEA_QUEST_CELL_COUNT = IDEA_QUEST_WIDTH * IDEA_QUEST_HEIGHT;
  const IDEA_QUEST_START = 28;
  const IDEA_QUEST_PORTAL = 6;
  const IDEA_QUEST_DIRECTIONS = {
    up: { row: -1, column: 0 },
    down: { row: 1, column: 0 },
    left: { row: 0, column: -1 },
    right: { row: 0, column: 1 },
  };
  const IDEA_QUEST_STOP_WORDS = new Set([
    "about", "after", "again", "against", "also", "another", "because", "been", "before", "being", "between", "both", "could", "does", "doing", "during", "each", "even", "every", "from", "have", "having", "into", "itself", "just", "more", "most", "much", "must", "only", "other", "over", "same", "should", "some", "such", "than", "that", "their", "them", "then", "there", "these", "they", "this", "those", "through", "under", "very", "want", "were", "what", "when", "where", "which", "while", "with", "would", "your", "youre",
  ]);
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
  const retiredOutlinePrompts = [
    { id: "celebration-food", question: "What is the best food for a celebration?" },
    { id: "school-rule", question: "What school rule would you change, and why?" },
    { id: "best-season", question: "Which season of the year is the best?" },
    { id: "book-or-movie", question: "Is it better to read a book or watch a movie?" },
    { id: "good-friend", question: "What is the most important quality in a friend?" },
    { id: "homework", question: "Should students have homework every night?" },
    { id: "free-afternoon", question: "What is the best way to spend a free afternoon?" },
    { id: "useful-skill", question: "What skill should every student learn?" },
    { id: "perfect-pet", question: "Which animal makes the best pet?" },
    { id: "field-trip", question: "Where should your class go on its next field trip?" },
  ];
  const quickOutlinePrompts = [
    { id: "later-start", question: "Should the school day begin later in the morning?" },
    { id: "outdoor-class", question: "Should every class spend one lesson outside each week?" },
    { id: "school-garden", question: "Would a school garden improve student life?" },
    { id: "lunch-choice", question: "Should students help choose the school lunch menu?" },
    { id: "uniforms", question: "Do school uniforms make school better or worse?" },
    { id: "four-day-week", question: "Would a four-day school week help students learn?" },
    { id: "reading-time", question: "Should schools provide daily time for independent reading?" },
    { id: "service-project", question: "Should community service be part of every school year?" },
    { id: "class-devices", question: "When should personal devices be allowed during class?" },
    { id: "longer-lunch", question: "Would a longer lunch break improve the school day?" },
    { id: "club-time", question: "Should clubs meet during the regular school day?" },
    { id: "welcome-student", question: "What is the best way to welcome a new student?" },
    { id: "local-project", question: "Should classes work on real problems in their community?" },
    { id: "assemblies", question: "What makes a school assembly worth attending?" },
    { id: "team-or-solo", question: "Do team activities teach more than individual activities?" },
    { id: "morning-exercise", question: "Should students exercise before their first class?" },
    { id: "library-value", question: "Why are public libraries still important today?" },
    { id: "neighborhood-change", question: "What single change would most improve your neighborhood?" },
    { id: "save-water", question: "What is the most effective way for families to save water?" },
    { id: "reusable-items", question: "Should schools replace disposable items with reusable ones?" },
    { id: "town-park", question: "What feature should every town park include?" },
    { id: "bus-or-car", question: "Should more people use buses instead of cars?" },
    { id: "helpful-technology", question: "What technology has improved everyday life the most?" },
    { id: "screen-free-day", question: "Would one screen-free day each week be helpful?" },
    { id: "social-media-age", question: "Should social media have a higher minimum age?" },
    { id: "games-teach", question: "Can video games teach useful real-world skills?" },
    { id: "ai-schoolwork", question: "How should students be allowed to use artificial intelligence?" },
    { id: "online-or-classroom", question: "Is learning online as effective as learning in person?" },
    { id: "learn-skill", question: "What is the best way to learn a difficult new skill?" },
    { id: "group-projects", question: "Are group projects better than working alone?" },
    { id: "grades-feedback", question: "Is written feedback more useful than a letter grade?" },
    { id: "weekend-work", question: "Should students receive schoolwork over the weekend?" },
    { id: "arts-required", question: "Should every student take an art or music class?" },
    { id: "school-news", question: "Should every school have a student-run news team?" },
    { id: "class-debates", question: "Do classroom debates help students understand difficult topics?" },
    { id: "leadership", question: "What quality matters most in a good leader?" },
    { id: "solve-disagreement", question: "What is the fairest way to solve a disagreement?" },
    { id: "include-others", question: "How can a group help someone feel included?" },
    { id: "courage", question: "What does everyday courage look like?" },
    { id: "learn-failure", question: "Can failure teach more than success?" },
    { id: "competition", question: "Does competition usually help people improve?" },
    { id: "money-skills", question: "Should schools teach students how to manage money?" },
    { id: "career-choice", question: "What should matter most when choosing a future career?" },
    { id: "healthy-sleep", question: "How can teenagers make enough sleep a priority?" },
    { id: "breakfast", question: "Should schools make breakfast available to every student?" },
    { id: "city-country", question: "Is it better to live in a city or the countryside?" },
    { id: "train-plane", question: "Is train travel better than air travel for shorter trips?" },
    { id: "local-business", question: "Why should people support small local businesses?" },
    { id: "public-art", question: "Should towns spend money on public art?" },
    { id: "protect-animals", question: "What is the best way to protect endangered animals?" },
    { id: "community-event", question: "What kind of event best brings a community together?" },
    { id: "quiet-spaces", question: "Should every school provide a quiet room for breaks?" },
    { id: "chores", question: "Should everyone in a household share daily chores?" },
    { id: "allowance", question: "Should children earn money for completing household jobs?" },
    { id: "second-language", question: "Should every student learn a second language?" },
    { id: "school-mascot", question: "What makes a school mascot effective?" },
    { id: "recess-older", question: "Should older students have a daily recess period?" },
    { id: "class-seating", question: "Should students be allowed to choose their classroom seats?" },
    { id: "phone-free-meals", question: "Should family meals be phone-free?" },
    { id: "repair-or-replace", question: "Is repairing old belongings better than replacing them?" },
  ];
  const $ = (id) => document.getElementById(id);
  const state = { category: "Imagery", prompt: null, token: localStorage.getItem(TOKEN_KEY) || "", profile: null, priorFeedback: {}, promptHistory: Object.fromEntries(categories.map((category) => [category, []])), promptHistoryAll: [] };
  const outlineState = { prompt: null, promptHistory: readStoredOutlineHistory(), loaded: false, startedAt: 0, elapsedMs: 0, running: false, timer: 0, bestTime: Number(localStorage.getItem(OUTLINE_BEST_KEY)) || null };
  const essayState = {
    grading: false,
    requestError: "",
    submittedEssay: "",
    activeGame: "quest",
    shuffleOriginal: [],
    shuffleCurrent: [],
    shuffleSolved: false,
    missingRounds: [],
    missingRoundIndex: 0,
    missingSolved: false,
    missingReplayCount: 0,
    questReplayCount: 0,
    questLevel: null,
    questPlayer: IDEA_QUEST_START,
    questHearts: 3,
    questMoves: 0,
    questCollected: new Set(),
    questOutcome: "playing",
    questMessage: "Find all three ideas.",
  };

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

  function sanitizeOutlineHistory(value) {
    if (!Array.isArray(value)) return [];
    const sanitized = [];
    value.slice(-OUTLINE_HISTORY_LIMIT * 2).forEach((item) => {
      const source = typeof item === "string" ? { question: item } : item;
      if (!source || typeof source !== "object") return;
      const question = typeof source.question === "string" ? source.question.trim().slice(0, 180) : "";
      if (question.length < 8) return;
      const normalizedQuestion = normalizedPrompt(question);
      if (!normalizedQuestion) return;
      const existingIndex = sanitized.findIndex((prompt) => normalizedPrompt(prompt.question) === normalizedQuestion);
      if (existingIndex >= 0) sanitized.splice(existingIndex, 1);
      const id = typeof source.id === "string" && source.id.trim()
        ? source.id.trim().slice(0, 80)
        : `question-${normalizedQuestion.slice(0, 48).replace(/\s+/g, "-")}`;
      sanitized.push({ id, question });
    });
    return sanitized.slice(-OUTLINE_HISTORY_LIMIT);
  }

  function readStoredOutlineHistory() {
    try {
      return sanitizeOutlineHistory(JSON.parse(localStorage.getItem(OUTLINE_HISTORY_KEY) || "[]"));
    } catch {
      return [];
    }
  }

  function outlinePromptHistory() {
    return [...retiredOutlinePrompts, ...outlineState.promptHistory];
  }

  function outlinePromptWasSeen(candidate, history = outlinePromptHistory()) {
    if (!candidate || typeof candidate.id !== "string" || !candidate.id.trim() || typeof candidate.question !== "string" || candidate.question.trim().length < 8) return true;
    return history.some((seenPrompt) => (
      candidate.id === seenPrompt.id || promptsAreNearDuplicates(candidate.question, seenPrompt.question)
    ));
  }

  function rememberOutlinePrompt(prompt) {
    outlineState.promptHistory = sanitizeOutlineHistory([...outlineState.promptHistory, prompt]);
    try {
      localStorage.setItem(OUTLINE_HISTORY_KEY, JSON.stringify(outlineState.promptHistory));
    } catch {
      // Keep protecting this browser session if persistent storage is unavailable.
    }
  }

  function unseenOutlineFallback(history = outlinePromptHistory()) {
    const choices = quickOutlinePrompts.filter((prompt) => !outlinePromptWasSeen(prompt, history));
    return choices.length ? choices[Math.floor(Math.random() * choices.length)] : null;
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
    const storyMode = mode === "story";
    const outlineMode = mode === "outline";
    const essayMode = mode === "essay";
    $("story-mode").hidden = !storyMode;
    $("outline-mode").hidden = !outlineMode;
    $("essay-mode").hidden = !essayMode;
    $("story-mode-button").classList.toggle("active", storyMode);
    $("outline-mode-button").classList.toggle("active", outlineMode);
    $("essay-mode-button").classList.toggle("active", essayMode);
    $("story-mode-button").setAttribute("aria-pressed", String(storyMode));
    $("outline-mode-button").setAttribute("aria-pressed", String(outlineMode));
    $("essay-mode-button").setAttribute("aria-pressed", String(essayMode));
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
    outlineState.prompt = null;
    resetOutlineFields();
    $("outline-question").textContent = "Preparing your question…";
    $("outline-skip").textContent = "Skip prompt";
    const recentPrompts = outlinePromptHistory();
    let nextPrompt = null;
    let failureMessage = "DraftLab could not create a brand-new outline question.";
    try {
      const candidate = await api("/api/outline-prompt", {
        method: "POST",
        body: JSON.stringify({ recentPrompts }),
        cache: "no-store",
        timeoutMs: 22000,
      });
      const sanitizedCandidate = sanitizeOutlineHistory([candidate])[0];
      if (!sanitizedCandidate || outlinePromptWasSeen(sanitizedCandidate, recentPrompts)) {
        throw new Error("DraftLab returned an outline question you already saw.");
      }
      nextPrompt = sanitizedCandidate;
    } catch (error) {
      failureMessage = error instanceof Error ? error.message : failureMessage;
      nextPrompt = unseenOutlineFallback(recentPrompts);
    }
    if (!nextPrompt) {
      $("outline-question").textContent = "No new outline question is ready yet.";
      $("outline-error").textContent = `${failureMessage} Tap Try again in a moment.`;
      $("outline-error").hidden = false;
      $("outline-skip").textContent = "Try again";
      outlineState.elapsedMs = 0;
      renderOutlineTimer();
      updateOutlineReady();
      return;
    }
    rememberOutlinePrompt(nextPrompt);
    outlineState.prompt = nextPrompt;
    $("outline-question").textContent = nextPrompt.question;
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

  function essayWordCount(text) {
    const words = text.trim().match(/\S+/g);
    return words ? words.length : 0;
  }

  function essayLimitError() {
    const assignment = $("essay-assignment").value;
    const essay = $("essay-text").value;
    const words = essayWordCount(essay);
    if (assignment.trim().length > ESSAY_MAX_ASSIGNMENT_CHARACTERS) return "The assignment is over 600 characters.";
    if (essay.length > ESSAY_MAX_CHARACTERS) return "The essay is over 20,000 characters.";
    if (words > ESSAY_MAX_WORDS) return "The essay is over 3,500 words.";
    return "";
  }

  function renderEssayError() {
    const message = essayLimitError() || essayState.requestError;
    $("essay-error").textContent = message;
    $("essay-error").hidden = !message;
  }

  function setEssayError(message = "") {
    essayState.requestError = message;
    renderEssayError();
  }

  function updateEssayReady() {
    const essay = $("essay-text").value;
    const words = essayWordCount(essay);
    const characters = essay.length;
    const assignmentCharacters = $("essay-assignment").value.length;
    const ready = words >= ESSAY_MIN_WORDS && !essayLimitError();
    $("essay-assignment-count").textContent = `Optional · ${assignmentCharacters.toLocaleString()} / 600 characters`;
    $("essay-assignment-count").classList.toggle("over-limit", $("essay-assignment").value.trim().length > ESSAY_MAX_ASSIGNMENT_CHARACTERS);
    $("essay-word-count").textContent = `${words.toLocaleString()} / 50–3,500 words · ${characters.toLocaleString()} / 20,000 characters`;
    $("essay-word-count").classList.toggle("ready", ready);
    $("essay-word-count").classList.toggle("over-limit", words > ESSAY_MAX_WORDS || characters > ESSAY_MAX_CHARACTERS);
    $("essay-grade").disabled = essayState.grading || !ready;
    renderEssayError();
  }

  function validEssayResult(result) {
    if (!result || !Number.isInteger(result.score) || result.score < 0 || result.score > 100) return false;
    if (result.letterGrade !== essayLetterGrade(result.score)) return false;
    if (typeof result.summary !== "string" || typeof result.nextStep !== "string") return false;
    if (!Array.isArray(result.strengths) || result.strengths.length !== 3 || !result.strengths.every((item) => typeof item === "string")) return false;
    if (!Array.isArray(result.improvements) || result.improvements.length !== 3 || !result.improvements.every((item) => typeof item === "string")) return false;
    if (!result.breakdown || typeof result.breakdown !== "object") return false;
    let rubricTotal = 0;
    const validBreakdown = ESSAY_CRITERIA.every(([key]) => {
      const criterion = result.breakdown[key];
      const validCriterion = criterion
        && Number.isInteger(criterion.score)
        && criterion.score >= 0
        && criterion.score <= 25
        && typeof criterion.feedback === "string";
      if (validCriterion) rubricTotal += criterion.score;
      return validCriterion;
    });
    return validBreakdown && rubricTotal === result.score;
  }

  function essayLetterGrade(score) {
    if (score >= 97) return "A+";
    if (score >= 93) return "A";
    if (score >= 90) return "A−";
    if (score >= 87) return "B+";
    if (score >= 83) return "B";
    if (score >= 80) return "B−";
    if (score >= 77) return "C+";
    if (score >= 73) return "C";
    if (score >= 70) return "C−";
    if (score >= 67) return "D+";
    if (score >= 63) return "D";
    if (score >= 60) return "D−";
    return "F";
  }

  function renderEssayFeedback(listId, items) {
    const list = $(listId);
    list.replaceChildren();
    items.forEach((item) => {
      const entry = document.createElement("li");
      entry.textContent = item;
      list.append(entry);
    });
  }

  function essaySentences(text) {
    const clean = String(text || "").trim().replace(/\s+/g, " ");
    if (!clean) return [];
    if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
      try {
        return Array.from(new Intl.Segmenter(undefined, { granularity: "sentence" }).segment(clean), ({ segment }) => segment.trim()).filter(Boolean);
      } catch {
        // Fall through to a punctuation-based split for older browsers.
      }
    }
    const punctuationSegments = clean.match(/[^.!?]+(?:[.!?]+["'’”)\]]*|$)/g);
    return (punctuationSegments || [clean]).map((sentence) => sentence.trim()).filter(Boolean);
  }

  function uniqueEssaySentences(text) {
    const seen = new Set();
    return essaySentences(text).filter((sentence) => {
      const key = sentence.toLocaleLowerCase().replace(/\s+/g, " ");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function shuffledEssayItems(items) {
    const shuffled = items.map((item) => ({ ...item }));
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    if (shuffled.every((item, index) => item.id === items[index].id)) {
      shuffled.push(shuffled.shift());
    }
    return shuffled;
  }

  function setEssayShuffleFeedback(message, tone = "") {
    const feedback = $("essay-shuffle-feedback");
    feedback.textContent = message;
    feedback.className = `essay-shuffle-feedback${tone ? ` ${tone}` : ""}`;
  }

  function renderEssayShuffle(focusId = null, focusMove = "") {
    const list = $("essay-shuffle-list");
    list.replaceChildren();
    essayState.shuffleCurrent.forEach((item, index) => {
      const entry = document.createElement("li");
      entry.dataset.shuffleId = String(item.id);
      const sentence = document.createElement("p");
      sentence.textContent = item.text;
      const controls = document.createElement("div");
      controls.className = "essay-shuffle-move";
      const up = document.createElement("button");
      up.type = "button";
      up.dataset.move = "up";
      up.textContent = "Up";
      const sentenceLabel = item.text.length > 54 ? `${item.text.slice(0, 51)}…` : item.text;
      up.setAttribute("aria-label", `Move “${sentenceLabel}” up`);
      up.disabled = essayState.shuffleSolved || index === 0;
      up.addEventListener("click", () => moveEssaySentence(index, -1));
      const down = document.createElement("button");
      down.type = "button";
      down.dataset.move = "down";
      down.textContent = "Down";
      down.setAttribute("aria-label", `Move “${sentenceLabel}” down`);
      down.disabled = essayState.shuffleSolved || index === essayState.shuffleCurrent.length - 1;
      down.addEventListener("click", () => moveEssaySentence(index, 1));
      controls.append(up, down);
      entry.append(sentence, controls);
      list.append(entry);
    });
    $("essay-shuffle-check").disabled = essayState.shuffleSolved;
    if (focusId !== null && focusMove) {
      const movedControl = list.querySelector(`[data-shuffle-id="${focusId}"] [data-move="${focusMove}"]`);
      movedControl?.focus();
    }
  }

  function moveEssaySentence(index, direction) {
    if (essayState.shuffleSolved) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= essayState.shuffleCurrent.length) return;
    const movedId = essayState.shuffleCurrent[index].id;
    [essayState.shuffleCurrent[index], essayState.shuffleCurrent[nextIndex]] = [essayState.shuffleCurrent[nextIndex], essayState.shuffleCurrent[index]];
    setEssayShuffleFeedback("Order changed. Check it when you are ready.");
    renderEssayShuffle(movedId, direction < 0 ? "up" : "down");
  }

  function resetEssayShuffle() {
    essayState.shuffleOriginal = [];
    essayState.shuffleCurrent = [];
    essayState.shuffleSolved = false;
    $("essay-shuffle-list").replaceChildren();
    $("essay-shuffle-play").hidden = true;
    $("essay-shuffle-unavailable").hidden = true;
    $("essay-shuffle-check").disabled = false;
    setEssayShuffleFeedback("Move the sentences, then check your order.");
  }

  function startEssayShuffle(text = essayState.submittedEssay) {
    const sentences = uniqueEssaySentences(text);
    const canPlay = sentences.length >= 2;
    $("essay-shuffle-play").hidden = !canPlay;
    $("essay-shuffle-unavailable").hidden = canPlay;
    essayState.shuffleSolved = false;
    if (!canPlay) {
      essayState.shuffleOriginal = [];
      essayState.shuffleCurrent = [];
      $("essay-shuffle-list").replaceChildren();
      return;
    }
    const gameSize = Math.min(4, sentences.length);
    const maxStart = sentences.length - gameSize;
    const start = maxStart ? Math.floor(Math.random() * (maxStart + 1)) : 0;
    essayState.shuffleOriginal = sentences.slice(start, start + gameSize).map((text, index) => ({ id: start + index, text }));
    essayState.shuffleCurrent = shuffledEssayItems(essayState.shuffleOriginal);
    setEssayShuffleFeedback("Move the sentences, then check your order.");
    renderEssayShuffle();
  }

  function checkEssayShuffle() {
    const correct = essayState.shuffleCurrent.length >= 2
      && essayState.shuffleCurrent.every((item, index) => item.id === essayState.shuffleOriginal[index].id);
    if (!correct) {
      setEssayShuffleFeedback("Not quite—keep adjusting the order and try again.", "try-again");
      return;
    }
    essayState.shuffleSolved = true;
    renderEssayShuffle();
    setEssayShuffleFeedback("Correct! Your sentences are back in their original order.", "correct");
  }

  function createEssayGameRandom(essay, replay = 0) {
    let seed = 2166136261 ^ (replay >>> 0);
    for (let index = 0; index < essay.length; index += 1) {
      seed ^= essay.charCodeAt(index);
      seed = Math.imul(seed, 16777619);
    }
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let value = seed;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function boundedEssayRandom(random) {
    const value = random();
    if (!Number.isFinite(value) || value <= 0) return 0;
    if (value >= 1) return 0.9999999999999999;
    return value;
  }

  function shuffledCopy(items, random = Math.random) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(boundedEssayRandom(random) * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function rotatedCopy(items, offset) {
    if (!items.length) return [];
    const start = ((offset % items.length) + items.length) % items.length;
    return [...items.slice(start), ...items.slice(0, start)];
  }

  function normalizeMissingWord(word) {
    return String(word || "").normalize("NFKC").toLocaleLowerCase("en-US").replace(/[’']/g, "'");
  }

  function meaningfulEssayWords(sentence) {
    return Array.from(String(sentence || "").matchAll(/[\p{L}\p{M}]+(?:[’'-][\p{L}\p{M}]+)*/gu), (match) => {
      const text = match[0];
      const key = normalizeMissingWord(text);
      const start = match.index || 0;
      return { text, key, start, end: start + text.length };
    }).filter(({ text, key }) => Array.from(text).filter((character) => /\p{L}/u.test(character)).length >= 4 && !MISSING_WORD_STOP_WORDS.has(key));
  }

  function uniqueMissingWords(words) {
    const seen = new Set();
    return words.filter(({ key }) => {
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function wordsUsedOnce(words) {
    const counts = words.reduce((totals, { key }) => totals.set(key, (totals.get(key) || 0) + 1), new Map());
    return words.filter(({ key }) => counts.get(key) === 1);
  }

  function matchingWordCase(word, example) {
    const letters = String(example).match(/[\p{L}\p{M}]/gu)?.join("") || "";
    if (letters && letters === letters.toLocaleUpperCase()) return word.toLocaleUpperCase();
    const firstLetter = String(example).match(/[\p{L}\p{M}]/u)?.[0] || "";
    if (firstLetter && firstLetter === firstLetter.toLocaleUpperCase()) {
      return word.toLocaleLowerCase().replace(/[\p{L}\p{M}]/u, (letter) => letter.toLocaleUpperCase());
    }
    return word.toLocaleLowerCase();
  }

  function buildMissingWordRounds(text, replaySeed = 0, random = createEssayGameRandom(text, replaySeed)) {
    const sentenceChoices = uniqueEssaySentences(text)
      .map((sentence) => ({ sentence, words: wordsUsedOnce(meaningfulEssayWords(sentence)) }))
      .filter(({ words }) => words.length > 0);
    if (!sentenceChoices.length) return [];

    const essayWordPool = uniqueMissingWords(sentenceChoices.flatMap(({ words }) => words));
    const fallbackPool = MISSING_WORD_FALLBACKS.map((word) => ({ text: word, key: normalizeMissingWord(word) }));
    const usedAnswers = new Set();
    const selectedRounds = [];
    const shuffledSentences = rotatedCopy(shuffledCopy(sentenceChoices, random), replaySeed);
    shuffledSentences.forEach(({ sentence, words }, sentenceIndex) => {
      if (selectedRounds.length >= 3) return;
      const target = rotatedCopy(shuffledCopy(words, random), replaySeed + sentenceIndex).find(({ key }) => !usedAnswers.has(key));
      if (!target) return;
      usedAnswers.add(target.key);
      selectedRounds.push({ sentence, target });
    });
    if (selectedRounds.length < 3) {
      for (const [sentenceIndex, { sentence, words }] of shuffledSentences.entries()) {
        for (const target of rotatedCopy(shuffledCopy(words, random), replaySeed + sentenceIndex + selectedRounds.length)) {
          if (selectedRounds.length >= 3) break;
          if (usedAnswers.has(target.key)) continue;
          usedAnswers.add(target.key);
          selectedRounds.push({ sentence, target });
        }
      }
    }
    if (selectedRounds.length !== 3) return [];

    return selectedRounds.map(({ sentence, target }, roundIndex) => {

      const choices = new Map([[target.key, target.text]]);
      for (const option of shuffledCopy(essayWordPool, random)) {
        if (choices.size >= 4) break;
        if (!choices.has(option.key)) choices.set(option.key, option.text);
      }
      for (const option of fallbackPool) {
        if (choices.size >= 4) break;
        if (!choices.has(option.key)) choices.set(option.key, option.text);
      }

      return {
        before: sentence.slice(0, target.start),
        after: sentence.slice(target.end),
        answerKey: target.key,
        choices: rotatedCopy(shuffledCopy(Array.from(choices, ([key, label]) => ({ key, label: matchingWordCase(label, target.text) })), random), replaySeed + roundIndex),
      };
    });
  }

  function setMissingWordFeedback(message, tone = "") {
    const feedback = $("essay-missing-feedback");
    feedback.textContent = message;
    feedback.className = `essay-shuffle-feedback${tone ? ` ${tone}` : ""}`;
  }

  function renderMissingWordRound(moveFocus = false) {
    const round = essayState.missingRounds[essayState.missingRoundIndex];
    if (!round) return;
    essayState.missingSolved = false;
    $("essay-missing-question").hidden = false;
    $("essay-missing-complete").hidden = true;
    $("essay-missing-progress").textContent = `Round ${essayState.missingRoundIndex + 1} of ${essayState.missingRounds.length}`;

    const sentence = $("essay-missing-sentence");
    const blank = document.createElement("span");
    blank.className = "essay-missing-blank";
    blank.textContent = "_____";
    blank.setAttribute("aria-label", "blank");
    sentence.replaceChildren(document.createTextNode(round.before), blank, document.createTextNode(round.after));

    const choices = $("essay-missing-choices");
    choices.replaceChildren();
    round.choices.forEach(({ key, label }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.choiceKey = key;
      button.textContent = label;
      button.addEventListener("click", () => chooseMissingWord(key, button));
      choices.append(button);
    });

    const next = $("essay-missing-next");
    next.disabled = true;
    next.textContent = essayState.missingRoundIndex === essayState.missingRounds.length - 1 ? "Finish game" : "Next sentence";
    setMissingWordFeedback("Choose the word you used in your essay.");
    if (moveFocus) sentence.focus();
  }

  function chooseMissingWord(choiceKey, button) {
    if (essayState.missingSolved) return;
    const round = essayState.missingRounds[essayState.missingRoundIndex];
    if (!round) return;
    document.querySelectorAll("#essay-missing-choices button").forEach((choice) => choice.classList.remove("incorrect"));
    if (choiceKey !== round.answerKey) {
      button.classList.add("incorrect");
      setMissingWordFeedback("Not that one—try another word.", "try-again");
      return;
    }
    essayState.missingSolved = true;
    button.classList.add("correct");
    document.querySelectorAll("#essay-missing-choices button").forEach((choice) => { choice.disabled = true; });
    $("essay-missing-next").disabled = false;
    setMissingWordFeedback("Correct! That is the word from your essay.", "correct");
  }

  function nextMissingWordRound() {
    if (!essayState.missingSolved) return;
    if (essayState.missingRoundIndex < essayState.missingRounds.length - 1) {
      essayState.missingRoundIndex += 1;
      renderMissingWordRound(true);
      return;
    }
    $("essay-missing-question").hidden = true;
    $("essay-missing-complete").hidden = false;
    $("essay-missing-complete-copy").textContent = `You completed all ${essayState.missingRounds.length} ${essayState.missingRounds.length === 1 ? "round" : "rounds"}.`;
    $("essay-missing-complete-replay").focus();
  }

  function resetMissingWord() {
    essayState.missingRounds = [];
    essayState.missingRoundIndex = 0;
    essayState.missingSolved = false;
    essayState.missingReplayCount = 0;
    $("essay-missing-play").hidden = true;
    $("essay-missing-question").hidden = false;
    $("essay-missing-complete").hidden = true;
    $("essay-missing-unavailable").hidden = true;
    $("essay-missing-choices").replaceChildren();
    $("essay-missing-next").disabled = true;
    setMissingWordFeedback("Choose the word you used in your essay.");
  }

  function startMissingWord(text = essayState.submittedEssay, isReplay = false) {
    essayState.missingReplayCount = isReplay ? essayState.missingReplayCount + 1 : 0;
    essayState.missingRounds = buildMissingWordRounds(text, essayState.missingReplayCount);
    essayState.missingRoundIndex = 0;
    essayState.missingSolved = false;
    const canPlay = essayState.missingRounds.length > 0;
    $("essay-missing-play").hidden = !canPlay;
    $("essay-missing-unavailable").hidden = canPlay;
    if (canPlay) renderMissingWordRound(isReplay);
  }

  function collectIdeaQuestCandidates(text, minimumLetters, useStopWords) {
    const candidates = new Map();
    for (const match of String(text || "").matchAll(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)) {
      const label = match[0];
      const letterCount = Array.from(label).filter((character) => /\p{L}/u.test(character)).length;
      const normalized = normalizeMissingWord(label);
      if (
        letterCount < minimumLetters
        || letterCount > 24
        || !/\p{L}/u.test(label)
        || (useStopWords && IDEA_QUEST_STOP_WORDS.has(normalized))
      ) continue;
      const existing = candidates.get(normalized);
      if (existing) {
        existing.count += 1;
      } else {
        candidates.set(normalized, { label, normalized, count: 1, firstIndex: match.index || 0 });
      }
    }
    return Array.from(candidates.values());
  }

  function ideaQuestLabels(text, random = createEssayGameRandom(text, 1701)) {
    let candidates = collectIdeaQuestCandidates(text, 4, true);
    if (candidates.length < 3) candidates = collectIdeaQuestCandidates(text, 2, false);
    if (candidates.length < 3) return [];
    candidates.sort((first, second) => (
      second.count - first.count
      || Math.min(second.label.length, 12) - Math.min(first.label.length, 12)
      || first.firstIndex - second.firstIndex
    ));
    return shuffledCopy(candidates.slice(0, Math.min(12, candidates.length)), random)
      .slice(0, 3)
      .map(({ label }) => label);
  }

  function ideaQuestRow(position) {
    return Math.floor(position / IDEA_QUEST_WIDTH);
  }

  function ideaQuestColumn(position) {
    return position % IDEA_QUEST_WIDTH;
  }

  function ideaQuestManhattan(first, second) {
    return Math.abs(ideaQuestRow(first) - ideaQuestRow(second)) + Math.abs(ideaQuestColumn(first) - ideaQuestColumn(second));
  }

  function ideaQuestNeighbors(position) {
    const row = ideaQuestRow(position);
    const column = ideaQuestColumn(position);
    return Object.values(IDEA_QUEST_DIRECTIONS).flatMap((direction) => {
      const nextRow = row + direction.row;
      const nextColumn = column + direction.column;
      if (nextRow < 0 || nextRow >= IDEA_QUEST_HEIGHT || nextColumn < 0 || nextColumn >= IDEA_QUEST_WIDTH) return [];
      return [nextRow * IDEA_QUEST_WIDTH + nextColumn];
    });
  }

  function ideaQuestCanReach(start, targets, enemies) {
    const blocked = new Set(enemies);
    const visited = new Set([start]);
    const queue = [start];
    while (queue.length) {
      const current = queue.shift();
      ideaQuestNeighbors(current).forEach((next) => {
        if (blocked.has(next) || visited.has(next)) return;
        visited.add(next);
        queue.push(next);
      });
    }
    return targets.every((target) => visited.has(target));
  }

  function buildIdeaQuestLevel(text, replay = 0) {
    const safeReplay = Math.max(0, Math.floor(replay));
    const random = createEssayGameRandom(text, safeReplay + 1701);
    const labels = ideaQuestLabels(text, random);
    if (labels.length !== 3) return null;
    const cells = Array.from({ length: IDEA_QUEST_CELL_COUNT }, (_, index) => index);
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const positions = shuffledCopy(cells, random);
      const start = positions[0];
      const portal = positions[1];
      const ideaPositions = positions.slice(2, 5);
      const enemies = positions.slice(5, 8);
      if (ideaQuestManhattan(start, portal) < 5) continue;
      if (enemies.some((enemy) => ideaQuestManhattan(start, enemy) <= 1)) continue;
      if (!ideaQuestCanReach(start, [portal, ...ideaPositions], enemies)) continue;
      return {
        id: `idea-quest-${safeReplay}`,
        start,
        portal,
        enemies,
        ideas: labels.map((label, index) => ({ id: `idea-${index}`, label, position: ideaPositions[index] })),
      };
    }
    return {
      id: `idea-quest-${safeReplay}`,
      start: IDEA_QUEST_START,
      portal: IDEA_QUEST_PORTAL,
      enemies: [15, 17, 19],
      ideas: labels.map((label, index) => ({ id: `idea-${index}`, label, position: [30, 11, 27][index] })),
    };
  }

  function ideaQuestScore() {
    const collectedPoints = essayState.questCollected.size * 200;
    const finishPoints = essayState.questOutcome === "won" ? 400 : 0;
    const moveCost = essayState.questMoves * 2;
    const heartCost = (3 - essayState.questHearts) * 50;
    return Math.max(0, collectedPoints + finishPoints - moveCost - heartCost);
  }

  function setIdeaQuestMessage(message) {
    essayState.questMessage = message;
    $("essay-quest-status").textContent = message;
  }

  function placeIdeaQuestSprite(board, className, position, source, label) {
    const sprite = document.createElement("div");
    sprite.className = className;
    sprite.style.gridColumn = String(ideaQuestColumn(position) + 1);
    sprite.style.gridRow = String(ideaQuestRow(position) + 1);
    sprite.setAttribute("role", "img");
    sprite.setAttribute("aria-label", label);
    const image = document.createElement("img");
    image.src = source;
    image.alt = "";
    image.draggable = false;
    sprite.append(image);
    board.append(sprite);
    return sprite;
  }

  function renderIdeaQuestLabels() {
    const list = $("essay-quest-labels");
    list.replaceChildren();
    essayState.questLevel?.ideas.forEach((idea, index) => {
      const collected = essayState.questCollected.has(idea.id);
      const item = document.createElement("div");
      item.className = `essay-quest-label${collected ? " collected" : ""}`;
      const marker = document.createElement("span");
      marker.textContent = collected ? "✓" : String(index + 1);
      marker.setAttribute("aria-hidden", "true");
      const label = document.createElement("strong");
      label.textContent = idea.label;
      item.append(marker, label);
      list.append(item);
    });
  }

  function renderIdeaQuest() {
    const level = essayState.questLevel;
    const board = $("essay-quest-board");
    board.replaceChildren();
    $("essay-quest-play").hidden = !level;
    $("essay-quest-unavailable").hidden = Boolean(level);
    if (!level) {
      board.setAttribute("aria-label", "Idea Quest is unavailable for this essay.");
      return;
    }

    for (let position = 0; position < IDEA_QUEST_CELL_COUNT; position += 1) {
      const tile = document.createElement("span");
      tile.className = "essay-quest-tile";
      tile.setAttribute("aria-hidden", "true");
      board.append(tile);
    }

    const portalOpen = essayState.questCollected.size === 3;
    const portal = placeIdeaQuestSprite(
      board,
      `essay-quest-sprite essay-quest-portal${portalOpen ? " open" : " locked"}`,
      level.portal,
      "assets/essay-arcade/portal.webp",
      portalOpen ? "Open idea portal" : "Locked idea portal",
    );
    const portalLabel = document.createElement("span");
    portalLabel.textContent = portalOpen ? "Portal open" : "Collect 3";
    portal.append(portalLabel);

    level.ideas.forEach((idea) => {
      if (essayState.questCollected.has(idea.id)) return;
      const collectible = placeIdeaQuestSprite(
        board,
        "essay-quest-sprite essay-quest-idea",
        idea.position,
        "assets/essay-arcade/idea.webp",
        `Idea to collect: ${idea.label}`,
      );
      const label = document.createElement("span");
      label.textContent = idea.label;
      collectible.append(label);
    });

    level.enemies.forEach((position) => {
      placeIdeaQuestSprite(board, "essay-quest-sprite essay-quest-enemy", position, "assets/essay-arcade/ink.webp", "Ink enemy");
    });
    placeIdeaQuestSprite(board, "essay-quest-sprite essay-quest-hero", essayState.questPlayer, "assets/essay-arcade/hero.webp", "Your idea explorer");

    if (essayState.questOutcome !== "playing") {
      const overlay = document.createElement("div");
      overlay.className = `essay-quest-overlay ${essayState.questOutcome}`;
      const title = document.createElement("strong");
      title.textContent = essayState.questOutcome === "won" ? "Quest complete!" : "Ink spill!";
      const copy = document.createElement("span");
      copy.textContent = essayState.questOutcome === "won"
        ? `You saved all three ideas in ${essayState.questMoves} moves.`
        : "You ran out of hearts. Retry this map and find a safer path.";
      overlay.append(title, copy);
      board.append(overlay);
    }

    $("essay-quest-hearts").textContent = `${essayState.questHearts} / 3`;
    $("essay-quest-ideas").textContent = `${essayState.questCollected.size} / 3`;
    $("essay-quest-moves").textContent = String(essayState.questMoves);
    $("essay-quest-score").textContent = String(ideaQuestScore());
    setIdeaQuestMessage(essayState.questMessage);
    renderIdeaQuestLabels();
    board.setAttribute(
      "aria-label",
      `Idea Quest game board, 7 columns by 5 rows. Explorer at row ${ideaQuestRow(essayState.questPlayer) + 1}, column ${ideaQuestColumn(essayState.questPlayer) + 1}. ${essayState.questCollected.size} of 3 ideas collected.`,
    );
  }

  function resetIdeaQuestRun(message = "Find all three ideas.") {
    const level = essayState.questLevel;
    essayState.questPlayer = level?.start ?? IDEA_QUEST_START;
    essayState.questHearts = 3;
    essayState.questMoves = 0;
    essayState.questCollected = new Set();
    essayState.questOutcome = "playing";
    essayState.questMessage = message;
    renderIdeaQuest();
  }

  function startIdeaQuest(text = essayState.submittedEssay, replay = 0) {
    essayState.questReplayCount = replay;
    essayState.questLevel = buildIdeaQuestLevel(text, replay);
    resetIdeaQuestRun(replay ? "A new essay world is ready. Find all three ideas." : "Find all three ideas.");
  }

  function resetIdeaQuest() {
    essayState.questReplayCount = 0;
    essayState.questLevel = null;
    essayState.questPlayer = IDEA_QUEST_START;
    essayState.questHearts = 3;
    essayState.questMoves = 0;
    essayState.questCollected = new Set();
    essayState.questOutcome = "playing";
    essayState.questMessage = "Find all three ideas.";
    $("essay-quest-board").replaceChildren();
    $("essay-quest-play").hidden = true;
    $("essay-quest-unavailable").hidden = true;
    $("essay-quest-labels").replaceChildren();
    $("essay-quest-hearts").textContent = "3 / 3";
    $("essay-quest-ideas").textContent = "0 / 3";
    $("essay-quest-moves").textContent = "0";
    $("essay-quest-score").textContent = "0";
    setIdeaQuestMessage("Find all three ideas.");
  }

  function moveIdeaQuest(directionName) {
    const level = essayState.questLevel;
    const direction = IDEA_QUEST_DIRECTIONS[directionName];
    if (!level || !direction || essayState.questOutcome !== "playing") return;
    const currentRow = ideaQuestRow(essayState.questPlayer);
    const currentColumn = ideaQuestColumn(essayState.questPlayer);
    const nextRow = currentRow + direction.row;
    const nextColumn = currentColumn + direction.column;
    if (nextRow < 0 || nextRow >= IDEA_QUEST_HEIGHT || nextColumn < 0 || nextColumn >= IDEA_QUEST_WIDTH) {
      setIdeaQuestMessage("That is the edge of the page. Try another direction.");
      return;
    }

    const nextPosition = nextRow * IDEA_QUEST_WIDTH + nextColumn;
    essayState.questMoves += 1;
    if (level.enemies.includes(nextPosition)) {
      essayState.questHearts -= 1;
      essayState.questPlayer = level.start;
      if (essayState.questHearts <= 0) {
        essayState.questHearts = 0;
        essayState.questOutcome = "lost";
        essayState.questMessage = "Ink spill! You ran out of hearts.";
      } else {
        essayState.questMessage = `Ink splash! You have ${essayState.questHearts} ${essayState.questHearts === 1 ? "heart" : "hearts"} left and returned to the start.`;
      }
      renderIdeaQuest();
      return;
    }

    essayState.questPlayer = nextPosition;
    const foundIdea = level.ideas.find((idea) => idea.position === nextPosition && !essayState.questCollected.has(idea.id));
    if (foundIdea) {
      essayState.questCollected.add(foundIdea.id);
      essayState.questMessage = `Idea collected: ${foundIdea.label}.`;
    } else if (nextPosition === level.portal) {
      if (essayState.questCollected.size === 3) {
        essayState.questOutcome = "won";
        essayState.questMessage = `Quest complete! You reached the portal in ${essayState.questMoves} moves.`;
      } else {
        const remaining = 3 - essayState.questCollected.size;
        essayState.questMessage = `The portal is locked. Find ${remaining} more ${remaining === 1 ? "idea" : "ideas"}.`;
      }
    } else {
      essayState.questMessage = "Keep exploring. The glowing pages hold your ideas.";
    }
    renderIdeaQuest();
  }

  function newIdeaQuest() {
    startIdeaQuest(essayState.submittedEssay, essayState.questReplayCount + 1);
    $("essay-quest-board").focus();
  }

  function handleIdeaQuestKeydown(event) {
    if (essayState.activeGame !== "quest" || $("essay-results").hidden) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
    const key = event.key.toLocaleLowerCase();
    const direction = {
      arrowup: "up",
      w: "up",
      arrowdown: "down",
      s: "down",
      arrowleft: "left",
      a: "left",
      arrowright: "right",
      d: "right",
    }[key];
    if (!direction) return;
    event.preventDefault();
    moveIdeaQuest(direction);
  }

  function showEssayGame(game) {
    const nextGame = ["quest", "shuffle", "missing"].includes(game) ? game : "quest";
    essayState.activeGame = nextGame;
    $("essay-game-quest-panel").hidden = nextGame !== "quest";
    $("essay-game-shuffle-panel").hidden = nextGame !== "shuffle";
    $("essay-game-missing-panel").hidden = nextGame !== "missing";
    $("essay-game-quest-button").classList.toggle("active", nextGame === "quest");
    $("essay-game-shuffle-button").classList.toggle("active", nextGame === "shuffle");
    $("essay-game-missing-button").classList.toggle("active", nextGame === "missing");
    $("essay-game-quest-button").setAttribute("aria-pressed", String(nextGame === "quest"));
    $("essay-game-shuffle-button").setAttribute("aria-pressed", String(nextGame === "shuffle"));
    $("essay-game-missing-button").setAttribute("aria-pressed", String(nextGame === "missing"));
  }

  function resetEssayArcade() {
    essayState.submittedEssay = "";
    resetIdeaQuest();
    resetEssayShuffle();
    resetMissingWord();
    showEssayGame("quest");
  }

  function startEssayArcade(text = essayState.submittedEssay) {
    startIdeaQuest(text);
    startEssayShuffle(text);
    startMissingWord(text);
    showEssayGame("quest");
  }

  function showEssayResults(result) {
    $("essay-form").hidden = true;
    $("essay-results").hidden = false;
    $("essay-score").textContent = result.score;
    $("essay-letter").textContent = result.letterGrade;
    $("essay-summary").textContent = result.summary;
    $("essay-next-step").textContent = result.nextStep;
    const breakdown = $("essay-breakdown");
    breakdown.replaceChildren();
    ESSAY_CRITERIA.forEach(([key, label]) => {
      const criterion = result.breakdown[key];
      const card = document.createElement("article");
      card.className = "essay-criterion";
      const heading = document.createElement("div");
      const name = document.createElement("strong");
      const score = document.createElement("span");
      const feedback = document.createElement("p");
      name.textContent = label;
      score.textContent = `${criterion.score}/25`;
      feedback.textContent = criterion.feedback;
      heading.append(name, score);
      card.append(heading, feedback);
      breakdown.append(card);
    });
    renderEssayFeedback("essay-strengths", result.strengths);
    renderEssayFeedback("essay-improvements", result.improvements);
    startEssayArcade(essayState.submittedEssay);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function gradeEssay() {
    const essay = $("essay-text").value.trim();
    const assignment = $("essay-assignment").value.trim();
    const words = essayWordCount(essay);
    if (essayState.grading || words < ESSAY_MIN_WORDS || essayLimitError()) return;
    const button = $("essay-grade");
    resetEssayArcade();
    essayState.submittedEssay = essay;
    essayState.grading = true;
    button.textContent = "Grading…";
    button.setAttribute("aria-busy", "true");
    setEssayError();
    updateEssayReady();
    try {
      const result = await api("/api/evaluate-essay", {
        method: "POST",
        body: JSON.stringify({ assignment, essay }),
        timeoutMs: 60000,
      });
      if (!validEssayResult(result)) throw new Error("DraftLab returned incomplete essay feedback. Please try again.");
      showEssayResults(result);
    } catch (error) {
      setEssayError(error instanceof Error ? error.message : "Could not grade your essay.");
    } finally {
      essayState.grading = false;
      button.textContent = "Grade my essay";
      button.removeAttribute("aria-busy");
      updateEssayReady();
    }
  }

  function editEssay() {
    resetEssayArcade();
    $("essay-results").hidden = true;
    $("essay-form").hidden = false;
    setEssayError();
    updateEssayReady();
    $("essay-text").focus();
  }

  function resetEssay() {
    $("essay-assignment").value = "";
    $("essay-text").value = "";
    editEssay();
  }

  function handleEssayInput() {
    essayState.requestError = "";
    updateEssayReady();
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
  $("essay-mode-button").addEventListener("click", () => showMode("essay"));
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
  $("essay-assignment").addEventListener("input", handleEssayInput);
  $("essay-text").addEventListener("input", handleEssayInput);
  $("essay-grade").addEventListener("click", gradeEssay);
  $("essay-edit").addEventListener("click", editEssay);
  $("essay-reset").addEventListener("click", resetEssay);
  $("essay-game-quest-button").addEventListener("click", () => showEssayGame("quest"));
  $("essay-game-shuffle-button").addEventListener("click", () => showEssayGame("shuffle"));
  $("essay-game-missing-button").addEventListener("click", () => showEssayGame("missing"));
  document.querySelectorAll("[data-quest-move]").forEach((button) => button.addEventListener("click", () => moveIdeaQuest(button.dataset.questMove)));
  $("essay-quest-retry").addEventListener("click", () => {
    resetIdeaQuestRun("Same map, fresh start. Find all three ideas.");
    $("essay-quest-board").focus();
  });
  $("essay-quest-new").addEventListener("click", newIdeaQuest);
  $("essay-quest-board").addEventListener("keydown", handleIdeaQuestKeydown);
  $("essay-shuffle-check").addEventListener("click", checkEssayShuffle);
  $("essay-shuffle-replay").addEventListener("click", () => startEssayShuffle(essayState.submittedEssay));
  $("essay-missing-next").addEventListener("click", nextMissingWordRound);
  $("essay-missing-replay").addEventListener("click", () => startMissingWord(essayState.submittedEssay, true));
  $("essay-missing-complete-replay").addEventListener("click", () => startMissingWord(essayState.submittedEssay, true));

  updateEssayReady();
  Promise.all([loadProfile(), loadPrompt(categories[0])]);
})();
