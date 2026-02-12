# Dodge Run — Design Document

## 1. Game Concept

### 1.1 Overview
**Dodge Run** is a simple, arcade-style browser game where the player controls a character that must avoid incoming obstacles. The game uses the PS5 DualSense controller via the browser Gamepad API. The player moves freely in 2D space while obstacles spawn and travel toward them; survival time and dodged obstacles determine the score.

### 1.2 Core Loop
1. Player moves using the left analog stick.
2. Obstacles spawn from screen edges and move toward the center/player area.
3. Collectibles spawn in the play area; player can collect them for extra points.
4. Player avoids contact with obstacles.
5. Score increases over time, for each obstacle cleared, and for collectibles collected.
6. Collision with an obstacle = game over.
7. Player can restart and try to beat their high score.

### 1.3 Design Pillars
- **Simple controls** — One stick to move, no additional actions required.
- **Easy to learn, hard to master** — Clear rules, increasing difficulty.
- **Controller-first** — Optimized for DualSense; keyboard optional fallback.
- **Low friction** — Runs in browser, no install, quick restart.

---

## 2. Technical Architecture

### 2.1 Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Runtime | Modern web browser (Chrome, Firefox, Edge, Safari) | Gamepad API support, no install |
| Rendering | Three.js / WebGL | 3D spheres and boxes; sharp on retina |
| Logic | Vanilla JavaScript (ES6+) | No build step, easy to understand |
| Styling | CSS3 | Layout, responsive framing, minimal |

### 2.2 Architecture Pattern
- **Modular JS** — Separate modules for game loop, controller, entities, collision.
- **State machine** — Discrete game states: `MENU`, `PLAYING`, `GAME_OVER`, `PAUSED`.
- **No framework** — Plain JS for clarity and portability.

### 2.3 File Structure

```
ps_5/
├── index.html              # Entry, canvas, meta
├── css/
│   └── style.css           # Layout, canvas framing
├── js/
│   ├── main.js             # Entry, init, state machine
│   ├── game.js             # Game loop, update/render orchestration
│   ├── controller.js       # Gamepad polling, input normalization
│   ├── player.js           # Player entity, movement, bounds
│   ├── obstacle.js         # Obstacle spawner, types, movement
│   ├── collectible.js      # Collectible spawner, points, lifetime
│   ├── collision.js        # Collision detection (AABB, circle-circle)
│   ├── particles.js        # Particle burst on game over
│   ├── renderer3d.js       # Three.js 3D renderer
│   ├── audio.js            # Web Audio: hit, pass, menu, BGM, near-miss
│   └── ui.js               # HUD, menus, score display
├── assets/                 # (Optional) sprites, sounds
│   ├── sprites/
│   └── sounds/
├── DESIGN.md               # This document
└── README.md
```

---

## 3. Game States & Flow

### 3.1 State Diagram

```
                    ┌─────────────┐
                    │    MENU     │
                    │ (Start Idle)│
                    └──────┬──────┘
                           │ Any button / key
                           ▼
                    ┌─────────────┐
          ┌─────────│   PLAYING   │─────────┐
          │         └──────┬──────┘         │
          │ Start          │                │ Pause
          │                │ Collision      │
          │                ▼                ▼
          │         ┌─────────────┐   ┌─────────────┐
          │         │  GAME_OVER  │   │   PAUSED    │
          │         └──────┬──────┘   └──────┬──────┘
          │                │                 │ Resume
          │                │ Restart         │ (Options)
          │                │ (any button)    │
          └────────────────┴─────────────────┘
```

### 3.2 State Descriptions

| State | Description | User Actions |
|-------|-------------|--------------|
| **MENU** | Title, instructions, "Press any button to start" | Any gamepad button or key → PLAYING |
| **PLAYING** | Active gameplay; starts with 3…2…1…Go! countdown (~3.5 s) | Collision → GAME_OVER; Options button → PAUSED |
| **GAME_OVER** | Score, high score, "Press any button to restart" | Any button → PLAYING (direct restart) |
| **PAUSED** | Overlay "Paused", dimmed game | Options button (toggle) → PLAYING |

---

## 4. Input System

### 4.1 DualSense Mapping (Gamepad API)

