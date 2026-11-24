import type { ProductDefinition } from "../types";

export const PRODUCTS: ProductDefinition[] = [
  { id: "fresh", name: "Fresh Berry Pack", emoji: "🫐", unlockFactoryLevel: 0, productionCost: 10, productionTime: 8, saleValue: 4 },
  { id: "basket", name: "Berry Basket", emoji: "🧺", unlockFactoryLevel: 2, productionCost: 12, productionTime: 9, saleValue: 8, requiredUpgrade: "packing-machine" },
  { id: "box", name: "Blueberry Box", emoji: "📦", unlockFactoryLevel: 4, productionCost: 15, productionTime: 10, saleValue: 12, requiredUpgrade: "packing-machine" },
  { id: "premium", name: "Premium Berries", emoji: "✨", unlockFactoryLevel: 6, productionCost: 18, productionTime: 11, saleValue: 16, requiredUpgrade: "quality-scanner" },
  { id: "jam", name: "Blueberry Jam", emoji: "🫙", unlockFactoryLevel: 8, productionCost: 22, productionTime: 12, saleValue: 24, requiredUpgrade: "premium-line" },
  { id: "muffin", name: "Berry Muffin", emoji: "🧁", unlockFactoryLevel: 10, productionCost: 25, productionTime: 13, saleValue: 30, requiredUpgrade: "premium-line" },
  { id: "smoothie", name: "Blue Smoothie", emoji: "🥤", unlockFactoryLevel: 12, productionCost: 28, productionTime: 13, saleValue: 36, requiredUpgrade: "premium-line" },
  { id: "juice", name: "Blueberry Juice", emoji: "🧃", unlockFactoryLevel: 13, productionCost: 30, productionTime: 14, saleValue: 42, requiredUpgrade: "premium-line" },
  { id: "frozen", name: "Frozen Berries", emoji: "❄️", unlockFactoryLevel: 14, productionCost: 32, productionTime: 14, saleValue: 48, requiredUpgrade: "cold-storage" },
  { id: "pancake", name: "Berry Pancakes", emoji: "🥞", unlockFactoryLevel: 16, productionCost: 36, productionTime: 15, saleValue: 58, requiredUpgrade: "mega-packer" },
  { id: "pie", name: "Blueberry Pie", emoji: "🥧", unlockFactoryLevel: 18, productionCost: 45, productionTime: 16, saleValue: 75, requiredUpgrade: "ultimate-factory" }
];
