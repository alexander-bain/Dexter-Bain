(() => {
  "use strict";

  const STORAGE_KEY = "character-check-account-v1";
  const ROLE_ORDER = ["heart", "mind", "spark", "wildcard"];
  const EMPTY_COUNTS = Object.freeze({ heart: 0, mind: 0, spark: 0, wildcard: 0 });

  function cleanCounts(counts) {
    return Object.fromEntries(
      ROLE_ORDER.map((role) => [role, Math.max(0, Number(counts?.[role]) || 0)]),
    );
  }

  function emptyAccount() {
    return { version: 1, results: [] };
  }

  function normalize(account) {
    const results = Array.isArray(account?.results)
      ? account.results
          .filter((result) => result && typeof result.titleId === "string")
          .map((result) => ({
            titleId: result.titleId,
            title: String(result.title || result.titleId),
            type: String(result.type || "show"),
            outcomeKey: String(result.outcomeKey || "heart"),
            character: String(result.character || "Character match"),
            counts: cleanCounts(result.counts),
            updatedAt: String(result.updatedAt || new Date(0).toISOString()),
          }))
      : [];
    const unique = new Map();
    results.forEach((result) => unique.set(result.titleId, result));
    return { version: 1, results: [...unique.values()] };
  }

  function browserStorage() {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }

  function load(storage = null) {
    try {
      const target = storage || browserStorage();
      if (!target) return emptyAccount();
      return normalize(JSON.parse(target.getItem(STORAGE_KEY) || "null"));
    } catch {
      return emptyAccount();
    }
  }

  function persist(account, storage = null) {
    const normalized = normalize(account);
    try {
      const target = storage || browserStorage();
      if (!target) return false;
      target.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      return false;
    }
    return true;
  }

  function upsert(account, result) {
    const next = normalize(account);
    const saved = {
      titleId: String(result.titleId),
      title: String(result.title),
      type: String(result.type),
      outcomeKey: String(result.outcomeKey),
      character: String(result.character),
      counts: cleanCounts(result.counts),
      updatedAt: new Date().toISOString(),
    };
    next.results = next.results.filter((item) => item.titleId !== saved.titleId);
    next.results.push(saved);
    return next;
  }

  function average(account) {
    const normalized = normalize(account);
    const totals = { ...EMPTY_COUNTS };
    normalized.results.forEach((result) => {
      ROLE_ORDER.forEach((role) => {
        totals[role] += result.counts[role];
      });
    });
    const answerCount = Object.values(totals).reduce((sum, count) => sum + count, 0);
    const percentages = Object.fromEntries(
      ROLE_ORDER.map((role) => [role, answerCount ? (totals[role] / answerCount) * 100 : 0]),
    );
    const dominantRole = [...ROLE_ORDER].sort(
      (left, right) => totals[right] - totals[left] || ROLE_ORDER.indexOf(left) - ROLE_ORDER.indexOf(right),
    )[0];
    return { totals, percentages, dominantRole, answerCount, testCount: normalized.results.length };
  }

  function predictOutcome(title, profiles, account) {
    const profile = average(account);
    if (profile.testCount < 5) return null;
    if (!Array.isArray(title?.outcomePool) || title.outcomePool.length <= ROLE_ORDER.length) {
      return profile.dominantRole;
    }
    const ranked = title.outcomePool.map((key) => {
      const traits = profiles?.[key]?.traits || [];
      const score = traits.reduce((sum, role) => sum + (profile.percentages[role] || 0), 0);
      return { key, score };
    });
    ranked.sort((left, right) => right.score - left.score || left.key.localeCompare(right.key));
    return ranked[0]?.key || profile.dominantRole;
  }

  window.CharacterCheckAccount = Object.freeze({
    STORAGE_KEY,
    ROLE_ORDER,
    emptyAccount,
    normalize,
    load,
    persist,
    upsert,
    average,
    predictOutcome,
  });
})();
