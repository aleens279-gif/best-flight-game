// Canyon Courier — the game itself. Wires the renderer, the valley, the
// plane, the rings, the HUD and the sound into one loop: title, flying,
// pause, crash and landing, plus the three missions and the screenshot
// scenes the maker uses for the dossier.
import * as THREE from '../vendor/three.module.min.js';
import { CAMERA, MISSIONS, RINGS, SCORE, SKY, WORLD } from './config.js';
import { buildTerrain, heightAt } from './terrain.js';
import { buildPlane, freshState, onRunway, posePlane, stepFlight } from './plane.js';
import { animateRings, buildRings, checkRing, nextRing } from './rings.js';
import { setEndText, showScreen, updateHud } from './hud.js';
import { fanfare, fuelChime, ringChime, setEngine, setMuted, isMuted, thud, unlockAudio } from './audio.js';
import { createInput } from './input.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const seed = parseInt(params.get('seed') || '1', 10) || 1;
const shot = params.get('shot') || '';

// --- Renderer, scene, camera, light ---------------------------------------
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY.horizon);
scene.fog = new THREE.Fog(SKY.horizon, SKY.fogNear, SKY.fogFar);
const camera = new THREE.PerspectiveCamera(
  CAMERA.fov,
  window.innerWidth / window.innerHeight,
  0.5,
  4000,
);
const sun = new THREE.DirectionalLight(SKY.sunColor, SKY.sunIntensity);
sun.position.set(-420, 620, -260);
scene.add(sun);
scene.add(new THREE.HemisphereLight(SKY.hemiSky, SKY.hemiGround, SKY.hemiIntensity));
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- World ------------------------------------------------------------------
const { group: terrainGroup, heightAt: groundAt } = buildTerrain(seed);
scene.add(terrainGroup);
const planeMesh = buildPlane();
scene.add(planeMesh);

// --- State ------------------------------------------------------------------
const input = createInput();
let mission = MISSIONS.rings;
let state = freshState();
let rings = buildRings(scene, mission.ringCount);
let screen = 'title';
let message = '';
let messageTimer = 0;
let timeLeft = 0;
let shotStaged = false;

function reset(m) {
  mission = m;
  state = freshState();
  for (const r of rings) scene.remove(r.mesh);
  rings = buildRings(scene, mission.ringCount);
  message = '';
  messageTimer = 0;
  timeLeft = 0;
}

function startMission(m) {
  unlockAudio();
  reset(m);
  screen = 'play';
  showScreen('play');
  message = m.name.toUpperCase() + ' — ' + m.blurb.toUpperCase();
  messageTimer = 4;
}

function endFlight(title, lines) {
  screen = title === 'LANDED' || title === 'MISSION COMPLETE' ? 'win' : 'over';
  setEndText(title, lines);
  showScreen(screen);
  if (screen === 'win') fanfare();
}

function fmtTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return m + ':' + String(s).padStart(2, '0');
}

// --- Camera -----------------------------------------------------------------
const camPos = new THREE.Vector3();
const camTarget = new THREE.Vector3();
function chaseCamera(dt) {
  const fx = Math.sin(state.heading);
  const fz = Math.cos(state.heading);
  const tx = state.x - fx * CAMERA.back + Math.sin(state.heading + Math.PI / 2) * state.roll * 4;
  const ty = state.y + CAMERA.up - state.pitch * 6;
  const tz = state.z - fz * CAMERA.back;
  const k = Math.min(1, CAMERA.follow * dt);
  camPos.x += (tx - camPos.x) * k;
  camPos.y += (ty - camPos.y) * k;
  camPos.z += (tz - camPos.z) * k;
  camera.position.copy(camPos);
  camTarget.set(state.x + fx * CAMERA.lookAhead, state.y - state.pitch * 10, state.z + fz * CAMERA.lookAhead);
  camera.lookAt(camTarget);
}

function titleCamera(t) {
  // A slow establishing shot: the parked plane, the strip, the canyon.
  const a = t * 0.08;
  camera.position.set(
    state.x + Math.sin(a) * 34,
    state.y + 12 + Math.sin(t * 0.3) * 1.5,
    state.z - 26 + Math.cos(a) * 10,
  );
  camera.lookAt(state.x, state.y + 2, state.z + 40);
}

// --- Title screen wiring -----------------------------------------------------
document.querySelectorAll('[data-mission]').forEach((btn) => {
  btn.addEventListener('click', () => startMission(MISSIONS[btn.dataset.mission]));
});
document.getElementById('btn-fly').addEventListener('click', () => startMission(mission));
document.querySelectorAll('[data-mission]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-mission]').forEach((b) => b.classList.remove('picked'));
    btn.classList.add('picked');
  });
});
document.querySelectorAll('.btn-again').forEach((btn) => {
  btn.addEventListener('click', () => startMission(mission));
});
document.querySelectorAll('.btn-title').forEach((btn) => {
  btn.addEventListener('click', () => {
    screen = 'title';
    showScreen('title');
  });
});
input.onKeyPress((code) => {
  if (screen === 'title' && (code === 'Enter' || code === 'Space')) startMission(mission);
  if (code === 'KeyR' && screen !== 'title') startMission(mission);
  if (code === 'KeyP' && screen === 'play') {
    screen = 'pause';
    showScreen('pause');
  } else if (code === 'KeyP' && screen === 'pause') {
    screen = 'play';
    showScreen('play');
  }
  if (code === 'KeyM') setMuted(!isMuted());
});

