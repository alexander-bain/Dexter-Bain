# Market Time Machine — A Lifetime of Investing

This file is the project plan and working brief for the **investing game** that
lives at `stock/`. It is written so that a coding agent (Codex, Claude, or a
human) can pick up any milestone below and know exactly what to build, how to
build it, and how to know it is done.

> **For the agent reading this:** treat the milestones as the source of truth.
> Work one milestone at a time, top to bottom. Each milestone has a *Definition
> of Done* — do not move on until it is met. Keep changes small and committed.

> **Note on Codex:** Codex reads `AGENTS.md` automatically. This file
> (`CLAUDE.md`) is the *project plan*; the existing `AGENTS.md` holds the
> general working style. Point Codex at this file by name, or add a line to
> `AGENTS.md` that says "See CLAUDE.md for the stock game project plan."

---

## 1. The vision

Today `stock/index.html` is a **one-year** game. We are turning it into a
**whole-life** game.

A young player should be able to:

1. Pick a **birth year** (1900–2000) and the year they **enter the workforce**.
2. Earn a salary, and decide **how much of it to save** each year.
3. Decide **how to invest** those savings across a few options (index fund,
   individual stocks, bonds, cash).
4. Watch their life and money play out **year by year**, through **real stock
   returns and real world events**.
5. **Retire** and find out what kind of retirement they earned.

The game should quietly teach two big lessons:

- **Index funds usually beat stock-picking** over a long life.
- **Lower your risk as you get older.** A 25-year-old can ride out a crash; a
  64-year-old cannot.

It should also be **fun**: cheeky messages about how life is going, surprise
life events, and a retirement "ending" that feels earned.

---

## 2. Project snapshot (what exists today)

- **Repo:** a static site (`dexterbain.com`) of single-file HTML games.
- **The page we are changing:** `stock/index.html` — one self-contained file
  (HTML + CSS + JS, no build step).
- **What it does now:** $10,000, pick a year before 2000, spread money across
  real tickers, the year plays out across one real-world trading session
  (1 in-game day every 65 seconds). It pulls real prices from `stooq.com` and
  falls back to a math model when offline or when the data is missing.
- **Homepage card:** `index.html` has a "Market Time Machine" card linking to
  `stock/`. Update its description text when the game changes.
- **No backend needed** for this game — everything runs in the browser and
  saves to `localStorage`. Keep it that way.

---

## 3. How to run and test locally

