// Canyon Courier — the aeroplane. A low-poly bush plane built from primitives
// (fuselage, wings, tail, spinning prop, canopy, gear) and the arcade flight
// model that flies it: throttle, bank, pitch, stall, fuel and ground.
import * as THREE from '../vendor/three.module.min.js';
import { FUEL, PLANE, WORLD } from './config.js';
import { heightAt, pathX } from './terrain.js';

// Build the plane mesh. Red and cream courier paint, so it reads against the
// green valley and the blue sky.
export function buildPlane() {
  const plane = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: 0xc23b2a, roughness: 0.55, metalness: 0.15 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xf2e8d5, roughness: 0.6, metalness: 0.1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 0.7 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x9fd8e8,
    roughness: 0.15,
    metalness: 0.4,
  });

  // Fuselage: a tapered cylinder along z, nose forward (-z is forward here,
  // so the nose cone points -z).
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.62, 6.4, 12), red);
  body.rotation.x = Math.PI / 2;
  plane.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.02, 1.7, 12), cream);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -4.05;
  plane.add(nose);
  const tailCone = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2.2, 10), red);
  tailCone.rotation.x = Math.PI / 2;
  tailCone.position.z = 4.3;
  plane.add(tailCone);

  // Canopy: a half-sphere over the cockpit.
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.85, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), glass);
  canopy.scale.set(1, 0.72, 1.7);
  canopy.position.set(0, 0.75, -0.9);
  plane.add(canopy);

  // Main wings: a wide flat box, slightly swept by scaling the tips in.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.22, 2.1), cream);
  wing.position.set(0, 0.1, -0.4);
  plane.add(wing);
  const wingTipL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.24, 2.1), red);
  wingTipL.position.set(-5.7, 0.1, -0.4);
  plane.add(wingTipL);
  const wingTipR = wingTipL.clone();
  wingTipR.position.x = 5.7;
  plane.add(wingTipR);

  // Tail: horizontal stabiliser and vertical fin.
  const stab = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.16, 1.1), cream);
  stab.position.set(0, 0.35, 4.4);
  plane.add(stab);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.9, 1.5), red);
  fin.position.set(0, 1.05, 4.5);
  plane.add(fin);

  // Propeller: hub plus two blades, spun by the flight model.
  const prop = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.7, 10), dark);
  hub.rotation.x = Math.PI / 2;
  prop.add(hub);
  const bladeGeo = new THREE.BoxGeometry(0.34, 3.4, 0.1);
  const blade1 = new THREE.Mesh(bladeGeo, dark);
  prop.add(blade1);
  const blade2 = new THREE.Mesh(bladeGeo, dark);
  blade2.rotation.z = Math.PI / 2;
  prop.add(blade2);
  prop.position.z = -5.05;
  plane.add(prop);
  plane.userData.prop = prop;

  // Fixed gear: two wheels and struts.
  for (const side of [-1, 1]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.5, 6), dark);
    strut.position.set(side * 1.1, -1.25, -0.6);
    strut.rotation.z = side * 0.35;
    plane.add(strut);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 12), dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(side * 1.35, -1.95, -0.6);
    plane.add(wheel);
  }
  return plane;
}

// Fresh flight state at the south end of the canyon, on the centreline.
export function freshState() {
  const z = -920;
  return {
    x: pathX(z),
    y: 42,
    z,
    heading: 0, // radians, 0 = north (+z)
    pitch: 0,
    roll: 0,
    speed: 0,
    throttle: 0.55,
    fuel: 100,
    damage: 0,
    score: 0,
    ringsPassed: 0,
    crashed: false,
    landed: false,
    cause: '',
    elapsed: 0,
  };
}

