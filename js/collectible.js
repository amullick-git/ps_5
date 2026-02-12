/**
 * Collectibles — objects of interest for extra points.
 * Static or floating; disappear after lifetime.
 */

const RADIUS = 18;
const SPAWN_INTERVAL = 1.2;
const MIN_LIFETIME = 6;
const MAX_LIFETIME = 12;
const MAX_ON_SCREEN = 6;
const POINTS = [50, 75, 100];

const FLOAT_SPEED = 40;
const FLOAT_RADIUS = 25;

export function createCollectibleSpawner(width, height) {
  let spawnTimer = 0;
  const collectibles = [];

  function randomSafePosition() {
    const pad = 60;
    return {
      x: pad + Math.random() * (width - pad * 2),
      y: pad + Math.random() * (height - pad * 2),
    };
  }

  function spawn() {
    if (collectibles.length >= MAX_ON_SCREEN) return;

    const pos = randomSafePosition();
    const points = POINTS[Math.floor(Math.random() * POINTS.length)];
    const lifetime = MIN_LIFETIME + Math.random() * (MAX_LIFETIME - MIN_LIFETIME);
    const floats = Math.random() > 0.4;
    const angle = Math.random() * Math.PI * 2;

    collectibles.push({
      x: pos.x,
      y: pos.y,
      radius: RADIUS,
      points,
      life: lifetime,
      maxLife: lifetime,
      floats,
      floatAngle: angle,
      floatCenterX: pos.x,
      floatCenterY: pos.y,
    });
  }

  return {
    collectibles,
    primeFirstSpawn() {
      spawnTimer = SPAWN_INTERVAL;
    },
    update(dt, onExpire) {
      spawnTimer += dt;
      if (spawnTimer >= SPAWN_INTERVAL) {
        spawnTimer = 0;
        spawn();
      }

      for (let i = collectibles.length - 1; i >= 0; i--) {
        const c = collectibles[i];
        c.life -= dt;

        if (c.floats) {
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
