// Canyon Courier — the instruments. The HUD is plain DOM over the canvas:
// altitude, airspeed, heading, throttle, fuel, score and the mission line,
// plus the attitude ball and the warning banners. Lit amber and cyan on dark
// glass, so the instruments read in a screenshot.
import { heightAt } from './terrain.js';

function el(id) {
  return document.getElementById(id);
}

function compass(heading) {
  // 0 = north, clockwise. Returns a three-letter point plus degrees.
  const deg = ((heading * 180) / Math.PI % 360 + 360) % 360;
  const points = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const point = points[Math.round(deg / 22.5) % 16];
  return { deg: Math.round(deg), point };
}

// Heading tape: a strip of ticks around the current heading.
function tape(heading) {
  const deg = ((heading * 180) / Math.PI % 360 + 360) % 360;
  let out = '';
  for (let d = -30; d <= 30; d += 10) {
    const h = (Math.round(deg / 10) * 10 + d + 360) % 360;
    const label = h % 30 === 0 ? String(h).padStart(3, '0') : '·';
    out += label + '  ';
  }
  return out.trim();
}

export function updateHud(s, mission, ringsLeft, message) {
  const agl = Math.max(0, s.y - heightAt(s.x, s.z));
  const c = compass(s.heading);
  const knots = Math.round(s.speed * 1.94);
  const vs = Math.round(Math.sin(s.pitch) * s.speed * 1.94 * 60);
  el('hud-alt').textContent = String(Math.round(agl * 3.28)).padStart(4, '0');
  el('hud-spd').textContent = String(knots).padStart(3, '0');
  el('hud-hdg').textContent = c.point + ' ' + String(c.deg).padStart(3, '0');
  el('hud-tape').textContent = tape(s.heading);
  el('hud-vs').textContent = (vs >= 0 ? '+' : '') + vs;
  el('hud-thr').textContent = Math.round(s.throttle * 100) + '%';
  el('hud-thr-bar').style.width = Math.round(s.throttle * 100) + '%';
  el('hud-fuel').textContent = Math.round(s.fuel) + '%';
  el('hud-fuel-bar').style.width = Math.round(s.fuel) + '%';
  el('hud-fuel-bar').classList.toggle('low', s.fuel < 25);
  el('hud-score').textContent = String(s.score);
  el('hud-rings').textContent = String(ringsLeft);
  el('hud-mission').textContent = mission.name;
  el('hud-msg').textContent = message || '';
  // Attitude ball: the horizon strip slides with pitch and rolls with bank.
  const ball = el('hud-ball-inner');
  ball.style.transform =
    'translateY(' + (s.pitch * 90).toFixed(1) + 'px) rotate(' + (-s.roll * 57.3).toFixed(1) + 'deg)';
  // Warnings.
  const warn = el('hud-warn');
  let w = '';
  if (s.fuel <= 0) w = 'ENGINE OUT — GLIDE TO THE STRIP';
  else if (s.fuel < 25) w = 'LOW FUEL';
  else if (agl < 25 && s.speed > 60) w = 'PULL UP';
  else if (s.speed < 40) w = 'STALL — NOSE DOWN, THROTTLE UP';
  else if (s.damage > 0) w = 'AIRFRAME DAMAGE ×' + s.damage;
  warn.textContent = w;
  warn.classList.toggle('show', w !== '');
}

export function showScreen(id) {
  for (const name of ['title', 'over', 'win', 'pause']) {
    el('screen-' + name).classList.toggle('hidden', name !== id);
  }
  el('hud').classList.toggle('hidden', id === 'title');
}

export function setEndText(title, lines) {
  el('end-title-over').textContent = title;
  el('end-title-win').textContent = title;
  const html = lines.map((l) => '<div>' + l + '</div>').join('');
  el('end-lines-over').innerHTML = html;
  el('end-lines-win').innerHTML = html;
}
