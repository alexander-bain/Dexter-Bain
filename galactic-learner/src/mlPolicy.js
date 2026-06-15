import { loadTrainingSamples, saveTrainingSamples } from "./storage.js";

const MAX_SAMPLES = 5000;
const SCHEMA_VERSION = 2;
const MIN_READY_SAMPLES = 50;

export class MLPolicy {
  constructor() {
    this.samples = [];
  }

  load() {
    this.samples = loadTrainingSamples()
      .map(normalizeSample)
      .filter(Boolean)
      .slice(-MAX_SAMPLES);
    return this;
  }

  save() {
    saveTrainingSamples(this.samples.slice(-MAX_SAMPLES));
  }

  train(samples) {
    this.samples = samples.map(normalizeSample).filter(Boolean).slice(-MAX_SAMPLES);
    this.save();
  }

  addSample(stateVector, action, options = {}) {
    if (!Array.isArray(stateVector) || stateVector.some(Number.isNaN)) return;
    this.samples.push({
      schemaVersion: SCHEMA_VERSION,
      stateVector: stateVector.map(clamp01OrNegative),
      action: {
        moveX: Math.sign(action.moveX || action.move || 0),
        moveY: Math.sign(action.moveY || 0),
        fire: action.fire ? 1 : 0,
      },
      source: options.source || "human",
      quality: clampQuality(options.quality ?? 1),
      reward: Number(options.reward || 0),
    });
    if (this.samples.length > MAX_SAMPLES) {
      this.samples.splice(0, this.samples.length - MAX_SAMPLES);
    }
  }

  predict(stateVector) {
    if (this.samples.length === 0) {
      return notReadyPrediction();
    }

    const k = Math.min(this.getK(), this.samples.length);
    const neighbors = this.samples
      .map((sample) => {
        const distance = euclidean(stateVector, sample.stateVector);
        return { sample, distance, weight: sample.quality / (distance * distance + 0.0025) };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, k);

    const moveX = voteAxis(neighbors, "moveX");
    const moveY = voteAxis(neighbors, "moveY");
    const fire = voteFire(neighbors);
    const confidence = (moveX.confidence + moveY.confidence + fire.confidence) / 3;

    return {
      ready: this.samples.length >= MIN_READY_SAMPLES,
      moveX: moveX.value,
      moveY: moveY.value,
      fire: fire.value,
      confidence,
      fireConfidence: fire.confidence,
      k,
    };
  }

  getStats() {
    return {
      sampleCount: this.samples.length,
      ready: this.samples.length >= MIN_READY_SAMPLES,
      maxSamples: MAX_SAMPLES,
      k: this.getK(),
      schemaVersion: SCHEMA_VERSION,
      selfSampleCount: this.samples.filter((sample) => sample.source === "self").length,
    };
  }

  getK() {
    if (this.samples.length >= 300) return 13;
    if (this.samples.length >= 120) return 11;
    return 7;
  }
}

function voteAxis(neighbors, key) {
  const votes = new Map([
    [-1, 0],
    [0, 0],
    [1, 0],
  ]);
  let total = 0;

  for (const neighbor of neighbors) {
    const value = Math.sign(neighbor.sample.action[key] || 0);
    votes.set(value, votes.get(value) + neighbor.weight);
    total += neighbor.weight;
  }

  let bestValue = 0;
  let bestVote = -Infinity;
  let secondVote = 0;
  for (const [value, vote] of votes.entries()) {
    if (vote > bestVote) {
      secondVote = bestVote;
      bestVote = vote;
      bestValue = value;
    } else if (vote > secondVote) {
      secondVote = vote;
    }
  }

  return {
    value: bestValue,
    confidence: total > 0 ? Math.max(0, (bestVote - secondVote) / total) : 0,
  };
}

function voteFire(neighbors) {
  let fireTotal = 0;
  let weightTotal = 0;
  for (const neighbor of neighbors) {
    fireTotal += neighbor.sample.action.fire * neighbor.weight;
    weightTotal += neighbor.weight;
  }
  const average = weightTotal > 0 ? fireTotal / weightTotal : 0;
  return {
    value: average > 0.34,
    confidence: Math.abs(average - 0.5) * 2,
  };
}

function normalizeSample(sample) {
  if (!sample || !Array.isArray(sample.stateVector) || !sample.action) return null;

  if (sample.schemaVersion === SCHEMA_VERSION && sample.stateVector.length >= 22) {
    return {
      schemaVersion: SCHEMA_VERSION,
      stateVector: sample.stateVector.slice(0, 22).map(clamp01OrNegative),
      action: {
        moveX: Math.sign(sample.action.moveX || 0),
        moveY: Math.sign(sample.action.moveY || 0),
        fire: sample.action.fire ? 1 : 0,
      },
      source: sample.source || "human",
      quality: clampQuality(sample.quality ?? 1),
      reward: Number(sample.reward || 0),
    };
  }

  // Migrate the MVP's old horizontal-only samples into the new schema with safe defaults.
  const old = sample.stateVector;
  if (old.length >= 16) {
    return {
      schemaVersion: SCHEMA_VERSION,
      stateVector: [
        old[0] ?? 0.5,
        0.9,
        old[1] ?? 1,
        old[2] ?? 0,
        old[3] ?? 0,
        old[4] ?? -1,
        old[5] ?? -1,
        old[6] ?? 1,
        old[7] ?? -1,
        old[8] ?? -1,
        old[9] ?? 1,
        old[10] ?? 0,
        old[11] ?? 0,
        old[12] ?? 0,
        old[14] ?? 0,
        old[13] ?? 0,
        old[15] ?? 1,
        1,
        0.5,
        0.5,
        0.5,
        0.5,
      ].map(clamp01OrNegative),
      action: {
        moveX: Math.sign(sample.action.move ?? sample.action.moveX ?? 0),
        moveY: 0,
        fire: sample.action.fire ? 1 : 0,
      },
      source: "human",
      quality: 0.85,
      reward: 0,
    };
  }

  return null;
}

function notReadyPrediction() {
  return {
    ready: false,
    moveX: 0,
    moveY: 0,
    fire: false,
    confidence: 0,
    fireConfidence: 0,
    k: 0,
  };
}

function euclidean(a, b) {
  let sum = 0;
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const diff = clamp01OrNegative(a[i]) - clamp01OrNegative(b[i]);
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function clamp01OrNegative(value) {
  if (value < 0) return -1;
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function clampQuality(value) {
  return Math.max(0.15, Math.min(3.5, Number(value) || 1));
}
