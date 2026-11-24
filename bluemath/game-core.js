(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.BlueberryMath = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = 1;

  const UPGRADES = [
    {
      id: "baskets", zone: "field", name: "Bigger Baskets", emoji: "🧺", baseCost: 8, max: 6, costScale: 1.72,
      desc: "Carry more blueberries home after every correct answer.", effectText: "+1 base berry per answer", effects: { harvestPower: 1 }
    },
    {
      id: "sunnyRows", zone: "field", name: "Sunny Berry Rows", emoji: "🌱", baseCost: 15, max: 5, costScale: 1.78,
      desc: "Plant cheerful bushes that grow berries all by themselves.", effectText: "+0.5 berries per second", effects: { berryRate: 0.5 }
    },
    {
      id: "sprinklers", zone: "field", name: "Dancing Sprinklers", emoji: "💦", baseCost: 36, max: 5, costScale: 1.8,
      desc: "Keep every bush watered with wiggly automatic sprinklers.", effectText: "+1.2 berries per second", effects: { berryRate: 1.2 }, requires: { id: "sunnyRows", level: 1 }
    },
    {
      id: "speedGloves", zone: "field", name: "Lightning Gloves", emoji: "🧤", baseCost: 55, max: 4, costScale: 1.85,
      desc: "Fast answers get an extra handful of blueberries.", effectText: "+2 speed-bonus berries", effects: { speedBonus: 2 }, requires: { id: "baskets", level: 2 }
    },
    {
      id: "beeBuddies", zone: "field", name: "Bee Buddies", emoji: "🐝", baseCost: 90, max: 4, costScale: 1.85,
      desc: "Friendly bees help every blueberry bush grow faster.", effectText: "+2.5 berries per second", effects: { berryRate: 2.5 }, requires: { id: "sprinklers", level: 1 }
    },
    {
      id: "moonBushes", zone: "field", name: "Moonlight Bushes", emoji: "🌙", baseCost: 260, max: 4, costScale: 1.9,
      desc: "Rare silver-leaf bushes keep growing through the night.", effectText: "+7 berries per second", effects: { berryRate: 7 }, requires: { id: "beeBuddies", level: 2 }
    },

    {
      id: "conveyor", zone: "factory", name: "Berry Conveyor", emoji: "🛤️", baseCost: 35, max: 1, costScale: 1,
      desc: "Build your first moving belt and watch berries roll by!", effectText: "+1.5 berries per second", effects: { berryRate: 1.5 }
    },
    {
      id: "speedyBelts", zone: "factory", name: "Speedy Belts", emoji: "⚙️", baseCost: 65, max: 5, costScale: 1.82,
      desc: "Upgrade the belt motors so more berries zip through.", effectText: "+2.2 berries per second", effects: { berryRate: 2.2 }, requires: { id: "conveyor", level: 1 }
    },
    {
      id: "berryWasher", zone: "factory", name: "Bubble Washer", emoji: "🫧", baseCost: 135, max: 4, costScale: 1.85,
      desc: "Wash and polish berries until every one sparkles.", effectText: "+4.5 berries per second", effects: { berryRate: 4.5 }, requires: { id: "speedyBelts", level: 2 }
    },
    {
      id: "sorter", zone: "factory", name: "Rainbow Sorter", emoji: "🌈", baseCost: 260, max: 4, costScale: 1.88,
      desc: "A clever machine sorts the best berries in a flash.", effectText: "+9 berries per second", effects: { berryRate: 9 }, requires: { id: "berryWasher", level: 1 }
    },
    {
      id: "roboPicker", zone: "factory", name: "Robo-Picker 3000", emoji: "🤖", baseCost: 620, max: 4, costScale: 1.92,
      desc: "Your friendly robot picks, packs, and waves to customers.", effectText: "+22 berries per second", effects: { berryRate: 22 }, requires: { id: "sorter", level: 2 }
    },
    {
      id: "megaFactory", zone: "factory", name: "Mega Factory", emoji: "🏭", baseCost: 1800, max: 3, costScale: 2,
      desc: "Add a giant tower and turn the whole valley berry-blue.", effectText: "+65 berries per second", effects: { berryRate: 65 }, requires: { id: "roboPicker", level: 2 }
    },

    {
      id: "priceSign", zone: "store", name: "Fancy Price Sign", emoji: "🏷️", baseCost: 12, max: 6, costScale: 1.75,
      desc: "Show everyone why your hand-picked berries are special.", effectText: "+$0.50 per blueberry", effects: { berryValue: 0.5 }
    },
    {
      id: "storefront", zone: "store", name: "Blueberry Store", emoji: "🏪", baseCost: 50, max: 1, costScale: 1,
      desc: "Replace the tiny stand with a real store and a waiting line.", effectText: "+3 line spaces and more visitors", effects: { queueCap: 3, arrivalRate: 0.25 }
    },
    {
      id: "cashier", zone: "store", name: "Hire a Cashier", emoji: "🧑‍💼", baseCost: 75, max: 1, costScale: 1,
      desc: "Bailey the cashier keeps customers happy and moving.", effectText: "+0.9 customers served per second", effects: { serviceRate: 0.9 }, requires: { id: "storefront", level: 1 }
    },
    {
      id: "lineRopes", zone: "store", name: "Bigger Line", emoji: "🚶", baseCost: 95, max: 5, costScale: 1.78,
      desc: "Make room for more excited customers to join the line.", effectText: "+2 line spaces and more visitors", effects: { queueCap: 2, arrivalRate: 0.12 }, requires: { id: "storefront", level: 1 }
    },
    {
      id: "cashierTraining", zone: "store", name: "Cashier Training", emoji: "🎓", baseCost: 150, max: 5, costScale: 1.82,
      desc: "Teach super-speed scanning and the famous berry greeting.", effectText: "+0.8 customers served per second", effects: { serviceRate: 0.8 }, requires: { id: "cashier", level: 1 }
    },
    {
      id: "familyBoxes", zone: "store", name: "Family Berry Boxes", emoji: "📦", baseCost: 230, max: 4, costScale: 1.85,
      desc: "Customers buy more blueberries in colorful take-home boxes.", effectText: "+1 berry bought per customer", effects: { basketSize: 1 }, requires: { id: "storefront", level: 1 }
    },
    {
      id: "berryCafe", zone: "store", name: "Blueberry Café", emoji: "🧁", baseCost: 420, max: 4, costScale: 1.88,
      desc: "Sell muffins and smoothies that make each berry worth more.", effectText: "+$1.25 per blueberry", effects: { berryValue: 1.25 }, requires: { id: "cashier", level: 1 }
    },
    {
      id: "deliveryVan", zone: "store", name: "Berry Delivery Van", emoji: "🚚", baseCost: 850, max: 4, costScale: 1.92,
      desc: "Deliver big orders all over town without slowing the line.", effectText: "+3 sales/sec and +1 visitor/sec", effects: { serviceRate: 3, arrivalRate: 1 }, requires: { id: "familyBoxes", level: 2 }
    },

    {
      id: "chalkboardAd", zone: "town", name: "Chalkboard Ad", emoji: "🪧", baseCost: 28, max: 5, costScale: 1.75,
      desc: "Draw a giant blueberry to guide hungry neighbors your way.", effectText: "+0.18 visitors per second", effects: { arrivalRate: 0.18 }
    },
    {
      id: "berryMascot", zone: "town", name: "Bouncy Mascot", emoji: "🫐", baseCost: 110, max: 4, costScale: 1.8,
      desc: "Hire a dancing blueberry mascot. The town loves it.", effectText: "+0.45 visitors per second", effects: { arrivalRate: 0.45 }, requires: { id: "chalkboardAd", level: 1 }
    },
    {
      id: "radioAd", zone: "town", name: "Berry Radio Jingle", emoji: "📻", baseCost: 310, max: 4, costScale: 1.86,
      desc: "Play the catchiest blueberry song anyone has ever heard.", effectText: "+1 visitor per second", effects: { arrivalRate: 1 }, requires: { id: "berryMascot", level: 1 }
    },
    {
      id: "festival", zone: "town", name: "Blueberry Festival", emoji: "🎡", baseCost: 780, max: 4, costScale: 1.9,
      desc: "Fill the town square with games, music, and berry treats.", effectText: "+2.2 visitors per second", effects: { arrivalRate: 2.2 }, requires: { id: "radioAd", level: 2 }
    },
    {
      id: "billboard", zone: "town", name: "Sky-High Billboard", emoji: "🌤️", baseCost: 1450, max: 3, costScale: 1.95,
      desc: "Make your blueberry brand visible from the next valley.", effectText: "+4.5 visitors per second", effects: { arrivalRate: 4.5 }, requires: { id: "festival", level: 1 }
    },
    {
      id: "goldenBerry", zone: "town", name: "Golden Berry Brand", emoji: "🏆", baseCost: 3200, max: 1, costScale: 1,
      desc: "Become the most famous berry business in the whole world.", effectText: "Double every blueberry's value", effects: { valueMultiplier: 1 }, requires: { id: "billboard", level: 2 }
    }
  ];

  const UPGRADE_MAP = Object.fromEntries(UPGRADES.map((upgrade) => [upgrade.id, upgrade]));

  const ACHIEVEMENTS = [
    { id: "firstPick", emoji: "🫐", name: "First Pick", hint: "Harvest your first blueberry", reward: { coins: 3 }, rewardText: "+$3", test: (s) => s.totalHarvested >= 1 },
    { id: "hotStreak", emoji: "🔥", name: "Times-Five", hint: "Reach a 5-answer streak", reward: { coins: 7 }, rewardText: "+$7", test: (s) => s.highStreak >= 5 },
    { id: "fullBasket", emoji: "🧺", name: "Full Basket", hint: "Harvest 25 blueberries", reward: { coins: 8 }, rewardText: "+$8", test: (s) => s.totalHarvested >= 25 },
    { id: "beltBuilder", emoji: "⚙️", name: "Belt Builder", hint: "Build the conveyor", reward: { berries: 15 }, rewardText: "+15 berries", test: (s) => (s.owned.conveyor || 0) >= 1 },
    { id: "shopKeeper", emoji: "🏪", name: "Shop Keeper", hint: "Open the Blueberry Store", reward: { coins: 15 }, rewardText: "+$15", test: (s) => (s.owned.storefront || 0) >= 1 },
    { id: "century", emoji: "💯", name: "Berry Century", hint: "Sell 100 blueberries", reward: { coins: 35 }, rewardText: "+$35", test: (s) => s.totalSold >= 100 },
    { id: "robotBoss", emoji: "🤖", name: "Robot Boss", hint: "Build a Robo-Picker", reward: { coins: 80 }, rewardText: "+$80", test: (s) => (s.owned.roboPicker || 0) >= 1 },
    { id: "berryEmpire", emoji: "👑", name: "Berry Empire", hint: "Sell 1,000 blueberries", reward: { coins: 200 }, rewardText: "+$200", test: (s) => s.totalSold >= 1000 }
  ];

  function createState() {
    return {
      version: VERSION,
      coins: 0,
      berries: 0,
      totalHarvested: 0,
      totalSold: 0,
      correctAnswers: 0,
      mathStreak: 0,
      highStreak: 0,
      customerQueue: 0,
      arrivalProgress: 0,
      serviceProgress: 0,
      owned: {},
      achievements: [],
      soundOn: true,
      hasStarted: false,
      lastSaved: Date.now()
    };
  }

  function normaliseState(raw) {
    const clean = createState();
    if (!raw || typeof raw !== "object") return clean;
    const numericKeys = ["coins", "berries", "totalHarvested", "totalSold", "correctAnswers", "mathStreak", "highStreak", "customerQueue", "arrivalProgress", "serviceProgress", "lastSaved"];
    numericKeys.forEach((key) => {
      const value = Number(raw[key]);
      if (Number.isFinite(value) && value >= 0) clean[key] = value;
    });
    clean.soundOn = raw.soundOn !== false;
    clean.hasStarted = raw.hasStarted === true;
    if (raw.owned && typeof raw.owned === "object") {
      UPGRADES.forEach((upgrade) => {
        const level = Math.floor(Number(raw.owned[upgrade.id]));
        if (Number.isFinite(level) && level > 0) clean.owned[upgrade.id] = Math.min(level, upgrade.max);
      });
    }
    if (Array.isArray(raw.achievements)) {
      clean.achievements = [...new Set(raw.achievements.filter((id) => ACHIEVEMENTS.some((item) => item.id === id)))];
    }
    clean.mathStreak = 0;
    return clean;
  }

  function levelOf(state, id) {
    return Math.max(0, Math.floor(Number(state.owned[id]) || 0));
  }

  function costFor(id, level) {
    const upgrade = UPGRADE_MAP[id];
    if (!upgrade) return Infinity;
    return Math.ceil(upgrade.baseCost * Math.pow(upgrade.costScale || 1, Math.max(0, level)));
  }

  function isUnlocked(state, upgrade) {
    if (!upgrade.requires) return true;
    return levelOf(state, upgrade.requires.id) >= upgrade.requires.level;
  }

  function getStats(state) {
    const stats = {
      harvestPower: 1,
      speedBonus: 0,
      berryRate: 0,
      berryValue: 1,
      valueMultiplier: 1,
      arrivalRate: 0.9,
      serviceRate: 0.8,
      queueCap: 1,
      basketSize: 1,
      factoryLevel: 1,
      totalUpgradeLevels: 0
    };

    UPGRADES.forEach((upgrade) => {
      const level = levelOf(state, upgrade.id);
      if (!level) return;
      stats.totalUpgradeLevels += level;
      Object.entries(upgrade.effects).forEach(([key, amount]) => {
        if (key === "valueMultiplier") stats.valueMultiplier += amount * level;
        else stats[key] += amount * level;
      });
    });

    stats.berryValue *= stats.valueMultiplier;
    stats.queueCap = Math.max(1, Math.round(stats.queueCap));
    stats.basketSize = Math.max(1, Math.round(stats.basketSize));
    stats.factoryLevel = 1 + Math.floor(stats.totalUpgradeLevels / 4);
    return stats;
  }

  function buyUpgrade(state, id) {
    const upgrade = UPGRADE_MAP[id];
    if (!upgrade) return { ok: false, reason: "Unknown upgrade" };
    const level = levelOf(state, id);
    if (level >= upgrade.max) return { ok: false, reason: "Already maxed" };
    if (!isUnlocked(state, upgrade)) return { ok: false, reason: "Locked" };
    const cost = costFor(id, level);
    if (state.coins + 1e-8 < cost) return { ok: false, reason: "Not enough coins", cost };
    state.coins -= cost;
    state.owned[id] = level + 1;
    return { ok: true, upgrade, cost, level: level + 1 };
  }

  function randomInt(min, max, rng) {
    return min + Math.floor(rng() * (max - min + 1));
  }

  function createProblem(streak, rng) {
    const random = typeof rng === "function" ? rng : Math.random;
    const safeStreak = Math.max(0, Math.floor(Number(streak) || 0));
    const maxFactor = Math.min(10, 4 + Math.floor(safeStreak / 2));
    const minFactor = safeStreak < 3 ? 1 : Math.max(2, maxFactor - 4);
    const a = randomInt(minFactor, maxFactor, random);
    const b = randomInt(Math.max(1, minFactor - 1), maxFactor, random);
    const answer = a * b;
    const choices = new Set([answer]);
    const guesses = [answer + a, answer - a, answer + b, answer - b, answer + 1, answer - 1, a + b, answer + maxFactor];
    guesses.forEach((guess) => {
      if (choices.size < 4 && guess > 0 && guess <= 100) choices.add(guess);
    });
    let offset = 2;
    while (choices.size < 4) {
      const guess = Math.min(100, Math.max(1, answer + (offset % 2 ? offset : -offset)));
      if (guess !== answer) choices.add(guess);
      offset += 1;
    }
    const shuffled = [...choices];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return { a, b, answer, choices: shuffled, maxFactor };
  }

  function tickEconomy(state, seconds) {
    const elapsed = Math.max(0, Math.min(10, Number(seconds) || 0));
    const stats = getStats(state);
    const result = { produced: 0, sold: 0, revenue: 0, arrived: 0 };
    if (!elapsed) return result;

    result.produced = stats.berryRate * elapsed;
    state.berries += result.produced;

    state.arrivalProgress += stats.arrivalRate * elapsed;
    while (state.arrivalProgress >= 1) {
      state.arrivalProgress -= 1;
      if (state.customerQueue < stats.queueCap) {
        state.customerQueue += 1;
        result.arrived += 1;
      }
    }

    if (state.customerQueue > 0 && state.berries >= 1) {
      state.serviceProgress += stats.serviceRate * elapsed;
    } else {
      state.serviceProgress = Math.min(state.serviceProgress, 0.99);
    }

    while (state.serviceProgress >= 1 && state.customerQueue > 0 && state.berries >= 1) {
      state.serviceProgress -= 1;
      const quantity = Math.min(stats.basketSize, Math.floor(state.berries));
      if (quantity < 1) break;
      const revenue = quantity * stats.berryValue;
      state.berries -= quantity;
      state.coins += revenue;
      state.totalSold += quantity;
      state.customerQueue -= 1;
      result.sold += quantity;
      result.revenue += revenue;
    }

    return result;
  }

  function checkAchievements(state) {
    const earned = new Set(state.achievements || []);
    const newlyEarned = [];
    ACHIEVEMENTS.forEach((achievement) => {
      if (earned.has(achievement.id) || !achievement.test(state)) return;
      earned.add(achievement.id);
      state.achievements.push(achievement.id);
      if (achievement.reward.coins) state.coins += achievement.reward.coins;
      if (achievement.reward.berries) state.berries += achievement.reward.berries;
      newlyEarned.push(achievement);
    });
    return newlyEarned;
  }

  function getMission(state) {
    if (state.totalHarvested < 5) return "Solve multiplication facts to harvest your first berry basket!";
    if (levelOf(state, "baskets") < 1) return "Save $8 for Bigger Baskets—each correct answer will earn more.";
    if (levelOf(state, "sunnyRows") < 1) return "Buy Sunny Berry Rows for automatic blueberry growing.";
    if (levelOf(state, "conveyor") < 1) return "Build the $35 Berry Conveyor and watch your factory come alive!";
    if (levelOf(state, "storefront") < 1) return "Open the $50 Blueberry Store so more customers can line up.";
    if (levelOf(state, "cashier") < 1) return "Hire Bailey the cashier for $75 to speed up every sale.";
    if (state.highStreak < 10) return "Can you reach a ×10 Math Rush streak? Harder factors earn huge hauls!";
    if (levelOf(state, "roboPicker") < 1) return "Keep building toward the Robo-Picker 3000!";
    if (levelOf(state, "goldenBerry") < 1) return "Grow your empire and unlock the legendary Golden Berry Brand.";
    return "You built a world-famous berry empire—keep making it even bigger!";
  }

  function formatNumber(value, money) {
    const number = Math.max(0, Number(value) || 0);
    let text;
    if (number >= 1e9) text = `${(number / 1e9).toFixed(number >= 1e10 ? 0 : 1)}B`;
    else if (number >= 1e6) text = `${(number / 1e6).toFixed(number >= 1e7 ? 0 : 1)}M`;
    else if (number >= 1e3) text = `${(number / 1e3).toFixed(number >= 1e4 ? 0 : 1)}K`;
    else if (Math.abs(number - Math.round(number)) < 0.01) text = String(Math.round(number));
    else text = number.toFixed(1);
    return money ? `$${text}` : text;
  }

  return {
    VERSION,
    UPGRADES,
    UPGRADE_MAP,
    ACHIEVEMENTS,
    createState,
    normaliseState,
    levelOf,
    costFor,
    isUnlocked,
    getStats,
    buyUpgrade,
    createProblem,
    tickEconomy,
    checkAchievements,
    getMission,
    formatNumber
  };
});
