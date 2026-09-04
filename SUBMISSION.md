# SUBMISSION — SEVENFOLD (js13kGames 2026, WebXR)

## 0. Do these by hand before submitting (top item)

**Manual emulator checklist** — the automated tests cover the desktop path in
Chromium and the real WebXR code path through a fake `navigator.xr` (docs/07 C);
nothing here has run on a headset. With Meta's *Immersive Web Emulator* Chrome
extension (or the WebXR API Emulator):

1. `npm run dev`, open `http://localhost:8080/dist/` in Chrome with the
   extension. DevTools → WebXR tab, device "Meta Quest 3". (The dev server
   swaps the hosted Three.js URL for a byte-identical local copy: the host sends
   no CORS header, so a localhost page cannot import it cross-origin. The zip is
   untouched and is same-origin on play.js13kgames.com.)
2. Click ENTER VR. Expect: altar, pillars and arches, the moon, the unicorn
   behind you (turn around), the rainbow hanging between the two controller
   positions (white spheres), no console errors. The first trigger pull
   recentres the arena on your head and starts the game.
3. Move the controllers apart/together: the rope sags, then snaps into a rigid
   bar past 0.8 m.
4. Hold both grips (squeeze), pull the hands apart along a line → Lance
   (rainbow shaft from the left hand through the right). Repeat: circle → Halo,
   raise-and-slam → Maul, wrists crossed then apart → Shards, hands close and
   rotate the pair 150° → Prism. Slow sigils are fine (2.5 s timeout). Grips
   with no motion → back to the rope.
5. Survive wave 1 by swinging the bar / flicking the slack rope. In the console
   `SF.state()` shows draw calls (`calls`, budget ≤ 60; tests see 18–26) and
   triangles (`tris`, ~18k).
6. Press the emulator's exit → the page returns to desktop mode with the
   PLAY ON DESKTOP / ENTER VR button, no errors.
7. Anything that fails: note it and fix it in the bugfix window (PRs by 14 Sept).

**Firefox** could not be run on the build machine: Playwright's Firefox binary
fails to start with a Windows side-by-side error ("Dependent Assembly mozglue …
could not be found"; a fresh download is byte-identical, so it is the machine,
not the install). `node test/browser.test.js firefox` will run the same 13
desktop tests on any machine where Playwright's Firefox launches — please run it
once. Chromium: 14/14 green, three runs in a row.

Shipped configuration (chosen 2026-09-05): **sound + hit embers, waves 1–8,
Thunderhead and Gloam; Dawn after Gloam.** The Eclipse (waves 9–12) is in the
source and tests but not in the zip: sound + embers + Eclipse is 13,765 bytes.
`node build.js --level 2 --eclipse --no-audio` builds the three-boss silent
variant (13,3xx — over the limit after the visual pass; not shippable as is).

## 1. Final size

| step | bytes |
|---|---|
| source, concatenated | 47,984 |
| terser (property-mangled) | 33,342 |
| roadroller -O2 | 17,066 |
| index.html (inlined) | 17,658 |
| **dist/sevenfold.zip** | **13,279** (limit 13,312; margin 33) |

Roadroller's optimiser is not perfectly deterministic: rebuilding can move the
zip by ±15 bytes. The committed zip is the measured one; `build.js` fails above
the limit, so a rebuild can never ship an oversized file unnoticed.

`unzip -l` → one entry, `index.html`. `unzip -t` → no errors. The only URL in
`dist/index.html` is `https://play.js13kgames.com/2026/webxr/three.js`, kept in
plaintext outside the packed script. No `console.`, no `localStorage.clear`.

## 2. Module table

| file | role |
|---|---|
| `src/vec.js` | vec3/quat helpers on plain arrays |
| `src/sim.js` | pure simulation: Verlet rope, whip/arc/block/bow, forge + 5-sigil recogniser, Lance/Halo/Maul/Shards/Prism, resonance, 5 enemy types, 12 waves, 3 bosses, Light, score, events |
| `src/input.js` | desktop controls, canned sigils, XR pose → arena space (recentre) |
| `src/xr.js` | hand-written WebXR bootstrap: ENTER VR button, session, local-floor (falls back to local +1.6 m), controllers, select/squeeze, haptics |
| `src/render.js` | Three.js scene: altar + rune rings, ruins, cloud-sea, moon, unicorn, instanced enemies, rainbow shader (rope tube + weapons), bosses, effects, text plane |
| `src/audio.js` | Web Audio synth: drone, rope hum, blips pitched by band (`--no-audio` removes it) |
| `src/main.js` | dynamic import of the hosted Three.js, loop, `window.SF` test hook, persistence |

