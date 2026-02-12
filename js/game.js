/**
 * Game loop — update and render orchestration.
 */

import { getMovement } from './controller.js';
import { updatePlayer } from './player.js';
import { checkPlayerObstacles, closestObstacleDistance } from './collision.js';
import { createParticleBurst, updateParticles } from './particles.js';
import * as audio from './audio.js';
import * as renderer3d from './renderer3d.js';

const SURVIVAL_POINTS_PER_SEC = 10;
const OBSTACLE_CLEARED_POINTS = 25;
const NEAR_MISS_DIST = 55;
const SHAKE_DECAY = 8;

export function createGame(canvas, player, obstacleSpawner, onGameOver, onScoreUpdate) {
  const width = canvas.width;
  const height = canvas.height;

  renderer3d.init(canvas, width, height);
  renderer3d.reset();
  obstacleSpawner.reset((o) => renderer3d.onObstacleRemoved(o));

  let survivalAccum = 0;
  let countdownTimer = 3.5;
  let countdownPhase = 3;
  let gameOverAnimTimer = 0;
  let particles = [];
  let shakeX = 0, shakeY = 0;
  let nearMissGlow = 0;

  const onObstacleRemoved = (o) => renderer3d.onObstacleRemoved(o);

  function update(dt) {
    const movement = getMovement();
    updatePlayer(player, movement, dt, width, height);

    // Countdown phase
    if (countdownTimer > 0) {
      countdownTimer -= dt;
      const prev = countdownPhase;
      if (countdownTimer > 2.5) countdownPhase = 3;
      else if (countdownTimer > 1.5) countdownPhase = 2;
      else if (countdownTimer > 0.5) countdownPhase = 1;
      else countdownPhase = 0;
      if (countdownPhase !== prev && countdownPhase > 0) audio.playCountdownBeep();
      if (countdownPhase === 0 && prev === 1) {
        audio.playGo();
        audio.startBGM();
      }
      return { countdownPhase, countdownTimer };
    }

    // Game over animation
    if (gameOverAnimTimer > 0) {
      gameOverAnimTimer -= dt;
      particles = updateParticles(particles, dt);
      shakeX *= 1 - SHAKE_DECAY * dt;
      shakeY *= 1 - SHAKE_DECAY * dt;
      if (gameOverAnimTimer <= 0) onGameOver();
      return {};
    }

    obstacleSpawner.update(dt);

    const cleared = obstacleSpawner.removeOutside(width, height, onObstacleRemoved);
    if (cleared > 0) {
      audio.playPass();
      onScoreUpdate?.(cleared * OBSTACLE_CLEARED_POINTS);
    }

    const closest = closestObstacleDistance(player, obstacleSpawner.obstacles);
    if (closest < NEAR_MISS_DIST && closest > player.radius) {
      nearMissGlow = Math.min(1, nearMissGlow + dt * 4);
    } else {
      nearMissGlow = Math.max(0, nearMissGlow - dt * 3);
    }

    survivalAccum += dt;
    if (survivalAccum >= 1) {
      const secs = Math.floor(survivalAccum);
      survivalAccum -= secs;
      onScoreUpdate?.(secs * SURVIVAL_POINTS_PER_SEC);
    }

    if (checkPlayerObstacles(player, obstacleSpawner.obstacles)) {
      audio.playHit();
      particles = createParticleBurst(player.x, player.y);
      shakeX = shakeY = 20;
      gameOverAnimTimer = 0.5;
    }

    return {};
  }

  function render() {
    renderer3d.render(player, obstacleSpawner.obstacles, particles, shakeX, shakeY, nearMissGlow);
  }

  return {
    update,
    render,
    getCountdownPhase: () => countdownPhase,
    getCountdownTimer: () => countdownTimer,
  };
}
