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
};

/** Level at which each feature unlocks (1 = from start). Ordered by unlock level. */
export const FEATURE_UNLOCK_LEVEL = {
  // Level 1
  [FEATURES.OBSTACLE_SPEED_RAMP]: 1,    // Obstacles move faster as level increases
  [FEATURES.OBSTACLE_COUNT_RAMP]: 1,    // Max obstacles on screen ramps 6 → 18
  [FEATURES.OBSTACLE_SPAWN_RAMP]: 1,    // Obstacle spawn interval shortens with level
  // Level 2
  [FEATURES.COLLECTIBLES]: 2,           // Rings (50/75/100 pts) spawn in play area
  // Level 3
  [FEATURES.POWERUPS]: 3,               // Shield, slowmo, magnet, life, clear (stars)
  [FEATURES.BOSS_WAVE]: 3,              // Every 3rd level: red screen, 2× speed, 6s
  [FEATURES.COLLECTIBLE_FLOAT]: 3,      // Some collectibles orbit instead of staying static
  // Level 4
  [FEATURES.COLLECTIBLE_BONUS]: 4,      // 8% chance for 500pt random bonus ring (blinks, 2s)
  [FEATURES.NEAR_MISS_COMBO]: 4,        // 3 near-misses in 6s = +500 bonus
  // Level 5
  [FEATURES.COLLECTIBLE_IN_FRONT]: 5,   // 500pt collectible spawns in front of obstacles (8%)
  // Level 6
  [FEATURES.SUDDEN_HARD_OBSTACLES]: 6,  // 6% chance for large bouncing obstacles (80×80)
};

export function isFeatureEnabled(feature, level) {
  return level >= (FEATURE_UNLOCK_LEVEL[feature] ?? 1);
}
