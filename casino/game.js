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

const POKER_ANTE = 10;
const POKER_STREETS = {
  flop: { label: "Flop", cardCount: 3, call: 25 },
  turn: { label: "Turn", cardCount: 4, call: 50 },
  river: { label: "River", cardCount: 5, call: 100 },
};
const POKER_RAISE_CHIPS = [25, 50, 100, 250, 500];

const POKER_PERSONALITIES = {
  shark: {
    label: "Aggressive",
    sprite: "shark",
    icon: "S",
    aggression: 1.16,
    bluff: 1.08,
    tightness: 0.93,
    callBias: 0.98,
    raiseSize: 1.18,
    random: 0.02,
  },
  bluff: {
    label: "Bluff Master",
    sprite: "mask",
    icon: "B",
    aggression: 1.08,
    bluff: 1.2,
    tightness: 0.98,
    callBias: 0.94,
    raiseSize: 1.08,
    random: 0.03,
  },
  professor: {
    label: "Tight & Smart",
    sprite: "brain",
    icon: "P",
    aggression: 0.94,
    bluff: 0.82,
    tightness: 1.18,
    callBias: 0.96,
    raiseSize: 1,
    random: 0.01,
  },
  lucky: {
    label: "Wild Card",
    sprite: "dice",
    icon: "L",
    aggression: 1.02,
    bluff: 1.05,
    tightness: 0.96,
    callBias: 1.08,
    raiseSize: 1.02,
    random: 0.16,
  },
  grandma: {
    label: "Safe Player",
    sprite: "shield",
    icon: "G",
    aggression: 0.86,
    bluff: 0.78,
    tightness: 1.14,
    callBias: 1.12,
    raiseSize: 0.9,
    random: 0.015,
  },
};

const POKER_SEATS = [
  { id: "shark-sam", name: "Shark Sam", stack: 1000, position: "top-left", personality: "shark", tablePosition: 1 },
  { id: "bluffing-ben", name: "Bluffing Ben", stack: 1000, position: "top-center", personality: "bluff", tablePosition: 2 },
  { id: "professor-penny", name: "Professor Penny", stack: 1000, position: "top-right", personality: "professor", tablePosition: 3 },
  { id: "lucky-larry", name: "Lucky Larry", stack: 1000, position: "bottom-left", personality: "lucky", tablePosition: 4 },
  { id: "grandma-grace", name: "Grandma Grace", stack: 1000, position: "bottom-right", personality: "grandma", tablePosition: 5 },
];

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
  const actionButton = event.target.closest("[data-action]");
  const action = actionButton?.dataset.action;
  if (!action) return;

  if (action === "lobby") renderLobby();
  if (action === "open-blackjack") openChipModal("blackjack");
  if (action === "open-poker" || action === "open-poker-ultima") startPoker();
  if (action === "open-slots") openChipModal("slots");
  if (action === "hit") blackjackHit();
  if (action === "stand") blackjackStand();
  if (action === "new-bet") {
    if (state.activeGame === "poker") startPoker();
    else openChipModal(state.activeGame);
  }
  if (action === "poker-play") pokerPlayHand();
  if (action === "poker-fold") pokerFold();
  if (action === "poker-call") pokerCommitBet("call");
  if (action === "poker-raise") pokerCommitBet("raise");
  if (action === "poker-select-raise") pokerSelectRaise(Number(actionButton.dataset.amount));
  if (action === "slot-spin-same") spinSlots(true);
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
          action: "open-poker-ultima",
          title: "Poker Ultima",
          copy: "Texas Hold'em with bot personalities, turn rings, bluffing, folds, raises, and flop-turn-river action.",
          art: `<div class="mini-card-row"><span class="mini-card red">A</span><span class="mini-card">K</span><span class="mini-back"></span><span class="mini-back"></span></div>`,
          button: "Play Poker Ultima",
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
    poker: "Poker Ultima",
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
  if (state.activeGame === "poker") startPoker();
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
    options.compact ? "compact-card" : "",
    options.board ? "board-card" : "",
    options.hero ? "hero-card" : "",
    options.clickable ? "clickable" : "",
  ].filter(Boolean).join(" ");
  const red = card.color === "red" ? "red-card" : "";

  return `
    <div class="${classes}" style="animation-delay:${options.delay || 0}ms">
      <div class="card-face ${red}">
        <span class="card-corner card-corner-top"><strong>${card.rank}</strong><span>${card.suit}</span></span>
        ${cardCenterHtml(card)}
        <span class="card-corner card-corner-bottom"><strong>${card.rank}</strong><span>${card.suit}</span></span>
      </div>
      <div class="card-back" aria-label="Face-down card"></div>
    </div>
  `;
}

