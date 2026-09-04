You are building SEVENFOLD, my js13kGames 2026 WebXR entry, end to end, autonomously.
I am away and cannot answer questions. Do not stop, pause, summarise-and-wait, or
ask for confirmation until the Definition of Done in CLAUDE.md is fully satisfied.
If something is ambiguous, decide, log it in DECISIONS.md, continue. If something
fails, fix it, continue. You may install anything you need.

Read completely, in this order, before writing code:
CLAUDE.md, docs/01-vision-world.md, docs/02-rainbow-weapon.md,
docs/03-enemies-waves-bosses.md, docs/04-architecture.md,
docs/05-audio-effects.md, docs/06-build-size.md, docs/07-testing.md,
docs/08-quest-checklist.md

Then execute these phases. Commit to git after each phase. Run node build.js
after every feature from Phase 3 onward and keep a running size log in
DECISIONS.md.

PHASE 0 — Setup

- git init, npm init -y; dev deps: terser, roadroller, playwright, three@0.185.0
  (three is ONLY for the Playwright network fallback and for reading the r185 API
  while writing render/xr code — it is never bundled or imported by the game).
- apt-get install advancecomp if possible (else follow docs/06 zip fallbacks).
  npx playwright install chromium firefox (+ install-deps).
- Repo layout from docs/04, package.json scripts, .gitignore, dev server.
- Verify the hosted library URL responds and exports WebGLRenderer:
  curl -sI https://play.js13kgames.com/2026/webxr/three.js ; if the sandbox has
  no network, note it and rely on the local three@0.185.0 for tests via
  page.route as docs/07 describes. Log in DECISIONS.md.

PHASE 1 — Pure simulation (docs/02, docs/03)

- vec.js, sim.js: rope, tension, raw forms (whip, arc strike, block, bow), forge
  state machine, the five-sigil recogniser with the exact feature tests and order
  from docs/02 §4, the five weapons, resonance, enemies, waves 1–12 + endless,
  the three bosses with all phases, Light, score, events, hashState.
- test/trajectories.js and test/sim.test.js (docs/07 A1–A7), including the idle,
  perfect and wrong-tool bots. Iterate until green. Tune numbers per docs/03's
  time windows; log every changed constant.

PHASE 2 — Render + XR + desktop (docs/01, docs/04)

- main.js with the single dynamic import of the hosted three.js; xr.js
  hand-written bootstrap (no addons — grep your own code for 'addons' and 'jsm'
  and fail the build if found); input.js desktop controls + canned sigils +
  window.SF hook; render.js arena, unicorn, instanced enemies, rainbow shader,
  weapon geometries, particles, text plane, bosses.
- tools/play.html for authoring. First node build.js — record size.

PHASE 3 — Build & browser tests (docs/06, docs/07 B)

- Finish build.js (concat → terser property-mangle → roadroller → inline → zip →
  gate). test/browser.test.js against the UNZIPPED dist in chromium and firefox.
  Fix every console error and every mangling bug.

PHASE 4 — XR shim (docs/07 C). Time-boxed. If it can't be made to run, remove it,
document precisely why, and make the manual emulator checklist the top item in
SUBMISSION.md.

PHASE 5 — Audio & effects (docs/05). Build, measure.

PHASE 6 — Size pass: if over 12,900, cut per CLAUDE.md priority; log cuts.
Roadroller -O3 for the final build.

PHASE 7 — Verification (docs/07 D, docs/08)

- Full test suite three times in a row, green each time.
- Read the perfect-bot logs for every boss phase; fix anything skipped.
- README.md, SUBMISSION.md (final size, module table, cuts, description ≤ 500
  chars, WebXR category checklist, manual emulator checklist), DECISIONS.md.
- Final build; confirm dist/sevenfold.zip ≤ 13,312, unzip -l single entry,
  unzip -t OK, grep for URLs returns only the hosted three.js.
- git tag submission.

Rules that override everything:

- Zip ≤ 13,312 bytes. Cut features, never exceed the limit.
- The only external resource is the hosted Three.js core module. No addons.
- Zero console errors in Chrome and Firefox desktop mode and through the XR path.
- The player is never moved. Input is head pose, two hand poses, select, squeeze.
- Do not stop until CLAUDE.md's Definition of Done is entirely checked off.

