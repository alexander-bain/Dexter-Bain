import type { ProductDefinition } from "../types";

export const PRODUCTS: ProductDefinition[] = [
  { id: "fresh", name: "Fresh Blueberries", emoji: "🫐", unlockFactoryLevel: 0, productionCost: 1, productionTime: 1, saleValue: 2 },
  { id: "basket", name: "Berry Basket", emoji: "🧺", unlockFactoryLevel: 2, productionCost: 3, productionTime: 2, saleValue: 8, requiredUpgrade: "packing-machine" },
  { id: "box", name: "Blueberry Box", emoji: "📦", unlockFactoryLevel: 4, productionCost: 5, productionTime: 3, saleValue: 15, requiredUpgrade: "packing-machine" },
  { id: "premium", name: "Premium Berries", emoji: "✨", unlockFactoryLevel: 6, productionCost: 4, productionTime: 4, saleValue: 18, requiredUpgrade: "quality-scanner" },
  { id: "jam", name: "Blueberry Jam", emoji: "🫙", unlockFactoryLevel: 8, productionCost: 7, productionTime: 5, saleValue: 32, requiredUpgrade: "premium-line" },
  { id: "muffin", name: "Berry Muffin", emoji: "🧁", unlockFactoryLevel: 10, productionCost: 8, productionTime: 6, saleValue: 40, requiredUpgrade: "premium-line" },
  { id: "smoothie", name: "Blue Smoothie", emoji: "🥤", unlockFactoryLevel: 12, productionCost: 10, productionTime: 6, saleValue: 55, requiredUpgrade: "premium-line" },
  { id: "juice", name: "Blueberry Juice", emoji: "🧃", unlockFactoryLevel: 13, productionCost: 11, productionTime: 6, saleValue: 62, requiredUpgrade: "premium-line" },
  { id: "frozen", name: "Frozen Berries", emoji: "❄️", unlockFactoryLevel: 14, productionCost: 12, productionTime: 7, saleValue: 70, requiredUpgrade: "cold-storage" },
  { id: "pancake", name: "Berry Pancakes", emoji: "🥞", unlockFactoryLevel: 16, productionCost: 14, productionTime: 8, saleValue: 88, requiredUpgrade: "mega-packer" },
  { id: "pie", name: "Blueberry Pie", emoji: "🥧", unlockFactoryLevel: 18, productionCost: 18, productionTime: 9, saleValue: 120, requiredUpgrade: "ultimate-factory" }
];
