# 05 — Audio & effects

Priority 5–6. Implement after bosses; keep each under budget (audio ≤ 1.2 KB
minified, effects ≤ 1.0 KB). Everything here is synthesized; there are no files.

## Audio (audio.js)

- Create the `AudioContext` through Three's `AudioListener` attached to the camera
  on the first user gesture (Enter VR / Play click). Also call `ctx.resume()` on
  `selectstart` once (Quest browser sometimes suspends).
- **ZzFX-mini** (public domain, credit in README) generates `AudioBuffer`s; cache one
  buffer per sound × band (pitch shift by band: multiply frequency by
  `1.06^(band−3)`). ≤ 12 base sounds:
  crack, taut-snap, hit, resonant, arrow, forge-enter, forge-ok, forge-fail, kill,
  lightLost, boss-roar, wave-chime.
- **Drone**: two `OscillatorNode`s (sawtooth 55 Hz, sine 55.3 Hz) → lowpass 300 Hz →
  gain 0.08. During a boss: detune the second osc to 58 Hz and add a `sub pulse`
  (sine 40 Hz gated by an LFO every 2 s → every 0.8 s in phase 2). During forge:
  lowpass sweeps to 120 Hz (muffled slow-mo).
- **Rope hum**: a sine whose frequency = `110 + tension*220` Hz, gain = `tension*0.05`,
  and a short noise burst on the taut snap. Silence when a weapon is forged;
  the Prism beam adds a bright 880 Hz + noise hiss while firing.
- **Positional**: enemies get a `PositionalAudio` only for the nearest 4 to the player
  (pool of 4, reassigned each second) playing a looping hum buffer (ZzFX noise,
  lowpassed). `refDistance 2, rolloff 1.5`. Bosses get one each for attack cues.
- Mute persisted.

## Effects (render.js)

- **Embers**: particle burst helper `burst(pos, band, n, speed)`; used by hits (8),
  kills (24, slower, upward), forge success (40 along the weapon), mote loss (12 dark
  blue), Shell plate break (16).
- **Hit-stop**: renderer freezes the enemy's transform for 0.05 s (sim continues).
- **Resonant ring**: a `RingGeometry` mesh scaled from 0 → 1.2 m over 0.3 s, fading.
- **Forge**: fog colour lerps to `#030408` and all enemy `instanceColor` desaturate to
  grey for the duration; a white `Line` trail of the midpoint (up to 200 points);
  on success the trail geometry is lerped toward the new weapon's silhouette over
  0.25 s (just scale the trail toward the weapon centre while the weapon grows).
- **Dissolve**: dead enemies shrink to 0 over 0.25 s while emitting embers.
- **Lightning**: 12–20 jittered segments per bolt, rebuilt every 2 frames, white core
  + band-coloured glow line; the rune cue on the floor is a `RingGeometry` that
  brightens over 0.8 s.
- **Unicorn**: breathing scale; head bob every 4 s; horn light intensity = Light/5;
  during Dawn a torus-arc rainbow grows from its horn over the altar.
- **Dawn**: fog far 40 → 80, fog colour → `#2a1a2e`, sky dome top colour → `#3a2438`,
  moon → white, over 6 s.
