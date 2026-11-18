function cleanText(value, maxLength = 500) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function parseNumber(value) {
  const text = cleanText(value, 80)
    .replace(/[,$°]/g, "")
    .replace(/\b(?:square|cubic)\s+(?:units?|inches?|feet|centimeters?|meters?)\b/gi, "")
    .trim();
  const fraction = text.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);
  if (fraction && Number(fraction[2]) !== 0) {
    return Number(fraction[1]) / Number(fraction[2]);
  }
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function normalizeChoice(choice, index) {
  const id = cleanText(choice?.id || String.fromCharCode(65 + index), 8).toUpperCase();
  const text = cleanText(choice?.text ?? choice, 180);
  if (!text) throw new Error("Every multiple-choice option needs text.");
  return { id, text };
}

const DIAGRAM_KINDS = new Set([
  "angle",
  "area-shape",
  "circle",
  "congruent-triangles",
  "coordinate-grid",
  "parallel-lines",
  "polygon",
  "proof-flow",
  "quadrilateral",
  "right-triangle",
  "similar-triangles",
  "solid",
  "transformation",
  "triangle",
  "triangle-center",
  "triangle-median",
  "triangle-midsegment",
]);

function normalizeDiagram(diagram, skill) {
  const kind = cleanText(diagram?.kind, 40);
  if (!DIAGRAM_KINDS.has(kind)) {
    throw new Error("A generated question has an invalid diagram kind.");
  }
  const labels = Array.isArray(diagram?.labels)
    ? diagram.labels.slice(0, 4).map((label) => cleanText(label, 24)).filter(Boolean)
    : [];
  return {
    kind,
    labels,
    variant: Math.max(0, Math.min(3, Math.trunc(Number(diagram?.variant) || 0))),
    alt: cleanText(diagram?.alt, 180) || `${skill} geometry diagram`,
    caption: cleanText(diagram?.caption, 120) || "Diagram not to scale.",
  };
}

function normalizeQuestion(question, index) {
  const prompt = cleanText(question?.prompt, 420);
  const skill = cleanText(question?.skill, 100);
  const explanation = cleanText(question?.explanation, 700);
  const hint = cleanText(question?.hint, 240);
  const type = question?.type === "number" ? "number" : "multiple-choice";
  if (!prompt || !skill || !explanation) {
    throw new Error("A generated question is missing its prompt, skill, or explanation.");
  }
  const diagram = normalizeDiagram(question?.diagram, skill);

  if (type === "number") {
    const correctAnswer = Number(question.correctAnswer);
    if (!Number.isFinite(correctAnswer)) throw new Error("A number question has an invalid answer.");
    const tolerance = Number.isFinite(Number(question.tolerance))
      ? Math.min(0.1, Math.max(0, Math.abs(Number(question.tolerance))))
      : 0.001;
    return {
      id: `q${index + 1}`,
      type,
      prompt,
      skill,
      hint,
      explanation,
      diagram,
      correctAnswer,
      tolerance,
      answerLabel: cleanText(question.answerLabel, 60) || String(correctAnswer),
    };
  }

  if (!Array.isArray(question?.choices) || question.choices.length !== 4) {
    throw new Error("Every multiple-choice question needs exactly four options.");
  }
  const choices = question.choices.map(normalizeChoice);
  if (new Set(choices.map((choice) => choice.id)).size !== 4) {
    throw new Error("Multiple-choice option IDs must be unique.");
  }
  const rawAnswer = cleanText(question.correctAnswer, 180);
  const matchingChoice = choices.find((choice) => (
    choice.id.toLowerCase() === rawAnswer.toLowerCase()
    || choice.text.toLowerCase() === rawAnswer.toLowerCase()
  ));
  if (!matchingChoice) throw new Error("A multiple-choice answer does not match an option.");

  return {
    id: `q${index + 1}`,
    type,
    prompt,
    skill,
    hint,
    explanation,
    diagram,
    choices,
    correctAnswer: matchingChoice.id,
    answerLabel: matchingChoice.text,
  };
}

export function parseGeneratedSet(raw, expectedCount) {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!Array.isArray(parsed?.questions) || parsed.questions.length !== expectedCount) {
    throw new Error(`Expected exactly ${expectedCount} questions.`);
  }
  const questions = parsed.questions.map(normalizeQuestion);
  if (new Set(questions.map((question) => question.prompt.toLowerCase())).size !== questions.length) {
    throw new Error("Generated questions must be distinct.");
  }
  return questions;
}

export function publicQuestion(question) {
  const result = {
    id: question.id,
    type: question.type,
    prompt: question.prompt,
    skill: question.skill,
    hint: question.hint,
    diagram: {
      ...question.diagram,
      labels: [...question.diagram.labels],
    },
  };
  if (question.type === "multiple-choice") result.choices = question.choices.map((choice) => ({ ...choice }));
  return result;
}

export function gradeQuestion(question, submittedAnswer) {
  if (question.type === "number") {
    const submitted = parseNumber(submittedAnswer);
    const correct = submitted !== null && Math.abs(submitted - question.correctAnswer) <= question.tolerance;
    return { correct, submitted: submittedAnswer, expected: question.answerLabel };
  }
  const submitted = cleanText(submittedAnswer, 180);
  const selected = question.choices.find((choice) => (
    choice.id.toLowerCase() === submitted.toLowerCase()
    || choice.text.toLowerCase() === submitted.toLowerCase()
  ));
  return {
    correct: Boolean(selected && selected.id === question.correctAnswer),
    submitted,
    expected: question.answerLabel,
  };
}

export function scoreSubmission(questions, answers = {}) {
  const results = questions.map((question) => {
    const grade = gradeQuestion(question, answers[question.id]);
    return {
      id: question.id,
      skill: question.skill,
      correct: grade.correct,
      submitted: grade.submitted ?? "",
      expected: grade.expected,
      explanation: question.explanation,
    };
  });
  const score = results.filter((result) => result.correct).length;
  const percent = Math.round((score / Math.max(1, questions.length)) * 100);
  const mastery = percent >= 90 ? "Locked in" : percent >= 75 ? "Almost there" : percent >= 55 ? "Building" : "Keep practicing";
  return { score, total: questions.length, percent, mastery, results };
}
