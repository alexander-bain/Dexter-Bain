# Shadow-Boxing
The Shadow Boxing game I'm working on with Dex

## Minigames Direction

Dexter wants `/minigames` to feel competitive first. The main audience is family, with room for strangers to join public games too.

The automatic game focus should be daily weather games. Every morning, the site should create that day's weather prediction game without Dexter needing to make it by hand.

The most important fun parts are the leaderboard and notifications. Players should be able to save picks, come back later, and see how they did by the end of the day.

Private games should have host controls and feel actually private. A host should be able to create a room, share a code or invite, and control the room without random people entering.

The future version should make the daily weather game feel like a real daily habit: make picks, watch the day happen, get notified, and check the final results.

## Fix List

No current items.

## Push Preference

If Dexter asks to push and the first push attempt fails, keep trying safe approved push paths until it is pushed or there is a true blocker that needs Dexter. Do not stop just to report that the push was unsuccessful.

## Database

The minigames backend can use a real Postgres database when the server has `DATABASE_URL` or `POSTGRES_URL` set. Picks, rooms, custom games, results, notification subscriptions, and generated notification keys move into the database automatically. If no database URL is set yet, the site falls back to the old JSON storage so it can keep running.

The Render deployment is wired in `render.yaml` to attach a Postgres database named `dexterbain-minigames-db` to the backend as `DATABASE_URL`. After Render applies that Blueprint, `/api/minigames/storage/status` should report `minigames: "postgres"` and `databaseReady: true`.
