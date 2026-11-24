# Rendering the BlueMath Factory trailers

The capture routes use seeded demo progress and never read or overwrite the player's save.

## Capture real gameplay

1. Open Chrome or the in-app browser at 1920×1080 and hide browser chrome with full-screen mode.
2. Capture each deployed route at 30 or 60 fps:
   - `https://dexterbain.com/bluemath/?capture=hub`
   - `https://dexterbain.com/bluemath/?capture=math`
   - `https://dexterbain.com/bluemath/?capture=factory`
   - `https://dexterbain.com/bluemath/?capture=store`
   - `https://dexterbain.com/bluemath/?capture=victory`
3. Click once after each route opens so browser audio is allowed. Record at least eight seconds of hub, math, and victory; at least twelve seconds of factory and store.
4. In the store shot, wait for a customer to collect multiple packages and for the janitor’s green `$10` restock toast. Walk onto the central glowing upgrade pad for five seconds for the upgrade shot.
5. Record narration from `voiceover-script.md` as 48 kHz mono WAV. Keep peaks below -3 dB.

## Edit and finish

1. Create a 1920×1080, 30 fps timeline of exactly 55 seconds and follow `storyboard.md`.
2. Use the game's original `public/audio/hub.wav`, `math.wav`, `factory.wav`, and `store.wav` beneath their matching scenes. Crossfade every music change by 250 ms.
3. Place the narration above the music, then add captions from `BlueMathFactory-Trailer-60s.srt`.
4. Duplicate the sequence, trim to the 15-second storyboard, and use `BlueMathFactory-Trailer-15s.srt`.
5. Export H.264 High Profile, 1920×1080, 30 fps, 12–16 Mbps video, AAC 48 kHz 320 kbps audio, web-optimized MP4.

Expected output filenames:

- `promo/BlueMathFactory-Trailer-60s.mp4`
- `promo/BlueMathFactory-Trailer-15s.mp4`

## Command-line encode after editing

If the editor exports ProRes masters named `BlueMathFactory-Trailer-60s.mov` and `BlueMathFactory-Trailer-15s.mov`, run:

```bash
ffmpeg -i promo/BlueMathFactory-Trailer-60s.mov -c:v libx264 -profile:v high -level 4.1 -pix_fmt yuv420p -r 30 -b:v 14M -maxrate 16M -bufsize 28M -movflags +faststart -c:a aac -b:a 320k -ar 48000 promo/BlueMathFactory-Trailer-60s.mp4
ffmpeg -i promo/BlueMathFactory-Trailer-15s.mov -c:v libx264 -profile:v high -level 4.1 -pix_fmt yuv420p -r 30 -b:v 14M -maxrate 16M -bufsize 28M -movflags +faststart -c:a aac -b:a 320k -ar 48000 promo/BlueMathFactory-Trailer-15s.mp4
```

Watch both exports all the way through. Confirm the URL is spelled correctly, all captions are inside title-safe margins, the music is audible under narration, the final frame holds for at least two seconds, and every shown feature exists in the deployed game.
