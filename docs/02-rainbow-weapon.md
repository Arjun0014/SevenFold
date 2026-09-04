# 02 — The Rainbow: one object, every weapon

All numbers are starting values in metres, seconds, m/s. The sim runs at a fixed
`DT = 1/90` (Quest refresh); the renderer interpolates. Hand poses come in per
frame; the sim consumes the latest pose each step (no pose prediction).

Hands: `L` and `R`, each `{p: vec3, q: quat, v: vec3 (finite-difference velocity,
smoothed 0.5), trig: bool, grip: bool}`. Handedness is taken from the XR input
source; if unknown, the first connected controller is R.

## 1. The rope (raw state)

A Verlet rope of `N = 28` points between the hand positions, rest length
`REST = 0.9` (so at 0.9 m apart it is exactly straight; closer, it sags; further,
it stretches — which is what makes it "taut").

Each step (with 3 substeps):
- gravity `-6 m/s²` (deliberately weak: it is a rainbow, not a chain), damping 0.98
- pin point 0 to `L.p`, point N to `R.p`
- 6 constraint iterations, segment length `REST/N`
- **stiffness** `k` blends with tension: `d = |R.p − L.p|`,
  `tension = clamp((d − 0.55) / 0.25, 0, 1)` → 0 at ≤ 0.55 m (slack), 1 at ≥ 0.80 m.
  When `tension > 0` add bending constraints (every other point) with strength
  `tension`; at tension 1 the rope is a rigid straight bar (the **Arc**).
- point velocities are stored for hit detection; tip speed = max over the middle
  third of the rope.

Bands: parameter `s ∈ [0,1]` along the rope from L to R maps to the 7 colours:
`band = floor(s * 7)` → R O Y G B I V. **Red is always at the left hand, violet at
the right** (swap if the player toggles handedness in the desktop menu; in VR it is
fixed — consistent is better than configurable).

### Raw forms (no recognition — these are physical states)

**Whip** — tension < 0.3 and tip speed ≥ 6 m/s ⇒ a *crack* at the fastest point:
damage sphere radius 0.35, damage 2, knockback 4 m/s, band = band at that point.
Cooldown 0.25 s. Sound: crack, pitch by band. Grabbing (trigger) while the rope
tip overlaps a Wisp or Spitter orb *catches* it: it is pinned to that rope point
until trigger release (flinging it with the rope's velocity — thrown Wisps deal 3
damage to whatever they hit). This is the free "slingshot".

**Arc strike** — tension ≥ 0.7 and any rope point speed ≥ 3.5 m/s ⇒ melee hit on
overlap with an enemy: damage 3, band = band at the contact point. Hit-stop 0.05 s
(sim keeps running; the renderer freezes the enemy for that time). Max one hit per
enemy per 0.3 s.

**Block** — tension ≥ 0.7 and a projectile touches the arc ⇒ the projectile
shatters. If the projectile's colour equals the band it touched, it is **absorbed**
instead: +1 Spectrum (see §3) and a bright flash. Passive; always on when taut.

**Bow** — with tension ≥ 0.7, press a trigger and pull that hand back toward
your chest. At trigger press an **anchor** is captured at that hand's position; the
rope now runs L → pull-hand → anchor (the pull hand drags the string's midpoint,
exactly like drawing a real bow, and the anchor stands in for the far end of the
bow stave). Draw length `Δ = |hand.p − anchor|`, valid when 0.15 ≤ Δ ≤ 0.6. On
release ⇒ arrow: speed `12 + 20·Δ/0.6`, damage `2 + 4·Δ/0.6`, direction from the
pull hand toward the anchor, band = the band under the pull point (`s` of the rope
point closest to the pull hand at release). Arrows pierce Wisps. Works with either
hand. Releasing with Δ < 0.15 cancels silently. Sound: bowstring creak with Δ.

The four raw forms are always available and need no Spectrum.

## 2. Forge (the weapon-shaping state)

**Enter:** both grips pressed (controllers) — or, with hand tracking, both pinches
held while the hands are within 0.3 m of each other for 0.4 s. Cooldown after any
forge: 1.0 s. Cannot enter during hit-stop or while a forged weapon is mid-throw.

