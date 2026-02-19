/**
 * Controller module — Gamepad polling, touch (virtual stick), and keyboard fallback.
 * DualSense: axes 0,1 = left stick; button 9 = Options (pause).
 * Dead zone: 0.15.
 */
const DEAD_ZONE = 0.15;
const TOUCH_STICK_RADIUS_PX = 60;
const TOUCH_DEAD_ZONE = 0.08;

const GAME_KEYS = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'Enter', 'Space', 'Escape', 'KeyP', 'KeyZ', 'KeyX',
]);

let keys = {};
let touchActive = false;
let touchPointerId = null;
let touchOrigin = { x: 0, y: 0 };
let touchCurrent = { x: 0, y: 0 };
let touchVec = { x: 0, y: 0 };
let touchPausePressed = false;

function clamp01(v) {
  return Math.max(-1, Math.min(1, v));
}

function setTouchVectorFromDelta(dx, dy) {
  let x = clamp01(dx / TOUCH_STICK_RADIUS_PX);
  let y = clamp01(dy / TOUCH_STICK_RADIUS_PX);
  const mag = Math.sqrt(x * x + y * y);
  if (mag < TOUCH_DEAD_ZONE) {
    touchVec = { x: 0, y: 0 };
    return;
  }
  if (mag > 1) {
    x /= mag;
    y /= mag;
  }
  touchVec = { x, y };
}

function updateJoystickUI() {
  const joy = document.getElementById('touch-joystick');
  const knob = document.getElementById('touch-joystick-knob');
  const container = document.getElementById('game-container');
  if (!joy || !knob || !container) return;
  if (!touchActive) {
    joy.classList.add('hidden');
    return;
  }
  const rect = container.getBoundingClientRect();
  const ox = touchOrigin.x - rect.left;
  const oy = touchOrigin.y - rect.top;
  const cx = touchCurrent.x - rect.left;
  const cy = touchCurrent.y - rect.top;
  joy.classList.remove('hidden');
  joy.style.left = `${ox}px`;
  joy.style.top = `${oy}px`;
  const dx = cx - ox;
  const dy = cy - oy;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const max = TOUCH_STICK_RADIUS_PX;
  const scale = dist > max ? max / dist : 1;
  knob.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
}

export function initController() {
  window.addEventListener('gamepadconnected', () => {});
  window.addEventListener('gamepaddisconnected', () => {});

  const canvas = document.getElementById('game-canvas');
  if (canvas) {
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return;
      if (touchActive) return;
      const interactive = e.target?.closest?.('button,input,label,select,textarea,a');
      if (interactive) return;
      touchActive = true;
      touchPointerId = e.pointerId;
      touchOrigin = { x: e.clientX, y: e.clientY };
      touchCurrent = { x: e.clientX, y: e.clientY };
      touchVec = { x: 0, y: 0 };
      updateJoystickUI();
      try { e.preventDefault(); } catch {}
    }, { passive: false });

    window.addEventListener('pointermove', (e) => {
      if (!touchActive || e.pointerId !== touchPointerId) return;
      touchCurrent = { x: e.clientX, y: e.clientY };
      setTouchVectorFromDelta(touchCurrent.x - touchOrigin.x, touchCurrent.y - touchOrigin.y);
      updateJoystickUI();
      try { e.preventDefault(); } catch {}
    }, { passive: false });

    const endTouch = (e) => {
      if (!touchActive || e.pointerId !== touchPointerId) return;
      touchActive = false;
      touchPointerId = null;
      touchVec = { x: 0, y: 0 };
      updateJoystickUI();
      try { e.preventDefault(); } catch {}
    };
    window.addEventListener('pointerup', endTouch, { passive: false });
    window.addEventListener('pointercancel', endTouch, { passive: false });
  }

  const pauseBtn = document.getElementById('touch-pause');
  if (pauseBtn) {
    const onPause = (e) => {
      touchPausePressed = true;
      e?.preventDefault?.();
      e?.stopPropagation?.();
    };
    pauseBtn.addEventListener('pointerdown', onPause);
  }

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

/**
 * Returns normalized movement vector { x, y } from -1 to 1.
 * Magnitude capped at 1.
 */
export function getMovement() {
  const gp = navigator.getGamepads?.();
  const pad = gp?.[0];

  if (pad) {
    let x = pad.axes[0] ?? 0;
    let y = pad.axes[1] ?? 0;

    // Dead zone
    if (Math.abs(x) < DEAD_ZONE) x = 0;
    if (Math.abs(y) < DEAD_ZONE) y = 0;

    if (x !== 0 || y !== 0) {
      // Normalize and cap magnitude
      const mag = Math.sqrt(x * x + y * y);
      if (mag > 1) {
        x /= mag;
        y /= mag;
      }
      return { x, y };
    }
  }

  if (touchVec.x !== 0 || touchVec.y !== 0) {
    return touchVec;
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
  if (touchPausePressed) {
    touchPausePressed = false;
    return true;
  }
  return keys['Escape'] || keys['KeyP'];
}

/**
 * Clear key state (call when transitioning to avoid accidental double-triggers)
 */
export function clearButtonState() {
  keys = {};
  touchActive = false;
  touchPointerId = null;
  touchVec = { x: 0, y: 0 };
  touchPausePressed = false;
  updateJoystickUI();
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
