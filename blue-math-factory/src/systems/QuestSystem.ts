import { QUESTS } from "../data/quests";
import type { GameSave, QuestDefinition } from "../types";
import { EconomySystem } from "./EconomySystem";

export class QuestSystem {
  constructor(private readonly economy: EconomySystem) {}

  active(): QuestDefinition | null {
    return QUESTS.find((quest) => !this.economy.data.claimedQuests.includes(quest.id)) ?? null;
  }

  value(quest: QuestDefinition): number {
    const data = this.economy.data;
    const snapshot = this.economy.snapshot();
    if (quest.stat in data.totals) return data.totals[quest.stat as keyof GameSave["totals"]];
    if (quest.stat === "questionsAnswered") return data.mathStats.answered;
    if (quest.stat === "bestStreak") return data.mathStats.bestStreak;
    if (quest.stat === "factoryLevel") return snapshot.factoryLevel;
    if (quest.stat === "cashierLevel") return snapshot.cashierLevel;
    if (quest.stat === "queueCapacity") return snapshot.queueCapacity;
    if (quest.stat === "production") return snapshot.productionRate;
    return 0;
  }

  check(): QuestDefinition[] {
    const newlyCompleted: QuestDefinition[] = [];
    for (const quest of QUESTS) {
      if (!this.economy.data.completedQuests.includes(quest.id) && this.value(quest) >= quest.target) {
        this.economy.data.completedQuests.push(quest.id);
        this.economy.data.claimedQuests.push(quest.id);
        this.economy.data.money += quest.rewardMoney;
        this.economy.data.blueberries += quest.rewardBerries;
        newlyCompleted.push(quest);
      }
    }
    return newlyCompleted;
  }
}
