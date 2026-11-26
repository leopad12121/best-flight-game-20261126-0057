// The courier aircraft: one red-and-cream high-wing monoplane, drawn in side
// profile facing right. It owns its flight model — takeoff roll, climb and
// dive, throttle, fuel burn and the brief invulnerability after a hit — and
// draws itself banked to its climb angle, propeller spinning.

import { FIELD, FUEL, PLANE } from './settings.js';

export function createPilot() {
  const state = {
    y: FIELD.groundY - 16,
    vy: 0,
    /** 0 for idle, 1 for full throttle. */
    throttle: 0.4,
    speed: 0,
    fuel: FUEL.start,
    /** Visual bank angle, in radians; follows the climb rate. */
    pitch: 0,
    /** Seconds of prop spin, for the blur disc and puffs. */
    propTime: 0,
    /** True while the wheels are still on the runway. */
    grounded: true,
    /** Seconds of post-hit invulnerability left. */
    shield: 0,
    /** True while the engine has fuel to burn. */
    engineOn: true,
  };

  function reset() {
    state.y = FIELD.groundY - 16;
    state.vy = 0;
    state.throttle = 0.4;
    state.speed = 0;
    state.fuel = FUEL.start;
    state.pitch = 0;
    state.propTime = 0;
    state.grounded = true;
    state.shield = 0;
    state.engineOn = true;
  }

  /**
   * Advance the flight model one fixed step.
   * @returns 'liftoff' the moment the wheels leave the runway, else null.
   */
  function step(dt, pitchInput, throttleInput) {
    state.propTime += dt;
    if (state.shield > 0) state.shield -= dt;

    state.throttle = Math.min(1, Math.max(0.25, state.throttle + throttleInput * dt * 0.9));
    const burning = state.engineOn && state.fuel > 0;
    if (burning) state.fuel = Math.max(0, state.fuel - FUEL.burn * state.throttle * dt);
    if (state.fuel <= 0) state.engineOn = false;

    if (state.grounded) {
      // Takeoff roll: the engine spools up, the aircraft gathers speed, and
      // past liftoff speed the wing takes over.
      state.speed = Math.min(PLANE.cruise, state.speed + 260 * dt);
      state.throttle = Math.min(1, state.throttle + dt * 0.8);
      if (state.speed >= PLANE.cruise * 0.82) {
        state.grounded = false;
        // A real climb-out: the wing takes the aircraft well clear of the
        // runway before level flight settles, so a fresh takeoff does not
        // sink straight back into the ground.
        state.vy = -180;
        return 'liftoff';
      }
      return null;
    }

    const lift = burning ? PLANE.climbRate : PLANE.climbRate * 0.35;
    if (pitchInput < 0) state.vy -= lift * dt;
    else if (pitchInput > 0) state.vy += lift * 0.85 * dt;
    else {
      // Level flight: the wing holds the aircraft, sinking only gently
      // (harder with a dead engine, when the nose drops for good).
      const sink = burning ? 10 : 150;
      state.vy += (sink - state.vy) * Math.min(1, dt * 2.2);
    }
    state.vy = Math.min(PLANE.maxSink, Math.max(-PLANE.maxClimb, state.vy));
    state.y += state.vy * dt;

    const diveBonus = Math.max(0, state.vy) * 0.35;
    const target = PLANE.cruise * (0.55 + 0.45 * state.throttle) + diveBonus;
    const clamped = Math.min(PLANE.maxSpeed, Math.max(PLANE.minSpeed, target));
    state.speed += (clamped - state.speed) * Math.min(1, dt * 1.6);

    const wanted = Math.max(-0.42, Math.min(0.5, state.vy / 900));
    state.pitch += (wanted - state.pitch) * Math.min(1, dt * 6);
    return null;
  }

  /** Idle spin on the title screen: the prop turns over slowly, nothing else moves. */
  function idle(dt) {
    state.propTime += dt * 0.25;
  }

  /** Back in the air after a hit: mid-sky, steady, a short shield, some fuel. */
  function respawn() {
    state.y = 300;
    state.vy = 0;
    state.throttle = 0.7;
    state.speed = 240;
    state.fuel = Math.max(state.fuel, 30);
    state.engineOn = state.fuel > 0;
    state.pitch = 0;
    state.grounded = false;
    state.shield = 2.5;
  }

  /** Altitude above the ground, in feet, for the HUD. */
  function altitudeFeet() {
    return Math.max(0, Math.round((FIELD.groundY - state.y) * 3.2));
  }

  /** Airspeed in knots, for the HUD. */
  function speedKnots() {
    return Math.round(state.speed * 0.62);
  }

  /** Compass heading in degrees: 090 level, swinging with the climb angle. */
  function headingDegrees() {
    return Math.round(90 - state.pitch * 57);
  }

  function draw(ctx) {
    ctx.save();
    ctx.translate(PLANE.x, state.y);
    ctx.rotate(state.pitch);
    if (state.shield > 0 && Math.floor(state.propTime * 12) % 2 === 0) ctx.globalAlpha = 0.35;

    // Tail fin and stabiliser.
    ctx.fillStyle = '#b02e28';
    ctx.beginPath();
    ctx.moveTo(-34, -4);
    ctx.lineTo(-48, -26);
    ctx.lineTo(-36, -26);
    ctx.lineTo(-24, -4);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-50, -6, 26, 5);

    // Fuselage: cream belly, red spine, courier stripe.
    ctx.fillStyle = '#d8443a';
    ctx.beginPath();
    ctx.moveTo(-52, -2);
    ctx.quadraticCurveTo(-52, -16, -28, -18);
    ctx.lineTo(18, -18);
    ctx.quadraticCurveTo(44, -16, 52, -4);
    ctx.quadraticCurveTo(44, 8, 16, 10);
    ctx.lineTo(-30, 10);
    ctx.quadraticCurveTo(-50, 8, -52, -2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fdf3d8';
    ctx.beginPath();
    ctx.moveTo(-50, 2);
    ctx.lineTo(46, 2);
    ctx.quadraticCurveTo(40, 9, 16, 10);
    ctx.lineTo(-30, 10);
    ctx.quadraticCurveTo(-48, 8, -50, 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffb347';
    ctx.fillRect(-30, -1, 62, 3);

    // Cockpit window and courier roundel.
    ctx.fillStyle = '#bfe6f2';
    ctx.beginPath();
    ctx.moveTo(8, -17);
    ctx.lineTo(30, -17);
    ctx.quadraticCurveTo(38, -15, 38, -8);
    ctx.lineTo(8, -8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#2e2a26';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fdf3d8';
    ctx.beginPath();
    ctx.arc(-8, -6, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d8443a';
    ctx.beginPath();
    ctx.arc(-8, -6, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // High wing and strut.
    ctx.fillStyle = '#b02e28';
    ctx.beginPath();
    ctx.moveTo(-14, -16);
    ctx.lineTo(10, -16);
    ctx.lineTo(16, -30);
    ctx.lineTo(-6, -30);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#7d211c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2, -16);
    ctx.lineTo(8, -4);
    ctx.stroke();

    // Spinning propeller: seen side-on it is a thin vertical disc, blurred
    // by the spin, with a dark hub — never a cross.
    const spin = state.propTime * (state.engineOn ? 34 : 4);
    ctx.save();
    ctx.translate(54, -4);
    ctx.fillStyle = 'rgba(46, 42, 38, 0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 4, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(46, 42, 38, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(Math.sin(spin) * 2, -16);
    ctx.lineTo(-Math.sin(spin) * 2, 16);
    ctx.moveTo(Math.cos(spin) * 2, -16);
    ctx.lineTo(-Math.cos(spin) * 2, 16);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#2e2a26';
    ctx.beginPath();
    ctx.arc(54, -4, 4, 0, Math.PI * 2);
    ctx.fill();

    // Wheels: down on the runway, tucked away in flight.
    if (state.grounded) {
      ctx.strokeStyle = '#2e2a26';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-18, 10);
      ctx.lineTo(-18, 18);
      ctx.moveTo(22, 10);
      ctx.lineTo(22, 18);
      ctx.stroke();
      ctx.fillStyle = '#1d1a17';
      ctx.beginPath();
      ctx.arc(-18, 20, 5, 0, Math.PI * 2);
      ctx.arc(22, 20, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  return { state, reset, step, idle, respawn, draw, altitudeFeet, speedKnots, headingDegrees };
}
