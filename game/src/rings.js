// Canyon Courier — the rings. Gold rings score; blue rings score and refill
// the tank. Each ring hangs on the canyon centreline at its station, turned
// to face the pilot flying up the valley, and lights up when flown through.
import * as THREE from '../vendor/three.module.min.js';
import { RINGS } from './config.js';
import { heightAt, pathX } from './terrain.js';

// Ring centres for a mission: the first `count` stations, each lifted above
// the valley floor. Returns [{ x, y, z, kind, passed, mesh }].
export function buildRings(scene, count) {
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd8a018,
    emissive: 0x8a5f00,
    emissiveIntensity: 0.55,
    roughness: 0.35,
    metalness: 0.6,
  });
  const blueMat = new THREE.MeshStandardMaterial({
    color: 0x2f9fd8,
    emissive: 0x0a4a72,
    emissiveIntensity: 0.7,
    roughness: 0.35,
    metalness: 0.6,
  });
  const geo = new THREE.TorusGeometry(RINGS.radius, RINGS.tube, 12, 40);
  const rings = [];
  for (let i = 0; i < count; i += 1) {
    const st = RINGS.stations[i];
    const x = pathX(st.z);
    const y = heightAt(x, st.z) + st.lift;
    const mesh = new THREE.Mesh(geo, st.kind === 'blue' ? blueMat : goldMat);
    mesh.position.set(x, y, st.z);
    // Face the pilot: the torus plane stands across the valley, its normal
    // along the centreline's direction of travel.
    const ahead = pathX(st.z + 30) - pathX(st.z - 30);
    mesh.rotation.y = Math.atan2(ahead, 60);
    mesh.userData.baseY = y;
    scene.add(mesh);
    rings.push({ x, y, z: st.z, kind: st.kind, passed: false, mesh });
  }
  return rings;
}

// True when the plane is inside the ring's hoop: close to its plane and
// within its radius. The ring flips to passed and flashes.
export function checkRing(ring, s) {
  if (ring.passed) return false;
  const dx = s.x - ring.x;
  const dy = s.y - ring.y;
  const dz = s.z - ring.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist > RINGS.radius * 1.15) return false;
  // The plane must cross the hoop's plane, not just fly near it.
  if (Math.abs(dz) > 9 && Math.abs(dx) > 9) return false;
  ring.passed = true;
  ring.mesh.material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 1.4,
    roughness: 0.3,
    metalness: 0.2,
  });
  return true;
}

// The next ring the pilot should aim for, or null when all are passed.
export function nextRing(rings) {
  for (let i = 0; i < rings.length; i += 1) {
    if (!rings[i].passed) return rings[i];
  }
  return null;
}

// Gentle bob and spin so the rings read as alive, not painted on.
export function animateRings(rings, t) {
  for (let i = 0; i < rings.length; i += 1) {
    const r = rings[i];
    if (r.passed) continue;
    r.mesh.position.y = r.mesh.userData.baseY + Math.sin(t * 1.2 + i * 1.7) * 1.6;
    r.mesh.rotation.z = Math.sin(t * 0.5 + i) * 0.05;
  }
}
