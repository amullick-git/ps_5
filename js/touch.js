/**
 * Touch controls for mobile — virtual joystick and pause button.
 * Used when no gamepad or keyboard input is active.
 */

let touchMovement = { x: 0, y: 0 };
let pauseButtonTapped = false;
let joystickActive = false;

export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Returns current touch movement vector { x, y } from -1 to 1.
 */
export function getTouchMovement() {
  return { ...touchMovement };
}

/**
 * Returns true if the on-screen pause button was tapped this frame.
 * Call consumePauseTap() after reading to clear.
 */
export function wasPauseTapped() {
  return pauseButtonTapped;
}

export function consumePauseTap() {
  const v = pauseButtonTapped;
  pauseButtonTapped = false;
  return v;
}

/**
 * Initialize touch controls: virtual joystick and pause button.
 * Call after DOM is ready. Touch controls are only shown on touch devices.
 */
export function initTouchControls() {
  if (!isTouchDevice()) return;

  const container = document.getElementById('game-container');
  if (!container) return;

  // Virtual joystick
  const joystickBase = document.createElement('div');
  joystickBase.id = 'touch-joystick';
  joystickBase.className = 'touch-joystick-base';
  joystickBase.setAttribute('aria-hidden', 'true');

  const joystickStick = document.createElement('div');
  joystickStick.className = 'touch-joystick-stick';

  joystickBase.appendChild(joystickStick);
  container.appendChild(joystickBase);

  const BASE_RADIUS = 60;
  const STICK_RADIUS = 28;
  let activeTouchId = null;
  let baseRect = { x: 0, y: 0, cx: 0, cy: 0 };

  function updateBaseRect() {
    const r = joystickBase.getBoundingClientRect();
    baseRect = {
      x: r.left, y: r.top,
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      radius: Math.min(r.width, r.height) / 2,
    };
  }

  function stickPositionToMovement(dx, dy) {
    const r = baseRect.radius || BASE_RADIUS;
    let x = dx / r;
    let y = dy / r;
    const mag = Math.sqrt(x * x + y * y);
    if (mag > 1) {
      x /= mag;
      y /= mag;
    }
    const deadZone = 0.15;
    if (Math.abs(x) < deadZone) x = 0;
    if (Math.abs(y) < deadZone) y = 0;
    return { x, y };
  }

  function moveStick(clientX, clientY) {
    const dx = clientX - baseRect.cx;
    const dy = clientY - baseRect.cy;
    const mov = stickPositionToMovement(dx, dy);
    touchMovement.x = mov.x;
    touchMovement.y = mov.y;

    const r = baseRect.radius || BASE_RADIUS;
    const dist = Math.min(Math.hypot(dx, dy), r - STICK_RADIUS);
    const angle = Math.atan2(dy, dx);
    joystickStick.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
  }

  function releaseJoystick() {
    activeTouchId = null;
    joystickActive = false;
    touchMovement = { x: 0, y: 0 };
    joystickStick.style.transform = 'translate(0, 0)';
  }

  joystickBase.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (activeTouchId != null) return;
    updateBaseRect();
    const t = e.changedTouches[0];
    activeTouchId = t.identifier;
    joystickActive = true;
    moveStick(t.clientX, t.clientY);
  }, { passive: false });

  joystickBase.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const t = Array.from(e.changedTouches).find(touch => touch.identifier === activeTouchId) || e.changedTouches[0];
    if (t) moveStick(t.clientX, t.clientY);
  }, { passive: false });

  joystickBase.addEventListener('touchend', (e) => {
    const t = Array.from(e.changedTouches).find(touch => touch.identifier === activeTouchId);
    if (t) releaseJoystick();
  }, { passive: true });

  joystickBase.addEventListener('touchcancel', () => releaseJoystick(), { passive: true });

  // Pause button — use pointerup to avoid duplicate fire from touch+click
  const pauseBtn = document.createElement('button');
  pauseBtn.id = 'touch-pause-btn';
  pauseBtn.className = 'touch-pause-btn';
  pauseBtn.type = 'button';
  pauseBtn.setAttribute('aria-label', 'Pause');
  pauseBtn.innerHTML = '⏸';
  pauseBtn.addEventListener('pointerup', (e) => {
    e.preventDefault();
    e.stopPropagation();
    pauseButtonTapped = true;
  });
  container.appendChild(pauseBtn);

  // Hide touch controls initially; ui.js will show when playing
  joystickBase.classList.add('hidden');
  pauseBtn.classList.add('hidden');

  return {
    joystickBase,
    pauseBtn,
  };
}

/**
 * Show touch controls (when game is playing on touch device).
 */
export function showTouchControls() {
  if (!isTouchDevice()) return;
  document.getElementById('touch-joystick')?.classList.remove('hidden');
  document.getElementById('touch-pause-btn')?.classList.remove('hidden');
}

/**
 * Hide touch controls (menu, game over).
 */
export function hideTouchControls() {
  document.getElementById('touch-joystick')?.classList.add('hidden');
  document.getElementById('touch-pause-btn')?.classList.add('hidden');
  touchMovement = { x: 0, y: 0 };
  pauseButtonTapped = false;
}
