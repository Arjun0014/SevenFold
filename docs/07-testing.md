# 07 — Testing

The user has no headset. The tests and the bots are the headset. Three tiers:
A (Node sim) and B (Playwright desktop mode) are mandatory; C (XR shim) is
mandatory to *attempt*, with a defined fallback.

## A. `test/sim.test.js` — Node, no dependencies, < 20 s

Imports `src/sim.js`, `src/vec.js`, `test/trajectories.js`.

**A1 Rope stability.** Drive the hand poses with violent synthetic motion (random
walks at 6 m/s, teleporting 1 m jumps, hands crossing) for 30 s at DT=1/90, and
again at DT=1/72 and 1/120. Assert: no NaN, every segment length within 3× rest,
rope point speed < 60 m/s, tension in [0,1].

**A2 Raw forms.** Scripted hand motions:
- slack + fast flick → exactly one `crack` event in the window, band as expected
  from where the tip was; cooldown respected.
- hands 0.9 m apart, swing → `hit` event on an enemy placed in the path; no hit
  when speed < 3.5.
- taut arc + incoming orb of band X touching band X segment → `absorb` (+1
  Spectrum); band Y → `block`.
- bow: trigger, pull 0.4 m, release → `arrow` with expected speed/damage/band;
  pull 0.1 m → no arrow.

**A3 Sigil recogniser.** `trajectories.js` generates, for each of the 5 sigils, 10
variants: clean, jitter ±3 cm, slow (2.4 s), fast (0.5 s), mirrored (left/right
swap), rotated by head yaw 0/90/180/270°, small amplitude (just above threshold),
large amplitude. Assert every variant resolves to the right weapon. 20 negative
trails (straight small moves, random wander, a half circle, a stretch to 0.9 m
only) must resolve to `rope`. Print the 6×6 confusion matrix; any off-diagonal
count fails. Also: forge entry rules (both grips; hand-tracking pinch-hold), the
2.5 s timeout, the cooldown, and unforge (empty trail).

**A4 Weapons.** For each forged weapon: the hit rules in docs/02 §4 produce the
expected damage on a placed enemy; Halo returns; Prism drains Spectrum; Maul slam
requires Spectrum and hits everything in 4 m; Lance pierces 3 in a line; Shards
per-hand bands are correct.

**A5 Damage & resonance.** A hit with the matching band deals ×3 and emits
`resonant`; Shell plates ignore non-resonant non-Maul hits; Gloam plates likewise.

**A6 Waves & bots.** Run the full game with seed 1..5 for each bot:
- Idle bot: loses all Light on wave 1 within 25 s.
- Perfect bot: clears waves 1–12 (bosses included). Log per-wave times; assert
  15–90 s per normal wave, 40–150 s per boss. Assert Light never reaches 0.
- Wrong-tool bot (no forging): clears waves 1–5, fails at Gloam within 200 s.
- Endless: waves 13–16 run without errors and get harder (count increases).
The bot is the most important test in the project: it proves every boss phase is
completable with the verb the design demands. Write it carefully; it may read
enemy positions and telegraph timers, moves virtual hands at ≤ 5 m/s (so it is not
super-human), and uses the same `inject(handState)` API as the desktop input.

**A7 Determinism.** Same seed + same recorded input stream → identical
`hashState` every 90 steps, across two runs and across DT batching patterns.

## B. `test/browser.test.js` — Playwright, chromium + firefox

Serve the **unzipped `dist/sevenfold.zip`** from a temp dir. Launch with WebGL
enabled in headless (`--use-gl=angle --use-angle=swiftshader
--enable-unsafe-swiftshader` for chromium; firefox headless has WebGL via software
by default — if `WebGLRenderer` fails to create, log it, mark firefox as
"WebGL unavailable in headless", and still run the no-error boot test).

Capture `console` errors and `pageerror`; any fails the test. Note: the hosted
three.js is fetched from the network in these tests; if the sandbox blocks
`play.js13kgames.com`, serve a local copy of three r185 (from npm `three@0.185.0`,
`build/three.module.js`) by **routing** that exact URL to the local file with
`page.route` — the shipped HTML is untouched. Log which one was used.

Per browser:
1. **Boot**: title visible, "PLAY ON DESKTOP" shown (no XR), zero errors. Screenshot.
2. **Desktop play**: click play; via `window.SF.inject` drive the perfect bot's
   recorded input for waves 1–2 (recorded once in test A and saved to
   `test/replays/w1-2.json`); assert wave 3 reached; zero errors.
