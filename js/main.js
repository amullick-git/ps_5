/**
 * Main entry — init, state machine, game loop.
 */

import { initController, getMovement, getAnyButtonPressed, getPausePressed, clearButtonState } from './controller.js';
import { createPlayer, resetPlayer } from './player.js';
import { createObstacleSpawner } from './obstacle.js';
import { createGame } from './game.js';
import * as ui from './ui.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const WIDTH = 800;
const HEIGHT = 600;

function resizeCanvas() {
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
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
  obstacleSpawner.reset();
  highScore = ui.getHighScore();
  ui.showPlaying(score, highScore);
  gameInstance = createGame(canvas, player, obstacleSpawner, onGameOver, addScore);
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
      startPlaying();
    }
  }

  lastPausePressed = pauseBtn;

  // Always render (menu shows overlay; playing/paused show game)
  if (state === 'PLAYING' || state === 'PAUSED') {
    gameInstance.render();
  } else if (state === 'MENU' || state === 'GAME_OVER') {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  rafId = requestAnimationFrame(loop);
}

let lastTime = 0;

function init() {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  initController();
  ui.showMenu();

  // Start loop on first user interaction (required for Gamepad API)
  const start = () => {
    document.removeEventListener('click', start);
    document.removeEventListener('keydown', start);
    lastTime = performance.now();
    startGameOnNextFrame = true;
    rafId = requestAnimationFrame(loop);
  };
  document.addEventListener('click', start);
  document.addEventListener('keydown', start);
}

init();