| Gamepad Index | DualSense Control | Usage |
|---------------|-------------------|-------|
| Axes 0 | Left stick X | Player horizontal movement |
| Axes 1 | Left stick Y | Player vertical movement (inverted: up = negative) |
| Axes 6 | L2 trigger | (Reserved / unused for v1) |
| Axes 7 | R2 trigger | (Reserved / unused for v1) |
| Button 0 | Cross (A) | Start game, restart |
| Button 1 | Circle (B) | — |
| Button 2 | Square (X) | — |
| Button 3 | Triangle (Y) | — |
| Button 9 | Options | Pause / resume (toggle) |

### 4.2 Input Normalization
- **Dead zone**: 0.15 — Ignore stick drift.
- **Output**: Normalized vector `(x, y)` with magnitude capped at 1.
- **Polling**: Read `navigator.getGamepads()` every frame; support gamepad index 0 as primary.

### 4.3 Keyboard Fallback (Optional)
- **WASD** or **Arrow keys** → Movement.
- **Enter** or **Space** → Start / restart.
- **Escape** or **P** → Pause.

---

## 5. Game World & Entities

### 5.1 Coordinate System
- Origin: top-left of canvas.
- X increases right; Y increases down.
- Game area: Full canvas; boundaries prevent player from leaving.

### 5.2 Canvas & Dimensions
- **Base resolution**: 800 × 600 (logical game units).
- **Scaling**: Canvas scales to fit viewport; aspect ratio preserved (letterboxing).
- **Retina / HiDPI**: `setPixelRatio(devicePixelRatio)` up to 3×; `getBoundingClientRect()` for display size; higher geometry detail (player 32×32, particles 12×12, boxes segmented); `powerPreference: 'high-performance'`.

### 5.3 Player

| Property | Value | Notes |
|----------|-------|-------|
| Shape | Circle | Simple collision |
| Radius | 20 px | Visible, readable |
| Position | `(x, y)` | Centered in circle |
| Speed | 300 px/s | Base movement speed |
| Color | e.g. `#4CAF50` | Distinct from obstacles |
| Spawn | Center of play area | On game start / restart |

**Movement**: Velocity = normalized stick input × speed × deltaTime. Position clamped to play area; padding = player radius (20 px) on all edges to prevent clipping.

### 5.4 Obstacles

| Property | Value | Notes |
|----------|-------|-------|
| Shape | Rectangle (AABB) | v1: AABB only; circle obstacles deferred to later |
| Sizes | Small, medium, large | e.g. 30×30, 50×50, 70×70 |
| Spawn | Random edge (top/right/bottom/left) | Outside visible area |
| Direction | Toward center or slight random offset | Create variety |
| Speed | Base + scaling with game time | Difficulty ramp |
| Colors | Multiple danger hues | Red, orange, pink, purple; random per obstacle |

**Spawn Logic**:
- Spawn point: Random edge (top/right/bottom/left), offset 1–2 obstacle widths outside visible play area.
- Spawn interval: Start ~1.5s; decrease over time (min ~0.5s).
- Per spawn: 1 obstacle; random type/size.
- Max on screen: 15–20 (tune for performance and feel).

### 5.5 Difficulty Scaling
- **Time-based**: Every 30s, increase spawn rate and obstacle speed.
- **Caps**: Spawn interval ≥ 0.5s; speed ≤ 400 px/s (adjustable).

### 5.6 Collectibles

| Property | Value | Notes |
|----------|-------|-------|
| Shape | Octahedron (diamond) | Distinct from player sphere and obstacle boxes |
| Radius | 18 px | For collision (circle approximation) |
| Spawn | Random position in play area | Padding 60 px from edges |
| Behavior | Static or floating | ~60% float in a small circle (radius 25 px) |
| Lifetime | 6–12 s | Disappear if not collected |
| Max on screen | 6 | Spawn interval ~1.2 s; first spawn at "Go!" |
| Points | 50, 75, or 100 | Random per spawn |
| Color by points | 50=gold, 75=cyan, 100=magenta | Visual cue for value |

**Spawn Logic**:
- First collectible spawns when countdown reaches "Go!".
- Subsequent spawns every ~1.2 s until max on screen (6).
- On expiry, mesh is removed from scene; on collection, play chime and add points.

