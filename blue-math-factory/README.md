# BlueMath Factory

BlueMath Factory is a polished educational tycoon game for ages 9+. Players power a blueberry-package business by solving multiplication facts, then move real inventory through a factory, warehouse, store backroom, visible shelves, customer baskets, and the cashier.

The production game is published at `https://dexterbain.com/bluemath/`.

## Technology

- Phaser 3 for scenes, movement, cameras, physics, particles, and animation
- TypeScript for the game and economy systems
- Vite with `base: "/bluemath/"`
- HTML/CSS for accessible, responsive menus and controls
- Web Audio API plus four original music arrangements
- LocalStorage with lossless Version 1 and Version 2 migration into Version 3

All visuals are original game art. The game has no backend, accounts, ads, payments, or paid assets.

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
| Interact | E or Space | Tap the large action button or the nearby prompt |
| Pause | Escape | Pause button |
| Math answer | Number keys 1–4, arrows + Enter, or click | Tap answer |

## Multiplication progression

Every round contains five multiplication facts using factors from 1 through 10. Each question has an exact visible countdown of 5, 4, 3, 2, then 1 second. Correct answers increase the blueberry reward multiplier. Five correct answers trigger Perfect Rush: +50 raw blueberries, +20 Math Power, and double factory speed for 60 seconds.

`MathEngine` tracks normalized facts, accuracy, misses, recency, fastest answer, and best streak. Missed facts return later at a fair rate, while a recent-fact queue prevents annoying repetition.

## Factory and economy

The fixed production recipe is **10 raw blueberries → 1 blueberry package** in an eight-second base cycle. Packages move from the factory into the warehouse, then to the store backroom, and only reach customers after appearing on an actual shelf. Upgrades improve raw production, processing speed, storage, value, delivery capacity, staff, and global efficiency. The long-term win condition is selling 10,000 packages; reaching it unlocks a golden victory celebration and endless play.

Factory and store upgrades live in `src/data/upgrades.ts`. Prices use `baseCost × growth^currentLevel`. Effects are summed by type in `UpgradeSystem` and exposed as a single economy snapshot, making the balance easy to inspect.

## Store, shelves, and staff

Every shelf has its own capacity and live package count. A manual restock costs exactly $10 only when at least one package can move from the backroom onto that shelf. Customers visibly collect multiple packages one at a time and money is added only after their basket reaches a cashier.

Hiring the cashier unlocks automatic checkout; speed and register upgrades increase throughput. Hiring the animated janitor/stocker unlocks automatic restocking for shelves at or below 25%. The janitor walks to the backroom, carries stock to the shelf, and pays the same $10 restock fee. Auto-restock can be turned off in Settings.

## Save system

Progress is stored under `blueMathFactory_save_v3`. On first Version 3 load, the exact Version 2 text is copied to `blueMathFactory_save_backup_v2` before migration. Money, upgrades, products, statistics, settings, and every old package are preserved; old store inventory is distributed onto shelves and into the backroom without loss. The original Version 1 and Version 2 keys remain untouched. The game autosaves every 10 seconds, after math rounds, purchases, scene changes, and before the page closes. Loads are schema-checked and numeric values are clamped. Offline production is limited to four hours. Reset Save always asks for confirmation.

## Folder structure

```text
blue-math-factory/
  public/          Static assets copied by Vite
  art-source/      Editable source for the package art
  promo/           Trailer plan, captions, voiceover, and gameplay stills
  scripts/         Deterministic sprite-sheet and music generators
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

## Rebalancing

- Global timing and starter values: `src/data/balance.ts`
- Upgrade costs and effect sizes: `src/data/upgrades.ts`
- Package recipe and inventory limits: `src/data/balance.ts`
- Customer behavior: `src/data/customerTypes.ts`
- Goal thresholds and rewards: `src/data/quests.ts`

Keep the first conveyor, first value upgrade, and first line expansion inexpensive. Test a new save plus realistic Version 1 and Version 2 saves after economy changes.

## Trailer capture mode

Append `?capture=hub`, `factory`, `store`, `math`, or `victory` to `/bluemath/` to open a deterministic, save-safe trailer setup. Capture mode does not read or overwrite player progress.
