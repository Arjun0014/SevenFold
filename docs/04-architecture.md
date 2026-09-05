# 04 — Architecture

## Layout

```
index.html           dev shell (loads src/main.js as a module; NOT the shipped file)
src/
  vec.js             tiny vec3/quat helpers (no Three dependency) used by sim
  sim.js             PURE game simulation: rope, forms, forge recogniser, enemies,
                     waves, bosses, damage, Light, score. Fixed DT. Seeded. No DOM.
  input.js           XR input → sim hand state; desktop input → sim hand state
  xr.js              hand-written WebXR bootstrap (session, reference space, controllers)
  render.js          Three.js scene: arena, unicorn, enemies (instanced), rainbow
                     forms, particles, 3D text plane, fog; reads sim state each frame
  audio.js           ZzFX-mini + drone + PositionalAudio wiring
  main.js            boot: dynamic import of hosted three, create renderer, loop
tools/
  play.html          dev page: desktop mode + a recorder that dumps hand trajectories
                     to the console (for authoring sigil tests and bot scripts)
test/
  sim.test.js        Node: sim tests + bots (docs/07 A)
  browser.test.js    Playwright chromium + firefox (docs/07 B)
  xr-shim.js         minimal fake navigator.xr for Playwright (docs/07 C)
  trajectories.js    synthetic sigil trails
build.js             concat → terser → roadroller → inline → zip → gate
dist/                index.html, sevenfold.zip
README.md SUBMISSION.md DECISIONS.md CLAUDE.md docs/
```

## Three.js loading (this is the one place the rules bite)

```js
// main.js
const T = await import('https://play.js13kgames.com/2026/webxr/three.js');
```
- **Dynamic import**, not static, so the whole game can be a classic `<script>` that
  Roadroller can pack (static `import` is illegal inside eval-packed code).
- No import maps, no `three/addons`, nothing else from the network. `grep http` on
  the build must return exactly this URL.
- Check at startup that the file actually exported `WebGLRenderer`; if the import
  fails (offline), show a 3D-less HTML message "Sevenfold needs the hosted Three.js
  file" — no console error.
- Use only core three: `WebGLRenderer, Scene, PerspectiveCamera, Fog, Color,
  Mesh, InstancedMesh, Group, BufferGeometry, BufferAttribute, Box/Cylinder/Cone/
  Sphere/Torus/Octahedron/Plane/RingGeometry, MeshBasicMaterial, MeshLambertMaterial,
  ShaderMaterial, Points, PointsMaterial, LineSegments, LineBasicMaterial,
  CanvasTexture, DirectionalLight, AmbientLight, AudioListener, Audio,
  PositionalAudio, Vector3, Quaternion, Matrix4, Object3D` and
  `renderer.xr.getController(i)` / `getControllerGrip(i)` (core, not addons).

## Hand-written XR bootstrap (xr.js)

