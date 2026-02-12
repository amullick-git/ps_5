/**
 * Game loop — update and render orchestration.
 * Uses requestAnimationFrame and delta time.
 */

import { getMovement } from './controller.js';
import { updatePlayer, renderPlayer } from './player.js';
import { checkPlayerObstacles } from './collision.js';

const SURVIVAL_POINTS_PER_SEC = 10;
const OBSTACLE_CLEARED_POINTS = 25;

export function createGame(canvas, player, obstacleSpawner, onGameOver, onScoreUpdate) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  let lastTime = 0;
  let survivalAccum = 0;

  function update(dt) {
    const movement = getMovement();
    updatePlayer(player, movement, dt, width, height);
    obstacleSpawner.update(dt);

    const cleared = obstacleSpawner.removeOutside(width, height);
    if (cleared > 0) {
      onScoreUpdate?.(cleared * OBSTACLE_CLEARED_POINTS);
    }

    survivalAccum += dt;
    if (survivalAccum >= 1) {
      const secs = Math.floor(survivalAccum);
      survivalAccum -= secs;
      onScoreUpdate?.(secs * SURVIVAL_POINTS_PER_SEC);
    }

    if (checkPlayerObstacles(player, obstacleSpawner.obstacles)) {
      onGameOver?.();
    }
  }

  function render() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    obstacleSpawner.render(ctx);
    renderPlayer(ctx, player);
  }

  return { update, render };
}
