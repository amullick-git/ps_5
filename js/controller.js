/**
 * Controller module — Gamepad polling and keyboard fallback.
 * DualSense: axes 0,1 = left stick; button 9 = Options (pause).
 * Dead zone: 0.15.
 */
const DEAD_ZONE = 0.15;
const TOUCH_JOYSTICK_DEAD_ZONE = 0.08;

const GAME_KEYS = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'Enter', 'Space', 'Escape', 'KeyP', 'KeyZ', 'KeyX',
]);

let keys = {};
let touchMovement = { x: 0, y: 0 };
let touchPausePressed = false;
let touchJoystickEl = null;
let touchJoystickKnobEl = null;
let touchJoystickPointerId = null;

function normalizeMovement(x, y, deadZone = DEAD_ZONE) {
  if (Math.abs(x) < deadZone) x = 0;
  if (Math.abs(y) < deadZone) y = 0;
  if (x === 0 && y === 0) return { x: 0, y: 0 };
  const mag = Math.hypot(x, y);
  if (mag > 1) return { x: x / mag, y: y / mag };
  return { x, y };
}

function isTouchDevice() {
  if (navigator.maxTouchPoints > 0) return true;
  if ('ontouchstart' in window) return true;
  return window.matchMedia?.('(pointer: coarse)').matches ?? false;
}

function resetTouchJoystick() {
  touchMovement = { x: 0, y: 0 };
  touchJoystickPointerId = null;
  if (touchJoystickKnobEl) {
    touchJoystickKnobEl.style.transform = 'translate(0px, 0px)';
  }
}

function setupTouchControls() {
  if (!isTouchDevice()) return;

  document.body.classList.add('touch-device');

  touchJoystickEl = document.getElementById('mobile-joystick');
  touchJoystickKnobEl = document.getElementById('mobile-joystick-knob');
  const pauseBtn = document.getElementById('mobile-pause-btn');
  if (!touchJoystickEl || !touchJoystickKnobEl || !pauseBtn) return;

  const updateTouchMovement = (clientX, clientY) => {
    const rect = touchJoystickEl.getBoundingClientRect();
    const knobRadius = touchJoystickKnobEl.offsetWidth / 2 || 0;
    const maxDistance = Math.max(rect.width / 2 - knobRadius, 1);
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxDistance) {
      const k = maxDistance / dist;
      dx *= k;
      dy *= k;
    }
    touchJoystickKnobEl.style.transform = `translate(${dx}px, ${dy}px)`;
    touchMovement = normalizeMovement(
      dx / maxDistance,
      dy / maxDistance,
      TOUCH_JOYSTICK_DEAD_ZONE
    );
  };

  touchJoystickEl.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    touchJoystickPointerId = e.pointerId;
    touchJoystickEl.setPointerCapture?.(e.pointerId);
    updateTouchMovement(e.clientX, e.clientY);
    e.preventDefault();
  });

  touchJoystickEl.addEventListener('pointermove', (e) => {
    if (e.pointerId !== touchJoystickPointerId) return;
    updateTouchMovement(e.clientX, e.clientY);
    e.preventDefault();
  });

  const endJoystick = (e) => {
    if (touchJoystickPointerId == null || e.pointerId === touchJoystickPointerId) {
      resetTouchJoystick();
      e.preventDefault();
    }
  };
  touchJoystickEl.addEventListener('pointerup', endJoystick);
  touchJoystickEl.addEventListener('pointercancel', endJoystick);

  pauseBtn.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    touchPausePressed = true;
    e.preventDefault();
  });
  pauseBtn.addEventListener('click', (e) => e.preventDefault());

  window.addEventListener('blur', () => {
    keys = {};
    touchPausePressed = false;
    resetTouchJoystick();
  });
}

