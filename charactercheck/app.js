(() => {
  "use strict";

  const ROLE_ORDER = ["heart", "mind", "spark", "wildcard"];
  const ROLE_META = {
    heart: { label: "Heart", color: "#ff5c47" },
    mind: { label: "Mind", color: "#77d6ff" },
    spark: { label: "Spark", color: "#b9a7ff" },
    wildcard: { label: "Wildcard", color: "#d7ff5b" },
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
  const ANIMATED_IDS = new Set([
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
    browseButton: document.querySelector("#browse-button"),
    surpriseButton: document.querySelector("#surprise-button"),
    emptySurpriseButton: document.querySelector("#empty-surprise-button"),
    heroCollage: document.querySelector("#hero-collage"),
    showLibrary: document.querySelector("#show-library"),
    showGrid: document.querySelector("#show-grid"),
    showSearch: document.querySelector("#show-search"),
    showCount: document.querySelector("#show-count"),
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
    shows: [],
    showId: null,
    questionIndex: 0,
    answers: [],
    answerLocked: false,
    search: "",
    filter: "all",
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

  function getShow(id = state.showId) {
    return state.shows.find((show) => show.id === id) || null;
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

  function wireFallback(image, show, fallbackAlt) {
    image.dataset.fallbackAttempted = "false";
    image.onerror = () => {
      const canUsePoster =
        show.poster && image.dataset.fallbackAttempted !== "true" && image.src !== show.poster;
      if (canUsePoster) {
        image.dataset.fallbackAttempted = "true";
        image.alt = fallbackAlt || `${show.title} promotional artwork`;
        image.src = show.poster;
        return;
      }
      image.hidden = true;
      image.onerror = null;
    };
  }

  function renderHeroCollage() {
    refs.heroCollage.replaceChildren();
    for (const id of FEATURED_IDS) {
      const show = getShow(id);
      if (!show) continue;
      const card = document.createElement("div");
      card.className = "collage-card";
      const image = makeImage(show.poster, `${show.title} poster`);
      image.loading = "eager";
      wireFallback(image, show);
      const title = document.createElement("span");
      title.textContent = show.title;
      card.append(image, title);
      refs.heroCollage.append(card);
    }
  }

  function showMatchesFilter(show) {
    const query = normalizeText(state.search);
    const matchesSearch = !query || normalizeText(show.title).includes(query);
    let matchesCategory = true;
    if (state.filter === "animated") matchesCategory = ANIMATED_IDS.has(show.id);
    else if (state.filter !== "all") matchesCategory = show.genres.includes(state.filter);
    return matchesSearch && matchesCategory;
  }

  function renderCatalog() {
    const visibleShows = state.shows.filter(showMatchesFilter);
    const fragment = document.createDocumentFragment();

    for (const show of visibleShows) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "show-card";
      card.setAttribute("aria-label", `Start a character quiz for ${show.title}`);
      card.addEventListener("click", () => startQuiz(show.id));

      const imageWrap = document.createElement("span");
      imageWrap.className = "show-card-image";
      const image = makeImage(show.poster, `${show.title} poster`);
      image.loading = "lazy";
      wireFallback(image, show);
      const badge = document.createElement("span");
      badge.className = "show-card-badge";
      badge.textContent = "10 questions";
      imageWrap.append(image, badge);

      const title = document.createElement("strong");
      title.textContent = show.title;
      const meta = document.createElement("small");
      const year = show.premiered ? show.premiered.slice(0, 4) : "TV series";
      meta.textContent = `${year} · ${show.genres.slice(0, 2).join(" / ") || "Character quiz"}`;
      card.append(imageWrap, title, meta);
      fragment.append(card);
    }

    refs.showGrid.replaceChildren(fragment);
    refs.showGrid.hidden = visibleShows.length === 0;
    refs.emptySearch.hidden = visibleShows.length !== 0;
    refs.showCount.textContent = `${visibleShows.length} ${visibleShows.length === 1 ? "show" : "shows"} ready to play`;
  }

  function showHome({ push = true, focusLibrary = false } = {}) {
    clearAdvanceTimer();
    clearFocusTimer();
    state.showId = null;
    state.questionIndex = 0;
    state.answers = [];
    state.resultRole = null;
    setView("home");
    document.title = "Character Check — Which TV Character Are You?";
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

  function chooseRandomShow() {
    const candidates = state.shows.filter(showMatchesFilter);
    const pool = candidates.length ? candidates : state.shows;
    const show = pool[Math.floor(Math.random() * pool.length)];
    if (show) startQuiz(show.id);
  }

  function startQuiz(id, { push = true } = {}) {
    const show = getShow(id);
    if (!show) return showHome({ push });
    clearAdvanceTimer();
    clearFocusTimer();
    state.showId = id;
    state.questionIndex = 0;
    state.answers = [];
    state.answerLocked = false;
    state.resultRole = null;
    setView("quiz");
    if (push) setUrl({ show: id }, true);
    document.title = `${show.title} Character Quiz — Character Check`;
    renderQuestion();
    scrollToTop();
    announce(`${show.title} quiz started. Ten questions.`);
  }

  function restartQuiz() {
    const id = state.showId;
    if (!id) return;
    startQuiz(id, { push: false });
    setUrl({ show: id }, false);
    showToast("Quiz restarted");
  }

  function preloadNextPhoto(show) {
    const nextImage = show.questionImages[state.questionIndex + 1];
    if (!nextImage) return;
    const preloader = new Image();
    preloader.src = nextImage.url;
  }

  function renderQuestion() {
    const show = getShow();
    const question = window.QUESTIONS[state.questionIndex];
    if (!show || !question) return;

    const number = state.questionIndex + 1;
    const photo = show.questionImages[state.questionIndex];
    refs.quizShowName.textContent = show.title;
    refs.questionCount.textContent = `Question ${number} of ${window.QUESTIONS.length}`;
    refs.progressTrack.setAttribute("aria-valuenow", String(number));
    refs.progressTrack.setAttribute("aria-valuemax", String(window.QUESTIONS.length));
    refs.progressFill.style.width = `${(number / window.QUESTIONS.length) * 100}%`;
    refs.questionKicker.textContent = question.kicker;
    refs.questionTitle.textContent = question.prompt;
    refs.photoLabel.textContent = `Question ${number}`;
    refs.showSourceLink.href = show.tvmazeUrl;

    refs.questionPhoto.hidden = false;
    refs.questionPhoto.alt = photo.alt;
    refs.questionPhoto.src = photo.url;
    refs.questionPhoto.style.animation = "none";
    void refs.questionPhoto.offsetWidth;
    refs.questionPhoto.style.animation = "";
    wireFallback(refs.questionPhoto, show, `${show.title} promotional artwork`);

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
    preloadNextPhoto(show);

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

    const answeredShowId = state.showId;
    const answeredQuestionIndex = state.questionIndex;
    clearAdvanceTimer();
    state.advanceTimer = window.setTimeout(
      () => {
        state.advanceTimer = null;
        if (
          refs.quiz.hidden ||
          state.showId !== answeredShowId ||
          state.questionIndex !== answeredQuestionIndex
        ) {
          return;
        }
        if (state.questionIndex >= window.QUESTIONS.length - 1) finishQuiz();
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
    const fragment = document.createDocumentFragment();
    for (const role of ROLE_ORDER) {
      const count = counts[role] || 0;
      const percent = Math.round((count / window.QUESTIONS.length) * 100);
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
    const show = getShow();
    const outcome = show?.outcomes?.[role];
    if (!show || !outcome) return showHome({ push });
    clearAdvanceTimer();
    clearFocusTimer();
    state.resultRole = role;
    state.answerLocked = false;
    setView("result");
    if (push) setUrl({ show: show.id, result: role }, true);
    document.title = `You are ${outcome.character} — ${show.title} Character Quiz`;

    refs.resultBackdrop.style.backgroundImage = `url("${show.hero || show.poster}")`;
    refs.resultPhoto.hidden = false;
    refs.resultPhoto.src = show.poster || show.hero;
    refs.resultPhoto.alt = `${show.title} promotional artwork`;
    wireFallback(refs.resultPhoto, show);
    refs.resultShowName.textContent = show.title;
    refs.resultCharacter.textContent = outcome.character;
    refs.resultActor.textContent = outcome.actor ? `Played by ${outcome.actor}` : show.title;
    refs.resultLabel.textContent = outcome.label;
    refs.resultWhy.textContent = outcome.why;
    renderMix(counts, tieResolved);
    scrollToTop();
    announce(`Your ${show.title} character match is ${outcome.character}. ${outcome.why}`);
    state.focusTimer = window.setTimeout(
      () => {
        state.focusTimer = null;
        if (!refs.result.hidden) refs.resultCharacter.focus({ preventScroll: true });
      },
      prefersReducedMotion.matches ? 0 : 320,
    );
  }

  async function shareResult() {
    const show = getShow();
    const outcome = show?.outcomes?.[state.resultRole];
    if (!show || !outcome) return;
    const shareUrl = new URL(window.location.href);
    shareUrl.search = "";
    shareUrl.searchParams.set("show", show.id);
    shareUrl.searchParams.set("result", state.resultRole);
    const data = {
      title: `I’m ${outcome.character} from ${show.title}!`,
      text: `Character Check says I’m ${outcome.character} from ${show.title}. Which character are you?`,
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
    const showId = params.get("show");
    const resultRole = params.get("result");
    if (!showId || !getShow(showId)) return showHome({ push: false });
    state.showId = showId;
    if (resultRole && ROLE_ORDER.includes(resultRole)) {
      renderResult(resultRole, null, { push: false });
      return;
    }
    startQuiz(showId, { push: false });
  }

  function bindEvents() {
    refs.homeButton.addEventListener("click", () => showHome());
    refs.browseButton.addEventListener("click", () => showHome({ push: false, focusLibrary: true }));
    refs.surpriseButton.addEventListener("click", chooseRandomShow);
    refs.emptySurpriseButton.addEventListener("click", chooseRandomShow);
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
        state.filter = chip.dataset.filter || "all";
        refs.filterChips.forEach((item) => {
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

  function validateAndInitialize() {
    try {
      if (!window.MEDIA || !window.OUTCOMES || !Array.isArray(window.QUESTIONS)) {
        throw new Error("Quiz data is unavailable");
      }
      if (window.QUESTIONS.length !== 10) throw new Error("Expected ten questions");
      state.shows = Object.entries(window.MEDIA).map(([id, media]) => {
        const outcomes = window.OUTCOMES[id];
        if (!outcomes || media.questionImages.length !== window.QUESTIONS.length) {
          throw new Error(`Incomplete show data: ${id}`);
        }
        return { id, title: media.officialTitle, outcomes, ...media };
      });
      if (state.shows.length !== 56) throw new Error("Expected 56 shows");
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
