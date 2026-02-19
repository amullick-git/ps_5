/**
 * Controller module — Gamepad polling, keyboard fallback, and touch joystick.
 * DualSense: axes 0,1 = left stick; button 9 = Options (pause).
 * Dead zone: 0.15.
 */
const DEAD_ZONE = 0.15;

const GAME_KEYS = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'Enter', 'Space', 'Escape', 'KeyP', 'KeyZ', 'KeyX',
]);

let keys = {};

let touchJoystick = { x: 0, y: 0, active: false };
let _joystickTouchId = null;
let _joystickBase = null;
let _joystickKnob = null;
const JOYSTICK_RADIUS = 50;

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
}

export function initTouchJoystick(baseEl, knobEl) {
  _joystickBase = baseEl;
  _joystickKnob = knobEl;
  if (!baseEl) return;

  baseEl.addEventListener('touchstart', onJoystickTouchStart, { passive: false });
  document.addEventListener('touchmove', onJoystickTouchMove, { passive: false });
  document.addEventListener('touchend', onJoystickTouchEnd, { passive: false });
  document.addEventListener('touchcancel', onJoystickTouchEnd, { passive: false });
}

function onJoystickTouchStart(e) {
  if (_joystickTouchId !== null) return;
  e.preventDefault();
  const touch = e.changedTouches[0];
  _joystickTouchId = touch.identifier;
  updateJoystickFromTouch(touch);
}

function onJoystickTouchMove(e) {
  if (_joystickTouchId === null) return;
  for (const touch of e.changedTouches) {
    if (touch.identifier === _joystickTouchId) {
      e.preventDefault();
      updateJoystickFromTouch(touch);
      return;
    }
  }
}

function onJoystickTouchEnd(e) {
  for (const touch of e.changedTouches) {
    if (touch.identifier === _joystickTouchId) {
      _joystickTouchId = null;
      touchJoystick.x = 0;
      touchJoystick.y = 0;
      touchJoystick.active = false;
      if (_joystickKnob) {
        _joystickKnob.style.transform = 'translate(-50%, -50%)';
      }
      return;
    }
  }
}

function updateJoystickFromTouch(touch) {
  if (!_joystickBase) return;
  const rect = _joystickBase.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  let dx = touch.clientX - centerX;
  let dy = touch.clientY - centerY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > JOYSTICK_RADIUS) {
    dx = (dx / dist) * JOYSTICK_RADIUS;
    dy = (dy / dist) * JOYSTICK_RADIUS;
  }

  touchJoystick.x = dx / JOYSTICK_RADIUS;
  touchJoystick.y = dy / JOYSTICK_RADIUS;
  touchJoystick.active = true;

  if (_joystickKnob) {
    _joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }
}

/**
 * Returns normalized movement vector { x, y } from -1 to 1.
 * Magnitude capped at 1.
 */
export function getMovement() {
  // Touch joystick takes priority on mobile
  if (touchJoystick.active) {
    let x = touchJoystick.x;
    let y = touchJoystick.y;
    if (Math.abs(x) < DEAD_ZONE) x = 0;
    if (Math.abs(y) < DEAD_ZONE) y = 0;
    if (x !== 0 || y !== 0) {
      const mag = Math.sqrt(x * x + y * y);
      if (mag > 1) { x /= mag; y /= mag; }
      return { x, y };
    }
  }

  const gp = navigator.getGamepads?.();
  const pad = gp?.[0];

  if (pad) {
    let x = pad.axes[0] ?? 0;
    let y = pad.axes[1] ?? 0;

    if (Math.abs(x) < DEAD_ZONE) x = 0;
    if (Math.abs(y) < DEAD_ZONE) y = 0;

    if (x !== 0 || y !== 0) {
      const mag = Math.sqrt(x * x + y * y);
      if (mag > 1) {
        x /= mag;
        y /= mag;
      }
      return { x, y };
    }
  }

  // Keyboard fallback
  let x = 0, y = 0;
  if (keys['KeyA'] || keys['ArrowLeft']) x -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) x += 1;
  if (keys['KeyW'] || keys['ArrowUp']) y -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) y += 1;

  if (x !== 0 || y !== 0) {
    const mag = Math.sqrt(x * x + y * y);
    if (mag > 1) {
      x /= mag;
      y /= mag;
    }
    return { x, y };
  }

  return { x: 0, y: 0 };
}

export function isTouchDevice() {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
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
