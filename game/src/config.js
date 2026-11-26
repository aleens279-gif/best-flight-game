// Canyon Courier — shared tuning numbers. One place for every speed, size and
// limit the flight model, the terrain and the missions use, so a balance pass
// touches this file and nothing else.
export const WORLD = {
  // The playable square, in metres, centred on the origin. The canyon runs
  // along +z, the plane starts at the south end and flies north.
  size: 2400,
  half: 1200,
  // Canyon centreline: x = pathX(z). A meander the pilot follows.
  pathAmp1: 160,
  pathFreq1: 0.0016,
  pathAmp2: 80,
  pathFreq2: 0.0042,
  pathPhase2: 1.7,
  // Valley floor half-width, and the distance over which the walls rise.
  floorHalf: 95,
  wallBlend: 260,
  // River level and the flat runway height.
  riverY: 1.6,
  runwayY: 6,
  // Runway rectangle, centred on the centreline at this z.
  runwayZ: 780,
  runwayLength: 280,
  runwayWidth: 38,
};

export const PLANE = {
  // Speeds in m/s. Full throttle cruises near maxSpeed; below stallSpeed the
  // wing stops flying and the plane sinks.
  minSpeed: 34,
  cruiseSpeed: 78,
  maxSpeed: 118,
  accel: 26,
  drag: 0.55,
  // How fast the plane answers the stick, in radians per second.
  rollRate: 2.4,
  pitchRate: 1.5,
  maxRoll: 0.95,
  maxPitch: 0.5,
  // Turn rate from bank: yaw change per second at full bank and cruise speed.
  turnFactor: 0.62,
  // Sink when stalled, and the gentle sink that always pulls at the plane.
  stallSink: 16,
  baseSink: 1.2,
  // Terrain clearance that counts as a scrape, and the impact speed that
  // turns a scrape into a crash.
  groundClearance: 2.4,
  crashSpeed: 62,
};

export const FUEL = {
  // Percent of a full tank. Drains faster at high throttle.
  capacity: 100,
  drainIdle: 0.55,
  drainFull: 1.7,
  ringRefill: 34,
};

export const RINGS = {
  radius: 17,
  tube: 1.3,
  // Gold rings score; blue rings score and refill fuel.
  goldScore: 100,
  blueScore: 150,
  // z stations along the canyon, and the height above the valley floor.
  stations: [
    { z: -700, lift: 52, kind: 'gold' },
    { z: -480, lift: 66, kind: 'blue' },
    { z: -260, lift: 44, kind: 'gold' },
    { z: -40, lift: 70, kind: 'gold' },
    { z: 180, lift: 50, kind: 'blue' },
    { z: 400, lift: 62, kind: 'gold' },
    { z: 600, lift: 46, kind: 'gold' },
    { z: 720, lift: 56, kind: 'blue' },
  ],
};

export const MISSIONS = {
  rings: {
    id: 'rings',
    name: 'Ring Run',
    blurb: 'Thread all 8 rings before the tank runs dry.',
    ringCount: 8,
    needsLanding: false,
    fuelDrain: true,
  },
  courier: {
    id: 'courier',
    name: 'Courier Run',
    blurb: 'Thread 6 rings, then put her down on the strip.',
    ringCount: 6,
    needsLanding: true,
    fuelDrain: true,
  },
  free: {
    id: 'free',
    name: 'Free Flight',
    blurb: 'No fuel, no fail. Learn the canyon.',
    ringCount: 8,
    needsLanding: false,
    fuelDrain: false,
  },
};

export const SCORE = {
  landing: 500,
  missionBonus: 400,
  timeBonusPerSecond: 4,
};

export const CAMERA = {
  // Chase camera: metres behind and above the plane, and how fast it catches up.
  back: 26,
  up: 8,
  lookAhead: 34,
  follow: 4.5,
  fov: 62,
};

export const SKY = {
  horizon: 0xbfd9e8,
  zenith: 0x5f9fd0,
  fogNear: 320,
  fogFar: 1500,
  sunColor: 0xfff2d8,
  sunIntensity: 1.9,
  hemiSky: 0xbfd9e8,
  hemiGround: 0x8a7a5f,
  hemiIntensity: 0.85,
};