export function initController() {
  window.addEventListener('gamepadconnected', () => {});
  window.addEventListener('gamepaddisconnected', () => {});

  window.addEventListener('keydown', (e) => {
    if (GAME_KEYS.has(e.code)) {
      e.preventDefault();
    }
    keys[e.code] = true;
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  setupTouchControls();
}

/**
 * Returns normalized movement vector { x, y } from -1 to 1.
 * Magnitude capped at 1.
 */
export function getMovement() {
  const gp = navigator.getGamepads?.();
  const pad = gp?.[0];

  if (pad) {
    const movement = normalizeMovement(pad.axes[0] ?? 0, pad.axes[1] ?? 0, DEAD_ZONE);
    if (movement.x !== 0 || movement.y !== 0) return movement;
  }

  // Keyboard fallback
  let x = 0, y = 0;
  if (keys['KeyA'] || keys['ArrowLeft']) x -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) x += 1;
  if (keys['KeyW'] || keys['ArrowUp']) y -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) y += 1;

  const keyboardMovement = normalizeMovement(x, y, 0);
  if (keyboardMovement.x !== 0 || keyboardMovement.y !== 0) return keyboardMovement;

  if (touchMovement.x !== 0 || touchMovement.y !== 0) return touchMovement;

  return { x: 0, y: 0 };
}

/**
 * Returns true if any action button was pressed this frame.
 * Used for: start game, restart.
 */
export function getAnyButtonPressed() {
  const gp = navigator.getGamepads?.();
  const pad = gp?.[0];

  if (pad) {
    for (let i = 0; i < pad.buttons.length; i++) {
      if (pad.buttons[i]?.pressed) return true;
    }
  }

  return keys['Enter'] || keys['Space'] || keys['KeyZ'] || keys['KeyX'] ||
    keys['ArrowLeft'] || keys['ArrowRight'] || keys['ArrowUp'] || keys['ArrowDown'] ||
    keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD'];
}

/**
 * Returns true if Options (pause) was pressed.
 * DualSense: button 9 = Options, button 10 = Touchpad (some use for pause).
 */
export function getPausePressed() {
  if (touchPausePressed) {
    touchPausePressed = false; // one-shot touch button
    return true;
  }

  const gp = navigator.getGamepads?.();
  const pad = gp?.[0];
  if (pad) {
    if (pad.buttons[9]?.pressed) return true;  // Options (DualSense)
    if (pad.buttons[10]?.pressed) return true; // Touchpad / Start (fallback)
  }
  return keys['Escape'] || keys['KeyP'];
}

/**
 * Clear key state (call when transitioning to avoid accidental double-triggers)
 */
export function clearButtonState() {
  keys = {};
  touchPausePressed = false;
  resetTouchJoystick();
}

/**
 * Trigger haptic feedback on the connected gamepad.
 * Uses playEffect("dual-rumble") when available (better DualSense support), else pulse().
 * @param {'collect'|'collision'|'nearMiss'|'levelUp'} type - Event type for different patterns
 */
let _hapticWarned = false;

export function triggerHaptic(type) {
  const pad = navigator.getGamepads?.()?.[0];
  const actuator = pad?.vibrationActuator ?? pad?.hapticActuators?.[0];
  if (!actuator) {
    if (!_hapticWarned) {
      _hapticWarned = true;
      console.info('[Dodge Run] Haptic: No actuator on this controller/browser. On macOS, haptics do not work in browsers.');
    }
    return;
  }

  // Stronger, longer patterns — user wasn't feeling weaker ones
  const patterns = {
    collect: { intensity: 0.7, duration: 120 },
    collision: { intensity: 1, duration: 350 },
    nearMiss: { intensity: 0.6, duration: 100 },
    levelUp: { intensity: 0.9, duration: 180 },
  };
  const { intensity, duration } = patterns[type] ?? { intensity: 0.8, duration: 150 };

  const usePlayEffect = actuator.playEffect && (actuator.effects?.includes?.('dual-rumble') ?? true);
  if (usePlayEffect) {
    actuator.playEffect('dual-rumble', {
      duration,
      strongMagnitude: intensity,
      weakMagnitude: intensity * 0.8,
      startDelay: 0,
    }).catch(() => {});
  } else if (actuator.pulse) {
    actuator.pulse(intensity, duration);
  }

  if (type === 'levelUp' && actuator) {
    setTimeout(() => {
      if (usePlayEffect) {
        actuator.playEffect('dual-rumble', { duration: 100, strongMagnitude: 0.6, weakMagnitude: 0.5, startDelay: 0 }).catch(() => {});
      } else if (actuator.pulse) {
        actuator.pulse(0.6, 100);
      }
    }, 120);
  }
}
