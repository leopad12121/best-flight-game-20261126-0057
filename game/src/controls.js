// Keyboard and pointer input. Held keys give a steering state the loop reads
// every frame; one-shot presses (start, restart, pause) are queued as flags
// and taken once, so a press between two frames is never lost or counted
// twice. A held pointer steers the aircraft toward it, so the game also
// plays with mouse or touch.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

const CLIMB = new Set(['ArrowUp', 'KeyW', 'Space']);
const DIVE = new Set(['ArrowDown', 'KeyS']);
const FASTER = new Set(['ArrowRight', 'KeyD']);
const SLOWER = new Set(['ArrowLeft', 'KeyA']);
const CONFIRM = new Set(['Enter', 'Space']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createControls(canvas) {
  let climb = false;
  let dive = false;
  let faster = false;
  let slower = false;
  let actions = 0;
  /** Pointer height in logical field pixels, or null when no pointer is held. */
  let pointerY = null;
  let pointerDown = false;

  function press(event) {
    // Space is both a climb key and a confirm key: test each set on its
    // own, so a key in two sets still fires both jobs.
    let handled = false;
    if (CLIMB.has(event.code)) { climb = true; handled = true; }
    if (DIVE.has(event.code)) { dive = true; handled = true; }
    if (FASTER.has(event.code)) { faster = true; handled = true; }
    if (SLOWER.has(event.code)) { slower = true; handled = true; }
    if (CONFIRM.has(event.code) && !event.repeat) { actions |= ACTION_CONFIRM; handled = true; }
    if (PAUSE.has(event.code) && !event.repeat) { actions |= ACTION_PAUSE; handled = true; }
    if (handled) event.preventDefault();
  }

  function release(event) {
    if (CLIMB.has(event.code)) climb = false;
    else if (DIVE.has(event.code)) dive = false;
    else if (FASTER.has(event.code)) faster = false;
    else if (SLOWER.has(event.code)) slower = false;
  }

  function pointerToField(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = 720 / rect.height;
    return (event.clientY - rect.top) * scale;
  }

  window.addEventListener('keydown', press);
  window.addEventListener('keyup', release);
  window.addEventListener('blur', () => {
    climb = dive = faster = slower = false;
    pointerY = null;
    pointerDown = false;
  });

  canvas.addEventListener('pointerdown', (event) => {
    pointerDown = true;
    pointerY = pointerToField(event);
    actions |= ACTION_CONFIRM;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (pointerDown) pointerY = pointerToField(event);
  });
  canvas.addEventListener('pointerup', () => {
    pointerDown = false;
    pointerY = null;
  });
  canvas.addEventListener('pointercancel', () => {
    pointerDown = false;
    pointerY = null;
  });

  return {
    /** -1 to climb, +1 to dive, 0 for level, from keys or pointer. */
    pitch(planeY) {
      if (pointerY !== null) {
        const gap = pointerY - planeY;
        if (gap < -14) return -1;
        if (gap > 14) return 1;
        return 0;
      }
      return (dive ? 1 : 0) - (climb ? 1 : 0);
    },
    /** -1 to ease off, +1 for full throttle, 0 to hold. */
    throttle() {
      return (faster ? 1 : 0) - (slower ? 1 : 0);
    },
    /** True while the pointer is held down on the canvas. */
    get pointerHeld() {
      return pointerDown;
    },
    /** One-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
