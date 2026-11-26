// Canyon Courier — sound, synthesised. No audio files: a WebAudio engine
// drone that follows the throttle, a chime for a ring, a thud for a scrape
// and a short fanfare for a landing. Starts on the first user gesture.
let ctx = null;
let engineOsc = null;
let engineGain = null;
let noiseSrc = null;
let muted = false;

function ensure() {
  if (ctx) return true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
  } catch (e) {
    return false;
  }
  // Engine: a low sawtooth plus filtered noise, both through one gain.
  engineOsc = ctx.createOscillator();
  engineOsc.type = 'sawtooth';
  engineOsc.frequency.value = 52;
  const engineFilter = ctx.createBiquadFilter();
  engineFilter.type = 'lowpass';
  engineFilter.frequency.value = 320;
  engineGain = ctx.createGain();
  engineGain.gain.value = 0;
  engineOsc.connect(engineFilter);
  engineFilter.connect(engineGain);
  engineGain.connect(ctx.destination);
  engineOsc.start();
  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuf;
  noiseSrc.loop = true;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 420;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.05;
  noiseSrc.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseSrc.start();
  return true;
}

export function unlockAudio() {
  if (ensure() && ctx.state === 'suspended') ctx.resume();
}

export function setEngine(throttle, speed) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  engineOsc.frequency.setTargetAtTime(46 + throttle * 66 + speed * 0.25, t, 0.1);
  engineGain.gain.setTargetAtTime(0.05 + throttle * 0.09, t, 0.15);
}

export function setMuted(m) {
  muted = m;
  if (ctx && engineGain) engineGain.gain.value = m ? 0 : 0.08;
}

export function isMuted() {
  return muted;
}

function blip(freq, dur, type, vol, when) {
  if (!ctx || muted) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type || 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, ctx.currentTime + when);
  g.gain.linearRampToValueAtTime(vol, ctx.currentTime + when + 0.015);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + dur);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(ctx.currentTime + when);
  o.stop(ctx.currentTime + when + dur + 0.05);
}

export function ringChime() {
  blip(880, 0.35, 'sine', 0.22, 0);
  blip(1318, 0.4, 'sine', 0.16, 0.07);
}

export function fuelChime() {
  blip(659, 0.3, 'sine', 0.2, 0);
  blip(988, 0.45, 'sine', 0.18, 0.08);
}

export function thud() {
  if (!ctx || muted) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(120, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + 0.25);
  g.gain.setValueAtTime(0.5, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  o.connect(g);
  g.connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + 0.32);
}

export function fanfare() {
  const notes = [523, 659, 784, 1046];
  notes.forEach((f, i) => blip(f, 0.5, 'triangle', 0.2, i * 0.12));
}
