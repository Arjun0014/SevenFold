# 03 — Enemies, waves, bosses

All timings in seconds, distances in metres. Enemies spawn at radius 9–12 m on the
cloud-sea at a random bearing (seeded) and approach the altar centre (0,0,0). The
player stands at the centre; the unicorn is at (0, 0, −1.8). "Reaching the unicorn"
= within 1.2 m of it.

## Player state

- **Light**: 5 motes. Lost when: an enemy reaches the unicorn (−1, enemy dies in a
  flash), a projectile hits the player's head/hand capsules or the unicorn (−1), a
  boss attack lands (−1). Invulnerability 1.0 s after any loss (the world flashes
  dark, a mote goes out).
- Light 0 ⇒ "The Light is gone" — 3 s, then restart offer (trigger) with the
  reached wave and score shown. Score saved: `sevenfold_best = {wave, score}`.
- Between waves (3 s), nothing heals. After each boss, +2 Light (max 5).
- Player capsules: head sphere r 0.18 at the head pose; each hand sphere r 0.08.
  Body dodging is real: lightning columns and sweeps test against the head sphere.

## Enemies

| Type | HP | Speed | Behaviour | Weakness band |
|---|---|---|---|---|
| Wisp | 3 | 4.5 (weaving ±0.8 m sine) | flies at head height, on arrival circles the unicorn 2 s then dives (−1 Light) | random |
| Husk | 9 | 1.2 | walks to 1.5 m from the unicorn, then swings (−1 Light) every 2 s; staggerable | random |
| Spitter | 6 | 0.6 → stops at 5 m | every 2.5 s fires an orb (speed 6, r 0.12) at the player head or the unicorn (alternating); orb colour = its weakness band | random |
| Shell | 4 per plate × (3–5 plates), core 6 | 0.9 | armour plates each with own band; only resonant or Maul hits break a plate; core exposed when all plates gone; reaching the unicorn: −2 Light | per plate |
| Swarm | 10 × 1 | 3.5 as a unit | orbits the player at 2 m radius for 6 s, individual wisps dart at hands (−1 Light if 3 land within 2 s) | shared random |

Stagger: enemy stops 0.4 s (Husk 0.8 s from a Lance). Knockback moves the enemy
away along the hit normal and interrupts its attack.

Enemy hit volumes: Wisp sphere r 0.25; Husk capsule; Spitter sphere r 0.6; Shell
plates as spheres r 0.3 around the body; Swarm per-wisp spheres r 0.15.

Enemies never overlap the player: they stop at 1.0 m from the altar centre if the
player is between them and the unicorn (they attack the player instead: −1 Light
every 2 s, telegraphed by the core flaring for 0.5 s — blockable by the taut arc,
avoidable by stepping aside).

## Waves (12 + 3 bosses, then endless)

Difficulty knobs: count, mix, spawn interval, bearing spread (early waves spawn in
front ±60°, later waves 360°). "Front" = the player's head yaw at wave start.

| Wave | Composition | Interval | Spread | Teaches |
|---|---|---|---|---|
| 1 | 5 Wisps | 2.0 | front ±40° | whip / arc |
| 2 | 4 Wisps, 2 Husks | 2.0 | ±60° | arc strike, stagger |
| 3 | 2 Spitters, 4 Wisps | 1.8 | ±90° | block, absorb |
| 4 | **Boss: Thunderhead** | | | bow / ranged |
| 5 | 6 Wisps, 3 Husks, 1 Spitter | 1.6 | ±120° | forge: Shards or Lance |
| 6 | 2 Shells, 4 Wisps | 1.6 | ±120° | resonance, Maul |
| 7 | 1 Swarm, 2 Spitters, 2 Husks | 1.5 | 360° | Halo / Maul slam |
| 8 | **Boss: Gloam** | | | colour aim, Lance reach, duck |
| 9 | 2 Swarms, 2 Shells | 1.4 | 360° | |
| 10 | 4 Spitters, 4 Husks, 6 Wisps | 1.2 | 360° | Prism |
| 11 | 3 Shells, 1 Swarm, 3 Spitters, 4 Husks | 1.1 | 360° | |
| 12 | **Boss: Eclipse** | | | everything |
| 13+ | endless: wave `n` = wave `5 + (n−13) % 7` with count ×1.3^(n−12), speed ×1.05 | | | |

Between waves: 3 s pause, "Wave N" text, the altar arc resets. After wave 12 with
the Eclipse dead: **Dawn** — the fog lifts to 80 m, the sky gradient turns to a
dark rose, the unicorn's rainbow arcs over the altar, score + time shown, then
endless begins if the player pulls a trigger.

Spawn bearings, weakness bands and Wisp weave phases come from a mulberry32 seeded
by `Date.now() >>> 10` at game start (so runs differ but the sim is deterministic
for a given seed, which tests exploit).