// --- Screenshot staging ------------------------------------------------------
if (shot) {
  reset(mission);
  const staged = stageShot(shot, state, rings, mission);
  screen = staged.screen;
  message = staged.message;
  messageTimer = 8;
  if (screen === 'title') {
    showScreen('title');
    titleCamera(2.4);
  } else {
    showScreen('play');
    posePlane(planeMesh, state);
    chaseCamera(1);
  }
  updateHud(state, mission, rings.filter((r) => !r.passed).length, message);
  renderer.render(scene, camera);
  window.__shotReady = true;
  shotStaged = true;
}

// --- Main loop ---------------------------------------------------------------
const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (shotStaged) {
    // A staged screenshot frame: hold it, clouds drift, nothing else moves.
    const clouds = terrainGroup.userData.clouds;
    if (clouds) {
      clouds.children.forEach((c) => {
        c.position.x += c.userData.drift * dt;
        if (c.position.x > 1000) c.position.x = -1000;
      });
    }
    if (screen === 'title') titleCamera(t + 2.4);
    renderer.render(scene, camera);
    return;
  }

  if (screen === 'title') {
    titleCamera(t);
    renderer.render(scene, camera);
    return;
  }
  if (screen === 'pause' || screen === 'over' || screen === 'win') {
    renderer.render(scene, camera);
    return;
  }

  // Flying.
  const inp = {
    roll: input.roll(),
    pitch: input.pitch(),
    throttleDelta: input.throttleDelta(),
  };
  const result = stepFlight(state, inp, dt, mission);
  posePlane(planeMesh, state);
  chaseCamera(dt);
  animateRings(rings, t);
  setEngine(state.throttle, state.speed);

  // Rings.
  const target = nextRing(rings);
  if (target && checkRing(target, state)) {
    state.ringsPassed += 1;
    const gain = target.kind === 'blue' ? RINGS.blueScore : RINGS.goldScore;
    state.score += gain;
    if (target.kind === 'blue') {
      state.fuel = Math.min(100, state.fuel + 34);
      fuelChime();
      message = 'BLUE RING +' + gain + ' — FUEL TOPPED UP';
    } else {
      ringChime();
      message = 'RING +' + gain;
    }
    messageTimer = 2.5;
  }

  // Fuel out: the engine quits and she glides.
  if (state.fuel <= 0 && state.throttle > 0) {
    state.throttle = 0;
    message = 'ENGINE OUT — FIND THE STRIP';
    messageTimer = 3;
  }

  // Damage flash.
  if (state.damage > 0 && messageTimer <= 0) {
    message = 'SCRAPE — AIRFRAME DAMAGE ×' + state.damage;
    messageTimer = 2;
  }

  if (messageTimer > 0) messageTimer -= dt;
  const ringsLeft = rings.filter((r) => !r.passed).length;
  updateHud(state, mission, ringsLeft, messageTimer > 0 ? message : '');

  // Clouds drift.
  const clouds = terrainGroup.userData.clouds;
  if (clouds) {
    clouds.children.forEach((c) => {
      c.position.x += c.userData.drift * dt;
      if (c.position.x > 1000) c.position.x = -1000;
    });
  }

  if (result === 'crash') {
    thud();
    endFlight('CRASHED', [
      state.cause,
      'Score ' + state.score + ' · Rings ' + state.ringsPassed + ' / ' + rings.length,
      'Time ' + fmtTime(state.elapsed),
      'Press R to fly again.',
    ]);
  } else if (result === 'landed') {
    state.score += SCORE.landing;
    if (mission.needsLanding && state.ringsPassed >= mission.ringCount) {
      state.score += SCORE.missionBonus;
      endFlight('MISSION COMPLETE', [
        'Courier Run — rings threaded, wheels on the strip.',
        'Score ' + state.score + ' · Time ' + fmtTime(state.elapsed),
        'Landing +' + SCORE.landing + ' · Mission +' + SCORE.missionBonus,
      ]);
    } else if (mission.needsLanding) {
      endFlight('LANDED', [
        'Wheels down — but ' + (mission.ringCount - state.ringsPassed) + ' rings still unflown.',
        'Score ' + state.score + ' · Rings ' + state.ringsPassed + ' / ' + rings.length,
        'Press R to fly the full route.',
      ]);
    } else {
      endFlight('LANDED', [
        'A gentle touchdown on the strip.',
        'Score ' + state.score + ' · Rings ' + state.ringsPassed + ' / ' + rings.length,
        'Press R to fly again.',
      ]);
    }
  } else if (mission.needsLanding === false && state.ringsPassed >= rings.length && rings.length > 0) {
    state.score += SCORE.missionBonus + Math.max(0, Math.round((240 - state.elapsed) * SCORE.timeBonusPerSecond));
    endFlight('MISSION COMPLETE', [
      mission.name + ' — all ' + rings.length + ' rings threaded.',
      'Score ' + state.score + ' · Time ' + fmtTime(state.elapsed),
      'Press R to fly again.',
    ]);
  }

  renderer.render(scene, camera);
}
tick();
