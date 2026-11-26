// Staging for screenshots: ?shot=start|play|ring|end (with &seed=N) freezes
// one scene of the game instead of running the loop, then paints it twice
// and sets window.__shotReady. Every scene is driven by the same seeded
// world and the same fixed step as live play, so a shot replays exactly.
// An autopilot flies the aircraft toward the next ring; the 'end' scene
// flies it into the ground on purpose, to show the game-over panel.

import { STEP } from './settings.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './paint.js';

function autopilot(world, pilot) {
  const p = pilot.state;
  // Dodge first: anything solid in the corridor ahead wins over the ring.
  const threats = [];
  for (const cloud of world.state.clouds) {
    if (cloud.x > 290 && cloud.x < 640) threats.push({ y: cloud.y, r: cloud.radius });
  }
  for (const balloon of world.state.balloons) {
    if (balloon.x > 290 && balloon.x < 640) threats.push({ y: balloon.y, r: 44 });
  }
  for (const bird of world.state.birds) {
    if (bird.x > 290 && bird.x < 560) threats.push({ y: bird.y, r: 24 });
  }
  for (const threat of threats) {
    if (Math.abs(threat.y - p.y) < threat.r + 46) {
      return threat.y > p.y ? -1 : 1;
    }
  }
  const ring = world.state.rings.find((r) => r.x > 240 && !r.judged);
  const target = ring ? ring.y : 300;
  if (p.y > target + 12) return -1;
  if (p.y < target - 12) return 1;
  return 0;
}

function simulate(world, pilot, seconds, steer) {
  const steps = Math.round(seconds / STEP);
  const seen = [];
  for (let i = 0; i < steps; i += 1) {
    const pitch = steer(world, pilot);
    pilot.step(STEP, pitch, 0);
    const events = world.step(STEP, pilot);
    seen.push(...events);
    if (events.some((e) => e.type === 'crash')) break;
  }
  return seen;
}

export function stageShot(name, world, pilot, readBest) {
  const seed = world.seed;
  world.reset(seed);
  pilot.reset();

  if (name === 'start') {
    return {
      screen: SCREEN_TITLE,
      best: readBest(),
      lives: 3,
      flash: 0,
      stats: null,
    };
  }

  if (name === 'play') {
    simulate(world, pilot, 13, autopilot);
    return {
      screen: SCREEN_PLAY,
      best: readBest(),
      lives: 3,
      flash: 0,
      stats: null,
    };
  }

  if (name === 'ring') {
    // Fly until a ring is threaded dead centre, then freeze at once, while
    // the PERFECT popup is still fresh and the ring is still in frame.
    let frozen = false;
    const steps = Math.round(48 / STEP);
    for (let i = 0; i < steps && !frozen; i += 1) {
      const pitch = autopilot(world, pilot);
      pilot.step(STEP, pitch, 0);
      const events = world.step(STEP, pilot);
      if (events.some((e) => e.type === 'perfect')) frozen = true;
      if (events.some((e) => e.type === 'crash')) break;
    }
    return {
      screen: SCREEN_PLAY,
      best: readBest(),
      lives: 3,
      flash: 0,
      stats: null,
    };
  }

  // 'end': fly a real leg first, then hold the dive until the ground arrives.
  simulate(world, pilot, 9, autopilot);
  simulate(world, pilot, 30, () => 1);
  const s = world.state;
  world.burst(300, pilot.state.y, '#5a5148', 16, 150);
  const score = Math.floor(s.score);
  const best = Math.max(readBest(), score);
  return {
    screen: SCREEN_OVER,
    best,
    lives: 0,
    flash: 0,
    stats: {
      score,
      distanceM: s.distanceM,
      ringsHit: s.ringsHit,
      perfects: s.perfects,
      best,
      newBest: score >= best && score > 0,
    },
  };
}
