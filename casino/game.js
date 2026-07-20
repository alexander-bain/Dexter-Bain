const STARTING_BANKROLL = 10000;
const STORAGE_KEY = "lucky-felt-bankroll";

const CHIP_VALUES = [
  { id: "white", name: "White", value: 25 },
  { id: "red", name: "Red", value: 100 },
  { id: "blue", name: "Blue", value: 500 },
  { id: "black", name: "Black", value: 1000 },
  { id: "gold", name: "Gold", value: 5000 },
];

const RANKS = [
  { label: "A", value: 14 },
  { label: "K", value: 13 },
  { label: "Q", value: 12 },
  { label: "J", value: 11 },
  { label: "10", value: 10 },
  { label: "9", value: 9 },
  { label: "8", value: 8 },
  { label: "7", value: 7 },
  { label: "6", value: 6 },
  { label: "5", value: 5 },
  { label: "4", value: 4 },
  { label: "3", value: 3 },
  { label: "2", value: 2 },
];

const SUITS = [
  { label: "♠", color: "black" },
  { label: "♥", color: "red" },
  { label: "♦", color: "red" },
  { label: "♣", color: "black" },
];

const SLOT_SYMBOLS = ["7", "BAR", "BELL", "STAR", "CROWN", "CHERRY", "LEMON", "CLUB", "DIAMOND"];

const state = {
  bankroll: loadBankroll(),
  view: "lobby",
  activeGame: null,
  currentBet: 0,
  chipCounts: Object.fromEntries(CHIP_VALUES.map((chip) => [chip.id, 0])),
  blackjack: null,
  poker: null,
  slots: null,
};

let nextCardId = 1;

const view = document.querySelector("#gameView");
const bankrollEl = document.querySelector("#bankroll");
const chipModal = document.querySelector("#chipModal");
const chipValueRow = document.querySelector("#chipValueRow");
const chipControls = document.querySelector("#chipControls");
const betTotalEl = document.querySelector("#betTotal");
const betWarningEl = document.querySelector("#betWarning");
const confirmBetButton = document.querySelector("#confirmBetButton");
const chipModalTitle = document.querySelector("#chipModalTitle");
const chipModalDescription = document.querySelector("#chipModalDescription");

document.querySelector("#homeButton").addEventListener("click", renderLobby);
document.querySelector("#resetButton").addEventListener("click", resetBankroll);
document.querySelector("#chipCancelButton").addEventListener("click", closeChipModal);
document.querySelector("#clearBetButton").addEventListener("click", clearChipCounts);
confirmBetButton.addEventListener("click", confirmChipBet);

chipControls.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-chip][data-direction]");
  if (!button) return;

  const chip = button.dataset.chip;
  const direction = Number(button.dataset.direction);
  state.chipCounts[chip] = Math.max(0, state.chipCounts[chip] + direction);
  renderChipControls();
});

view.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;

  if (action === "lobby") renderLobby();
  if (action === "open-blackjack") openChipModal("blackjack");
  if (action === "open-poker") openChipModal("poker");
  if (action === "open-slots") openChipModal("slots");
  if (action === "hit") blackjackHit();
  if (action === "stand") blackjackStand();
  if (action === "new-bet") openChipModal(state.activeGame);
  if (action === "poker-draw") pokerDraw();
  if (action === "slot-spin-same") spinSlots(true);
});

view.addEventListener("click", (event) => {
  const pokerCard = event.target.closest("[data-poker-index]");
  if (!pokerCard || !state.poker || state.poker.phase !== "choose") return;

  const index = Number(pokerCard.dataset.pokerIndex);
  state.poker.held[index] = !state.poker.held[index];
  renderPoker();
});

renderChipValues();
renderLobby();

function loadBankroll() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === null) return STARTING_BANKROLL;
  const stored = Number(saved);
  return Number.isFinite(stored) && stored >= 0 ? stored : STARTING_BANKROLL;
}