---

## 6. Collision System

### 6.1 Detection Method
- **Player**: Circle, center `(px, py)`, radius `r`.
- **Obstacle**: Axis-Aligned Bounding Box (AABB) only in v1.
- **Collectible**: Circle approximation; radius 18 px.
- **Algorithms**: Circle–AABB (player vs obstacle); Circle–Circle (player vs collectible).

### 6.2 Circle–AABB (Player vs Rect Obstacle)
1. Find closest point on rectangle to circle center.
2. Distance from circle center to that point.
3. If distance ≤ player radius → collision.

### 6.3 Circle–Circle (Player vs Collectible)
1. Distance between circle centers.
2. If distance ≤ player radius + collectible radius → collected.
3. On collection: add points, remove collectible, play chime.

### 6.4 Response
- On obstacle collision: set state to `GAME_OVER`, stop spawning, show final score.

---

## 7. Scoring System

| Event | Points |
|-------|--------|
| Survival (per second) | 10 |
| Obstacle cleared (exited play area without hitting player) | 25 |
| Collectible (50 / 75 / 100) | 50, 75, or 100 |
| (Optional) Near-miss bonus | 0 (v1) |

**Obstacle cleared rule**: Awarded when an obstacle’s bounding box is fully outside the play area (any edge) without having collided with the player. Implement by checking obstacle bounds against canvas edges; when fully past, remove from active list and add +25 points.

**Displayed**: Current score, high score (persisted in `localStorage` under key `dodgeRunHighScore`).

---

## 8. Visual Design

### 8.1 Color Palette (Example)
- Background: Dark `#1a1a2e`
- Player: `#4CAF50`
- Obstacles: Multiple danger hues (red `#E53935`, orange `#FF5722`, pink `#E91E63`, purple `#9C27B0`, etc.); random per obstacle
- Collectibles: Color by points — 50 pts = gold `#FFD700`, 75 pts = cyan `#00BCD4`, 100 pts = magenta `#E91E63`
- UI text: `#EEEEEE`
- Accent: `#00D9FF`

### 8.2 Typography
- System font stack: `'Segoe UI', system-ui, sans-serif`
- Large title, readable score, clear "Press to start" text.

### 8.3 Effects
- 3D rendering (spheres, boxes) via Three.js.
- Particle burst on game over (implemented).
- Screen shake on hit (implemented).
- Near-miss glow (yellow pulse when obstacle within ~55 px; implemented).

---

## 9. Audio

- **BGM**: Low-key sine loop (110 Hz) during gameplay; starts after countdown.
- **SFX**: Hit (thud on collision), pass (tone on obstacle cleared), menu select (click on start/restart), near-miss (descending pitch 660→440 Hz, ~0.22 s) when obstacle within ~55 px; 0.4 s cooldown; collect (two-tone chime) on collectible pickup.
- **Implementation**: Web Audio API; procedural generation, no external files; init on first user interaction.

---

## 10. Performance Considerations

- **Frame rate target**: 60 FPS via `requestAnimationFrame`.
- **Delta time**: Use `performance.now()` for frame-independent movement.
- **Object pooling**: Reuse obstacle objects instead of frequent allocations.
- **Draw calls**: Batch draws where possible; limit fillStyle/strokeStyle changes.

---

## 11. Compatibility & Testing

### 11.1 Browsers
- Chrome/Edge 35+
- Firefox 29+
- Safari 10.1+

### 11.2 Controller
- Primary: PS5 DualSense (USB or Bluetooth).
- Fallback: Any controller supported by Gamepad API (Xbox, generic).

### 11.3 Responsiveness
- Game area scales; touch fallback (virtual stick) is out of scope for v1.

---

## 12. Implementation Phases

### Phase 1: Core Shell
- [x] HTML + canvas + CSS layout
- [x] Game loop with delta time
- [x] State machine (MENU, PLAYING, GAME_OVER)

### Phase 2: Controller & Player
- [x] Controller module (polling, dead zone, normalization)
- [x] Player entity (movement, bounds)
- [x] Render player

### Phase 3: Obstacles
- [x] Obstacle spawner (edge spawn, direction)
- [x] Obstacle movement and rendering
- [x] Difficulty scaling

