/**
 * Main entry — init, state machine, game loop.
 */

import { initController, getAnyButtonPressed, getPausePressed, clearButtonState } from './controller.js';
import { createPlayer, resetPlayer } from './player.js';
import { createObstacleSpawner } from './obstacle.js';
import { createGame } from './game.js';
import * as ui from './ui.js';
import * as audio from './audio.js';
import * as renderer3d from './renderer3d.js';

const canvas = document.getElementById('game-canvas');
const WIDTH = 800;
const HEIGHT = 600;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const displayWidth = Math.max(rect.width || WIDTH, 1);
  const displayHeight = Math.max(rect.height || HEIGHT, 1);
  renderer3d.resize?.(displayWidth, displayHeight);
}

const player = createPlayer(WIDTH, HEIGHT);
const obstacleSpawner = createObstacleSpawner(WIDTH, HEIGHT);

let state = 'MENU';
let score = 0;
let highScore = ui.getHighScore();
let highLevel = ui.getHighLevel();
let gameInstance = null;
let lastPausePressed = false;
let rafId = 0;
let startGameOnNextFrame = false;
let activated = false;
let activatedAt = 0;
function startPlaying() {
  state = 'PLAYING';
  score = 0;
  resetPlayer(player, WIDTH, HEIGHT);
  highScore = ui.getHighScore();
  highLevel = ui.getHighLevel();
  ui.showPlaying(score, highScore, highLevel, 3);
  gameInstance = createGame(canvas, WIDTH, HEIGHT, player, obstacleSpawner, onGameOver, addScore, onLevelUp, onLivesUpdate);
  // BGM starts after countdown (handled in game loop)
}

function addScore(points) {
  score += points;
  if (score > highScore) {
    highScore = score;
    ui.setHighScore(highScore);
  }
  ui.updateScore(score);
  ui.updateHighScore(highScore);
}

function onGameOver() {
  state = 'MENU';
  clearButtonState();
  audio.stopBGM();
  const level = gameInstance?.getLevel?.() ?? 1;
  if (level > highLevel) {
    highLevel = level;
    ui.setHighLevel(highLevel);
  }
  ui.showMenu();
}

function onLivesUpdate(lives) {
  ui.updateLives(lives);
}

function onLevelUp(level) {
  if (level > highLevel) {
    highLevel = level;
    ui.setHighLevel(highLevel);
  }
  ui.updateLevel(level);
  ui.updateHighLevel(highLevel);
  ui.showLevelUp(level);
}

function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  // First activation requires explicit user gesture (click, keydown, touch) — no auto-start from gamepad
  // activate handler (below) is the only way to set activated and startGameOnNextFrame

  // If audio is blocked (e.g. controller-only start on Windows), prompt for a click
  if (activated && !audio.isAudioRunning() && timestamp - activatedAt > 1.5) {
    ui.showSoundHint?.();
  }

  const anyBtn = getAnyButtonPressed();
  const pauseBtn = getPausePressed();

  if (state === 'MENU') {
    if (anyBtn || startGameOnNextFrame) {
      startGameOnNextFrame = false;
      clearButtonState();
      audio.playMenuSelect();
      startPlaying();
    }
  } else if (state === 'PLAYING') {
    if (pauseBtn && !lastPausePressed) {
      state = 'PAUSED';
      ui.showPaused();
    } else {
      gameInstance.update(dt);
    }
  } else if (state === 'PAUSED') {
    if (pauseBtn && !lastPausePressed) {
      state = 'PLAYING';
      ui.hidePaused();
    }
  }

  lastPausePressed = pauseBtn;

  // Always render (menu shows overlay; playing/paused show game)
  if (state === 'PLAYING' || state === 'PAUSED') {
    gameInstance.render();
    ui.updateLevel(gameInstance.getLevel?.() ?? 1);
    ui.updateLives(gameInstance.getLives?.() ?? 3);
    ui.updateNearMissCount(gameInstance.getNearMissComboCount?.() ?? 0);
    ui.updateShield(gameInstance.getShieldCount?.() ?? 0);
    if (gameInstance.getCountdownTimer?.() > 0) {
      ui.showCountdown(gameInstance.getCountdownPhase(), gameInstance.getCountdownTimer());
    } else {
      ui.showCountdown(-1, 0);
    }
  } else if (state === 'MENU') {
    renderer3d.renderBackground?.();
  }

  rafId = requestAnimationFrame(loop);
}

let lastTime = 0;

function init() {
  renderer3d.init(canvas, WIDTH, HEIGHT);
  requestAnimationFrame(() => resizeCanvas());
  window.addEventListener('resize', () => requestAnimationFrame(resizeCanvas));
  initController();
  ui.showMenu();

  // Unlock audio on any real user gesture (required on Windows / strict browsers).
  // Gamepad alone does NOT count as a user gesture, so audio stays muted.
  const unlockAudio = () => {
    audio.initAudio();
    audio.resumeAudio();
    ui.hideSoundHint?.();
  };
  document.addEventListener('click', unlockAudio, { once: false });
  document.addEventListener('keydown', unlockAudio, { once: false });
  document.addEventListener('touchstart', unlockAudio, { once: false, passive: true });

  // Activation: requires click, keydown, or touch — no gamepad auto-start
  const activate = () => {
    if (activated) return;
    activated = true;
    document.removeEventListener('click', activate);
    document.removeEventListener('keydown', activate);
    document.removeEventListener('touchstart', activate);
    audio.initAudio();
    audio.resumeAudio();
    activatedAt = performance.now();
    lastTime = performance.now();
    startGameOnNextFrame = true;
  };
  document.addEventListener('click', activate);
  document.addEventListener('keydown', activate);
  document.addEventListener('touchstart', activate, { passive: true });

  const container = document.getElementById('game-container');
  if (container) container.addEventListener('click', activate);

  // From menu (including after game over): click or key starts the game
  function requestStartFromMenu() {
    if (state === 'MENU') startGameOnNextFrame = true;
  }
  document.addEventListener('click', requestStartFromMenu);
  document.addEventListener('keydown', requestStartFromMenu);
  document.addEventListener('touchstart', requestStartFromMenu, { passive: true });
  if (container) container.addEventListener('click', requestStartFromMenu);

  lastTime = performance.now();
  rafId = requestAnimationFrame(loop);
}

init();
