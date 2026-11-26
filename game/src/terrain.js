// Canyon Courier — the valley. A seeded heightmap carves a winding canyon
// with a river on its floor, walls that rise to pine and snow, a flat strip
// for the runway, and the trees, rocks and clouds that dress it. The same
// heightAt() the mesh is built from is what the flight model collides with.
import * as THREE from '../vendor/three.module.min.js';
import { WORLD } from './config.js';
import { makeFbm, mulberry32 } from './random.js';

const hills = makeFbm(1337, 420, 4);
const detail = makeFbm(9182, 90, 3);

// The canyon centreline: x as a function of z.
export function pathX(z) {
  return (
    WORLD.pathAmp1 * Math.sin(z * WORLD.pathFreq1) +
    WORLD.pathAmp2 * Math.sin(z * WORLD.pathFreq2 + WORLD.pathPhase2)
  );
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smooth01(t) {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
}

// Height of the ground at (x, z), in metres. The runway rectangle is forced
// flat so a landing reads; everywhere else the canyon carve blends into the
// hills.
export function heightAt(x, z) {
  const d = Math.abs(x - pathX(z));
  const floor = 2 + hills(x * 0.35, z * 0.35) * 5;
  const wall = 14 + hills(x, z) * 170 + detail(x, z) * 26;
  const t = smooth01((d - WORLD.floorHalf) / WORLD.wallBlend);
  let h = floor + (wall - floor) * t;
  // The outer rim climbs into peaks so the valley reads as a valley.
  const rim = smooth01((Math.max(Math.abs(x), Math.abs(z)) - 780) / 420);
  h += rim * 130 * (0.5 + hills(x * 0.5 + 40, z * 0.5) * 0.8);
  // Runway: a flat pad on the centreline.
  const rz = Math.abs(z - WORLD.runwayZ);
  const rx = Math.abs(x - pathX(WORLD.runwayZ));
  if (rz < WORLD.runwayLength / 2 + 30 && rx < WORLD.runwayWidth / 2 + 30) {
    const edge = smooth01(
      Math.max(
        (rz - WORLD.runwayLength / 2) / 30,
        (rx - WORLD.runwayWidth / 2) / 30,
      ),
    );
    h = WORLD.runwayY + (h - WORLD.runwayY) * edge;
  }
  return h;
}

function groundColor(h, slope, out) {
  // Valley grass, dry sand near the river, grey rock on the steep, snow high.
  if (h > 150) return out.setRGB(0.92, 0.93, 0.95);
  if (slope > 0.55) return out.setRGB(0.42, 0.36, 0.31);
  if (h < 10) return out.setRGB(0.55, 0.58, 0.32);
  if (h < 46) return out.setRGB(0.32, 0.48, 0.24);
  if (h < 100) return out.setRGB(0.36, 0.42, 0.22);
  return out.setRGB(0.5, 0.44, 0.36);
}

// Build the terrain mesh, the river ribbon, the runway, trees, rocks and
// clouds. Returns { group, heightAt }.
export function buildTerrain(seed) {
  const group = new THREE.Group();
  const size = WORLD.size;
  const segs = 150;
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const col = new THREE.Color();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);
    const h = heightAt(v.x, v.z);
    pos.setY(i, h);
    // Slope from the neighbours, for the rock colour.
    const hx = heightAt(v.x + 8, v.z) - heightAt(v.x - 8, v.z);
    const hz = heightAt(v.x, v.z + 8) - heightAt(v.x, v.z - 8);
    const slope = Math.min(1, Math.hypot(hx, hz) / 16);
    groundColor(h, slope, col);
    // A whisper of noise so the colour is never flat.
    const n = 0.94 + detail(v.x, v.z) * 0.12;
    colors[i * 3] = col.r * n;
    colors[i * 3 + 1] = col.g * n;
    colors[i * 3 + 2] = col.b * n;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }),
  );
  group.add(ground);

  // River: a ribbon that follows the centreline on the valley floor.
  const riverPts = [];
  for (let z = -WORLD.half; z <= WORLD.half; z += 40) {
    riverPts.push(new THREE.Vector3(pathX(z), WORLD.riverY, z));
  }
  const riverCurve = new THREE.CatmullRomCurve3(riverPts);
  const riverGeo = new THREE.PlaneGeometry(34, 1, 1, 120);
  const rpos = riverGeo.attributes.position;
  for (let i = 0; i < rpos.count; i += 1) {
    const t = (rpos.getY(i) + 0.5) * (riverPts.length - 1);
    const p = riverCurve.getPoint(clamp01(t / (riverPts.length - 1)));
    const side = rpos.getX(i);
    rpos.setXYZ(i, p.x + side, WORLD.riverY, p.z);
  }
  riverGeo.computeVertexNormals();
  const river = new THREE.Mesh(
    riverGeo,
    new THREE.MeshStandardMaterial({
      color: 0x2f7fb8,
      roughness: 0.25,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
    }),
  );
  group.add(river);

  // Runway: dark strip, white dashes, edge lights, windsock.
  const rcx = pathX(WORLD.runwayZ);
  const strip = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.runwayWidth, WORLD.runwayLength),
    new THREE.MeshStandardMaterial({ color: 0x2e2f33, roughness: 0.9 }),
  );
  strip.rotation.x = -Math.PI / 2;
  strip.position.set(rcx, WORLD.runwayY + 0.15, WORLD.runwayZ);
  group.add(strip);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf5f2e8 });
  for (let dz = -WORLD.runwayLength / 2 + 18; dz < WORLD.runwayLength / 2 - 10; dz += 36) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 14), dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(rcx, WORLD.runwayY + 0.3, WORLD.runwayZ + dz);
    group.add(dash);
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffc861 });
  for (let dz = -WORLD.runwayLength / 2 + 6; dz <= WORLD.runwayLength / 2 - 6; dz += 24) {
    for (const side of [-1, 1]) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), lightMat);
      lamp.position.set(rcx + side * (WORLD.runwayWidth / 2 + 2), WORLD.runwayY + 0.8, WORLD.runwayZ + dz);
      group.add(lamp);
    }
  }
  const sockPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.6 }),
  );
  sockPole.position.set(rcx + WORLD.runwayWidth / 2 + 8, WORLD.runwayY + 6, WORLD.runwayZ - 60);
  group.add(sockPole);
  const sock = new THREE.Mesh(
    new THREE.ConeGeometry(2.2, 7, 10),
    new THREE.MeshStandardMaterial({ color: 0xe8622c, roughness: 0.7 }),
  );
  sock.rotation.z = Math.PI / 2;
  sock.position.set(rcx + WORLD.runwayWidth / 2 + 11, WORLD.runwayY + 11.5, WORLD.runwayZ - 60);
  group.add(sock);

  // Trees and rocks, instanced, on the gentler slopes away from the river.
  const rand = mulberry32(seed);
  const trunkGeo = new THREE.CylinderGeometry(0.5, 0.8, 5, 6);
  const crownGeo = new THREE.ConeGeometry(3.4, 11, 8);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5b4632, roughness: 1 });
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x2c5a2a, roughness: 1 });
  const treeSpots = [];
  let guard = 0;
  while (treeSpots.length < 260 && guard < 4000) {
    guard += 1;
    const x = (rand() * 2 - 1) * WORLD.half * 0.92;
    const z = (rand() * 2 - 1) * WORLD.half * 0.92;
    const h = heightAt(x, z);
    const d = Math.abs(x - pathX(z));
    if (h > 12 && h < 95 && d > 120) treeSpots.push([x, h, z]);
  }
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeSpots.length);
  const crowns = new THREE.InstancedMesh(crownGeo, crownMat, treeSpots.length);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  treeSpots.forEach(([x, h, z], i) => {
    const sc = 0.8 + rand() * 0.7;
    s.set(sc, sc, sc);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2);
    m4.compose(new THREE.Vector3(x, h + 2.4 * sc, z), q, s);
    trunks.setMatrixAt(i, m4);
    m4.compose(new THREE.Vector3(x, h + (5 + 5.5) * sc, z), q, s);
    crowns.setMatrixAt(i, m4);
  });
  group.add(trunks);
  group.add(crowns);
  const rockGeo = new THREE.DodecahedronGeometry(3.2, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x6f6a63, roughness: 1 });
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, 130);
  for (let i = 0; i < 130; i += 1) {
    const x = (rand() * 2 - 1) * WORLD.half * 0.9;
    const z = (rand() * 2 - 1) * WORLD.half * 0.9;
    const h = heightAt(x, z);
    const sc = 0.5 + rand() * 1.6;
    s.set(sc, sc * 0.7, sc);
    q.setFromEuler(new THREE.Euler(rand() * 3, rand() * 3, rand() * 3));
    m4.compose(new THREE.Vector3(x, h + 0.6, z), q, s);
    rocks.setMatrixAt(i, m4);
  }
  group.add(rocks);

  // Clouds: flat white puffs drifting high over the valley.
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    transparent: true,
    opacity: 0.85,
  });
  const clouds = new THREE.Group();
  for (let i = 0; i < 16; i += 1) {
    const c = new THREE.Group();
    const puffs = 3 + Math.floor(rand() * 3);
    for (let j = 0; j < puffs; j += 1) {
      const r = 14 + rand() * 22;
      const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), cloudMat);
      puff.position.set((rand() - 0.5) * 60, (rand() - 0.5) * 8, (rand() - 0.5) * 26);
      puff.scale.y = 0.45;
      c.add(puff);
    }
    c.position.set(
      (rand() * 2 - 1) * 900,
      250 + rand() * 90,
      (rand() * 2 - 1) * 900,
    );
    c.userData.drift = 1.5 + rand() * 2;
    clouds.add(c);
  }
  group.add(clouds);
  group.userData.clouds = clouds;

  return { group, heightAt };
}
