# SEVENFOLD — js13kGames 2026, WebXR category

Read this file first, then **`docs/09-rehaul.md`** (the current design; it supersedes
`docs/01`, `02`, `03` and `05`), then `docs/04`, `06`, `07`, `08`. These documents are the spec. Where they are silent, decide, log it in `DECISIONS.md`, and
continue. Never stop to ask the user — they are away and want a finished, tested,
zipped game.

## What this is

A standing-play WebXR arena-survival game for the js13kGames 2026 WebXR category
(theme: **Unicorns and Rainbows**). You are a mage holding the last rainbow. The
Umbra took the colour out of the unicorns' world and sends its hollow herd against
you: ash-black unicorns with one burning horn each. The rope between your hands
is every weapon: an arch that blocks (both triggers), a boomerang (swing and let
go), a lasso (one trigger, swing, let go, pull), a whip, and a Nova (clap the
charged arch). Match a horn's colour to shatter it. Seven colours are seven lives.
Ten waves, two giants (the Herald, the Sovereign), then Dawn. A dead forest under
ash and lightning; every unicorn sings its colour — the horde is the music.

Library: **Three.js r185 ESM, hosted by js13kGames** at
`https://play.js13kgames.com/2026/webxr/three.js` — the one allowed external file.

## Hard constraints (competition rules — violation = disqualified)

1. Final zip ≤ **13,312 bytes**, containing `index.html` at top level, everything
   else inlined. Working target ≤ **12,900**.
2. The ONLY external resource is the hosted Three.js core module above. **No
   `three/addons/*`, no example JSM files, no XRButton, no OrbitControls, no
   GLTFLoader, no fonts, no images, no audio files.** Everything is written by hand
   or generated procedurally at runtime. (Whatever three.js itself loads by default
   is fine.)
3. Must launch and run with **no console errors** in latest Chrome and Firefox
   (desktop mode), and enter/exit an immersive-vr session cleanly (tested through
   the XR shim and documented for the emulator). Warnings tolerated but fixed
   where cheap.
4. Playable offline; no analytics; no external calls of any kind other than (2).
5. localStorage keys prefixed `sevenfold_`. Never `localStorage.clear()`.
6. Original content only. No copyrighted names, assets or music.
7. Readable, buildable source in the repo (`src/`, `build.js`).
8. This game is submitted **only** to WebXR (a hosted library disqualifies it from
   Desktop/Mobile). It still needs a non-VR desktop fallback so it can be tested,
   demoed and judged without a headset — that fallback is not a category entry.

## Non-negotiable design rules

- Comfort: the player never moves, is never moved, the camera is never taken from
  them. No vignette tricks needed because nothing moves the head. Everything comes
  to the player.
- Input is only: head pose, two controller/hand poses, `select` (trigger / pinch),
  `squeeze` (grip). Nothing depends on buttons, thumbsticks or specific controller
  models, so Quest, Pico, Index and hand-tracking all work.
- The weapon is **simulated, not gesture-classified**: every verb is a physical
  state of the rope and the triggers (docs/09). There is no sigil recogniser.
- The whole game (rope, weapon forms, combat, waves, bosses) runs in a pure
  JavaScript simulation module with **no Three.js dependency**, driven at a fixed
  timestep, seeded, deterministic. Three.js only renders and reads XR poses. Tests
  run the sim in Node.
- Performance budget on Quest 3S: ≤ 60 draw calls, ≤ 80k triangles on screen, no
  shadows, no postprocessing, no transparency sorting storms (≤ 8 transparent
  meshes), one fog. Use InstancedMesh for enemies and particles.

## Priority order when cutting for size (cut from the bottom)

1. XR bootstrap + desktop fallback, the rope with arch/boomerang/lasso/whip/Nova,
   shadow unicorns (three variants), ten waves, colours-as-lives, game over/restart,
   score save, the Herald and the Sovereign
2. The world: dead forest, ash, lightning, sky, the rainbow light, Dawn
3. Sound: wind, thunder, the choir of horns, the bass pulse, event sounds
4. Particles: hoof ash, giant mist, bursts; the ground grain; standing stones
5. Endless mode + combo scoring (not implemented)

1–3 are never cut. If 4–5 don't fit, cut in reverse order and log it.

## Definition of done (all must be true before you stop)

- [ ] `node test/sim.test.js` passes: rope stability, every verb (whip, arch strike,
      block, boomerang, lasso, Nova), resonance and greyed colours, seven lives, the
      giant reward, idle bot dies, perfect bot reaches Dawn on seeds 1–5 with the
      per-wave time windows, no-block bot fails, determinism hash check.
- [ ] `node test/browser.test.js chromium --xr` passes: the built, unzipped
      `index.html` (no hooks) boots in desktop mode with zero console errors, plays
      with the keys, shows the offline message, enters and exits XR through the
      shim; `dist/test.html` (`build.js --test`, hooks kept): the bot replay
      reaches wave 3, the desktop macros produce throw/arch/lasso/Nova events, every
      wave shows its hint, game over + restart, Dawn + restart, renderer stats within
      budget, XR throw and catch. `node tools/firefox.mjs` passes in real Firefox.
- [ ] `node build.js` emits `dist/index.html` and `dist/sevenfold.zip`, prints size
      breakdown, fails above 13,312 bytes.
- [ ] `unzip -l dist/sevenfold.zip` shows only `index.html`; `unzip -t` OK.
- [ ] `grep -o 'https\?://[^"'"'"' ]*' dist/index.html` returns exactly one URL:
      the hosted three.js.
- [ ] `README.md`, `SUBMISSION.md` (final size, module table, cuts, submission
      description ≤ 500 chars, WebXR category checklist, **manual Quest/emulator
      checklist for the user**), `DECISIONS.md` all written.

## Working style

- Commit after every meaningful step. Build and measure after every feature.
- Prefer deleting over shipping over-limit.
- When ambiguous: choose the smaller-in-bytes, easier-to-test option; log it.
- The tests are your player and your headset. Read the bot logs; if a wave is won
  in 3 seconds or lost by the perfect bot, the tuning is wrong — fix it.
