# SEVENFOLD

A standing-play WebXR arena game for **js13kGames 2026** (theme: *Unicorns and
Rainbows*), category **WebXR**. One `index.html`, 13,260 bytes zipped, plus the
competition's hosted Three.js.

You are a mage holding the last rainbow. The Umbra took the colour out of the
unicorns' world and sends its hollow herd against you: ash-black unicorns, each
with one burning horn in one of seven colours. Hold both triggers and the rainbow
stiffens into an arch that blocks. Swing and let go and it flies as a boomerang
that returns. Hold one trigger and it becomes a lasso: catch, then pull. Match a
horn's colour to shatter it; three matches charge a Nova. Seven colours are your
seven lives. Survive ten waves and two giants until dawn. Every unicorn sings its
colour from where it stands — the horde is the music.

## Play

- **Headset**: open the entry on play.js13kgames.com in the Quest/Pico/PC-VR
  browser, ENTER VR, pull a trigger. Controllers or hand tracking (pinch =
  trigger). Nothing uses thumbsticks or buttons other than trigger/grip.
- **Desktop** (for testing and judging without a headset): `npm run dev` and open
  <http://localhost:8080/dist/>. PLAY ON DESKTOP, click the canvas, pull a trigger
  (left mouse button).

| VR | desktop | rainbow |
|---|---|---|
| both triggers | B (hold) or both mouse buttons | **arch** — rigid, blocks gores and charges; a fast swing strikes |
| swing, let go | Space | **boomerang** — flies out 9 m and comes back to your hand, hitting everything on both legs |
| one trigger, swing, let go | G | **lasso** — the loop catches a unicorn; pull your hand back hard to kill |
| flick the slack rope | WASD while no trigger | **whip** crack |
| arch + clap hands (needs three colour hits) | N | **Nova** — a rainbow shockwave, everything within 6 m |
| — | mouse | look |
| — | WASD / QE | move both hands |
| — | R / M | restart / mute |

**Colour**: red is always at your left hand, violet at your right. The band that
touches a horn of the same colour does triple damage and charges the Nova. Each
gore greys out one band of your rainbow from the violet end; a greyed colour is
gone until you kill a giant (+2).

## Build, run, test

```bash
npm install
node build.js --level 2            # dist/index.html + dist/sevenfold.zip (fails above 13,312 bytes)
npm run dev                        # http://localhost:8080/ (sources) and /dist/ (the build)
node test/sim.test.js              # Node: rope, verbs, resonance, bots, determinism (~2 min)
node test/browser.test.js chromium --xr   # Playwright: built zip, desktop + XR shim
node tools/botrun.mjs 1 8          # perfect bot, seeds 1–8, per-wave clear times
node tools/iwer.mjs                # the built zip through Meta's WebXR emulation runtime (Quest 3 profile)
```

The dev server swaps the hosted Three.js URL for a local byte-identical copy
(the host sends no CORS header, so a page on localhost cannot import it
cross-origin); the built files and the zip are untouched.

## How it is made

- `src/sim.js` — pure simulation, no Three: the rope (Verlet, 29 points) and its
  modes, the boomerang, the lasso, the Nova, the shadow unicorns (three variants,
  two giants), ten waves, colours-as-lives. Fixed 1/90 s step, seeded, deterministic.
- `src/render.js` — Three.js r185 core only: one custom shader lights the dead
  forest, the standing stones, the ground and the instanced unicorns (fresnel rim,
  a point light at the rainbow, lightning flash, fog, galloping legs in the
  vertex shader); a sky dome with a dead red moon; 1800 GPU ash particles; 900
  GPU-aged burst particles; lightning tubes; the rainbow tube rebuilt every
  frame; a canvas text plane; Dawn.
- `src/audio.js` — Web Audio, no samples: wind, delayed positional thunder, the
  choir of horns (a panned voice per unicorn on a seven-note Phrygian scale that
  turns Lydian at dawn), a bass pulse per wave, and a sound for every event.
- `src/input.js`, `src/xr.js`, `src/main.js` — desktop controls and macros,
  hand-written WebXR bootstrap (no XRButton), the loop and the `window.SF` test
  hook. `build.js` — concat → terser → Roadroller → inline → zopfli zip → size gate.
- `test/` — the sim suite with the scripted bots, the Playwright suite, the fake
  `navigator.xr` shim, the recorded bot replay.

See `docs/09-rehaul.md` for the design, `DECISIONS.md` for every tuning
decision, `SUBMISSION.md` for the submission checklist.

## Credits and licence

Code and content by Arjun Vinod with Claude. Three.js (MIT) is loaded from the
js13kGames host as the category rules require; nothing else is loaded. Licence:
MIT.
