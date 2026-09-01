export const ROUND_NAMES = [
  "Round of 128",
  "Round of 64",
  "Round of 32",
  "Round of 16",
  "Quarterfinals",
  "Semifinals",
  "Final",
];

export const ROUND_POINTS = [1, 2, 4, 8, 16, 32, 64];

export function ratingForPlayer(player) {
  if (!player) return null;
  if (player.seed) return 1900 - 55 * Math.log2(Number(player.seed));
  const entryRatings = {
    direct: 1500,
    wildcard: 1475,
    tbd: 1450,
  };
  return entryRatings[player.entryType] || 1500;
}

export function projectionForPlayers(players) {
  if (!players[0] || !players[1]) return null;
  const firstRating = ratingForPlayer(players[0]);
  const secondRating = ratingForPlayer(players[1]);
  const rawFirst = 100 / (1 + 10 ** ((secondRating - firstRating) / 400));
  const first = Math.round(Math.min(95, Math.max(5, rawFirst)));
  return [first, 100 - first];
}

export function upsetMultiplier(probability) {
  if (probability >= 45) return 1;
  if (probability >= 35) return 1.5;
  if (probability >= 25) return 2;
  if (probability >= 15) return 3;
  return 4;
}

export function potentialPointsForPick(round, probability) {
  return Math.round(ROUND_POINTS[round - 1] * upsetMultiplier(probability));
}

function matchKey(round, matchIndex) {
  return `${round}-${matchIndex}`;
}

function matchCount(round) {
  return 2 ** (7 - round);
}