No XRButton. Implement:
```
supported = navigator.xr && await navigator.xr.isSessionSupported('immersive-vr')
button "ENTER VR" (HTML, big, centred) shown only if supported; else "PLAY ON DESKTOP"
onClick: session = await navigator.xr.requestSession('immersive-vr',
          { optionalFeatures: ['local-floor','bounded-floor','hand-tracking'] })
renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType('local-floor');
renderer.xr.setFoveation(1); await renderer.xr.setSession(session);
session.addEventListener('end', () => desktopMode())
```
Controllers: for i in 0,1 → `c = renderer.xr.getController(i)`, `g =
renderer.xr.getControllerGrip(i)`; on `connected` read `e.data.handedness` and
`e.data.hand` (hand tracking present ⇒ treat `select` as trigger; forge = both
pinches held 0.4 s while hands within 0.3 m). Events: `selectstart/selectend/
squeezestart/squeezeend`. Poses: read `g.position/quaternion` each frame (world
space, already in the player's reference space). Head: `renderer.xr.getCamera()`
position/quaternion when presenting, else the desktop camera.

Haptics: `c.userData.src = e.data` on connect; pulse via
`src.gamepad?.hapticActuators?.[0]?.pulse(a,ms)` in try/catch.

Recentre: on `selectstart` while on the title screen → set the arena origin to the
current head position projected to the floor (so the unicorn is always directly
behind wherever the player stands when they start).

## Desktop fallback (input.js) — mandatory, it is how the game gets tested

Renders the same scene with a 90° FOV camera at 1.6 m. Controls (shown in a
small HTML overlay at the bottom-left, hidden in VR):
```
mouse move            look
WASD / QE             move RIGHT hand in head space (x/z, y)
IJKL / UO             move LEFT hand
LMB / RMB             right / left trigger
Space (hold)          both grips (forge)
1..5                  perform a canned sigil (Shards, Maul, Halo, Prism, Lance) — the
                      forge is entered, the trail is played back in 0.6 s, resolved
R                     restart      M  mute      F  fullscreen
```
Hands are drawn as small glowing spheres in desktop mode. Canned sigils exist so
desktop players (and judges without a headset) can see every weapon.

A **script hook** `window.SF = { sim, inject(handState), step(n), state(), wave(n), ev(k), dawn() }` (a `//@test` line: only in `dist/test.html`, never in the zip) is
exposed always (tiny) so Playwright and the recorder can drive it.

## Frame loop (main.js)

```
rAF / xr frame:
  now → accumulate; while (acc >= DT && steps < 6) { input.poll(); sim.step(); acc -= DT }
  render.sync(sim, alpha = acc/DT)   // interpolate positions for smoothness
  renderer.render(scene, camera)
```
Time scale during forge: the sim's world `dt` is `DT * 0.15` while hands and rope
use `DT` — handled inside `sim.step` via two clocks.

## Rendering (render.js)

- Enemies: one `InstancedMesh` per enemy type (max 24 Wisps, 12 Husks, 8 Spitters, 8
  Shells with 5 plate instances each, 40 swarm wisps). Per-instance colour via
  `instanceColor` for the core/edge. Dead instances scaled to 0.
- Rainbow rope: one `BufferGeometry` tube built each frame from the 29 rope points
  (8 radial segments, radius 0.02) with a `ShaderMaterial` that colours by the
  `s` attribute into 7 hard bands + glow; a second wider copy (radius 0.05, alpha
  0.25, additive) for glow. Forged weapons reuse the same material on their own
  geometries (Lance = long cylinder; Halo = torus; Maul = cylinder + hex prism;
  Shards = two flattened boxes; Prism = octahedron + beam cylinder).
- Particles: one `Points` pool of 600 with per-point colour and life, updated on CPU
  (Float32Array), `PointsMaterial` with `sizeAttenuation`, additive blending.
- Lightning: a `LineSegments` pool (200 segments), rebuilt when active.
- Text plane: one 1024×256 `CanvasTexture`, redrawn only when the text changes.
- Lighting: one `DirectionalLight` (moon), one dim `AmbientLight`; materials are
  `MeshLambertMaterial` for stone, `MeshBasicMaterial` for glow things. No shadows.
- `renderer.setPixelRatio(1)` in VR (the XR layer decides), `≤ 1.5` on desktop.
- Draw call budget check: `renderer.info.render.calls` exposed via `SF.state()`;
  tests assert `< 70`.

## Sim ↔ render contract

`sim.state` is a plain object updated in place; `render.sync` reads it. The sim
emits `events: [{type, x,y,z, band, ...}]` each step (hit, crack, forge, kill,
lightLost, waveStart, bossPhase…) that render/audio drain. No render code in sim,
no sim code in render. This is enforced by `sim.js` importing only `vec.js`.

## Persistence

`sevenfold_best` = `{wave, score, time}` JSON; `sevenfold_mute` = `1|0`. try/catch.

## Byte-saving rules (see docs/06 too)

Property names prefixed `_` for mangling; one module of helpers; geometry built from
loops and a few primitives; colours as one array of 7 ints; no classes; sound as
ZzFX arrays.