## Bosses

Each boss has telegraphed attacks (a 0.8 s wind-up with a visible cue and a rising
sound), phases, and one *required* verb that a phase cannot be completed without.
Bosses are immune to Light loss from Wisps (no Wisps spawn during bosses except
where listed).

### Thunderhead (wave 4) — teaches ranged
- HP 60. Hangs 12 m up and 10 m out in front, cloud body, one eye.
- **Lightning column**: cue = a glowing rune circle r 0.5 on the altar at the head's
  current position (projected); 0.8 s later a column strikes there for 0.3 s. −1
  Light if the head sphere is in it. Every 3 s. Step aside.
- **Sweep**: every 8 s, a horizontal lightning bar at 1.4 m height sweeps across the
  altar over 1 s — duck below 1.1 m or take −1. Cue: bar forms far away first.
- **Eye**: closed and invulnerable; opens for 2.5 s every 6 s. Only the eye takes
  damage (sphere r 0.8). It is 15 m away: only arrows, the Halo and the Prism beam
  reach. Resonant band shown as the eye colour; arrows of that colour do ×3.
- Phase 2 (HP < 30): columns every 2 s, sweeps every 5 s, the eye opens 1.8 s.
- Death: it collapses into rain; the first unicorn spirit lights altar ring 1.

### Gloam (wave 8) — teaches colour aiming, reach, ducking
- HP: six plates (chest ×2, shoulders ×2, gauntlets ×2), each 8 HP and its own band;
  core 30 HP exposed after all plates break. Stands at the altar edge (3.5 m), 8 m
  tall, so plates are 1.6–3.2 m up: the Lance reaches them; arrows work; melee
  can hit only the gauntlets when it swings.
- **Greatsword sweep**: every 5 s, a horizontal sweep at 1.3 m height over the whole
  altar in 0.7 s — duck. Cue: the blade glows and it draws back for 0.8 s.
- **Gauntlet slam**: every 4 s it punches down toward the player head position: a
  rune cue, then a 0.3 m sphere falls at that spot after 0.8 s. Step aside. While
  the gauntlet is down (0.6 s) it is at hand height: melee it.
- Plates break only from resonant hits or Maul hits. The chest plates are Maul-only
  height (they are at 2.4 m but come down to 1.6 m when it stoops after a slam).
- Phase 2 (core exposed): it kneels; the core (r 0.5 at 1.5 m) is meleeable; it
  adds a **shadow lunge** every 3 s (steps in, −1 Light unless you strike its core
  during the 0.5 s wind-up, which staggers it).
- Death: shatters into ember plates; unicorn spirit lights ring 2; +2 Light.

### Eclipse (wave 12) — everything
- HP 90 in three shells of 30. A 20 m disc hanging 15 m above and 6 m out.
- **Darkness**: at fight start fog closes to 4 m. Enemies approaching are heard
  before seen (positional hum). Only the Eclipse's weakness ring (its current band)
  is drawn unfogged.
- Phase 1 (shell 1): summons 2 Swarms and 2 Spitters over 20 s; its mouth ring is
  invulnerable until both Swarms die; then it opens for 4 s (ranged damage only) —
  bow/Halo/Prism. Repeat until shell 1 is gone.
- Phase 2 (shell 2): it descends to 3 m above the altar edge; **gravity pulse**
  every 4 s drags all projectiles into it (arrows curve back, Halo stalls) — melee
  and beam only. It lowers three tentacle-plates (Shell logic, each a band) that the
  Maul or resonant hits break; breaking all three breaks the shell.
- Phase 3 (shell 3): it hangs 1 m over the altar centre, fully dark. Every 3 s a
  **light-eater** pulse: −1 Light unless the player is holding the **taut arc or the
  Lance across the unicorn** (a shield check: the rope/lance segment intersects a
  1 m sphere around the unicorn at pulse time). Between pulses its core (r 0.6, at
  2 m directly overhead) is vulnerable to everything; band cycles every 2 s. HP 30.
  Cue for the pulse: the drone drops an octave 0.8 s before.
- Death: the disc cracks, light floods, **Dawn**. Ring 3, then the full rainbow.

## Scripted bots (for tests, see docs/07)

- **Idle bot**: does nothing. Must lose Light on wave 1 within 25 s.
- **Perfect bot**: reads sim state, moves its virtual hands at ≤ 5 m/s to execute
  the optimal verb per enemy (whip Wisps, arc Husks, block orbs, forge Lance for
  Shells with the right band, bow for Thunderhead's eye, etc.). Must clear waves
  1–12 including bosses. Its per-wave clear times are logged and must fall in
  15–90 s per wave and 40–150 s per boss, else tuning is off.
- **Wrong-tool bot**: perfect bot forbidden from forging. Must still clear waves
  1–5 (so raw rope is viable) and must fail Gloam (so forging matters).
