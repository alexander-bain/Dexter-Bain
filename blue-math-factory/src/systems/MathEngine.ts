import { BALANCE } from "../data/balance";
import type { MathQuestion, MathStats } from "../types";

const RANGE_BY_STREAK = [
  [1, 3],
  [1, 4],
  [2, 5],
  [3, 7],
  [4, 8],
  [5, 9],
  [1, 10]
] as const;

export const createEmptyMathStats = (): MathStats => ({
  answered: 0,
  correct: 0,
  bestStreak: 0,
  fastestMs: null,
  facts: {},
  recentFacts: []
});

const randomInt = (min: number, max: number, random = Math.random) => Math.floor(random() * (max - min + 1)) + min;
const shuffled = <T>(items: T[], random = Math.random): T[] => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
};

export class MathEngine {
  constructor(private readonly stats: MathStats, private readonly random = Math.random) {}

  static factKey(a: number, b: number): string {
    return `${Math.min(a, b)}x${Math.max(a, b)}`;
  }

  createQuestion(streak: number): MathQuestion {
    const step = Math.min(streak, 6);
    const [min, max] = RANGE_BY_STREAK[step];
    let a = randomInt(min, max, this.random);
    let b = randomInt(min, max, this.random);

    const missed = Object.entries(this.stats.facts)
      .filter(([, stat]) => stat.misses > 0 && stat.correct / Math.max(1, stat.seen) < 0.72)
      .sort((left, right) => right[1].misses - left[1].misses);

    if (missed.length && this.random() < 0.28) {
      const [left, right] = missed[Math.floor(this.random() * Math.min(missed.length, 5))][0].split("x").map(Number);
      if (left >= min && right <= max) [a, b] = this.random() < 0.5 ? [left, right] : [right, left];
    }

    let attempts = 0;
    while (this.stats.recentFacts.includes(`${a}x${b}`) && attempts < 12) {
      a = randomInt(min, max, this.random);
      b = randomInt(min, max, this.random);
      attempts += 1;
    }

    const answer = a * b;
    const choices = this.makeChoices(answer, a, b);
    const labels = ["Warm-up", "Growing", "Steady", "Tricky", "Expert", "Turbo", "Berry Legend"];
    return {
      a,
      b,
      answer,
      choices,
      key: MathEngine.factKey(a, b),
      duration: BALANCE.timerSteps[step],
      reward: BALANCE.rewardSteps[step],
      difficultyLabel: labels[step]
    };
  }

  record(question: MathQuestion, correct: boolean, responseMs: number, resultingStreak: number): void {
    const fact = this.stats.facts[question.key] ?? { seen: 0, correct: 0, misses: 0, recent: 0 };
    fact.seen += 1;
    fact.recent = Date.now();
    if (correct) fact.correct += 1;
    else fact.misses += 1;
    this.stats.facts[question.key] = fact;
    this.stats.answered += 1;
    if (correct) {
      this.stats.correct += 1;
      this.stats.bestStreak = Math.max(this.stats.bestStreak, resultingStreak);
      this.stats.fastestMs = this.stats.fastestMs === null ? responseMs : Math.min(this.stats.fastestMs, responseMs);
    }
    this.stats.recentFacts.unshift(`${question.a}x${question.b}`);
    this.stats.recentFacts = this.stats.recentFacts.slice(0, 7);
  }

  private makeChoices(answer: number, a: number, b: number): number[] {
    const options = new Set<number>([answer]);
    const candidates = [
      a * Math.max(1, b - 1),
      a * Math.min(10, b + 1),
      Math.max(1, answer - a),
      Math.min(100, answer + b),
      Math.max(1, answer - randomInt(1, 8, this.random)),
      Math.min(100, answer + randomInt(1, 8, this.random)),
      randomInt(Math.max(1, answer - 12), Math.min(100, answer + 12), this.random)
    ];
    for (const candidate of shuffled(candidates, this.random)) {
      if (candidate >= 1 && candidate <= 100) options.add(candidate);
      if (options.size === 4) break;
    }
    while (options.size < 4) options.add(randomInt(1, 100, this.random));
    return shuffled([...options], this.random);
  }
}