function saveBankroll() {
  localStorage.setItem(STORAGE_KEY, String(state.bankroll));
  bankrollEl.textContent = money(state.bankroll);
}

function resetBankroll() {
  if (!window.confirm("Reset your bankroll to $10,000?")) return;
  state.bankroll = STARTING_BANKROLL;
  state.currentBet = 0;
  state.blackjack = null;
  state.poker = null;
  state.slots = null;
  saveBankroll();
  renderLobby();
}

function money(amount) {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function renderLobby() {
  state.view = "lobby";
  state.activeGame = null;
  state.currentBet = 0;
  if (state.slots?.interval) window.clearInterval(state.slots.interval);
  state.blackjack = null;
  state.poker = null;
  state.slots = null;
  closeChipModal();
  saveBankroll();

  view.innerHTML = `
    <section class="lobby">
      <div class="lobby-hero">
        <div>
          <h1>Pick a table and play with one shared bankroll.</h1>
          <p class="lobby-copy">
            Start with $10,000. Blackjack, poker, and slots all use the same money,
            so wins and losses follow you from game to game.
          </p>
        </div>
        <div class="felt-preview" aria-hidden="true">
          <div class="preview-card one">A</div>
          <div class="preview-card two">K</div>
          <div class="preview-reel"><span>7</span><span>BAR</span><span>STAR</span></div>
          <div class="preview-chip">$500</div>
        </div>
      </div>

      <div class="game-grid" aria-label="Casino games">
        ${gameCard({
          action: "open-blackjack",
          title: "Blackjack",
          copy: "Beat the dealer without going over 21. Cards flip onto the felt before you hit or stand.",
          art: `<div class="mini-card-row"><span class="mini-card">A</span><span class="mini-card red">10</span><span class="mini-back"></span></div>`,
          button: "Play blackjack",
        })}
        ${gameCard({
          action: "open-poker",
          title: "AI Poker",
          copy: "Five-card draw against the house AI. Hold cards, draw once, then watch the AI reveal.",
          art: `<div class="mini-card-row"><span class="mini-card red">Q</span><span class="mini-card">Q</span><span class="mini-back"></span><span class="mini-back"></span></div>`,
          button: "Play poker",
        })}
        ${gameCard({
          action: "open-slots",
          title: "Low-Odds Slots",
          copy: "A three-reel machine with real spinning action and tough payouts. Triples are where the money is.",
          art: `<div class="mini-slot"><span>7</span><span>BAR</span><span>BELL</span></div>`,
          button: "Play slots",
        })}
      </div>
    </section>
  `;
}

function gameCard({ action, title, copy, art, button }) {
  return `
    <article class="game-card">
      <div class="game-art">${art}</div>
      <h2>${title}</h2>
      <p>${copy}</p>
      <button class="primary-button" type="button" data-action="${action}">${button}</button>
    </article>
  `;
}

function openChipModal(game) {
  if (!game) return;
  state.activeGame = game;
  state.chipCounts = Object.fromEntries(CHIP_VALUES.map((chip) => [chip.id, 0]));

  const gameName = {
    blackjack: "Blackjack",
    poker: "AI Poker",
    slots: "Low-Odds Slots",
  }[game];

  chipModalTitle.textContent = `${gameName} bet`;
  chipModalDescription.textContent =
    "Each chip has a dollar value. Choose how many chips you want to play this round.";
  confirmBetButton.textContent = game === "slots" ? "Spin reels" : "Play round";
  chipModal.classList.remove("is-hidden");
  renderChipControls();
}

function closeChipModal() {
  chipModal.classList.add("is-hidden");
}

function clearChipCounts() {
  state.chipCounts = Object.fromEntries(CHIP_VALUES.map((chip) => [chip.id, 0]));
  renderChipControls();
}

function renderChipValues() {
  chipValueRow.innerHTML = CHIP_VALUES.map(
    (chip) => `
      <div class="chip-value">
        <span class="casino-chip chip-${chip.id}">${money(chip.value)}</span>
        <strong>${chip.name}: ${money(chip.value)}</strong>
      </div>
    `,
  ).join("");
}

function renderChipControls() {
  chipControls.innerHTML = CHIP_VALUES.map(
    (chip) => `
      <div class="chip-stepper" aria-label="${chip.name} chips worth ${money(chip.value)} each">
        <button type="button" data-chip="${chip.id}" data-direction="-1" aria-label="Remove one ${chip.name} chip">-</button>
        <span>${state.chipCounts[chip.id]}</span>
        <button type="button" data-chip="${chip.id}" data-direction="1" aria-label="Add one ${chip.name} chip">+</button>
      </div>
    `,
  ).join("");

  const total = currentChipTotal();
  betTotalEl.textContent = money(total);
  const tooMuch = total > state.bankroll;
  betWarningEl.textContent = tooMuch ? "That bet is bigger than your bankroll." : "";
  confirmBetButton.disabled = total <= 0 || tooMuch;
}

function currentChipTotal() {
  return CHIP_VALUES.reduce((total, chip) => total + state.chipCounts[chip.id] * chip.value, 0);
}

function confirmChipBet() {
  const bet = currentChipTotal();
  if (bet <= 0 || bet > state.bankroll) return;
  state.currentBet = bet;
  closeChipModal();

  if (state.activeGame === "blackjack") startBlackjack(bet);
  if (state.activeGame === "poker") startPoker(bet);
  if (state.activeGame === "slots") startSlots(bet);
}

function chipInfoBox() {
  return `
    <section class="info-box">
      <h3>Chip Values</h3>
      <ul class="chip-list">
        ${CHIP_VALUES.map(
          (chip) => `
            <li>
              <span class="casino-chip chip-${chip.id}">${money(chip.value)}</span>
              <strong>${chip.name}</strong>
            </li>
          `,
        ).join("")}
      </ul>
    </section>
  `;
}

function makeDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: nextCardId,
        rank: rank.label,
        value: rank.value,
        suit: suit.label,
        color: suit.color,
        faceUp: false,
      });
      nextCardId += 1;
    }
  }

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }
  return deck;
}

