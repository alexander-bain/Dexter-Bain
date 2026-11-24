import type { UpgradeDefinition } from "../types";

const factory = (upgrade: Omit<UpgradeDefinition, "category">): UpgradeDefinition => ({ ...upgrade, category: "factory" });
const store = (upgrade: Omit<UpgradeDefinition, "category">): UpgradeDefinition => ({ ...upgrade, category: "store" });
const value = (upgrade: Omit<UpgradeDefinition, "category">): UpgradeDefinition => ({ ...upgrade, category: "value" });

export const FACTORY_UPGRADES: UpgradeDefinition[] = [
  factory({ id: "starter-conveyor", name: "Starter Conveyor", emoji: "⚙️", description: "Starts automatic berry production and gets the belt moving.", effect: "production", amount: 0.65, baseCost: 10, growth: 2.05, maxLevel: 1, major: true }),
  factory({ id: "faster-conveyor", name: "Faster Conveyor", emoji: "⏩", description: "Berries travel through the workshop faster.", effect: "production", amount: 0.55, baseCost: 18, growth: 1.55, maxLevel: 10 }),
  factory({ id: "bush-expansion", name: "Bush Expansion", emoji: "🌿", description: "Adds healthy blueberry bushes beside the factory.", effect: "production", amount: 0.8, baseCost: 24, growth: 1.58, maxLevel: 10 }),
  factory({ id: "automatic-picker", name: "Automatic Picker", emoji: "🦾", description: "A gentle picker gathers ripe berries all day.", effect: "production", amount: 1.4, baseCost: 45, growth: 1.68, maxLevel: 6, unlockAt: 2, major: true }),
  factory({ id: "berry-washer", name: "Berry Washer", emoji: "💦", description: "Sparkling clean berries are worth more.", effect: "value", amount: 0.1, baseCost: 58, growth: 1.62, maxLevel: 5, unlockAt: 3, major: true }),
  factory({ id: "smart-sorter", name: "Smart Sorter", emoji: "🔎", description: "Sorts the best berries into every package.", effect: "value", amount: 0.12, baseCost: 80, growth: 1.67, maxLevel: 5, unlockAt: 4, major: true }),
  factory({ id: "packing-machine", name: "Faster Packing Machine", emoji: "📦", description: "Cuts one package cycle from 8 seconds to about 6 seconds at Level 1.", effect: "processing", amount: 2.5, baseCost: 95, growth: 1.72, maxLevel: 6, unlockAt: 5, major: true }),
  factory({ id: "extra-conveyor", name: "Extra Conveyor Line", emoji: "➿", description: "Raises packing speed from about 8 to 12 packages per minute at Level 1.", effect: "processing", amount: 4, baseCost: 180, growth: 1.9, maxLevel: 3, unlockAt: 7, major: true }),
  factory({ id: "batch-hopper", name: "Batch Hopper", emoji: "🫐", description: "Feeds measured groups of 10 raw blueberries into the packing line.", effect: "processing", amount: 1.5, baseCost: 150, growth: 1.72, maxLevel: 5, unlockAt: 6, major: true }),
  factory({ id: "warehouse-expansion", name: "Warehouse Expansion", emoji: "🏭", description: "Adds room for 25 more finished blueberry packages.", effect: "warehouse", amount: 25, baseCost: 220, growth: 1.7, maxLevel: 8, unlockAt: 7, major: true }),
  factory({ id: "cold-storage", name: "Cold Storage", emoji: "❄️", description: "Keeps a much larger berry supply fresh.", effect: "storage", amount: 120, baseCost: 125, growth: 1.65, maxLevel: 10, unlockAt: 5, major: true }),
  factory({ id: "quality-scanner", name: "Quality Scanner", emoji: "✨", description: "Raises the value of every blueberry product.", effect: "value", amount: 0.18, baseCost: 230, growth: 1.72, maxLevel: 5, unlockAt: 8, major: true }),
  factory({ id: "drone-harvester", name: "Drone Harvester", emoji: "🚁", description: "Tiny drones gather berries at super speed.", effect: "production", amount: 5, baseCost: 450, growth: 1.82, maxLevel: 5, unlockAt: 10, major: true, mathRequirement: { kind: "correctAnswers", value: 80 } }),
  factory({ id: "factory-robots", name: "Factory Robots", emoji: "🤖", description: "Friendly robots boost production and packing.", effect: "global", amount: 0.12, baseCost: 750, growth: 1.9, maxLevel: 5, unlockAt: 12, major: true }),
  factory({ id: "solar-power", name: "Solar Power", emoji: "☀️", description: "Clean power makes every machine more efficient.", effect: "global", amount: 0.09, baseCost: 920, growth: 1.82, maxLevel: 4, unlockAt: 14, major: true }),
  factory({ id: "mega-packer", name: "Mega Packing Machine", emoji: "🏗️", description: "Packs several blueberry products at once.", effect: "processing", amount: 3.5, baseCost: 1_400, growth: 1.9, maxLevel: 4, unlockAt: 16, major: true, mathRequirement: { kind: "masterFamily", value: 10, family: 6 } }),
  factory({ id: "smart-computer", name: "Smart Factory Computer", emoji: "🖥️", description: "Tunes every machine for a full factory boost.", effect: "global", amount: 0.15, baseCost: 2_100, growth: 1.92, maxLevel: 4, unlockAt: 18, major: true }),
  factory({ id: "delivery-truck", name: "Delivery Truck", emoji: "🚚", description: "Moves more finished products to the store.", effect: "delivery", amount: 2, baseCost: 1_100, growth: 1.78, maxLevel: 5, unlockAt: 14, major: true }),
  factory({ id: "truck-fleet", name: "Truck Fleet", emoji: "🚛", description: "Adds a parade of animated delivery trucks.", effect: "delivery", amount: 5, baseCost: 3_000, growth: 1.95, maxLevel: 3, unlockAt: 20, major: true }),
  factory({ id: "giant-silo", name: "Giant Blueberry Silo", emoji: "🏢", description: "Stores a mountain of fresh blueberries.", effect: "storage", amount: 600, baseCost: 2_500, growth: 1.82, maxLevel: 5, unlockAt: 18, major: true }),
  factory({ id: "premium-line", name: "Premium Product Line", emoji: "👑", description: "Unlocks jam, muffins, smoothies, and more.", effect: "processing", amount: 2.2, baseCost: 4_500, growth: 2, maxLevel: 3, unlockAt: 22, major: true }),
  factory({ id: "ultimate-factory", name: "Ultimate Blue Factory", emoji: "🏰", description: "Transforms the workshop into a blueberry landmark.", effect: "global", amount: 0.5, baseCost: 15_000, growth: 2.5, maxLevel: 1, unlockAt: 30, major: true })
];

