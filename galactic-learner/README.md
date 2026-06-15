# Galactic Learner

Galactic Learner is a browser-based Galaga-style canvas game built with vanilla HTML, CSS, and JavaScript. It includes 1-player, 2-player, persistent high scores, escalating enemy waves, and a lightweight JavaScript ML bot that learns from recorded player behavior.

## How to run

Start a simple local web server in this folder:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

The game uses JavaScript modules, so opening `index.html` directly from the file system may not work in every browser.

## Controls

Player 1:

- Move: `ArrowLeft` / `ArrowRight` / `ArrowUp` / `ArrowDown`
- Fire: `Space`

Player 2:

- Move: `A` / `D` / `W` / `S`
- Fire: `F`

General:

- Pause/resume: `P` or the Pause button
- Restart: Restart button
- Back to menu: Menu button

Holding fire repeatedly shoots at the normal cooldown rate. A single tap fires one shot if the cooldown is ready.

## Game modes

- **1 Player**: Human-controlled Player 1. This mode records training samples for the ML bot.
- **2 Player**: Two local players share the keyboard.
- **ML Bot Demo**: Player 1 is controlled by the learned policy after at least 50 samples exist.

## Enemy types

- **Basic**: Normal health, normal fire weighting, standard score.
- **Fast**: Blue insect-style attacker, low health, quicker dive movement, slightly higher score.
- **Shooter**: Fires more often and aims more accurately.
- **Boss / Abductor**: More health, worth many more points, and uses a wide tractor beam during dive attacks.

Each type uses a different pixel-style canvas shape and color.

## Scoring

Enemy score is weighted by difficulty:

- Basic enemies are worth the least.
- Blue divers are worth more because they break formation aggressively.
- Shooters are worth more because they add aimed pressure.
- Boss / abductors are worth the most because they take more hits and can use a tractor beam.

Destroying a diving enemy also gives a small bonus. The game shows the exact `+points` popup at the enemy's position when it is destroyed.

## Difficulty and game over

Difficulty is centralized in `getDifficultyForLevel(level)`. Each level increases enemy rows/columns, horizontal formation speed, fire rate, bullet speed, aim accuracy, descent pressure, max enemy shots, and special enemy ratio.

The pacing is closer to classic Galaga now: enemies mostly hold a formation near the top, slide horizontally, and individual attackers sporadically break formation into curved dive-bomb runs. Dives become faster and more frequent on later levels. Level 1 is intentionally forgiving, while levels 3+ add denser waves, more shots, better aim, and multiple divers.

The warning line marks the invasion zone. If the main enemy formation reaches the player zone / invasion line, the run ends immediately with **Invaded — Game Over**. Diving attackers can collide with the player or shoot, but they are allowed to swoop and return instead of instantly ending the run just for crossing low on the screen. The game also ends when all player lives are gone.

High scores are saved to localStorage and the top 10 are shown on the High Scores screen.

## What data is collected

During human 1-player gameplay, the game records Player 1 samples about every 120ms. Fire and movement samples are always kept. Pure idle samples are downsampled so the bot does not learn to freeze.

Each ML sample stores normalized state values for:

- Player X and Y
- Player lives
- Log-scaled score
- Level
- Nearest enemy X/Y and distance
- Nearest enemy bullet X/Y and distance
- Bullet threat flags for left, center, and right
- Enemy count
- Player bullet count
- Time since last shot
- Enemy distance to the bottom invasion line
- Formation center X
- Nearest enemy relative X
- Nearest bullet relative X/Y

Each action stores:

- `moveX`: left, still, or right
- `moveY`: up, still, or down
- `fire`: yes/no

All data stays in the browser in localStorage. There is no backend.

## How the ML model works

The model in `src/mlPolicy.js` is behavior cloning from human gameplay. It uses weighted k-nearest neighbors:

1. Store human gameplay state/action examples.
2. Compare the bot's current state to stored examples.
3. Find the nearest examples with k around 7 to 13.
4. Vote separately for `moveX`, `moveY`, and `fire`.
5. Weight closer samples more strongly.

If confidence is weak, a simple helper policy prevents the bot from freezing. The helper tracks a shootable enemy, tries to stay below it, smooths rapid left/right flips, corrects away from screen edges, dodges dangerous bullets, and fires when roughly aligned. It does not replace the ML policy; it only fills gaps when the learned data is uncertain.

The bot also improves from its own play in ML Bot Demo. Good bot outcomes, such as scoring or firing while aligned, are saved as higher-quality self-play samples. Mistakes, such as losing a life, climbing too high, or jittering near a target, create corrective samples with lower reward. These self-play samples are stored live in localStorage and participate in future weighted kNN votes.

## How to train the bot

1. Play 1-player mode for several rounds.
2. Generate at least 50 samples; 100+ is better.
3. Try to include movement, dodging, and firing examples.
4. Return to the menu.
5. Start ML Bot Demo.

The ML Bot Demo HUD shows sample count, predicted movement, predicted fire, target aim error (`AimDx`), confidence, self-play sample count, current-run evolution count, mistake count, nearest enemy distance, and nearest bullet distance.

## Training data controls

Open **ML Training Data / Bot Info** from the main menu to:

- Check sample count and model readiness.
- Clear training data.
- Export training data as JSON.

## Limitations

- The model learns only from player behavior.
- Self-play evolution is reward-weighted behavior cloning, not full reinforcement learning.
- It improves as human and bot-collected samples improve.
- Several rounds of varied human data are usually needed.
- It does not plan long-term strategy.
- The fallback helper can keep the bot active when data is weak, but it is intentionally simple.