function draw(deck, faceUp = false) {
  const card = deck.pop();
  return { ...card, faceUp, motion: faceUp ? "flip" : "deal" };
}

function revealCard(card) {
  if (card.faceUp) return;
  card.faceUp = true;
  card.motion = "flip";
}

function clearCardMotion(cards) {
  cards.forEach((card) => {
    card.motion = "";
  });
}

function cardHtml(card, options = {}) {
  const classes = [
    "playing-card",
    card.faceUp ? "face-up" : "face-down",
    card.motion === "deal" ? "is-dealing" : "",
    card.motion === "flip" ? "is-flipping" : "",
    options.held ? "held" : "",
    options.clickable ? "clickable" : "",
  ].filter(Boolean).join(" ");
  const red = card.color === "red" ? "red-card" : "";

  return `
    <div class="${classes}" style="animation-delay:${options.delay || 0}ms">
      <div class="card-face ${red}">
        <span class="card-rank">${card.rank}</span>
        <span class="card-suit">${card.suit}</span>
        ${options.held ? `<span class="hold-tag">Held</span>` : ""}
      </div>
      <div class="card-back" aria-label="Face-down card"></div>
    </div>
  `;
}

function visibleCards(cards) {
  return cards.filter((card) => card.faceUp);
}

function blackjackTotal(cards) {
  let total = 0;
  let aces = 0;
  for (const card of visibleCards(cards)) {
    if (card.rank === "A") {
      total += 11;
      aces += 1;
    } else {
      total += Math.min(card.value, 10);
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

function blackjackScoreLabel(cards) {
  const visible = visibleCards(cards);
  if (visible.length === 0) return "?";
  return blackjackTotal(cards);
}

function isBlackjack(cards) {
  return cards.length === 2 && blackjackTotal(cards) === 21 && visibleCards(cards).length === 2;
}

function spendBet(amount) {
  state.bankroll -= amount;
  saveBankroll();
}

function pay(amount) {
  state.bankroll += amount;
  saveBankroll();
}

function startBlackjack(bet) {
  if (bet > state.bankroll) return openChipModal("blackjack");
  state.activeGame = "blackjack";
  spendBet(bet);

  const deck = makeDeck();
  state.blackjack = {
    deck,
    bet,
    phase: "dealing",
    message: "Cards are sliding onto the felt.",
    player: [draw(deck), draw(deck)],
    dealer: [draw(deck), draw(deck)],
  };

  renderBlackjack();
  flipBlackjackInitialCards();
}

function flipBlackjackInitialCards() {
  const bj = state.blackjack;
  const sequence = [
    () => revealCard(bj.player[0]),
    () => revealCard(bj.dealer[0]),
    () => revealCard(bj.player[1]),
  ];

  sequence.forEach((step, index) => {
    window.setTimeout(() => {
      step();
      renderBlackjack();
    }, 280 + index * 360);
  });

  window.setTimeout(() => {
    bj.phase = "player";
    bj.message = "Hit to take a card or stand to make the dealer play.";
    if (isBlackjack(bj.player)) {
      bj.message = "Blackjack! The dealer checks the hidden card.";
      renderBlackjack();
      window.setTimeout(blackjackRevealAndSettle, 650);
      return;
    }
    renderBlackjack();
  }, 1450);
}

function renderBlackjack() {
  const bj = state.blackjack;
  if (!bj || state.activeGame !== "blackjack") return;

  view.innerHTML = `
    <section class="game-title">
      <h1>Blackjack</h1>
      <p>Get closer to 21 than the dealer. A blackjack pays 3 to 2.</p>
    </section>
    <section class="game-layout">
      <div class="table">
        <div class="table-header">
          <span class="stake-pill">Stake on table: ${money(bj.bet)}</span>
          <span class="score-pill">Dealer shows ${blackjackScoreLabel(bj.dealer)}</span>
        </div>

        <div class="hand-zone">
          <div class="hand-label">
            <span>Dealer</span>
            <strong>${blackjackScoreLabel(bj.dealer)}</strong>
          </div>
          <div class="card-row">
            ${bj.dealer.map((card, index) => cardHtml(card, { delay: index * 70 })).join("")}
          </div>
        </div>

        <div class="hand-zone">
          <div class="hand-label">
            <span>Your hand</span>
            <strong>${blackjackScoreLabel(bj.player)}</strong>
          </div>
          <div class="card-row">
            ${bj.player.map((card, index) => cardHtml(card, { delay: index * 70 })).join("")}
          </div>
        </div>

        <div class="message">${bj.message}</div>

        <div class="table-actions">
          <button class="primary-button" type="button" data-action="hit" ${bj.phase === "player" ? "" : "disabled"}>Hit</button>
          <button class="secondary-button" type="button" data-action="stand" ${bj.phase === "player" ? "" : "disabled"}>Stand</button>
          <button class="secondary-button" type="button" data-action="new-bet" ${bj.phase === "round-over" ? "" : "disabled"}>New bet</button>
          <button class="secondary-button" type="button" data-action="lobby">Lobby</button>
        </div>
      </div>

      <aside class="side-panel">
        ${chipInfoBox()}
        <section class="status-box">
          <h3>Table Rules</h3>
          <p>Dealer stands on 17. Normal wins pay even money. Push returns your bet.</p>
        </section>
      </aside>
    </section>
  `;
  clearCardMotion([...bj.dealer, ...bj.player]);
}

function blackjackHit() {
  const bj = state.blackjack;
  if (!bj || bj.phase !== "player") return;

  const card = draw(bj.deck, false);
  bj.player.push(card);
  bj.message = "New card coming over.";
  bj.phase = "animating";
  renderBlackjack();

  window.setTimeout(() => {
    if (state.blackjack !== bj) return;
    revealCard(card);
    const total = blackjackTotal(bj.player);
    if (total > 21) {
      bj.phase = "round-over";
      bj.message = `Bust at ${total}. You lose ${money(bj.bet)}.`;
    } else {
      bj.phase = "player";
      bj.message = "You are still alive. Hit or stand?";
    }
    renderBlackjack();
  }, 420);
}

function blackjackStand() {
  const bj = state.blackjack;
  if (!bj || bj.phase !== "player") return;
  bj.phase = "dealer";
  bj.message = "Dealer flips the hidden card.";
  renderBlackjack();
  window.setTimeout(blackjackRevealAndSettle, 520);
}

function blackjackRevealAndSettle() {
  const bj = state.blackjack;
  if (!bj || state.activeGame !== "blackjack") return;
  bj.dealer.forEach((card) => {
    revealCard(card);
  });
  renderBlackjack();
  window.setTimeout(dealerStep, 620);
}

function dealerStep() {
  const bj = state.blackjack;
  if (!bj || state.activeGame !== "blackjack") return;
  const dealerTotal = blackjackTotal(bj.dealer);
  if (dealerTotal < 17) {
    const card = draw(bj.deck, false);
    bj.dealer.push(card);
    bj.message = "Dealer draws.";
    renderBlackjack();
    window.setTimeout(() => {
      if (state.blackjack !== bj) return;
      revealCard(card);
      renderBlackjack();
      window.setTimeout(dealerStep, 520);
    }, 380);
    return;
  }
  settleBlackjack();
}

function settleBlackjack() {
  const bj = state.blackjack;
  if (!bj || state.activeGame !== "blackjack") return;
  const player = blackjackTotal(bj.player);
  const dealer = blackjackTotal(bj.dealer);
  const playerBlackjack = isBlackjack(bj.player);
  const dealerBlackjack = isBlackjack(bj.dealer);
  bj.phase = "round-over";

  if (player > 21) {
    bj.message = `Bust at ${player}. You lose ${money(bj.bet)}.`;
  } else if (playerBlackjack && !dealerBlackjack) {
    const payout = Math.floor(bj.bet * 2.5);
    pay(payout);
    bj.message = `Blackjack pays ${money(payout)}. Profit: ${money(payout - bj.bet)}.`;
  } else if (dealer > 21) {
    pay(bj.bet * 2);
    bj.message = `Dealer busts at ${dealer}. You win ${money(bj.bet)}.`;
  } else if (player > dealer) {
    pay(bj.bet * 2);
    bj.message = `${player} beats ${dealer}. You win ${money(bj.bet)}.`;
  } else if (player === dealer) {
    pay(bj.bet);
    bj.message = `Push at ${player}. Your ${money(bj.bet)} bet comes back.`;
  } else {
    bj.message = `${dealer} beats ${player}. You lose ${money(bj.bet)}.`;
  }

  renderBlackjack();
}

function startPoker(bet) {
  if (bet > state.bankroll) return openChipModal("poker");
  state.activeGame = "poker";
  spendBet(bet);

  const deck = makeDeck();
  state.poker = {
    deck,
    bet,
    phase: "dealing",
    player: Array.from({ length: 5 }, () => draw(deck)),
    ai: Array.from({ length: 5 }, () => draw(deck)),
    held: [false, false, false, false, false],
    message: "Your cards are being dealt. The AI keeps its hand hidden.",
    playerRank: null,
    aiRank: null,
  };

  const poker = state.poker;
  renderPoker();
  poker.player.forEach((card, index) => {
    window.setTimeout(() => {
      if (state.poker !== poker) return;
      revealCard(card);
      renderPoker();
    }, 280 + index * 220);
  });

  window.setTimeout(() => {
    if (state.poker !== poker) return;
    poker.phase = "choose";
    poker.message = "Tap cards to hold them, then draw once.";
    renderPoker();
  }, 1500);
}

function renderPoker() {
  const poker = state.poker;
  if (!poker || state.activeGame !== "poker") return;
  const playerRank = poker.playerRank || evaluatePokerHand(poker.player);
  const aiLabel = poker.phase === "round-over" && poker.aiRank ? poker.aiRank.name : "Hidden";

  view.innerHTML = `
    <section class="game-title">
      <h1>AI Poker</h1>
      <p>Five-card draw against the house AI. Hold what you like, then draw one time.</p>
    </section>
    <section class="game-layout">
      <div class="table">
        <div class="table-header">
          <span class="stake-pill">Stake on table: ${money(poker.bet)}</span>
          <span class="score-pill">Your hand: ${playerRank.name}</span>
        </div>

        <div class="hand-zone">
          <div class="hand-label">
            <span>House AI</span>
            <strong>${aiLabel}</strong>
          </div>
          <div class="card-row">
            ${poker.ai.map((card, index) => cardHtml(card, { delay: index * 70 })).join("")}
          </div>
        </div>

        <div class="hand-zone">
          <div class="hand-label">
            <span>Your hand</span>
            <strong>${playerRank.name}</strong>
          </div>
          <div class="card-row">
            ${poker.player.map((card, index) => `
              <button class="poker-card-button" type="button" data-poker-index="${index}" ${poker.phase === "choose" ? "" : "disabled"} aria-label="${poker.held[index] ? "Release" : "Hold"} card ${index + 1}">
                ${cardHtml(card, { held: poker.held[index], clickable: poker.phase === "choose", delay: index * 70 })}
              </button>
            `).join("")}
          </div>
        </div>

        <div class="message">${poker.message}</div>

        <div class="table-actions">
          <button class="primary-button" type="button" data-action="poker-draw" ${poker.phase === "choose" ? "" : "disabled"}>Draw cards</button>
          <button class="secondary-button" type="button" data-action="new-bet" ${poker.phase === "round-over" ? "" : "disabled"}>New bet</button>
          <button class="secondary-button" type="button" data-action="lobby">Lobby</button>
        </div>
      </div>

      <aside class="side-panel">
        ${chipInfoBox()}
        <section class="status-box">
          <h3>AI Rules</h3>
          <p>The AI holds pairs or better. With no pair, it keeps aces and kings, then draws.</p>
        </section>
      </aside>
    </section>
  `;
  clearCardMotion([...poker.ai, ...poker.player]);
}

function pokerDraw() {
  const poker = state.poker;
  if (!poker || poker.phase !== "choose") return;
  poker.phase = "drawing";
  poker.message = "Cards are flipping. The AI is making its draw.";

  poker.player = poker.player.map((card, index) => {
    if (poker.held[index]) return card;
    return draw(poker.deck, false);
  });

  const aiHold = chooseAiPokerHolds(poker.ai);
  poker.ai = poker.ai.map((card, index) => {
    if (aiHold[index]) return card;
    return draw(poker.deck, false);
  });

  renderPoker();

  poker.player.forEach((card, index) => {
    if (poker.held[index]) return;
    window.setTimeout(() => {
      if (state.poker !== poker) return;
      revealCard(card);
      renderPoker();
    }, 260 + index * 170);
  });

  window.setTimeout(() => {
    if (state.poker !== poker) return;
    poker.message = "Showdown. The AI reveals its cards.";
    poker.ai.forEach((card, index) => {
      window.setTimeout(() => {
        if (state.poker !== poker) return;
        revealCard(card);
        renderPoker();
      }, index * 220);
    });
    window.setTimeout(settlePoker, 1300);
  }, 1250);
}

function chooseAiPokerHolds(cards) {
  const counts = rankCounts(cards);
  const hasMadeHand = Object.values(counts).some((count) => count >= 2);
  return cards.map((card) => {
    if (hasMadeHand) return counts[card.value] >= 2;
    return card.value >= 13;
  });
}

function rankCounts(cards) {
  return cards.reduce((counts, card) => {
    counts[card.value] = (counts[card.value] || 0) + 1;
    return counts;
  }, {});
}

function evaluatePokerHand(cards) {
  const values = cards.map((card) => card.value).sort((a, b) => b - a);
  const suits = cards.map((card) => card.suit);
  const counts = rankCounts(cards);
  const groups = Object.entries(counts)
    .map(([value, count]) => ({ value: Number(value), count }))
    .sort((a, b) => b.count - a.count || b.value - a.value);
  const flush = suits.every((suit) => suit === suits[0]);
  const straightHigh = getStraightHigh(values);

  if (flush && straightHigh) return { score: 8, name: straightHigh === 14 ? "Royal flush" : "Straight flush", values: [straightHigh] };
  if (groups[0].count === 4) return { score: 7, name: "Four of a kind", values: [groups[0].value, groups[1].value] };
  if (groups[0].count === 3 && groups[1].count === 2) return { score: 6, name: "Full house", values: [groups[0].value, groups[1].value] };
  if (flush) return { score: 5, name: "Flush", values };
  if (straightHigh) return { score: 4, name: "Straight", values: [straightHigh] };
  if (groups[0].count === 3) {
    const kickers = groups.filter((group) => group.count === 1).map((group) => group.value).sort((a, b) => b - a);
    return { score: 3, name: "Three of a kind", values: [groups[0].value, ...kickers] };
  }
  if (groups[0].count === 2 && groups[1].count === 2) {
    const pairs = groups.filter((group) => group.count === 2).map((group) => group.value).sort((a, b) => b - a);
    const kicker = groups.find((group) => group.count === 1).value;
    return { score: 2, name: "Two pair", values: [...pairs, kicker] };
  }
  if (groups[0].count === 2) {
    const kickers = groups.filter((group) => group.count === 1).map((group) => group.value).sort((a, b) => b - a);
    return { score: 1, name: "Pair", values: [groups[0].value, ...kickers] };
  }
  return { score: 0, name: "High card", values };
}

function getStraightHigh(values) {
  const unique = [...new Set(values)].sort((a, b) => b - a);
  if (unique.length !== 5) return 0;
  if (unique[0] - unique[4] === 4) return unique[0];
  if (unique.join(",") === "14,5,4,3,2") return 5;
  return 0;
}

function comparePokerHands(left, right) {
  if (left.score !== right.score) return left.score - right.score;
  const length = Math.max(left.values.length, right.values.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (left.values[index] || 0) - (right.values[index] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function settlePoker() {
  const poker = state.poker;
  if (!poker || state.activeGame !== "poker") return;
  poker.playerRank = evaluatePokerHand(poker.player);
  poker.aiRank = evaluatePokerHand(poker.ai);
  poker.phase = "round-over";
  const result = comparePokerHands(poker.playerRank, poker.aiRank);

  if (result > 0) {
    pay(poker.bet * 2);
    poker.message = `${poker.playerRank.name} beats ${poker.aiRank.name}. You win ${money(poker.bet)}.`;
  } else if (result === 0) {
    pay(poker.bet);
    poker.message = `Both hands tie with ${poker.playerRank.name}. Your bet comes back.`;
  } else {
    poker.message = `${poker.aiRank.name} beats ${poker.playerRank.name}. You lose ${money(poker.bet)}.`;
  }
  renderPoker();
}

function startSlots(bet) {
  state.activeGame = "slots";
  state.slots = {
    bet,
    reels: ["7", "BAR", "BELL"],
    spinning: false,
    locked: true,
    message: "The lever is ready.",
    payout: 0,
  };
  const slots = state.slots;
  renderSlots();
  window.setTimeout(() => {
    if (state.slots !== slots) return;
    slots.locked = false;
    spinSlots(false);
  }, 450);
}

function renderSlots() {
  const slots = state.slots;
  if (!slots || state.activeGame !== "slots") return;

  view.innerHTML = `
    <section class="game-title">
      <h1>Low-Odds Slots</h1>
      <p>Three reels spin with tough casino-style odds. Triples pay best.</p>
    </section>
    <section class="game-layout">
      <div class="table">
        <div class="table-header">
          <span class="stake-pill">Bet per spin: ${money(slots.bet)}</span>
          <span class="score-pill">Last payout: ${money(slots.payout)}</span>
        </div>

        <div class="slot-machine" aria-label="Slot machine">
          <div class="slot-top">
            <span>Lucky Felt</span>
            <span class="lever" aria-hidden="true"></span>
          </div>
          <div class="reels">
            ${slots.reels.map((symbol) => `<div class="reel ${slots.spinning ? "spinning" : ""}"><span>${symbol}</span></div>`).join("")}
          </div>
        </div>

        <div class="message">${slots.message}</div>

        <div class="table-actions">
          <button class="primary-button" type="button" data-action="slot-spin-same" ${!slots.spinning && !slots.locked && state.bankroll >= slots.bet ? "" : "disabled"}>Spin same bet</button>
          <button class="secondary-button" type="button" data-action="new-bet" ${slots.spinning || slots.locked ? "disabled" : ""}>New bet</button>
          <button class="secondary-button" type="button" data-action="lobby">Lobby</button>
        </div>
      </div>

      <aside class="side-panel">
        ${chipInfoBox()}
        <section class="payout-box">
          <h3>Payouts</h3>
          <p class="payout-line"><span>7 / 7 / 7</span><strong>50x</strong></p>
          <p class="payout-line"><span>BAR / BAR / BAR</span><strong>15x</strong></p>
          <p class="payout-line"><span>Any other triple</span><strong>6x</strong></p>
          <p class="payout-line"><span>Two 7s</span><strong>2x</strong></p>
        </section>
        <section class="status-box">
          <h3>Odds</h3>
          <p>The reels use nine symbols, so big wins are intentionally rare.</p>
        </section>
      </aside>
    </section>
  `;
}

function spinSlots(useExistingBet) {
  const slots = state.slots;
  if (!slots || slots.spinning || slots.locked) return;
  if (!useExistingBet) state.currentBet = slots.bet;
  if (slots.bet > state.bankroll) {
    slots.message = "You need more bankroll for that spin. Pick a smaller bet.";
    renderSlots();
    return;
  }

  spendBet(slots.bet);
  slots.spinning = true;
  slots.payout = 0;
  slots.message = "The reels are spinning.";
  renderSlots();

  const interval = window.setInterval(() => {
    if (state.slots !== slots) return;
    slots.reels = slots.reels.map(randomSlotSymbol);
    renderSlots();
  }, 95);
  slots.interval = interval;

  const final = [randomSlotSymbol(), randomSlotSymbol(), randomSlotSymbol()];
  [0, 1, 2].forEach((reelIndex) => {
    window.setTimeout(() => {
      slots.reels[reelIndex] = final[reelIndex];
      renderSlots();
    }, 900 + reelIndex * 420);
  });

  window.setTimeout(() => {
    window.clearInterval(interval);
    if (state.slots !== slots) return;
    slots.reels = final;
    slots.spinning = false;
    const multiplier = slotMultiplier(final);
    slots.payout = slots.bet * multiplier;
    if (slots.payout > 0) {
      pay(slots.payout);
      slots.message = `${final.join(" / ")} pays ${multiplier}x. You receive ${money(slots.payout)}.`;
    } else {
      slots.message = `${final.join(" / ")} misses. The machine keeps ${money(slots.bet)}.`;
    }
    renderSlots();
  }, 2200);
}

function randomSlotSymbol() {
  return SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
}

function slotMultiplier(reels) {
  const [first, second, third] = reels;
  if (first === "7" && second === "7" && third === "7") return 50;
  if (first === "BAR" && second === "BAR" && third === "BAR") return 15;
  if (first === second && second === third) return 6;
  if (reels.filter((symbol) => symbol === "7").length === 2) return 2;
  return 0;
}
