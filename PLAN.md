# Highway Dash — Project Plan

## Goal

Build a browser-based, top-down infinite car racing game using HTML5 Canvas and
vanilla JavaScript. No frameworks. No build tools. Just files a browser can open.

The player steers left/right to dodge traffic and obstacles on an infinitely
scrolling road. Speed increases over time. Score = distance driven.

---

## Step 1 — Define the Problem

Before writing a single line of code, I asked:

- What is the core game loop? → accelerate, steer, collide → game over
- What does "infinite" road mean? → spawn and cull objects by world-Y position
- What is the camera model? → player fixed at 65 % from top; world scrolls
- How do I avoid a monolithic file? → one class/module per concern

**Decided against:**
- Canvas libraries (Phaser, etc.) — overkill for this scope
- Bundlers / npm — adds unnecessary complexity
- Physics engines — simple AABB collision is enough

---

## Step 2 — Architecture Design

Designed before any implementation:

```
index.html          ← entry point, canvas, HUD overlay, script tags
style.css           ← layout, overlay styling, HUD positioning
utils.js            ← pure math helpers (lerp, clamp, AABB, dist)
input.js            ← keyboard state (Keys.left / Keys.right)
track.js            ← road geometry, lane math, obstacle + scenery spawning
car.js              ← player car (steering, wall clamping, drawing)
aiCar.js            ← traffic cars (constant forward speed, drawing)
sound.js            ← sound manager (real files + Web Audio fallback)
game.js             ← main loop, state machine, collision, HUD, camera
```

**Dependency order** (bottom-up, no circular deps):
```
utils → input → track → car → aiCar → sound → game
```

**State machine** (defined upfront):
```
WAITING → (click START) → RACING → (collision) → DEAD → (click PLAY AGAIN) → RACING
```

---

## Step 3 — Feature Breakdown (iterative, not all-at-once)

### Iteration 1 — Render the road
- Draw a static road with lane markings on canvas
- Add dashed centre lines that scroll with camera offset

### Iteration 2 — Player car
- Car class with `update(dt)` and `draw(ctx)` methods
- Automatic forward movement (`-Y` direction)
- Left/right steering with friction (`vx *= pow(0.008, dt)`)
- Wall clamping at road edges
- Visual lean on steering (`ctx.rotate(_lean)`)

### Iteration 3 — Camera
- Camera keeps player at 65 % from screen top
- `ctx.translate(cam.tx, cam.ty)` applied once per frame
- All world objects drawn in world space; camera transform handles screen mapping

### Iteration 4 — Traffic and obstacles
- `AICar` moves at 55–75 % of game speed (always slower than player)
- Spawn just above visible screen; cull when below screen
- `Track` manages obstacles; difficulty scales with distance score
- Hitboxes shrunk 25 % for fairness

### Iteration 5 — Collision and game over
- AABB overlap check (player vs obstacles, player vs traffic)
- On collision: state = DEAD, show overlay with score/time/best
- Best score persisted with `localStorage`

### Iteration 6 — Polish
- Speed lines at high speed
- Danger vignette (red edge glow) when hazard is close
- Tyre marks, headlights, taillights on car drawing
- Roadside scenery (trees / poles)

### Iteration 7 — Sound
- Web Audio API synthesized engine (4-harmonic F1-style)
  - Fundamental sawtooth + harmonics + bandpass whine + vibrato LFO
  - Pitch mapped to `playbackRate` / oscillator frequency by speed
- Real audio file support: drop `sounds/engine.mp3`, `crash.mp3`, `bgm.mp3`
  - Auto-detected on load; falls back to synthesis if missing
- Crash: noise burst + metal clang + bass thud
- BGM: pentatonic minor melody that loops on game-over screen

---

## Step 4 — Review Checkpoints

After each iteration:
1. Does the feature work in isolation?
2. Does it break anything that was working before?
3. Is the code readable without comments?
4. Any new global state that shouldn't be global?

---

## Step 5 — Known Trade-offs & Decisions

| Decision | Reason |
|----------|--------|
| Infinite scroll via world-Y, not camera-Y | Simpler math; no coordinate drift |
| `requestAnimationFrame` with `dt` cap at 0.1 s | Prevents spiral-of-death on tab switch |
| Classes without `#private` fields | Broad browser compat, no build step |
| Web Audio synthesis as fallback | Game works with zero assets |
| `localStorage` for best score | No backend needed |

---

## Workflow Used

```
Plan → Break into features → Build one feature → Test → Review → Next feature
```

AI was used as a **thinking partner**:
- Asked it to explain trade-offs, not just generate code
- Reviewed every output before accepting
- Rejected suggestions that added unnecessary complexity
- Asked "why" before "what" at each step
