# SUBMISSION — SEVENFOLD (js13kGames 2026, WebXR)

## 0. Do these by hand before submitting (top item)

**Manual emulator checklist** — the automated tests cover the desktop path in
Chromium, the WebXR code path through a fake `navigator.xr` (docs/07 C), and a
full pass through Meta's Immersive Web Emulation Runtime (`node tools/iwer.mjs`:
the runtime inside the Immersive Web Emulator, Quest 3 profile — session start,
first-trigger start, arch, throw/hit/catch, lasso/catch/yank, grips as
triggers, hand-tracking pinches, session end, zero errors). Nothing has run on
a headset. With Meta's *Immersive Web Emulator* Chrome
extension (or the WebXR API Emulator):

1. `npm run dev`, open `http://localhost:8080/dist/` in Chrome with the extension.
   DevTools → WebXR tab, device "Meta Quest 3". (The dev server swaps the hosted
   Three.js URL for a byte-identical local copy: the host sends no CORS header, so
   a localhost page cannot import it cross-origin. The zip is untouched and is
   same-origin on play.js13kgames.com.)
2. Click ENTER VR. Expect: the dead forest, standing stones, the red moon, ash
   falling around you, the rainbow hanging between the two controller positions
   (white rings), lightning now and then with thunder, no console errors. The
   first trigger pull recentres the arena on your head and starts the game.
3. Hold both triggers: the rope snaps into a rainbow arch. Swing forward and
   release: it flies out and returns to your hand (whoosh, catch).
4. Hold one trigger for a moment: the rope hangs from that hand with a loop.
   Swing it and let go: the loop flies. Catch a unicorn, pull your hand back
   sharply: it dies.
5. Wave 1: four stalkers. Block one rear-up with the arch (clank, it staggers).
   Match a horn's colour (red is your left end, violet your right): the chord and
   the coloured burst mean a resonant hit. Three of those: the rainbow pulses
   white and a seven-note chime plays. Hold the arch and clap: Nova.
6. `SF.state()` in the console shows draw calls (`calls`, budget ≤ 60; tests see
   12) and triangles (`tris`, ~30k).
7. Press the emulator's exit → the page returns to desktop mode with the
   PLAY ON DESKTOP / ENTER VR button, no errors.
8. In the emulator you cannot move a controller and press a button at the same
   time, so the game remembers a fast swing for half a second: swing the
   controllers forward quickly in the panel, then release the triggers. The same
   grace applies to the lasso.
9. Anything that fails: note it and fix it in the bugfix window (PRs by 14 Sept).

**Firefox** could not be run on the build machine: Playwright's Firefox binary
fails to start with a Windows side-by-side error ("Dependent Assembly mozglue …
could not be found"; a fresh download is byte-identical, so it is the machine,
not the install). `node test/browser.test.js firefox` runs the same desktop
tests on any machine where Playwright's Firefox launches — please run it once.

**Sound** could not be heard on the build machine (headless). The synth runs
without errors for full games in Chromium; please listen to one wave and one
giant on desktop before submitting and tell me what to change.

## 1. Final size

| step | bytes |
|---|---|
| source, concatenated | 46,276 |
| terser (property-mangled) | 33,896 |
| roadroller -O2 | 17,017 |
| index.html (inlined) | 17,657 |
| **dist/sevenfold.zip** | **13,260** (limit 13,312; margin 52) |

The shipping build is `node build.js --level 2` (`npm run build`). Roadroller's optimiser is not perfectly deterministic: rebuilding can move the
zip by ±15 bytes. `build.js` fails above the limit, so a rebuild can never ship
an oversized file unnoticed.

`unzip -l` → one entry, `index.html`. `unzip -t` → no errors. The only URL in
the build is `https://play.js13kgames.com/2026/webxr/three.js`. No
`localStorage.clear`, no `console.`.

| module | raw | minified |
|---|---|---|
| vec | 1,340 | 821 |
| sim | 13,079 | 9,346 |
| input | 3,593 | 2,323 |
| xr | 1,501 | 1,068 |
| audio | 6,527 | 4,866 |
| render | 17,400 | 13,700 |
| main | 3,245 | 2,590 |

## 2. What was cut, and what fits

Everything in docs/09 is in the zip: the world, the ash, the lightning, the
five verbs, the three variants, both giants, ten waves, Dawn, the full synth
soundtrack. Nothing from the rehaul design was cut. Endless mode and combo
scoring (priority 7) are not implemented. If bytes are ever needed: the hoof
ash and the boss mist (≈60 bytes), the ground grain (≈90), the standing stones
(≈150), then the lasso drag.

## 3. Tests (final build)

| suite | chromium | firefox |
|---|---|---|
| boot: title, PLAY ON DESKTOP, zero errors | ok | not run |
| desktop play: bot replay reaches wave 3 | ok | not run |
| render budget (12 calls, ~30k tris) | ok | not run |
| desktop macros: throw / arch / lasso / Nova events | ok | not run |
| game over text, R restarts at wave 1 | ok | not run |
| resize | ok | not run |
| mute persists, best score saved | ok | not run |
| offline three.js → friendly message | ok | not run |
| XR shim: enter, 300 frames, throw + catch, exit | ok | n/a |
| IWER (Immersive Web Emulator runtime, Quest 3): enter, start, arch, throw, lasso, grips, pinches, exit | ok | n/a |
| `node test/sim.test.js` | 19/19 | — |

Perfect-bot clear times (seconds, seeds 1–8): waves 11–12, 15–16, 19–21, 18–20,
**Herald 16–50**, 21–24, 19, 27–30, 31–33, **Sovereign ~60**. Every seed reaches
Dawn with all seven colours; the idle bot loses everything in 25 s; the
no-block bot dies to the Sovereign.

## 4. Submission form

- Category: **WebXR** only (do not tick Desktop/Mobile — the hosted library
  forbids it).
- Zip: `dist/sevenfold.zip`.
- Repo: <https://github.com/Arjun0014/SevenFold> (full source and `build.js`).
- Screenshot: `test-results/gal-horde.png` (the herd) or `gal-sovereign.png`.
- Description (≤ 500 chars, 499):

> You hold the last rainbow. The Umbra took every colour from the unicorns' world and sends its hollow herd against you: ash-black unicorns, each with one burning horn. Hold both triggers and the rainbow becomes an arch that blocks; swing and let go and it flies as a boomerang that returns. One trigger swings a lasso: catch and pull. Match a horn's colour to shatter it; three matches charge a Nova. Seven colours are seven lives. Survive ten waves and two giants until dawn. The horde is the music.

## 5. WebXR category checklist

- [x] Only external resource: the hosted Three.js (dynamic `import(U)`); no addons, XRButton, fonts, images, audio files.
- [x] `requestSession('immersive-vr')` from a user gesture only; `local-floor`; `setFoveation(1)`; session end returns to desktop mode.
- [x] Input: head pose, two grip poses, select (trigger / pinch) and squeeze (grip, treated as trigger). No thumbsticks, no buttons.
- [x] The player never moves and is never moved; everything comes to the player.
- [x] Zero console errors in Chromium desktop and through the XR shim; Firefox to be confirmed by hand.
- [x] Budget: 12 draw calls, ~30k triangles, 8 transparent meshes, one fog, no shadows, no post-processing.
- [x] `localStorage` keys `sevenfold_mute`, `sevenfold_best`; never cleared.
- [x] Original content; no copyrighted names.
