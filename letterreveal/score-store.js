const ACCOUNTS_KEY = "letter-reveal-accounts-v1";
const SESSION_KEY = "letter-reveal-session-v1";
const GUEST_SCORES_KEY = "letter-reveal-guest-scores-v1";
const PASSWORD_ITERATIONS = 150_000;

function readObject(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch (error) {
    return {};
  }
}

function writeObject(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function validateCredentials(username, password) {
  const cleanUsername = String(username || "").trim();
  if (!/^[a-z0-9_-]{3,20}$/i.test(cleanUsername)) {
    throw new Error("Use 3–20 letters, numbers, dashes, or underscores for your username.");
  }
  if (String(password || "").length < 8) {
    throw new Error("Your password must be at least 8 characters.");
  }
  return cleanUsername;
}

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function hashPassword(password, salt) {
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PASSWORD_ITERATIONS, hash: "SHA-256" },
    passwordKey,
    256
  );
  return bytesToBase64(new Uint8Array(bits));
}

function currentAccount() {
  const accountKey = normalizeUsername(localStorage.getItem(SESSION_KEY));
  if (!accountKey) return null;
  const account = readObject(ACCOUNTS_KEY)[accountKey];
  if (!account) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
  return { username: account.username };
}

function mergeGuestScores(account) {
  const guestScores = readObject(GUEST_SCORES_KEY);
  account.scores = { ...guestScores, ...(account.scores || {}) };
  localStorage.removeItem(GUEST_SCORES_KEY);
}

async function createAccount(username, password) {
  const cleanUsername = validateCredentials(username, password);
  const accountKey = normalizeUsername(cleanUsername);
  const accounts = readObject(ACCOUNTS_KEY);
  if (accounts[accountKey]) throw new Error("That username already exists on this browser.");

  const salt = crypto.getRandomValues(new Uint8Array(16));
  accounts[accountKey] = {
    username: cleanUsername,
    salt: bytesToBase64(salt),
    passwordHash: await hashPassword(password, salt),
    scores: {}
  };
  mergeGuestScores(accounts[accountKey]);
  writeObject(ACCOUNTS_KEY, accounts);
  localStorage.setItem(SESSION_KEY, accountKey);
  return { username: cleanUsername };
}

async function signIn(username, password) {
  const cleanUsername = validateCredentials(username, password);
  const accountKey = normalizeUsername(cleanUsername);
  const accounts = readObject(ACCOUNTS_KEY);
  const account = accounts[accountKey];
  if (!account) throw new Error("That account is not saved on this browser.");

  const candidateHash = await hashPassword(password, base64ToBytes(account.salt));
  if (candidateHash !== account.passwordHash) throw new Error("That password is not correct.");

  mergeGuestScores(account);
  writeObject(ACCOUNTS_KEY, accounts);
  localStorage.setItem(SESSION_KEY, accountKey);
  return { username: account.username };
}

function signOut() {
  localStorage.removeItem(SESSION_KEY);
}

function scoreCollection() {
  const account = currentAccount();
  if (!account) return readObject(GUEST_SCORES_KEY);
  const accountKey = normalizeUsername(account.username);
  return readObject(ACCOUNTS_KEY)[accountKey]?.scores || {};
}

function recordScore(puzzleDate, score) {
  const cleanDate = String(puzzleDate || "");
  const cleanScore = Math.max(0, Math.min(10, Math.round(Number(score))));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate) || !Number.isFinite(cleanScore)) return;

  const account = currentAccount();
  if (!account) {
    const scores = readObject(GUEST_SCORES_KEY);
    if (scores[cleanDate] === undefined) {
      scores[cleanDate] = cleanScore;
      writeObject(GUEST_SCORES_KEY, scores);
    }
    return;
  }

  const accounts = readObject(ACCOUNTS_KEY);
  const accountKey = normalizeUsername(account.username);
  if (accounts[accountKey].scores[cleanDate] === undefined) {
    accounts[accountKey].scores[cleanDate] = cleanScore;
    writeObject(ACCOUNTS_KEY, accounts);
  }
}

function getScore(puzzleDate) {
  const score = scoreCollection()[puzzleDate];
  return Number.isFinite(Number(score)) ? Number(score) : null;
}

function getDistribution() {
  const scores = Object.values(scoreCollection()).map(Number).filter(Number.isFinite);
  return [
    { label: "10", count: scores.filter((score) => score === 10).length },
    { label: "9", count: scores.filter((score) => score === 9).length },
    { label: "8", count: scores.filter((score) => score === 8).length },
    { label: "7", count: scores.filter((score) => score === 7).length },
    { label: "6", count: scores.filter((score) => score === 6).length },
    { label: "≤5", count: scores.filter((score) => score <= 5).length }
  ];
}

export default {
  createAccount,
  currentAccount,
  getDistribution,
  getScore,
  recordScore,
  signIn,
  signOut
};