When completely finished, your final message must contain only:

1. absolute path to dist/sevenfold.zip and its size in bytes,
2. the test summary table (browser × test, plus sim suite pass counts),
3. per-boss perfect-bot clear times,
4. the manual emulator checklist, and anything else I must do by hand before
   submitting — or the single word NONE.

I'll start by reading the spec documents in order, then set up the repo and work through the phases.

Ran 6 commands (2 failed)

I've read the full spec. Now starting Phase 0: repo setup, dependencies, and verifying the hosted Three.js URL.

Checked toolchain and hosted three.js URL

Network's working and the hosted library responds. Since advzip/ect/zopfli aren't available on this Windows box, I'll use a WASM zopfli npm package with a hand-rolled zip container—setting up the repo and installing dependencies now.

Ran 5 commands

Hosted file confirmed as r185, single-file minified bundle. Now writing DECISIONS.md with Phase 0 notes, committing, then moving into Phase 1: the pure simulation.

Wrote DECISIONS.md and committed Phase 0

Phase 0 is committed. Now Phase 1: writing the pure simulation (vec.js + sim.js). I'll set the package to ESM so Node tests can import the same source files the build concatenates.

Wrote vec.js and set ESM

Now writing sim.js: rope, raw forms, forge recogniser, five weapons, enemies, waves, three bosses, Light, score, events, hash.

Created
sim.js
+358
-0

Fixing a few issues I spotted while writing (trigger-edge timing, wisp weave, part world positions, enemy cleanup), then writing the test suite.

Ran 3 commands (2 failed)

The slice cut off the return line of the recogniser. Fixing it.

Fixed recogniser return and smoke test

The sim boots and runs a wave. Now I need the test infrastructure: synthetic sigil trajectories, then the sim test suite with the three bots. Writing trajectories.js first.

Created trajectories.js, ran 2 commands
+55
-0

I found the recogniser fails on symmetric sigils since it checks midpoint path length instead of total hand path. I'll fix the empty-trail check to use total path, and add a !loop guard to Maul so it doesn't misfire before Halo on big circles.

Fixed empty-trail check and Maul/Halo ambiguity, rerun

Only the jittered Lance fails: per-sample noise inflates the midpoint path length. I'll measure the path through a 6 cm dead-band so jitter doesn't accumulate.

Dead-band path length, rerun recogniser check

All 70 trajectories check out correctly. Now I'll apply the design tweaks (per-part cooldowns, arrows not breaking armor plates, boss HP/placement tuning) and write the sim test suite with the bots.The idle path already loses all Light at 22 s in wave 1. Next: the bot module (perfect / wrong-tool / idle) and the sim test suite (A1–A7).

Created
bot.js
+297
-0