export const STORE_UPGRADES: UpgradeDefinition[] = [
  store({ id: "extra-shelf", name: "Extra Shelf", emoji: "🗄️", description: "Adds one visible shelf with room for 10 fresh blueberries.", effect: "shelf", amount: 10, baseCost: 14, growth: 1.55, maxLevel: 6, major: true }),
  store({ id: "better-display", name: "Better Berry Display", emoji: "🫐", description: "Makes each fresh blueberry display more valuable.", effect: "value", amount: 0.06, baseCost: 25, growth: 1.6, maxLevel: 5 }),
  store({ id: "queue-ropes", name: "Queue Ropes", emoji: "➰", description: "Makes space for another waiting customer.", effect: "queue", amount: 1, baseCost: 35, growth: 1.72, maxLevel: 5, major: true }),
  store({ id: "longer-line", name: "Longer Customer Line", emoji: "👥", description: "Adds more organized waiting space.", effect: "queue", amount: 1, baseCost: 70, growth: 1.78, maxLevel: 4, unlockAt: 2, major: true }),
  store({ id: "bigger-entrance", name: "Bigger Entrance", emoji: "🚪", description: "More customers notice and enter the store.", effect: "arrival", amount: 0.1, baseCost: 55, growth: 1.7, maxLevel: 5, unlockAt: 2, major: true }),
  store({ id: "hire-cashier", name: "Hire Cashier", emoji: "🧑‍💼", description: "Automatically serves the next customer.", effect: "cashier", amount: 1, baseCost: 85, growth: 2.4, maxLevel: 1, unlockAt: 3, major: true }),
  store({ id: "hire-janitor", name: "Hire Janitor + Stocker", emoji: "🧹", description: "Uses your math blueberries to refill shelves that reach 25% or lower.", effect: "decoration", amount: 1, baseCost: 120, growth: 2, maxLevel: 1, unlockAt: 4, major: true }),
  store({ id: "backroom-expansion", name: "Backroom Expansion", emoji: "🚪", description: "Stores 50 more delivered packages behind the shop.", effect: "warehouse", amount: 50, baseCost: 165, growth: 1.72, maxLevel: 6, unlockAt: 5, major: true }),
  store({ id: "faster-cashier", name: "Faster Checkout", emoji: "⚡", description: "The cashier rings up orders more quickly.", effect: "checkout", amount: 0.12, baseCost: 110, growth: 1.65, maxLevel: 8, unlockAt: 4 }),
  store({ id: "friendly-service", name: "Friendly Service", emoji: "😊", description: "A warm welcome gives every customer more patience.", effect: "patience", amount: 0.1, baseCost: 145, growth: 1.62, maxLevel: 5, unlockAt: 5 }),
  store({ id: "experienced-cashier", name: "Experienced Cashier", emoji: "🎓", description: "Practice makes every checkout quicker.", effect: "checkout", amount: 0.12, baseCost: 260, growth: 1.7, maxLevel: 4, unlockAt: 7 }),
  store({ id: "expert-cashier", name: "Expert Cashier", emoji: "🏅", description: "An expert handles even big orders at top speed.", effect: "checkout", amount: 0.18, baseCost: 750, growth: 1.82, maxLevel: 3, unlockAt: 12, major: true }),
  store({ id: "second-cashier", name: "Second Cashier", emoji: "👥", description: "A second cashier staffs another available register.", effect: "cashier", amount: 1, baseCost: 1_250, growth: 2, maxLevel: 1, unlockAt: 16, major: true }),
  store({ id: "third-cashier", name: "Third Cashier", emoji: "👥", description: "A third cashier staffs the final available register.", effect: "cashier", amount: 1, baseCost: 4_500, growth: 2, maxLevel: 1, unlockAt: 24, major: true }),
  store({ id: "self-checkout", name: "Self-Checkout", emoji: "🤳", description: "Shoppers can quickly ring up simple orders themselves.", effect: "checkout", amount: 0.2, baseCost: 6_500, growth: 1.9, maxLevel: 3, unlockAt: 28, major: true }),
  store({ id: "smart-checkout", name: "Smart Checkout System", emoji: "🧠", description: "Smart routing boosts the whole store operation.", effect: "global", amount: 0.12, baseCost: 12_000, growth: 2, maxLevel: 2, unlockAt: 34, major: true }),
  store({ id: "second-register", name: "Second Register", emoji: "2️⃣", description: "Two customers can be served at once.", effect: "registers", amount: 1, baseCost: 500, growth: 2, maxLevel: 1, unlockAt: 8, major: true }),
  store({ id: "third-register", name: "Third Register", emoji: "3️⃣", description: "Adds a third checkout counter.", effect: "registers", amount: 1, baseCost: 2_400, growth: 2, maxLevel: 1, unlockAt: 15, major: true }),
  store({ id: "decorations", name: "Store Decorations", emoji: "🎈", description: "Flowers and banners make shoppers smile.", effect: "patience", amount: 0.08, baseCost: 90, growth: 1.58, maxLevel: 5, major: true }),
  store({ id: "blueberry-sign", name: "Blueberry Sign", emoji: "🪧", description: "A bright berry sign brings in customers.", effect: "arrival", amount: 0.08, baseCost: 125, growth: 1.7, maxLevel: 3, unlockAt: 5, major: true }),
  store({ id: "neon-sign", name: "Neon Sign", emoji: "💡", description: "The store glows from across the hub.", effect: "arrival", amount: 0.14, baseCost: 380, growth: 1.75, maxLevel: 3, unlockAt: 9, major: true }),
  store({ id: "samples", name: "Product Samples", emoji: "🥄", description: "Tasty samples lead to bigger baskets.", effect: "value", amount: 0.08, baseCost: 170, growth: 1.68, maxLevel: 5, unlockAt: 6 }),
  store({ id: "seating", name: "Customer Seating", emoji: "🛋️", description: "Comfy customers wait much longer.", effect: "patience", amount: 0.15, baseCost: 210, growth: 1.7, maxLevel: 4, unlockAt: 7, major: true }),
  store({ id: "premium-display", name: "Premium Display", emoji: "💎", description: "Shows off your fanciest blueberry products.", effect: "value", amount: 0.15, baseCost: 420, growth: 1.77, maxLevel: 4, unlockAt: 10, major: true }),
  store({ id: "music-system", name: "Music System", emoji: "🎵", description: "Cheerful tunes improve customer patience.", effect: "patience", amount: 0.1, baseCost: 300, growth: 1.65, maxLevel: 4, unlockAt: 8 }),
  store({ id: "better-lighting", name: "Better Lighting", emoji: "🌟", description: "Warm lights make products sparkle.", effect: "arrival", amount: 0.07, baseCost: 360, growth: 1.68, maxLevel: 4, unlockAt: 9 }),
  store({ id: "advertising", name: "Advertising Sign", emoji: "📣", description: "Spreads the word around town.", effect: "arrival", amount: 0.15, baseCost: 650, growth: 1.8, maxLevel: 5, unlockAt: 12, major: true }),
  store({ id: "parking", name: "Parking Lot", emoji: "🅿️", description: "Makes room for groups of shoppers.", effect: "arrival", amount: 0.18, baseCost: 1_100, growth: 1.85, maxLevel: 3, unlockAt: 14, major: true }),
  store({ id: "delivery-orders", name: "Delivery Orders", emoji: "🛵", description: "Sells extra products between store visits.", effect: "checkout", amount: 0.15, baseCost: 1_500, growth: 1.9, maxLevel: 4, unlockAt: 16, major: true }),
  store({ id: "online-orders", name: "Online Orders", emoji: "💻", description: "Customers order blueberry treats from home.", effect: "checkout", amount: 0.18, baseCost: 2_500, growth: 1.9, maxLevel: 4, unlockAt: 18, major: true }),
  store({ id: "store-expansion", name: "Store Expansion", emoji: "🏪", description: "Adds floor space, displays, and brighter walls.", effect: "queue", amount: 2, baseCost: 3_200, growth: 2, maxLevel: 3, unlockAt: 20, major: true }),
  store({ id: "supermarket", name: "Supermarket Upgrade", emoji: "🛒", description: "Transforms the shop into a busy market.", effect: "global", amount: 0.18, baseCost: 8_000, growth: 2.2, maxLevel: 2, unlockAt: 26, major: true }),
  store({ id: "megastore", name: "Blueberry Megastore", emoji: "🏬", description: "The ultimate destination for blueberry fans.", effect: "global", amount: 0.45, baseCost: 22_000, growth: 2.5, maxLevel: 1, unlockAt: 34, major: true })
];

