(() => {
  "use strict";

  const ROLE_ORDER = ["heart", "mind", "spark", "wildcard"];
  const ROLE_META = {
    heart: { label: "Heart", color: "#ff5c47" },
    mind: { label: "Mind", color: "#77d6ff" },
    spark: { label: "Spark", color: "#b9a7ff" },
    wildcard: { label: "Wildcard", color: "#d7ff5b" },
  };
  const MIN_TITLE_COUNT = 56;
  const MAX_TITLE_COUNT = 156;
  const FINAL_SHOW_COUNT = 106;
  const FINAL_MOVIE_COUNT = 50;
  const QUESTIONS_PER_TITLE = 10;
  const QUICK_QUESTION_BANK = [
    "A plan changes at the last second. What do you do?",
    "The group is running out of time. What’s your move?",
    "Someone feels left out. How do you help?",
    "Two people disagree. Where do you step in?",
    "A simple task turns messy. How do you react?",
    "Everyone is looking to you. What do you do first?",
    "A secret changes the mood. How do you respond?",
    "The safe choice feels wrong. What guides you?",
    "The team needs a fresh idea. What do you suggest?",
    "A friend makes a mistake. How do you handle it?",
    "Plans fall apart in public. What’s your instinct?",
    "A new person joins the group. How do you welcome them?",
    "The group has one chance left. What role do you take?",
    "Someone challenges the plan. What do you do?",
    "A fun night gets tense. How do you reset it?",
    "A tough truth needs saying. How do you say it?",
    "Nobody agrees on the next move. How do you help?",
    "You notice a problem first. What happens next?",
    "A bold idea could work. Do you go for it?",
    "The rules get in the way. How do you respond?",
    "A friend asks for honest advice. What do you say?",
    "The group needs to stay calm. What do you do?",
    "A surprise changes everything. What’s your first move?",
    "Someone takes a big risk. How do you react?",
    "A challenge becomes a competition. How do you play it?",
    "The team has to improvise. What do you bring?",
    "A choice affects everyone. How do you decide?",
    "One person needs backup. How do you show up?",
    "The room feels awkward. How do you break the tension?",
    "A mistake can still be fixed. Where do you start?",
    "Everyone has a different idea. What role feels natural?",
    "A big moment is coming. How do you prepare?",
    "Someone doubts the group. How do you respond?",
    "A quiet problem keeps growing. What do you do?",
    "The group needs courage. How do you give it?",
    "A shortcut appears. Do you take it?",
    "A celebration needs saving. What’s your move?",
    "A friendship is being tested. What matters most?",
    "You have to choose quickly. What leads you?",
    "Things are getting chaotic. How do you help?",
  ];
  const QUICK_ANSWER_BANKS = {
    heart: [
      "Check on everyone first.",
      "Keep the group together.",
      "Listen before making a move.",
      "Protect the friendship.",
      "Help the person who needs it.",
      "Make sure no one feels alone.",
      "Say the kind, honest thing.",
      "Put trust first.",
      "Offer steady support.",
      "Find a fair compromise.",
    ],
    mind: [
      "Pause and make a plan.",
      "Look for the missing detail.",
      "Ask a few clear questions.",
      "Think two steps ahead.",
      "Choose the safest solution.",
      "Sort out the facts.",
      "Break it into smaller steps.",
      "Weigh the risks first.",
      "Find what caused the problem.",
      "Give everyone a clear job.",
    ],
    spark: [
      "Take the lead.",
      "Raise everyone’s energy.",
      "Say what needs to be said.",
      "Make the bold move.",
      "Use humor to reset things.",
      "Get everyone moving.",
      "Trust your confidence.",
      "Turn pressure into momentum.",
      "Bring the group together.",
      "Go for the exciting choice.",
    ],
    wildcard: [
      "Try the unexpected idea.",
      "Improvise a new route.",
      "Follow your strange hunch.",
      "Create a clever distraction.",
      "Flip the problem around.",
      "Take the adventurous option.",
      "Break the usual pattern.",
      "Change the game.",
      "Use whatever is nearby.",
      "Take the side door.",
    ],
  };
  // If two roles receive the same number of answers, use the most revealing
  // question first instead of favoring a fixed role or a button position.
  const TIE_BREAK_QUESTION_ORDER = [9, 8, 7, 5, 0, 2, 3, 1, 6, 4];
  const FEATURED_IDS = [
    "friends",
    "modern-family",
    "the-good-place",
    "the-simpsons",
    "brooklyn-nine-nine",
    "stranger-things",
  ];
  // TVmaze does not consistently include "Animation" as a genre, so keep
  // these original animated titles recognizable while newer data uses genres.
  const LEGACY_ANIMATED_IDS = new Set([
    "the-simpsons",
    "avatar-the-last-airbender",
    "gravity-falls",
    "bobs-burgers",
    "futurama",
    "rick-and-morty",
    "bojack-horseman",
    "spongebob-squarepants",
    "adventure-time",
    "phineas-and-ferb",
  ]);

  const refs = {
    home: document.querySelector("#home-view"),
    quiz: document.querySelector("#quiz-view"),
    result: document.querySelector("#result-view"),
    error: document.querySelector("#load-error"),
    homeButton: document.querySelector("#home-button"),
    headerCount: document.querySelector("#header-count"),
    browseButton: document.querySelector("#browse-button"),
    surpriseButton: document.querySelector("#surprise-button"),
    emptySurpriseButton: document.querySelector("#empty-surprise-button"),
    heroCollage: document.querySelector("#hero-collage"),
    heroLede: document.querySelector("#hero-lede"),
    showLibrary: document.querySelector("#show-library"),
    showGrid: document.querySelector("#show-grid"),
    showSearch: document.querySelector("#show-search"),
    showCount: document.querySelector("#show-count"),
    titleTotal: document.querySelector("#title-total"),
    titleKinds: document.querySelector("#title-kinds"),
    typeFilterGroup: document.querySelector("#type-filter-group"),
    libraryTitle: document.querySelector("#library-title"),
    emptySearch: document.querySelector("#empty-search"),
    filterChips: [...document.querySelectorAll(".filter-chip")],
    quizExitButton: document.querySelector("#quiz-exit-button"),
    quizRestartButton: document.querySelector("#quiz-restart-button"),
    quizShowName: document.querySelector("#quiz-show-name"),
    questionCount: document.querySelector("#question-count"),
    progressTrack: document.querySelector(".progress-track"),
    progressFill: document.querySelector("#progress-fill"),
    questionPhoto: document.querySelector("#question-photo"),
    photoLabel: document.querySelector("#photo-label"),
    showSourceLink: document.querySelector("#show-source-link"),
    questionKicker: document.querySelector("#question-kicker"),
    questionTitle: document.querySelector("#question-title"),
    answerList: document.querySelector("#answer-list"),
    previousQuestionButton: document.querySelector("#previous-question-button"),
    resultBackdrop: document.querySelector("#result-backdrop"),
    resultPhoto: document.querySelector("#result-photo"),
    resultShowName: document.querySelector("#result-show-name"),
    resultCharacter: document.querySelector("#result-character"),
    resultActor: document.querySelector("#result-actor"),
    resultLabel: document.querySelector("#result-label"),
    resultWhy: document.querySelector("#result-why"),
    personalityMix: document.querySelector("#personality-mix"),
    mixNote: document.querySelector("#mix-note"),
    mixBars: document.querySelector("#mix-bars"),
    shareResultButton: document.querySelector("#share-result-button"),
    retakeButton: document.querySelector("#retake-button"),
    anotherShowButton: document.querySelector("#another-show-button"),
    toast: document.querySelector("#toast"),
    liveRegion: document.querySelector("#live-region"),
  };

  const state = {
    titles: [],
    titleId: null,
    questionIndex: 0,
    answers: [],
    answerLocked: false,
    search: "",
    typeFilter: "all",
    genreFilter: "all",
    resultRole: null,
    toastTimer: null,
    advanceTimer: null,
    focusTimer: null,
  };

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’']/g, "")
      .toLowerCase()
      .trim();
  }

  function stableHash(value) {
    let hash = 2166136261;
    for (const character of String(value)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function shuffledForTitle(items, titleId) {
    const copy = items.slice();
    let seed = stableHash(titleId) || 1;
    for (let index = copy.length - 1; index > 0; index -= 1) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      const target = (seed >>> 0) % (index + 1);
      [copy[index], copy[target]] = [copy[target], copy[index]];
    }
    return copy;
  }

  function compactQuestions(questions, titleId) {
    const prompts = shuffledForTitle(QUICK_QUESTION_BANK, titleId).slice(
      0,
      QUESTIONS_PER_TITLE,
    );
    return questions.map((question, questionIndex) => ({
      ...question,
      prompt: prompts[questionIndex],
      kicker: `Quick choice · ${questionIndex + 1} of ${QUESTIONS_PER_TITLE}`,
      options: question.options.map((option) => {
        const bank = QUICK_ANSWER_BANKS[option.role];
        const start = stableHash(`${titleId}:${option.role}`) % bank.length;
        return {
          ...option,
          text: bank[(start + questionIndex * 3) % bank.length],
        };
      }),
    }));
  }

  function getTitle(id = state.titleId) {
    return state.titles.find((title) => title.id === id) || null;
  }

  function setView(view) {
    refs.home.hidden = view !== "home";
    refs.quiz.hidden = view !== "quiz";
    refs.result.hidden = view !== "result";
    refs.error.hidden = view !== "error";
    document.body.dataset.view = view;
  }

  function clearAdvanceTimer() {
    window.clearTimeout(state.advanceTimer);
    state.advanceTimer = null;
  }

  function clearFocusTimer() {
    window.clearTimeout(state.focusTimer);
    state.focusTimer = null;
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion.matches ? "auto" : "smooth" });
  }

  function setUrl(params, push = true) {
    const url = new URL(window.location.href);
    url.search = "";
    for (const [key, value] of Object.entries(params || {})) {
      if (value) url.searchParams.set(key, value);
    }
    const method = push ? "pushState" : "replaceState";
    history[method]({}, "", url);
  }

  function announce(message) {
    refs.liveRegion.textContent = "";
    window.setTimeout(() => {
      refs.liveRegion.textContent = message;
    }, 20);
  }

  function showToast(message) {
    window.clearTimeout(state.toastTimer);
    refs.toast.textContent = message;
    refs.toast.classList.add("visible");
    state.toastTimer = window.setTimeout(() => refs.toast.classList.remove("visible"), 2600);
  }

  function makeImage(src, alt, className = "") {
    const image = document.createElement("img");
    image.src = src;
    image.alt = alt;
    image.className = className;
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    return image;
  }

  function wireFallback(image, title, fallbackAlt) {
    image.dataset.fallbackAttempted = "false";
    image.onerror = () => {
      const canUsePoster =
        title.poster && image.dataset.fallbackAttempted !== "true" && image.src !== title.poster;
      if (canUsePoster) {
        image.dataset.fallbackAttempted = "true";
        image.alt = fallbackAlt || `${title.title} promotional artwork`;
        image.src = title.poster;
        return;
      }
      image.hidden = true;
      image.onerror = null;
    };
  }

  function renderHeroCollage() {
    refs.heroCollage.replaceChildren();
    for (const id of FEATURED_IDS) {
      const titleData = getTitle(id);
      if (!titleData) continue;
      const card = document.createElement("div");
      card.className = "collage-card";
      const image = makeImage(titleData.poster, `${titleData.title} poster`);
      image.loading = "eager";
      wireFallback(image, titleData);
      const title = document.createElement("span");
      title.textContent = titleData.title;
      card.append(image, title);
      refs.heroCollage.append(card);
    }
  }

  function isAnimatedTitle(title) {
    return (
      LEGACY_ANIMATED_IDS.has(title.id) ||
      title.genres.some((genre) => normalizeText(genre).includes("animat"))
    );
  }

  function titleMatchesFilter(title) {
    const query = normalizeText(state.search);
    const matchesSearch = !query || normalizeText(title.title).includes(query);
    const matchesType = state.typeFilter === "all" || title.type === state.typeFilter;
    let matchesGenre = true;
    if (state.genreFilter === "animated") matchesGenre = isAnimatedTitle(title);
    else if (state.genreFilter !== "all") {
      const selectedGenre = normalizeText(state.genreFilter);
      matchesGenre = title.genres.some((genre) => normalizeText(genre) === selectedGenre);
    }
    return matchesSearch && matchesType && matchesGenre;
  }

  function renderCatalog() {
    const visibleTitles = state.titles.filter(titleMatchesFilter);
    const fragment = document.createDocumentFragment();

    for (const titleData of visibleTitles) {
      const typeLabel = titleData.type === "movie" ? "Movie" : "Show";
      const card = document.createElement("button");
      card.type = "button";
      card.className = "show-card";
      card.setAttribute(
        "aria-label",
        `Start the ${titleData.title} ${typeLabel.toLowerCase()} character quiz`,
      );
      card.addEventListener("click", () => startQuiz(titleData.id));

      const imageWrap = document.createElement("span");
      imageWrap.className = "show-card-image";
      const image = makeImage(titleData.poster, `${titleData.title} poster`);
      image.loading = "lazy";
      wireFallback(image, titleData);
      const typeBadge = document.createElement("span");
      typeBadge.className = `show-card-type ${titleData.type}`;
      typeBadge.textContent = typeLabel;
      const badge = document.createElement("span");
      badge.className = "show-card-badge";
      badge.textContent = "10 questions";
      imageWrap.append(image, typeBadge, badge);

      const title = document.createElement("strong");
      title.textContent = titleData.title;
      const meta = document.createElement("small");
      const year = isNonemptyString(titleData.premiered)
        ? titleData.premiered.slice(0, 4)
        : typeLabel;
      meta.textContent = `${year} · ${titleData.genres.slice(0, 2).join(" / ") || `${typeLabel} quiz`}`;
      card.append(imageWrap, title, meta);
      fragment.append(card);
    }

    refs.showGrid.replaceChildren(fragment);
    refs.showGrid.hidden = visibleTitles.length === 0;
    refs.emptySearch.hidden = visibleTitles.length !== 0;
    const showCount = visibleTitles.filter((title) => title.type === "show").length;
    const movieCount = visibleTitles.length - showCount;
    const titleWord = visibleTitles.length === 1 ? "title" : "titles";
    refs.showCount.textContent = `${visibleTitles.length} ${titleWord} ready · ${showCount} ${showCount === 1 ? "show" : "shows"} · ${movieCount} ${movieCount === 1 ? "movie" : "movies"}`;
  }

  function updateCatalogCopy() {
    const total = state.titles.length;
    const shows = state.titles.filter((title) => title.type === "show").length;
    const movies = total - shows;
    const hasMovies = movies > 0;
    refs.headerCount.textContent = `${total} ${total === 1 ? "title" : "titles"} ready`;
    refs.titleTotal.textContent = String(total);
    refs.titleKinds.textContent = hasMovies ? "shows + movies" : "shows";
    refs.heroLede.textContent = hasMovies
      ? "Pick a show or movie you know, answer ten quick questions, and meet your character twin — plus why the match makes sense."
      : "Pick a show you know, answer ten quick questions, and meet your character twin — plus why the match makes sense.";
    refs.heroCollage.setAttribute(
      "aria-label",
      hasMovies ? "Featured shows and movies" : "Featured television shows",
    );
    refs.showSearch.placeholder = hasMovies
      ? `Search ${total} shows and movies…`
      : `Search ${total} shows…`;
    refs.typeFilterGroup.hidden = !hasMovies;

    const description = hasMovies
      ? `${total} shows and movies. Ten unique questions each. Find your character twin.`
      : `${total} shows. Ten unique questions each. Find your TV character twin.`;
    document
      .querySelectorAll('meta[property="og:description"], meta[name="twitter:description"]')
      .forEach((meta) => meta.setAttribute("content", description));
  }

  function showHome({ push = true, focusLibrary = false } = {}) {
    clearAdvanceTimer();
    clearFocusTimer();
    state.titleId = null;
    state.questionIndex = 0;
    state.answers = [];
    state.resultRole = null;
    setView("home");
    document.title = "Character Check — Which Character Are You?";
    if (push) setUrl({}, true);
    if (focusLibrary) {
      refs.showLibrary.scrollIntoView({ behavior: prefersReducedMotion.matches ? "auto" : "smooth" });
      state.focusTimer = window.setTimeout(
        () => {
          state.focusTimer = null;
          refs.libraryTitle.focus({ preventScroll: true });
        },
        prefersReducedMotion.matches ? 0 : 420,
      );
    } else {
      scrollToTop();
    }
  }

  function chooseRandomTitle() {
    const candidates = state.titles.filter(titleMatchesFilter);
    const pool = candidates.length ? candidates : state.titles;
    const title = pool[Math.floor(Math.random() * pool.length)];
    if (title) startQuiz(title.id);
  }

  function startQuiz(id, { push = true } = {}) {
    const title = getTitle(id);
    if (!title) return showHome({ push });
    clearAdvanceTimer();
    clearFocusTimer();
    state.titleId = id;
    state.questionIndex = 0;
    state.answers = [];
    state.answerLocked = false;
    state.resultRole = null;
    setView("quiz");
    if (push) setUrl({ show: id }, true);
    document.title = `${title.title} Character Quiz — Character Check`;
    renderQuestion();
    scrollToTop();
    announce(`${title.title} quiz started. Ten questions.`);
  }

  function restartQuiz() {
    const id = state.titleId;
    if (!id) return;
    startQuiz(id, { push: false });
    setUrl({ show: id }, false);
    showToast("Quiz restarted");
  }

  function preloadNextPhoto(title) {
    const nextImage = title.questions[state.questionIndex + 1]?.image;
    if (!nextImage) return;
    const preloader = new Image();
    preloader.src = nextImage.url;
  }

  function renderQuestion() {
    const title = getTitle();
    const question = title?.questions?.[state.questionIndex];
    if (!title || !question) return;

    const number = state.questionIndex + 1;
    const photo = question.image;
    refs.quizShowName.textContent = title.title;
    refs.questionCount.textContent = `Question ${number} of ${title.questions.length}`;
    refs.progressTrack.setAttribute("aria-valuenow", String(number));
    refs.progressTrack.setAttribute("aria-valuemax", String(title.questions.length));
    refs.progressFill.style.width = `${(number / title.questions.length) * 100}%`;
    refs.questionKicker.textContent = question.kicker;
    refs.questionTitle.textContent = question.prompt;
    refs.photoLabel.textContent = `${title.type === "movie" ? "Movie" : "Show"} · Question ${number}`;
    refs.showSourceLink.href = photo.sourceUrl || title.sourceUrl;
    refs.showSourceLink.textContent = `Image via ${photo.sourceName || title.sourceName} ↗`;

    refs.questionPhoto.hidden = false;
    refs.questionPhoto.alt = photo.alt;
    refs.questionPhoto.src = photo.url;
    refs.questionPhoto.style.animation = "none";
    void refs.questionPhoto.offsetWidth;
    refs.questionPhoto.style.animation = "";
    wireFallback(refs.questionPhoto, title, `${title.title} promotional artwork`);

    state.answerLocked = false;
    const chosenRole = state.answers[state.questionIndex] || null;
    const fragment = document.createDocumentFragment();
    question.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `answer-button${chosenRole === option.role ? " selected" : ""}`;
      button.dataset.role = option.role;
      button.setAttribute("aria-pressed", String(chosenRole === option.role));
      button.innerHTML = `
        <span class="answer-number">${index + 1}</span>
        <span class="answer-text"></span>
        <span class="answer-arrow" aria-hidden="true">→</span>
      `;
      button.querySelector(".answer-text").textContent = option.text;
      button.addEventListener("click", () => answerQuestion(option.role, button));
      fragment.append(button);
    });
    refs.answerList.replaceChildren(fragment);
    refs.previousQuestionButton.disabled = state.questionIndex === 0;
    preloadNextPhoto(title);

    state.focusTimer = window.setTimeout(() => {
      state.focusTimer = null;
      if (!refs.quiz.hidden) refs.questionTitle.focus({ preventScroll: true });
    }, prefersReducedMotion.matches ? 0 : 220);
  }

  function answerQuestion(role, button) {
    if (state.answerLocked || !ROLE_ORDER.includes(role)) return;
    state.answerLocked = true;
    state.answers[state.questionIndex] = role;
    const buttons = [...refs.answerList.querySelectorAll(".answer-button")];
    buttons.forEach((item) => {
      const selected = item === button;
      item.classList.toggle("selected", selected);
      item.setAttribute("aria-pressed", String(selected));
      item.disabled = true;
    });
    announce(`${ROLE_META[role].label} answer selected.`);

    const answeredTitleId = state.titleId;
    const answeredQuestionIndex = state.questionIndex;
    clearAdvanceTimer();
    state.advanceTimer = window.setTimeout(
      () => {
        state.advanceTimer = null;
        if (
          refs.quiz.hidden ||
          state.titleId !== answeredTitleId ||
          state.questionIndex !== answeredQuestionIndex
        ) {
          return;
        }
        if (state.questionIndex >= getTitle().questions.length - 1) finishQuiz();
        else {
          state.questionIndex += 1;
          renderQuestion();
        }
      },
      prefersReducedMotion.matches ? 20 : 340,
    );
  }

  function previousQuestion() {
    if (state.answerLocked || state.questionIndex === 0) return;
    state.questionIndex -= 1;
    renderQuestion();
  }

  function scoreAnswers() {
    const counts = Object.fromEntries(ROLE_ORDER.map((role) => [role, 0]));
    state.answers.forEach((role) => {
      if (!ROLE_ORDER.includes(role)) return;
      counts[role] += 1;
    });
    const topCount = Math.max(...Object.values(counts));
    const tiedRoles = ROLE_ORDER.filter((role) => counts[role] === topCount);
    let role = tiedRoles[0];
    if (tiedRoles.length > 1) {
      for (const questionIndex of TIE_BREAK_QUESTION_ORDER) {
        const answer = state.answers[questionIndex];
        if (tiedRoles.includes(answer)) {
          role = answer;
          break;
        }
      }
    }
    return { role, counts, tieResolved: tiedRoles.length > 1 };
  }

  function finishQuiz() {
    const { role, counts, tieResolved } = scoreAnswers();
    renderResult(role, counts, { push: true, tieResolved });
  }

  function renderMix(counts, tieResolved = false) {
    if (!counts) {
      refs.personalityMix.hidden = true;
      refs.mixBars.replaceChildren();
      return;
    }
    refs.personalityMix.hidden = false;
    refs.mixNote.textContent = tieResolved
      ? "close tie · your strongest answer decided it"
      : "based on 10 answers";
    const questionCount = getTitle()?.questions.length || QUESTIONS_PER_TITLE;
    const fragment = document.createDocumentFragment();
    for (const role of ROLE_ORDER) {
      const count = counts[role] || 0;
      const percent = Math.round((count / questionCount) * 100);
      const row = document.createElement("div");
      row.className = "mix-row";
      row.innerHTML = `
        <span>${ROLE_META[role].label}</span>
        <span class="mix-track"><i></i></span>
        <span>${percent}%</span>
      `;
      const fill = row.querySelector("i");
      fill.style.setProperty("--mix-width", `${percent}%`);
      fill.style.setProperty("--mix-color", ROLE_META[role].color);
      fragment.append(row);
    }
    refs.mixBars.replaceChildren(fragment);
  }

  function renderResult(role, counts = null, { push = true, tieResolved = false } = {}) {
    const title = getTitle();
    const outcome = title?.outcomes?.[role];
    if (!title || !outcome) return showHome({ push });
    clearAdvanceTimer();
    clearFocusTimer();
    state.resultRole = role;
    state.answerLocked = false;
    setView("result");
    if (push) setUrl({ show: title.id, result: role }, true);
    document.title = `You are ${outcome.character} — ${title.title} Character Quiz`;

    refs.resultBackdrop.style.backgroundImage = `url("${title.hero || title.poster}")`;
    refs.resultPhoto.hidden = false;
    refs.resultPhoto.src = title.poster || title.hero;
    refs.resultPhoto.alt = `${title.title} promotional artwork`;
    wireFallback(refs.resultPhoto, title);
    refs.resultShowName.textContent = `${title.type === "movie" ? "MOVIE" : "SHOW"} · ${title.title}`;
    refs.resultCharacter.textContent = outcome.character;
    refs.resultActor.textContent = outcome.actor ? `Played by ${outcome.actor}` : title.title;
    refs.resultLabel.textContent = outcome.label;
    refs.resultWhy.textContent = outcome.why;
    renderMix(counts, tieResolved);
    scrollToTop();
    announce(`Your ${title.title} character match is ${outcome.character}. ${outcome.why}`);
    state.focusTimer = window.setTimeout(
      () => {
        state.focusTimer = null;
        if (!refs.result.hidden) refs.resultCharacter.focus({ preventScroll: true });
      },
      prefersReducedMotion.matches ? 0 : 320,
    );
  }

  async function shareResult() {
    const title = getTitle();
    const outcome = title?.outcomes?.[state.resultRole];
    if (!title || !outcome) return;
    const typeLabel = title.type === "movie" ? "movie" : "show";
    const shareUrl = new URL(window.location.href);
    shareUrl.search = "";
    // Keep `show` so links shared by the original release remain compatible.
    shareUrl.searchParams.set("show", title.id);
    shareUrl.searchParams.set("result", state.resultRole);
    const data = {
      title: `I’m ${outcome.character} in the ${title.title} character quiz!`,
      text: `I got ${outcome.character} in the ${title.title} ${typeLabel} quiz. Which character are you?`,
      url: shareUrl.toString(),
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(`${data.text} ${data.url}`);
      showToast("Result link copied!");
    } catch (error) {
      if (error?.name !== "AbortError") showToast("Could not share — try copying the page link.");
    }
  }

  function handleKeyboard(event) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      if (!refs.home.hidden) {
        event.preventDefault();
        refs.showSearch.focus();
      }
      return;
    }
    if (refs.quiz.hidden || state.answerLocked) return;
    const number = Number(event.key);
    if (number >= 1 && number <= 4) {
      const button = refs.answerList.querySelectorAll(".answer-button")[number - 1];
      if (button) {
        event.preventDefault();
        button.click();
      }
    }
  }

  function routeFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const titleId = params.get("show");
    const resultRole = params.get("result");
    if (!titleId || !getTitle(titleId)) return showHome({ push: false });
    state.titleId = titleId;
    if (resultRole && ROLE_ORDER.includes(resultRole)) {
      renderResult(resultRole, null, { push: false });
      return;
    }
    startQuiz(titleId, { push: false });
  }

  function bindEvents() {
    refs.homeButton.addEventListener("click", () => showHome());
    refs.browseButton.addEventListener("click", () => showHome({ push: false, focusLibrary: true }));
    refs.surpriseButton.addEventListener("click", chooseRandomTitle);
    refs.emptySurpriseButton.addEventListener("click", chooseRandomTitle);
    refs.quizExitButton.addEventListener("click", () => showHome());
    refs.quizRestartButton.addEventListener("click", restartQuiz);
    refs.previousQuestionButton.addEventListener("click", previousQuestion);
    refs.shareResultButton.addEventListener("click", shareResult);
    refs.retakeButton.addEventListener("click", restartQuiz);
    refs.anotherShowButton.addEventListener("click", () => showHome());
    refs.showSearch.addEventListener("input", (event) => {
      state.search = event.currentTarget.value;
      renderCatalog();
    });
    refs.filterChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        const filterKind = chip.dataset.filterKind;
        const filterValue = chip.dataset.filter || "all";
        if (filterKind === "type") state.typeFilter = filterValue;
        else state.genreFilter = filterValue;
        refs.filterChips
          .filter((item) => item.dataset.filterKind === filterKind)
          .forEach((item) => {
            const active = item === chip;
            item.classList.toggle("active", active);
            item.setAttribute("aria-pressed", String(active));
          });
        renderCatalog();
      });
    });
    document.addEventListener("keydown", handleKeyboard);
    window.addEventListener("popstate", routeFromUrl);
  }

  function isNonemptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function resolveTitleQuestions(media, id) {
    if (Array.isArray(media.questions)) return compactQuestions(media.questions, id);

    // This path exists only for a mismatched/cached legacy data load. Normal
    // operation always uses the ten title-specific questions in MEDIA.
    if (
      typeof media.questions === "undefined" &&
      Array.isArray(window.FALLBACK_QUESTIONS) &&
      Array.isArray(media.questionImages) &&
      media.questionImages.length === QUESTIONS_PER_TITLE
    ) {
      console.warn(`Title-specific questions did not load for ${id}; using emergency fallback.`);
      const fallbackQuestions = window.FALLBACK_QUESTIONS.map((question, index) => ({
        ...question,
        options: question.options.map((option) => ({ ...option })),
        image: { ...media.questionImages[index] },
      }));
      return compactQuestions(fallbackQuestions, id);
    }

    throw new Error(`Title-specific questions are unavailable for ${id}`);
  }

  function validateTitleQuestions(questions, id) {
    if (!Array.isArray(questions) || questions.length !== QUESTIONS_PER_TITLE) {
      throw new Error(`${id} must have exactly ${QUESTIONS_PER_TITLE} questions`);
    }

    questions.forEach((question, questionIndex) => {
      if (!isNonemptyString(question.prompt) || !isNonemptyString(question.kicker)) {
        throw new Error(`${id} question ${questionIndex + 1} needs a prompt and kicker`);
      }
      if (!Array.isArray(question.options) || question.options.length !== ROLE_ORDER.length) {
        throw new Error(`${id} question ${questionIndex + 1} must have four answers`);
      }
      const roles = question.options.map((option) => option.role).sort();
      const expectedRoles = [...ROLE_ORDER].sort();
      if (
        !expectedRoles.every((role, index) => roles[index] === role) ||
        !question.options.every((option) => isNonemptyString(option.text))
      ) {
        throw new Error(`${id} question ${questionIndex + 1} needs one answer for each role`);
      }
      if (!isNonemptyString(question.image?.url) || !isNonemptyString(question.image?.alt)) {
        throw new Error(`${id} question ${questionIndex + 1} needs a paired image and alt text`);
      }
    });
  }

  function validateOutcomes(outcomes, id) {
    if (!outcomes || typeof outcomes !== "object") {
      throw new Error(`Character outcomes are unavailable for ${id}`);
    }
    for (const role of ROLE_ORDER) {
      const outcome = outcomes[role];
      if (
        !outcome ||
        !isNonemptyString(outcome.character) ||
        !isNonemptyString(outcome.label) ||
        !isNonemptyString(outcome.why)
      ) {
        throw new Error(`${id} has an incomplete ${role} character outcome`);
      }
    }
  }

  function validateAndInitialize() {
    try {
      if (!window.MEDIA || !window.OUTCOMES || !Array.isArray(window.FALLBACK_QUESTIONS)) {
        throw new Error("Quiz data is unavailable");
      }
      if (window.FALLBACK_QUESTIONS.length !== QUESTIONS_PER_TITLE) {
        throw new Error("Emergency questions are unavailable");
      }

      state.titles = Object.entries(window.MEDIA).map(([id, media]) => {
        const outcomes = window.OUTCOMES[id];
        if (!isNonemptyString(media.officialTitle)) {
          throw new Error(`Missing title name: ${id}`);
        }
        // A cached first-release TVmaze entry has no `type`; it is always a show.
        const type = media.type || (media.tvmazeUrl ? "show" : "");
        if (type !== "show" && type !== "movie") {
          throw new Error(`${id} must be labeled as a show or movie`);
        }
        if (!Array.isArray(media.genres)) {
          throw new Error(`${id} must include genres`);
        }
        if (!isNonemptyString(media.poster)) {
          throw new Error(`${id} must include poster artwork`);
        }
        const sourceName = media.sourceName || (media.tvmazeUrl ? "TVmaze" : "");
        const sourceUrl = media.sourceUrl || media.tvmazeUrl || "";
        if (!isNonemptyString(sourceName) || !isNonemptyString(sourceUrl)) {
          throw new Error(`${id} must include its image source`);
        }
        const questions = resolveTitleQuestions(media, id);
        validateTitleQuestions(questions, id);
        validateOutcomes(outcomes, id);
        return {
          ...media,
          id,
          type,
          title: media.officialTitle,
          sourceName,
          sourceUrl,
          outcomes,
          questions,
        };
      });
      if (state.titles.length < MIN_TITLE_COUNT || state.titles.length > MAX_TITLE_COUNT) {
        throw new Error(`Expected between ${MIN_TITLE_COUNT} and ${MAX_TITLE_COUNT} titles`);
      }
      const showCount = state.titles.filter((title) => title.type === "show").length;
      const movieCount = state.titles.filter((title) => title.type === "movie").length;
      if (showCount > FINAL_SHOW_COUNT || movieCount > FINAL_MOVIE_COUNT) {
        throw new Error(
          `Catalog exceeds ${FINAL_SHOW_COUNT} shows or ${FINAL_MOVIE_COUNT} movies`,
        );
      }
      if (
        state.titles.length === MAX_TITLE_COUNT &&
        (showCount !== FINAL_SHOW_COUNT || movieCount !== FINAL_MOVIE_COUNT)
      ) {
        throw new Error(`The full catalog needs ${FINAL_SHOW_COUNT} shows and ${FINAL_MOVIE_COUNT} movies`);
      }
      updateCatalogCopy();
      renderHeroCollage();
      renderCatalog();
      bindEvents();
      routeFromUrl();
    } catch (error) {
      console.error(error);
      setView("error");
      document.title = "Character Check — Please refresh";
    }
  }

  validateAndInitialize();
})();
