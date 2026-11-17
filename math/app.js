import { getDailyPlan } from "./curriculum.js";

const RELEASE = "2026-11-16-math-1";
const DEFAULT_API_BASE = "https://dexter-bain.onrender.com";
const params = new URLSearchParams(window.location.search);
const localDefault = `${window.location.protocol}//${window.location.hostname}:8787`;
const API_BASE = (params.get("api") || (/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname) ? localDefault : DEFAULT_API_BASE)).replace(/\/$/, "");
const HISTORY_KEY = "mr-d-math-scores-v1";

const elements = {
  apiPill: document.querySelector("#apiPill"),
  apiLabel: document.querySelector("#apiLabel"),
  todayDate: document.querySelector("#todayDate"),
  courseYear: document.querySelector("#courseYear"),
  planBadge: document.querySelector("#planBadge"),
  testCountdown: document.querySelector("#testCountdown"),
  planMessage: document.querySelector("#planMessage"),
  unitName: document.querySelector("#unitName"),
  todayTopic: document.querySelector("#todayTopic"),
  goalList: document.querySelector("#goalList"),
  reviewAlert: document.querySelector("#reviewAlert"),
  levelCards: [...document.querySelectorAll(".level-card")],
  practiceButton: document.querySelector("#practiceButton"),
  testButton: document.querySelector("#testButton"),
  formMessage: document.querySelector("#formMessage"),
  loadingCard: document.querySelector("#loadingCard"),
  loadingMessage: document.querySelector("#loadingMessage"),
  quizSection: document.querySelector("#quizSection"),
  quizKicker: document.querySelector("#quizKicker"),
  quizTitle: document.querySelector("#quizTitle"),
  quizForm: document.querySelector("#quizForm"),
  questionList: document.querySelector("#questionList"),
  progressLabel: document.querySelector("#progressLabel"),
  progressBar: document.querySelector("#progressBar"),
  resultsSection: document.querySelector("#resultsSection"),
  scorePercent: document.querySelector("#scorePercent"),
  scoreFraction: document.querySelector("#scoreFraction"),
  masteryLine: document.querySelector("#masteryLine"),
  answerReview: document.querySelector("#answerReview"),
  tryAgainButton: document.querySelector("#tryAgainButton"),
  reviewAnswersButton: document.querySelector("#reviewAnswersButton"),
  historyList: document.querySelector("#historyList"),
};

let selectedLevel = 1;
let currentPlan = getDailyPlan(new Date());
let currentSession = null;
let lastMode = "practice";

function formatDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function setConnection(state, label) {
  elements.apiPill.classList.toggle("is-online", state === "online");
  elements.apiPill.classList.toggle("is-offline", state === "offline");
  elements.apiLabel.textContent = label;
}

function renderPlan(plan) {
  currentPlan = plan;
  elements.todayDate.textContent = formatDate(plan.date);
  elements.courseYear.textContent = `${plan.courseYear} pacing`;
  elements.planBadge.textContent = plan.badge;
  elements.planMessage.textContent = plan.message;
  elements.unitName.textContent = plan.mode === "break" ? plan.unitTitle : `Chapter ${plan.unitNumber} · ${plan.unitTitle}`;
  elements.todayTopic.textContent = plan.topic;
  elements.goalList.replaceChildren(...plan.goals.slice(0, 3).map((goal) => {
    const item = document.createElement("li");
    item.textContent = goal;
    return item;
  }));
  const closeTest = Number.isFinite(plan.daysUntilTest) && plan.daysUntilTest >= 0 && plan.daysUntilTest <= 7;
  elements.testCountdown.textContent = closeTest
    ? plan.daysUntilTest === 0
      ? "Chapter test today"
      : `${plan.daysUntilTest} day${plan.daysUntilTest === 1 ? "" : "s"} until the test`
    : "";
  elements.reviewAlert.hidden = !["review", "test-day"].includes(plan.mode);
}