**While forging** (max 2.5 s, then auto-resolve):
- time scale 0.15 for the world (enemies, projectiles, bosses). The player's hands
  and the rope are real-time.
- the rope becomes a free glowing ribbon; the **midpoint trail** `M(t) = (L.p+R.p)/2`
  and the **hand vector** `D(t) = R.p − L.p` are recorded at sim rate.
- the world desaturates; a soft hum rises in pitch with recorded path length.
- the currently held forged weapon (if any) dissolves back into the ribbon.

**Resolve:** when either grip is released (or the timeout), run the recogniser on
the recorded trail. Success ⇒ the rope collapses into that weapon over 0.25 s with
a chime and a burst of band-coloured embers. Failure or an empty trail (path length
< 0.2 m) ⇒ return to the raw rope, no penalty beyond the cooldown. Releasing with
no drawing is therefore the way to **unforge back to the rope**.

Forged weapons persist until the next forge. They have no durability. Forging is
free. (A menu that costs resources is a menu people avoid; the fun is in switching.)

## 3. Spectrum

A meter 0–3 charged by: absorbing a matched projectile (+1), a *resonant* hit
(+0.34, see §5), a boss stagger (+1). Spent by the Prism beam (1 per second of
beam) and the Maul's ground slam (1). Shown as three small rainbow motes orbiting
the left wrist. Not required for anything in priority tier 1.

## 4. The five sigils and their weapons

The recogniser uses only these features of the recorded forge trail:

```
Dstart, Dend           hand vector at start/end
dist0, dist1           |D| at start/end; distMax, distMin over the trail
twist                  total signed rotation of the D direction about the D axis'
                       perpendicular... simplified: angle between Dstart and Dend
                       directions projected on the plane perpendicular to the
                       midpoint's mean forward (= yaw/roll change of the hand pair)
cross                  true if at some sample D.x < -0.05 (right hand left of left
                       hand in head-relative space) AND at the end D.x > +0.15
Mpath                  path length of the midpoint trail
Mrise, Mdrop           max upward displacement of M, then max downward after it
loop                   midpoint trail closes: some later sample within 0.12 m of an
                       earlier sample with ≥ 0.6 m of path between them, and the
                       enclosed planar area ≥ 0.05 m²
```

All positions are transformed into **head space** (position relative to head,
rotated by head yaw only) before feature extraction, so facing direction does not
matter.

Evaluate in this order; first match wins (order matters — it removes ambiguity):

| # | Sigil (what you do) | Test | Weapon |
|---|---|---|---|
| 1 | **Cross** — start with wrists crossed, pull apart | `cross && dist1 > 0.5` | **Shards** |
| 2 | **Raise & slam** — hands together, lift high, bring down hard | `dist1 < 0.35 && Mrise > 0.35 && Mdrop > 0.35` | **Maul** |
| 3 | **Circle** — hands together, trace a loop | `dist1 < 0.4 && loop` | **Halo** |
| 4 | **Wring** — hands close, rotate the pair ≥ 150° | `distMax < 0.45 && twist > 150°` | **Prism** |
| 5 | **Stretch** — pull apart along a line to ≥ 1.1 m | `dist1 > 1.1 && dist0 < 0.6 && Mpath < 0.5` | **Lance** |
| — | anything else | | raw rope |

Thresholds are generous on purpose; VR players are imprecise. Each sigil's
dominant feature is unique (crossing, rise-then-drop, closed loop, rotation,
distance), so false positives between them are near zero. Tests in docs/07 cover
each sigil with clean, noisy (±3 cm jitter), slow, fast, and mirrored variants, and
20 negative trails.

### Shards — twin short blades, one per hand
- Two 0.45 m blades. Each is 3½ bands: L blade = R O Y (+half G), R blade = (half
  G) B I V. Hit when blade speed ≥ 2.5 m/s: damage 2 per hit, 0.15 s per-enemy
  cooldown → highest DPS vs single targets, weak vs armour.
- Trigger: throw the blade (spins, 10 m/s, damage 3, returns to hand after 0.8 s
  or on hit).