Now applying two small sim changes (prism roll measured relative to the hand's own forward axis, arrows piercing swarm wisps), then a first bot smoke run on waves 1–3.

Ran 2 commands (1 failed)

Bot is currently superhuman—firing 3 resonant arrows/sec, clearing waves in ~10s and killing Thunderhead 3s after its eye opens. I'll add human-like pacing (aim hold, reaction pause, engagement range) and re-measure before adjusting enemy numbers.

Ran 4 commands (1 failed)

The bot's head only steps 0.3 m aside instead of 0.7 m, so lightning columns still land. Tracing the head controller per step.

Traced head movement during a strike cue

I'll fix the dodge logic by evaluating 8 clamped directions and picking the best one, instead of falling back to "move toward centre" which walks the head into the column.

Ran 2 commands (1 failed)

Thunderhead now falls in 30–36 s with no Light lost. Before tuning the numbers, let me see how the bot fares across all 12 waves for a couple of seeds, plus the wrong-tool bot.

Ran perfect bot through all waves, and wrong-tool bot

Found that Gloam is unsolvable as designed since a 2.2 m lance can't reach a 3.2 m plate. I'm restructuring it so colored arrows break plates and phase 2 is melee-only at lance reach (making the no-forge bot fail there), dropping the stoop mechanic, and raising Thunderhead's HP and early wave intervals.

Restructure Gloam, tune waves, rerun perfect bot

Phase 1 clears quickly, but phase 2 fails since the bot's lance is too slow to land the required core hit within 0.5s. I'll add a dedicated phase-2 loop that holds a ready pose for an instant thrust, and correct the lance band geometry to account for target radius.

Ran 2 commands

I've spotted three bot bugs: the head stays ducked after a sweep, lance attempts happen from 10m away with hands collapsing to one point, and it thrashes between forge/unforge. I'll fix these, smooth out the pacing, and raise Gloam's core HP to land the fight in the 40–150s window.Found three bugs: arrows striking the near plate instead of the intended far one, the bot failing to crouch for low targets, and hit queries returning the first hit instead of the nearest. Fixing all three now.

Nearest-part hit query, shell plate geometry, bot crouch; rerun

Waves 1–7 now clear for all three seeds. All three die at Gloam. Tracing seed 1 from Gloam's spawn.

Traced Gloam fight seed 1

Found two geometry bugs: the arc's vertical rope goes underground for low targets, and the lance ready pose puts the R hand out of reach, collapsing both hands to one point. Fixing by switching the arc to a horizontal rope with a downward chop and tightening the lance reach math.

Fixed arc chop and lance reach; rerun seeds 1-3

Two seeds now reach wave 11 and Gloam clears in 45 s. Tracing the remaining deaths: seed 2 at Gloam and seed 1 at wave 11.

Traced seed 2 Gloam death

The head target set by tasks is clobbered every step by the controller (B.tH = B.head), so the bot never walks toward Gloam and its lance stays out of reach. Fixing the head-target persistence.

Ran 3 commands

Found that the lunge counter fails because the previous thrust's per-part cooldown blocks the counter-hit. I'll reset that cooldown when the lunge winds up, then trace the wave-6 shell dive in seed 1.

Fixed lunge cooldown; trace shell dive in seed 1 wave 6

I noticed the bot keeps arcing a wisp even when the exposed shell walks in—I'll add task pre-emption to abort low-priority actions for urgent targets and fix the shell's urgency estimate, then run seeds 1–5 in parallel to test it.

Ran 2 commands

Wave 6 (Shells) is now the choke point across seeds: shells reach the unicorn or pin the bot. Tracing the last second before the dive at fine resolution.

Fine trace of the seconds before the shell dive

The bot freezes for over a second with its hands clamped at the reach limit. I need to see which action it's stuck in, so I'll add a task-name tag to the bot and re-trace.

Tag bot tasks with names and retraceI've identified that shells get deprioritized until they're close since wisps appear more urgent. I'll adjust target selection to weight by required work (plates + core) so shells get engaged earlier on approach.

Ran 2 commands

The bot shoots steadily but the work-weighted score now starves the circling wisps (they dive). I'll switch to a ratio score, restore the quicker aim cadence, and rerun.

Ran 2 commands

Found the issue: the shell hits its reach limit, clamping the hands and misaligning the rope during chops. I'll fix this by keeping the head within 0.7 m of a melee target during arcs and maul swings.

Ran 3 commands

The real bug: with a straight rope, ~20 overlapping points get credited to the lowest-index one, skewing the contact band by ~3 off. I'll fix the sim to credit the hit to the closest sample point instead, for the arc, lance, and shards alike.

Closest-sample contact band in sim; rerun seeds 1-5

All five seeds now clear Gloam and reach wave 11 (3 Shells, Swarm, 3 Spitters, 4 Husks), which is the next sticking point. I'll check loss causes across seeds alongside the wave-11 timeline together.

Ran 2 commands

The bot never switches off the bow in wave 11: the Swarm's urgency is scored too low while it orbits and stings every 2 s. Making an orbiting or arriving Swarm the top priority.

Ran 2 commands

Swarm handling now works. The remaining killer is Spitter orbs (4 hits in wave 11): the bot lets spitters live too long. Raising their priority to "time until next shot".

Ran 2 commands

I'll fix wave 11 by interleaving enemy types round-robin in the spawn queue instead of front-loading all three Shells, widen the interval slightly, and time-box the bot's block task.

Ran 3 commands

Spitters currently target the unicorn immediately, firing their first shot 2.5s after spawn. I'll change spitters to open with a dodgeable head shot and have the bot prioritize spitters about to fire at the unicorn.

Spitter opening shot at head; bot spitter priority; rerunThe bow-only approach can't handle wave 11's enemy density—the Lance's 2.8m reach is the intended fix. I'll update the bot's wave policy to default to the Lance in later waves, using a lateral flick for fast targets and reserving the bow for Spitters.

Lance-centric wave policy for the perfect bot; rerun seeds 1-5

Seeds 1 and 2 now stall in wave 9 (alive but not clearing), and the others still die in wave 11. Tracing both in parallel.

Traced wave 9 stall (seed 1) and wave 11 (seed 3)

I've identified two issues: crouch height resets between pauses causing head bobbing that prevents the lance from settling, and spitters firing their unicorn shot before the bot can switch weapons. I'll fix the head-height stickiness, add proper lance band feasibility checks, relax spitter cadence to 3.5s, and prioritize unicorn-bound spitters as urgent bow targets.

Sticky crouch, head placement search, spitter cadence/urgency; rerun

Seed 4 now reaches the Eclipse but stalls there, seed 1 stalls at wave 9, and the others die to Shell dives in wave 11. I'll pull all three traces in parallel to examine the wave-9 stall, the Eclipse fight, and the shell-dive timeline.

Ran 2 commands

Found two stalls: the lance band's ready-distance formula is off by a radius due to the closest-sample contact change, and the Eclipse's phase-1 invulnerability flag persists into phase 2, blocking tentacle plate breaks. I'll fix both, plus add a 1.5s Shell arrival telegraph and bow-on-approach for far shells.

Fixed lance band distance, Eclipse phase-2 invulnerability, shell telegraph; rerun

Seed 1 now reaches the Eclipse with full Light. Three remaining problems to trace in parallel: the Eclipse stall (seed 1), a wave-9 stall (seed 5), and wave-11 swings (seed 3).

Ran 3 commands

Found the bug: the maul never hits because parts start without a cooldown field, making undefined <= 0 evaluate false. I'll fix that comparison, widen the bot's melee engagement radius, and switch to the bow for lance-infeasible plate bands.

Ran 2 commands

The bot is wasting ~6s per wave thrashing between forge and unforge while husks attack the unicorn unchecked. I'll rewrite the wave policy with weapon-switch hysteresis and better prioritization (attacking husks first, feasible plates only), then rerun.Seed 5 completed the whole game through Dawn for the first time. Remaining: Swarm stings in wave 9 (seeds 2, 3) and head orb-hits in wave 11 (seed 4). Pulling both traces in parallel.

Traces: wave-9 swarm stings and wave-11 head orb hits

Found two bugs: the bot idles forever when a Shell lacks a lance-feasible plate, and orb dodges get clamped at the boundary due to outward-pointing sidesteps. Fixing both now.

Ran 4 commands

The dodge target flips between the two opposite sidestep directions every step (their clamped lengths are nearly equal), so the head jitters in place. Locking the chosen direction per orb.

Ran 2 commands

Found that the dodge gets skipped when holding the rope without a bow, since that path relies on the block task which never re-checks once running. I'll make head sidesteps unconditional for head-bound orbs and keep block handling only unicorn-bound ones.

Ran 2 commands

Dodge works now, but the boundary clamp is dragging the sidestep back into the orb's path. I'll fix this by picking the dodge point based on real clearance from the orb's trajectory among eight clamped candidates.

Clearance-based orb dodge; rerun seeds 1-5

Head-shot dodging works now, but waves 9 and 11 still overwhelm the bot with stings, unicorn orbs, and dives due to density. I'll ease the swarm dart cadence and those spawn intervals, log the changes as tuning, then rerun.

Tune swarm darts and wave 9/11 intervals; rerun

Adding the Lance lets the bot intercept unicorn-bound orbs it currently loses to, since the shaft can cover that path from behind. I'll implement weapon-aware blocking to take advantage of this.

Lance blocking of unicorn-bound orbs; rerun seeds 1-5

Two of five seeds now finish the whole game. Pulling the wave-11 timelines for seeds 1 and 4 in parallel to see what the dives, swings and remaining unicorn orb hits have in common.Found the issue: seed 1 lost its shell because the bot switched to the bow for a plate outside the lance's reach. I'll add the rope's arc chop as a faster fallback that works in any band, then rerun.

Ran 2 commands

Found the melee bots get stuck looping forever when they can't reach a blocked target. I'll add a per-target failure counter that switches to the bow after two failed attempts.

Per-target failure fallback; rerun seeds 1-5

Stalls are gone and two seeds finish. The wave-11 deaths are now all dives and swings. Fetching the two relevant traces in parallel (seed 1 around its dive, seed 4 around its two dives).

Ran 2 commands

Found the issue: the shell attacks from 3.6m, just outside the bot's melee radius, causing it to idle then switch to bow. I'll widen the melee candidate radius and raise the urgency gate for spitter switches.

Widen melee radius, raise switch gate; rerun

Three of five seeds now finish the game. Seeds 4 and 5 die in wave 11 to Shell dives. Fetching both wave-11 traces in parallel to see whether it's a bot flaw or wave density.Found two bot flaws: the lance can't thrust at slow walkers since its "settled" check fails while the target moves, and it switches to the bow for a spitter even when a 6-plate Shell is 1s from lance range. Fixing both now.

Thrust tolerance and pre-positioning gate; rerun

Three seeds finish with full Light. Two independent failures remain (seed 4: Shell dives; seed 3: orb hits), so I'll pull both wave-11 traces in one go.

Wave-11 traces for seeds 4 and 3

I'll fix the rope placement for unicorn-bound orbs and slow down Shell detonation for a proper telegraph, then tune boss HP and Gloam cadence to hit the 40–150s fight window before rerunning all seeds.

Ran 2 commands

Found the issue: with a normal grip, a Lance can't reach red/orange band plates beyond ~0.6 m, so I'll teach the bot a reverse grip (tip back, base forward) to handle low-band targets within arm's reach. While that runs, I'll start writing the sim test suite.

Reverse lance grip for low bands; run seeds in background

The patch aborted on a stale snippet (already rewritten earlier), so nothing was written and the background run uses the old bot. Reapplying without that piece and rerunning.

Applied reverse-grip patch and reran seeds 1-5

Seeds 1, 3, 4 now finish. Seeds 2 and 5 die in wave 11 with identical timelines to before, so the reverse grip wasn't their issue. Pulling both traces at once.

Wave-11 traces for seeds 2 and 5

Both seeds reveal the bot switching to the bow right as a big Shell arrives, wasting the 2.4s round trip because its low-band plates are lance-infeasible. I'll fix this by having it shoot those plates while the shell is still far off, reserving the arc for when the target is truly within reach.

Shoot hard plates early; tighten arc usage; rerun

Wave 6 regressed because the far-target rule makes the bot switch weapons mid-wisp-circling. I'm simplifying the wave policy to one clear rule—rope by default, Lance only for Swarms or feasible-part targets with no wisps around—and writing the sim test suite alongside it.

Rewrote wave policy (rope default, lance conditional); rerun

Dives now dominate waves 6 and 9. I'll pull both traces and simultaneously start writing the sim test suite file, since it doesn't depend on further bot tuning.tuning.

Seed 1 wave-6 timeline (dives)

I found that arrows are hitting a Shell's near plate with the wrong band instead of targeting the facing plate, and wisps aren't getting the arc treatment. Fixing both issues, rerunning, and writing the sim test suite in the same pass.

Bow targets facing plate; arc for circling wisps; rerun

Four of five seeds pass, two with zero Light lost; remaining issues are seed 2's wave-10 wisp dives and Gloam/Eclipse boss timers running too fast. I'm now running the seed-2 trace, applying timing fixes, and writing the sim test suite in parallel.

Started seed-2 wave-10 trace; apply boss/wave tuning
Session limit reached
