/**
 * UI — HUD, menus, score display.
 * localStorage key: dodgeRunHighScore
 */

const HIGH_SCORE_KEY = 'dodgeRunHighScore';

export function getHighScore() {
  return parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10);
}

export function setHighScore(score) {
  localStorage.setItem(HIGH_SCORE_KEY, String(score));
}

export function showMenu() {
  document.getElementById('menu-screen').classList.remove('hidden');
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('game-over-screen').classList.add('hidden');
  document.getElementById('paused-overlay').classList.add('hidden');
}

export function showPlaying(score, highScore) {
  document.getElementById('menu-screen').classList.add('hidden');
  document.getElementById('game-over-screen').classList.add('hidden');
  document.getElementById('paused-overlay').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  updateScore(score);
  updateHighScore(highScore);
}

export function showGameOver(score, highScore) {
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('menu-screen').classList.add('hidden');
  document.getElementById('paused-overlay').classList.add('hidden');
  document.getElementById('game-over-screen').classList.remove('hidden');
  document.getElementById('final-score').textContent = `Score: ${score}`;
  document.getElementById('final-high-score').textContent = `Best: ${highScore}`;
}

export function showPaused() {
  document.getElementById('paused-overlay').classList.remove('hidden');
}

export function hidePaused() {
  document.getElementById('paused-overlay').classList.add('hidden');
}

export function updateScore(score) {
  const el = document.getElementById('score-display');
  if (el) el.textContent = `Score: ${score}`;
}

export function updateHighScore(highScore) {
  const el = document.getElementById('high-score-display');
  if (el) el.textContent = `Best: ${highScore}`;
}
