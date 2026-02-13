/**
 * Power-ups — Shield, Slow-mo, Magnet, Extra life, Clear.
 * Spawn less often than collectibles; distinct colors and effects.
 */

const RADIUS = 20;
const SPAWN_INTERVAL = 14;
const LIFETIME = 4;

export const POWERUP_TYPES = {
  SHIELD: { id: 'shield', color: 0x2196F3, label: 'Shield' },
  SLOWMO: { id: 'slowmo', color: 0x9C27B0, label: 'Slow-mo' },
  MAGNET: { id: 'magnet', color: 0x00BCD4, label: 'Magnet' },
  LIFE: { id: 'life', color: 0xE91E63, label: '+1 Life' },
  CLEAR: { id: 'clear', color: 0xFFEB3B, label: 'Clear' },
};

const COMMON_TYPES = [POWERUP_TYPES.SHIELD, POWERUP_TYPES.SLOWMO, POWERUP_TYPES.MAGNET, POWERUP_TYPES.CLEAR];
const LIFE_CHANCE = 0.05; // 5% chance for rare life power-up
const LIFE_LIFETIME = 3; // Life power-up disappears after 3 seconds

export function createPowerupSpawner(width, height) {
  let spawnTimer = SPAWN_INTERVAL * 0.7; // First spawn after ~10s
  const powerups = [];

  function randomSafePosition() {
    const pad = 70;
    const w = Math.max(width - pad * 2, 120);
    const h = Math.max(height - pad * 2, 120);
    return {
      x: pad + Math.random() * w,
      y: pad + Math.random() * h,
    };
  }

  function spawn() {
    if (powerups.length >= 1) return;
    const pos = randomSafePosition();
    const type = Math.random() < LIFE_CHANCE
      ? POWERUP_TYPES.LIFE
      : COMMON_TYPES[Math.floor(Math.random() * COMMON_TYPES.length)];
    const lifetime = type === POWERUP_TYPES.LIFE ? LIFE_LIFETIME : LIFETIME;
    powerups.push({
      x: pos.x,
      y: pos.y,
      radius: RADIUS,
      type: type.id,
      color: type.color,
      life: lifetime,
      maxLife: lifetime,
      floats: true,
      floatAngle: Math.random() * Math.PI * 2,
      floatCenterX: pos.x,
      floatCenterY: pos.y,
    });
  }

  return {
    powerups,
    update(dt, onExpire, level = 1) {
      spawnTimer += dt;
      if (spawnTimer >= SPAWN_INTERVAL) {
        spawnTimer = 0;
        spawn();
      }

      for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        p.life -= dt;
        p.floatAngle += dt * 2;
        p.x = p.floatCenterX + Math.cos(p.floatAngle) * 30;
        p.y = p.floatCenterY + Math.sin(p.floatAngle) * 30;

        if (p.life <= 0) {
          if (onExpire) onExpire(p);
          powerups.splice(i, 1);
        }
      }
    },
    reset(onRemove) {
      if (onRemove) powerups.forEach(onRemove);
      powerups.length = 0;
      spawnTimer = SPAWN_INTERVAL * 0.7;
    },
  };
}

export { RADIUS as POWERUP_RADIUS };
