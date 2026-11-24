import { PRODUCTS } from "../data/products";
import { ALL_UPGRADES } from "../data/upgrades";
import { session } from "../systems/GameSession";
import type { EconomySnapshot } from "../systems/EconomySystem";
import type { GameSave, UpgradeDefinition } from "../types";
import type { UpgradeSystem } from "../systems/UpgradeSystem";
import { compactNumber } from "./HUD";

interface EffectCopy { current: string; next: string; difference: string; }

const number = (value: number, digits = 2) => value.toFixed(digits).replace(/\.?0+$/, "");

const visualChange = (upgrade: UpgradeDefinition): string => {
  const exact: Record<string, string> = {
    "starter-conveyor": "Starts the main belt and its moving berries",
    "automatic-picker": "Adds the green automatic picker",
    "berry-washer": "Adds a washer with animated bubbles",
    "smart-sorter": "Adds the sorter and moving scanner beam",
    "packing-machine": "Adds the orange packing machine",
    "extra-conveyor": "Adds a second moving conveyor with packages",
    "cold-storage": "Makes the visible cold-storage room larger",
    "quality-scanner": "Adds the pink quality scanner",
    "drone-harvester": "Adds flying harvester drones",
    "factory-robots": "Adds robot workers to the floor",
    "solar-power": "Adds roof solar panels",
    "mega-packer": "Adds the giant packing machine",
    "delivery-truck": "Adds a moving delivery truck",
    "truck-fleet": "Shows three moving delivery trucks",
    "giant-silo": "Adds a giant blueberry silo",
    "ultimate-factory": "Adds the Ultimate Blue Factory transformation",
    "extra-shelf": "Adds another fully visible product shelf",
    "better-display": "Makes every visible shelf physically larger",
    "queue-ropes": "Adds gold-and-red queue barriers",
    "bigger-entrance": "Changes the entrance into a grand entrance",
    "hire-cashier": "Places a cashier behind the register",
    "second-register": "Adds a second checkout counter",
    "third-register": "Adds a third checkout counter",
    "second-cashier": "Opens another staffed checkout station",
    "third-cashier": "Opens a third staffed checkout station",
    "decorations": "Adds plants and colorful store decorations",
    "neon-sign": "Adds an animated neon blueberry sign",
    "seating": "Adds customer benches",
    "premium-display": "Adds a glowing premium-product table",
    "music-system": "Adds visible wall speakers",
    "better-lighting": "Adds warm ceiling lights and floor glow",
    "store-expansion": "Expands the bright sales floor",
    "megastore": "Transforms the title and finish into a megastore"
  };
  if (exact[upgrade.id]) return exact[upgrade.id];
  if (upgrade.category === "value") return "Updates every visible shelf price sign";
  if (upgrade.category === "store") return "Updates the store level styling and live status panels";
  if (upgrade.effect === "production" || upgrade.effect === "processing") return "Makes the moving factory line visibly faster and fuller";
  return "Updates the factory level styling and live status panels";
};

const effectCopy = (upgrade: UpgradeDefinition, current: EconomySnapshot, next: EconomySnapshot, maxed: boolean): EffectCopy => {
  const make = (before: number, after: number, label: string, formatter = (value: number) => number(value)) => ({
    current: `${formatter(before)} ${label}`,
    next: maxed ? "Maximum level" : `${formatter(after)} ${label}`,
    difference: maxed ? "MAXIMUM LEVEL" : `${after >= before ? "+" : ""}${formatter(after - before)} ${label}`
  });
  if (upgrade.id === "extra-shelf" || upgrade.id === "better-display") return make(current.shelfCapacity, next.shelfCapacity, "shelf spaces", (value) => number(value, 0));
  if (upgrade.id === "extra-conveyor") return make(current.processingRate, next.processingRate, "packages/min");
  if (upgrade.effect === "production") return make(current.productionRate, next.productionRate, "raw blueberries/sec");
  if (upgrade.effect === "processing") return make(current.processingRate, next.processingRate, "packages/min");
  if (upgrade.effect === "storage") return make(current.rawStorageCapacity, next.rawStorageCapacity, "raw-berry capacity", (value) => number(value, 0));
  if (upgrade.effect === "value") return make(current.productValue, next.productValue, "per product", (value) => `$${number(value, 2)}`);
  if (upgrade.effect === "delivery") return make(current.deliveryRate, next.deliveryRate, "products/min to store");
  if (upgrade.effect === "queue") return make(current.queueCapacity, next.queueCapacity, "customer spaces", (value) => number(value, 0));
  if (upgrade.effect === "arrival") {
    return { current: `1 customer every ${number(current.arrivalSeconds)} sec`, next: maxed ? "Maximum level" : `1 customer every ${number(next.arrivalSeconds)} sec`, difference: maxed ? "MAXIMUM LEVEL" : `-${number(current.arrivalSeconds - next.arrivalSeconds)} sec between arrivals` };
  }
  if (upgrade.effect === "checkout") {
    return { current: `1 checkout every ${number(current.checkoutSeconds)} sec`, next: maxed ? "Maximum level" : `1 checkout every ${number(next.checkoutSeconds)} sec`, difference: maxed ? "MAXIMUM LEVEL" : `-${number(current.checkoutSeconds - next.checkoutSeconds)} sec per checkout` };
  }
  if (upgrade.effect === "patience") return make(current.patienceSeconds, next.patienceSeconds, "seconds patience");
  if (upgrade.effect === "cashier") return make(current.cashierLevel, next.cashierLevel, "hired cashier", (value) => number(value, 0));
  if (upgrade.effect === "registers") return make(current.registers, next.registers, "checkout lanes", (value) => number(value, 0));
  if (upgrade.effect === "global") return {
    current: `${number(current.processingRate)} packages/min · ${number(current.productionRate)} raw/sec`,
    next: maxed ? "Maximum level" : `${number(next.processingRate)} packages/min · ${number(next.productionRate)} raw/sec`,
    difference: maxed ? "MAXIMUM LEVEL" : `+${number(next.processingRate - current.processingRate)} packages/min · +${number(next.productionRate - current.productionRate)} raw/sec`
  };
  return make(current.processingRate, next.processingRate, "packages/min");
};