function seedNumber(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = seedNumber(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function participantsForEntry(entry, round, matchIndex, playerByPosition) {
  if (round === 1) {
    return [
      playerByPosition.get((matchIndex - 1) * 2 + 1),
      playerByPosition.get((matchIndex - 1) * 2 + 2),
    ];
  }
  return [
    playerByPosition.get(Number(entry.picks[matchKey(round - 1, matchIndex * 2 - 1)])),
    playerByPosition.get(Number(entry.picks[matchKey(round - 1, matchIndex * 2)])),
  ];
}

function participantsForOutcome(round, matchIndex, winners, playerByPosition) {
  if (round === 1) {
    return [
      playerByPosition.get((matchIndex - 1) * 2 + 1),
      playerByPosition.get((matchIndex - 1) * 2 + 2),
    ];
  }
  return [
    playerByPosition.get(winners.get(matchKey(round - 1, matchIndex * 2 - 1))),
    playerByPosition.get(winners.get(matchKey(round - 1, matchIndex * 2))),
  ];
}

function entryPickValues(entry, playerByPosition) {
  const values = new Map();
  for (let round = 1; round <= 7; round += 1) {
    for (let matchIndex = 1; matchIndex <= matchCount(round); matchIndex += 1) {
      const key = matchKey(round, matchIndex);
      const selectedPosition = Number(entry.picks[key]);
      if (!selectedPosition) continue;
      const players = participantsForEntry(entry, round, matchIndex, playerByPosition);
      const projection = projectionForPlayers(players);
      const selectedIndex = players.findIndex((player) => player?.drawPosition === selectedPosition);
      const probability = projection?.[selectedIndex];
      values.set(key, {
        selectedPosition,
        points: probability == null ? ROUND_POINTS[round - 1] : potentialPointsForPick(round, probability),
      });
    }
  }
  return values;
}

function importantMatch(entries, resultsByKey, officialWinners, playerByPosition) {
  let best = null;
  for (let round = 1; round <= 7; round += 1) {
    for (let matchIndex = 1; matchIndex <= matchCount(round); matchIndex += 1) {
      const key = matchKey(round, matchIndex);
      if (resultsByKey.has(key)) continue;
      const players = participantsForOutcome(round, matchIndex, officialWinners, playerByPosition);
      if (!players[0] || !players[1]) continue;
      const support = players.map((player) => entries.filter((entry) => (
        Number(entry.picks[key]) === Number(player.drawPosition)
      )).length);
      if (!support[0] || !support[1]) continue;
      const importance = Math.min(...support) * 1000 + ROUND_POINTS[round - 1] * 10 + support[0] + support[1];
      if (!best || importance > best.importance) {
        best = {
          round,
          matchIndex,
          roundName: ROUND_NAMES[round - 1],
          players: players.map((player, index) => ({
            drawPosition: player.drawPosition,
            name: player.name,
            support: support[index],
          })),
          importance,
        };
      }
    }
  }
  if (best) delete best.importance;
  return best;
}

function bestPathForEntry(entryIndex, entries, pickValues, resultsByKey, eliminated, playerByPosition) {
  let best = null;
  for (let round = 1; round <= 7; round += 1) {
    for (let matchIndex = 1; matchIndex <= matchCount(round); matchIndex += 1) {
      const key = matchKey(round, matchIndex);
      if (resultsByKey.has(key)) continue;
      const pick = pickValues[entryIndex].get(key);
      if (!pick || eliminated.has(pick.selectedPosition)) continue;
      const support = entries.filter((candidate) => (
        Number(candidate.picks[key]) === pick.selectedPosition
      )).length;
      const leverage = pick.points * (entries.length - support + 1);
      if (!best || leverage > best.leverage) {
        best = {
          playerName: playerByPosition.get(pick.selectedPosition)?.name || "Unknown player",
          round,
          roundName: ROUND_NAMES[round - 1],
          support,
          points: pick.points,
          leverage,
        };
      }
    }
  }
  if (best) delete best.leverage;
  return best;
}

export function simulateDivisionPool({ entries, players, results, iterations = 4000, seed = "pool" }) {
  const safeIterations = Math.min(20000, Math.max(250, Math.floor(iterations)));
  if (!entries.length || !players.length) {
    return { iterations: safeIterations, forecasts: [], importantMatch: null };
  }

  const playerByPosition = new Map(players.map((player) => [Number(player.drawPosition), player]));
  const resultsByKey = new Map((results || []).map((result) => [matchKey(result.round, result.matchIndex), result]));
  const officialWinners = new Map([...resultsByKey].map(([key, result]) => [key, Number(result.winnerDrawPosition)]));
  const eliminated = new Set((results || []).map((result) => Number(result.loserDrawPosition)));
  const pickValues = entries.map((entry) => entryPickValues(entry, playerByPosition));
  const winShares = entries.map(() => 0);
  const rankTotals = entries.map(() => 0);
  const pointTotals = entries.map(() => 0);
  const bestPoints = entries.map(() => 0);
  const random = seededRandom(seed);

  for (let simulation = 0; simulation < safeIterations; simulation += 1) {
    const winners = new Map();
    const scores = entries.map(() => 0);
    for (let round = 1; round <= 7; round += 1) {
      for (let matchIndex = 1; matchIndex <= matchCount(round); matchIndex += 1) {
        const key = matchKey(round, matchIndex);
        const official = resultsByKey.get(key);
        let winnerPosition = Number(official?.winnerDrawPosition);
        if (!winnerPosition) {
          const matchup = participantsForOutcome(round, matchIndex, winners, playerByPosition);
          const projection = projectionForPlayers(matchup) || [50, 50];
          const winnerIndex = random() * 100 < projection[0] ? 0 : 1;
          winnerPosition = Number(matchup[winnerIndex]?.drawPosition || matchup[1 - winnerIndex]?.drawPosition || 0);
        }
        winners.set(key, winnerPosition);
        entries.forEach((_entry, entryIndex) => {
          const pick = pickValues[entryIndex].get(key);
          if (pick?.selectedPosition === winnerPosition) scores[entryIndex] += pick.points;
        });
      }
    }

    const highestScore = Math.max(...scores);
    const leaders = scores.map((score, index) => ({ score, index })).filter(({ score }) => score === highestScore);
    leaders.forEach(({ index }) => { winShares[index] += 1 / leaders.length; });
    scores.forEach((score, entryIndex) => {
      rankTotals[entryIndex] += 1 + scores.filter((otherScore) => otherScore > score).length;
      pointTotals[entryIndex] += score;
      bestPoints[entryIndex] = Math.max(bestPoints[entryIndex], score);
    });
  }

  const forecasts = entries.map((entry, entryIndex) => {
    let currentPoints = 0;
    let maxPossiblePoints = 0;
    for (const [key, pick] of pickValues[entryIndex]) {
      const official = resultsByKey.get(key);
      if (official) {
        if (Number(official.winnerDrawPosition) === pick.selectedPosition) currentPoints += pick.points;
      } else if (!eliminated.has(pick.selectedPosition)) {
        maxPossiblePoints += pick.points;
      }
    }
    maxPossiblePoints += currentPoints;
    return {
      entry,
      winChance: winShares[entryIndex] / safeIterations * 100,
      averageFinish: rankTotals[entryIndex] / safeIterations,
      projectedPoints: pointTotals[entryIndex] / safeIterations,
      bestSimulatedPoints: bestPoints[entryIndex],
      currentPoints,
      maxPossiblePoints,
      bestPath: bestPathForEntry(entryIndex, entries, pickValues, resultsByKey, eliminated, playerByPosition),
    };
  }).sort((first, second) => (
    second.winChance - first.winChance
      || first.averageFinish - second.averageFinish
      || second.projectedPoints - first.projectedPoints
  ));

  return {
    iterations: safeIterations,
    forecasts,
    importantMatch: importantMatch(entries, resultsByKey, officialWinners, playerByPosition),
  };
}
