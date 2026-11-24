import { ALL_UPGRADES, UPGRADE_BY_ID } from "../data/upgrades";
import type { GameSave, UpgradeDefinition, UpgradeEffect } from "../types";

export class UpgradeSystem {
  constructor(private readonly data: GameSave) {}

  level(id: string): number {
    return this.data.upgradeLevels[id] ?? 0;
  }

  cost(upgrade: UpgradeDefinition): number {
    return Math.ceil(upgrade.baseCost * upgrade.growth ** this.level(upgrade.id));
  }

  categoryLevel(category: UpgradeDefinition["category"]): number {
    return ALL_UPGRADES.filter((upgrade) => upgrade.category === category).reduce((sum, upgrade) => sum + this.level(upgrade.id), 0);
  }

  isUnlocked(upgrade: UpgradeDefinition): boolean {
    return this.categoryLevel(upgrade.category) >= (upgrade.unlockAt ?? 0) && this.meetsMathRequirement(upgrade);
  }

  canBuy(upgrade: UpgradeDefinition): boolean {
    return this.isUnlocked(upgrade) && this.level(upgrade.id) < upgrade.maxLevel && this.data.money >= this.cost(upgrade);
  }

  buy(id: string): { ok: boolean; message: string; cost: number } {
    const upgrade = UPGRADE_BY_ID[id];
    if (!upgrade) return { ok: false, message: "That upgrade does not exist.", cost: 0 };
    const cost = this.cost(upgrade);
    if (this.categoryLevel(upgrade.category) < (upgrade.unlockAt ?? 0)) return { ok: false, message: `Reach ${upgrade.unlockAt} ${upgrade.category} levels first.`, cost };
    if (!this.meetsMathRequirement(upgrade)) return { ok: false, message: this.requirementLabel(upgrade) ?? "Keep practicing multiplication to unlock this.", cost };
    if (this.level(id) >= upgrade.maxLevel) return { ok: false, message: "Already at the maximum level!", cost };
    if (this.data.money < cost) return { ok: false, message: `You need $${Math.ceil(cost - this.data.money).toLocaleString()} more.`, cost };
    this.data.money -= cost;
    this.data.upgradeLevels[id] = this.level(id) + 1;
    this.data.totals.upgradesBought += 1;
    return { ok: true, message: `${upgrade.name} is now level ${this.level(id)}!`, cost };
  }

  effect(effect: UpgradeEffect, category?: UpgradeDefinition["category"], overrides: Record<string, number> = {}): number {
    return ALL_UPGRADES.reduce((sum, upgrade) => {
      if (upgrade.effect !== effect || (category && upgrade.category !== category)) return sum;
      return sum + (overrides[upgrade.id] ?? this.level(upgrade.id)) * upgrade.amount;
    }, 0);
  }

  has(id: string): boolean {
    return this.level(id) > 0;
  }

  requirementLabel(upgrade: UpgradeDefinition): string | null {
    const requirement = upgrade.mathRequirement;
    if (!requirement) return null;
    if (requirement.kind === "correctAnswers") return `Answer ${requirement.value} multiplication questions correctly (${this.data.mathStats.correct}/${requirement.value})`;
    return `Master all ×${requirement.family} facts`;
  }

  meetsMathRequirement(upgrade: UpgradeDefinition): boolean {
    const requirement = upgrade.mathRequirement;
    if (!requirement) return true;
    if (requirement.kind === "correctAnswers") return this.data.mathStats.correct >= requirement.value;
    const family = requirement.family ?? 1;
    for (let factor = 1; factor <= 10; factor += 1) {
      const key = `${Math.min(family, factor)}x${Math.max(family, factor)}`;
      const stat = this.data.mathStats.facts[key];
      if (!stat || stat.seen < 3 || stat.correct / Math.max(1, stat.seen) < 0.8) return false;
    }
    return true;
  }
}
