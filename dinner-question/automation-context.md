# Daphne Dinner Question Automation Context

## Real target
- Edit `/Users/dexter/.codex/worktrees/a5ae/Dexter-Bain/dinner-question/index.html`.
- Push the final dinner-question change to `main`.
- Do not use `guess/index.html` for Daphne's dinner question work.

## Difficulty rule
- Daphne starts from dinner level 3 unless saved browser state says otherwise.
- `Got it right first try` raises the next level by 1.
- `Needed a hint, then got it` keeps the next level the same.
- `Really struggled` lowers the next level by 1.
- Keep levels between 1 and 5.

## Question-writing rule
- When making new prompts, write one new number problem and one new word problem in case the wheel lands on either.
- At least one of the two prompts should include `67` or `32`.
- Change the prompts up from prior ones instead of just reordering the same numbers.
- Make difficulty follow the tracked dinner level and only adjust a little at a time.

## History rule
- The live page now has a `Show past questions` button that reads browser-saved history and shows past questions plus whether Daphne got them right, needed a hint, or struggled.
- That browser history is the real answer history.
- This markdown file is for automation guidance only; it does not auto-update from the browser.

## Current baseline for automation
- Assume dinner level 3 unless a newer committed note in this file says otherwise.
- If a future automation writes a manual level update here, trust that note before generating the next prompts.
