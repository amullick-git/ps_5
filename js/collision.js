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

/** Distance from player center to closest point on obstacle. For near-miss detection. */
export function closestObstacleDistance(player, obstacles) {
  let minDist = Infinity;
  for (const o of obstacles) {
    const cx = Math.max(o.x, Math.min(player.x, o.x + o.w));
    const cy = Math.max(o.y, Math.min(player.y, o.y + o.h));
    const dx = player.x - cx;
    const dy = player.y - cy;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < minDist) minDist = d;
  }
  return minDist;
}