export const VALUE_UPGRADES: UpgradeDefinition[] = [
  value({ id: "better-baskets", name: "Better Baskets", emoji: "🧺", description: "Sturdy baskets make every sale worth more.", effect: "value", amount: 0.15, baseCost: 20, growth: 1.65, maxLevel: 5 }),
  value({ id: "better-packaging", name: "Better Packaging", emoji: "🎁", description: "Colorful packaging raises product value.", effect: "value", amount: 0.16, baseCost: 55, growth: 1.68, maxLevel: 5 }),
  value({ id: "branded-boxes", name: "Branded Boxes", emoji: "📦", description: "Customers recognize your blueberry brand.", effect: "value", amount: 0.2, baseCost: 120, growth: 1.72, maxLevel: 4 }),
  value({ id: "freshness", name: "Freshness Guarantee", emoji: "✅", description: "A fresh-or-free promise builds trust.", effect: "value", amount: 0.22, baseCost: 250, growth: 1.75, maxLevel: 4 }),
  value({ id: "organic", name: "Organic Label", emoji: "🌱", description: "Carefully grown berries earn a premium.", effect: "value", amount: 0.25, baseCost: 500, growth: 1.8, maxLevel: 4 }),
  value({ id: "premium-label", name: "Premium Label", emoji: "🏅", description: "Marks your very best blueberry products.", effect: "value", amount: 0.3, baseCost: 900, growth: 1.85, maxLevel: 4 }),
  value({ id: "local-ads", name: "Local Advertising", emoji: "📰", description: "The whole town learns your story.", effect: "value", amount: 0.35, baseCost: 1_700, growth: 1.88, maxLevel: 3 }),
  value({ id: "product-quality", name: "Better Product Quality", emoji: "⭐", description: "Perfect recipes make products more valuable.", effect: "value", amount: 0.4, baseCost: 3_000, growth: 1.9, maxLevel: 3 }),
  value({ id: "secret-recipe", name: "Secret Berry Recipe", emoji: "📜", description: "A special recipe customers cannot resist.", effect: "value", amount: 0.55, baseCost: 6_000, growth: 2, maxLevel: 2 }),
  value({ id: "famous-brand", name: "Famous Blueberry Brand", emoji: "🌎", description: "Your blueberry name is known everywhere.", effect: "value", amount: 1, baseCost: 15_000, growth: 2.5, maxLevel: 1, major: true })
];

export const ALL_UPGRADES = [...FACTORY_UPGRADES, ...STORE_UPGRADES, ...VALUE_UPGRADES];
export const UPGRADE_BY_ID = Object.fromEntries(ALL_UPGRADES.map((upgrade) => [upgrade.id, upgrade])) as Record<string, UpgradeDefinition>;
