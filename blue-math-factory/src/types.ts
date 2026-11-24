export type SceneKey = "MenuScene" | "HubScene" | "MathChallengeScene" | "FactoryScene" | "StoreScene";

export type UpgradeEffect =
  | "production"
  | "processing"
  | "storage"
  | "value"
  | "global"
  | "delivery"
  | "queue"
  | "arrival"
  | "checkout"
  | "patience"
  | "cashier"
  | "registers"
  | "shelf"
  | "warehouse"
  | "decoration";

export interface MathRequirement {
  kind: "correctAnswers" | "masterFamily";
  value: number;
  family?: number;
}

export interface UpgradeDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: "factory" | "store" | "value";
  effect: UpgradeEffect;
  amount: number;
  baseCost: number;
  growth: number;
  maxLevel: number;
  unlockAt?: number;
  major?: boolean;
  visualChange?: string;
  mathRequirement?: MathRequirement;
}

export interface ProductDefinition {
  id: string;
  name: string;
  emoji: string;
  unlockFactoryLevel: number;
  productionCost: number;
  productionTime: number;
  saleValue: number;
  requiredUpgrade?: string;
}

export interface QuestDefinition {
  id: string;
  title: string;
  description: string;
  stat: keyof GameTotals | "questionsAnswered" | "bestStreak" | "factoryLevel" | "cashierLevel" | "queueCapacity" | "production";
  target: number;
  rewardMoney: number;
  rewardBerries: number;
}

export interface CustomerType {
  id: string;
  name: string;
  color: number;
  accent: number;
  basketSize: number;
  patience: number;
  valueMultiplier: number;
  attraction: number;
  unlockStoreLevel: number;
}

export interface FactStat {
  seen: number;
  correct: number;
  misses: number;
  recent: number;
}

export interface MathStats {
  answered: number;
  correct: number;
  bestStreak: number;
  fastestMs: number | null;
  facts: Record<string, FactStat>;
  recentFacts: string[];
}

export interface GameTotals {
  blueberriesEarned: number;
  moneyEarned: number;
  productsSold: number;
  customersServed: number;
  manualCheckouts: number;
  upgradesBought: number;
  playtimeSeconds: number;
  productsProcessed: number;
  productsDelivered: number;
  customersLost: number;
  specialOrdersCompleted: number;
  mathPowerEarned: number;
  totalPackagesProduced: number;
  totalPackagesSold: number;
  shelfRestockCount: number;
  perfectRushes: number;
}

export interface GameSettings {
  music: number;
  sfx: number;
  muted: boolean;
  reducedMotion: boolean;
  graphicsQuality: "low" | "medium" | "high";
  autoRestock: boolean;
  animationQuality: "reduced" | "full";
}

export interface ShelfInventory {
  shelfId: string;
  capacity: number;
  currentItems: number;
  productType: "blueberry-package";
  restockCost: 10;
}

export interface StoreCustomerState {
  id: number;
  typeId: string;
  phase: "browsing" | "waiting";
  browseSeconds: number;
  patienceSeconds: number;
  targetPackages: number;
  carriedPackages: number;
  shelfId: string | null;
  shoppingProgress: number;
}

export interface JanitorState {
  phase: "idle" | "to-backroom" | "to-shelf" | "restocking" | "returning";
  targetShelfId: string | null;
  progress: number;
  carryingPackages: number;
}

export interface StoreAwayReport {
  customersServed: number;
  productsSold: number;
  moneyEarned: number;
  customersLeft: number;
}

export interface SpecialOrder {
  a: number;
  b: number;
  requiredProducts: number;
  rewardMoney: number;
  createdAt: number;
}

export interface ActiveBoosts {
  productionMultiplier: number;
  productValueMultiplier: number;
  endsAt: number;
  label: string;
}

export interface FactoryState {
  processingProgress: number;
  deliveryProgress: number;
}

export interface StoreState {
  customers: StoreCustomerState[];
  arrivalProgress: number;
  checkoutProgress: number;
  nextCustomerId: number;
  janitor: JanitorState;
}

export interface VictoryState {
  unlocked: boolean;
  celebrated: boolean;
  endlessMode: boolean;
  trophyEarned: boolean;
}

export interface GameSave {
  version: 3;
  createdAt: number;
  savedAt: number;
  lastSimulationAt: number;
  rawBlueberries: number;
  blueberryPackages: number;
  warehousePackages: number;
  storeBackroomPackages: number;
  shelves: ShelfInventory[];
  money: number;
  mathPower: number;
  upgradeLevels: Record<string, number>;
  unlockedProducts: string[];
  selectedProduct: string;
  mathStats: MathStats;
  totals: GameTotals;
  completedQuests: string[];
  claimedQuests: string[];
  settings: GameSettings;
  lastScene: SceneKey;
  factoryState: FactoryState;
  storeState: StoreState;
  awayReport: StoreAwayReport;
  activeBoosts: ActiveBoosts;
  specialOrder: SpecialOrder | null;
  specialOrderCooldownSeconds: number;
  victory: VictoryState;
}

export interface LegacyGameSaveV2 {
  version: 2;
  createdAt: number;
  savedAt: number;
  lastSimulationAt: number;
  rawBlueberries: number;
  processedProducts: number;
  storeInventory: number;
  money: number;
  mathPower: number;
  upgradeLevels: Record<string, number>;
  unlockedProducts: string[];
  selectedProduct: string;
  mathStats: MathStats;
  totals: Partial<GameTotals>;
  completedQuests: string[];
  claimedQuests: string[];
  settings: Partial<GameSettings>;
  lastScene: SceneKey;
  factoryState: FactoryState;
  storeState: Omit<StoreState, "janitor"> & { janitor?: JanitorState };
  awayReport: StoreAwayReport;
  activeBoosts: ActiveBoosts;
  specialOrder: SpecialOrder | null;
  specialOrderCooldownSeconds: number;
}

export interface LegacyGameSaveV1 {
  version: 1;
  createdAt: number;
  savedAt: number;
  blueberries: number;
  products: number;
  money: number;
  upgradeLevels: Record<string, number>;
  unlockedProducts: string[];
  selectedProduct: string;
  mathStats: MathStats;
  totals: Partial<GameTotals>;
  completedQuests: string[];
  claimedQuests: string[];
  settings: Partial<GameSettings>;
  lastScene: SceneKey;
}

export interface MathQuestion {
  a: number;
  b: number;
  answer: number;
  choices: number[];
  key: string;
  duration: number;
  reward: number;
  difficultyLabel: string;
}
