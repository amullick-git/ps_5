/**
 * Obstacle spawner — AABB rectangles, spawn from edges, move toward center.
 * Sizes: 30×30, 50×50, 70×70. Spawn interval scales with level. Max obstacles 6 → 18 across levels.
 */

const SIZES = [
  { w: 30, h: 30 },
  { w: 50, h: 50 },
  { w: 70, h: 70 },
];
const SUDDEN_HARD_SIZE = { w: 80, h: 80 };
const SUDDEN_HARD_CHANCE = 0.06; // 6% of spawns
const SUDDEN_HARD_BOUNCES = 2;
const COLORS = [
  0xE53935, 0xFF5722, 0xE91E63, 0x9C27B0, 0x00BCD4, 0xFF9800,
  0x7C4DFF, 0xFF4081, 0x00E676, 0xFFAB00, 0x5E35B1, 0x18FFFF,
];
const BASE_SPEED = 150;
const MAX_SPEED = 400;
const SPAWN_INTERVAL_START = 1.4;
const SPAWN_INTERVAL_MIN = 0.8;
const MIN_OBSTACLES = 6;   // Level 1 cap
const MAX_OBSTACLES = 18;  // Cap at high levels


export function createObstacleSpawner(width, height) {
  let spawnTimer = 0;
  let lastSpawnInterval = SPAWN_INTERVAL_START;
  let gameTime = 0;
  let onSpawnCallback = null;
  const obstacles = [];

  function getSpawnInterval(currentLevel = 1) {
    const l = Math.max(0, currentLevel - 1);
    const t = Math.min(l * 0.06, 1); // Slower ramp: ~17 levels to max
    return SPAWN_INTERVAL_START - (SPAWN_INTERVAL_START - SPAWN_INTERVAL_MIN) * t;
  }

  let currentSpeedLevel = 1;

  function getSpeed(lvl = 1) {
    const l = Math.max(0, (lvl ?? 1) - 1);
    const t = Math.min(l * 0.05, 1); // Slower ramp: ~21 levels to max
    return BASE_SPEED + (MAX_SPEED - BASE_SPEED) * t;
  }

  function getMaxObstacles(currentLevel = 1) {
    const l = Math.max(0, currentLevel - 1);
    const t = Math.min(l * 0.07, 1); // Ramp over ~15 levels
    return Math.round(MIN_OBSTACLES + (MAX_OBSTACLES - MIN_OBSTACLES) * t);
  }

  let currentLevel = 1;
  let currentCountLevel = 1;
  let currentSpawnLevel = 1;
  let suddenHardEnabled = true;

  function spawn() {
    const cap = getMaxObstacles(currentCountLevel);
    if (obstacles.length >= cap) return;

    const isSuddenHard = suddenHardEnabled && Math.random() < SUDDEN_HARD_CHANCE;
    const size = isSuddenHard ? SUDDEN_HARD_SIZE : SIZES[Math.floor(Math.random() * SIZES.length)];
    const speed = isSuddenHard ? getSpeed(currentSpeedLevel) * 2 : getSpeed(currentSpeedLevel);
    const centerX = width / 2;
    const centerY = height / 2;

    const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
    // Sudden: spawn much closer so it appears with little warning
    const offset = isSuddenHard ? Math.max(size.w, size.h) * 0.3 : (1 + Math.random()) * Math.max(size.w, size.h);

    let x, y, vx, vy;

    if (edge === 0) {
      x = Math.random() * width;
      y = -size.h - offset;
      const dx = centerX - x + (Math.random() - 0.5) * 150;
      const dy = centerY - y;
      const mag = Math.sqrt(dx * dx + dy * dy) || 1;
      vx = (dx / mag) * speed;
      vy = (dy / mag) * speed;
    } else if (edge === 1) {
      x = width + offset;
      y = Math.random() * height;
      const dx = centerX - x;
      const dy = centerY - y + (Math.random() - 0.5) * 150;
      const mag = Math.sqrt(dx * dx + dy * dy) || 1;
      vx = (dx / mag) * speed;
      vy = (dy / mag) * speed;
    } else if (edge === 2) {
      x = Math.random() * width;
      y = height + offset;
      const dx = centerX - x + (Math.random() - 0.5) * 150;
      const dy = centerY - y;
      const mag = Math.sqrt(dx * dx + dy * dy) || 1;
      vx = (dx / mag) * speed;
      vy = (dy / mag) * speed;
    } else {
      x = -size.w - offset;
      y = Math.random() * height;
      const dx = centerX - x;
      const dy = centerY - y + (Math.random() - 0.5) * 150;
      const mag = Math.sqrt(dx * dx + dy * dy) || 1;
      vx = (dx / mag) * speed;
      vy = (dy / mag) * speed;
    }

    const color = isSuddenHard ? 0x8B0000 : COLORS[Math.floor(Math.random() * COLORS.length)]; // Dark red for sudden hard
    const o = { x, y, w: size.w, h: size.h, vx, vy, color, suddenHard: isSuddenHard,
      bouncesRemaining: isSuddenHard ? SUDDEN_HARD_BOUNCES : 0,
    };
    obstacles.push(o);
    if (onSpawnCallback) onSpawnCallback(o);
  }

  return {
    obstacles,
    setOnSpawn(fn) { onSpawnCallback = fn; },
    getGameTime: () => gameTime,
    update(dt, level = 1, speedMultiplier = 1, speedLevel = undefined, countLevel = undefined, spawnLevel = undefined, suddenHard = true) {
      gameTime += dt;
      currentLevel = level;
      currentSpeedLevel = speedLevel ?? level;
      currentCountLevel = countLevel ?? level;
      currentSpawnLevel = spawnLevel ?? level;
      suddenHardEnabled = suddenHard;
      lastSpawnInterval = getSpawnInterval(currentSpawnLevel);
      spawnTimer += dt;

      if (spawnTimer >= lastSpawnInterval) {
        spawnTimer = 0;
        spawn();
      }

      for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];
        o.x += o.vx * dt * speedMultiplier;
        o.y += o.vy * dt * speedMultiplier;

        // Sudden hard: bounce off walls when moving INTO them from inside (not when entering)
        if (o.suddenHard && o.bouncesRemaining > 0) {
          if (o.x < 0 && o.vx < 0) {
            o.vx = -o.vx;
            o.x = 0;
            o.bouncesRemaining--;
          } else if (o.x + o.w > width && o.vx > 0) {
            o.vx = -o.vx;
            o.x = width - o.w;
            o.bouncesRemaining--;
          }
          if (o.y < 0 && o.vy < 0) {
            o.vy = -o.vy;
            o.y = 0;
            o.bouncesRemaining--;
          } else if (o.y + o.h > height && o.vy > 0) {
            o.vy = -o.vy;
            o.y = height - o.h;
            o.bouncesRemaining--;
          }
        }
      }
    },
    removeOutside(width, height, onRemove) {
      // Only remove when obstacle has exited in the direction it's moving
      let cleared = 0;
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];
        const exitedRight = o.vx > 0 && o.x > width;
        const exitedLeft = o.vx < 0 && o.x + o.w < 0;
        const exitedDown = o.vy > 0 && o.y > height;
        const exitedUp = o.vy < 0 && o.y + o.h < 0;
        if (exitedRight || exitedLeft || exitedDown || exitedUp) {
          if (onRemove) onRemove(o);
          obstacles.splice(i, 1);
          cleared++;
        }
      }
      return cleared;
    },
    reset(onRemove) {
      if (onRemove) obstacles.forEach(onRemove);
      obstacles.length = 0;
      spawnTimer = 0;
      gameTime = 0;
      currentLevel = 1;
    },
    render(ctx) {
      for (const o of obstacles) {
        ctx.fillStyle = o.color ? '#' + o.color.toString(16).padStart(6, '0') : '#E53935';
        ctx.fillRect(o.x, o.y, o.w, o.h);
      }
    },
  };
}
