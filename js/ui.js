/**
 * UI — HUD, menus, score display.
 * localStorage keys: dodgeRunHighScore, dodgeRunHighLevel
 */

const HIGH_SCORE_KEY = 'dodgeRunHighScore';
const HIGH_LEVEL_KEY = 'dodgeRunHighLevel';

export function getHighScore() {
  return parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10);
}

export function setHighScore(score) {
  localStorage.setItem(HIGH_SCORE_KEY, String(score));
}

export function getHighLevel() {
  return parseInt(localStorage.getItem(HIGH_LEVEL_KEY) || '1', 10);
}

export function setHighLevel(level) {
  localStorage.setItem(HIGH_LEVEL_KEY, String(level));
}

export function showNearMissBonus(points) {
  const el = document.getElementById('near-miss-bonus');
  const text = document.getElementById('near-miss-bonus-text');
  if (!el || !text) return;
  text.textContent = `3 Near Misses! +${points}`;
  el.classList.remove('hidden');
  el.classList.add('near-miss-bonus-visible');
  clearTimeout(el._nearMissTimeout);
  el._nearMissTimeout = setTimeout(() => {
    el.classList.add('hidden');
    el.classList.remove('near-miss-bonus-visible');
  }, 1500);
}

export function showPointsPopup(points, x, y) {
  const el = document.getElementById('points-popup');
  if (!el) return;
  el.textContent = `+${points}`;
  if (x != null && y != null) {
    el.style.left = `${(x / 800) * 100}%`;
    el.style.top = `${(y / 600) * 100}%`;
  } else {
    el.style.left = '50%';
    el.style.top = '50%';
  }
  el.classList.remove('hidden');
  el.classList.add('points-popup-visible');
  clearTimeout(el._pointsTimeout);
  el._pointsTimeout = setTimeout(() => {
    el.classList.add('hidden');
    el.classList.remove('points-popup-visible');
  }, 800);
}

export function showLevelUp(level) {
  const el = document.getElementById('level-up-overlay');
  const text = document.getElementById('level-up-text');
  if (!el || !text) return;
  text.textContent = `Level ${level}!`;
  el.classList.remove('hidden');
  el.classList.add('level-up-visible');
  setTimeout(() => {
    el.classList.add('hidden');
    el.classList.remove('level-up-visible');
  }, 1200);
}

export function hideLevelUp() {
  const el = document.getElementById('level-up-overlay');
  if (el) el.classList.add('hidden');
}

export function showFeatureUnlocked(featureLabels) {
  if (!featureLabels || featureLabels.length === 0) return;
  const el = document.getElementById('feature-unlock-overlay');
  const textEl = document.getElementById('feature-unlock-text');
  if (!el || !textEl) return;
  textEl.textContent = featureLabels.join(' • ');
  el.classList.remove('hidden');
  el.classList.add('feature-unlock-visible');
  clearTimeout(el._featureUnlockTimeout);
  el._featureUnlockTimeout = setTimeout(() => {
    el.classList.add('hidden');
    el.classList.remove('feature-unlock-visible');
  }, 2000);
}

export function showMenu() {
  document.getElementById('menu-screen').classList.remove('hidden');
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('game-over-screen').classList.add('hidden');
  document.getElementById('paused-overlay').classList.add('hidden');
  document.getElementById('countdown-overlay')?.classList.add('hidden');
  document.getElementById('level-up-overlay')?.classList.add('hidden');
  document.getElementById('feature-unlock-overlay')?.classList.add('hidden');
  document.getElementById('points-popup')?.classList.add('hidden');
  document.getElementById('near-miss-bonus')?.classList.add('hidden');
  const bestEl = document.getElementById('menu-best');
  if (bestEl) bestEl.textContent = `Best: ${getHighScore()} — Best level: ${getHighLevel()}`;
}

export function showPlaying(score, highScore, highLevel = 1, lives = 3) {
  document.getElementById('menu-screen').classList.add('hidden');
  document.getElementById('game-over-screen').classList.add('hidden');
  document.getElementById('paused-overlay').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  updateScore(score);
  updateHighScore(highScore);
  updateHighLevel(highLevel);
  updateLives(lives);
}

export function showGameOver(score, highScore, highLevel = 1) {
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('menu-screen').classList.add('hidden');
  document.getElementById('paused-overlay').classList.add('hidden');
  document.getElementById('countdown-overlay')?.classList.add('hidden');
  document.getElementById('level-up-overlay')?.classList.add('hidden');
  document.getElementById('feature-unlock-overlay')?.classList.add('hidden');
  document.getElementById('points-popup')?.classList.add('hidden');
  document.getElementById('near-miss-bonus')?.classList.add('hidden');
  document.getElementById('game-over-screen').classList.remove('hidden');
  document.getElementById('final-score').textContent = `Score: ${score}`;
  document.getElementById('final-high-score').textContent = `Best: ${highScore}`;
  const levelEl = document.getElementById('final-high-level');
  if (levelEl) levelEl.textContent = `Best level: ${highLevel}`;
}

export function showPaused() {
  document.getElementById('paused-overlay').classList.remove('hidden');
}

export function hidePaused() {
  document.getElementById('paused-overlay').classList.add('hidden');
}

export function showCountdown(phase, countdownTimer) {
  const el = document.getElementById('countdown-overlay');
  const text = document.getElementById('countdown-text');
  if (!el || !text) return;
  const labels = ['Go!', '1', '2', '3'];
  text.textContent = labels[phase] ?? '';
  el.classList.toggle('hidden', countdownTimer <= 0);
}

export function updateScore(score) {
  const el = document.getElementById('score-display');
  if (el) el.textContent = `Score: ${score}`;
}

export function updateLevel(level) {
  const el = document.getElementById('level-display');
  if (el) el.textContent = `Level ${level}`;
}

export function updateHighScore(highScore) {
  const el = document.getElementById('high-score-display');
  if (el) el.textContent = `Best: ${highScore}`;
}

export function updateHighLevel(highLevel) {
  const el = document.getElementById('high-level-display');
  if (el) el.textContent = `Best Lvl: ${highLevel}`;
}

export function updateLives(lives) {
  const el = document.getElementById('lives-display');
  if (el) el.textContent = `♥ ${lives}`;
}

export function updateNearMissCount(count) {
  const el = document.getElementById('near-miss-display');
  if (el) el.textContent = `Near: ${count}/3`;
}

export function updateShield(count) {
  const el = document.getElementById('shield-display');
  if (!el) return;
  if (count > 0) {
    el.textContent = `🛡 ${count}`;
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
}

export function showSoundHint() {
  const el = document.getElementById('sound-hint');
  if (el) el.classList.remove('hidden');
}

export function hideSoundHint() {
  const el = document.getElementById('sound-hint');
  if (el) el.classList.add('hidden');
}
