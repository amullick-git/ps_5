/**
 * Collectibles — objects of interest for extra points.
 * Static or floating; disappear after lifetime.
 */

const RADIUS = 18;
const SPAWN_INTERVAL_BASE = 2.5;
const SPAWN_INTERVAL_MIN = 1.5;
const MIN_LIFETIME = 6;
const MAX_LIFETIME = 12;
const MAX_ON_SCREEN = 1;
const POINTS = [50, 75, 100];
const BONUS_POINTS = 500;
const BONUS_CHANCE = 0.04; // 4% chance for 500-point bonus
const BONUS_LIFETIME = 2;
const OBSTACLE_FRONT_POINTS = 500;
const OBSTACLE_FRONT_OFFSET = 85; // px in front of obstacle (in velocity direction)
const OBSTACLE_FRONT_CHANCE = 0.18; // 18% chance per obstacle spawn
const OBSTACLE_FRONT_LIFETIME = 10;
// Color by points: 50=gold, 75=cyan, 100=magenta, 500=green (bonus, blinks)
const COLOR_BY_POINTS = { 50: 0xFFD700, 75: 0x00BCD4, 100: 0xE91E63, 500: 0x00FF88 };

const FLOAT_SPEED = 40;
const FLOAT_RADIUS = 25;

export function createCollectibleSpawner(width, height) {
  let spawnTimer = 0;
  let collectibleBonusEnabled = true;
  let collectibleFloatEnabled = true;
  const collectibles = [];

  function getSpawnInterval(currentLevel) {
    const t = Math.min((currentLevel - 1) * 0.04, 1); // Slower ramp
    return SPAWN_INTERVAL_BASE - (SPAWN_INTERVAL_BASE - SPAWN_INTERVAL_MIN) * t;
  }

  function randomSafePosition() {
    const pad = 60;
    const w = Math.max(width - pad * 2, 100);
    const h = Math.max(height - pad * 2, 100);
    return {
      x: pad + Math.random() * w,
      y: pad + Math.random() * h,
    };
  }

  function spawn() {
    if (collectibles.length >= MAX_ON_SCREEN) return;

    const pos = randomSafePosition();
    const isBonus = collectibleBonusEnabled && Math.random() < BONUS_CHANCE;
    const points = isBonus ? BONUS_POINTS : POINTS[Math.floor(Math.random() * POINTS.length)];
    const lifetime = isBonus ? BONUS_LIFETIME : MIN_LIFETIME + Math.random() * (MAX_LIFETIME - MIN_LIFETIME);
    const floats = collectibleFloatEnabled && Math.random() > 0.4;
    const angle = Math.random() * Math.PI * 2;

    const color = COLOR_BY_POINTS[points] ?? 0xFFD700;
    collectibles.push({
      x: pos.x,
      y: pos.y,
      radius: RADIUS,
      points,
      color,
      life: lifetime,
      maxLife: lifetime,
      floats,
      floatAngle: angle,
      floatCenterX: pos.x,
      floatCenterY: pos.y,
      blinks: isBonus,
    });
  }

  function spawnInFrontOfObstacle(obstacle) {
    const cx = obstacle.x + obstacle.w / 2;
    const cy = obstacle.y + obstacle.h / 2;
    const mag = Math.sqrt(obstacle.vx * obstacle.vx + obstacle.vy * obstacle.vy) || 1;
    const nx = obstacle.vx / mag;
    const ny = obstacle.vy / mag;
    // Ensure offset clears obstacle bounds + collectible radius
    const minOffset = Math.max(obstacle.w, obstacle.h) / 2 + RADIUS + 15;
    const offset = Math.max(OBSTACLE_FRONT_OFFSET, minOffset);
    const color = COLOR_BY_POINTS[OBSTACLE_FRONT_POINTS] ?? 0x00FF88;
    collectibles.push({
      x: cx + nx * offset,
      y: cy + ny * offset,
      radius: RADIUS,
      points: OBSTACLE_FRONT_POINTS,
      color,
      life: OBSTACLE_FRONT_LIFETIME,
      maxLife: OBSTACLE_FRONT_LIFETIME,
      floats: false,
      vx: obstacle.vx,
      vy: obstacle.vy,
      blinks: true,
    });
  }

  return {
    collectibles,
    primeFirstSpawn() {
      spawnTimer = getSpawnInterval(1);
      spawn(); // Spawn immediately on "Go!"
    },
    spawnInFrontOfObstacle,
    update(dt, onExpire, level = 1, magnetTarget = null, speedMultiplier = 1, collectiblesEnabled = true, bonusEnabled = true, floatEnabled = true) {
      collectibleBonusEnabled = bonusEnabled;
      collectibleFloatEnabled = floatEnabled;
      spawnTimer += dt;
      if (collectiblesEnabled) {
        const interval = getSpawnInterval(level);
        if (spawnTimer >= interval) {
          spawnTimer = 0;
          spawn();
        }
      }

      const MAGNET_SPEED = 180;
      for (let i = collectibles.length - 1; i >= 0; i--) {
        const c = collectibles[i];
        c.life -= dt;

        if (magnetTarget) {
          const dx = magnetTarget.x - c.x;
          const dy = magnetTarget.y - c.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const pull = Math.min(1, 80 / dist);
          c.x += (dx / dist) * MAGNET_SPEED * dt * pull;
          c.y += (dy / dist) * MAGNET_SPEED * dt * pull;
          c.floatCenterX = c.x;
          c.floatCenterY = c.y;
        } else if (c.vx !== undefined && c.vy !== undefined) {
          c.x += c.vx * dt * speedMultiplier;
          c.y += c.vy * dt * speedMultiplier;
          c.floatCenterX = c.x;
          c.floatCenterY = c.y;
          if (c.x < -RADIUS * 2 || c.x > width + RADIUS * 2 || c.y < -RADIUS * 2 || c.y > height + RADIUS * 2) {
            if (onExpire) onExpire(c);
            collectibles.splice(i, 1);
          }
        } else if (c.floats) {
          c.floatAngle += dt * 2;
          c.x = c.floatCenterX + Math.cos(c.floatAngle) * FLOAT_RADIUS;
          c.y = c.floatCenterY + Math.sin(c.floatAngle) * FLOAT_RADIUS;
        }

        if (c.life <= 0) {
          if (onExpire) onExpire(c);
          collectibles.splice(i, 1);
        }
      }
    },
    reset(onRemove) {
      if (onRemove) collectibles.forEach(onRemove);
      collectibles.length = 0;
      spawnTimer = 0;
    },
  };
}

export { RADIUS as COLLECTIBLE_RADIUS };
