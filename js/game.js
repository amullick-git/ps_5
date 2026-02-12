/**
 * Game loop — update and render orchestration.
 */

import { getMovement } from './controller.js';
import { updatePlayer } from './player.js';
import { checkPlayerObstacles, checkPlayerCollectibles, closestObstacleDistance } from './collision.js';
import { createParticleBurst, updateParticles } from './particles.js';
import { createCollectibleSpawner } from './collectible.js';
import * as audio from './audio.js';
import * as renderer3d from './renderer3d.js';

const SURVIVAL_POINTS_PER_SEC = 10;
const OBSTACLE_CLEARED_POINTS = 25;
const NEAR_MISS_DIST = 55;
const SHAKE_DECAY = 8;
const LEVEL_DURATION = 20; // Seconds per level

export function createGame(canvas, width, height, player, obstacleSpawner, onGameOver, onScoreUpdate, onLevelUp) {
  width = width ?? canvas?.width ?? 800;
  height = height ?? canvas?.height ?? 600;

  renderer3d.init(canvas, width, height);
  renderer3d.reset();
  obstacleSpawner.reset((o) => renderer3d.onObstacleRemoved(o));
  const collectibleSpawner = createCollectibleSpawner(width, height);
  collectibleSpawner.reset((c) => renderer3d.onCollectibleRemoved?.(c));

  let survivalAccum = 0;
  let countdownTimer = 3.5;
  let countdownPhase = 3;
  let gameOverAnimTimer = 0;
  let particles = [];
  let shakeX = 0, shakeY = 0;
  let nearMissGlow = 0;
  let wasNearMiss = false;
  let nearMissCooldown = 0;
  let level = 1;
  let levelUpAnimTimer = 0;

  const onObstacleRemoved = (o) => renderer3d.onObstacleRemoved(o);

  function update(dt) {
    // Countdown phase
    if (countdownTimer > 0) {
      const movement = getMovement();
      updatePlayer(player, movement, dt, width, height);
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
        collectibleSpawner.primeFirstSpawn?.();
      }
      return { countdownPhase, countdownTimer };
    }

    // Game over animation — no player movement
    if (gameOverAnimTimer > 0) {
      gameOverAnimTimer -= dt;
      particles = updateParticles(particles, dt);
      shakeX *= 1 - SHAKE_DECAY * dt;
      shakeY *= 1 - SHAKE_DECAY * dt;
      if (gameOverAnimTimer <= 0) onGameOver();
      return {};
    }

    const movement = getMovement();
    updatePlayer(player, movement, dt, width, height);
    obstacleSpawner.update(dt, level);

    // Level progression: level up every LEVEL_DURATION seconds
    const gameTime = obstacleSpawner.getGameTime?.() ?? 0;
    const newLevel = 1 + Math.floor(gameTime / LEVEL_DURATION);
    if (newLevel > level) {
      level = newLevel;
      levelUpAnimTimer = 1.2;
      audio.playLevelUp?.();
      onLevelUp?.(level);
    }
    if (levelUpAnimTimer > 0) levelUpAnimTimer -= dt;

    collectibleSpawner.update(dt, (c) => renderer3d.onCollectibleRemoved?.(c), level);

    const collected = checkPlayerCollectibles(player, collectibleSpawner.collectibles);
    for (const c of collected) {
      audio.playCollect();
      onScoreUpdate?.(c.points);
      renderer3d.onCollectibleRemoved?.(c);
      const idx = collectibleSpawner.collectibles.indexOf(c);
      if (idx >= 0) collectibleSpawner.collectibles.splice(idx, 1);
    }

    const cleared = obstacleSpawner.removeOutside(width, height, onObstacleRemoved);
    if (cleared > 0) {
      audio.playPass();
      onScoreUpdate?.(cleared * OBSTACLE_CLEARED_POINTS);
    }

    const closest = closestObstacleDistance(player, obstacleSpawner.obstacles);
    const isNearMiss = closest < NEAR_MISS_DIST && closest > player.radius;
    if (isNearMiss) {
      nearMissGlow = Math.min(1, nearMissGlow + dt * 4);
      if (!wasNearMiss && nearMissCooldown <= 0) {
        audio.playNearMiss();
        nearMissCooldown = 0.4;
      }
      wasNearMiss = true;
    } else {
      nearMissGlow = Math.max(0, nearMissGlow - dt * 3);
      wasNearMiss = false;
    }
    if (nearMissCooldown > 0) nearMissCooldown -= dt;

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
      nearMissGlow = 0;
      gameOverAnimTimer = 0.5;
    }

    return {};
  }

  function render() {
    const glow = gameOverAnimTimer > 0 ? 0 : nearMissGlow;
    renderer3d.render(
      player,
      obstacleSpawner.obstacles,
      collectibleSpawner.collectibles,
      particles,
      shakeX,
      shakeY,
      glow,
      false
    );
  }

  return {
    update,
    render,
    getCountdownPhase: () => countdownPhase,
    getCountdownTimer: () => countdownTimer,
    getLevel: () => level,
    getLevelUpAnimTimer: () => levelUpAnimTimer,
  };
}
