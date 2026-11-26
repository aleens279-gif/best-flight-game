// Canyon Courier — deterministic randomness. Every number the world is built
// from comes out of a seeded generator, so the same seed always builds the
// same canyon, the same trees and the same rings. The screenshots and the
// game agree because they share the seed.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth value noise over a 2D grid: a lattice of random heights, blended
// with a smoothstep so the terrain rolls instead of stepping.
export function makeNoise(seed, cell) {
  const rand = mulberry32(seed);
  const grid = new Map();
  function lattice(ix, iz) {
    const key = ix + ':' + iz;
    let v = grid.get(key);
    if (v === undefined) {
      v = rand();
      grid.set(key, v);
    }
    return v;
  }
  function smooth(t) {
    return t * t * (3 - 2 * t);
  }
  return function noise(x, z) {
    const gx = x / cell;
    const gz = z / cell;
    const ix = Math.floor(gx);
    const iz = Math.floor(gz);
    const fx = smooth(gx - ix);
    const fz = smooth(gz - iz);
    const a = lattice(ix, iz);
    const b = lattice(ix + 1, iz);
    const c = lattice(ix, iz + 1);
    const d = lattice(ix + 1, iz + 1);
    const top = a + (b - a) * fx;
    const bottom = c + (d - c) * fx;
    return top + (bottom - top) * fz;
  };
}

// Fractal noise: several octaves of value noise stacked, each half the
// strength and twice the frequency of the last.
export function makeFbm(seed, baseCell, octaves) {
  const layers = [];
  for (let i = 0; i < octaves; i += 1) {
    layers.push(makeNoise(seed + i * 101, baseCell / Math.pow(2, i)));
  }
  return function fbm(x, z) {
    let sum = 0;
    let amp = 1;
    let total = 0;
    for (let i = 0; i < layers.length; i += 1) {
      sum += layers[i](x, z) * amp;
      total += amp;
      amp *= 0.5;
    }
    return sum / total;
  };
}