## 3. Cuts (CLAUDE.md priority order, from the bottom)

- 7 Endless mode and combo scoring: cut (Dawn ends the run; trigger restarts).
- 6 Hit-stop, dissolve, forge trail, Dawn rainbow arc, dust, sky gradient: cut.
  Hit embers kept. Unicorn breathing/head-lowering kept.
- 5 Sound: a ~1 KB Web Audio synth (drone, rope hum, band-pitched blips for
  crack/hit/resonant/forge/kill/Light/wave/cue) is shipped. ZzFX and positional
  audio were never built.
- 4 Colour resonance: kept in full.
- 3 **Eclipse dropped from the zip** (docs/06 step 6) at the user's decision on
  2026-09-05, in favour of sound + embers: Dawn after Gloam, waves 1–8. It stays
  in `src/` and the tests (`--eclipse`). Gloam's stoop and the Maul-only chest
  plates replaced by resonant-arrow plates (a 2.2 m Lance cannot reach 3.2 m
  plates from a 1 m play radius). Swarm hand-stings simplified to orbit-then-dive.
- Also cut: the whip "catch a Wisp and fling it" slingshot, the F fullscreen
  key, the desktop mouse-wheel Prism roll, and the `local` reference-space
  fallback (every current runtime supports `local-floor`; failure returns to
  the desktop button).

## 4. Submission description (≤ 500 chars)

> You hold the two ends of the last rainbow. Slack, it is a whip; taut, a rigid
> arc that strikes and blocks; draw it like a bow. Squeeze both grips and time
> slows: trace a sigil to forge it into a Lance, Halo, Maul, twin Shards or a
> Prism beam. Red is at your left hand, violet at your right — how you swing is
> how you aim, and every enemy has a colour it cannot bear. Eight waves and two
> storm-giants come across the cloud-sea for the unicorn behind you. Hold the
> light until dawn.

(485 characters)

## 5. WebXR category checklist

- [x] Category: **WebXR only** (hosted library → not Desktop/Mobile)
- [x] Zip ≤ 13,312 bytes with `index.html` at top level, everything inlined
- [x] Only external resource: the hosted Three.js core module; no addons/JSM
- [x] Runs offline apart from that file; no analytics; no other network calls
- [x] `requestSession` only from a click; `local-floor` reference space
- [x] Input: head pose, two hand poses, select, squeeze only; hand tracking
      forge = both pinches held 0.4 s with hands within 0.3 m
- [x] Player never moved; camera never taken; recentre on the first trigger
- [x] `setFoveation(1)`, `setPixelRatio(1)` in XR, no shadows/postprocessing;
      18–26 draw calls, ~18k triangles; ≤ 8 transparent meshes; one fog
- [x] Controller disconnect freezes that hand's pose; session end → desktop mode
- [x] `localStorage` keys `sevenfold_best`, `sevenfold_mute`; no `clear()`
- [x] Zero console errors in Chromium desktop mode and through the XR shim
- [x] If Three.js fails to load: a plain message, no console error
- [x] Original content only; MIT
- [ ] Firefox desktop test run (blocked on the build machine — see §0)
- [ ] Manual emulator checklist (see §0)

## 6. Test summary (build machine, three consecutive runs each)

| suite | result |
|---|---|
| `node test/sim.test.js` | 109/109 ×3 (rope stability, raw forms, 70 sigil variants + 20 negatives with a clean confusion matrix, weapons, resonance, determinism, bots) |
| `node test/browser.test.js chromium --xr` | 14/14 ×3 (boot, replay to wave 3, budget, 5 forges, crack/arrow/block, game over + R, resize/fullscreen, mute + best score, offline message, XR shim enter/sigil/exit) |
| `node test/browser.test.js firefox` | not run: Firefox cannot start on this machine |

Perfect-bot clear times (seed: Thunderhead / Gloam / Eclipse, seconds; the sim
tests still run the full 12-wave game):
1: 70.6 / 47.4 / 43.7 · 2: 46.5 / 46.5 / 43.0 · 3: 57.9 / 46.6 / 43.7 ·
4: 58.2 / 46.4 / 43.4 · 5: 70.3 / 47.3 / 44.0. Every boss phase is entered on
every seed. Normal waves 16–35 s. The wrong-tool bot (no forging) clears waves 1–7 and dies to
Gloam; the idle bot loses all Light by 19 s.

Screenshot for the form: `test-results/chromium-forge-halo.png` or
`chromium-forge-maul.png` (Thunderhead visible).
