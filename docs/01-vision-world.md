# 01 — Vision & world

## Fiction (one paragraph, never shown as a wall of text)

The Umbra ate the sky. The last unicorn stands on the broken altar of a drowned
shrine, and its horn holds the last rainbow — the only colour left in the world.
You are the Keeper. You hold the rainbow's two ends. Until dawn, everything that
hunts light will come across the cloud-sea for the unicorn, and you will turn the
rainbow into whatever the night requires. Dawn comes after the third storm-giant.

Show it as: a title in the sky, one sentence, the unicorn behind you. Nothing else.

## Vibe

Dark, mystical, luminous. Think a moonless night at the bottom of the ocean, then
add one impossibly saturated rainbow in your hands. Colour is *rare*: the world is
ink, slate, deep violet and cold blue; the only saturated things are your rainbow,
enemies' weakness glyphs, hits, and the unicorn's slow pulse. Silhouettes over
detail. Glow over texture. Everything drifts slowly (fog, embers, the giant moon).

## The arena

Standing play, ~2 m × 2 m. The player stands at the centre of a circular basalt
altar (radius 3 m) whose surface is faintly carved with seven concentric rune rings
that light up one by one as bosses fall. Just behind the player (−z, 1.8 m) stands
the unicorn: pale, semi-transparent, drawn in 8–12 primitives (elongated box body,
box head, cone horn, cylinder legs, a mane of 5 thin curved cylinders), slowly
breathing (scale 1 ± 0.02), horn emitting soft light. It lowers its head when Light
is low.

Around the altar, at radius 4–7 m: broken arches (elongated boxes and half-torus
segments), shattered pillars (cylinders with jagged tops made by scaling rings of a
cylinder geometry), all matte near-black with a thin rim light. Beyond: an infinite
dark cloud-sea, made of a large disc mesh with a vertex-displaced sine field and
fog; enemies "walk" on it. Sky: near-black gradient dome, a huge dead moon (sphere,
radius 40 m at 120 m, dark grey with a lit crescent from a single directional
light), a slow drift of dust particles (Points, ~400).

Fog: `Fog(0x070a14, 6, 40)`. Background matches fog colour.

## Palette

```
bg/fog        #070a14
stone         #12141c   rim/edge      #2b3150
altar runes   #1a2140 (off) → band colour (on)
moon          #23242c   moon lit edge #55586a
unicorn       #dfe6ff at 45% opacity, horn light #ffffff
umbra enemy   #05060a body, #1b1e2c edges, weakness glyph = one of the 7 bands
rainbow bands R #ff3b4a  O #ff8a2b  Y #ffe14a  G #3ee07a  B #3aa3ff  I #6a5cff  V #d054ff
```

Rainbow shader: bands are hard-edged with a 5% soft blend, plus an additive glow
pass (a second, wider, transparent copy at 25% alpha). It is the brightest thing on
screen, always.

## Enemies — silhouettes (behaviour in docs/03)

All enemies are the Umbra: matte black bodies with thin luminous edges and a single
glowing "core" in their weakness colour. They dissolve into embers when killed.

- **Wisp** — a floating teardrop, 0.4 m, trailing 6 points of dark smoke. Fast, weaves.
- **Husk** — a 2 m hollow humanoid: box torso, box head with no face, long
  cylinder arms, no legs (it floats a hand above the cloud-sea). Walks slowly.
- **Spitter** — a squat tripod dome with a single glowing aperture; fires orbs.
- **Shell** — a 1.6 m armoured beetle: hexagonal-prism plates in 3–5 colours; each
  plate is a separate mesh (instanced) that shatters.
- **Swarm** — 8–12 tiny Wisps as one InstancedMesh unit that orbits a shared centre.

## Bosses — silhouettes

- **Thunderhead** — a storm-giant, 12 m, made of 20 overlapping dark spheres
  (cloud body) with a single eye (bright sphere) that opens/closes; lightning as
  jittered line segments from cloud to altar.
- **Gloam** — an 8 m armoured knight-shape of stacked boxes with six colour plates
  (2 chest, 2 shoulders, 2 gauntlets); a horizontal greatsword sweep you duck.
- **Eclipse** — a 20 m black disc with a corona of thin triangles, hanging over the
  altar. Its front is a mouth of concentric rings. It eats light: the fog closes to
  4 m during phases; only its weakness ring stays visible.

## UI in 3D (no HTML in VR)

- The unicorn's Light (health) is the brightness of its horn and 5 small motes
  orbiting it. Losing one = a mote goes out with a chime.
- Wave counter: the rune rings on the altar; current wave = a thin arc drawn around
  the player's feet filling up as enemies die.
- Forge feedback: the world desaturates (fog colour → #030408) and time slows; the
  sigil trail glows white; on success the trail snaps into the weapon with a chime;
  on failure it drifts away as embers.
- Text (title, "Wave 3", "Dawn", "The Light is gone") is drawn once into a
  CanvasTexture (procedural, system font) on a plane 3 m in front at 1.7 m height —
  the single allowed use of a texture.
- Desktop mode: same 3D UI, plus a tiny HTML corner overlay for the control hints
  (docs/04).

## Audio direction (implementation in docs/05)

A low drone (two detuned oscillators, 55 Hz + 55.3 Hz, lowpass), a slow sub-bass
pulse (every 2 s) that speeds up when a boss appears. All SFX synthesized with ZzFX.
Positional: enemies emit a hum from their position so you can hear something behind
you before you see it. The rainbow hums when taut, buzzes when whipped, chimes when
forged.
