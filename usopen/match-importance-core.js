function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizedPointWeight(points) {
  return clamp(Math.log2(Math.max(0, Number(points)) + 1) / 8, 0, 1);
}

export function rateMatchImportance({
  entries = [],
  currentEntryId,
  selectedPosition,
  selectedPoints = 0,
  round = 1,
  resolved = false,
}) {
  if (!selectedPosition) {
    return {
      rating: 1,
      reason: "Pick a winner to calculate this match's pool importance.",
    };
  }

  if (entries.length < 2) {
    return {
      rating: 1,
      reason: "More completed brackets are needed to compare this match.",
    };
  }

  const currentIndex = entries.findIndex((entry) => entry.id === currentEntryId);
  if (currentIndex < 0) {
    return {
      rating: 1,
      reason: "This bracket is not available in the current pool comparison.",
    };
  }

  const current = entries[currentIndex];
  const isLeader = currentIndex === 0;
  const rivals = isLeader ? entries.slice(1) : entries.slice(0, currentIndex);
  const differentRivals = rivals.filter((entry) => Number(entry.pick) !== Number(selectedPosition));
  const selectedSupport = entries.filter((entry) => Number(entry.pick) === Number(selectedPosition)).length;
  const isUniquePick = selectedSupport === 1;

  if (!differentRivals.length) {
    return {
      rating: 1,
      reason: resolved
        ? isLeader
          ? "Every challenger made the same pick, so this result did not change your lead over them."
          : "Everyone ahead made the same pick, so this result did not move you past them."
        : isLeader
          ? "Every challenger made the same pick, so this match cannot change your lead over them."
          : "Everyone ahead made the same pick, so this match cannot move you past them.",
    };
  }

  const divergence = differentRivals.length / rivals.length;
  const closeness = differentRivals.reduce((total, rival) => {
    const gap = Math.abs(Number(current.points) - Number(rival.points));
    const availableSwing = Math.max(1, Number(selectedPoints), Number(rival.pickPoints));
    return total + clamp(1 - gap / (availableSwing * 1.5 + 1), 0, 1);
  }, 0) / differentRivals.length;
  const rankReach = isLeader
    ? differentRivals.length / Math.max(1, entries.length - 1)
    : differentRivals.length / Math.max(1, currentIndex);
  const roundWeight = clamp(Number(round) / 7, 0, 1);
  const pointWeight = normalizedPointWeight(selectedPoints);
  const rawRating = 1
    + divergence * 3
    + closeness * 2.5
    + rankReach * 1.5
    + roundWeight
    + pointWeight
    + (isUniquePick ? 1 : 0);
  const rating = clamp(Math.round(rawRating), 2, 10);

  if (isUniquePick) {
    return {
      rating,
      reason: resolved
        ? "This was the only bracket with this pick, so the result strongly separated this bracket from the pool."
        : "This is the only bracket with this pick, so the match can strongly separate this bracket from the pool.",
    };
  }

  return {
    rating,
    reason: resolved
      ? isLeader
        ? `${differentRivals.length} challenger${differentRivals.length === 1 ? " had" : "s had"} a different pick, so this result separated first place.`
        : `${differentRivals.length} bracket${differentRivals.length === 1 ? " ahead had" : "s ahead had"} a different pick, so this result separated the standings.`
      : isLeader
        ? `${differentRivals.length} close challenger${differentRivals.length === 1 ? " has" : "s have"} a different pick, so this match can change first place.`
        : `${differentRivals.length} bracket${differentRivals.length === 1 ? " ahead has" : "s ahead have"} a different pick, so this match can help you move up.`,
  };
}
