const HIGH_SCORE_KEY = "galacticLearner.highScores";
const TRAINING_KEY = "galacticLearner.trainingSamples";

export function loadHighScores() {
  return readJson(HIGH_SCORE_KEY, []);
}

export function saveHighScore(entry) {
  const scores = loadHighScores();
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(scores.slice(0, 10)));
}

export function loadTrainingSamples() {
  return readJson(TRAINING_KEY, []);
}

export function saveTrainingSamples(samples) {
  localStorage.setItem(TRAINING_KEY, JSON.stringify(samples));
}

export function clearTrainingSamples() {
  localStorage.removeItem(TRAINING_KEY);
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
