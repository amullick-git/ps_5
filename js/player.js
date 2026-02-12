/**
 * Player entity — circle, radius 20, speed 300, spawn at center.
 * Position clamped with padding = radius.
 */

const RADIUS = 20;
const SPEED = 300;
const COLOR = '#4CAF50';

export function createPlayer(width, height) {
  return {
    x: width / 2,
    y: height / 2,
    radius: RADIUS,
    speed: SPEED,
    color: COLOR,
  };
}

export function resetPlayer(player, width, height) {
  player.x = width / 2;
  player.y = height / 2;
}

export function updatePlayer(player, movement, dt, width, height) {
  const pad = player.radius;
  player.x += movement.x * player.speed * dt;
  player.y += movement.y * player.speed * dt;

  player.x = Math.max(pad, Math.min(width - pad, player.x));
  player.y = Math.max(pad, Math.min(height - pad, player.y));
}

export function renderPlayer(ctx, player) {
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();
}

export { RADIUS as PLAYER_RADIUS };
