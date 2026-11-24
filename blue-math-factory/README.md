# BlueMath Factory

BlueMath Factory is a polished educational tycoon game for ages 9+. Players power a blueberry business by solving multiplication facts, then use the berries to run a factory, make products, serve customers, hire cashiers, and upgrade a growing store.

The production game is published at `https://dexterbain.com/bluemath/`.

## Technology

- Phaser 3 for scenes, movement, cameras, physics, particles, and animation
- TypeScript for the game and economy systems
- Vite with `base: "/bluemath/"`
- HTML/CSS for accessible, responsive menus and controls
- Web Audio API for original synthesized feedback and music
- LocalStorage for versioned saves

All visuals are original procedural/vector-style game art. The game has no backend, accounts, ads, payments, or paid assets.

## Run locally

Requires a current Node.js release.

```bash
cd blue-math-factory
npm install
npm run dev
```

Vite prints the local URL. The development server understands the `/bluemath/` base path.

## Test and build

```bash
npm test
npm run build
```

The build command runs strict TypeScript checking and writes the deployable game to `../bluemath/`. Preview it with:

```bash
npm run preview
```

## Publishing at `/bluemath/`

1. Run `npm install`, `npm test`, and `npm run build` inside `blue-math-factory/`.
2. Commit both the source project and generated `bluemath/` folder.
3. Push the commit to the GitHub Pages production branch.
4. Verify `https://dexterbain.com/bluemath/` with a cache-busting query string.
5. Refresh the route directly and verify all hashed assets return HTTP 200.

The static site serves `bluemath/index.html`, so refreshing the public route does not require a backend fallback.

## Controls

| Action | Desktop / Chromebook | Tablet / phone |
| --- | --- | --- |
| Move | WASD or arrow keys | Virtual joystick |
| Interact | E or Space | Interact button |
| Pause | Escape | Pause button |
| Math answer | Number keys 1–4, arrows + Enter, or click | Tap answer |

## Multiplication progression

Each streak starts with 1–3 facts and expands through 1–10. The seven difficulty steps use 9, 8, 7, 6, 5, 4, and 3 seconds. Rewards are 1, 2, 4, 8, 16, 32, and 64 blueberries. The timer never drops below 3 seconds and the reward stays at 64 after the seventh correct answer.

`MathEngine` tracks every normalized fact, accuracy, misses, recency, fastest answer, and best streak. Missed facts return later at a fair rate, while a recent-fact queue prevents annoying repetition.

## Factory and economy

Math creates the first raw blueberries. The Starter Conveyor unlocks passive production. Later upgrades add production, processing, storage, value, delivery capacity, and global efficiency. Packing machines consume raw berries to create the selected product. Eleven products unlock gradually, from fresh berries to blueberry pie.

Factory and store upgrades live in `src/data/upgrades.ts`. Prices use `baseCost × growth^currentLevel`. Effects are summed by type in `UpgradeSystem` and exposed as a single economy snapshot, making the balance easy to inspect.

## Customer line system

The store begins with a one-customer queue. Queue upgrades add visible waiting spaces. Each waiting customer gives a 5% social-proof arrival bonus, capped at 20%. Customers have patience, basket size, spending multipliers, and attraction values. Slow lines can cause departures. Cashiers and extra registers reduce the problem.

The player initially serves the register manually. Hiring a cashier unlocks automatic checkout; speed and register upgrades increase throughput.

## Save system

Progress is stored under `blueMathFactory_save_v1`. The game autosaves every 10 seconds, after math rounds, purchases, scene changes, and before the page closes. Loads are schema-checked and numeric values are clamped. Offline production is limited to four hours. Reset Save always asks for confirmation.

## Folder structure

```text
blue-math-factory/
  public/          Static assets copied by Vite
  src/
    data/          Balance, upgrades, products, quests, customers
    entities/      Player and customer game objects
    scenes/        Boot, menu, hub, challenge, factory, and store
    systems/       Math, economy, upgrades, quests, saves, audio
    ui/            HUD, panels, question interface, notifications
    main.ts        Phaser configuration
  tests/           Deterministic system tests
  vite.config.ts   `/bluemath/` deployment configuration
bluemath/          Generated production build
```

## Adding an upgrade

Add one `UpgradeDefinition` to `src/data/upgrades.ts`. Choose an existing effect type, cost curve, maximum level, and optional category-level requirement. The upgrade panel, purchase checks, save system, and derived economy values update automatically.

## Adding a product

Add a `ProductDefinition` to `src/data/products.ts`. Set its berry cost, production time, sale value, factory-level requirement, and optional machine requirement. The factory recipe picker and unlock logic update automatically.

## Rebalancing

- Global timing and starter values: `src/data/balance.ts`
- Upgrade costs and effect sizes: `src/data/upgrades.ts`
- Product costs and values: `src/data/products.ts`
- Customer behavior: `src/data/customerTypes.ts`
- Goal thresholds and rewards: `src/data/quests.ts`

Keep the first conveyor, first value upgrade, and first line expansion inexpensive. Test both a new save and a progressed save after economy changes.
