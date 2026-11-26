// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// painter draws what is there. The game moves between four screens: title,
// play, paused and game over.
//
// ?seed=N fixes the route. ?shot=start|play|ring|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { BEST_KEY, LIVES, STEP } from './settings.js';
import { createWorld } from './world.js';
import { createPilot } from './pilot.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createControls } from './controls.js';
import { createPainter, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './paint.js';
import { stageShot } from './staging.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(seed);
const pilot = createPilot();
const painter = createPainter(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit.
  }
}

function runShot(name) {
  const view = stageShot(name, world, pilot, readBest);
  view.world = world;
  view.pilot = pilot;
  let painted = 0;
  function paint() {
    painter.draw(view);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const controls = createControls(canvas);
  let screen = SCREEN_TITLE;
  let lives = LIVES;
  let best = readBest();
  let flash = 0;
  let stats = null;
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the changes.
  function announce(message) {
    status.textContent = message;
  }

  function startFlight() {
    world.reset(seed);
    pilot.reset();
    lives = LIVES;
    stats = null;
    flash = 0;
    screen = SCREEN_PLAY;
    announce(`Flying. ${LIVES} lives. Thread the rings and watch your fuel.`);
  }

  function endFlight() {
    screen = SCREEN_OVER;
    const s = world.state;
    const score = Math.floor(s.score);
    const newBest = score > best;
    if (newBest) {
      best = score;
      saveBest(best);
    }
    stats = {
      score,
      distanceM: s.distanceM,
      ringsHit: s.ringsHit,
      perfects: s.perfects,
      best,
      newBest,
    };
    announce(`Flight over. Score ${score}. Best ${best}.`);
  }

  function loseLife(cause) {
    lives -= 1;
    flash = 0.7;
    if (lives <= 0) {
      endFlight();
      return;
    }
    pilot.respawn();
    announce(`Hit a ${cause}. ${lives} ${lives === 1 ? 'life' : 'lives'} left.`);
  }

  function handleActions() {
    const actions = controls.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startFlight();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Flying.');
    }
  }

  function applyEvents(events) {
    for (const event of events) {
      if (event.type === 'hit') loseLife(event.what);
      else if (event.type === 'crash') loseLife('the ground');
      if (screen !== SCREEN_PLAY) return;
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    handleActions();
    if (flash > 0) flash = Math.max(0, flash - elapsed);

    if (screen === SCREEN_TITLE) {
      pilot.idle(elapsed);
      world.state.elapsed += elapsed;
      for (const cloud of world.state.ambient) {
        cloud.x -= cloud.drift * elapsed;
        if (cloud.x < -140) cloud.x = FIELD_WIDTH_WRAP;
      }
    } else if (screen === SCREEN_PLAY) {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        pilot.step(STEP, controls.pitch(pilot.state.y), controls.throttle());
        const events = world.step(STEP, pilot);
        applyEvents(events);
        if (screen !== SCREEN_PLAY) break;
      }
    }

    painter.draw({
      world,
      pilot,
      screen,
      best,
      lives,
      flash,
      stats,
    });
  }

  announce('Sky Courier. Press Space or click to take off.');
  requestAnimationFrame(frame);
}

// A title-screen cloud that drifts off is wrapped to a fixed far edge.
const FIELD_WIDTH_WRAP = 1420;

if (shot === 'start' || shot === 'play' || shot === 'ring' || shot === 'end') {
  runShot(shot);
} else {
  runGame();
}
