import type { QuestDefinition } from "../types";

export const QUESTS: QuestDefinition[] = [
  { id: "collect-10", title: "Make Your First Batch", description: "Earn 10 raw blueberries with multiplication", stat: "blueberriesEarned", target: 10, rewardMoney: 10, rewardBerries: 0 },
  { id: "package-1", title: "First Blueberry Package", description: "Turn 10 raw blueberries into 1 package", stat: "totalPackagesProduced", target: 1, rewardMoney: 10, rewardBerries: 5 },
  { id: "restock-1", title: "Stock the Shop", description: "Move packages from the backroom onto a shelf", stat: "shelfRestockCount", target: 1, rewardMoney: 20, rewardBerries: 5 },
  { id: "sell-1", title: "First Sale", description: "Sell a real blueberry package to a customer", stat: "totalPackagesSold", target: 1, rewardMoney: 25, rewardBerries: 10 },
  { id: "math-5", title: "Perfect Rush", description: "Answer 5 multiplication questions correctly in a row", stat: "bestStreak", target: 5, rewardMoney: 35, rewardBerries: 20 },
  { id: "cashier", title: "Hire a Cashier", description: "Let a cashier run checkout automatically", stat: "cashierLevel", target: 1, rewardMoney: 60, rewardBerries: 15 },
  { id: "queue-3", title: "Build a Customer Line", description: "Make room for 3 customers", stat: "queueCapacity", target: 3, rewardMoney: 75, rewardBerries: 20 },
  { id: "upgrade-5", title: "Growing Business", description: "Buy 5 factory or store upgrades", stat: "upgradesBought", target: 5, rewardMoney: 100, rewardBerries: 30 },
  { id: "sell-100", title: "Neighborhood Favorite", description: "Sell 100 blueberry packages", stat: "totalPackagesSold", target: 100, rewardMoney: 300, rewardBerries: 100 },
  { id: "special-2", title: "Special Delivery", description: "Complete 2 special-order multiplication problems", stat: "specialOrdersCompleted", target: 2, rewardMoney: 200, rewardBerries: 60 },
  { id: "sell-1000", title: "Blueberry Landmark", description: "Sell 1,000 blueberry packages", stat: "totalPackagesSold", target: 1_000, rewardMoney: 1_500, rewardBerries: 250 },
  { id: "factory-20", title: "Factory Power", description: "Reach factory level 20", stat: "factoryLevel", target: 20, rewardMoney: 2_000, rewardBerries: 300 },
  { id: "sell-5000", title: "Berry Empire", description: "Sell 5,000 blueberry packages", stat: "totalPackagesSold", target: 5_000, rewardMoney: 5_000, rewardBerries: 500 },
  { id: "sell-10000", title: "BlueMath Tycoon", description: "Sell 10,000 packages and unlock the golden factory", stat: "totalPackagesSold", target: 10_000, rewardMoney: 10_000, rewardBerries: 1_000 }
];
