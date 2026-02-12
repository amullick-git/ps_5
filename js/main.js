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
  ui.showPlaying(score, highScore);
  gameInstance = createGame(canvas, WIDTH, HEIGHT, player, obstacleSpawner, onGameOver, addScore, onLevelUp);
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
  state = 'GAME_OVER';
  audio.stopBGM();
  ui.showGameOver(score, highScore);
}

function onLevelUp(level) {
  ui.updateLevel(level);
  ui.showLevelUp(level);
}

function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  // First activation: click, keydown, or controller — start loop and unlock audio
  if (!activated && getAnyButtonPressed()) {
    activated = true;
    activatedAt = timestamp;
    audio.initAudio();
    audio.resumeAudio();
    startGameOnNextFrame = true;
  }

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
  } else if (state === 'GAME_OVER') {
    if (anyBtn) {
      clearButtonState();
      audio.playMenuSelect();
      startPlaying();
    }
  }

  lastPausePressed = pauseBtn;

  // Always render (menu shows overlay; playing/paused show game)
  if (state === 'PLAYING' || state === 'PAUSED') {
    gameInstance.render();
    ui.updateLevel(gameInstance.getLevel?.() ?? 1);
    if (gameInstance.getCountdownTimer?.() > 0) {
      ui.showCountdown(gameInstance.getCountdownPhase(), gameInstance.getCountdownTimer());
    } else {
      ui.showCountdown(-1, 0);
    }
  } else if (state === 'MENU' || state === 'GAME_OVER') {
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

  // Activation: click, keydown, or controller button (loop polls gamepad)
  const activate = () => {
    if (activated) return;
    activated = true;
    document.removeEventListener('click', activate);
    document.removeEventListener('keydown', activate);
    audio.initAudio();
    audio.resumeAudio();
    activatedAt = performance.now();
    lastTime = performance.now();
    startGameOnNextFrame = true;
  };
  document.addEventListener('click', activate);
  document.addEventListener('keydown', activate);

  lastTime = performance.now();
  rafId = requestAnimationFrame(loop);
}

init();
