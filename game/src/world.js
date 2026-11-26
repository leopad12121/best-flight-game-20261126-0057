// The world the courier flies through: patchwork fields and a river below,
// two ridges of mountains, drifting cloud, and the route itself — golden
// target rings to thread, mailbags and stars to collect, fuel cans to keep
// the engine fed, and storm clouds, balloons and birds to stay clear of.
// Everything spawns from one seeded stream, so a seed replays the same sky.

import { createRng } from './rng.js';
import {
  FIELD, LEVEL, LIVES, OBSTACLE, PICKUP, PLANE, POOLS, RING, SCORE,
} from './settings.js';

/** A cheap deterministic hash of an integer, for per-segment scenery. */
export function hashSegment(index) {
  const s = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Rolling height of the ground at an absolute world x, in pixels above the base line. */
export function hillHeight(absX) {
  if (absX < 1000) return 0; // the runway strip stays flat
  return Math.sin(absX * 0.0016 + 1.7) * 14 + Math.sin(absX * 0.0041 + 0.4) * 7;
}

/** The ground's surface y at an absolute world x. */
export function groundSurfaceY(absX) {
  return FIELD.groundY - hillHeight(absX);
}

export function createWorld(seed) {
  let rng = createRng(seed);
  let currentSeed = seed;
  const state = {
    elapsed: 0,
    distancePx: 0,
    distanceM: 0,
    score: 0,
    level: 1,
    ringsHit: 0,
    ringsPassed: 0,
    perfects: 0,
    lives: LIVES,
    clouds: [],
    balloons: [],
    birds: [],
    rings: [],
    pickups: [],
    puffs: [],
    popups: [],
    ambient: [],
    ringTimer: 1.2,
    pickupTimer: 2.0,
    cloudTimer: OBSTACLE.firstCloudAt,
    balloonTimer: 4.0,
    birdTimer: 6.0,
    gustTimer: 11,
    exhaustTimer: 0,
    over: false,
    lastLevel: 1,
  };

  function reset(newSeed) {
    currentSeed = newSeed;
    rng = createRng(newSeed);
    const fresh = createWorld(newSeed);
    Object.assign(state, fresh.state);
    state.lastLevel = 1;
    for (let i = 0; i < 7; i += 1) {
      state.ambient.push({
        x: rng.range(0, FIELD.width),
        y: rng.range(50, 300),
        scale: rng.range(0.6, 1.5),
        drift: rng.range(6, 18),
      });
    }
  }

  function spawnRing() {
    if (state.rings.length >= POOLS.rings) return;
    state.rings.push({
      x: FIELD.width + 90,
      y: rng.range(170, 500),
      judged: false,
      passed: false,
      wobble: rng.range(0, Math.PI * 2),
    });
  }

  function spawnPickup() {
    if (state.pickups.length >= POOLS.pickups) return;
    const kind = rng.pick(['star', 'star', 'mail', 'fuel']);
    state.pickups.push({
      x: FIELD.width + 70,
      y: rng.range(140, 540),
      kind,
      bob: rng.range(0, Math.PI * 2),
    });
  }

  function spawnCloud() {
    if (state.clouds.length >= POOLS.clouds) return;
    state.clouds.push({
      x: FIELD.width + 120,
      y: rng.range(110, 430),
      radius: rng.range(40, 62),
      flash: 0,
    });
  }

  function spawnBalloon() {
    if (state.balloons.length >= POOLS.balloons) return;
    state.balloons.push({
      x: FIELD.width + 100,
      y: rng.range(180, 460),
      hue: rng.pick(['red', 'blue', 'yellow']),
      bob: rng.range(0, Math.PI * 2),
    });
  }

  function spawnBirds() {
    if (state.birds.length + 4 > POOLS.birds) return;
    const y = rng.range(150, 480);
    const count = rng.int(3, 5);
    for (let i = 0; i < count; i += 1) {
      state.birds.push({
        x: FIELD.width + 80 + i * rng.range(26, 40),
        y: y + rng.range(-26, 26),
        phase: rng.range(0, Math.PI * 2),
        flap: rng.range(6, 10),
      });
    }
  }

  function burst(x, y, colour, count, spread) {
    for (let i = 0; i < count; i += 1) {
      if (state.puffs.length >= POOLS.puffs) return;
      const angle = rng.range(0, Math.PI * 2);
      const speed = rng.range(20, spread);
      state.puffs.push({
        x, y,
        vx: Math.cos(angle) * speed - 60,
        vy: Math.sin(angle) * speed,
        ttl: rng.range(0.4, 0.9),
        age: 0,
        size: rng.range(3, 8),
        colour,
      });
    }
  }

  function popup(x, y, text, colour) {
    state.popups.push({ x, y, text, colour, ttl: 1.3, age: 0 });
  }

  function levelSpeed() {
    return 1 + (state.level - 1) * 0.06;
  }

  /**
   * Advance the world one fixed step. The pilot has already stepped; this
   * moves the scenery, spawns the route, judges rings and checks collisions.
   * @returns events the loop should act on (hits, pickups, rings, levels).
   */
  function step(dt, pilot) {
    const events = [];
    const p = pilot.state;
    state.elapsed += dt;
    const speed = p.speed * levelSpeed();
    const scroll = speed * dt;
    state.distancePx += scroll;
    state.distanceM = Math.floor(state.distancePx * SCORE.metresPerPixel);
    state.score += scroll * SCORE.metresPerPixel * SCORE.perMetre;
    state.level = Math.min(LEVEL.max, 1 + Math.floor(state.elapsed / LEVEL.seconds));
    if (state.level > state.lastLevel) {
      events.push({ type: 'level', level: state.level });
      popup(PLANE.x, p.y - 70, `LEVEL ${state.level} — FASTER`, '#ffb347');
    }
    state.lastLevel = state.level;

    // A gust now and then shoves the aircraft and says so.
    state.gustTimer -= dt;
    if (state.gustTimer <= 0) {
      state.gustTimer = rng.range(9, 16);
      p.vy += rng.pick([-1, 1]) * rng.range(60, 130);
      popup(PLANE.x + 40, p.y - 60, 'GUST!', '#b8c4d4');
    }

    // Ceiling: the sky has a lid, the ground does not forgive.
    if (!p.grounded && p.y < 58) {
      p.y = 58;
      if (p.vy < 0) p.vy = 0;
    }
    if (!p.grounded && p.y + 14 >= groundSurfaceY(state.distancePx + PLANE.x)) {
      events.push({ type: 'crash' });
      burst(PLANE.x, p.y, '#5a5148', 22, 190);
      burst(PLANE.x, p.y, '#ff6b5e', 10, 140);
      return events;
    }

    // Spawning, paced by the level.
    const pace = Math.max(0.55, Math.pow(OBSTACLE.intervalScale, state.level - 1));
    state.ringTimer -= dt;
    if (state.ringTimer <= 0) {
      state.ringTimer = RING.interval * rng.range(0.9, 1.15);
      spawnRing();
    }
    state.pickupTimer -= dt;
    if (state.pickupTimer <= 0) {
      state.pickupTimer = PICKUP.interval * rng.range(0.85, 1.25);
      spawnPickup();
    }
    state.cloudTimer -= dt;
    if (state.cloudTimer <= 0) {
      state.cloudTimer = Math.max(OBSTACLE.minInterval, OBSTACLE.cloudInterval * pace);
      spawnCloud();
    }
    state.balloonTimer -= dt;
    if (state.balloonTimer <= 0) {
      state.balloonTimer = OBSTACLE.balloonInterval * pace;
      spawnBalloon();
    }
    state.birdTimer -= dt;
    if (state.birdTimer <= 0) {
      state.birdTimer = OBSTACLE.birdInterval * pace;
      spawnBirds();
    }

    // Exhaust puffs trail the tail while the engine runs.
    state.exhaustTimer -= dt;
    if (p.engineOn && !p.grounded && state.exhaustTimer <= 0) {
      state.exhaustTimer = 0.07;
      if (state.puffs.length < POOLS.puffs) {
        state.puffs.push({
          x: PLANE.x - 52, y: p.y + 2,
          vx: -speed * 0.55, vy: rng.range(-8, 14),
          ttl: 0.55, age: 0, size: rng.range(3, 6), colour: '#e8e2d4',
        });
      }
    }

    const move = (list, factor) => {
      for (let i = list.length - 1; i >= 0; i -= 1) {
        list[i].x -= scroll * factor;
        if (list[i].x < -160) list.splice(i, 1);
      }
    };
    move(state.clouds, 0.92);
    move(state.balloons, 0.85);
    move(state.birds, 1.25);
    move(state.rings, 1);
    move(state.pickups, 1);
    for (const cloud of state.clouds) {
      if (cloud.flash > 0) cloud.flash = Math.max(0, cloud.flash - dt);
      else if (rng.chance(0.002)) cloud.flash = 0.12;
    }
    for (const bird of state.birds) {
      bird.phase += dt * bird.flap;
      bird.y += Math.sin(bird.phase) * 22 * dt;
    }

    // Ambient cloud drifts across the sky, wrapping around.
    for (const cloud of state.ambient) {
      cloud.x -= (cloud.drift + scroll * 0.12) * dt;
      if (cloud.x < -140) {
        cloud.x = FIELD.width + rng.range(40, 200);
        cloud.y = rng.range(50, 300);
        cloud.scale = rng.range(0.6, 1.5);
      }
    }

    // Rings: judge each one as it passes the aircraft's station.
    for (const ring of state.rings) {
      ring.wobble += dt * 1.4;
      if (!ring.judged && ring.x < PLANE.x) {
        ring.judged = true;
        state.ringsPassed += 1;
        const dy = Math.abs(p.y - ring.y);
        if (dy <= RING.perfectBand) {
          state.score += RING.perfectPoints;
          state.ringsHit += 1;
          state.perfects += 1;
          ring.passed = true;
          events.push({ type: 'perfect', points: RING.perfectPoints });
          popup(ring.x, ring.y - 60, `PERFECT +${RING.perfectPoints}`, '#ffc93c');
          burst(PLANE.x, p.y, '#ffc93c', 12, 150);
        } else if (dy <= RING.radius) {
          state.score += RING.points;
          state.ringsHit += 1;
          ring.passed = true;
          events.push({ type: 'ring', points: RING.points });
          popup(ring.x, ring.y - 60, `RING +${RING.points}`, '#7ddc8a');
        } else {
          popup(ring.x, ring.y - 60, 'MISSED', '#b8c4d4');
        }
      }
    }

    // Pickups: stars, mailbags and fuel cans.
    for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
      const item = state.pickups[i];
      item.bob += dt * 2.2;
      const dx = item.x - PLANE.x;
      const dy = item.y + Math.sin(item.bob) * 6 - p.y;
      if (dx * dx + dy * dy < 34 * 34) {
        if (item.kind === 'fuel') {
          p.fuel = Math.min(100, p.fuel + 34);
          p.engineOn = true;
          events.push({ type: 'fuel' });
          popup(item.x, item.y - 30, 'FUEL +34', '#7ddc8a');
          burst(item.x, item.y, '#7ddc8a', 8, 110);
        } else {
          const points = item.kind === 'mail' ? PICKUP.mailPoints : PICKUP.starPoints;
          state.score += points;
          events.push({ type: 'pickup', kind: item.kind, points });
          popup(item.x, item.y - 30, `+${points}`, '#ffd97a');
          burst(item.x, item.y, '#ffd97a', 8, 110);
        }
        state.pickups.splice(i, 1);
      }
    }

    // Collisions, forgiving by a few pixels; the shield covers the aftermath.
    if (p.shield <= 0) {
      const hit = (x, y, radius) => {
        const dx = x - PLANE.x;
        const dy = y - p.y;
        return dx * dx + dy * dy < (radius + 20) * (radius + 20);
      };
      let struck = null;
      for (const cloud of state.clouds) {
        if (hit(cloud.x, cloud.y, cloud.radius * 0.8)) { struck = 'storm cloud'; break; }
      }
      if (!struck) {
        for (let i = state.balloons.length - 1; i >= 0; i -= 1) {
          if (hit(state.balloons[i].x, state.balloons[i].y - 8, 30)) {
            struck = 'balloon';
            burst(state.balloons[i].x, state.balloons[i].y, '#e05252', 14, 170);
            state.balloons.splice(i, 1);
            break;
          }
        }
      }
      if (!struck) {
        for (let i = state.birds.length - 1; i >= 0; i -= 1) {
          if (hit(state.birds[i].x, state.birds[i].y, 9)) {
            struck = 'bird';
            burst(state.birds[i].x, state.birds[i].y, '#2b2b33', 8, 120);
            state.birds.splice(i, 1);
            break;
          }
        }
      }
      if (struck) {
        p.shield = 2;
        p.vy = -210;
        events.push({ type: 'hit', what: struck });
        popup(PLANE.x, p.y - 64, `HIT — ${struck.toUpperCase()}!`, '#ff6b5e');
        burst(PLANE.x, p.y, '#ff6b5e', 12, 160);
      }
    }

    // Particles and popups age out.
    for (let i = state.puffs.length - 1; i >= 0; i -= 1) {
      const puff = state.puffs[i];
      puff.age += dt;
      puff.x += puff.vx * dt;
      puff.y += puff.vy * dt;
      if (puff.age >= puff.ttl) state.puffs.splice(i, 1);
    }
    for (let i = state.popups.length - 1; i >= 0; i -= 1) {
      const pop = state.popups[i];
      pop.age += dt;
      pop.y -= 34 * dt;
      if (pop.age >= pop.ttl) state.popups.splice(i, 1);
    }
    return events;
  }

  return {
    state,
    get seed() {
      return currentSeed;
    },
    reset,
    step,
    burst,
    popup,
  };
}
