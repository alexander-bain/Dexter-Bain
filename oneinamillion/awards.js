/* One in a Million award engine · release 2026-11-10-oiam-v2 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.OIAMRules = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const TOTAL_OUTCOMES = 6 ** 6;
  const FACE_NAMES = ["Ones", "Twos", "Threes", "Fours", "Fives", "Sixes"];
  const TIER_LIST = [
    { id: "common", label: "Common", points: 1, minimum: 0.2, color: "#54d39d" },
    { id: "rare", label: "Rare", points: 2, minimum: 0.05, color: "#56b8ff" },
    { id: "epic", label: "Epic", points: 5, minimum: 0.01, color: "#b889ff" },
    { id: "boss", label: "Boss", points: 8, minimum: 0.0025, color: "#ff9c42" },
    { id: "legendary", label: "Legendary", points: 9, minimum: 0.001, color: "#ffe45e" },
    { id: "millionaire", label: "Millionaire", points: 15, minimum: 0, color: "#ff5d8f" }
  ];

  // Filled from an exhaustive 46,656-outcome audit. Kept beside the rules so
  // phones never need to run nine million checks before the first turn.
  const MATCH_COUNTS = [
    18750, 9375, 2500, 375, 30, 1, 18750, 9375, 2500, 375, 30, 1, 18750, 9375, 2500, 375, 30, 1,
    18750, 9375, 2500, 375, 30, 1, 18750, 9375, 2500, 375, 30, 1, 18750, 9375, 2500, 375, 30, 1,
    5531, 756, 96, 11, 5531, 756, 96, 11, 5531, 756, 96, 11, 5531, 756, 96, 11, 5531, 756, 96, 11,
    5531, 756, 96, 11, 7776, 6, 21, 56, 126, 252, 456, 756, 1161, 1666, 2247, 2856, 3431, 3906, 4221,
    4332, 4221, 3906, 3431, 2856, 2247, 1666, 1161, 756, 456, 252, 126, 56, 21, 6, 7776,
    6265, 6265, 6265, 6265, 6265, 6265, 6265, 6265, 6265, 6265, 863, 863, 863, 863, 863, 863, 863, 863,
    108, 108, 108, 108, 108, 108, 12, 12, 12, 12, 1, 1, 6, 180, 450, 1800, 300,
    7200, 7200, 1800, 16200, 10800, 720, 729, 4374, 10935, 14580, 10935, 4374, 729,
    729, 4374, 10935, 14580, 10935, 4374, 729, 729, 4374, 10935, 14580, 10935, 4374, 729,
    7776, 7776, 1296, 216, 216, 4332, 1746, 21162, 21162, 30, 210, 216, 18750, 4320, 4320, 4320, 4320,
    2353, 2353, 127, 6368, 1926, 12690, 5160, 7287, 729, 793, 7776, 30366,
    11340, 11340, 11340, 11340, 5880, 5880, 5880, 2520, 2520, 1296, 1296,
    1296, 1296, 1296, 1296, 120, 216, 666
  ];

  function countFace(dice, face) {
    let total = 0;
    for (const die of dice) if (die === face) total += 1;
    return total;
  }

  function faceCounts(dice) {
    const counts = Array(6).fill(0);
    for (const die of dice) counts[die - 1] += 1;
    return counts;
  }

  function shapeOf(dice) {
    return faceCounts(dice).filter(Boolean).sort((a, b) => b - a).join("-");
  }

  function containsRun(dice, face, length) {
    let run = 0;
    for (const die of dice) {
      run = die === face ? run + 1 : 0;
      if (run >= length) return true;
    }
    return false;
  }

  function containsOrdered(dice, sequence) {
    outer: for (let start = 0; start <= dice.length - sequence.length; start += 1) {
      for (let i = 0; i < sequence.length; i += 1) {
        if (dice[start + i] !== sequence[i]) continue outer;
      }
      return true;
    }
    return false;
  }

  function sum(dice) {
    return dice.reduce((total, die) => total + die, 0);
  }

  function product(dice) {
    return dice.reduce((total, die) => total * die, 1);
  }

  function gcd(a, b) {
    while (b) [a, b] = [b, a % b];
    return a;
  }

  function containsFaces(dice, faces) {
    return faces.every((face) => dice.includes(face));
  }

  function isPerfectSquare(value) {
    return Number.isInteger(Math.sqrt(value));
  }

  function isPerfectCube(value) {
    return Number.isInteger(Math.cbrt(value));
  }

  function isPowerOfTwo(value) {
    return value > 0 && (value & (value - 1)) === 0;
  }

  function tierFor(matches) {
    const chance = matches / TOTAL_OUTCOMES;
    return TIER_LIST.find((tier) => chance >= tier.minimum) || TIER_LIST[TIER_LIST.length - 1];
  }

  function oddsText(matches) {
    if (!matches) return "Never";
    const percent = (matches / TOTAL_OUTCOMES) * 100;
    const oneIn = TOTAL_OUTCOMES / matches;
    const percentText = percent >= 10 ? percent.toFixed(1) : percent >= 1 ? percent.toFixed(2) : percent.toFixed(3);
    const oneInText = oneIn < 10 ? oneIn.toFixed(1) : Math.round(oneIn).toLocaleString("en-US");
    return `${percentText}% · 1 in ${oneInText}`;
  }

  function buildAwards(matchCounts = MATCH_COUNTS) {
    const awards = [];
    const add = (group, name, emoji, description, test) => {
      awards.push({
        id: `a${String(awards.length + 1).padStart(3, "0")}`,
        group,
        name,
        emoji,
        description,
        test
      });
    };

    // 1–36: exact quantities of each face.
    const quantityLabels = ["Lone", "Pair of", "Trio of", "Four", "Five", "Yahtzee"];
    const quantityEmoji = ["🧍", "👯", "🔺", "🏰", "🌊", "🏆"];
    for (let face = 1; face <= 6; face += 1) {
      for (let amount = 1; amount <= 6; amount += 1) {
        const all = amount === 6;
        add(
          "Face counts",
          all ? `Yahtzee: ${FACE_NAMES[face - 1]}` : `${quantityLabels[amount - 1]} ${FACE_NAMES[face - 1]}`,
          quantityEmoji[amount - 1],
          all ? `All six dice are ${face}.` : `Exactly ${amount} ${amount === 1 ? "die shows" : "dice show"} ${face}.`,
          (dice) => countFace(dice, face) === amount
        );
      }
    }

    // 37–60: identical dice touching in the recorded order.
    const streakLabels = { 2: "Duo", 3: "Triple Line", 4: "Four Wall", 5: "Five Train" };
    const streakEmoji = { 2: "🔗", 3: "🚂", 4: "🧱", 5: "🚄" };
    for (let face = 1; face <= 6; face += 1) {
      for (let length = 2; length <= 5; length += 1) {
        const isDevil = face === 6 && length === 3;
        add(
          "Same-number streaks",
          isDevil ? "The Devil" : `${streakLabels[length]}: ${FACE_NAMES[face - 1]}`,
          isDevil ? "😈" : streakEmoji[length],
          isDevil ? "The dice contain 6-6-6 in a row." : `At least ${length} ${face}s appear next to each other.`,
          (dice) => containsRun(dice, face, length)
        );
      }
    }

    // 61–91: 29 possible totals plus two positional doubles. Totals 6 and 36
    // are already exactly the Ones/Sixes Yahtzee awards, so using them again
    // would not create genuinely different discoveries.
    const totalNames = [
      "Basement Six", "Lucky Seven", "Figure Eight", "Cloud Nine", "Perfect Ten", "Double One",
      "Full Dozen", "Unlucky Thirteen", "Fourteen Flash", "Quarter Hour", "Sweet Sixteen", "Prime Seventeen",
      "Coming of Age", "Edge of Twenty", "The Score", "Blackjack Total", "Double Deuce", "Jordan Twenty-Three",
      "Day & Night", "Quarter Century", "Alphabet Twenty-Six", "Cube Club", "Lunar Twenty-Eight", "Last Twenties",
      "Big Thirty", "Prime Thirty-One", "Power Thirty-Two", "Twin Threes", "Countdown Thirty-Four", "High Five Thirty-Five",
      "Maximum Overdrive"
    ];
    for (let target = 6; target <= 36; target += 1) {
      if (target === 6) {
        add("Position tricks", "Double Start", "🎬", "The first two dice match.", (dice) => dice[0] === dice[1]);
      } else if (target === 36) {
        add("Position tricks", "Double Finish", "🏁", "The last two dice match.", (dice) => dice[4] === dice[5]);
      } else {
        add("Totals", totalNames[target - 6], target === 21 ? "🃏" : "➕", `The six dice add up to ${target}.`, (dice) => sum(dice) === target);
      }
    }

    // 92–121: rising and falling consecutive sequences.
    const lengthWords = { 2: "Duo", 3: "Trio", 4: "Run", 5: "Rush", 6: "Perfect Staircase" };
    for (let length = 2; length <= 6; length += 1) {
      for (let start = 1; start <= 7 - length; start += 1) {
        const sequence = Array.from({ length }, (_, index) => start + index);
        add(
          "Number runs",
          `Step ${lengthWords[length]}: ${sequence.join("–")}`,
          length === 6 ? "🌈" : "↗️",
          `${sequence.join("-")} appears in order in adjacent slots.`,
          (dice) => containsOrdered(dice, sequence)
        );
      }
      for (let start = length; start <= 6; start += 1) {
        const sequence = Array.from({ length }, (_, index) => start - index);
        add(
          "Number runs",
          `Backstep ${lengthWords[length]}: ${sequence.join("–")}`,
          length === 6 ? "🛝" : "↘️",
          `${sequence.join("-")} appears in order in adjacent slots.`,
          (dice) => containsOrdered(dice, sequence)
        );
      }
    }

    // 122–132: poker-like shapes, independent of the number shown.
    const shapes = [
      ["6", "Six of a Kind", "👑", "All six dice match."],
      ["5-1", "Five & a Friend", "🖐️", "Five dice match and one is different."],
      ["4-2", "Castle & Couple", "🏯", "Four dice match and the other two match."],
      ["4-1-1", "Four & Floaters", "🛟", "Four dice match, plus two different singles."],
      ["3-3", "Double Triple", "🔱", "Two different triples."],
      ["3-2-1", "Royal Family", "👨‍👩‍👧", "A triple, a pair, and a single."],
      ["3-1-1-1", "Triple & Travelers", "🧳", "A triple and three different singles."],
      ["2-2-2", "Three Pair", "🎁", "Three different pairs."],
      ["2-2-1-1", "Two Pair", "✌️", "Two pairs and two different singles."],
      ["2-1-1-1-1", "Classic Pair", "🤝", "One pair and four different singles."],
      ["1-1-1-1-1-1", "Rainbow Spread", "🌈", "Every die shows a different number."]
    ];
    for (const [shape, name, emoji, description] of shapes) {
      add("Dice shapes", name, emoji, description, (dice) => shapeOf(dice) === shape);
    }

    // 133–153: three seven-award counting families.
    const evenNames = ["Odd Squad", "One Even Steven", "Even Duo", "Even Split", "Even Majority", "Even Avalanche", "All Even"];
    const highNames = ["Low Life", "One High Flyer", "High Duo", "High Noon", "High Majority", "Sky Full", "All High"];
    const primeNames = ["Prime-Free", "Prime Spark", "Prime Duo", "Prime Split", "Prime Pack", "Prime Storm", "All Prime"];
    for (let amount = 0; amount <= 6; amount += 1) {
      add("Even dice", evenNames[amount], "⚖️", `Exactly ${amount} dice are even.`, (dice) => dice.filter((die) => die % 2 === 0).length === amount);
    }
    for (let amount = 0; amount <= 6; amount += 1) {
      add("High dice", highNames[amount], "☁️", `Exactly ${amount} dice are high (4, 5, or 6).`, (dice) => dice.filter((die) => die >= 4).length === amount);
    }
    for (let amount = 0; amount <= 6; amount += 1) {
      add("Prime dice", primeNames[amount], "💎", `Exactly ${amount} dice are prime (2, 3, or 5).`, (dice) => dice.filter((die) => die === 2 || die === 3 || die === 5).length === amount);
    }

    // 154–173: order and symmetry discoveries.
    add("Order & symmetry", "Matching Bookends", "📚", "The first and last dice match.", (d) => d[0] === d[5]);
    add("Order & symmetry", "Lucky Bookends", "🍀", "The first and last dice add up to 7.", (d) => d[0] + d[5] === 7);
    add("Order & symmetry", "Double Mirror", "🪞", "The two outside pairs mirror each other.", (d) => d[0] === d[5] && d[1] === d[4]);
    add("Order & symmetry", "Perfect Palindrome", "🔮", "The roll reads the same forward and backward.", (d) => d[0] === d[5] && d[1] === d[4] && d[2] === d[3]);
    add("Order & symmetry", "Echo Chamber", "📣", "The last three dice repeat the first three.", (d) => d[0] === d[3] && d[1] === d[4] && d[2] === d[5]);
    add("Order & symmetry", "Balanced Halves", "⚖️", "The first three dice and last three dice have equal totals.", (d) => d[0] + d[1] + d[2] === d[3] + d[4] + d[5]);
    add("Order & symmetry", "Product Balance", "🧮", "The products of the two three-die halves match.", (d) => d[0] * d[1] * d[2] === d[3] * d[4] * d[5]);
    add("Order & symmetry", "Left Side Wins", "⬅️", "The first half totals more than the second half.", (d) => d[0] + d[1] + d[2] > d[3] + d[4] + d[5]);
    add("Order & symmetry", "Right Side Wins", "➡️", "The second half totals more than the first half.", (d) => d[0] + d[1] + d[2] < d[3] + d[4] + d[5]);
    add("Order & symmetry", "Two-Step Dance", "💃", "Two different numbers alternate A-B-A-B-A-B.", (d) => d[0] === d[2] && d[2] === d[4] && d[1] === d[3] && d[3] === d[5] && d[0] !== d[1]);
    add("Order & symmetry", "Triple Replay", "🔁", "A three-die pattern repeats: A-B-C-A-B-C.", (d) => d[0] === d[3] && d[1] === d[4] && d[2] === d[5] && new Set(d.slice(0, 3)).size > 1);
    add("Order & symmetry", "Pair Parade", "🥁", "The dice arrive as three side-by-side pairs.", (d) => d[0] === d[1] && d[2] === d[3] && d[4] === d[5]);
    add("Order & symmetry", "No Neighbors", "🚫", "No two neighboring dice match.", (d) => d.every((value, index) => index === 0 || value !== d[index - 1]));
    add("Order & symmetry", "Fast Start", "🏁", "The first three dice strictly increase.", (d) => d[0] < d[1] && d[1] < d[2]);
    add("Order & symmetry", "Downhill Start", "⛷️", "The first three dice strictly decrease.", (d) => d[0] > d[1] && d[1] > d[2]);
    add("Order & symmetry", "Fast Finish", "🏎️", "The last three dice strictly increase.", (d) => d[3] < d[4] && d[4] < d[5]);
    add("Order & symmetry", "Downhill Finish", "🛷", "The last three dice strictly decrease.", (d) => d[3] > d[4] && d[4] > d[5]);
    add("Order & symmetry", "Peak Zigzag", "⚡", "The roll zigzags up-down-up-down-up.", (d) => d[0] < d[1] && d[1] > d[2] && d[2] < d[3] && d[3] > d[4] && d[4] < d[5]);
    add("Order & symmetry", "Valley Zigzag", "〽️", "The roll zigzags down-up-down-up-down.", (d) => d[0] > d[1] && d[1] < d[2] && d[2] > d[3] && d[3] < d[4] && d[4] > d[5]);
    add("Order & symmetry", "Mountain Trail", "⛰️", "Three rising dice are followed by three falling dice.", (d) => d[0] < d[1] && d[1] < d[2] && d[2] > d[3] && d[3] > d[4] && d[4] > d[5]);

    // 174–191: mathematical and unordered-set discoveries.
    const primeTotals = new Set([7, 11, 13, 17, 19, 23, 29, 31]);
    const squareTotals = new Set([9, 16, 25, 36]);
    const triangleTotals = new Set([6, 10, 15, 21, 28, 36]);
    add("Math magic", "Square Product", "◼️", "The product of all six dice is a perfect square.", (d) => isPerfectSquare(product(d)));
    add("Math magic", "Cube Product", "🧊", "The product of all six dice is a perfect cube.", (d) => isPerfectCube(product(d)));
    add("Math magic", "Prime Total", "🔢", "The dice total is a prime number.", (d) => primeTotals.has(sum(d)));
    add("Math magic", "Square Total", "🟪", "The dice total is a perfect square.", (d) => squareTotals.has(sum(d)));
    add("Math magic", "Triangle Total", "🔺", "The dice total is a triangular number.", (d) => triangleTotals.has(sum(d)));
    add("Math magic", "Power of Two", "⚡", "The product of all six dice is a power of two.", (d) => isPowerOfTwo(product(d)));
    add("Math magic", "Common Factor", "🧬", "Every die shares a factor greater than one.", (d) => d.reduce(gcd) > 1);
    add("Math magic", "Six Divides", "➗", "The dice total is divisible by six.", (d) => sum(d) % 6 === 0);
    add("Math magic", "Perfect Ten Product", "🔟", "The product of all six dice is divisible by ten.", (d) => product(d) % 10 === 0);
    const faceSets = [
      [[1, 2, 3], "Low Trio Set", "🪜"], [[2, 3, 4], "Middle-Low Trio Set", "🎚️"],
      [[3, 4, 5], "Middle-High Trio Set", "🎛️"], [[4, 5, 6], "High Trio Set", "🚀"],
      [[1, 2, 3, 4], "Low Four Set", "🧩"], [[2, 3, 4, 5], "Center Four Set", "🎯"],
      [[3, 4, 5, 6], "High Four Set", "🛰️"], [[1, 2, 3, 4, 5], "Almost Rainbow Low", "🌦️"],
      [[2, 3, 4, 5, 6], "Almost Rainbow High", "🌤️"]
    ];
    for (const [faces, name, emoji] of faceSets) {
      add("Math magic", name, emoji, `The roll contains ${faces.join(", ")} in any order.`, (d) => containsFaces(d, faces));
    }

    // 192–200: precise bookends and three grand patterns.
    for (let face = 1; face <= 6; face += 1) {
      add("Final secrets", `${FACE_NAMES[face - 1]} Bookends`, "📕", `The first and last dice are both ${face}.`, (d) => d[0] === face && d[5] === face);
    }
    add("Final secrets", "Distinct Pair Parade", "🎺", "Three adjacent pairs, all showing different numbers.", (d) => d[0] === d[1] && d[2] === d[3] && d[4] === d[5] && new Set([d[0], d[2], d[4]]).size === 3);
    add("Final secrets", "Complement Crown", "👑", "Each mirrored pair adds to seven.", (d) => d[0] + d[5] === 7 && d[1] + d[4] === 7 && d[2] + d[3] === 7);
    add("Final secrets", "Equal Pair Sums", "🎼", "All three adjacent pairs have the same total.", (d) => d[0] + d[1] === d[2] + d[3] && d[2] + d[3] === d[4] + d[5]);

    awards.forEach((award, index) => {
      const matches = matchCounts[index] || 0;
      const tier = tierFor(matches);
      award.matches = matches;
      award.tier = tier.id;
      award.tierLabel = tier.label;
      award.points = tier.points;
      award.color = tier.color;
      award.odds = oddsText(matches);
    });

    return awards;
  }

  function analyze(dice, awards) {
    if (!Array.isArray(dice) || dice.length !== 6 || dice.some((die) => !Number.isInteger(die) || die < 1 || die > 6)) {
      throw new Error("A roll must contain exactly six numbers from 1 to 6.");
    }
    const activeAwards = awards || buildAwards();
    return activeAwards.filter((award) => award.test(dice));
  }

  function computeMatchCounts(awards) {
    const activeAwards = awards || buildAwards([]);
    const matches = Array(activeAwards.length).fill(0);
    const dice = Array(6).fill(1);
    for (let a = 1; a <= 6; a += 1) for (let b = 1; b <= 6; b += 1)
      for (let c = 1; c <= 6; c += 1) for (let d = 1; d <= 6; d += 1)
        for (let e = 1; e <= 6; e += 1) for (let f = 1; f <= 6; f += 1) {
          dice[0] = a; dice[1] = b; dice[2] = c; dice[3] = d; dice[4] = e; dice[5] = f;
          for (let index = 0; index < activeAwards.length; index += 1) {
            if (activeAwards[index].test(dice)) matches[index] += 1;
          }
        }
    return matches;
  }

  return { TOTAL_OUTCOMES, TIER_LIST, buildAwards, analyze, computeMatchCounts, oddsText, tierFor };
});