There is **no build step**. To preview:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/stock/`.

Test checklist for every change:

- Open in a browser and play through a full life.
- Try the edge cases: birth year 1900, birth year 2000, retiring in the future.
- Turn off the network (DevTools → Network → Offline) and confirm the game
  still works using bundled data.
- Check it on a narrow phone-width window.
- Open the console — there should be **no errors**.

---

## 4. Tech rules and conventions

- **One file is fine.** `stock/index.html` can stay a single file. If it grows
  past ~1,500 lines, split data files out into `stock/data/*.json` and load
  them with `fetch`. Do **not** add a bundler or npm dependencies for this game.
- **Vanilla JS only.** No React, no frameworks. The rest of the site is plain
  HTML/JS and this should match.
- **Save to `localStorage`** under a versioned key (e.g. `mtm-life-v1`). Bump
  the version if the save shape changes so old saves do not crash.
- **Never block the screen on the network.** Always render instantly from
  bundled data, then upgrade with live data if it arrives.
- **Escape all user text** before putting it in `innerHTML` (there is already
  an `escapeHtml` helper — reuse it).
- **Keep accessibility:** real `<label>`s, `aria-live` on changing numbers,
  buttons reachable by keyboard.
- **Commit messages:** short and descriptive, e.g. `Add yearly decision loop`.
- Don't break the **existing one-year game** unless a milestone says to replace
  it. Milestone 4 makes the lifetime game the default.

---

## 5. Key design decisions

### 5.1 The "born too late" problem (important)

Birth years run 1900–2000. The current year is **2026**. Someone born in 2000
is only 26 today, so they **cannot** finish a full career on real history.

**Decision:** the simulation has two zones.

- **History zone (up to 2025):** uses real annual returns and real events.
- **Future zone (2026 onward):** the year has not happened yet, so the game
  *projects* it — each future year draws a return from a realistic range and is
  clearly labelled **"Forecast — the future hasn't happened yet."**

At setup, if the player's planned retirement year is past 2026, show a friendly
heads-up instead of blocking them:

> "You were born in 2000 — you're only 26 in 2026! You can keep investing into
> the future, but the last stretch of your story is a forecast, not history."

This keeps every birth year 1900–2000 playable **and** teaches that the future
is uncertain. Do **not** silently change the birth-year limits.

### 5.2 How time moves

The old game scaled one year across a real trading session. The lifetime game
covers ~40–50 years, so that does not work.

**Decision:** the lifetime game is **turn-based**. Each turn is **one year**
(or, as a simpler option for Milestone 3, one *decade*). The player makes their
decisions, presses **"Live this year"**, sees the result, and continues. No
real-time timers. This is faster, calmer, and easier to build and test.

### 5.3 The investment options

Offer four asset types. Keep it to four — enough to teach, not so many it
overwhelms a kid.

| Option            | Risk      | Role in the lesson                                  |
|-------------------|-----------|-----------------------------------------------------|
| Index Fund (S&P 500) | Medium | The hero. Steady long-term winner.                   |
| Individual Stocks | High      | Big swings. Sometimes wins big, often lags the index.|
| Bonds             | Low       | Calm. Small returns. The "get safe" option.          |
| Cash / Savings    | Very low  | Safest, barely grows, loses to inflation.            |

The player sets a **percentage mix** that adds to 100%. They can **rebalance**
each year.

### 5.4 The retirement lesson (the glide path)

As the player nears retirement, the game should *notice* their risk level:

- 100% stocks at age 30 → "Bold! You've got decades to recover from a crash."
- 100% stocks at age 63 → "Risky. One bad year now could delay your retirement.
  Most investors move toward bonds as they age."

Score or feedback should reward a sensible **glide path** (lots of stocks when
young, more bonds when old) without forcing it.

### 5.5 Open questions for Dexter & Dad to decide

Leave these as comments in the code or answer them before Milestone 3:

- Should decisions happen **every year** or **every decade**? (Start with
  decade for Milestone 3, upgrade to yearly later — simpler to build first.)
- Use **nominal** dollars or **inflation-adjusted** dollars? (Recommend showing
  nominal but mentioning inflation in messages — real dollars confuse kids.)
- One difficulty, or **Easy / Realistic** modes?

---

## 6. The data you need

Create two data files. They can start small and grow.

### 6.1 `stock/data/annual-returns.json`

Annual total return (as a decimal, e.g. `0.18` = +18%) for each asset type, by
year, from 1900 to 2025.

```json
{
  "1929": { "index": -0.084, "stocks": -0.12, "bonds": 0.04, "cash": 0.05 },
  "1931": { "index": -0.438, "stocks": -0.50, "bonds": -0.02, "cash": 0.02 },
  "2008": { "index": -0.370, "stocks": -0.45, "bonds": 0.05, "cash": 0.02 }
}
```

- `index` = S&P 500 total return. **Use real numbers.**
- `stocks` = a more volatile pick — exaggerate the index swing, or use a real
  famous stock per era.
- `bonds` / `cash` = 10-year Treasury and T-bill style returns.
- **Sources to compile from (verify, don't trust one):** the NYU Stern
  (Damodaran) historical returns dataset, Slickcharts S&P 500 annual returns,
  and macrotrends. A few anchor values to sanity-check your file against:
  1933 ≈ +54%, 1954 ≈ +53%, 1974 ≈ −26%, 1987 ≈ +5%, 2008 ≈ −37%,
  2013 ≈ +32%, 2020 ≈ +18%. If your file disagrees wildly with these, it's
  wrong.
- The live `stooq.com` fetch can still enhance recent years, but the JSON file
  must make the game fully playable offline.

### 6.2 `stock/data/world-events.json`

A short, punchy event for notable years.

```json
{
  "1929": "The Wall Street Crash. Fortunes vanish overnight.",
  "1969": "Apollo 11 lands on the Moon. Optimism is high.",
  "1987": "Black Monday — the market drops 22% in one day.",
  "2000": "The dot-com bubble bursts. Tech darlings collapse.",
  "2008": "The global financial crisis. Banks fail.",
  "2020": "A pandemic shuts down the world, then markets roar back."
}
```

Not every year needs an event — only the memorable ones.

---

## 7. Milestones

Six milestones. Each is a commit-worthy chunk of progress. **Do them in order.**

### Milestone 1 — Make the current game fast and solid

*Goal: the existing one-year game loads instantly and never stutters. This is
the warm-up and it pays off everywhere later.*

Steps:

1. **Fix the chart.** `renderChart()` currently `await`s `portfolioValue()` 42
   times in a row. Compute each holding's final return **once**, then build all
   42 chart points with plain math — no `await` in the loop.
2. **Bundle a fallback dataset** so the first paint never waits on the network.
   Render from bundled/cached data immediately; upgrade with live `stooq` data
   only if it arrives.
3. **Cache live prices in `localStorage`**, not just in a memory object, so a
   reload is instant.
4. **Separate the timer tick from input renders.** Typing in a field should not
   redo the same work as the 65-second day tick.
5. Confirm the service worker (`sw.js`) caches the `stock/` page for offline
   use.

Definition of Done:

- The page is interactive in well under a second, even offline.
- No `await` inside the chart-point loop.
- Console is clean. The game plays exactly as before, just faster.

### Milestone 2 — The data layer

*Goal: real history is available to the game as data.*

Steps:

1. Create `stock/data/annual-returns.json` covering **1900–2025** for all four
   asset types (Section 6.1). Start with every 5th year if needed, then fill in.
2. Create `stock/data/world-events.json` (Section 6.2).
3. Add a small loader in the page that fetches both files once on startup and
   keeps them in memory, with a bundled mini-version as a fallback.
4. Write a tiny self-check that logs a warning if a year's `index` value is
   outside −0.6 to +0.6 (catches typos).

Definition of Done:

- Both JSON files exist and load without errors.
- The anchor values in Section 6.1 match the file.
- The game still runs (this milestone adds data, it doesn't change gameplay).

### Milestone 3 — The life setup screen

*Goal: the player can describe their life before investing starts.*

Steps:

1. Add a **setup screen** with: birth year (1900–2000), workforce entry age
   (16–25), and target retirement age (55–70).
2. Compute the entry year and retirement year. If retirement year > 2026, show
   the friendly "forecast" heads-up from Section 5.1 — **do not block it**.
3. Give the player a **starting salary** based on their entry year, and pick a
   savings rate to start (a slider, 0–30% of income).
4. Show a one-line **life preview**: "Born 1975 · Start work 1996 at age 21 ·
   Plan to retire 2040 at 65."
5. Save the setup to `localStorage`.

Definition of Done:

- Every birth year 1900–2000 produces a valid, playable setup.
- The forecast warning appears only when retirement is past 2026.
- Reloading the page keeps the setup.

### Milestone 4 — The yearly (or per-decade) decision loop

*Goal: the heart of the game — make decisions, live the year, see the result.*

Steps:

1. Build the main loop: for each turn, the player sets their **savings rate**
   and their **asset mix** (four sliders that total 100%).
2. A **"Live this year"** button advances time. Apply that year's real returns
   to each asset, add the year's new savings, and update the portfolio.
3. Show the **world event** for that year if there is one, and how it hit the
   market.
4. Apply a **salary that grows** over a career (roughly 3–4% a year, with a
   little randomness).
5. Use **forecast returns** for any year after 2025 (Section 5.1).
6. Make the lifetime game the **default** at `stock/`. Keep the old one-year
   game reachable behind a "Classic mode" link if it's easy; otherwise retire
   it.

Definition of Done:

- A player can go from workforce entry all the way to retirement.
- Money compounds correctly: a 100%-index player over a long career should end
  up with a large, believable balance.
- Real events show up in the right years.

### Milestone 5 — Life messages and the retirement ending

*Goal: make it feel like a life, not a spreadsheet.*

Steps:

1. Add **life-event messages** between turns — some random, some tied to the
   market. Examples: "You got a promotion — your salary jumped!", "A recession
   hit and you were laid off for a year.", "You started a family — expenses are
   up, saving is harder." Have fun with the tone.
2. Add **risk-coaching messages**: warn a player who is still 100% stocks close
   to retirement (Section 5.4); praise a sensible glide path.
3. Build the **retirement ending screen**: final nest egg, a verdict
   ("Beach house and grandkids' college funds" vs. "You'll need a part-time
   job"), and a clear comparison: *"If you had put everything in the index
   fund, you'd have $X."*
4. Show the lesson plainly at the end: index vs. stock-picking, and whether
   their glide path helped.

Definition of Done:

- The ending changes meaningfully based on how the player did.
- The index-fund comparison always appears.
- Messages are fun and never crash on weird inputs.

### Milestone 6 — Polish, leaderboard, and learn mode

*Goal: ship-ready.*

Steps:

1. Adapt the existing **leaderboard** to record final retirement nest eggs
   (name, birth year, retirement age, final amount).
2. Add a short **"How investing works"** panel — a few sentences using the
   glossary in Section 9.
3. Full **accessibility and mobile** pass (Section 4).
4. Update the **homepage card** in `index.html` to describe the new game.
5. Update `README.md` so the `/stock` description matches.

Definition of Done:

- A first-time player understands the game without help.
- Works on a phone, works offline, console is clean.
- Homepage and README describe the real game.

---

## 8. Stretch goals (only after Milestone 6)

- **Inflation:** show what money is really worth over time.
- **International index** as a fifth asset.
- **Compare two lives** side by side (e.g. starts investing at 22 vs. 35).
- **Share card:** a little image summarizing your retirement to send to a
  friend.
- **Real per-stock data** for the "Individual Stocks" option using the existing
  `stooq` fetch, for famous winners and losers of each era.

---

## 9. Investing glossary (for Dexter)

- **Index fund:** a fund that buys a little of every big company at once
  (the S&P 500 is the 500 biggest US companies). You get the *whole market's*
  result, not one company's luck.
- **Diversification:** not putting all your eggs in one basket. If one company
  fails, the others carry you.
- **Risk:** how wild the ups and downs are. Stocks are high-risk, cash is
  low-risk.
- **Compounding:** your gains earn their own gains. It's slow at first and
  enormous after 40 years — which is why starting young matters so much.
- **Bonds:** lending money for a steady, small return. Calmer than stocks.
- **Glide path:** the plan to slowly move from risky (stocks) to safe (bonds)
  as you get older.
- **Bull market / bear market:** prices going up / prices going down.

---

## 10. Working agreements

- Build **one milestone at a time** and commit when its Definition of Done is
  met.
- Always keep the game **playable** — never commit a broken `stock/` page.
- Prefer the **smallest change** that satisfies a step.
- When a design choice from Section 5.5 comes up, ask Dexter & Dad rather than
  guessing.
- Test offline and on a phone-width screen **before** every commit.

Have fun with it. The goal is a game a kid would actually choose to play —
and quietly walk away from understanding why grown-ups love index funds.