export const upgradePanelMarkup = (data: GameSave, upgrades: UpgradeSystem, activeCategory: UpgradeDefinition["category"]): string => {
  const cards = ALL_UPGRADES.filter((upgrade) => upgrade.category === activeCategory).map((upgrade) => {
    const level = upgrades.level(upgrade.id);
    const cost = upgrades.cost(upgrade);
    const categoryUnlocked = upgrades.categoryLevel(upgrade.category) >= (upgrade.unlockAt ?? 0);
    const mathUnlocked = upgrades.meetsMathRequirement(upgrade);
    const unlocked = categoryUnlocked && mathUnlocked;
    const maxed = level >= upgrade.maxLevel;
    const affordable = data.money >= cost;
    const current = session.economy.snapshot();
    const next = session.economy.snapshot({ [upgrade.id]: Math.min(upgrade.maxLevel, level + 1) });
    const copy = effectCopy(upgrade, current, next, maxed);
    const mathRequirement = upgrades.requirementLabel(upgrade);
    const unlockCondition = [upgrade.unlockAt ? `${upgrade.unlockAt} ${activeCategory} levels` : "Available now", mathRequirement].filter(Boolean).join(" · ");
    const disabledReason = !categoryUnlocked ? `Reach ${upgrade.unlockAt} ${activeCategory} levels` : !mathUnlocked ? mathRequirement! : maxed ? "Maximum level reached" : !affordable ? `Need $${compactNumber(cost - data.money)} more` : "Ready to build";
    return `
      <article class="upgrade-card ${upgrade.major ? "major" : ""} ${!unlocked ? "locked" : ""}">
        <div class="upgrade-icon">${upgrade.emoji}</div>
        <div class="upgrade-copy">
          <div class="upgrade-title"><strong>${upgrade.name}</strong><span>LV ${level}/${upgrade.maxLevel}</span></div>
          <div class="effect-grid"><span>CURRENT</span><strong>${copy.current}</strong><span>AFTER</span><strong>${copy.next}</strong></div>
          <p class="exact-effect">${copy.difference}</p>
          <p class="visual-effect"><b>Visual:</b> ${visualChange(upgrade)}</p>
          <small><b>Unlock:</b> ${unlockCondition} · ${disabledReason}</small>
        </div>
        <button class="buy-button" data-buy="${upgrade.id}" ${!upgrades.canBuy(upgrade) ? "disabled" : ""}>${maxed ? "MAX" : `$${compactNumber(cost)}`}</button>
      </article>`;
  }).join("");

  const productPicker = activeCategory === "factory" ? `
    <section class="product-picker">
      <div><span class="eyebrow">PRODUCTION RECIPE</span><h3>Choose what the packing machines make</h3><p>Every package consumes real raw blueberries.</p></div>
      <div class="product-grid">
        ${PRODUCTS.map((product) => {
          const unlocked = data.unlockedProducts.includes(product.id);
          return `<button data-product="${product.id}" class="product-button ${data.selectedProduct === product.id ? "selected" : ""}" ${!unlocked ? "disabled" : ""}><span>${product.emoji}</span><strong>${product.name}</strong><small>${unlocked ? `${product.productionCost} raw → 1 · $${product.saleValue}` : `Factory LV ${product.unlockFactoryLevel}`}</small></button>`;
        }).join("")}
      </div>
    </section>` : "";

  return `
    <div class="panel-backdrop">
      <section class="upgrade-panel" role="dialog" aria-modal="true" aria-label="Business upgrades">
        <header class="panel-header"><div><span class="eyebrow">EXACT NUMBERS · VISIBLE BUILDS</span><h2>Upgrade Workshop</h2></div><div class="panel-money">💰 $${compactNumber(data.money)}</div><button class="close-button" data-action="close-panel" aria-label="Close upgrades">×</button></header>
        <nav class="tab-row" aria-label="Upgrade types"><button data-tab="factory" class="${activeCategory === "factory" ? "active" : ""}">⚙️ Factory</button><button data-tab="store" class="${activeCategory === "store" ? "active" : ""}">🏪 Store</button><button data-tab="value" class="${activeCategory === "value" ? "active" : ""}">⭐ Product Value</button></nav>
        <div class="panel-scroll">${productPicker}<div class="upgrade-grid">${cards}</div></div>
      </section>
    </div>`;
};
