// Canyon Courier — keyboard and mouse. Arrows steer, W/S work the throttle,
// R restarts, P pauses, M mutes. The title screen also takes clicks, so the
// game plays with keyboard and mouse together.
export function createInput() {
  const keys = new Set();
  const pressed = new Set();
  let onKey = null;

  function down(e) {
    if (e.repeat) return;
    keys.add(e.code);
    pressed.add(e.code);
    if (onKey) onKey(e.code);
    if (
      e.code === 'ArrowUp' ||
      e.code === 'ArrowDown' ||
      e.code === 'ArrowLeft' ||
      e.code === 'ArrowRight' ||
      e.code === 'Space'
    ) {
      e.preventDefault();
    }
  }
  function up(e) {
    keys.delete(e.code);
  }
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);

  return {
    // -1..1 roll: left is negative, right is positive.
    roll() {
      let r = 0;
      if (keys.has('ArrowLeft') || keys.has('KeyA')) r -= 1;
      if (keys.has('ArrowRight') || keys.has('KeyD')) r += 1;
      return r;
    },
    // -1..1 pitch: up climbs, down descends (arcade, labelled on screen).
    pitch() {
      let p = 0;
      if (keys.has('ArrowUp') || keys.has('KeyW')) p += 1;
      if (keys.has('ArrowDown') || keys.has('KeyS')) p -= 1;
      return p;
    },
    // Throttle steps: Shift / W up, Control / S down. W and S also pitch,
    // so throttle lives on Shift and Control alone.
    throttleDelta() {
      let d = 0;
      if (keys.has('ShiftLeft') || keys.has('ShiftRight')) d += 0.55;
      if (keys.has('ControlLeft') || keys.has('ControlRight')) d -= 0.55;
      return d;
    },
    // True once for a key pressed since the last call.
    wasPressed(code) {
      const hit = pressed.has(code);
      if (hit) pressed.delete(code);
      return hit;
    },
    has(code) {
      return keys.has(code);
    },
    onKeyPress(fn) {
      onKey = fn;
    },
  };
}
