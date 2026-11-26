// Canyon Courier — screenshot scenes. ?shot=start|play|ring|land&seed=N stages
// a deterministic frame by playing the real rules forward with a simple
// autopilot (steer at the next ring, hold the throttle), so each screenshot
// is what a short flight really looks like and the same seed always gives
// the same frame. The maker runs the game, not a render.
import { RINGS, WORLD } from './config.js';
import { stepFlight } from './plane.js';
import { checkRing, nextRing } from './rings.js';
import { heightAt, pathX } from './terrain.js';

const STEP = 1 / 60;
const PLAY_SECONDS = 12;
const PLAY_RINGS = 4;
const RING_SECONDS = 31;

// Steer at the next ring: bank toward its bearing, pitch toward its height.
// A positive dh means the target is left of the nose; banking left is a
// negative roll, so the roll is the negative of the heading error.
function autopilot(s, rings) {
  const target = nextRing(rings);
  if (!target) return { roll: 0, pitch: 0, throttleDelta: 0 };
  const dx = target.x - s.x;
  const dz = target.z - s.z;
  const wantHeading = Math.atan2(dx, dz);
  let dh = wantHeading - s.heading;
  while (dh > Math.PI) dh -= Math.PI * 2;
  while (dh < -Math.PI) dh += Math.PI * 2;
  const roll = Math.max(-1, Math.min(1, -dh * 1.6));
  const dy = target.y - s.y;
  const pitch = Math.max(-1, Math.min(1, dy * 0.03));
  return { roll, pitch, throttleDelta: 0.3 };
}

// Play the rules forward for `seconds`, steering with the autopilot, and
// return what the frame should show.
export function stageShot(name, s, rings, mission) {
  if (name === 'start') {
    // Parked on the strip at dawn light: the title frame. On the runway
    // centreline, wheels on the tarmac, nose up the valley.
    s.x = pathX(WORLD.runwayZ);
    s.z = WORLD.runwayZ - 80;
    s.y = WORLD.runwayY + 1.6;
    s.heading = 0;
    s.speed = 0;
    s.throttle = 0;
    return { screen: 'title', message: '' };
  }
  if (name === 'land') {
    // Final approach: start on the runway centreline extended and fly a
    // short, steady final — low, level, lined up on the strip — and hold
    // the frame there. A fixed four seconds, so she never reaches the
    // threshold and never has to turn around.
    s.x = pathX(WORLD.runwayZ);
    s.z = 480;
    s.y = 55;
    s.heading = 0;
    s.speed = 48;
    s.throttle = 0.3;
    const threshold = { x: pathX(WORLD.runwayZ), y: WORLD.runwayY + 6, z: WORLD.runwayZ };
    for (let i = 0; i < 4 / STEP; i += 1) {
      const dx = threshold.x - s.x;
      const dz = threshold.z - s.z;
      const want = Math.atan2(dx, dz);
      let dh = want - s.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      const dy = threshold.y - s.y;
      const input = {
        roll: Math.max(-1, Math.min(1, -dh * 0.8)),
        pitch: Math.max(-0.2, Math.min(0.2, dy * 0.02)),
        throttleDelta: -0.02,
      };
      if (stepFlight(s, input, STEP, mission)) break;
    }
    return { screen: 'play', message: 'FINAL — FLAPS DOWN, STRIP AHEAD' };
  }
  const seconds = name === 'ring' ? RING_SECONDS : PLAY_SECONDS;
  const stopAfter = name === 'ring' ? rings.length : PLAY_RINGS;
  let message = '';
  for (let i = 0; i < seconds / STEP; i += 1) {
    const input = autopilot(s, rings);
    if (stepFlight(s, input, STEP, mission)) break;
    const target = nextRing(rings);
    if (target && checkRing(target, s)) {
      s.ringsPassed += 1;
      s.score += target.kind === 'blue' ? RINGS.blueScore : RINGS.goldScore;
      if (target.kind === 'blue') s.fuel = Math.min(100, s.fuel + 34);
      message = target.kind === 'blue' ? 'RING + FUEL' : 'RING +100';
    }
    if (s.ringsPassed >= stopAfter) break;
  }
  // Keep the frame honest: if the autopilot crashed, say so in the message.
  if (s.crashed) message = 'AUTOPILOT ' + s.cause;
  return { screen: 'play', message };
}

// The height of the ground under the plane, for the HUD.
export function groundBelow(s) {
  return heightAt(s.x, s.z);
}
