/**
 * Obstacle spawner — AABB rectangles, spawn from edges, move toward center.
 * Sizes: 30×30, 50×50, 70×70. Spawn interval scales with level. Max obstacles 6 → 18 across levels.
 */

const SIZES = [
  { w: 30, h: 30 },
  { w: 50, h: 50 },
  { w: 70, h: 70 },
];
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
  const obstacles = [];

  function getSpawnInterval(currentLevel = 1) {
    const l = Math.max(0, currentLevel - 1);
    const t = Math.min(l * 0.06, 1); // Slower ramp: ~17 levels to max
    return SPAWN_INTERVAL_START - (SPAWN_INTERVAL_START - SPAWN_INTERVAL_MIN) * t;
  }

  function getSpeed(currentLevel = 1) {
    const l = Math.max(0, currentLevel - 1);
    const t = Math.min(l * 0.05, 1); // Slower ramp: ~21 levels to max
    return BASE_SPEED + (MAX_SPEED - BASE_SPEED) * t;
  }

  function getMaxObstacles(currentLevel = 1) {
    const l = Math.max(0, currentLevel - 1);
    const t = Math.min(l * 0.07, 1); // Ramp over ~15 levels
    return Math.round(MIN_OBSTACLES + (MAX_OBSTACLES - MIN_OBSTACLES) * t);
  }

  let currentLevel = 1;

  function spawn() {
    const cap = getMaxObstacles(currentLevel);
    if (obstacles.length >= cap) return;

    const size = SIZES[Math.floor(Math.random() * SIZES.length)];
    const speed = getSpeed(currentLevel);
    const centerX = width / 2;
    const centerY = height / 2;

    const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
    const offset = (1 + Math.random()) * Math.max(size.w, size.h);

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

    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    obstacles.push({ x, y, w: size.w, h: size.h, vx, vy, color });
  }

  return {
    obstacles,
    getGameTime: () => gameTime,
    update(dt, level = 1, speedMultiplier = 1) {
      gameTime += dt;
      currentLevel = level;
      lastSpawnInterval = getSpawnInterval(level);
      spawnTimer += dt;

      if (spawnTimer >= lastSpawnInterval) {
        spawnTimer = 0;
        spawn();
      }

      for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];
        o.x += o.vx * dt * speedMultiplier;
        o.y += o.vy * dt * speedMultiplier;
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
