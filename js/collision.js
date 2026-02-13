/**
 * Circle–AABB collision detection.
 * Player: circle (px, py, radius). Obstacle: AABB (x, y, w, h).
 */

export function circleAABB(px, py, radius, ox, oy, w, h) {
  const closestX = Math.max(ox, Math.min(px, ox + w));
  const closestY = Math.max(oy, Math.min(py, oy + h));
  const dx = px - closestX;
  const dy = py - closestY;
  const distSq = dx * dx + dy * dy;
  return distSq <= radius * radius;
}

export function checkPlayerObstacles(player, obstacles) {
  for (const o of obstacles) {
    if (circleAABB(player.x, player.y, player.radius, o.x, o.y, o.w, o.h)) {
      return true;
    }
  }
  return false;
}

export function circleCircle(px, py, pr, cx, cy, cr) {
  const dx = px - cx;
  const dy = py - cy;
  const distSq = dx * dx + dy * dy;
  return distSq <= (pr + cr) * (pr + cr);
}

export function checkPlayerCollectibles(player, collectibles) {
  const collected = [];
  for (const c of collectibles) {
    if (circleCircle(player.x, player.y, player.radius, c.x, c.y, c.radius)) {
      collected.push(c);
    }
  }
  return collected;
}

export function checkPlayerPowerups(player, powerups) {
  const collected = [];
  for (const p of powerups) {
    if (circleCircle(player.x, player.y, player.radius, p.x, p.y, p.radius)) {
      collected.push(p);
    }
  }
  return collected;
}

/** Distance from player center to closest point on obstacle. For near-miss detection. */
export function closestObstacleDistance(player, obstacles) {
  const result = closestObstacleAndDistance(player, obstacles);
  return result?.distance ?? Infinity;
}

/** Returns { obstacle, distance } for the closest obstacle, or null if none. */
export function closestObstacleAndDistance(player, obstacles) {
  let minDist = Infinity;
  let closest = null;
  for (const o of obstacles) {
    const cx = Math.max(o.x, Math.min(player.x, o.x + o.w));
    const cy = Math.max(o.y, Math.min(player.y, o.y + o.h));
    const dx = player.x - cx;
    const dy = player.y - cy;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < minDist) {
      minDist = d;
      closest = o;
    }
  }
  return closest ? { obstacle: closest, distance: minDist } : null;
}
