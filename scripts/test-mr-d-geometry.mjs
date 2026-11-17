import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  COURSE_UNITS,
  getDailyPlan,
  isInstructionalDay,
} from "../math/curriculum.js";
import {
  parseGeneratedSet,
  publicQuestion,
  scoreSubmission,
} from "../math/question-core.js";
import { buildControlledQuestionSet } from "../math/question-bank.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

assert.equal(COURSE_UNITS.length, 15, "full course and final-review schedule should be present");
assert.ok(COURSE_UNITS.every((unit) => unit.sourceUrl.includes("teachers.mpcsd.org/mdoroquez/pages/Geo.htm")));

const today = getDailyPlan("2026-11-16");
assert.equal(today.unitId, "chapter-4");
assert.equal(today.daysUntilTest, 4);
assert.equal(today.mode, "lesson");
assert.match(today.topic, /Triangle|Congruent|Isosceles/i);

const reviewDay = getDailyPlan("2026-11-17");
assert.equal(reviewDay.mode, "review");
assert.equal(reviewDay.daysUntilTest, 3);
assert.match(reviewDay.topic, /Mixed Congruent Triangles review/);

const testDay = getDailyPlan("2026-11-20");
assert.equal(testDay.mode, "test-day");
assert.equal(testDay.daysUntilTest, 0);

const thanksgiving = getDailyPlan("2026-11-25");
assert.equal(thanksgiving.mode, "break");
assert.equal(thanksgiving.isInstructionalDay, false);
assert.equal(isInstructionalDay("2026-09-07"), false);
assert.equal(isInstructionalDay("2026-09-08"), true);

const sampleQuestions = parseGeneratedSet({
  questions: [
    {
      type: "multiple-choice",
      prompt: "Which theorem proves two triangles congruent when all three corresponding sides match?",
      skill: "Congruence theorems",
      hint: "Count the side pairs.",
      choices: [
        { id: "A", text: "AAA" },
        { id: "B", text: "SSS" },
        { id: "C", text: "SSA" },
        { id: "D", text: "AA" },
      ],
      correctAnswer: "B",
      explanation: "SSS uses three pairs of congruent corresponding sides.",
    },
    {
      type: "number",
      prompt: "A right triangle has legs 3 and 4. What is its area?",
      skill: "Triangle area",
      hint: "Use one half times base times height.",
      correctAnswer: 6,
      tolerance: 0,
      answerLabel: "6 square units",
      explanation: "One half times 3 times 4 is 6.",
    },
  ],
}, 2);

const safeQuestion = publicQuestion(sampleQuestions[0]);
assert.equal("correctAnswer" in safeQuestion, false, "answers must stay server-side");
assert.equal("explanation" in safeQuestion, false, "solutions must stay server-side until grading");

const perfect = scoreSubmission(sampleQuestions, { q1: "B", q2: "6" });
assert.equal(perfect.percent, 100);
assert.equal(perfect.mastery, "Locked in");

const fractionQuestions = parseGeneratedSet({
  questions: [{
    type: "number",
    prompt: "What is one half as a decimal?",
    skill: "Number sense",
    hint: "Divide the numerator by the denominator.",
    correctAnswer: 0.5,
    tolerance: 0,
    explanation: "One divided by two is 0.5.",
  }],
}, 1);
assert.equal(scoreSubmission(fractionQuestions, { q1: "1/2" }).percent, 100);

let generatedQuestionChecks = 0;
for (const unit of COURSE_UNITS) {
  for (let level = 1; level <= 4; level += 1) {
    const generated = buildControlledQuestionSet(unit, level, 10, 41000 + level);
    const normalized = parseGeneratedSet({ questions: generated }, 10);
    assert.equal(normalized.length, 10);
    assert.equal(new Set(normalized.map((question) => question.prompt)).size, 10);
    generatedQuestionChecks += normalized.length;
  }
}
assert.equal(generatedQuestionChecks, 600, "every course unit and level should produce a full distinct test");

const html = fs.readFileSync(path.join(root, "math/index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "math/app.js"), "utf8");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
assert.match(html, /2026-11-16-math-1/);
assert.equal((html.match(/data-level="[1-4]"/g) || []).length, 4);
assert.match(html, /10-question practice test/);
assert.match(app, /\/api\/mr-d-geometry\/generate/);
assert.match(app, /\/api\/mr-d-geometry\/grade/);
assert.match(server, /app\.get\("\/api\/mr-d-geometry\/today"/);
assert.match(server, /app\.post\("\/api\/mr-d-geometry\/generate"/);
assert.match(server, /app\.post\("\/api\/mr-d-geometry\/grade"/);

console.log("Mr. D Math Coach checks passed: schedule, review mode, 600 generated questions, safe answers, and grading.");
