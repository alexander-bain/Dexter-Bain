import { PRODUCTS } from "../data/products";
import { ALL_UPGRADES } from "../data/upgrades";
import type { GameSave, UpgradeDefinition } from "../types";
import type { UpgradeSystem } from "../systems/UpgradeSystem";
import { compactNumber } from "./HUD";

export const upgradePanelMarkup = (
  data: GameSave,
  upgrades: UpgradeSystem,
  activeCategory: UpgradeDefinition["category"]
): string => {
  const cards = ALL_UPGRADES.filter((upgrade) => upgrade.category === activeCategory).map((upgrade) => {
    const level = upgrades.level(upgrade.id);
    const cost = upgrades.cost(upgrade);
    const unlocked = upgrades.isUnlocked(upgrade);
    const maxed = level >= upgrade.maxLevel;
    const affordable = data.money >= cost;
    const disabledReason = !unlocked
      ? `Unlocks at ${upgrade.unlockAt} ${activeCategory} levels`
      : maxed
        ? "Maximum level reached"
        : !affordable
          ? `Need $${compactNumber(cost - data.money)} more`
          : "Ready to build";
    return `
      <article class="upgrade-card ${upgrade.major ? "major" : ""} ${!unlocked ? "locked" : ""}">
        <div class="upgrade-icon">${upgrade.emoji}</div>
        <div class="upgrade-copy">
          <div class="upgrade-title"><strong>${upgrade.name}</strong><span>LV ${level}/${upgrade.maxLevel}</span></div>
          <p>${upgrade.description}</p>
          <small>${disabledReason}</small>
        </div>
        <button class="buy-button" data-buy="${upgrade.id}" ${!upgrades.canBuy(upgrade) ? "disabled" : ""}>${maxed ? "MAX" : `$${compactNumber(cost)}`}</button>
      </article>
    `;
  }).join("");

  const productPicker = activeCategory === "factory" ? `
    <section class="product-picker">
      <div><span class="eyebrow">PRODUCTION RECIPE</span><h3>Choose what the packing machines make</h3></div>
      <div class="product-grid">
        ${PRODUCTS.map((product) => {
          const unlocked = data.unlockedProducts.includes(product.id);
          return `<button data-product="${product.id}" class="product-button ${data.selectedProduct === product.id ? "selected" : ""}" ${!unlocked ? "disabled" : ""}><span>${product.emoji}</span><strong>${product.name}</strong><small>${unlocked ? `$${product.saleValue} value` : `Factory LV ${product.unlockFactoryLevel}`}</small></button>`;
        }).join("")}
      </div>
    </section>` : "";

  return `
    <div class="panel-backdrop">
      <section class="upgrade-panel" role="dialog" aria-modal="true" aria-label="Business upgrades">
        <header class="panel-header">
          <div><span class="eyebrow">BUILD YOUR BUSINESS</span><h2>Upgrade Workshop</h2></div>
          <div class="panel-money">💰 $${compactNumber(data.money)}</div>
          <button class="close-button" data-action="close-panel" aria-label="Close upgrades">×</button>
        </header>
        <nav class="tab-row" aria-label="Upgrade types">
          <button data-tab="factory" class="${activeCategory === "factory" ? "active" : ""}">⚙️ Factory</button>
          <button data-tab="store" class="${activeCategory === "store" ? "active" : ""}">🏪 Store</button>
          <button data-tab="value" class="${activeCategory === "value" ? "active" : ""}">⭐ Berry Value</button>
        </nav>
        <div class="panel-scroll">${productPicker}<div class="upgrade-grid">${cards}</div></div>
      </section>
    </div>
  `;
};
