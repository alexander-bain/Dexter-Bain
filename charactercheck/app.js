(() => {
  "use strict";

  const ROLE_ORDER = ["heart", "mind", "spark", "wildcard"];
  const ROLE_META = {
    heart: { label: "Heart", color: "#ff5c47" },
    mind: { label: "Mind", color: "#77d6ff" },
    spark: { label: "Spark", color: "#b9a7ff" },
    wildcard: { label: "Wildcard", color: "#d7ff5b" },
  };
  const TYPE_META = {
    show: { label: "Show", plural: "shows" },
    movie: { label: "Movie", plural: "movies" },
    kids: { label: "Kids", plural: "kids' shows" },
    documentary: { label: "Documentary", plural: "documentaries" },
    "game-show": { label: "Game Show", plural: "game shows" },
    reality: { label: "Reality", plural: "reality shows" },
    other: { label: "Other", plural: "short films and other formats" },
  };
  const PUBLISHED_TITLE_COUNT = 15000;
  const QUESTIONS_PER_TITLE = 10;
  const CATALOG_PAGE_SIZE = 210;
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
  const OPENING_TITLE_IDS = [
    "friends",
    "modern-family",
    "the-good-place",
    "brooklyn-nine-nine",
    "the-office",
    "parks-and-recreation",
    "new-girl",
    "community",
    "schitts-creek",
    "ted-lasso",
    "abbott-elementary",
    "superstore",
    "30-rock",
    "seinfeld",
    "the-big-bang-theory",
    "how-i-met-your-mother",
    "arrested-development",
    "frasier",
    "cheers",
    "the-simpsons",
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
    showMoreButton: document.querySelector("#show-more-button"),
    showSearch: document.querySelector("#show-search"),
    showCount: document.querySelector("#show-count"),
    titleTotal: document.querySelector("#title-total"),
    titleKinds: document.querySelector("#title-kinds"),
    typeFilterGroup: document.querySelector("#type-filter-group"),
    libraryTitle: document.querySelector("#library-title"),
    emptySearch: document.querySelector("#empty-search"),
    filterChips: [...document.querySelectorAll(".filter-chip")],
    accountButton: document.querySelector("#account-button"),
    accountPanel: document.querySelector("#account-panel"),
    accountTitle: document.querySelector("#account-title"),
    accountStatus: document.querySelector("#account-status"),
    accountTestCount: document.querySelector("#account-test-count"),
    accountAverage: document.querySelector("#account-average"),
    accountHistory: document.querySelector("#account-history"),
    accountHistoryList: document.querySelector("#account-history-list"),
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
    resultKicker: document.querySelector("#result-kicker"),
    resultCharacter: document.querySelector("#result-character"),
    resultActor: document.querySelector("#result-actor"),
    resultLabel: document.querySelector("#result-label"),
    resultWhy: document.querySelector("#result-why"),
    personalityMix: document.querySelector("#personality-mix"),
    mixNote: document.querySelector("#mix-note"),
    mixBars: document.querySelector("#mix-bars"),
    saveResultButton: document.querySelector("#save-result-button"),
    shareResultButton: document.querySelector("#share-result-button"),
    retakeButton: document.querySelector("#retake-button"),
    anotherShowButton: document.querySelector("#another-show-button"),
    predictionDialog: document.querySelector("#prediction-dialog"),
    predictionCopy: document.querySelector("#prediction-copy"),
    predictionCloseButton: document.querySelector("#prediction-close-button"),
    predictionGuessButton: document.querySelector("#prediction-guess-button"),
    predictionStartButton: document.querySelector("#prediction-start-button"),
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
    collectionFilter: "all",
    catalogLimit: CATALOG_PAGE_SIZE,
    resultRole: null,
    resultCounts: null,
    resultIsPrediction: false,
    resultSavedThisView: false,
    account: null,
    pendingTitleId: null,
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

  function typeLabel(type) {
    return TYPE_META[type]?.label || "Quiz";
  }

  function hashText(value) {
    let result = 2166136261;
    for (const character of String(value)) {
      result ^= character.charCodeAt(0);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  }

  function getOutcome(title, key) {
    return title?.outcomes?.[key] || window.CHARACTER_CHECK_PROFILES?.[key] || null;
  }

  function compactQuestions(questions, titleId) {
    const quickQuestions = window.TITLE_QUESTIONS?.[titleId];
    if (!Array.isArray(quickQuestions) || quickQuestions.length !== QUESTIONS_PER_TITLE) {
      throw new Error(`Tailored questions are unavailable for ${titleId}`);
    }
    const title = window.MEDIA?.[titleId]?.officialTitle || titleId;
    return questions.map((question, questionIndex) => {
      const quickQuestion = quickQuestions[questionIndex];
      return {
        ...question,
        prompt: quickQuestion.prompt,
        kicker: `Quick choice · ${questionIndex + 1} of ${QUESTIONS_PER_TITLE}`,
        options: question.options.map((option) => ({
          ...option,
          text: `${quickQuestion.options[option.role]} — ${title}, moment ${questionIndex + 1}`,
        })),
      };
    });
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

  function accountAverage() {
    return window.CharacterCheckAccount.average(state.account);
  }

  function renderAccount() {
    const profile = accountAverage();
    refs.accountTestCount.textContent = String(profile.testCount);
    if (profile.testCount === 0) {
      refs.accountStatus.textContent = "Finish a quiz, then add the result here to build your personality profile.";
    } else if (profile.testCount < 5) {
      const remaining = 5 - profile.testCount;
      refs.accountStatus.textContent = `Saved on this device. Add ${remaining} more ${remaining === 1 ? "result" : "results"} to unlock predictions.`;
    } else {
      refs.accountStatus.textContent = "Prediction unlocked. Pick any title and I can guess your match before the quiz.";
    }

    const averageFragment = document.createDocumentFragment();
    for (const role of ROLE_ORDER) {
      const percent = Math.round(profile.percentages[role]);
      const row = document.createElement("div");
      row.className = "account-average-row";
      row.innerHTML = `<span></span><span class="account-average-track"><i></i></span><b>${percent}%</b>`;
      row.firstElementChild.textContent = ROLE_META[role].label;
      const fill = row.querySelector("i");
      fill.style.setProperty("--account-width", `${percent}%`);
      fill.style.setProperty("--account-color", ROLE_META[role].color);
      averageFragment.append(row);
    }
    refs.accountAverage.replaceChildren(averageFragment);

    const savedResults = [...state.account.results]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    refs.accountHistory.hidden = savedResults.length === 0;
    const historyFragment = document.createDocumentFragment();
    savedResults.forEach((result) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "account-history-item";
      item.innerHTML = "<span></span><strong></strong><small>View quiz →</small>";
      item.querySelector("span").textContent = result.title;
      item.querySelector("strong").textContent = result.character;
      item.addEventListener("click", () => startQuiz(result.titleId));
      historyFragment.append(item);
    });
    refs.accountHistoryList.replaceChildren(historyFragment);
  }

  function scrollToAccount() {
    showHome({ push: true });
    refs.accountPanel.scrollIntoView({ behavior: prefersReducedMotion.matches ? "auto" : "smooth" });
    state.focusTimer = window.setTimeout(() => {
      state.focusTimer = null;
      refs.accountTitle.focus({ preventScroll: true });
    }, prefersReducedMotion.matches ? 0 : 420);
  }

  function resultAlreadySaved() {
    return state.account.results.some((result) => result.titleId === state.titleId);
  }

  function updateSaveResultButton() {
    const canSave = !state.resultIsPrediction && state.resultCounts && state.answers.length === QUESTIONS_PER_TITLE;
    refs.saveResultButton.hidden = !canSave;
    if (!canSave) return;
    refs.saveResultButton.disabled = state.resultSavedThisView;
    refs.saveResultButton.textContent = state.resultSavedThisView
      ? "Saved to my account ✓"
      : resultAlreadySaved()
        ? "Update my account"
        : "Add to my account";
  }

  function saveCurrentResult() {
    const title = getTitle();
    const outcome = getOutcome(title, state.resultRole);
    if (!title || !outcome || !state.resultCounts || state.resultIsPrediction) return;
    const next = window.CharacterCheckAccount.upsert(state.account, {
      titleId: title.id,
      title: title.title,
      type: title.type,
      outcomeKey: state.resultRole,
      character: outcome.character,
      counts: state.resultCounts,
    });
    if (!window.CharacterCheckAccount.persist(next)) {
      showToast("This browser could not save the result.");
      return;
    }
    state.account = next;
    state.resultSavedThisView = true;
    renderAccount();
    updateSaveResultButton();
    const testCount = state.account.results.length;
    showToast(testCount === 5 ? "Saved — predictions are now unlocked!" : "Result added to My account");
    announce(`${outcome.character} from ${title.title} was added to your account.`);
  }

  function closePredictionDialog() {
    state.pendingTitleId = null;
    if (refs.predictionDialog.open) refs.predictionDialog.close();
  }

  function offerPrediction(title) {
    state.pendingTitleId = title.id;
    refs.predictionCopy.textContent = `Your ${state.account.results.length}-test average can predict your ${title.title} match before you answer.`;
    refs.predictionDialog.showModal();
  }

  function startPendingQuiz() {
    const id = state.pendingTitleId;
    closePredictionDialog();
    if (id) startQuiz(id, { skipPrediction: true });
  }

  function showPredictedResult() {
    const id = state.pendingTitleId;
    const title = getTitle(id);
    if (!title) return closePredictionDialog();
    const outcomeKey = window.CharacterCheckAccount.predictOutcome(
      title,
      window.CHARACTER_CHECK_PROFILES,
      state.account,
    );
    if (!outcomeKey) return startPendingQuiz();
    const profile = accountAverage();
    const displayCounts = Object.fromEntries(
      ROLE_ORDER.map((role) => [role, profile.percentages[role] / 10]),
    );
    closePredictionDialog();
    state.titleId = id;
    state.answers = [];
    renderResult(outcomeKey, displayCounts, { push: true, prediction: true });
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
    const candidates = [title.poster, title.artworkFallback]
      .filter((source, index, all) => source && all.indexOf(source) === index)
      .filter((source) => source !== image.src);
    let fallbackIndex = 0;
    image.onerror = () => {
      const fallbackSource = candidates[fallbackIndex];
      fallbackIndex += 1;
      if (fallbackSource) {
        image.alt = fallbackAlt || `${title.title} promotional artwork`;
        image.src = fallbackSource;
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
    const matchesCollection =
      state.collectionFilter === "all" || title.collection === state.collectionFilter;
    return matchesSearch && matchesType && matchesGenre && matchesCollection;
  }

  function renderCatalog() {
    const matchingTitles = state.titles.filter(titleMatchesFilter);
    const visibleTitles = matchingTitles.slice(0, state.catalogLimit);
    const fragment = document.createDocumentFragment();

    for (const titleData of visibleTitles) {
      const cardTypeLabel = typeLabel(titleData.type);
      const card = document.createElement("button");
      card.type = "button";
      card.className = "show-card";
      card.setAttribute(
        "aria-label",
        `Start the ${titleData.title} ${cardTypeLabel.toLowerCase()} character quiz`,
      );
      card.addEventListener("click", () => startQuiz(titleData.id));

      const imageWrap = document.createElement("span");
      imageWrap.className = "show-card-image";
      const image = makeImage(titleData.poster, `${titleData.title} poster`);
      image.loading = "lazy";
      wireFallback(image, titleData);
      const typeBadge = document.createElement("span");
      typeBadge.className = `show-card-type ${titleData.type}`;
      typeBadge.textContent = cardTypeLabel;
      const badge = document.createElement("span");
      badge.className = "show-card-badge";
      badge.textContent = "10 questions";
      imageWrap.append(image, typeBadge, badge);

      const title = document.createElement("strong");
      title.textContent = titleData.title;
      const meta = document.createElement("small");
      const year = isNonemptyString(titleData.collectionLabel)
        ? titleData.collectionLabel
        : isNonemptyString(titleData.premiered)
        ? titleData.premiered.slice(0, 4)
        : cardTypeLabel;
      meta.textContent = `${year} · ${titleData.genres.slice(0, 2).join(" / ") || `${cardTypeLabel} quiz`}`;
      card.append(imageWrap, title, meta);
      fragment.append(card);
    }

    refs.showGrid.replaceChildren(fragment);
    refs.showGrid.hidden = matchingTitles.length === 0;
    refs.emptySearch.hidden = matchingTitles.length !== 0;
    const remaining = matchingTitles.length - visibleTitles.length;
    refs.showMoreButton.hidden = remaining <= 0;
    refs.showMoreButton.textContent = remaining > 0
      ? `Show ${Math.min(CATALOG_PAGE_SIZE, remaining)} more of ${matchingTitles.length.toLocaleString()}`
      : "All titles shown";
    const titleWord = matchingTitles.length === 1 ? "title" : "titles";
    const shownCopy = remaining > 0 ? ` · Showing ${visibleTitles.length}` : "";
    const kindCount = new Set(matchingTitles.map((title) => title.type)).size;
    refs.showCount.textContent = `${matchingTitles.length.toLocaleString()} ${titleWord} ready · ${kindCount.toLocaleString()} ${kindCount === 1 ? "category" : "categories"}${shownCopy}`;
  }

  function updateCatalogCopy() {
    const total = state.titles.length;
    const totalLabel = total.toLocaleString();
    const shows = state.titles.filter((title) => title.type === "show").length;
    const movies = state.titles.filter((title) => title.type === "movie").length;
    const kids = state.titles.filter((title) => title.type === "kids").length;
    const documentaries = state.titles.filter((title) => title.type === "documentary").length;
    const gameShows = state.titles.filter((title) => title.type === "game-show").length;
    const realityShows = state.titles.filter((title) => title.type === "reality").length;
    const otherFormats = state.titles.filter((title) => title.type === "other").length;
    refs.headerCount.textContent = `${totalLabel} ${total === 1 ? "title" : "titles"} ready`;
    refs.titleTotal.textContent = totalLabel;
    refs.titleKinds.textContent = "titles";
    refs.heroLede.textContent = "Pick a show, film, documentary, game show, reality series, kids' show, or short and answer ten title-specific questions.";
    refs.heroCollage.setAttribute(
      "aria-label",
      "Featured Character Check quizzes",
    );
    refs.showSearch.placeholder = `Search ${totalLabel} quizzes…`;
    refs.typeFilterGroup.hidden = false;

    const typeCounts = {
      show: shows,
      movie: movies,
      kids,
      documentary: documentaries,
      "game-show": gameShows,
      reality: realityShows,
      other: otherFormats,
    };
    const collectionCounts = Object.fromEntries(
      state.titles
        .map((title) => title.collection)
        .filter(Boolean)
        .map((collection) => [collection, 0]),
    );
    state.titles.forEach((title) => {
      if (title.collection) {
        collectionCounts[title.collection] = (collectionCounts[title.collection] || 0) + 1;
      }
    });
    refs.filterChips.forEach((chip) => {
      const kind = chip.dataset.filterKind;
      const value = chip.dataset.filter;
      if (value === "all" || kind === "genre") return;
      chip.hidden = kind === "type"
        ? !typeCounts[value]
        : kind === "collection" && !collectionCounts[value];
    });

    const description = `${totalLabel} show, film, documentary, game-show, reality, kids', and short-form quizzes with ten title-specific questions each.`;
    document
      .querySelectorAll(
        'meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]',
      )
      .forEach((meta) => meta.setAttribute("content", description));
  }

  function showHome({ push = true, focusLibrary = false } = {}) {
    clearAdvanceTimer();
    clearFocusTimer();
    state.titleId = null;
    state.questionIndex = 0;
    state.answers = [];
    state.resultRole = null;
    state.resultCounts = null;
    state.resultIsPrediction = false;
    state.resultSavedThisView = false;
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

  function startQuiz(id, { push = true, skipPrediction = false } = {}) {
    const title = getTitle(id);
    if (!title) return showHome({ push });
    if (!skipPrediction && state.account.results.length >= 5) {
      offerPrediction(title);
      return;
    }
    if (!Array.isArray(title.questions)) {
      title.questions = resolveTitleQuestions(title, id);
      validateTitleQuestions(title.questions, id);
    }
    clearAdvanceTimer();
    clearFocusTimer();
    state.titleId = id;
    state.questionIndex = 0;
    state.answers = [];
    state.answerLocked = false;
    state.resultRole = null;
    state.resultCounts = null;
    state.resultIsPrediction = false;
    state.resultSavedThisView = false;
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
    startQuiz(id, { push: false, skipPrediction: true });
    setUrl({ show: id }, false);
    showToast("Quiz restarted");
  }

  function preloadNextPhoto(title) {
    const nextImage = title.questions[state.questionIndex + 1]?.image;
    if (!nextImage) return;
    const preloader = new Image();
    preloader.src = nextImage.url;
  }

  function questionTextWithoutShowName(text, showName) {
    let displayText = String(text || "");
    if (!showName) return displayText;

    const promptPrefix = `${showName}: `;
    if (displayText.startsWith(promptPrefix)) {
      displayText = displayText.slice(promptPrefix.length);
    }

    return displayText.replace(` — ${showName}, `, " — ");
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
    refs.questionTitle.textContent = questionTextWithoutShowName(question.prompt, title.title);
    refs.photoLabel.textContent = `${typeLabel(title.type)} image · ${number}/${title.questions.length}`;
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
      button.querySelector(".answer-text").textContent = questionTextWithoutShowName(option.text, title.title);
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
    announce("Answer selected.");

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

  function scoreOutcomePool(title) {
    if (!Array.isArray(title?.outcomePool) || title.outcomePool.length <= ROLE_ORDER.length) {
      return null;
    }
    const answerSignature = state.answers.join("|");
    const ranked = title.outcomePool.map((key) => {
      const profile = window.CHARACTER_CHECK_PROFILES?.[key];
      const matches = profile.traits.reduce(
        (total, trait, index) => total + (trait === state.answers[index] ? 1 : 0),
        0,
      );
      return { key, matches, tieBreak: hashText(`${answerSignature}:${key}`) };
    });
    ranked.sort((left, right) => right.matches - left.matches || right.tieBreak - left.tieBreak);
    return ranked[0]?.key || null;
  }

  function finishQuiz() {
    const { role, counts, tieResolved } = scoreAnswers();
    const title = getTitle();
    renderResult(scoreOutcomePool(title) || role, counts, { push: true, tieResolved });
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
    const title = getTitle();
    const outcomes = title?.outcomePool?.length > ROLE_ORDER.length ? {} : title?.outcomes || {};
    const fragment = document.createDocumentFragment();
    for (const role of ROLE_ORDER) {
      const count = counts[role] || 0;
      const percent = Math.round((count / questionCount) * 100);
      const row = document.createElement("div");
      row.className = "mix-row";
      row.innerHTML = `
        <span></span>
        <span class="mix-track"><i></i></span>
        <span>${percent}%</span>
      `;
      row.firstElementChild.textContent = outcomes[role]?.character || ROLE_META[role].label;
      const fill = row.querySelector("i");
      fill.style.setProperty("--mix-width", `${percent}%`);
      fill.style.setProperty("--mix-color", ROLE_META[role].color);
      fragment.append(row);
    }
    refs.mixBars.replaceChildren(fragment);
  }

  function renderResult(role, counts = null, { push = true, tieResolved = false, prediction = false } = {}) {
    const title = getTitle();
    const outcome = getOutcome(title, role);
    if (!title || !outcome) return showHome({ push });
    clearAdvanceTimer();
    clearFocusTimer();
    state.resultRole = role;
    state.resultCounts = prediction || !counts ? null : { ...counts };
    state.resultIsPrediction = prediction;
    state.resultSavedThisView = false;
    state.answerLocked = false;
    setView("result");
    if (push) setUrl(prediction ? { show: title.id, prediction: role } : { show: title.id, result: role }, true);
    document.title = prediction
      ? `Prediction: ${outcome.character} — ${title.title} Character Quiz`
      : `You are ${outcome.character} — ${title.title} Character Quiz`;

    const resultImage = outcome.image || title.hero || title.poster;
    refs.resultBackdrop.style.backgroundImage = `url(${JSON.stringify(resultImage)})`;
    refs.resultPhoto.hidden = false;
    refs.resultPhoto.src = resultImage;
    refs.resultPhoto.alt = outcome.image
      ? `${outcome.character} photo`
      : `${title.title} promotional artwork`;
    wireFallback(refs.resultPhoto, title);
    refs.resultShowName.textContent = `${typeLabel(title.type).toUpperCase()} · ${title.title}`;
    refs.resultKicker.textContent = prediction ? "Your account prediction is" : "Your character match is";
    refs.resultCharacter.textContent = outcome.character;
    refs.resultActor.textContent = ["show", "movie"].includes(title.type) && outcome.actor
      ? `Played by ${outcome.actor}`
      : outcome.actor || outcome.credit || title.title;
    refs.resultLabel.textContent = outcome.label;
    refs.resultWhy.textContent = prediction
      ? `This is a prediction based on your saved quiz averages. ${outcome.why}`
      : outcome.why;
    refs.shareResultButton.hidden = prediction;
    refs.retakeButton.textContent = prediction ? "Take the real quiz" : "Retake quiz";
    renderMix(counts, tieResolved);
    if (prediction) refs.mixNote.textContent = `average of ${state.account.results.length} saved tests`;
    updateSaveResultButton();
    scrollToTop();
    announce(
      prediction
        ? `Your predicted ${title.title} match is ${outcome.character}.`
        : `Your ${title.title} character match is ${outcome.character}. ${outcome.why}`,
    );
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
    const outcome = getOutcome(title, state.resultRole);
    if (!title || !outcome) return;
    const shareTypeLabel = typeLabel(title.type).toLowerCase();
    const shareUrl = new URL(window.location.href);
    shareUrl.search = "";
    // Keep `show` so links shared by the original release remain compatible.
    shareUrl.searchParams.set("show", title.id);
    shareUrl.searchParams.set("result", state.resultRole);
    const data = {
      title: `I’m ${outcome.character} in the ${title.title} character quiz!`,
      text: `I got ${outcome.character} in the ${title.title} ${shareTypeLabel} quiz. Which character are you?`,
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
    const predictionRole = params.get("prediction");
    if (!titleId || !getTitle(titleId)) return showHome({ push: false });
    state.titleId = titleId;
    if (
      predictionRole &&
      state.account.results.length >= 5 &&
      getOutcome(getTitle(titleId), predictionRole)
    ) {
      const profile = accountAverage();
      const displayCounts = Object.fromEntries(
        ROLE_ORDER.map((role) => [role, profile.percentages[role] / 10]),
      );
      renderResult(predictionRole, displayCounts, { push: false, prediction: true });
      return;
    }
    if (resultRole && getOutcome(getTitle(titleId), resultRole)) {
      renderResult(resultRole, null, { push: false });
      return;
    }
    startQuiz(titleId, { push: false, skipPrediction: true });
  }

  function bindEvents() {
    refs.homeButton.addEventListener("click", () => showHome());
    refs.accountButton.addEventListener("click", scrollToAccount);
    refs.browseButton.addEventListener("click", () => showHome({ push: false, focusLibrary: true }));
    refs.surpriseButton.addEventListener("click", chooseRandomTitle);
    refs.emptySurpriseButton.addEventListener("click", chooseRandomTitle);
    refs.quizExitButton.addEventListener("click", () => showHome());
    refs.quizRestartButton.addEventListener("click", restartQuiz);
    refs.previousQuestionButton.addEventListener("click", previousQuestion);
    refs.saveResultButton.addEventListener("click", saveCurrentResult);
    refs.shareResultButton.addEventListener("click", shareResult);
    refs.retakeButton.addEventListener("click", restartQuiz);
    refs.anotherShowButton.addEventListener("click", () => showHome());
    refs.predictionCloseButton.addEventListener("click", closePredictionDialog);
    refs.predictionGuessButton.addEventListener("click", showPredictedResult);
    refs.predictionStartButton.addEventListener("click", startPendingQuiz);
    refs.predictionDialog.addEventListener("cancel", () => {
      state.pendingTitleId = null;
    });
    refs.showSearch.addEventListener("input", (event) => {
      state.search = event.currentTarget.value;
      state.catalogLimit = CATALOG_PAGE_SIZE;
      renderCatalog();
    });
    refs.showMoreButton.addEventListener("click", () => {
      state.catalogLimit += CATALOG_PAGE_SIZE;
      renderCatalog();
    });
    refs.filterChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        const filterKind = chip.dataset.filterKind;
        const filterValue = chip.dataset.filter || "all";
        if (filterKind === "type") state.typeFilter = filterValue;
        else if (filterKind === "genre") state.genreFilter = filterValue;
        else if (filterKind === "collection") state.collectionFilter = filterValue;
        state.catalogLimit = CATALOG_PAGE_SIZE;
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

    if (
      typeof window.CHARACTER_CHECK_DISTINCT_QUESTIONS === "function" &&
      Array.isArray(media.questionImages) &&
      media.questionImages.length === QUESTIONS_PER_TITLE
    ) {
      const generatedQuestions = window.CHARACTER_CHECK_DISTINCT_QUESTIONS(media, id);
      if (Array.isArray(generatedQuestions) && generatedQuestions.length === QUESTIONS_PER_TITLE) {
        return generatedQuestions.map((question, index) => ({
          ...question,
          options: question.options.map((option) => ({ ...option })),
          image: { ...media.questionImages[index] },
        }));
      }
    }

    if (
      media.catalogGenerated === true &&
      Array.isArray(window.FALLBACK_QUESTIONS) &&
      Array.isArray(media.questionImages) &&
      media.questionImages.length === QUESTIONS_PER_TITLE
    ) {
      return window.FALLBACK_QUESTIONS.map((question, index) => ({
        ...question,
        kicker: `${media.collectionLabel} · Quick choice ${index + 1} of ${QUESTIONS_PER_TITLE}`,
        options: question.options.map((option) => ({ ...option })),
        image: { ...media.questionImages[index] },
      }));
    }

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
      if (
        !window.MEDIA ||
        !window.OUTCOMES ||
        !window.TITLE_QUESTIONS ||
        !Array.isArray(window.FALLBACK_QUESTIONS) ||
        !window.CharacterCheckAccount
      ) {
        throw new Error("Quiz data is unavailable");
      }
      if (window.FALLBACK_QUESTIONS.length !== QUESTIONS_PER_TITLE) {
        throw new Error("Emergency questions are unavailable");
      }

      const publishedIds = new Set(window.CHARACTER_CHECK_PUBLISHED_IDS || []);
      state.titles = Object.entries(window.MEDIA)
        .filter(([id]) => publishedIds.has(id))
        .map(([id, media]) => {
        const outcomes = window.OUTCOMES[id];
        if (!isNonemptyString(media.officialTitle)) {
          throw new Error(`Missing title name: ${id}`);
        }
        // A cached first-release TVmaze entry has no `type`; it is always a show.
        const type = media.type || (media.tvmazeUrl ? "show" : "");
        if (!TYPE_META[type]) {
          throw new Error(`${id} has an unsupported quiz type`);
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
        let questions = null;
        if (Array.isArray(media.questions)) {
          questions = resolveTitleQuestions(media, id);
          validateTitleQuestions(questions, id);
        } else if (
          typeof window.CHARACTER_CHECK_DISTINCT_QUESTIONS !== "function" ||
          !Array.isArray(media.questionImages) ||
          media.questionImages.length !== QUESTIONS_PER_TITLE
        ) {
          throw new Error(`${id} cannot build its title-specific questions`);
        }
        validateOutcomes(outcomes, id);
        if (Array.isArray(media.outcomePool)) {
          if (media.outcomePool.length <= ROLE_ORDER.length) {
            throw new Error(`${id} needs more than four possible results`);
          }
          if (new Set(media.outcomePool).size !== media.outcomePool.length) {
            throw new Error(`${id} repeats a possible result`);
          }
          media.outcomePool.forEach((key) => {
            const profile = window.CHARACTER_CHECK_PROFILES?.[key];
            if (
              !profile ||
              !isNonemptyString(profile.character) ||
              !isNonemptyString(profile.image) ||
              !isNonemptyString(profile.sourceUrl) ||
              !Array.isArray(profile.traits) ||
              profile.traits.length !== QUESTIONS_PER_TITLE ||
              !profile.traits.every((role) => ROLE_ORDER.includes(role))
            ) {
              throw new Error(`${id} has an incomplete result profile: ${key}`);
            }
          });
        }
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
      const openingOrder = new Map(OPENING_TITLE_IDS.map((id, index) => [id, index]));
      state.titles.sort(
        (left, right) =>
          (openingOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
          (openingOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER),
      );
      if (state.titles.length !== PUBLISHED_TITLE_COUNT) {
        throw new Error(`Expected exactly ${PUBLISHED_TITLE_COUNT} titles`);
      }
      state.account = window.CharacterCheckAccount.load();
      updateCatalogCopy();
      renderHeroCollage();
      renderCatalog();
      renderAccount();
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
