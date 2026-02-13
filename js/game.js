/**
 * Game loop — update and render orchestration.
 */

import { getMovement, triggerHaptic } from './controller.js';
import { updatePlayer } from './player.js';
import { checkPlayerObstacles, checkPlayerCollectibles, checkPlayerPowerups, checkPlayerPortal, closestObstacleAndDistance } from './collision.js';
import { createParticleBurst, createCollectibleBurst, updateParticles } from './particles.js';
import { createCollectibleSpawner } from './collectible.js';
import { createPowerupSpawner } from './powerup.js';
import { createPortalSpawner } from './portal.js';
import { FEATURES, isFeatureEnabled, getFeaturesUnlockedAtLevel, FEATURE_LABELS } from './features.js';
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
const BOSS_WAVE_DURATION = 6;
const BOSS_WAVE_SPEED_MULT = 2;
const PORTAL_BONUS_DURATION = 15;
const PORTAL_COLLECTIBLE_SPAWN_INTERVAL = 0.45;
const PORTAL_COLLECTIBLE_MAX = 12;

export function createGame(canvas, width, height, player, obstacleSpawner, onGameOver, onScoreUpdate, onLevelUp, onLivesUpdate) {
  width = width ?? canvas?.width ?? 800;
  height = height ?? canvas?.height ?? 600;

  renderer3d.init(canvas, width, height);
  renderer3d.reset();
  obstacleSpawner.reset((o) => renderer3d.onObstacleRemoved(o));
  const collectibleSpawner = createCollectibleSpawner(width, height);
  collectibleSpawner.reset((c) => renderer3d.onCollectibleRemoved?.(c));
  obstacleSpawner.setOnSpawn?.((o) => {
    if (isFeatureEnabled(FEATURES.COLLECTIBLE_IN_FRONT, level) && Math.random() < 0.08) {
      collectibleSpawner.spawnInFrontOfObstacle?.(o);
    }
  });
  const powerupSpawner = createPowerupSpawner(width, height);
  powerupSpawner.reset((p) => renderer3d.onPowerupRemoved?.(p));
  const portalSpawner = createPortalSpawner(width, height);

  let survivalAccum = 0;
  let portalMode = false;
  let portalTimer = 0;
  let portalCollectibles = [];
  let portalCollectibleSpawnTimer = 0;
  let countdownTimer = 3.5;
  let countdownPhase = 3;
  let gameOverAnimTimer = 0;
  let particles = [];
  let shakeX = 0, shakeY = 0;
  let nearMissGlow = 0;
  let wasNearMiss = false;
  let nearMissCooldown = 0;
  let nearMissTimestamps = [];
  const nearMissObstacles = new Set(); // Each obstacle can only count once
  let level = 1;
  let levelUpAnimTimer = 0;
  let bossWaveTimer = 0;
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
        if (isFeatureEnabled(FEATURES.COLLECTIBLES, 1)) collectibleSpawner.primeFirstSpawn?.();
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

    // Portal bonus mode — collectibles only for 15s, obstacles block (no damage)
    if (portalMode) {
      const prevX = player.x;
      const prevY = player.y;
      updatePlayer(player, movement, dt, width, height);
      if (checkPlayerObstacles(player, obstacleSpawner.obstacles)) {
        player.x = prevX;
        player.y = prevY;
      }
      portalTimer -= dt;
      portalCollectibleSpawnTimer += dt;
      const PORTAL_POINTS = [50, 75, 100];
      const PORTAL_COLORS = { 50: 0xFFD700, 75: 0x00BCD4, 100: 0xE91E63 };
      if (portalCollectibleSpawnTimer >= PORTAL_COLLECTIBLE_SPAWN_INTERVAL && portalCollectibles.length < PORTAL_COLLECTIBLE_MAX) {
        portalCollectibleSpawnTimer = 0;
        const pts = PORTAL_POINTS[Math.floor(Math.random() * PORTAL_POINTS.length)];
        const pad = 50;
        portalCollectibles.push({
          x: pad + Math.random() * (width - pad * 2),
          y: pad + Math.random() * (height - pad * 2),
          radius: 18,
          points: pts,
          color: PORTAL_COLORS[pts],
          life: 15,
          maxLife: 15,
        });
      }
      for (let i = portalCollectibles.length - 1; i >= 0; i--) {
        portalCollectibles[i].life -= dt;
        if (portalCollectibles[i].life <= 0) {
          renderer3d.onCollectibleRemoved?.(portalCollectibles[i]);
          portalCollectibles.splice(i, 1);
        }
      }
      const collected = checkPlayerCollectibles(player, portalCollectibles);
      for (const c of collected) {
        audio.playCollect();
        triggerHaptic('collect');
        ui.showPointsPopup?.(c.points, c.x, c.y);
        onScoreUpdate?.(c.points);
        particles = particles.concat(createCollectibleBurst(c.x, c.y, c.color));
        renderer3d.onCollectibleRemoved?.(c);
        portalCollectibles.splice(portalCollectibles.indexOf(c), 1);
      }
      particles = updateParticles(particles, dt);
      if (portalTimer <= 0) {
        portalMode = false;
        invincibilityTimer = INVINCIBILITY_DURATION;
        portalCollectibles.forEach((c) => renderer3d.onCollectibleRemoved?.(c));
        portalCollectibles = [];
      }
      shakeX *= 1 - SHAKE_DECAY * dt;
      shakeY *= 1 - SHAKE_DECAY * dt;
      return {};
    }

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

    const bonusPortalEnabled = isFeatureEnabled(FEATURES.BONUS_PORTAL, level);
    const hitPortal = checkPlayerPortal(player, portalSpawner.portals);
    if (hitPortal && bonusPortalEnabled) {
      audio.playPowerUp?.();
      triggerHaptic('levelUp');
      portalSpawner.remove(hitPortal, (p) => renderer3d.onPortalRemoved?.(p));
      portalMode = true;
      portalTimer = PORTAL_BONUS_DURATION;
      portalCollectibles = [];
      portalCollectibleSpawnTimer = 0;
    }

    portalSpawner.update(dt, (p) => renderer3d.onPortalRemoved?.(p), null, bonusPortalEnabled && !portalMode && bossWaveTimer <= 0);

    const baseSpeedMult = slowmoTimer > 0 ? 0.5 : (bossWaveTimer > 0 ? BOSS_WAVE_SPEED_MULT : 1);
    if (slowmoTimer > 0) slowmoTimer -= dt;
    if (magnetTimer > 0) magnetTimer -= dt;

    const speedLevel = isFeatureEnabled(FEATURES.OBSTACLE_SPEED_RAMP, level) ? level : 1;
    const countLevel = isFeatureEnabled(FEATURES.OBSTACLE_COUNT_RAMP, level) ? level : 1;
    const spawnLevel = isFeatureEnabled(FEATURES.OBSTACLE_SPAWN_RAMP, level) ? level : 1;
    const suddenHardEnabled = isFeatureEnabled(FEATURES.SUDDEN_HARD_OBSTACLES, level);
    obstacleSpawner.update(dt, level, baseSpeedMult, speedLevel, countLevel, spawnLevel, suddenHardEnabled);

    // Level progression: level up every LEVEL_DURATION seconds
    const gameTime = obstacleSpawner.getGameTime?.() ?? 0;
    const newLevel = 1 + Math.floor(gameTime / LEVEL_DURATION);
    if (newLevel > level) {
      level = newLevel;
      levelUpAnimTimer = 1.2;
      if (isFeatureEnabled(FEATURES.BOSS_WAVE, level) && level % 3 === 0 && portalSpawner.portals.length === 0 && !portalMode) {
        bossWaveTimer = BOSS_WAVE_DURATION;
      }
      audio.playLevelUp?.();
      triggerHaptic('levelUp');
      onLevelUp?.(level);
      const unlocked = getFeaturesUnlockedAtLevel(level);
      if (unlocked.length > 0) {
        const labels = unlocked.map((f) => FEATURE_LABELS[f]).filter(Boolean);
        setTimeout(() => ui.showFeatureUnlocked?.(labels), 500);
      }
    }
    if (bossWaveTimer > 0) bossWaveTimer -= dt;
    if (levelUpAnimTimer > 0) levelUpAnimTimer -= dt;
    if (invincibilityTimer > 0) invincibilityTimer -= dt;

    const magnetTarget = magnetTimer > 0 ? { x: player.x, y: player.y } : null;
    const collectiblesEnabled = isFeatureEnabled(FEATURES.COLLECTIBLES, level);
    const collectibleBonusEnabled = isFeatureEnabled(FEATURES.COLLECTIBLE_BONUS, level);
    const collectibleFloatEnabled = isFeatureEnabled(FEATURES.COLLECTIBLE_FLOAT, level);
    const powerupsEnabled = isFeatureEnabled(FEATURES.POWERUPS, level);
    collectibleSpawner.update(dt, (c) => renderer3d.onCollectibleRemoved?.(c), level, magnetTarget, baseSpeedMult, collectiblesEnabled, collectibleBonusEnabled, collectibleFloatEnabled);
    powerupSpawner.update(dt, (p) => renderer3d.onPowerupRemoved?.(p), level, powerupsEnabled);
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

    const closestResult = closestObstacleAndDistance(player, obstacleSpawner.obstacles);
    const closestDist = closestResult?.distance ?? Infinity;
    const isNearMiss = closestDist < NEAR_MISS_DIST && closestDist > player.radius;
    const nmGameTime = obstacleSpawner.getGameTime?.() ?? 0;
    // Prune old timestamps every frame so count and window work correctly
    nearMissTimestamps = nearMissTimestamps.filter((t) => nmGameTime - t <= NEAR_MISS_COMBO_WINDOW);
    // Prune nearMissObstacles: remove references to obstacles no longer in game
    const obsSet = obstacleSpawner.obstacles;
    for (const o of nearMissObstacles) {
      if (!obsSet.includes(o)) nearMissObstacles.delete(o);
    }
    if (isNearMiss) {
      nearMissGlow = Math.min(1, nearMissGlow + dt * 10);
      const closestObs = closestResult?.obstacle;
      const alreadyCounted = closestObs && nearMissObstacles.has(closestObs);
      if (!wasNearMiss && nearMissCooldown <= 0 && !alreadyCounted) {
        audio.playNearMiss();
        triggerHaptic('nearMiss');
        nearMissCooldown = 0.4;
        if (closestObs) nearMissObstacles.add(closestObs);
        nearMissTimestamps.push(nmGameTime);
        if (nearMissTimestamps.length >= NEAR_MISS_COMBO_COUNT) {
          if (isFeatureEnabled(FEATURES.NEAR_MISS_COMBO, level)) {
            onScoreUpdate?.(NEAR_MISS_COMBO_POINTS);
            ui.showNearMissBonus?.(NEAR_MISS_COMBO_POINTS);
            triggerHaptic('levelUp');
          }
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
    const bossWaveActive = bossWaveTimer > 0;
    renderer3d.render(
      player,
      obstacleSpawner.obstacles,
      portalMode ? portalCollectibles : collectibleSpawner.collectibles,
      particles,
      shakeX,
      shakeY,
      glow,
      false,
      invincibleBlink,
      portalMode ? [] : powerupSpawner.powerups,
      shieldCount > 0,
      bossWaveActive,
      portalMode ? [] : portalSpawner.portals,
      portalMode
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
    getNearMissComboCount: () => nearMissTimestamps.length,
    getPortalMode: () => portalMode,
    getPortalTimer: () => portalTimer,
  };
}
