import type { EconomySnapshot } from "../systems/EconomySystem";
import type { GameSave, QuestDefinition } from "../types";

export const compactNumber = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}k`;
  return Math.floor(value).toLocaleString();
};

export const hudMarkup = (data: GameSave, snapshot: EconomySnapshot, quest: QuestDefinition | null, questValue: number): string => {
  const progress = quest ? Math.min(100, questValue / quest.target * 100) : 100;
  return `
    <header class="hud" aria-label="Factory status">
      <div class="brand-chip"><span class="mini-berry">●</span><span>BlueMath</span></div>
      <div class="resource-strip">
        <div class="resource"><span>🫐</span><strong>${compactNumber(data.blueberries)}</strong><small>berries</small></div>
        <div class="resource"><span>📦</span><strong>${compactNumber(data.products)}</strong><small>products</small></div>
        <div class="resource"><span>💰</span><strong>$${compactNumber(data.money)}</strong><small>money</small></div>
        <div class="resource"><span>⚙️</span><strong>${snapshot.productionRate.toFixed(1)}/s</strong><small>production</small></div>
        <div class="resource desktop-only"><span>⭐</span><strong>${snapshot.factoryLevel}</strong><small>factory</small></div>
      </div>
      <button class="icon-button pause-button" data-action="pause" aria-label="Pause game">Ⅱ</button>
    </header>
    ${quest ? `<aside class="objective-card"><span class="objective-kicker">NEXT GOAL</span><strong>${quest.title}</strong><span>${quest.description}</span><div class="progress-track"><i style="width:${progress}%"></i></div><small>${Math.floor(questValue)} / ${quest.target} · Reward $${quest.rewardMoney} + ${quest.rewardBerries} 🫐</small></aside>` : ""}
    <div id="interaction-prompt" class="interaction-prompt is-hidden"></div>
    <div id="toast-stack" class="toast-stack"></div>
  `;
};
