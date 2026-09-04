# 08 — Quest & submission checklist

Things that eliminate WebXR entries every year. Each must be true in the build.

## Quest browser realities

- HTTPS or localhost only for `immersive-vr`. The js13k host serves HTTPS. Dev
  server on localhost is fine for the emulator.
- `requestSession` **must** be called from a user gesture (click/`selectstart`).
  Never auto-request on load.
- Use `local-floor` reference space (fall back to `local` if it throws and add
  `+1.6 m` to the camera height in that case; log it).
- Frame budget 72 Hz on Quest 3S: ≤ 60 draw calls, ≤ 80k tris, no shadows, no
  postprocessing, `setFoveation(1)`, `setPixelRatio(1)`. Transparent meshes ≤ 8.
- AudioContext is suspended until a gesture; resume on `selectstart` as well.
- Hand tracking: input source has `hand` set and no `gamepad`; only `select`
  events fire (pinch). The forge must be reachable with pinch-hold (docs/02 §2).
- Controllers can disconnect/reconnect (battery, sleep): handle `disconnected` by
  freezing that hand's last pose; do not crash.
- Session end (headset removed) → return to desktop mode cleanly.
- No `alert()`, no `prompt()`, no `document.write`.
- Text must be legible in VR: the text plane at 3 m with ≥ 6 cm letter height.
- Never move the camera. The only thing that ever changes the player's viewpoint
  is the player.

## Judge-proofing

- The first 30 seconds: title, one sentence, pull a trigger, the rainbow is in
  your hands, wave 1 starts within 5 s. No tutorial screens. The wave 1 hint is
  one line on the text plane: "Swing the rainbow." Wave 5 hint: "Hold both grips.
  Stretch." That is the entire tutorial; the sigil table is in the README.
- Every weapon must be *findable* by an untold judge inside a minute: the hint
  text at waves 5/6/7/10 names one sigil each ("Hold grips. Circle."), and the
  README lists all five with a small diagram (ASCII).
- If Three.js fails to load, the game says so instead of showing a black page.
- The repository README has: what it is, controls (VR + desktop), the five sigils,
  colour resonance, how to build, how to run tests, credits (ZzFX; Three.js
  hosted by js13kGames), licence.

## Submission form checklist (for the user; put in SUBMISSION.md)

- Category: **WebXR** only (do not tick Desktop/Mobile — the hosted library
  forbids it).
- Zip: `dist/sevenfold.zip` (size shown).
- Repo: public GitHub with the full source and `build.js`.
- Description ≤ 500 chars (drafted in SUBMISSION.md).
- Screenshot: take one from the desktop-mode test screenshots (the renderer output
  is identical), ideally mid-forge with a boss visible; the tests save these to
  `test-results/`.
- After submission, the user should run the manual emulator checklist (docs/07 E)
  and use the bugfix PR window (until 14 Sept) for anything found.