// One physics step. input: { roll: -1..1, pitch: -1..1, throttleDelta }.
// Returns 'crash' | 'landed' | null.
export function stepFlight(s, input, dt, mission) {
  if (s.crashed || s.landed) return s.crashed ? 'crash' : 'landed';
  s.elapsed += dt;

  // Throttle and speed.
  s.throttle = Math.max(0, Math.min(1, s.throttle + input.throttleDelta * dt));
  const target = PLANE.minSpeed + s.throttle * (PLANE.maxSpeed - PLANE.minSpeed);
  s.speed += (target - s.speed) * Math.min(1, PLANE.drag * dt);
  if (s.throttle > 0.02) s.speed += PLANE.accel * 0.12 * s.throttle * dt;

  // Bank and pitch answer the stick, then ease back toward level.
  const rollTarget = input.roll * PLANE.maxRoll;
  const pitchTarget = input.pitch * PLANE.maxPitch;
  s.roll += (rollTarget - s.roll) * Math.min(1, PLANE.rollRate * dt);
  s.pitch += (pitchTarget - s.pitch) * Math.min(1, PLANE.pitchRate * dt);
  if (input.roll === 0) s.roll *= Math.max(0, 1 - 1.4 * dt);
  if (input.pitch === 0) s.pitch *= Math.max(0, 1 - 1.8 * dt);

  // Bank turns the plane; the faster the flight, the wider the turn.
  const turnRate = -s.roll * PLANE.turnFactor * (s.speed / PLANE.cruiseSpeed);
  s.heading += turnRate * dt;

  // Climb and sink. Below stall speed the wing gives up and she drops.
  const stalled = s.speed < PLANE.minSpeed + 6;
  const climb = Math.sin(s.pitch) * s.speed;
  const sink = stalled ? PLANE.stallSink : PLANE.baseSink;
  const vy = climb - sink * (1 - s.throttle * 0.4);

  const dx = Math.sin(s.heading) * Math.cos(s.pitch) * s.speed * dt;
  const dz = Math.cos(s.heading) * Math.cos(s.pitch) * s.speed * dt;
  s.x += dx;
  s.z += dz;
  s.y += vy * dt;

  // Fuel burns with the throttle; free flight never burns.
  if (mission.fuelDrain) {
    const drain = FUEL.drainIdle + s.throttle * (FUEL.drainFull - FUEL.drainIdle);
    s.fuel = Math.max(0, s.fuel - drain * dt);
  }

  // World edge: the valley is the world; turn back at the fence.
  const edge = WORLD.half - 60;
  if (Math.abs(s.x) > edge || Math.abs(s.z) > edge) {
    s.heading += Math.PI;
    s.x = Math.max(-edge, Math.min(edge, s.x));
    s.z = Math.max(-edge, Math.min(edge, s.z));
  }

  // Ground and water.
  const ground = heightAt(s.x, s.z);
  const agl = s.y - ground;
  if (s.y <= WORLD.riverY + 0.4 && Math.abs(s.x - pathX(s.z)) < 60) {
    s.crashed = true;
    s.cause = 'Ditched in the river';
    return 'crash';
  }
  if (agl <= PLANE.groundClearance) {
    if (onRunway(s) && s.speed < 52 && Math.abs(s.pitch) < 0.18 && Math.abs(s.roll) < 0.3) {
      s.landed = true;
      s.y = WORLD.runwayY + 1.6;
      return 'landed';
    }
    if (s.speed > PLANE.crashSpeed || vy < -14) {
      s.crashed = true;
      s.cause = 'Flew into the mountainside';
      return 'crash';
    }
    // A hard scrape: bounce off with damage.
    s.damage += 1;
    s.y = ground + 6;
    s.pitch = 0.25;
    s.speed *= 0.72;
    if (s.damage >= 3) {
      s.crashed = true;
      s.cause = 'Airframe gave out after three scrapes';
      return 'crash';
    }
  }
  return null;
}

// True when the plane is over the runway rectangle.
export function onRunway(s) {
  const rz = Math.abs(s.z - WORLD.runwayZ);
  const rx = Math.abs(s.x - pathX(WORLD.runwayZ));
  return rz < WORLD.runwayLength / 2 && rx < WORLD.runwayWidth / 2;
}

// Apply the flight state to the mesh: position, heading, bank and pitch.
// The mesh is built nose-first toward local -z, so the yaw carries an extra
// half turn to point the nose along the direction of travel; the pitch sign
// follows from that flip (nose up while climbing).
export function posePlane(mesh, s) {
  mesh.position.set(s.x, s.y, s.z);
  mesh.rotation.order = 'YXZ';
  mesh.rotation.y = s.heading + Math.PI;
  mesh.rotation.x = s.pitch;
  mesh.rotation.z = -s.roll;
  // The prop spins with the throttle.
  mesh.userData.prop.rotation.z += (4 + s.throttle * 42) * 0.016;
}
