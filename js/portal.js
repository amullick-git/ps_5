/**
 * Bonus portals — enter for 15s collectibles-only bonus room.
 * Spawn occasionally; one on screen at a time; disappear after lifetime if not entered.
 */

const RADIUS = 14;
const SPAWN_INTERVAL = 100;
const LIFETIME = 3;
const COLOR = 0x9C27B0;

export function createPortalSpawner(width, height) {
  let spawnTimer = SPAWN_INTERVAL * 0.6;
  const portals = [];

  function randomSafePosition() {
    const pad = 80;
    const w = Math.max(width - pad * 2, 120);
    const h = Math.max(height - pad * 2, 120);
    return {
      x: pad + Math.random() * w,
      y: pad + Math.random() * h,
    };
  }

  function spawn() {
    if (portals.length >= 1) return;
    const pos = randomSafePosition();
    portals.push({
      x: pos.x,
      y: pos.y,
      radius: RADIUS,
      color: COLOR,
      life: LIFETIME,
      maxLife: LIFETIME,
    });
  }

  return {
    portals,
    update(dt, onExpire, onEnter, enabled) {
      if (!enabled) {
        if (onExpire) portals.forEach(onExpire);
        portals.length = 0;
        return null;
      }
      spawnTimer += dt;
      if (spawnTimer >= SPAWN_INTERVAL && portals.length === 0) {
        spawnTimer = 0;
        spawn();
      }
      for (let i = portals.length - 1; i >= 0; i--) {
        const p = portals[i];
        p.life -= dt;
        if (p.life <= 0) {
          if (onExpire) onExpire(p);
          portals.splice(i, 1);
        }
      }
      return portals.length > 0 ? portals[0] : null;
    },
    remove(portal, onRemove) {
      const idx = portals.indexOf(portal);
      if (idx >= 0) {
        if (onRemove) onRemove(portal);
        portals.splice(idx, 1);
      }
    },
    reset(onRemove) {
      if (onRemove) portals.forEach(onRemove);
      portals.length = 0;
      spawnTimer = SPAWN_INTERVAL * 0.6;
    },
  };
}

export { RADIUS as PORTAL_RADIUS };