### Phase 4: Collision & Game Over
- [x] Circle–AABB collision
- [x] Game over flow
- [x] Restart flow

### Phase 5: Polish
- [x] Score and high score
- [x] UI (HUD, menus)
- [x] Pause
- [x] Keyboard fallback (optional)

### Phase 6: Polish & Feedback (v1.1)
- [x] **Web Audio** — Hit (low thud on collision), pass (tone on obstacle cleared), menu select (soft click on start/restart), BGM (low-key 110 Hz sine loop; starts after "Go!"), near-miss (descending tone ~0.22 s when obstacle within ~55 px; 0.4 s cooldown). Procedural generation via Web Audio API; no external files.
- [x] **Particle burst** — Brief explosion (~24 particles) emanating from player on game over; red particles with velocity and fade; ~0.5 s duration before game over screen.
- [x] **Screen shake** — Camera offset on hit; shake decays over ~0.5 s.
- [x] **Near-miss glow** — Yellow emissive on player when obstacle within ~55 px (no collision); intensity fades when obstacle moves away; glow resets on collision.
- [x] **Countdown** — "3… 2… 1… Go!" overlay before obstacles spawn; ~3.5 s total; beeps for 3/2/1, fanfare for Go!; player can move during countdown; obstacles spawn only after "Go!".
- [x] **3D rendering** — Three.js; player sphere, obstacle boxes, particle spheres; top-down perspective.
- [x] **Collision behavior** — Player freezes at collision point; no movement during game-over animation.
- [x] **Retina / HiDPI** — `setPixelRatio` up to 3×; `getBoundingClientRect()` for display size; higher geometry detail (player 32×32, particles 12×12); `powerPreference: 'high-performance'`.

### Phase 7: Collectibles & Color Variety
- [x] **Collectibles** — Diamond-shaped (octahedron) objects; 50/75/100 pts; static or floating; 6–12 s lifetime; max 6 on screen; spawn ~1.2 s; first spawn at "Go!"; collect chime.
- [x] **Collectible collision** — Circle–circle detection; removal and scoring on collection.
- [x] **Multiple obstacle colors** — Red, orange, pink, purple palette; random per obstacle.
- [x] **Collectible colors by points** — Gold (50), cyan (75), magenta (100).

### Phase 8: Optional
- [ ] Multiple obstacle shapes (circles)

---

## 13. Open Questions / TBD

- Exact obstacle shapes (all rects vs mix of rects and circles).
- Whether to add power-ups or shields in a later version.
- Mobile support (touch controls) for future iterations.

---

## 14. Design Review

*Review comments for implementation reference.*

### Strengths
- **Clear scope** — Core loop, pillars, and "no framework" are stated up front.
- **Concrete tech choices** — Canvas 2D, vanilla JS, Gamepad API, and file layout are specified and justified.
- **State machine** — MENU → PLAYING ↔ PAUSED, PLAYING → GAME_OVER, and transitions are defined with a diagram and table.
- **Input spec** — DualSense axes/buttons, dead zone (0.15), normalization, and keyboard fallback are documented.
- **Game feel** — Player size/speed, obstacle sizes, spawn rules, difficulty scaling, and caps are given in numbers.
- **Collision** — Circle–AABB and response (game over) are described.
- **Phased plan** — Implementation phases with checkboxes make the doc directly usable for development.

### Gaps & Ambiguities (resolved)
1. **GAME_OVER → PLAYING** ✓ — Resolved: restart now goes GAME_OVER → PLAYING directly (arcade style).
2. **"Obstacle passed" scoring** ✓ — Resolved: §7 now defines "obstacle cleared" as bounds fully outside play area, with implementation note.
3. **Pause trigger** ✓ — Resolved: §4.1 and §3.2 now specify Options as toggle for pause/resume.
4. **Circle obstacles** ✓ — Resolved: §5.4 and §6 now state v1 is AABB-only; circle obstacles deferred.

### Minor Suggestions (resolved)
- **High score key** ✓ — Resolved: §7 now specifies `dodgeRunHighScore`.
- **Player bounds** ✓ — Resolved: §5.3 now specifies padding = player radius (20 px).
- **Doc date** ✓ — Resolved: footer updated to 2026-02-12.

