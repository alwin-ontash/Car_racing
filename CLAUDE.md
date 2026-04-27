# CLAUDE.md — Highway Dash Living Document

> This file is a living record of decisions, progress, and changes made
> throughout the project. Updated after every meaningful step.

---

## Project Overview

**Name:** Highway Dash  
**Type:** Browser-based top-down infinite car racing game  
**Stack:** HTML5 Canvas · Vanilla JavaScript · Web Audio API  
**Deadline:** 27 April 2026  
**Repo:** https://github.com/alwin-ontash/Car_racing

---

## Architecture Decisions

### Decision 1 — No frameworks or bundlers
**Date:** Project start  
**Reason:** The game scope is small. Adding React, Phaser, or a bundler would
create more complexity than value. Plain JS files loaded in order via `<script>`
tags is simpler to debug and understand.  
**Impact:** All code must be globally scoped or use IIFEs/classes carefully.

### Decision 2 — Coordinate system: world-Y moves, player stays
**Date:** Architecture phase  
**Reason:** Moving the player's Y coordinate (rather than moving a camera object)
keeps collision math simple — everything is in the same world space.  
**Impact:** Player Y goes to large negative numbers. Score = `Math.abs(player.y) / 5`.

### Decision 3 — Separate module files, strict load order
**Date:** Architecture phase  
**Files:** `utils → input → track → car → aiCar → sound → game`  
**Reason:** Each file has one job. No circular dependencies. Easy to reason about.  
**Impact:** `index.html` script order is the dependency graph.

### Decision 4 — State machine for game flow
**Date:** Game loop design  
**States:** `WAITING → RACING → DEAD`  
**Reason:** Without explicit states, flags multiply and conditionals scatter.  
**Impact:** Every `if (state === STATE.RACING)` block is intentional.

### Decision 5 — AABB collision with 25 % shrink
**Date:** Collision implementation  
**Reason:** Full hitboxes feel unfair — cars overlap visually but the hit feels
random. Shrinking by 25 % gives the player a fair "near miss" window.  
**Impact:** Slightly more forgiving than it looks.

### Decision 6 — Web Audio API with real-file fallback
**Date:** Sound implementation  
**Reason:** The game should work with zero assets. Synthesis ensures sound always
plays. Real files (drop into `sounds/`) override synthesis automatically when present.  
**Impact:** `sounds/engine.mp3`, `sounds/crash.mp3`, `sounds/bgm.mp3` are optional.

---

## Progress Log

### Phase 1 — Core render loop
- [x] Canvas setup with full-window resize
- [x] Road drawn in world space with lane dashes
- [x] Camera transform (`tx`, `ty`) applied via `ctx.translate`
- [x] Player held at 65 % from top

### Phase 2 — Player car
- [x] `Car` class with `update(dt, fwdSpeed, track)` and `draw(ctx)`
- [x] Steering with exponential friction
- [x] Wall clamping at road edges
- [x] Visual lean on cornering (`ctx.rotate(_lean)`)
- [x] Headlights, taillights, windscreen drawn

### Phase 3 — Traffic
- [x] `AICar` class moves at fixed world speed
- [x] Spawned just above visible screen, culled below
- [x] Random lane selection and colour
- [x] Spawn interval: 1.8–3.0 s (randomised)

### Phase 4 — Obstacles
- [x] `Track` manages obstacle list
- [x] Gap between obstacles scales with score (harder over time)
- [x] Collision check: player vs obstacles and player vs traffic

### Phase 5 — Game state and HUD
- [x] WAITING / RACING / DEAD state machine
- [x] Overlay panel (start screen + crash screen)
- [x] HUD: distance, time, speed
- [x] Best score saved to `localStorage`

### Phase 6 — Polish
- [x] Speed lines at high velocity
- [x] Danger vignette (red edge glow near hazard)
- [x] Roadside scenery (trees / poles)
- [x] Speed progression: `SPEED_START=240` → `SPEED_MAX=620` px/s

### Phase 7 — Sound
- [x] `SoundManager` IIFE with public API
- [x] Synthesized F1 engine (4 oscillators + vibrato LFO)
- [x] Engine pitch tracks player speed via `playbackRate` / frequency
- [x] Crash sound: noise burst + metal clang + bass thud
- [x] Game-over BGM: pentatonic minor melody loop
- [x] Real MP3 file support with auto-detection and silent fallback

### Phase 8 — Repo and docs
- [x] Git repository initialised
- [x] Pushed to https://github.com/alwin-ontash/Car_racing
- [x] `README.md` with play instructions and sound setup guide
- [x] `PLAN.md` with full planning and architecture breakdown
- [x] `CLAUDE.md` (this file) as living document

---

## Changes & Refinements

| Date | Change | Why |
|------|--------|-----|
| Build | Added `dt` cap at 0.1 s in game loop | Tab switch caused huge dt spike → car teleported through obstacles |
| Build | Shrunk hitboxes 25 % | Full hitbox felt unfair on near misses |
| Sound v1 | Simple 2-oscillator engine | Basic rumble placeholder |
| Sound v2 | Upgraded to 4 harmonics + vibrato LFO | More realistic F1 scream character |
| Sound v3 | Added real file support | Synthesis sounds artificial; real MP3s give authentic audio |

---

## What I Would Do Next (If More Time)

- [ ] Mobile touch controls (left/right tap zones)
- [ ] Difficulty levels (Easy / Medium / Hard)
- [ ] Nitro boost mechanic
- [ ] Multiple road skins / night mode
- [ ] Online leaderboard (serverless, e.g. Supabase)
- [ ] Sound volume controls in settings panel

---

## AI Usage Notes

AI (GitHub Copilot) was used as a **thinking partner**, not an autocomplete machine:

1. **Planning first** — asked AI to critique the architecture before any code
2. **One feature at a time** — never asked for "the whole game"
3. **Explained trade-offs** — e.g. why AABB over pixel-perfect collision
4. **Reviewed all output** — understood every function before accepting it
5. **Pushed back** — rejected suggestions that added framework dependencies
6. **Iterative refinement** — sound went through 3 versions based on feedback

The workflow was:  
`Define goal → Design → Ask AI for one piece → Review → Integrate → Test → Refine`
