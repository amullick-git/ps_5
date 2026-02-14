/**
 * Game features — named elements with level-based unlocks.
 * Each feature is enabled when current level >= its unlock level.
 */

export const FEATURES = {
  COLLECTIBLES: 'collectibles',
  POWERUPS: 'powerups',
  OBSTACLE_SPEED_RAMP: 'obstacleSpeedRamp',
  OBSTACLE_COUNT_RAMP: 'obstacleCountRamp',
  OBSTACLE_SPAWN_RAMP: 'obstacleSpawnRamp',
  BOSS_WAVE: 'bossWave',
  COLLECTIBLE_IN_FRONT: 'collectibleInFront',
  COLLECTIBLE_BONUS: 'collectibleBonus',
  COLLECTIBLE_FLOAT: 'collectibleFloat',
  NEAR_MISS_COMBO: 'nearMissCombo',
  SUDDEN_HARD_OBSTACLES: 'suddenHardObstacles',
  BONUS_PORTAL: 'bonusPortal',
};

/** Level at which each feature unlocks (1 = from start). Ordered by unlock level. */
export const FEATURE_UNLOCK_LEVEL = {
  // Level 1
  [FEATURES.OBSTACLE_SPEED_RAMP]: 1,    // Obstacles move faster as level increases
  [FEATURES.OBSTACLE_COUNT_RAMP]: 1,    // Max obstacles on screen ramps 6 → 18
  [FEATURES.OBSTACLE_SPAWN_RAMP]: 1,    // Obstacle spawn interval shortens with level
  [FEATURES.COLLECTIBLES]: 1,           // Rings (50/75/100 pts) spawn in play area
  // Level 2
  // Level 3
  [FEATURES.COLLECTIBLE_FLOAT]: 3,      // Some collectibles orbit instead of staying static
  [FEATURES.BONUS_PORTAL]: 3,           // Portals: enter for 10s collectibles-only bonus room
  [FEATURES.NEAR_MISS_COMBO]: 3,        // 3 near-misses in 6s = +500 bonus
  // Level 4
  [FEATURES.SUDDEN_HARD_OBSTACLES]: 4,  // 6% chance for large bouncing obstacles (80×80)
  [FEATURES.POWERUPS]: 4,               // Shield, slowmo, magnet, life, clear (stars)
  // Level 5
  [FEATURES.BOSS_WAVE]: 5,              // Every 3rd level: red screen, 2× speed, 6s
  // Level 6
  // Level 7
  [FEATURES.COLLECTIBLE_IN_FRONT]: 7,   // 500pt collectible spawns in front of obstacles (8%)
  // Level 8
  [FEATURES.COLLECTIBLE_BONUS]: 8,      // 8% chance for 500pt random bonus ring (blinks, 2s)
  // Level 9
};

export function isFeatureEnabled(feature, level) {
  return level >= (FEATURE_UNLOCK_LEVEL[feature] ?? 1);
}

/** Human-readable labels for feature unlock announcements. */
export const FEATURE_LABELS = {
  [FEATURES.COLLECTIBLES]: 'Collectibles',
  [FEATURES.POWERUPS]: 'Power-ups',
  [FEATURES.OBSTACLE_SPEED_RAMP]: 'Obstacle speed ramp',
  [FEATURES.OBSTACLE_COUNT_RAMP]: 'Obstacle count ramp',
  [FEATURES.OBSTACLE_SPAWN_RAMP]: 'Obstacle spawn ramp',
  [FEATURES.BOSS_WAVE]: 'Boss wave',
  [FEATURES.COLLECTIBLE_IN_FRONT]: 'Collectible in front',
  [FEATURES.COLLECTIBLE_BONUS]: '500pt bonus collectible',
  [FEATURES.COLLECTIBLE_FLOAT]: 'Collectible float',
  [FEATURES.NEAR_MISS_COMBO]: 'Near-miss combo',
  [FEATURES.SUDDEN_HARD_OBSTACLES]: 'Sudden hard obstacles',
  [FEATURES.BONUS_PORTAL]: 'Bonus portal',
};

/** Returns feature keys that unlock exactly at the given level. */
export function getFeaturesUnlockedAtLevel(level) {
  return Object.keys(FEATURE_UNLOCK_LEVEL).filter(
    (f) => FEATURE_UNLOCK_LEVEL[f] === level
  );
}
