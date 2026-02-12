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