async function syncToday() {
  renderPlan(currentPlan);
  try {
    const response = await fetch(`${API_BASE}/api/mr-d-geometry/today`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Today endpoint unavailable");
    const payload = await response.json();
    if (payload?.plan) renderPlan(payload.plan);
    setConnection("online", "AI practice ready");
  } catch {
    setConnection("offline", "Daily plan ready · AI waking up");
  }
}

function chooseLevel(level) {
  selectedLevel = level;
  elements.levelCards.forEach((card) => {
    const selected = Number(card.dataset.level) === level;
    card.classList.toggle("is-selected", selected);
    card.setAttribute("aria-checked", String(selected));
  });
}

function setBusy(busy) {
  elements.practiceButton.disabled = busy;
  elements.testButton.disabled = busy;
  elements.loadingCard.hidden = !busy;
}

const loadingLines = [
  "Drawing clean diagrams in our head…",
  "Checking every angle twice…",
  "Making distractors tricky, not unfair…",
  "Matching the questions to today…",
  "Sharpening the compass…",
];

async function generateSet(mode) {
  lastMode = mode;
  elements.formMessage.textContent = "";
  elements.quizSection.hidden = true;
  elements.resultsSection.hidden = true;
  elements.loadingMessage.textContent = loadingLines[Math.floor(Math.random() * loadingLines.length)];
  setBusy(true);

  try {
    const response = await fetch(`${API_BASE}/api/mr-d-geometry/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ level: selectedLevel, mode }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "The practice generator could not make this set.");
    currentSession = payload;
    if (payload.plan) renderPlan(payload.plan);
    renderQuiz(payload);
    setConnection("online", "AI practice ready");
    elements.quizSection.hidden = false;
    elements.quizSection.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    setConnection("offline", "AI practice unavailable");
    elements.formMessage.textContent = `${error.message} Please try again in a moment.`;
  } finally {
    setBusy(false);
  }
}

function answerInput(question, index) {
  if (question.type === "number") {
    const input = document.createElement("input");
    input.className = "number-answer";
    input.type = "text";
    input.inputMode = "decimal";
    input.autocomplete = "off";
    input.name = question.id;
    input.placeholder = "Type a number (fractions work too)";
    input.setAttribute("aria-label", `Answer for question ${index + 1}`);
    return input;
  }

  const list = document.createElement("div");
  list.className = "choice-list";
  question.choices.forEach((choice) => {
    const label = document.createElement("label");
    label.className = "choice";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = question.id;
    input.value = choice.id;
    const marker = document.createElement("span");
    marker.className = "choice-marker";
    marker.textContent = choice.id;
    const text = document.createElement("span");
    text.textContent = choice.text;
    label.append(input, marker, text);
    list.append(label);
  });
  return list;
}

function renderQuiz(payload) {
  elements.quizKicker.textContent = `Level ${payload.level} · ${payload.mode === "test" ? "Practice test" : "Practice"}`;
  elements.quizTitle.textContent = payload.plan?.topic || currentPlan.topic;
  elements.questionList.replaceChildren(...payload.questions.map((question, index) => {
    const card = document.createElement("article");
    card.className = "question-card";
    const top = document.createElement("div");
    top.className = "question-top";
    const number = document.createElement("span");
    number.className = "question-number";
    number.textContent = `Question ${index + 1}`;
    const skill = document.createElement("span");
    skill.className = "skill-chip";
    skill.textContent = question.skill;
    top.append(number, skill);
    const heading = document.createElement("h3");
    heading.textContent = question.prompt;
    card.append(top, heading, answerInput(question, index));
    if (question.hint) {
      const details = document.createElement("details");
      details.className = "hint-details";
      const summary = document.createElement("summary");
      summary.textContent = "Need a hint?";
      const hint = document.createElement("p");
      hint.textContent = question.hint;
      details.append(summary, hint);
      card.append(details);
    }
    return card;
  }));
  updateProgress();
}

function collectAnswers() {
  const answers = {};
  currentSession.questions.forEach((question) => {
    const checked = elements.quizForm.querySelector(`[name="${question.id}"]:checked`);
    const text = elements.quizForm.querySelector(`input[type="text"][name="${question.id}"]`);
    answers[question.id] = checked?.value ?? text?.value.trim() ?? "";
  });
  return answers;
}

function updateProgress() {
  if (!currentSession?.questions) return;
  const answers = collectAnswers();
  const answered = Object.values(answers).filter(Boolean).length;
  const total = currentSession.questions.length;
  elements.progressLabel.textContent = `${answered} of ${total} answered`;
  elements.progressBar.style.width = `${Math.round((answered / total) * 100)}%`;
}

async function gradeSet(event) {
  event.preventDefault();
  if (!currentSession?.sessionId) return;
  const submit = elements.quizForm.querySelector("button[type=submit]");
  submit.disabled = true;
  submit.textContent = "Grading…";
  elements.formMessage.textContent = "";

  try {
    const response = await fetch(`${API_BASE}/api/mr-d-geometry/grade`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ sessionId: currentSession.sessionId, answers: collectAnswers() }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Your set could not be graded.");
    renderResults(result);
    saveScore(result);
    elements.quizSection.hidden = true;
    elements.resultsSection.hidden = false;
    elements.resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    elements.formMessage.textContent = `${error.message} Your answers are still here.`;
  } finally {
    submit.disabled = false;
    submit.innerHTML = "Grade my answers <span aria-hidden=\"true\">✓</span>";
  }
}

function renderResults(result) {
  elements.scorePercent.textContent = `${result.percent}%`;
  elements.scoreFraction.textContent = `${result.score} / ${result.total}`;
  const messages = {
    "Locked in": "Locked in. You’re ready to explain the math, not just do it.",
    "Almost there": "Almost there. Fix the misses below and take one more short set.",
    Building: "You’re building it. Review the explanations, then try one level lower or repeat this level.",
    "Keep practicing": "Start with the explanations, then use Level 1 or 2 to rebuild the foundation.",
  };
  elements.masteryLine.textContent = messages[result.mastery] || result.mastery;
  elements.answerReview.replaceChildren(...result.results.map((answer, index) => {
    const row = document.createElement("article");
    row.className = `answer-row${answer.correct ? "" : " is-wrong"}`;
    const heading = document.createElement("h3");
    const status = document.createElement("span");
    status.className = "answer-status";
    status.textContent = answer.correct ? "✓ Correct" : "✕ Check this";
    heading.append(status, document.createTextNode(` · Question ${index + 1} · ${answer.skill}`));
    const expected = document.createElement("p");
    expected.innerHTML = `<strong>Answer:</strong> ${escapeHtml(answer.expected)}`;
    const explanation = document.createElement("p");
    explanation.textContent = answer.explanation;
    row.append(heading, expected, explanation);
    return row;
  }));
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value);
  return div.innerHTML;
}

function readHistory() {
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(history) ? history.slice(0, 8) : [];
  } catch {
    return [];
  }
}

function saveScore(result) {
  const history = readHistory();
  history.unshift({
    date: new Date().toISOString(),
    unit: currentPlan.unitTitle,
    level: selectedLevel,
    mode: lastMode,
    percent: result.percent,
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 8)));
  renderHistory();
}

function renderHistory() {
  const history = readHistory();
  if (!history.length) {
    elements.historyList.innerHTML = '<p class="empty-history">Your first score will appear here.</p>';
    return;
  }
  elements.historyList.replaceChildren(...history.map((entry) => {
    const row = document.createElement("div");
    row.className = "history-entry";
    const copy = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = entry.unit;
    const date = document.createElement("small");
    date.textContent = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(entry.date));
    copy.append(title, date);
    const level = document.createElement("span");
    level.className = "history-level";
    level.textContent = `Level ${entry.level} · ${entry.mode === "test" ? "Test" : "Practice"}`;
    const score = document.createElement("span");
    score.className = "history-score";
    score.textContent = `${entry.percent}%`;
    row.append(copy, level, score);
    return row;
  }));
}

elements.levelCards.forEach((card) => card.addEventListener("click", () => chooseLevel(Number(card.dataset.level))));
elements.practiceButton.addEventListener("click", () => generateSet("practice"));
elements.testButton.addEventListener("click", () => generateSet("test"));
elements.quizForm.addEventListener("input", updateProgress);
elements.quizForm.addEventListener("change", updateProgress);
elements.quizForm.addEventListener("submit", gradeSet);
elements.tryAgainButton.addEventListener("click", () => {
  elements.resultsSection.hidden = true;
  document.querySelector("#practiceLab").scrollIntoView({ behavior: "smooth", block: "start" });
});
elements.reviewAnswersButton.addEventListener("click", () => elements.answerReview.scrollIntoView({ behavior: "smooth", block: "start" }));

document.documentElement.dataset.release = RELEASE;
renderHistory();
syncToday();
