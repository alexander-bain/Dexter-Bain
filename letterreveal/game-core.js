"use strict";

  const PACIFIC_TIME_ZONE = "America/Los_Angeles";
  const CUTOFF_MINUTES = (6 * 60) + 30;
  const DAY_MS = 86_400_000;

  function normalizePhrase(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[^a-z]/gi, "")
      .toUpperCase();
  }

  function hashString(value) {
    let hash = 0x811c9dc5;
    for (const character of String(value)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  function seededRandom(seed) {
    let state = seed >>> 0;
    return function nextRandom() {
      state += 0x6d2b79f5;
      let number = state;
      number = Math.imul(number ^ (number >>> 15), number | 1);
      number ^= number + Math.imul(number ^ (number >>> 7), number | 61);
      return ((number ^ (number >>> 14)) >>> 0) / 4_294_967_296;
    };
  }

  function getPacificParts(date) {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: PACIFIC_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    });
    return Object.fromEntries(
      formatter.formatToParts(date).map((part) => [part.type, part.value])
    );
  }

  function getPuzzleKey(date = new Date()) {
    const parts = getPacificParts(date);
    let dayStamp = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day)
    );
    const minutes = (Number(parts.hour) * 60) + Number(parts.minute);
    if (minutes < CUTOFF_MINUTES) {
      dayStamp -= DAY_MS;
    }
    return new Date(dayStamp).toISOString().slice(0, 10);
  }

  function getPuzzleNumber(key) {
    const launchDay = Date.parse("2026-01-01T00:00:00Z");
    return Math.max(1, Math.floor((Date.parse(`${key}T00:00:00Z`) - launchDay) / DAY_MS) + 1);
  }

  function getPuzzleIndex(key, puzzleCount) {
    if (!Number.isInteger(puzzleCount) || puzzleCount < 1) {
      throw new Error("Puzzle list must contain at least one phrase.");
    }
    return hashString(`letter-reveal:${key}`) % puzzleCount;
  }

  function getRevealOrder(key, answer) {
    const normalized = normalizePhrase(answer);
    const positions = Array.from({ length: normalized.length }, (_, index) => index);
    const random = seededRandom(hashString(`${key}:${normalized}:reveals`));
    for (let index = positions.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [positions[index], positions[swapIndex]] = [positions[swapIndex], positions[index]];
    }
    return positions;
  }

  function getWordLengths(answer) {
    return String(answer)
      .trim()
      .split(/\s+/)
      .map((word) => normalizePhrase(word).length)
      .filter(Boolean);
  }

export {
  CUTOFF_MINUTES,
  PACIFIC_TIME_ZONE,
  getPuzzleIndex,
  getPuzzleKey,
  getPuzzleNumber,
  getRevealOrder,
  getWordLengths,
  hashString,
  normalizePhrase
};

export default Object.freeze({
  CUTOFF_MINUTES,
  PACIFIC_TIME_ZONE,
  getPuzzleIndex,
  getPuzzleKey,
  getPuzzleNumber,
  getRevealOrder,
  getWordLengths,
  hashString,
  normalizePhrase
});