3. **Forge each form**: press keys 1–5; after each, assert `SF.state().weapon`
   equals the expected form and that the scene contains that weapon's mesh
   (expose mesh names via `SF.state().meshes`). Screenshot each.
4. **Bow / whip / block** via scripted hand injection: at least one arrow, one
   crack, one block event observed in `SF.state().events`.
5. **Game over**: inject the idle stream until Light 0; "The Light is gone" text
   plane shown; press R; game restarts at wave 1.
6. **Render budget**: after wave 2 with 10 enemies alive, `renderer.info` calls
   < 70, triangles < 120k (desktop).
7. **Resize** and **fullscreen** toggles → no errors.
8. **Offline import failure**: route the three.js URL to abort → the friendly
   message appears, zero console errors.
9. **Mute** persists across reload; best score persists.
Screenshots to `test-results/`. Print a browser × test table.

## C. XR shim (`test/xr-shim.js`) — attempt, with fallback

Goal: prove the real WebXR code path (session request, reference space, controller
poses, select/squeeze events, session end) runs with zero errors through Three's
`WebXRManager`, since that is exactly what a judge's Quest will hit.

Implement a minimal `navigator.xr` via `page.addInitScript`:
`isSessionSupported → true`; `requestSession` → fake session with
`requestReferenceSpace`, `requestAnimationFrame` (drives a fake `XRFrame` with
`getViewerPose` → one or two views with sane projection matrices and transforms,
`getPose(gripSpace, ref)` for two fake input sources with handedness left/right),
`updateRenderState`, `renderState.baseLayer`, `inputSources` array,
`addEventListener/removeEventListener/dispatchEvent`, `end`, and a global
`XRWebGLLayer` class whose `framebuffer` is `null` (Three renders to the default
framebuffer then) with `getViewport()` returning halves of the canvas. Also
`gl.makeXRCompatible = async()=>{}`. Fake input sources dispatch
`selectstart/squeezestart` events from the shim's test API `window.__xr.press(hand,
'select'|'squeeze')`.

Test: click ENTER VR → session starts, 300 frames render with zero errors, move the
fake grips through the Lance sigil with both squeezes → `SF.state().weapon === 'lance'`
→ `session.end()` → desktop mode resumes, zero errors.

Time-box this to a reasonable effort (about 6 fix-iterations of Three's
WebXRManager complaints). If it still cannot be made to run, **stop**, delete the
half-shim, record in `DECISIONS.md` and `SUBMISSION.md` exactly which Three XR call
could not be faked, and make the manual emulator checklist below the top item for
the user. Do not let the shim eat the schedule; tiers A and B already validate the
game logic and the render path.

## D. Manual checks (log results in SUBMISSION.md)

- `unzip -l` single entry; `unzip -t` OK; zip ≤ 13,312.
- `grep -o 'https\?://[^"'"'"' ]*' dist/index.html` → exactly the hosted three URL.
- No `localStorage.clear`, no `console.` in the build.
- Read the perfect-bot logs for each boss; if any phase is skipped (never
  entered) the bot or the boss is wrong — fix.
- Play desktop mode yourself (headless is fine) for 2 minutes via the recorded
  replay and watch the screenshots for visual bugs (z-fighting, weapon not
  attached to hands, text unreadable).

## E. Manual emulator checklist for the user (write into SUBMISSION.md)

The user will run this by hand with Meta's **Immersive Web Emulator** Chrome
extension (or the WebXR API Emulator):
1. `npm run dev`, open `http://localhost:8080/dist/` in Chrome with the extension,
   DevTools → WebXR tab, device "Meta Quest 3".
2. Click ENTER VR. Expect: arena, unicorn behind, rainbow between the two
   controller models, no console errors.
3. Move controllers apart/together: rope sags/snaps taut with sound.
4. Hold both grips, stretch apart → Lance. Repeat for each sigil (the panel lets
   you drag controllers; slow sigils are fine — the 2.5 s timeout is generous).
5. Survive wave 1 by swinging. Check draw calls in the console (`SF.state()`).
6. Press the emulator's "exit" → desktop mode, no errors.
7. If anything fails: note it, fix within the bugfix window (PRs by 14 Sept).
