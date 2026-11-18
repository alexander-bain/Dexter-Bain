import { getDailyPlan } from "./curriculum.js";

const RELEASE = "2026-11-17-math-2";
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

const SVG_NS = "http://www.w3.org/2000/svg";

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
  return element;
}

function diagramLine(svg, x1, y1, x2, y2, className = "diagram-line") {
  svg.append(svgElement("line", { x1, y1, x2, y2, class: className }));
}

function diagramPath(svg, d, className = "diagram-line") {
  svg.append(svgElement("path", { d, class: className }));
}

function diagramText(svg, x, y, value, className = "diagram-text") {
  const label = svgElement("text", { x, y, class: className });
  label.textContent = value;
  svg.append(label);
}

function diagramCircle(svg, cx, cy, r, className = "diagram-point") {
  svg.append(svgElement("circle", { cx, cy, r, class: className }));
}

function renderQuestionDiagram(diagram) {
  diagram ||= {
    kind: "proof-flow",
    labels: [],
    alt: "Geometry reasoning diagram",
    caption: "Diagram not to scale.",
  };
  const figure = document.createElement("figure");
  figure.className = "question-diagram";
  const svg = svgElement("svg", {
    viewBox: "0 0 320 190",
    role: "img",
    "aria-label": diagram.alt,
    preserveAspectRatio: "xMidYMid meet",
  });
  const labels = diagram.labels || [];
  const value = (index, fallback) => labels[index] || fallback;

  if (diagram.kind === "triangle" || diagram.kind === "triangle-midsegment" || diagram.kind === "triangle-median" || diagram.kind === "triangle-center") {
    diagramPath(svg, "M160 20 L42 160 L280 160 Z");
    diagramText(svg, 153, 15, "A");
    diagramText(svg, 28, 177, "B");
    diagramText(svg, 286, 177, "C");
    if (diagram.kind === "triangle-midsegment") {
      diagramLine(svg, 101, 90, 220, 90, "diagram-accent");
      diagramCircle(svg, 101, 90, 4);
      diagramCircle(svg, 220, 90, 4);
      diagramText(svg, 86, 84, "D");
      diagramText(svg, 225, 84, "E");
      diagramText(svg, 148, 82, value(0, "DE"), "diagram-value");
      diagramText(svg, 146, 178, value(1, "BC"), "diagram-value");
      diagramText(svg, 232, 47, "DE ∥ BC", "diagram-note");
    } else if (diagram.kind === "triangle-median") {
      diagramLine(svg, 160, 20, 161, 160, "diagram-accent");
      diagramCircle(svg, 161, 112, 5, "diagram-center");
      diagramText(svg, 169, 110, "G", "diagram-value");
      diagramLine(svg, 151, 154, 151, 166, "diagram-tick");
      diagramLine(svg, 171, 154, 171, 166, "diagram-tick");
      diagramText(svg, 177, 138, value(0, "2:1"), "diagram-note");
    } else if (diagram.kind === "triangle-center") {
      diagramLine(svg, 42, 160, 220, 90, "diagram-guide");
      diagramLine(svg, 280, 160, 101, 90, "diagram-guide");
      diagramLine(svg, 160, 20, 161, 160, "diagram-guide");
      diagramCircle(svg, 160, 104, 6, "diagram-center");
      diagramText(svg, 170, 100, "P", "diagram-value");
      svg.append(svgElement("circle", { cx: 160, cy: 104, r: 78, class: "diagram-orbit" }));
    } else {
      diagramText(svg, 84, 104, value(0, "a"), "diagram-value");
      diagramText(svg, 225, 104, value(1, "b"), "diagram-value");
      diagramText(svg, 153, 180, value(2, "c"), "diagram-value");
      diagramPath(svg, "M56 154 A20 20 0 0 1 67 135", "diagram-arc");
    }
  } else if (diagram.kind === "congruent-triangles" || diagram.kind === "similar-triangles") {
    diagramPath(svg, "M22 150 L92 35 L145 150 Z");
    const second = diagram.kind === "congruent-triangles" ? "M175 150 L245 35 L298 150 Z" : "M190 150 L238 70 L278 150 Z";
    diagramPath(svg, second, "diagram-accent");
    diagramText(svg, 54, 99, value(0, "A"), "diagram-value");
    diagramText(svg, 244, 105, value(1, diagram.kind === "congruent-triangles" ? "D" : "k"), "diagram-value");
    diagramText(svg, 147, 100, diagram.kind === "congruent-triangles" ? "≅" : "∼", "diagram-symbol");
    diagramLine(svg, 52, 82, 61, 89, "diagram-tick");
    diagramLine(svg, 224, 87, 233, 94, "diagram-tick");
  } else if (diagram.kind === "right-triangle") {
    diagramPath(svg, "M48 158 L48 38 L276 158 Z");
    diagramPath(svg, "M48 140 L66 140 L66 158", "diagram-accent");
    diagramText(svg, 22, 102, value(0, "a"), "diagram-value");
    diagramText(svg, 151, 178, value(1, "b"), "diagram-value");
    diagramText(svg, 166, 92, value(2, "c"), "diagram-value");
    diagramPath(svg, "M240 158 A36 36 0 0 0 231 135", "diagram-arc");
  } else if (diagram.kind === "parallel-lines") {
    diagramLine(svg, 30, 52, 292, 52);
    diagramLine(svg, 30, 138, 292, 138);
    diagramLine(svg, 92, 12, 224, 178, "diagram-accent");
    diagramPath(svg, "M111 52 A24 24 0 0 1 125 70", "diagram-arc");
    diagramPath(svg, "M179 121 A24 24 0 0 1 194 138", "diagram-arc");
    diagramText(svg, 54, 42, "ℓ");
    diagramText(svg, 264, 128, "m");
    diagramText(svg, 124, 43, value(0, "∠1"), "diagram-value");
    diagramText(svg, 193, 164, value(1, "∠2"), "diagram-value");
  } else if (diagram.kind === "coordinate-grid" || diagram.kind === "transformation") {
    for (let x = 40; x <= 280; x += 30) diagramLine(svg, x, 18, x, 174, "diagram-grid");
    for (let y = 24; y <= 174; y += 30) diagramLine(svg, 30, y, 292, y, "diagram-grid");
    diagramLine(svg, 30, 99, 294, 99, "diagram-axis");
    diagramLine(svg, 160, 12, 160, 178, "diagram-axis");
    if (diagram.kind === "transformation") {
      diagramPath(svg, "M70 129 L100 69 L130 129 Z", "diagram-fill-one");
      diagramPath(svg, "M190 69 L220 129 L250 69 Z", "diagram-fill-two");
      diagramLine(svg, 138, 98, 181, 98, "diagram-accent");
      diagramText(svg, 142, 87, "→", "diagram-symbol");
    } else {
      diagramLine(svg, 66, 150, 262, 42, "diagram-accent");
      diagramCircle(svg, 96, 134, 5, "diagram-center");
      diagramCircle(svg, 232, 59, 5, "diagram-center");
      diagramText(svg, 70, 127, value(0, "A"), "diagram-value");
      diagramText(svg, 238, 53, value(1, "B"), "diagram-value");
    }
  } else if (diagram.kind === "circle") {
    svg.append(svgElement("circle", { cx: 158, cy: 96, r: 70, class: "diagram-line" }));
    diagramCircle(svg, 158, 96, 5, "diagram-center");
    diagramLine(svg, 158, 96, 220, 63, "diagram-accent");
    diagramLine(svg, 72, 145, 264, 145, "diagram-guide");
    diagramLine(svg, 94, 48, 236, 137, "diagram-guide");
    diagramText(svg, 164, 92, "O", "diagram-value");
    diagramText(svg, 189, 70, value(0, "r"), "diagram-value");
    diagramText(svg, 238, 137, value(1, "tangent"), "diagram-note");
  } else if (diagram.kind === "solid") {
    diagramPath(svg, "M72 56 L204 56 L260 92 L127 92 Z");
    diagramPath(svg, "M72 56 L72 145 L127 177 L127 92 Z");
    diagramPath(svg, "M127 92 L260 92 L260 145 L127 177 Z", "diagram-accent");
    diagramLine(svg, 72, 145, 204, 145, "diagram-guide");
    diagramLine(svg, 204, 56, 204, 145, "diagram-guide");
    diagramLine(svg, 204, 145, 260, 145, "diagram-guide");
    diagramText(svg, 89, 118, value(0, "h"), "diagram-value");
    diagramText(svg, 169, 171, value(1, "ℓ"), "diagram-value");
    diagramText(svg, 229, 80, value(2, "w"), "diagram-value");
  } else if (diagram.kind === "proof-flow") {
    const boxes = [[18, 62, 82, 56, "Given"], [119, 62, 82, 56, "Rule"], [220, 62, 82, 56, "Conclusion"]];
    boxes.forEach(([x, y, width, height, label], index) => {
      svg.append(svgElement("rect", { x, y, width, height, rx: 12, class: index === 2 ? "diagram-box-accent" : "diagram-box" }));
      diagramText(svg, x + width / 2, y + 34, label, "diagram-box-text");
    });
    diagramText(svg, 99, 98, "→", "diagram-symbol");
    diagramText(svg, 200, 98, "→", "diagram-symbol");
    diagramText(svg, 160, 145, value(0, "why?"), "diagram-note");
  } else if (diagram.kind === "angle") {
    diagramLine(svg, 54, 148, 166, 94);
    diagramLine(svg, 166, 94, 286, 150);
    diagramLine(svg, 166, 94, 168, 20, "diagram-accent");
    diagramPath(svg, "M125 113 A46 46 0 0 1 207 113", "diagram-arc");
    diagramText(svg, 151, 74, value(0, "x°"), "diagram-value");
  } else if (diagram.kind === "polygon") {
    diagramPath(svg, "M160 20 L284 89 L236 169 L84 169 L36 89 Z");
    diagramLine(svg, 160, 20, 84, 169, "diagram-guide");
    diagramLine(svg, 160, 20, 236, 169, "diagram-guide");
    diagramText(svg, 149, 107, value(0, "n"), "diagram-value");
  } else if (diagram.kind === "quadrilateral" || diagram.kind === "area-shape") {
    diagramPath(svg, diagram.kind === "quadrilateral" ? "M66 42 L250 42 L280 154 L38 154 Z" : "M96 38 L275 38 L226 156 L46 156 Z");
    diagramLine(svg, 96, 38, 96, 156, "diagram-guide");
    diagramPath(svg, "M96 140 L112 140 L112 156", "diagram-accent");
    diagramText(svg, 60, 102, value(0, "h"), "diagram-value");
    diagramText(svg, 145, 177, value(1, "b"), "diagram-value");
    if (diagram.kind === "quadrilateral") {
      diagramLine(svg, 66, 42, 280, 154, "diagram-guide");
      diagramLine(svg, 250, 42, 38, 154, "diagram-guide");
    }
  }

  const caption = document.createElement("figcaption");
  caption.textContent = diagram.caption;
  figure.append(svg, caption);
  return figure;
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
    card.append(top, heading, renderQuestionDiagram(question.diagram), answerInput(question, index));
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