function cardCenterHtml(card) {
  if (["J", "Q", "K"].includes(card.rank)) {
    return `
      <div class="face-card-sprite" aria-hidden="true">
        <strong>${card.rank}</strong>
        <span>${card.suit}</span>
      </div>
    `;
  }

  const pipCount = card.rank === "A" ? 1 : Math.min(Number(card.rank), 10);
  return `
    <div class="card-pips pip-count-${pipCount}" aria-hidden="true">
      ${Array.from({ length: pipCount }, () => `<span>${card.suit}</span>`).join("")}
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

function startPoker() {
  state.activeGame = "poker";

  const deck = makeDeck();
  const seats = POKER_SEATS.map((seat) => ({
    ...seat,
    cards: [draw(deck), draw(deck)],
    rank: null,
    profile: POKER_PERSONALITIES[seat.personality],
    folded: false,
    streetBet: 0,
    lastAction: "Waiting",
  }));

  state.poker = {
    deck,
    phase: "dealing",
    street: "preflop",
    pot: 0,
    userInvested: 0,
    userStreetBet: 0,
    currentCall: 0,
    selectedRaise: 50,
    visibleCommunity: 0,
    activeTurnId: null,
    announcement: "Your cards are being dealt.",
    player: [draw(deck), draw(deck)],
    community: Array.from({ length: 5 }, () => draw(deck)),
    seats,
    message: "Look at your two cards. Then choose Play or Fold.",
    playerRank: null,
    winningSeatIds: [],
  };

  const poker = state.poker;
  renderPoker();

  poker.player.forEach((card, index) => {
    window.setTimeout(() => {
      if (state.poker !== poker) return;
      revealCard(card);
      renderPoker();
    }, 360 + index * 260);
  });

  window.setTimeout(() => {
    if (state.poker !== poker) return;
    poker.phase = "preflop-choice";
    poker.activeTurnId = "you";
    poker.announcement = "Your turn: play or fold";
    poker.message = "Play the hand for a $10 ante, or fold and wait for a new hand.";
    renderPoker();
  }, 1050);
}

function renderPoker() {
  const poker = state.poker;
  if (!poker || state.activeGame !== "poker") return;
  const visibleBoard = poker.community.slice(0, poker.visibleCommunity);
  const playerRank = poker.playerRank || (visibleBoard.length >= 3 ? bestPokerHand([...poker.player, ...visibleBoard]) : { name: "Two hole cards" });

  view.innerHTML = `
    <section class="game-title">
      <h1>Poker Ultima</h1>
      <p>Texas Hold'em with AI personalities, card sprites, bot sprites, and flop-turn-river betting.</p>
    </section>
    <section class="game-layout">
      <div class="table poker-table-surface">
        <div class="table-header">
          <span class="stake-pill">Your money in hand: ${money(poker.userInvested)}</span>
          <span class="score-pill">Best hand: ${playerRank.name}</span>
        </div>
        <div class="poker-announcement">
          <strong>${poker.announcement}</strong>
          <span>${pokerTurnHelp(poker)}</span>
        </div>

        <div class="poker-room" aria-label="Poker table">
          <div class="poker-felt">
            ${poker.seats.map((seat) => pokerSeatHtml(seat, poker)).join("")}

            <div class="poker-center">
              <div class="poker-pot">Pot: ${money(poker.pot)}</div>
              <div class="community-row" aria-label="Community cards">
                ${
                  visibleBoard.length
                    ? visibleBoard.map((card, index) => cardHtml(card, { board: true, delay: index * 70 })).join("")
                    : `<div class="board-placeholder">Ante ${money(POKER_ANTE)} to see the flop</div>`
                }
              </div>
              <div class="table-chip-pile" aria-hidden="true">
                ${poker.pot > 0 ? pokerChipPile(Math.min(30, 10 + Math.floor(poker.pot / 25))) : ""}
              </div>
            </div>

            <div class="hero-seat ${poker.winningSeatIds.includes("you") ? "is-winner" : ""} ${poker.activeTurnId === "you" ? "is-turn" : ""}">
              <div class="hero-cards">
                ${poker.player.map((card, index) => cardHtml(card, { hero: true, delay: index * 80 })).join("")}
              </div>
              <div class="seat-label hero-label">
                <strong>You</strong>
                <span>${money(state.bankroll)}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="message">${poker.message}</div>

        ${pokerActionTray(poker, playerRank)}
      </div>

      <aside class="side-panel">
        ${chipInfoBox()}
        <section class="status-box">
          <h3>Poker Rules</h3>
          <p>Play costs a $10 ante. The board reveals as flop, turn, river. You can fold, call, or raise after each street.</p>
        </section>
        <section class="status-box hand-ranks">
          <h3>Hand Ranks</h3>
          <ol>
            <li>Royal flush</li>
            <li>Straight flush</li>
            <li>Four of a kind</li>
            <li>Full house</li>
            <li>Flush</li>
            <li>Straight</li>
            <li>Three of a kind</li>
            <li>Two pair</li>
            <li>Pair</li>
            <li>High card</li>
          </ol>
        </section>
      </aside>
    </section>
  `;
  clearCardMotion([
    ...poker.player,
    ...poker.community,
    ...poker.seats.flatMap((seat) => seat.cards),
  ]);
}

function pokerTurnHelp(poker) {
  if (poker.phase === "preflop-choice") return `Choose Play to ante ${money(POKER_ANTE)}, or Fold.`;
  if (["flop-action", "turn-action", "river-action"].includes(poker.phase)) {
    return `Your options: fold, call ${money(poker.currentCall)}, or raise.`;
  }
  if (poker.activeTurnId && poker.activeTurnId !== "you") {
    const seat = poker.seats.find((playerSeat) => playerSeat.id === poker.activeTurnId);
    return seat ? `${seat.name} is deciding.` : "";
  }
  if (poker.phase === "round-over") return "Hand complete.";
  return "Watch the table.";
}

function pokerActionTray(poker, playerRank) {
  const activeStreet = POKER_STREETS[poker.street];
  const canActOnStreet = ["flop-action", "turn-action", "river-action"].includes(poker.phase);
  const callAmount = canActOnStreet ? poker.currentCall : 0;
  const raiseTotal = activeStreet ? poker.currentCall + poker.selectedRaise : 0;
  const canAnte = state.bankroll >= POKER_ANTE;
  const canCall = activeStreet && state.bankroll >= callAmount;
  const canRaise = activeStreet && state.bankroll >= raiseTotal;

  if (poker.phase === "preflop-choice") {
    return `
      <div class="poker-action-tray">
        <div class="action-copy">
          <strong>Your turn</strong>
          <span>Hand: ${playerRank.name}. Ante ${money(POKER_ANTE)} to see the first three cards.</span>
        </div>
        <div class="action-buttons">
          <button class="secondary-button" type="button" data-action="poker-fold">Fold</button>
          <button class="primary-button" type="button" data-action="poker-play" ${canAnte ? "" : "disabled"}>Play ${money(POKER_ANTE)}</button>
        </div>
      </div>
    `;
  }

  if (canActOnStreet && activeStreet) {
    return `
      <div class="poker-action-tray">
        <div class="action-copy">
          <strong>${activeStreet.label} action</strong>
          <span>${poker.announcement}. Call ${money(callAmount)}, raise, or fold.</span>
        </div>
        <div class="raise-chip-row" aria-label="Raise chip selector">
          ${POKER_RAISE_CHIPS.map((amount) => `
            <button
              class="bet-chip ${poker.selectedRaise === amount ? "is-selected" : ""}"
              type="button"
              data-action="poker-select-raise"
              data-amount="${amount}"
              aria-label="Raise by ${money(amount)}"
            >
              ${money(amount)}
            </button>
          `).join("")}
        </div>
        <div class="action-buttons">
          <button class="secondary-button" type="button" data-action="poker-fold">Fold</button>
          <button class="secondary-button" type="button" data-action="poker-call" ${canCall ? "" : "disabled"}>Call ${money(callAmount)}</button>
          <button class="primary-button" type="button" data-action="poker-raise" ${canRaise ? "" : "disabled"}>Call + raise to ${money(raiseTotal)}</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="table-actions">
      <button class="secondary-button" type="button" data-action="new-bet" ${poker.phase === "round-over" ? "" : "disabled"}>New hand</button>
      <button class="secondary-button" type="button" data-action="lobby">Lobby</button>
    </div>
  `;
}

function pokerSeatHtml(seat, poker) {
  const winnerClass = poker.winningSeatIds.includes(seat.id) ? "is-winner" : "";
  const turnClass = poker.activeTurnId === seat.id ? "is-turn" : "";
  const foldedClass = seat.folded ? "is-folded" : "";
  const profile = seat.profile || POKER_PERSONALITIES[seat.personality];
  const rankText = seat.folded
    ? "Folded"
    : poker.phase === "round-over" && seat.rank
      ? seat.rank.name
      : seat.lastAction;

  return `
    <div class="poker-seat seat-${seat.position} ${winnerClass} ${turnClass} ${foldedClass}">
      <div class="bot-sprite sprite-${profile.sprite}" aria-hidden="true">${profile.icon}</div>
      <div class="seat-label">
        <strong>${seat.name}</strong>
        <span>${profile.label}</span>
        <em>${money(seat.stack)}</em>
      </div>
      <div class="seat-cards" aria-label="${seat.name}'s cards">
        ${seat.folded ? `<div class="folded-marker">Folded</div>` : seat.cards.map((card, index) => cardHtml(card, { compact: true, delay: index * 70 })).join("")}
      </div>
      <div class="seat-chip-stack" aria-hidden="true">
        ${seat.folded ? "" : pokerChipPile(7)}
      </div>
      <small>${rankText}</small>
    </div>
  `;
}

function pokerChipPile(count) {
  const colors = ["red", "blue", "green", "black", "gold"];
  return Array.from({ length: count }, (_, index) => {
    const color = colors[index % colors.length];
    const chipX = ((index % 8) - 4) * 13;
    const chipY = Math.floor(index / 8) * 8;
    const chipRotation = ((index % 5) - 2) * 12;
    return `<span class="felt-chip chip-dot-${color}" style="--chip-x:${chipX}px; --chip-y:${chipY}px; --chip-r:${chipRotation}deg"></span>`;
  }).join("");
}

function pokerPlayHand() {
  const poker = state.poker;
  if (!poker || poker.phase !== "preflop-choice") return;
  if (state.bankroll < POKER_ANTE) {
    poker.message = "You need at least $10 to ante.";
    renderPoker();
    return;
  }

  pokerPostUserBet(POKER_ANTE);
  pokerSeatsPostBet(POKER_ANTE);
  poker.activeTurnId = null;
  poker.announcement = `You played for ${money(POKER_ANTE)}`;
  poker.message = `You ante ${money(POKER_ANTE)}. The flop is coming out.`;
  dealPokerStreet("flop");
}

function pokerFold() {
  const poker = state.poker;
  if (!poker || poker.phase === "round-over" || poker.phase === "dealing") return;
  poker.phase = "round-over";
  poker.activeTurnId = null;
  poker.winningSeatIds = [];
  poker.announcement = poker.userInvested > 0 ? `You folded` : "You folded before the ante";
  poker.message = poker.userInvested > 0
    ? `You folded and lost ${money(poker.userInvested)} from this hand.`
    : "You folded before the ante. No money lost.";
  renderPoker();
}

function pokerSelectRaise(amount) {
  const poker = state.poker;
  if (!poker || !POKER_RAISE_CHIPS.includes(amount)) return;
  poker.selectedRaise = amount;
  renderPoker();
}

function pokerCommitBet(kind) {
  const poker = state.poker;
  const street = POKER_STREETS[poker?.street];
  if (!poker || !street || !["flop-action", "turn-action", "river-action"].includes(poker.phase)) return;

  const userAmount = kind === "raise" ? poker.currentCall + poker.selectedRaise : poker.currentCall;
  if (state.bankroll < userAmount) {
    poker.message = `You need ${money(userAmount)} to ${kind}.`;
    renderPoker();
    return;
  }

  pokerPostUserBet(userAmount);
  poker.userStreetBet += userAmount;
  if (kind === "raise") poker.currentCall = userAmount;

  const actionText = kind === "raise"
    ? `raised by ${money(poker.selectedRaise)}`
    : `called ${money(userAmount)}`;
  poker.activeTurnId = null;
  poker.announcement = `You ${actionText}`;
  poker.message = kind === "raise"
    ? `You ${actionText}. The AI players decide whether to call or fold.`
    : `You ${actionText}.`;

  if (kind === "raise") {
    renderPoker();
    window.setTimeout(() => runAiResponseToUserRaise(poker.selectedRaise), 450);
  } else {
    advanceAfterUserAction();
  }
  renderPoker();
}

function pokerPostUserBet(amount) {
  const poker = state.poker;
  spendBet(amount);
  poker.userInvested += amount;
  poker.pot += amount;
}

function pokerSeatsPostBet(userAmount) {
  const poker = state.poker;
  poker.seats.forEach((seat) => {
    if (seat.folded) return;
    const contribution = Math.min(userAmount, seat.stack);
    seat.stack -= contribution;
    seat.streetBet += contribution;
    seat.lastAction = `Called ${money(contribution)}`;
    poker.pot += contribution;
  });
}

function pokerCommitSeatBet(seat, amount) {
  const poker = state.poker;
  const contribution = Math.min(amount, seat.stack);
  seat.stack -= contribution;
  seat.streetBet += contribution;
  poker.pot += contribution;
  return contribution;
}

function dealPokerStreet(streetName) {
  const poker = state.poker;
  const street = POKER_STREETS[streetName];
  if (!poker || !street) return;

  poker.street = streetName;
  poker.phase = `${streetName}-dealing`;
  poker.currentCall = street.call;
  poker.userStreetBet = 0;
  poker.activeTurnId = null;
  poker.seats.forEach((seat) => {
    seat.streetBet = 0;
    if (!seat.folded) seat.lastAction = "Waiting";
  });
  poker.visibleCommunity = street.cardCount;
  poker.announcement = `${street.label} is dealing`;
  poker.message = `${street.label} cards are flipping onto the felt.`;
  renderPoker();

  const firstCardIndex = streetName === "flop" ? 0 : street.cardCount - 1;
  for (let index = firstCardIndex; index < street.cardCount; index += 1) {
    window.setTimeout(() => {
      if (state.poker !== poker) return;
      revealCard(poker.community[index]);
      renderPoker();
    }, 260 + (index - firstCardIndex) * 260);
  }

  const actionDelay = streetName === "flop" ? 1150 : 650;
  window.setTimeout(() => {
    if (state.poker !== poker) return;
    poker.message = `${street.label} is out. AI players are deciding.`;
    runAiStreetActions(streetName);
  }, actionDelay);
}

function runAiStreetActions(streetName) {
  const poker = state.poker;
  const seats = poker?.seats.filter((seat) => !seat.folded) || [];
  if (!poker) return;

  let index = 0;
  function nextSeat() {
    if (state.poker !== poker) return;
    if (index >= seats.length) {
      if (poker.seats.every((seat) => seat.folded)) {
        pokerWinByFold("Everyone folded before your action.");
        return;
      }
      poker.activeTurnId = "you";
      poker.phase = `${streetName}-action`;
      poker.announcement = "Your turn";
      poker.message = `${POKER_STREETS[streetName].label} action. Fold, call ${money(poker.currentCall)}, or raise.`;
      renderPoker();
      return;
    }

    const seat = seats[index];
    index += 1;
    if (seat.folded) {
      nextSeat();
      return;
    }

    poker.activeTurnId = seat.id;
    poker.announcement = `${seat.name}'s turn`;
    poker.message = `${seat.name} is deciding.`;
    renderPoker();

    window.setTimeout(() => {
      if (state.poker !== poker) return;
      const decision = chooseAiPokerDecision(seat, poker, false);
      applyAiPokerDecision(seat, decision);
      renderPoker();
      window.setTimeout(nextSeat, 480);
    }, 650);
  }

  nextSeat();
}

