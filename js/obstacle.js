/**
 * Obstacle spawner — AABB rectangles, spawn from edges, move toward center.
 * Sizes: 30×30, 50×50, 70×70. Spawn interval 1.5s → 0.5s. Max 18 on screen.
 */

const SIZES = [
  { w: 30, h: 30 },
  { w: 50, h: 50 },
  { w: 70, h: 70 },
];
const COLOR = '#E53935';
const BASE_SPEED = 150;
const MAX_SPEED = 400;
const SPAWN_INTERVAL_START = 0.9;
const SPAWN_INTERVAL_MIN = 0.5;
const MAX_OBSTACLES = 18;
const DIFFICULTY_INTERVAL = 30;


export function createObstacleSpawner(width, height) {
  let spawnTimer = 0;
  let lastSpawnInterval = SPAWN_INTERVAL_START;
  let gameTime = 0;
  const obstacles = [];

  function getSpawnInterval() {
    const level = Math.floor(gameTime / DIFFICULTY_INTERVAL);
    const t = Math.min(level * 0.1, 1);
    return SPAWN_INTERVAL_START - (SPAWN_INTERVAL_START - SPAWN_INTERVAL_MIN) * t;
  }

  function getSpeed() {
    const level = Math.floor(gameTime / DIFFICULTY_INTERVAL);
    const t = Math.min(level * 0.15, 1);
    return BASE_SPEED + (MAX_SPEED - BASE_SPEED) * t;
  }

  function spawn() {
    if (obstacles.length >= MAX_OBSTACLES) return;

    const size = SIZES[Math.floor(Math.random() * SIZES.length)];
    const speed = getSpeed();
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

    obstacles.push({ x, y, w: size.w, h: size.h, vx, vy });
  }

  return {
    obstacles,
    update(dt) {
      gameTime += dt;
      lastSpawnInterval = getSpawnInterval();
      spawnTimer += dt;

      if (spawnTimer >= lastSpawnInterval) {
        spawnTimer = 0;
        spawn();
      }

      for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];
        o.x += o.vx * dt;
        o.y += o.vy * dt;
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
    },
    render(ctx) {
      ctx.fillStyle = COLOR;
      for (const o of obstacles) {
        ctx.fillRect(o.x, o.y, o.w, o.h);
      }
    },
  };
}
