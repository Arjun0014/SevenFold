# SEVENFOLD — js13kGames 2026, WebXR category

Read this file first, then `docs/01` → `docs/08` in order, then `PROMPT.md`. These
documents are the spec. Where they are silent, decide, log it in `DECISIONS.md`, and
continue. Never stop to ask the user — they are away and want a finished, tested,
zipped game.

## What this is

A standing-play WebXR arena-survival game for the js13kGames 2026 WebXR category
(theme: **Unicorns and Rainbows**). You hold the two ends of a living rainbow. As a
raw rope it is a whip, a rigid arc, a shield and a bow. Squeeze both grips and time
slows: draw a sigil with your hands and the rainbow **forges** into one of five
weapons (Lance, Halo, Maul, Shards, Prism). Enemies of the Umbra come in waves
across a dark cloud-sea to snuff out the last unicorn; every seventh colour you
strike with matters. Three bosses. Dark, mystical, luminous.

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
- The weapon is **simulated, not gesture-classified**, in its raw state (docs/02).
  Forging is the only place a "sigil" is recognised, it happens in slow time with
  visible feedback, and an unrecognised sigil harmlessly returns the raw rainbow.
- The whole game (rope, weapon forms, combat, waves, bosses) runs in a pure
  JavaScript simulation module with **no Three.js dependency**, driven at a fixed
  timestep, seeded, deterministic. Three.js only renders and reads XR poses. Tests
  run the sim in Node.
- Performance budget on Quest 3S: ≤ 60 draw calls, ≤ 80k triangles on screen, no
  shadows, no postprocessing, no transparency sorting storms (≤ 8 transparent
  meshes), one fog. Use InstancedMesh for enemies and particles.

## Priority order when cutting for size (cut from the bottom)

1. XR bootstrap + desktop fallback, rope rainbow with whip/arc/block/bow, arena,
   enemies + 8 waves, unicorn Light (health), game over/restart, score save
2. Forge with the five forms (Lance, Halo, Maul, Shards, Prism)
3. Boss 1 (Thunderhead), then Boss 2 (Gloam), then Boss 3 (Eclipse)
4. Colour resonance system (weakness glyphs, ×3 damage)
5. Sound (ZzFX + drone), positional audio
6. Particles, hit-stop, dissolve effects, unicorn animation
7. Endless mode + combo scoring

1–2 are never cut. If 3–7 don't fit, cut in reverse order and log it.

## Definition of done (all must be true before you stop)

- [ ] `node test/sim.test.js` passes: rope stability, all five sigils recognised
      from synthetic trajectories (and negatives rejected), raw-form transitions,
      damage/resonance table, every wave 1–12 clearable by the scripted perfect bot
      and failable by the idle bot, all three bosses beatable by the bot with each
      required form, determinism hash check.
- [ ] `node test/browser.test.js` passes in **chromium and firefox**: the built,
      unzipped `index.html` boots in desktop mode with zero console errors; scripted
      inputs forge every form and the correct meshes appear; waves 1–2 completed;
      game over + restart; renderer stats within budget; XR entry/exit through the
      shim (chromium) with zero errors — or, if the shim is dropped per docs/07, the
      fallback checks are green and the manual emulator checklist is written.
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