function runAiResponseToUserRaise(raiseBy) {
  const poker = state.poker;
  const seats = poker?.seats.filter((seat) => !seat.folded) || [];
  if (!poker) return;

  let index = 0;
  function nextSeat() {
    if (state.poker !== poker) return;
    if (index >= seats.length) {
      if (poker.seats.every((seat) => seat.folded)) {
        pokerWinByFold("Everyone folded to your raise.");
        return;
      }
      poker.activeTurnId = null;
      poker.announcement = `AI players responded to your ${money(raiseBy)} raise`;
      advanceAfterUserAction();
      return;
    }

    const seat = seats[index];
    index += 1;
    poker.activeTurnId = seat.id;
    poker.announcement = `${seat.name}'s turn`;
    poker.message = `${seat.name} is deciding whether to call your raise.`;
    renderPoker();

    window.setTimeout(() => {
      if (state.poker !== poker) return;
      const decision = chooseAiPokerDecision(seat, poker, true);
      applyAiPokerDecision(seat, decision);
      renderPoker();
      window.setTimeout(nextSeat, 480);
    }, 650);
  }

  nextSeat();
}

function chooseAiPokerDecision(seat, poker, respondingToRaise) {
  const visibleBoard = poker.community.slice(0, poker.visibleCommunity);
  const hand = visibleBoard.length >= 3 ? bestPokerHand([...seat.cards, ...visibleBoard]) : null;
  const profile = seat.profile || POKER_PERSONALITIES[seat.personality];
  const strength = estimatePokerStrength(seat, visibleBoard, hand);
  const potOdds = poker.currentCall / Math.max(poker.pot + poker.currentCall, 1);
  const stackPressure = poker.currentCall / Math.max(seat.stack, 1);
  const latePositionBonus = seat.tablePosition >= 4 ? 0.04 : seat.tablePosition === 3 ? 0.02 : 0;
  const randomWobble = (Math.random() - 0.5) * profile.random;
  const drawingHand = hasPokerDraw(seat.cards, visibleBoard);

  let foldChance = 0.34 + potOdds * 0.34 + stackPressure * 0.28 - strength * 0.54 - latePositionBonus;
  let raiseChance = 0.08 + strength * 0.34 + latePositionBonus;

  foldChance *= profile.tightness;
  foldChance /= profile.callBias;
  raiseChance *= profile.aggression;

  if (drawingHand) {
    raiseChance += 0.05 * profile.bluff;
    foldChance -= 0.04;
  }
  if (strength < 0.34) raiseChance += 0.05 * (profile.bluff - 1);
  if (respondingToRaise) {
    raiseChance = 0;
    foldChance += 0.08;
  }

  foldChance = clamp(foldChance + randomWobble, 0.04, 0.72);
  raiseChance = clamp(raiseChance + Math.max(0, randomWobble), 0.02, 0.48);

  if (strength > 0.76) foldChance = Math.min(foldChance, 0.08);
  if (strength < 0.24 && potOdds > 0.22) foldChance = Math.max(foldChance, 0.34);

  if (Math.random() < foldChance && strength < 0.62) return { type: "fold" };
  if (seat.stack > poker.currentCall + 50 && Math.random() < raiseChance) {
    const baseOptions = [25, 50, 100, 150].filter((amount) => seat.stack >= poker.currentCall + amount);
    const preferredIndex = Math.min(baseOptions.length - 1, Math.max(0, Math.floor((strength + (profile.raiseSize - 1)) * baseOptions.length)));
    const raiseBy = baseOptions[preferredIndex] || 25;
    return { type: "raise", raiseBy };
  }
  return { type: "call", amount: Math.max(0, poker.currentCall - seat.streetBet) };
}

