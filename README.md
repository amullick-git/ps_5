# Dodge Run

A browser game controlled by the PS5 DualSense controller, keyboard, or **touch** (mobile). Move with the left stick, virtual joystick, or WASD, avoid obstacles, grab collectibles and power-ups, and survive as long as you can. High score and best level are saved.

## Features

- **Lives** — 3 lives; lose one on hit, 2s invincibility after each hit
- **Collectibles** — Rings for 50/75/100 points; some orbit, some stay static
- **Power-ups** — Shield, Slow-mo, Magnet, +1 Life (rare), Clear (remove all obstacles)
- **Levels** — Every 20 seconds; difficulty scales with level
- **Boss wave** — Every 3rd level (3, 6, 9…): red pulsing screen, obstacles 2× faster, camera shake for 6 seconds
- **Collectible in front** — 500pt green collectible spawns in front of obstacles (risky grab)
- **Near-miss combo** — 3 near-misses within 6 seconds = +500 bonus
- **Sudden hard obstacles** — Large bouncing obstacles that ricochet off walls

Game over returns you to the Dodge Run menu; high score and best level are shown on the title screen.

## Requirements

- Modern browser (Chrome, Firefox, Edge, or Safari)
- **Desktop:** PS5 DualSense controller (USB or Bluetooth) — or keyboard (WASD/arrows)
- **Mobile:** Touch screen — virtual joystick and pause button appear automatically

## Run Locally

From the project folder:

```bash
# Python 3
python3 -m http.server 8000

# Or Node.js
npx serve .
```

Then open **http://localhost:8000** in your browser.

## GitHub Pages

To host the game on GitHub Pages:

1. Go to your repo on GitHub → **Settings** → **Pages**
2. Under "Build and deployment", select **Deploy from a branch**
3. Branch: **main**, Folder: **/ (root)**
4. Click **Save**

The site will be at `https://<username>.github.io/ps_5/` (or your repo name).

> **Note:** The Gamepad API requires user interaction before it activates. Click or press any key on the page first, then use your controller.

## Power-ups

| Power-up | Effect |
|----------|--------|
| **Shield** (blue) | Absorb one hit without losing a life |
| **Slow-mo** (purple) | Obstacles move at half speed for 4s |
| **Magnet** (cyan) | Collectibles drift toward you for 5s |
| **+1 Life** (pink) | Add one life — rare spawn (5%) |
| **Clear** (yellow) | Remove all obstacles, score points for each |

Power-ups spawn about every 14 seconds; max 1 on screen. Common power-ups last 4s, Life lasts 3s.

## Level-based Unlocks

Features unlock as you reach higher levels. Unlock levels are configurable in `js/features.js`.

| Level | Features |
|-------|----------|
| 1 | Obstacle speed/count/spawn ramps |
| 2 | Collectibles (rings) |
| 3 | Power-ups, Boss wave, Collectible float (orbiting rings) |
| 4 | 500pt bonus collectible (random), Near-miss combo |
| 5 | 500pt collectible in front of obstacles |
| 6 | Sudden hard obstacles (large bouncing boxes) |

## Haptic Feedback

The game triggers controller vibration on collect, collision, near-miss, level-up, and power-up pickup. **Note:** Haptic feedback works on Windows but **does not work on macOS** in any browser — this is a platform limitation, not a bug.

## Controls

| Input | Action |
|-------|--------|
| Left stick | Move |
| Options button | Pause / Resume |
| Any button | Start / Restart |
| WASD or Arrow keys | Move (keyboard) |
| Enter / Space | Start / Restart |
| Escape / P | Pause |
| **Mobile:** Virtual joystick (bottom-left) | Move |
| **Mobile:** Pause button (top-right) | Pause / Resume |
| **Mobile:** Tap screen | Start / Restart |

## Design

See [DESIGN.md](DESIGN.md) for the full design document.
