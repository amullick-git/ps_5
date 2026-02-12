# Dodge Run

A simple browser game controlled by the PS5 DualSense controller. Move with the left stick, avoid red obstacles, and survive as long as you can.

## Requirements

- Modern browser (Chrome, Firefox, Edge, or Safari)
- PS5 DualSense controller (USB or Bluetooth) — or use keyboard (WASD/arrows)

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

## Haptic Feedback

The game triggers controller vibration on collect, collision, near-miss, and level-up. **Note:** Haptic feedback works on Windows but **does not work on macOS** in any browser — this is a platform limitation, not a bug.

## Controls

| Input | Action |
|-------|--------|
| Left stick | Move |
| Options button | Pause / Resume |
| Any button | Start / Restart |
| WASD or Arrow keys | Move (keyboard) |
| Enter / Space | Start / Restart |
| Escape / P | Pause |

## Design

See [DESIGN.md](DESIGN.md) for the full design document.
