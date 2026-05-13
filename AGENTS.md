# DexterBain Agent Notes

## Working Style
- Work as fast as possible while still protecting the project from avoidable mistakes.
- Before writing code, briefly say whether the request looks possible and safe.
- Keep check-ins minimal. Prefer doing the work over frequent progress updates.
- Tell Dexter plainly how good the idea is, including any risks or tradeoffs.

## Collaboration
- Make the smallest safe change that solves the request.
- Do not overwrite or revert work from other agents unless Dexter explicitly asks for it.
- If the workspace has unrelated local changes, leave them alone.
- If Dexter says to push, commit and push only the relevant changes.
- If a push fails, do not stop after saying it was unsuccessful. Keep trying safe approved push paths until it is pushed or there is a true blocker that needs Dexter.

## Background Agent Jobs
- Cicero: frontend coding for minigames. Own the player-facing experience when assigned, including layout, buttons, forms, leaderboard display, custom game UI, wording, and daily weather game presentation. Main safe area: `minigames/index.html`. Avoid `server.js` unless specifically assigned.
- Dalton: backend coding for minigames. Own saving and loading picks, private rooms, custom game APIs, leaderboard data, results, durable storage, and backend tests when assigned. Main safe area: `server.js` and backend test scripts. Avoid `minigames/index.html` unless specifically assigned.
- Fermat: question asking and product thinking. Ask Dexter short helpful questions, turn answers into clear requirements, and organize future ideas. Do not edit code or push.
- Kant: coordinator. Keep agent work safe and separated, recommend who should own each task, and warn about overlap before multiple agents code. Protect shared files like `minigames/index.html` and `server.js`. Do not edit files unless Dexter explicitly assigns a coding task.
- Banach: bug fixing and quality. Find broken behavior across `dexterbain.com` and fix narrow, high-value bugs when assigned. First likely lane: durable notifications. Keep fixes small and verified; do not redesign features while fixing bugs.
