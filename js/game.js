/**
 * Game loop — update and render orchestration.
 */

import { getMovement, triggerHaptic } from './controller.js';
import { updatePlayer } from './player.js';
import { checkPlayerObstacles, checkPlayerCollectibles, checkPlayerPowerups, closestObstacleDistance } from './collision.js';
import { createParticleBurst, createCollectibleBurst, updateParticles } from './particles.js';
import { createCollectibleSpawner } from './collectible.js';
import { createPowerupSpawner } from './powerup.js';
import * as audio from './audio.js';
import * as renderer3d from './renderer3d.js';
import * as ui from './ui.js';

const SURVIVAL_POINTS_PER_SEC = 10;
const OBSTACLE_CLEARED_POINTS = 25;
const NEAR_MISS_COMBO_COUNT = 3;
const NEAR_MISS_COMBO_WINDOW = 6;
const NEAR_MISS_COMBO_POINTS = 500;
const NEAR_MISS_DIST = 55;
const SHAKE_DECAY = 8;
const LEVEL_DURATION = 20; // Seconds per level
const STARTING_LIVES = 3;
const INVINCIBILITY_DURATION = 2;

export function createGame(canvas, width, height, player, obstacleSpawner, onGameOver, onScoreUpdate, onLevelUp, onLivesUpdate) {
  width = width ?? canvas?.width ?? 800;
  height = height ?? canvas?.height ?? 600;

  renderer3d.init(canvas, width, height);
  renderer3d.reset();
  obstacleSpawner.reset((o) => renderer3d.onObstacleRemoved(o));
  const collectibleSpawner = createCollectibleSpawner(width, height);
  collectibleSpawner.reset((c) => renderer3d.onCollectibleRemoved?.(c));
  const powerupSpawner = createPowerupSpawner(width, height);
  powerupSpawner.reset((p) => renderer3d.onPowerupRemoved?.(p));

  let survivalAccum = 0;
  let countdownTimer = 3.5;
  let countdownPhase = 3;
  let gameOverAnimTimer = 0;
  let particles = [];
  let shakeX = 0, shakeY = 0;
  let nearMissGlow = 0;
  let wasNearMiss = false;
  let nearMissCooldown = 0;
  let nearMissTimestamps = [];
  let level = 1;
  let levelUpAnimTimer = 0;
  let lives = STARTING_LIVES;
  let invincibilityTimer = 0;
  let shieldCount = 0;
  let slowmoTimer = 0;
  let magnetTimer = 0;

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

    // Process power-up collection BEFORE obstacle/collectible updates so effects apply immediately
    const collectedPowerups = checkPlayerPowerups(player, powerupSpawner.powerups);
    for (const p of collectedPowerups) {
      audio.playPowerUp?.();
      triggerHaptic('collect');
      particles = particles.concat(createCollectibleBurst(p.x, p.y, p.color));
      renderer3d.onPowerupRemoved?.(p);
      const idx = powerupSpawner.powerups.indexOf(p);
      if (idx >= 0) powerupSpawner.powerups.splice(idx, 1);
      if (p.type === 'shield') shieldCount++;
      else if (p.type === 'slowmo') slowmoTimer = 4;
      else if (p.type === 'magnet') magnetTimer = 5;
      else if (p.type === 'life') { lives++; onLivesUpdate?.(lives); }
      else if (p.type === 'clear') {
        const n = obstacleSpawner.obstacles.length;
        obstacleSpawner.obstacles.forEach((o) => onObstacleRemoved(o));
        obstacleSpawner.obstacles.length = 0;
        onScoreUpdate?.(n * OBSTACLE_CLEARED_POINTS);
      }
    }

    const speedMultiplier = slowmoTimer > 0 ? 0.5 : 1;
    if (slowmoTimer > 0) slowmoTimer -= dt;
    if (magnetTimer > 0) magnetTimer -= dt;

    obstacleSpawner.update(dt, level, speedMultiplier);

    // Level progression: level up every LEVEL_DURATION seconds
    const gameTime = obstacleSpawner.getGameTime?.() ?? 0;
    const newLevel = 1 + Math.floor(gameTime / LEVEL_DURATION);
    if (newLevel > level) {
      level = newLevel;
      levelUpAnimTimer = 1.2;
      audio.playLevelUp?.();
      triggerHaptic('levelUp');
      onLevelUp?.(level);
    }
    if (levelUpAnimTimer > 0) levelUpAnimTimer -= dt;
    if (invincibilityTimer > 0) invincibilityTimer -= dt;

    const magnetTarget = magnetTimer > 0 ? { x: player.x, y: player.y } : null;
    collectibleSpawner.update(dt, (c) => renderer3d.onCollectibleRemoved?.(c), level, magnetTarget);
    powerupSpawner.update(dt, (p) => renderer3d.onPowerupRemoved?.(p), level);
    particles = updateParticles(particles, dt);

    const collected = checkPlayerCollectibles(player, collectibleSpawner.collectibles);
    for (const c of collected) {
      audio.playCollect();
      triggerHaptic('collect');
      ui.showPointsPopup?.(c.points, c.x, c.y);
      onScoreUpdate?.(c.points);
      particles = particles.concat(createCollectibleBurst(c.x, c.y, c.color));
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
    const nmGameTime = obstacleSpawner.getGameTime?.() ?? 0;
    if (isNearMiss) {
      nearMissGlow = Math.min(1, nearMissGlow + dt * 10);
      if (!wasNearMiss && nearMissCooldown <= 0) {
        audio.playNearMiss();
        triggerHaptic('nearMiss');
        nearMissCooldown = 0.4;
        nearMissTimestamps.push(nmGameTime);
        nearMissTimestamps = nearMissTimestamps.filter((t) => nmGameTime - t <= NEAR_MISS_COMBO_WINDOW);
        if (nearMissTimestamps.length >= NEAR_MISS_COMBO_COUNT) {
          onScoreUpdate?.(NEAR_MISS_COMBO_POINTS);
          ui.showNearMissBonus?.(NEAR_MISS_COMBO_POINTS);
          triggerHaptic('levelUp');
          nearMissTimestamps = [];
        }
      }
      wasNearMiss = true;
    } else {
      nearMissGlow = Math.max(0, nearMissGlow - dt * 2);
      wasNearMiss = false;
    }
    if (nearMissCooldown > 0) nearMissCooldown -= dt;

    survivalAccum += dt;
    if (survivalAccum >= 1) {
      const secs = Math.floor(survivalAccum);
      survivalAccum -= secs;
      onScoreUpdate?.(secs * SURVIVAL_POINTS_PER_SEC);
    }

    if (invincibilityTimer <= 0 && checkPlayerObstacles(player, obstacleSpawner.obstacles)) {
      audio.playHit();
      triggerHaptic('collision');
      particles = createParticleBurst(player.x, player.y);
      shakeX = shakeY = 20;
      nearMissGlow = 0;
      if (shieldCount > 0) {
        shieldCount--;
        invincibilityTimer = INVINCIBILITY_DURATION;
      } else {
        lives--;
        onLivesUpdate?.(lives);
        if (lives <= 0) {
          gameOverAnimTimer = 0.5;
        } else {
          invincibilityTimer = INVINCIBILITY_DURATION;
        }
      }
    }

    shakeX *= 1 - SHAKE_DECAY * dt;
    shakeY *= 1 - SHAKE_DECAY * dt;

    return {};
  }

  function render() {
    const glow = gameOverAnimTimer > 0 ? 0 : nearMissGlow;
    const invincibleBlink = invincibilityTimer > 0;
    renderer3d.render(
      player,
      obstacleSpawner.obstacles,
      collectibleSpawner.collectibles,
      particles,
      shakeX,
      shakeY,
      glow,
      false,
      invincibleBlink,
      powerupSpawner.powerups,
      shieldCount > 0
    );
  }

  return {
    update,
    render,
    getCountdownPhase: () => countdownPhase,
    getCountdownTimer: () => countdownTimer,
    getLevel: () => level,
    getLevelUpAnimTimer: () => levelUpAnimTimer,
    getLives: () => lives,
    getShieldCount: () => shieldCount,
  };
}
