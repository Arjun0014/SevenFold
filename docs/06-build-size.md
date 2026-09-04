# 06 — Build & size

## Target

`dist/sevenfold.zip` ≤ 13,312 bytes. Working target ≤ 12,900. `build.js` fails
above 13,312, warns above 12,900.

## Pipeline (`node build.js`)

1. Concatenate `src/` in order: vec, sim, input, xr, audio, render, main. Strip
   `import`/`export` lines (modules are written with unique top-level names so this
   is safe). Wrap in `(async()=>{ ... })()` because `main` awaits the dynamic
   import.
2. `terser` with `compress: {passes:3, unsafe:true, unsafe_math:true, toplevel:true,
   drop_console:true}`, `mangle: {toplevel:true, properties:{regex:/^_/}}`.
   Never `_`-prefix anything that Three.js or the DOM reads (e.g. `position`,
   `quaternion`, `instanceColor`, `userData`). Our own state uses `_`-keys.
3. `roadroller -O2` (compare -O1/-O2; final run -O3 once).
4. Inline into `dist/index.html`:
   ```html
   <!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Sevenfold</title><style>…</style><div id=u></div><script>…</script>
   ```
   No `type=module` (the code is a classic script that dynamically imports three).
5. Zip with `advzip -4 -i 300` → `ect -9 -zip` → zopfli → zlib-9 fallback chain
   (hand-rolled zip container if needed: single deflate entry, CRC32, no directory
   entries). Verify `unzip -t`, `unzip -l`.
6. Print raw/minified/rolled/html/zip sizes and a per-module table → `dist/size.txt`.
7. Gate.

## Budget (minified+rolled, rough)

| module | budget |
|---|---|
| sim.js (rope, forms, recogniser, enemies, waves, bosses) | 6.0 KB |
| render.js (arena, unicorn, instanced enemies, weapons, particles, text) | 4.0 KB |
| xr.js + input.js + main.js + css | 1.8 KB |
| audio.js | 1.2 KB |

That is tight. The bosses and the five weapon geometries are the pressure points.
Build after every feature. If sim.js passes 6.5 KB rolled, stop adding boss
mechanics and simplify (fewer attack types, shared telegraph code).

## Byte-saving rules

- Geometry: one helper `mesh(geo, color, parent, x,y,z, sx,sy,sz)` used everywhere.
  Build arches/pillars/unicorn from loops over data arrays of numbers, not from
  hand-placed code.
- One rainbow `ShaderMaterial`; all weapons share it.
- Enemy AI as a data table (speed, hp, radius, behaviour id) + a `switch` of ≤ 5
  behaviours. Bosses share one "telegraph then act" helper.
- Sigil features computed in one pass; the five tests are one ordered array of
  arrow functions.
- Sounds as ZzFX parameter arrays; drone from 3 lines.
- Text via one canvas draw function.
- `const {sin,cos,abs,min,max,hypot,sqrt,PI}=Math` once.
- No `class`; closures + plain objects.
- No dead code paths for controller models, thumbsticks, or hand meshes.

## If over the limit (in order)

1. Roadroller -O3.
2. Attack the biggest module in `size.txt`.
3. Drop endless mode and combo scoring.
4. Drop particles to a single pool with one behaviour.
5. Drop positional audio (keep non-positional).
6. Merge Eclipse phase 2 into phase 3; then drop Eclipse entirely (Dawn after Gloam).
7. Drop Gloam. Never drop Thunderhead, the forge, or the five weapons.

## Repo hygiene

`.gitignore` node_modules, dist/*.html, test-results. Commit `dist/sevenfold.zip`
only in the final tagged commit `submission`. `package.json` scripts: build, test,
test:sim, test:browser, dev (static server on 8080 — WebXR needs https or
localhost; localhost is fine for the emulator).