function estimatePokerStrength(seat, visibleBoard, hand) {
  if (!visibleBoard.length) {
    const [first, second] = seat.cards;
    const highCard = Math.max(first.value, second.value);
    const pairBonus = first.value === second.value ? 0.34 : 0;
    const suitedBonus = first.suit === second.suit ? 0.04 : 0;
    const connectedBonus = Math.abs(first.value - second.value) <= 2 ? 0.04 : 0;
    return clamp((highCard - 2) / 12 * 0.38 + pairBonus + suitedBonus + connectedBonus, 0.08, 0.88);
  }

  const madeHand = hand ? hand.score / 8 : 0;
  const highCard = Math.max(...seat.cards.map((card) => card.value));
  const kicker = (highCard - 2) / 12 * 0.12;
  const drawBonus = hasPokerDraw(seat.cards, visibleBoard) ? 0.12 : 0;
  return clamp(0.12 + madeHand * 0.78 + kicker + drawBonus, 0.06, 0.96);
}

function hasPokerDraw(holeCards, visibleBoard) {
  if (visibleBoard.length < 3) return false;
  const cards = [...holeCards, ...visibleBoard];
  const suitCounts = cards.reduce((counts, card) => {
    counts[card.suit] = (counts[card.suit] || 0) + 1;
    return counts;
  }, {});
  if (Object.values(suitCounts).some((count) => count >= 4)) return true;

  const values = [...new Set(cards.flatMap((card) => card.value === 14 ? [14, 1] : [card.value]))].sort((a, b) => a - b);
  for (let index = 0; index <= values.length - 4; index += 1) {
    const windowValues = values.slice(index, index + 4);
    if (windowValues[3] - windowValues[0] <= 4) return true;
  }
  return false;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function applyAiPokerDecision(seat, decision) {
  const poker = state.poker;
  if (!poker || seat.folded) return;

  if (decision.type === "fold") {
    seat.folded = true;
    seat.cards.forEach((card) => {
      card.faceUp = false;
      card.motion = "";
    });
    seat.lastAction = "Folded";
    poker.announcement = `${seat.name} folded`;
    poker.message = `${seat.name} folded.`;
    return;
  }

  if (decision.type === "raise") {
    const newCall = poker.currentCall + decision.raiseBy;
    const contribution = pokerCommitSeatBet(seat, Math.max(0, newCall - seat.streetBet));
    poker.currentCall = newCall;
    seat.lastAction = `Raised ${money(decision.raiseBy)}`;
    poker.announcement = `${seat.name} raised by ${money(decision.raiseBy)}`;
    poker.message = `${seat.name} raised by ${money(decision.raiseBy)}. At the bottom you can call, raise, or fold.`;
    return;
  }

  const contribution = pokerCommitSeatBet(seat, decision.amount);
  seat.lastAction = `Called ${money(contribution)}`;
  poker.announcement = `${seat.name} called ${money(contribution)}`;
  poker.message = `${seat.name} called.`;
}

function advanceAfterUserAction() {
  const poker = state.poker;
  if (!poker) return;

  if (poker.street === "flop") {
    window.setTimeout(() => dealPokerStreet("turn"), 450);
  } else if (poker.street === "turn") {
    window.setTimeout(() => dealPokerStreet("river"), 450);
  } else {
    window.setTimeout(pokerRevealShowdown, 450);
  }
}

function pokerWinByFold(reason) {
  const poker = state.poker;
  if (!poker) return;
  poker.phase = "round-over";
  poker.activeTurnId = null;
  poker.winningSeatIds = ["you"];
  poker.announcement = "You win by fold";
  pay(poker.pot);
  poker.message = `${reason} You win the ${money(poker.pot)} pot.`;
  renderPoker();
}

function pokerRevealShowdown() {
  const poker = state.poker;
  if (!poker) return;
  poker.phase = "revealing";
  poker.activeTurnId = null;
  poker.announcement = "Showdown";
  poker.message = "Final bets are in. The AI players are flipping their cards.";
  renderPoker();

  poker.seats.filter((seat) => !seat.folded).forEach((seat, seatIndex) => {
    seat.cards.forEach((card, cardIndex) => {
      window.setTimeout(() => {
        if (state.poker !== poker) return;
        revealCard(card);
        renderPoker();
      }, 250 + seatIndex * 280 + cardIndex * 120);
    });
  });

  window.setTimeout(settlePoker, 1950);
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

function bestPokerHand(cards) {
  let best = null;
  for (let first = 0; first < cards.length - 4; first += 1) {
    for (let second = first + 1; second < cards.length - 3; second += 1) {
      for (let third = second + 1; third < cards.length - 2; third += 1) {
        for (let fourth = third + 1; fourth < cards.length - 1; fourth += 1) {
          for (let fifth = fourth + 1; fifth < cards.length; fifth += 1) {
            const hand = evaluatePokerHand([
              cards[first],
              cards[second],
              cards[third],
              cards[fourth],
              cards[fifth],
            ]);
            if (!best || comparePokerHands(hand, best) > 0) {
              best = hand;
            }
          }
        }
      }
    }
  }
  return best;
}

function settlePoker() {
  const poker = state.poker;
  if (!poker || state.activeGame !== "poker") return;
  poker.playerRank = bestPokerHand([...poker.player, ...poker.community]);
  poker.seats.filter((seat) => !seat.folded).forEach((seat) => {
    seat.rank = bestPokerHand([...seat.cards, ...poker.community]);
  });

  const contenders = [
    { id: "you", name: "You", rank: poker.playerRank },
    ...poker.seats.filter((seat) => !seat.folded).map((seat) => ({ id: seat.id, name: seat.name, rank: seat.rank })),
  ];

  const best = contenders.reduce((leader, contender) => (
    comparePokerHands(contender.rank, leader.rank) > 0 ? contender : leader
  ));
  const winners = contenders.filter((contender) => comparePokerHands(contender.rank, best.rank) === 0);
  const userWon = winners.some((winner) => winner.id === "you");
  poker.winningSeatIds = winners.map((winner) => winner.id);
  poker.phase = "round-over";
  poker.activeTurnId = null;

  if (userWon && winners.length === 1) {
    pay(poker.pot);
    poker.announcement = `You won with ${poker.playerRank.name}`;
    poker.message = `You win the ${money(poker.pot)} pot with ${poker.playerRank.name}. Profit: ${money(poker.pot - poker.userInvested)}.`;
  } else if (userWon) {
    const payout = Math.floor(poker.pot / winners.length);
    pay(payout);
    poker.announcement = `Split pot: ${poker.playerRank.name}`;
    poker.message = `Split pot with ${poker.playerRank.name}. You receive ${money(payout)}.`;
  } else {
    poker.announcement = `${winners.map((winner) => winner.name).join(" and ")} won`;
    poker.message = `${winners.map((winner) => winner.name).join(" and ")} wins with ${best.rank.name}. You lose ${money(poker.userInvested)}.`;
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
