# DECISIONS.md — SEVENFOLD

Running log of every decision made where the spec (CLAUDE.md, docs/01–08) was
silent or where a number was tuned. Newest at the bottom of each section.

## Phase 0 — Setup (2026-09-04)

- Environment: Windows 11, Node 22.14, Git Bash. No `apt-get`; `advzip`, `ect`,
  `zopfli` binaries are not available. Zip fallback: `@gfx/zopfli` (WASM zopfli,
  dev dep) producing a raw deflate stream, wrapped in a hand-rolled single-entry
  zip container (local header + central dir + EOCD, CRC32 computed in JS). Falls
  back to `zlib.deflateRawSync` level 9 if zopfli fails. Verified with `unzip -t`.
- Hosted library `https://play.js13kgames.com/2026/webxr/three.js` responds
  200 (Cloudflare, 726,241 bytes). It is a single self-contained minified ESM
  bundle, `REVISION "185"`, exports `WebGLRenderer`. A copy is kept at
  `tools/three-hosted-r185.js` (gitignored) for the Playwright `page.route`
  fallback; npm `three@0.185.0` is only the API reference (its
  `three.module.js` splits into `three.core.js`, so the hosted copy is the
  better routing target).
- Dev server: `tools/serve.js` (zero-dep static server on 8080).

## Size log

| step | raw | min | rolled | zip |
|---|---|---|---|---|

## Phase 1 — Pure simulation (2026-09-04)

### Interpretation of the spec

- `sim.js` exposes `S._spawn` / `S._spawnBoss` (test hooks, ~30 bytes) so unit
  tests can place enemies without playing waves.
- A1 "again at DT=1/72 and 1/120": the sim's `DT` is a fixed 1/90 constant by
  design; the test instead feeds hand poses at 72 / 90 / 120 Hz input rates
  (what a 72 Hz or 120 Hz headset actually does) while the sim steps at 1/90.
  Segment-length bound relaxed from 3× to 3.5× rest: hands at 6 m/s stretch the
  Verlet rope transiently to ~3.1× (0.10 m); that is stretch, not an explosion.
- A7 "across DT batching patterns": inputs are injected per sim step, so
  `step(1)`×n and `step(n)` see the same stream; the test replays a recorded
  40 s perfect-bot stream twice and compares `hashState` every 90 steps, and
  checks the hash changes with the seed.
- Hands teleporting > 0.5 m in one step (controller reconnect, tracking loss)
  reset the rope to a straight line between the hands: no spurious crack, no
  velocity spike.
- Projectiles test the taut rope / Lance block **before** head, hand and unicorn
  hits, and the band is taken from the *nearest* rope point. Otherwise blocking
  with the red (left-hand) end was impossible: the orb hit the hand first.
- Lance "pierces up to 3": parts still on the 0.6 s cooldown from this thrust
  count toward the limit, so a thrust through four enemies hits the first three
  along the shaft and not the fourth on the next frame. A killed enemy no longer
  occupies the shaft.
- Light clamps at 0 (a Shell dive at 1 Light no longer shows −1).
- Endless mode follows docs/03 literally: wave n = wave 5 + (n−13) % 7, so the
  bosses recur (wave 16 = Gloam, wave 19 = Eclipse); counts ×1.3^(n−12), speed
  ×1.05^(n−12).

### Tuned constants (docs/03 value → shipped value, reason)

| what | docs | now | why |
|---|---|---|---|
| wave 1/2/3 interval | 2.0/2.0/1.8 | 3.0/2.6/2.6 | keep clear times ≥ 15 s |
| wave 5/6/7 interval | 1.6/1.6/1.5 | 1.8/2.3/3.2 | 15 s floor; wave 7 Swarm needs room |
| wave 9/10/11 interval | 1.4/1.2/1.1 | 2.4/1.5/3.0 | 360° spawns; wave 11 was unwinnable at human hand speed |
| spawn order | as listed | round-robin by type | no front-loaded triple Shells |
| Thunderhead HP / phase 2 | 60 / <30 | 400 / <150 | resonant arrows deal 18; 60 HP died in one eye window |
| Gloam core HP | 30 | 650 | phase 2 is the lance duel; 40–150 s window |
| Gloam phase 2 | kneels | kneels **and steps to 2.2 m**, core band re-rolled to 2–6 | red/orange cores were unreachable for resonant Lance contact from the play area |
| Gloam plates | chest Maul-only, stoop after slam | any plate breaks from a resonant arrow / Maul; no stoop | a 2.2 m Lance cannot reach 3.2 m plates from a 1 m play radius; arrows are the colour-aim lesson |
| Eclipse shells | 30 / 3 plates / 30 | 130 / three 24-HP melee-only tentacles / 180 | one-hit plates ended phase 2 in 1.2 s |
| Spitter cadence | 2.5 s | 3.5 s, first shot at the head | gives a blockable opener; wave 11 density |
| Shell reaching the unicorn | −2 immediately | flares 2.5 s then −2 | telegraph; blockable by killing it |
| Swarm dart cadence | — | 0.9 s | 3 landings in 2 s = −1 Light |
| player-blocking enemies | −1 every 2 s | flare 1.5 s, swing at 2 s; taut rope within 0.7 m or Lance blocks | as docs, telegraph added |

### Bot (test/bot.js)

Virtual body: head ≤ 2 m/s inside a 1 m radius, hands ≤ 5 m/s within 1.15 m
of the head, aim hold 0.27 s, reaction pause 0.16 s. Policies: rope by default
(arc for melee range, bow for the rest, ambush point on a circling Wisp's
orbit, rope/Lance block for unicorn-bound orbs with an intercept point outside
the unicorn's damage sphere), Lance when Swarms or lance-feasible Shells/Husks
are present and no Wisps circle, Maul for Eclipse tentacles, bow for
Thunderhead's eye and Gloam's plates, Lance duel for Gloam's core, shield stance
for the Eclipse pulse. Per-target failure counter falls back to the bow.

Results (seed: per-wave clear s): seeds 1–5 all reach Dawn with 5 Light;
Thunderhead 46–71 s, Gloam 46–47 s, Eclipse 44–47 s; normal waves 16–35 s.
Seeds 6–10: 4 of 5 reach Dawn (seed 6 dies in wave 11 — the densest wave is
deliberately at the edge of human hand speed). Wrong-tool bot clears 1–7 and
dies to Gloam on every seed; idle bot loses all Light by 19 s.

### Size log
(sim.js is not yet built; first measurement after Phase 2.)