### Maul — two-handed hammer
- Handle from L to R (grows to 0.9 m), head at the R end: a 0.35 m hexagonal prism
  whose colour **cycles** through the 7 bands once per 2 s (a glowing ring on it
  shows the current band; timing your swing is the skill).
- Hit when head speed ≥ 3 m/s: damage 6, knockback 6, breaks 1 Shell plate
  regardless of colour. 0.5 s per-enemy cooldown.
- **Slam** (needs 1 Spectrum): head hits the altar surface (y < 0.15) at ≥ 4 m/s ⇒
  ring shockwave radius 4 m, damage 4 to everything on the ground, staggers bosses.

### Halo — a thrown, returning ring
- A 0.5 m torus of 7 bands held in R. Trigger: throw along R's velocity (min 8 m/s);
  it flies straight, pierces, damage 3 per enemy, band = the band facing the
  throw direction at release (the ring spins visibly; a small arrow shows the
  leading band), returns along a curve to R after 1.2 s or a wall hit. While the
  Halo is out, L holds nothing — you are exposed; catch it (return) to be able to
  throw again. Only one Halo in flight.

### Prism — a beam
- Hands together hold a floating 0.25 m octahedron. Hold trigger ⇒ a continuous
  beam from the prism along the hand-pair forward direction, 12 m range, damage
  5/s, costs 1 Spectrum per second. Band = selected by the **roll** of the right
  hand (7 sectors of 360°; a coloured facet lights up to show it). Without
  Spectrum the beam is a weak lantern (1/s, no cost) — still useful vs Wisps.

### Lance — long reach, pierce
- A 2.2 m rigid shaft from L through R and beyond; red at L, violet at the tip.
  Hit when tip speed ≥ 3 m/s or a thrust (tip moving along the shaft axis ≥ 2.5
  m/s): damage 4, pierces up to 3 enemies in a line, staggers Husks, band = band
  at contact. Long reach lets you hit things over the altar's edge before they
  arrive. Slow: 0.6 s per-enemy cooldown. Blocks projectiles along its length.

## 5. Colour resonance

Every enemy has a **weakness band** shown as its glowing core/glyph. A hit whose
band equals the weakness is **resonant**: damage ×3, the enemy staggers 0.4 s,
+0.34 Spectrum, a bright ring burst in that colour. Hits with the wrong band deal
normal damage (never zero — beginners must still progress). Shell plates and
Gloam's plates are the exception: a plate only breaks from a resonant hit or a
Maul hit. Weakness bands change per enemy (random from the seed) and, for Shells,
per plate.

Why this is the whole game: red is always near your left hand and violet near your
right, so *how* you swing — which end leads — is aiming. The bow lets you choose
the band by where you pull. The Maul makes you time it. The Prism makes you roll
your wrist. The Halo makes you spin-release. Seven colours, five verbs.

## 6. Damage table (enemy HP in docs/03)

| Source | Damage | Notes |
|---|---|---|
| Whip crack | 2 | knockback 4 |
| Arc strike | 3 | |
| Arrow | 2–6 | pierces Wisps |
| Shards hit / throw | 2 / 3 | |
| Maul hit / slam | 6 / 4 AoE | breaks plates |
| Halo | 3 | pierces all |
| Prism beam | 5/s (1/s unpowered) | |
| Lance | 4 | pierces 3, staggers Husks |
| Thrown Wisp | 3 | |
| Resonant multiplier | ×3 | |

## 7. Feedback that must exist (or the weapon feels dead)

- Rope hum whose pitch rises with tension; a snap chime crossing tension 0.7.
- Whip crack sound + a white flash sphere at the tip.
- Every hit: 6–10 band-coloured embers, hit-stop 0.05 s on the enemy, a short
  haptic pulse (`inputSource.gamepad.hapticActuators[0].pulse(0.6, 40)` wrapped in
  try/catch — not all runtimes have it).
- Forge: desaturation, slow-mo, white sigil trail, chime on success, ember drift on
  failure, the weapon *grows out of the trail* over 0.25 s.
- Resonant hit: an expanding ring in the band colour + a higher chime.