### Consistency Check
- State names and transitions in §3 match §2.2 and the phase checklist.
- Player radius 20, speed 300, obstacle sizes and speeds fit the described scaling.
- 800×600, 60 FPS, delta time, and object pooling align with the performance section.

---

## 15. Web APIs Usage

This section documents how the game uses browser and platform APIs, with code examples and references.

### 15.1 Gamepad API

**Purpose**: Read controller input (axes, buttons) and trigger haptic feedback.

**Polling axes and buttons** (controller.js):

```javascript
const gp = navigator.getGamepads?.();
const pad = gp?.[0];           // Primary controller (index 0)
if (pad) {
  let x = pad.axes[0] ?? 0;    // Left stick X (-1 to 1)
  let y = pad.axes[1] ?? 0;    // Left stick Y (-1 to 1)
  if (pad.buttons[9]?.pressed) { /* Options = pause */ }
}
```

**Haptic feedback** (controller.js) — `vibrationActuator` or `hapticActuators`:

```javascript
const actuator = pad?.vibrationActuator ?? pad?.hapticActuators?.[0];
if (actuator?.pulse) {
  actuator.pulse(intensity, duration);  // intensity 0–1, duration in ms
}
```

**Events**: `gamepadconnected`, `gamepaddisconnected` for presence; polling via `getGamepads()` each frame.

**Browser support**: Gamepad API widely supported; haptic (`vibrationActuator` / `hapticActuators`) in Chrome, Edge, Safari 16.4+; not in Firefox.

---

### 15.2 Web Audio API

**Purpose**: Procedural sound effects and BGM with no audio files.

**Context creation** (audio.js):

```javascript
ctx = new (window.AudioContext || window.webkitAudioContext)();
```

**Tone generation** — oscillator + gain node:

```javascript
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain);
gain.connect(ctx.destination);
osc.frequency.value = 523.25;   // Hz
osc.type = 'sine';
gain.gain.setValueAtTime(0.3, ctx.currentTime);
gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
osc.start(ctx.currentTime);
osc.stop(ctx.currentTime + 0.12);
```

**BGM** — low-frequency sine with biquad filter for warmth.

**User activation**: `initAudio()` and `resumeAudio()` called on first user interaction (required for autoplay policies).

---

### 15.3 DOM / Document APIs

**Purpose**: UI updates, layout, and canvas sizing.

**Element lookup and manipulation** (ui.js):

```javascript
const el = document.getElementById('score-display');
if (el) el.textContent = `Score: ${score}`;
el.classList.add('hidden');
el.classList.remove('hidden');
```

**Canvas dimensions** (main.js, renderer3d.js):

```javascript
const rect = canvas.getBoundingClientRect();
displayWidth = Math.max(rect.width || WIDTH, 1);
```

**Events**: `keydown`, `keyup`, `resize`, `click` for input and layout.

---

### 15.4 Web Storage (localStorage)

**Purpose**: Persist high score across sessions.

**Usage** (ui.js):

```javascript
const HIGH_SCORE_KEY = 'dodgeRunHighScore';
localStorage.getItem(HIGH_SCORE_KEY) || '0';
localStorage.setItem(HIGH_SCORE_KEY, String(score));
```

---

### 15.5 requestAnimationFrame & performance

**Purpose**: Game loop and frame-independent timing.

**Loop** (main.js):

```javascript
function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;
  // ... update, render ...
  rafId = requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
```

**Delta time**: `performance.now()` or `timestamp` from `requestAnimationFrame` used for consistent movement regardless of frame rate.

---

### 15.6 Three.js / WebGL

**Purpose**: 3D rendering (player, obstacles, collectibles, particles).

**Scene setup** (renderer3d.js):

```javascript
import * as THREE from 'three';
scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(50, width/height, 0.1, 100);
renderer = new WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 3));
```

**Geometry and materials**:

```javascript
const mesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.2, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0x5EFF5E, emissive: 0x22DD22 })
);
scene.add(mesh);
```

**CDN**: Three.js loaded via import map from jsdelivr.

---

*Document Version: 1.5*  
*Last Updated: 2026-02-12*
