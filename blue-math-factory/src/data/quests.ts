import type { QuestDefinition } from "../types";

export const QUESTS: QuestDefinition[] = [
  { id: "math-5", title: "Berry Brain", description: "Answer 5 multiplication questions", stat: "questionsAnswered", target: 5, rewardMoney: 10, rewardBerries: 5 },
  { id: "math-10", title: "Power Starter", description: "Answer 10 multiplication questions", stat: "questionsAnswered", target: 10, rewardMoney: 25, rewardBerries: 20 },
  { id: "streak-5", title: "Factory Spark", description: "Reach a streak of 5", stat: "bestStreak", target: 5, rewardMoney: 55, rewardBerries: 30 },
  { id: "streak-3", title: "On a Roll", description: "Reach a streak of 3", stat: "bestStreak", target: 3, rewardMoney: 15, rewardBerries: 8 },
  { id: "collect-20", title: "Berry Basket", description: "Collect 20 blueberries", stat: "blueberriesEarned", target: 20, rewardMoney: 25, rewardBerries: 10 },
  { id: "sell-5", title: "First Customers", description: "Serve 5 customers", stat: "customersServed", target: 5, rewardMoney: 35, rewardBerries: 5 },
  { id: "upgrade-1", title: "Machine Dreams", description: "Buy your first upgrade", stat: "upgradesBought", target: 1, rewardMoney: 20, rewardBerries: 10 },
  { id: "cashier", title: "Welcome Aboard", description: "Hire a cashier", stat: "cashierLevel", target: 1, rewardMoney: 60, rewardBerries: 15 },
  { id: "money-100", title: "Three Digits", description: "Earn $100 total", stat: "moneyEarned", target: 100, rewardMoney: 50, rewardBerries: 20 },
  { id: "production-5", title: "Berry Stream", description: "Reach 5 automatic raw blueberries per second", stat: "production", target: 5, rewardMoney: 90, rewardBerries: 25 },
  { id: "queue-3", title: "Popular Place", description: "Make room for 3 customers", stat: "queueCapacity", target: 3, rewardMoney: 75, rewardBerries: 20 },
  { id: "streak-7", title: "Math Superstar", description: "Reach a streak of 7", stat: "bestStreak", target: 7, rewardMoney: 150, rewardBerries: 64 },
  { id: "factory-10", title: "Factory Power", description: "Reach factory level 10", stat: "factoryLevel", target: 10, rewardMoney: 250, rewardBerries: 100 },
  { id: "serve-50", title: "Neighborhood Favorite", description: "Serve 50 customers", stat: "customersServed", target: 50, rewardMoney: 300, rewardBerries: 100 },
  { id: "special-2", title: "Special Delivery", description: "Complete 2 special-order multiplication problems", stat: "specialOrdersCompleted", target: 2, rewardMoney: 200, rewardBerries: 60 }
];
