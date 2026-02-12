/**
 * Controller module — Gamepad polling and keyboard fallback.
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
 * Button 9 = Options on DualSense.
 */
export function getPausePressed() {
  const gp = navigator.getGamepads?.();
  const pad = gp?.[0];
  if (pad?.buttons[9]?.pressed) return true;
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
