// Sky Courier — tuning, palette and shared constants.
// One fixed logical playfield (1280x720) that the painter scales to the window,
// so the flight model never depends on the screen size.

export const FIELD = { width: 1280, height: 720, groundY: 628, horizonY: 470 };

/** The simulation advances in fixed steps of this many seconds. */
export const STEP = 1 / 60;

/** Seconds of flying before the next difficulty step, and the last step. */
export const LEVEL = { seconds: 18, max: 10 };

export const PLANE = {
  /** Fixed horizontal station of the aircraft on the field. */
  x: 300,
  /** Collision radius of the fuselage, in pixels. */
  radius: 26,
  /** How fast the nose answers the stick, in px/s^2 of climb. */
  climbRate: 620,
  /** Fastest the aircraft may climb or dive, in px/s. */
  maxSink: 420,
  maxClimb: 380,
  /** Cruise speed at full throttle, in px/s; the world scrolls at this rate. */
  cruise: 300,
  /** Slowest the aircraft may fly (near stall) and fastest in a dive. */
  minSpeed: 170,
  maxSpeed: 520,
};

export const FUEL = {
  start: 100,
  /** Burn per second at full throttle; half throttle burns half as fast. */
  burn: 1.6,
  canBonus: 34,
};

export const LIVES = 3;

export const RING = {
  radius: 52,
  /** Perfect pass: the aircraft crosses within this many px of the centre. */
  perfectBand: 20,
  points: 60,
  perfectPoints: 160,
  interval: 2.4,
};

export const PICKUP = {
  starPoints: 25,
  mailPoints: 50,
  interval: 3.1,
};

export const OBSTACLE = {
  /** First storm cloud appears after this many seconds of flight. */
  firstCloudAt: 9,
  cloudInterval: 3.4,
  balloonInterval: 5.2,
  birdInterval: 4.4,
  intervalScale: 0.93,
  minInterval: 1.5,
};

export const SCORE = {
  /** Points per metre of route flown. */
  perMetre: 1,
  /** Metres covered per scrolled pixel. */
  metresPerPixel: 0.12,
};

/** How many entities of each kind may exist at once; pools are fixed at boot. */
export const POOLS = { clouds: 14, balloons: 8, birds: 12, rings: 6, pickups: 10, puffs: 40 };

/** Late-afternoon sky: warm sun low over green patchwork fields. */
export const PALETTE = {
  skyTop: '#2f6fb4',
  skyMid: '#7fb8dd',
  skyLow: '#ffd9a0',
  sunCore: '#fff3c4',
  sunGlow: '#ffb347',
  mountainFar: '#8a7fb8',
  mountainNear: '#5d5470',
  fieldA: '#7fae56',
  fieldB: '#a8bf5e',
  fieldC: '#c2a55e',
  road: '#6b6257',
  river: '#5aa3d0',
  ground: '#5c7a45',
  runway: '#3c4148',
  runwayMark: '#f5f2e8',
  planeRed: '#d8443a',
  planeCream: '#fdf3d8',
  planeDark: '#2e2a26',
  propBlur: 'rgba(46, 42, 38, 0.35)',
  ringGold: '#ffc93c',
  ringGlow: '#ff9d00',
  cloudWhite: '#ffffff',
  stormDark: '#4a4a58',
  stormBelly: '#33333f',
  balloonRed: '#e05252',
  balloonBlue: '#4a7fd4',
  balloonYellow: '#f2c94c',
  bird: '#2b2b33',
  hudPanel: 'rgba(16, 22, 34, 0.78)',
  hudEdge: '#ffb347',
  hudText: '#fdf6e3',
  hudDim: '#9fb2c8',
  hudGood: '#7ddc8a',
  hudWarn: '#ffb347',
  hudBad: '#ff6b5e',
  text: '#fdf6e3',
  muted: '#b8c4d4',
};

/** Best score is kept in this browser only, under this key. */
export const BEST_KEY = 'sky-courier.best';

/** The font stack for every canvas label. */
export const FONT = '"Avenir Next", "Segoe UI", system-ui, sans-serif';
