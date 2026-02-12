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
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  renderer3d.resize?.(WIDTH, HEIGHT);
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

function startPlaying() {
  state = 'PLAYING';
  score = 0;
  resetPlayer(player, WIDTH, HEIGHT);
  highScore = ui.getHighScore();
  ui.showPlaying(score, highScore);
  gameInstance = createGame(canvas, player, obstacleSpawner, onGameOver, addScore);
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

function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

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
  resizeCanvas();
  renderer3d.init(canvas, WIDTH, HEIGHT);
  window.addEventListener('resize', resizeCanvas);
  initController();
  ui.showMenu();

  // Start loop on first user interaction (required for Gamepad API + Audio)
  const start = () => {
    document.removeEventListener('click', start);
    document.removeEventListener('keydown', start);
    audio.initAudio();
    audio.resumeAudio();
    lastTime = performance.now();
    startGameOnNextFrame = true;
    rafId = requestAnimationFrame(loop);
  };
  document.addEventListener('click', start);
  document.addEventListener('keydown', start);
}

init();
