# SEVENFOLD

A standing-play WebXR arena-survival game for **js13kGames 2026, WebXR category**
(theme: *Unicorns and Rainbows*). Everything fits in a 13,312-byte zip; the only
external file is the Three.js core module hosted by js13kGames.

The Umbra ate the sky. The last unicorn stands behind you on a drowned altar, and
its horn holds the last rainbow. You hold the rainbow's two ends. Until dawn,
everything that hunts light comes across the cloud-sea, and you turn the rainbow
into whatever the night requires.

## Play

**VR (Quest, Pico, Index, hand tracking):** open the entry on play.js13kgames.com,
press ENTER VR, pull a trigger. The unicorn is behind you. Input is only head
pose, two hand poses, `select` (trigger / pinch) and `squeeze` (grip). You never
move; everything comes to you.

**Desktop fallback** (for testing and judging without a headset; not a category
entry):

```
mouse            look (click the canvas for pointer lock)
WASD / QE        move the right hand (x/z, y)      IJKL / UO   move the left hand
LMB / RMB        right / left trigger              Space       both grips (forge)
1 2 3 4 5        canned sigils: Shards, Maul, Halo, Prism, Lance
mouse wheel      roll the right hand (Prism band)  R restart   M mute   F fullscreen
```

## The rainbow

Red is always at your left hand, violet at your right. As a raw rope it is:

| form | how | what |
|---|---|---|
| Whip | slack rope, flick fast | crack at the tip: damage 2, knockback |
| Arc | hands ≥ 0.8 m apart → rigid bar, swing | melee strike, damage 3 |
| Block | hold the bar taut | orbs shatter; a matching-colour orb is absorbed (+1 Spectrum) |
| Bow | taut, pull a trigger and draw that hand back | arrow, band = where you pull |

**Forge:** hold both grips (hand tracking: both pinches with the hands together
for 0.4 s). Time slows to 15 %. Draw a sigil, release. An unrecognised sigil
returns the raw rope. Releasing without drawing unforges.

```
 Stretch      pull the hands apart along a line to ≥ 1.1 m         → LANCE  (2.2 m, pierces 3, blocks)
 Circle       hands together, trace a loop                          → HALO   (thrown returning ring)
 Raise+slam   hands together, lift ≥ 0.35 m, bring down ≥ 0.35 m    → MAUL   (breaks any plate; slam with Spectrum)
 Cross        start with the wrists crossed, pull apart to ≥ 0.5 m  → SHARDS (twin blades: R O Y | B I V)
 Wring        hands close, rotate the pair ≥ 150°                    → PRISM  (beam; roll the right hand for the band)
```

## Colour resonance

Every enemy shows a glowing weakness colour. Hit it with that band for ×3 damage
and a stagger. Shell plates and Gloam's plates only break from a resonant hit or
the Maul. *How* you swing — which end leads — is aiming.

## Waves

12 waves across three storm-giants: **Thunderhead** (wave 4, eye opens — shoot it),
**Gloam** (wave 8, six coloured plates, then a Lance duel), **Eclipse** (wave 12,
summons, then a light-eater pulse you shield with the taut rope or Lance across
the unicorn). Five Light. Dawn comes after the Eclipse.

## Build and test

```
npm install                 # terser, roadroller, @gfx/zopfli, playwright, three (API reference only)
npx playwright install chromium firefox
node build.js --level 2 --particles      # dist/index.html + dist/sevenfold.zip, size table, gate
node test/sim.test.js                    # 109 Node tests: rope, forms, recogniser, weapons, bots
node test/browser.test.js chromium --xr  # Playwright: built page in desktop mode + XR shim
node test/browser.test.js                # chromium and firefox
npm run dev                              # http://localhost:8080/  (dev shell: index.html, tools/play.html)
```

Build flags: `--particles` (hit embers, on in the shipped zip), `--audio`
(tiny Web Audio synth; does not fit the limit together with particles — see
DECISIONS.md), `--level 0|1|2` (roadroller effort), `--no-roll`.

Local note: the hosted Three.js has no CORS header, so pages on localhost cannot
import it cross-origin. The dev server serves a byte-identical local copy under
the same URL for any page it serves; the tests route the URL the same way. The
shipped zip is untouched (it is same-origin on play.js13kgames.com).

## Repository

```
src/   vec.js sim.js input.js xr.js audio.js render.js main.js   (see docs/04)
test/  sim.test.js bot.js trajectories.js browser.test.js xr-shim.js replays/
tools/ serve.cjs play.html smoke.mjs botrun.mjs runall.sh trace*.mjs why.mjs
build.js  DECISIONS.md  SUBMISSION.md  docs/
```

The whole game — rope, weapons, enemies, waves, bosses — is a pure JavaScript
simulation (`src/sim.js`, no Three.js) at a fixed 90 Hz step, seeded and
deterministic. Three.js only renders and reads XR poses. The scripted bots in
`test/bot.js` play the full game in Node; they are the headset.

## Credits

Code, design and all assets: procedural, written for this entry.
Three.js r185 (MIT) hosted by js13kGames. Sound is a tiny custom Web Audio synth
(no ZzFX in the shipped build). MIT licence.
