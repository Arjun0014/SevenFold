# DECISIONS.md — SEVENFOLD

Running log of every decision made where the spec (CLAUDE.md, docs/01–08) was
silent or where a number was tuned. Newest at the bottom of each section.

## Phase 0 — Setup (2026-09-04)

- Environment: Windows 11, Node 22.14, Git Bash. No `apt-get`; `advzip`, `ect`,
  `zopfli` binaries are not available. Zip fallback: `@gfx/zopfli` (WASM zopfli,
  dev dep) producing a raw deflate stream, wrapped in a hand-rolled single-entry
  zip container (local header + central dir + EOCD, CRC32 computed in JS). Falls
  back to `zlib.deflateRawSync` level 9 if zopfli fails. Verified with `unzip -t`.
- Hosted library `https://play.js13kgames.com/2026/webxr/three.js` responds
  200 (Cloudflare, 726,241 bytes). It is a single self-contained minified ESM
  bundle, `REVISION "185"`, exports `WebGLRenderer`. A copy is kept at
  `tools/three-hosted-r185.js` (gitignored) for the Playwright `page.route`
  fallback; npm `three@0.185.0` is only the API reference (its
  `three.module.js` splits into `three.core.js`, so the hosted copy is the
  better routing target).
- Dev server: `tools/serve.js` (zero-dep static server on 8080).

## Size log

| step | raw | min | rolled | zip |
|---|---|---|---|---|
