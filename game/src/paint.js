// Every pixel of Sky Courier: the late-afternoon sky, ridged mountains,
// patchwork fields with a river and a runway, the route's rings and
// pickups, its storm clouds, balloons and birds, and the instrument HUD —
// score, distance and rings on the top bar, altitude, speed and heading
// beside them, an attitude ball, a compass strip and a fuel gauge below.
// The painter scales the fixed 1280x720 field to the window.

import { FIELD, FONT, PALETTE, PLANE } from './settings.js';
import { groundSurfaceY, hashSegment, hillHeight } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createPainter(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height) * 1;
    const ox = (canvas.width - FIELD.width * scale) / 2;
    const oy = (canvas.height - FIELD.height * scale) / 2;
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
  }

  function drawSky(distancePx, time) {
    const sky = ctx.createLinearGradient(0, 0, 0, FIELD.horizonY);
    sky.addColorStop(0, PALETTE.skyTop);
    sky.addColorStop(0.55, PALETTE.skyMid);
    sky.addColorStop(1, PALETTE.skyLow);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, FIELD.width, FIELD.horizonY + 2);

    // Low sun with a warm halo, sinking as the flight goes on.
    const sunX = 1060;
    const sunY = 150 + Math.min(60, distancePx * 0.002);
    const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 150);
    glow.addColorStop(0, 'rgba(255, 243, 196, 0.95)');
    glow.addColorStop(0.25, 'rgba(255, 179, 71, 0.55)');
    glow.addColorStop(1, 'rgba(255, 179, 71, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sunX - 150, sunY - 150, 300, 300);
    ctx.fillStyle = PALETTE.sunCore;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCloudPuff(x, y, scale, colour) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(x, y, 26 * scale, 0, Math.PI * 2);
    ctx.arc(x + 24 * scale, y + 6 * scale, 20 * scale, 0, Math.PI * 2);
    ctx.arc(x - 26 * scale, y + 8 * scale, 18 * scale, 0, Math.PI * 2);
    ctx.arc(x + 2 * scale, y - 14 * scale, 20 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawMountains(distancePx, parallax, base, amp, colour) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(0, FIELD.horizonY);
    for (let sx = 0; sx <= FIELD.width; sx += 16) {
      const x = sx + distancePx * parallax;
      const y = base
        - Math.abs(Math.sin(x * 0.0042 + 1.2)) * amp
        - Math.abs(Math.sin(x * 0.011 + 4.0)) * amp * 0.35;
      ctx.lineTo(sx, y);
    }
    ctx.lineTo(FIELD.width, FIELD.horizonY);
    ctx.closePath();
    ctx.fill();
  }

  /** The receding plain between the horizon and the near fields. */
  function drawFarGround() {
    const wash = ctx.createLinearGradient(0, FIELD.horizonY, 0, FIELD.height);
    wash.addColorStop(0, '#a9bd8a');
    wash.addColorStop(0.5, '#8fae6b');
    wash.addColorStop(1, '#7fae56');
    ctx.fillStyle = wash;
    ctx.fillRect(0, FIELD.horizonY, FIELD.width, FIELD.height - FIELD.horizonY);
    ctx.strokeStyle = 'rgba(90, 120, 70, 0.5)';
    ctx.lineWidth = 2;
    for (const y of [500, 540, 585]) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(FIELD.width, y);
      ctx.stroke();
    }
  }

  function drawTerrain(world) {
    const distancePx = world.state.distancePx;
    // Field strips, one colour per 240 px segment, from a fixed hash.
    for (let sx = 0; sx < FIELD.width; sx += 8) {
      const absX = distancePx + sx;
      const seg = Math.floor(absX / 240);
      const pick = hashSegment(seg);
      const colour = pick < 0.36 ? PALETTE.fieldA : pick < 0.68 ? PALETTE.fieldB : PALETTE.fieldC;
      ctx.fillStyle = colour;
      const top = groundSurfaceY(absX);
      ctx.fillRect(sx, top, 9, FIELD.height - top);
    }
    // The river: a blue band crossing the fields at one fixed stretch.
    const riverStart = 5200 - distancePx;
    if (riverStart < FIELD.width && riverStart + 240 > 0) {
      ctx.fillStyle = PALETTE.river;
      ctx.beginPath();
      ctx.moveTo(Math.max(0, riverStart), FIELD.height);
      ctx.lineTo(Math.max(0, riverStart), groundSurfaceY(5200));
      ctx.lineTo(Math.min(FIELD.width, riverStart + 240), groundSurfaceY(5440));
      ctx.lineTo(Math.min(FIELD.width, riverStart + 240), FIELD.height);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(Math.max(0, riverStart), groundSurfaceY(5200) + 26);
      ctx.lineTo(Math.min(FIELD.width, riverStart + 240), groundSurfaceY(5440) + 26);
      ctx.stroke();
    }
    // Roads: a grey band every seventh segment.
    for (let sx = 0; sx < FIELD.width; sx += 8) {
      const absX = distancePx + sx;
      const seg = Math.floor(absX / 240);
      if (((seg % 7) + 7) % 7 === 3) {
        ctx.fillStyle = PALETTE.road;
        const top = groundSurfaceY(absX);
        ctx.fillRect(sx, top, 9, FIELD.height - top);
      }
    }
    // Trees, houses and hay bales, one feature per segment at most, and
    // never on the runway strip the flight starts from.
    for (let seg = Math.floor(distancePx / 240); seg <= Math.floor((distancePx + FIELD.width) / 240); seg += 1) {
      const pick = hashSegment(seg);
      const centreX = seg * 240 + 120;
      if (centreX < 1000) continue;
      const cx = centreX + (hashSegment(seg + 57) - 0.5) * 120 - distancePx;
      const gy = groundSurfaceY(centreX + (hashSegment(seg + 57) - 0.5) * 120);
      if (pick < 0.22) {
        ctx.fillStyle = '#6d4c2f';
        ctx.fillRect(cx - 3, gy - 22, 6, 22);
        ctx.fillStyle = '#3f7a34';
        ctx.beginPath();
        ctx.arc(cx, gy - 30, 16, 0, Math.PI * 2);
        ctx.arc(cx - 12, gy - 20, 10, 0, Math.PI * 2);
        ctx.arc(cx + 12, gy - 20, 10, 0, Math.PI * 2);
        ctx.fill();
      } else if (pick < 0.3) {
        ctx.fillStyle = '#e8dcc0';
        ctx.fillRect(cx - 18, gy - 26, 36, 26);
        ctx.fillStyle = '#a34a3a';
        ctx.beginPath();
        ctx.moveTo(cx - 22, gy - 26);
        ctx.lineTo(cx, gy - 40);
        ctx.lineTo(cx + 22, gy - 26);
        ctx.closePath();
        ctx.fill();
      } else if (pick < 0.38) {
        ctx.fillStyle = '#d9b45b';
        ctx.beginPath();
        ctx.arc(cx, gy - 8, 12, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(cx - 12, gy - 8, 24, 8);
      }
    }
    // The runway: a flat grey strip with dashes and a 27 marker, at the start.
    const runwayStart = -distancePx;
    if (runwayStart < FIELD.width && runwayStart + 900 > 0) {
      const x0 = Math.max(0, runwayStart);
      const x1 = Math.min(FIELD.width, runwayStart + 900);
      ctx.fillStyle = PALETTE.runway;
      ctx.fillRect(x0, FIELD.groundY, x1 - x0, FIELD.height - FIELD.groundY);
      ctx.fillStyle = PALETTE.runwayMark;
      for (let x = Math.max(x0, runwayStart + 40); x < x1 - 20; x += 70) {
        ctx.fillRect(x, FIELD.groundY + 16, 34, 5);
      }
      if (runwayStart + 830 > 0 && runwayStart + 830 < FIELD.width) {
        ctx.font = `bold 26px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('27', runwayStart + 845, FIELD.groundY + 34);
      }
    }
  }

  function drawRing(ring, time) {
    const bob = Math.sin(ring.wobble) * 4;
    const y = ring.y + bob;
    ctx.save();
    ctx.translate(ring.x, y);
    const glow = ctx.createRadialGradient(0, 0, 30, 0, 0, 78);
    glow.addColorStop(0, 'rgba(255, 201, 60, 0)');
    glow.addColorStop(1, 'rgba(255, 157, 0, 0.35)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 78, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 11;
    ctx.strokeStyle = PALETTE.ringGold;
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(0, 0, 52, -2.4, -0.9);
    ctx.stroke();
    ctx.fillStyle = '#7a5b00';
    ctx.font = `bold 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('MAIL', 0, -62);
    ctx.restore();
  }

  function drawPickup(item) {
    const y = item.y + Math.sin(item.bob) * 6;
    ctx.save();
    ctx.translate(item.x, y);
    if (item.kind === 'star') {
      ctx.fillStyle = '#ffd94a';
      ctx.beginPath();
      for (let i = 0; i < 10; i += 1) {
        const r = i % 2 === 0 ? 18 : 8;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#b8860b';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (item.kind === 'mail') {
      ctx.fillStyle = '#fdf6e3';
      roundRect(ctx, -17, -12, 34, 24, 3);
      ctx.fill();
      ctx.strokeStyle = '#d8443a';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-17, -12);
      ctx.lineTo(0, 2);
      ctx.lineTo(17, -12);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#c22f28';
      roundRect(ctx, -14, -14, 28, 28, 5);
      ctx.fill();
      ctx.fillStyle = '#8f1d17';
      ctx.fillRect(4, -20, 12, 7);
      ctx.fillStyle = '#fdf6e3';
      ctx.font = `bold 15px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('F', 0, 6);
    }
    ctx.restore();
  }

  function drawBalloon(balloon, time) {
    const y = balloon.y + Math.sin(balloon.bob + time * 0.8) * 8;
    const colours = { red: PALETTE.balloonRed, blue: PALETTE.balloonBlue, yellow: PALETTE.balloonYellow };
    ctx.save();
    ctx.translate(balloon.x, y);
    ctx.fillStyle = colours[balloon.hue] || PALETTE.balloonRed;
    ctx.beginPath();
    ctx.arc(0, -14, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(-9, -24, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5a4632';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, 10);
    ctx.lineTo(-8, 22);
    ctx.moveTo(18, 10);
    ctx.lineTo(8, 22);
    ctx.stroke();
    ctx.fillStyle = '#8a6b45';
    ctx.fillRect(-9, 22, 18, 12);
    ctx.restore();
  }

  function drawStormCloud(cloud, time) {
    ctx.save();
    ctx.translate(cloud.x, cloud.y);
    drawCloudPuff(0, 0, cloud.radius / 34, PALETTE.stormDark);
    drawCloudPuff(6, 14, cloud.radius / 44, PALETTE.stormBelly);
    if (cloud.flash > 0) {
      ctx.strokeStyle = '#ffe95e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-8, 26);
      ctx.lineTo(2, 44);
      ctx.lineTo(-4, 44);
      ctx.lineTo(8, 64);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBird(bird) {
    const flap = Math.sin(bird.phase) * 7;
    ctx.strokeStyle = PALETTE.bird;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bird.x - 11, bird.y - flap);
    ctx.quadraticCurveTo(bird.x - 4, bird.y + 3, bird.x, bird.y);
    ctx.quadraticCurveTo(bird.x + 4, bird.y + 3, bird.x + 11, bird.y - flap);
    ctx.stroke();
  }

  function drawHud(world, pilot, lives) {
    const s = world.state;
    const p = pilot.state;
    // Top instrument bar.
    ctx.fillStyle = PALETTE.hudPanel;
    ctx.fillRect(0, 0, FIELD.width, 48);
    ctx.fillStyle = PALETTE.hudEdge;
    ctx.fillRect(0, 48, FIELD.width, 3);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = `bold 22px ${FONT}`;
    ctx.fillText(`SCORE ${String(Math.floor(s.score)).padStart(6, '0')}`, 18, 25);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = `17px ${FONT}`;
    ctx.fillText(`DIST ${(s.distanceM / 1000).toFixed(2)} km`, 240, 25);
    ctx.fillText(`RINGS ${s.ringsHit}/${s.ringsPassed}`, 400, 25);
    ctx.fillText(`LV ${s.level}`, 520, 25);
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = `bold 22px ${FONT}`;
    ctx.fillText(`ALT ${pilot.altitudeFeet().toLocaleString('en-US')} FT`, 880, 25);
    ctx.fillText(`SPD ${pilot.speedKnots()} KT`, 1060, 25);
    ctx.fillStyle = p.fuel < 25 ? PALETTE.hudBad : PALETTE.hudText;
    ctx.fillText(`HDG ${String(pilot.headingDegrees()).padStart(3, '0')}°`, 1240, 25);

    // Attitude ball, bottom left: the horizon tilts with the climb angle.
    const ax = 66;
    const ay = 646;
    ctx.save();
    ctx.beginPath();
    ctx.arc(ax, ay, 34, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#7fb8dd';
    ctx.fillRect(ax - 34, ay - 34, 68, 34);
    ctx.fillStyle = '#8a6b45';
    ctx.fillRect(ax - 34, ay, 68, 34);
    ctx.translate(ax, ay);
    ctx.rotate(-p.pitch);
    ctx.fillStyle = '#fdf6e3';
    ctx.fillRect(-34, -2, 68, 4);
    ctx.restore();
    ctx.strokeStyle = PALETTE.hudEdge;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ax, ay, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fdf6e3';
    ctx.beginPath();
    ctx.moveTo(ax - 12, ay);
    ctx.lineTo(ax + 12, ay);
    ctx.lineTo(ax, ay + 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = `12px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('ATTITUDE', ax, ay + 50);

    // Compass strip, bottom centre.
    const cx = FIELD.width / 2;
    const cy = 664;
    ctx.fillStyle = PALETTE.hudPanel;
    roundRect(ctx, cx - 170, cy - 26, 340, 44, 8);
    ctx.fill();
    ctx.strokeStyle = PALETTE.hudEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
    const heading = pilot.headingDegrees();
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, cx - 170, cy - 26, 340, 44, 8);
    ctx.clip();
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = `15px ${FONT}`;
    ctx.textAlign = 'center';
    for (let d = -60; d <= 60; d += 15) {
      const hdg = ((heading + d) % 360 + 360) % 360;
      const x = cx + d * 2.4;
      ctx.fillText(String(hdg).padStart(3, '0'), x, cy - 8);
      ctx.fillRect(x - 1, cy + 2, 2, 8);
    }
    ctx.restore();
    ctx.fillStyle = PALETTE.hudEdge;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 26);
    ctx.lineTo(cx - 7, cy - 36);
    ctx.lineTo(cx + 7, cy - 36);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText(String(heading).padStart(3, '0'), cx, cy + 12);

    // Fuel gauge and lives, bottom right.
    const fx = 1200;
    const fy = 600;
    ctx.fillStyle = PALETTE.hudPanel;
    roundRect(ctx, fx - 46, fy - 14, 92, 96, 8);
    ctx.fill();
    ctx.strokeStyle = PALETTE.hudEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
    const fuelH = 62 * (p.fuel / 100);
    ctx.fillStyle = p.fuel < 25 ? PALETTE.hudBad : p.fuel < 50 ? PALETTE.hudWarn : PALETTE.hudGood;
    ctx.fillRect(fx - 34, fy + 56 - fuelH, 20, fuelH);
    ctx.strokeStyle = PALETTE.hudDim;
    ctx.lineWidth = 1;
    ctx.strokeRect(fx - 34, fy - 6, 20, 62);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = `bold 13px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('FUEL', fx - 8, fy + 2);
    ctx.fillText(`${Math.round(p.fuel)}%`, fx - 8, fy + 22);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = `12px ${FONT}`;
    ctx.fillText('LIVES', fx - 34, fy + 74);
    for (let i = 0; i < lives; i += 1) {
      ctx.fillStyle = PALETTE.planeRed;
      ctx.beginPath();
      ctx.moveTo(fx - 30 + i * 20, fy + 66);
      ctx.lineTo(fx - 18 + i * 20, fy + 66);
      ctx.lineTo(fx - 24 + i * 20, fy + 60);
      ctx.closePath();
      ctx.fill();
    }
    if (p.fuel < 25 && p.engineOn) {
      ctx.fillStyle = Math.floor(Date.now() / 400) % 2 === 0 ? PALETTE.hudBad : PALETTE.hudText;
      ctx.font = `bold 20px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('LOW FUEL — FIND A CAN', FIELD.width / 2, 84);
    }
  }

  function drawPopups(world) {
    ctx.textAlign = 'center';
    ctx.font = `bold 20px ${FONT}`;
    for (const pop of world.state.popups) {
      ctx.globalAlpha = Math.max(0, 1 - pop.age / pop.ttl);
      ctx.fillStyle = pop.colour;
      ctx.fillText(pop.text, pop.x, pop.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawPuffs(world) {
    for (const puff of world.state.puffs) {
      ctx.globalAlpha = Math.max(0, 1 - puff.age / puff.ttl) * 0.8;
      ctx.fillStyle = puff.colour;
      ctx.beginPath();
      ctx.arc(puff.x, puff.y, puff.size * (1 + puff.age), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawPanel(title, lines, accent) {
    ctx.fillStyle = 'rgba(10, 14, 24, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const w = 620;
    const h = 120 + lines.length * 34;
    const x = (FIELD.width - w) / 2;
    const y = (FIELD.height - h) / 2;
    ctx.fillStyle = 'rgba(16, 22, 34, 0.92)';
    roundRect(ctx, x, y, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = `bold 44px ${FONT}`;
    ctx.fillText(title, FIELD.width / 2, y + 62);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = `19px ${FONT}`;
    lines.forEach((line, i) => {
      ctx.fillText(line, FIELD.width / 2, y + 108 + i * 34);
    });
  }

  /**
   * Paint one frame.
   * view: { world, pilot, screen, best, lives, flash, stats }
   */
  function draw(view) {
    fit();
    const { world, pilot } = view;
    const s = world.state;
    const time = s.elapsed;
    ctx.fillStyle = PALETTE.skyTop;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    drawSky(s.distancePx, time);
    for (const cloud of s.ambient) drawCloudPuff(cloud.x, cloud.y, cloud.scale, 'rgba(255,255,255,0.92)');
    drawFarGround();
    drawMountains(s.distancePx, 0.22, FIELD.horizonY, 150, PALETTE.mountainFar);
    drawMountains(s.distancePx, 0.45, FIELD.horizonY, 90, PALETTE.mountainNear);
    drawTerrain(world);
    for (const ring of s.rings) drawRing(ring, time);
    for (const item of s.pickups) drawPickup(item);
    for (const balloon of s.balloons) drawBalloon(balloon, time);
    for (const cloud of s.clouds) drawStormCloud(cloud, time);
    for (const bird of s.birds) drawBird(bird);
    drawPuffs(world);
    pilot.draw(ctx);
    drawPopups(world);

    if (view.screen === SCREEN_PLAY || view.screen === SCREEN_PAUSED) {
      drawHud(world, pilot, view.lives);
    }

    if (view.flash > 0) {
      ctx.fillStyle = `rgba(255, 60, 40, ${Math.min(0.35, view.flash * 0.5)})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }

    if (view.screen === SCREEN_TITLE) {
      ctx.fillStyle = 'rgba(10, 14, 24, 0.45)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.hudEdge;
      ctx.font = `bold 76px ${FONT}`;
      ctx.fillText('SKY COURIER', FIELD.width / 2, 168);
      ctx.fillStyle = PALETTE.hudText;
      ctx.font = `bold 26px ${FONT}`;
      ctx.fillText('AIRMAIL RUN — thread the rings, dodge the storms', FIELD.width / 2, 214);
      ctx.font = `19px ${FONT}`;
      ctx.fillStyle = PALETTE.muted;
      ctx.fillText('↑ / W or hold the mouse — climb    ↓ / S — dive    ← → — throttle    P — pause', FIELD.width / 2, 262);
      ctx.fillStyle = PALETTE.hudText;
      ctx.font = `bold 24px ${FONT}`;
      const blink = Math.floor(time * 2) % 2 === 0;
      if (blink) ctx.fillText('PRESS SPACE OR CLICK TO TAKE OFF', FIELD.width / 2, 316);
      if (view.best > 0) {
        ctx.fillStyle = PALETTE.hudDim;
        ctx.font = `18px ${FONT}`;
        ctx.fillText(`BEST SCORE ${view.best.toLocaleString('en-US')}`, FIELD.width / 2, 352);
      }
      drawHud(world, pilot, view.lives);
    } else if (view.screen === SCREEN_PAUSED) {
      drawPanel('PAUSED', ['Press P or Space to keep flying'], PALETTE.hudEdge);
    } else if (view.screen === SCREEN_OVER) {
      const st = view.stats;
      const lines = [
        `SCORE ${Math.floor(st.score).toLocaleString('en-US')}    DISTANCE ${(st.distanceM / 1000).toFixed(2)} km`,
        `RINGS ${st.ringsHit} threaded    ${st.perfects} perfect`,
        st.newBest ? 'NEW BEST SCORE!' : `BEST ${Math.floor(st.best).toLocaleString('en-US')}`,
        'Press Space or click to fly again',
      ];
      drawPanel('FLIGHT OVER', lines, PALETTE.hudBad);
    }
  }

  return { draw, fit };
}
