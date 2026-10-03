(function () {
  const canvas = document.getElementById("bench");
  // Wide: 960 x 560. Narrow (phones): 400 x 400 with larger type, so labels stay readable.
  let W = 960, H = 560, NARROW = false, CX = 480, CY = 266, ctx;
  function layout() {
    NARROW = (canvas.parentElement.clientWidth || 960) < 640;
    W = NARROW ? 400 : 960; H = NARROW ? 400 : 560;
    CX = W / 2; CY = NARROW ? 200 : 266;
    canvas.setAttribute("width", W); canvas.setAttribute("height", H);
    ctx = Lab.setupCanvas(canvas, W, H);
  }
  layout();
  const MONO = "'IBM Plex Mono', ui-monospace, monospace";
  const fs = (px) => (NARROW ? Math.max(14, Math.round(px * 1.25)) : px) + "px ";
  const tr = (t) => (window.I18N ? I18N.t(t) : t);
  function wrap(text, x, y, maxW, lh) {
    text = tr(text);
    const cjk = /[\u3000-\u9fff]/.test(text);
    const words = cjk ? [...text] : text.split(" ");
    let line = "";
    for (const w of words) {
      const t = line ? line + (cjk ? "" : " ") + w : w;
      if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = w; }
      else line = t;
    }
    if (line) ctx.fillText(line, x, y);
    return y;
  }
  const $ = (id) => document.getElementById(id);

  // ---------- Units ----------
  // Geometric units: G = c = 1 and the mass M = 1, so lengths are in units of GM/c².
  const M = 1, RS = 2 * M;           // Schwarzschild radius
  const R_PHOTON = 3 * M;            // photon sphere, 1.5 r_s
  const R_ISCO = 6 * M;              // innermost stable circular orbit, 3 r_s
  const B_CRIT = 3 * Math.sqrt(3) * M; // critical impact parameter for light
  const BASE_SPEED = 150;            // M of proper time per real second at 1×

  const COLOURS = [[240, 179, 90], [92, 200, 255], [228, 139, 208], [120, 214, 150], [176, 156, 255], [255, 120, 110]];

  const state = {
    mode: "orbits", law: "both", tilt: true,
    running: !Lab.reducedMotion,
    speed: 1, b: 3.2 * RS, family: true,
    launches: [], particles: [], colourIdx: 0,
    rays: null, photonT: 0,
    drag: null,
  };

  // ---------- Physics ----------
  // Equations of motion in the orbital plane, parameterised by proper time (or affine parameter for light).
  // Einstein (Schwarzschild geodesic): r'' = -M/r² + h²/r³ - 3Mh²/r⁴, which in Cartesian form is
  //   a = -(M/r³)(1 + 3h²/r²) x   for particles,   a = -(3Mh²/r⁵) x   for light.
  // Dividing out dφ gives d²u/dφ² + u = M/h² + 3Mu² (particles) and d²u/dφ² + u = 3Mu² (light).
  // Newton: a = -(M/r³) x, with light treated as a particle moving at c.
  function accel(x, y, h, law, light, out) {
    const r2 = x * x + y * y, r = Math.sqrt(r2);
    let k;
    if (law === "E") k = light ? 3 * M * h * h / (r2 * r2 * r) : (M / (r2 * r)) * (1 + 3 * h * h / r2);
    else k = M / (r2 * r);
    out[0] = -k * x; out[1] = -k * y;
  }

  const a1 = [0, 0], a2 = [0, 0], a3 = [0, 0], a4 = [0, 0];
  function rk4(p, dt) {
    const { x, y, vx, vy, h, law, light } = p;
    accel(x, y, h, law, light, a1);
    const x2 = x + 0.5 * dt * vx, y2 = y + 0.5 * dt * vy, vx2 = vx + 0.5 * dt * a1[0], vy2 = vy + 0.5 * dt * a1[1];
    accel(x2, y2, h, law, light, a2);
    const x3 = x + 0.5 * dt * vx2, y3 = y + 0.5 * dt * vy2, vx3 = vx + 0.5 * dt * a2[0], vy3 = vy + 0.5 * dt * a2[1];
    accel(x3, y3, h, law, light, a3);
    const x4 = x + dt * vx3, y4 = y + dt * vy3, vx4 = vx + dt * a3[0], vy4 = vy + dt * a3[1];
    accel(x4, y4, h, law, light, a4);
    p.x += (dt / 6) * (vx + 2 * vx2 + 2 * vx3 + vx4);
    p.y += (dt / 6) * (vy + 2 * vy2 + 2 * vy3 + vy4);
    p.vx += (dt / 6) * (a1[0] + 2 * a2[0] + 2 * a3[0] + a4[0]);
    p.vy += (dt / 6) * (a1[1] + 2 * a2[1] + 2 * a3[1] + a4[1]);
  }

  function stepSize(p) {
    const r = Math.hypot(p.x, p.y), v = Math.hypot(p.vx, p.vy) || 1e-6;
    return Math.min(0.01 * Math.pow(r, 1.5), 0.02 * r / v);
  }

  // ---------- Particles ----------
  function makeParticle(ic, law, colour) {
    return {
      x: ic.x, y: ic.y, vx: ic.vx, vy: ic.vy,
      h: ic.x * ic.vy - ic.y * ic.vx, law, light: false, colour,
      trail: [[ic.x, ic.y]], alive: true, status: "orbiting",
      phi: Math.atan2(ic.y, ic.x), lastDr: null, peri: [], laps: 0,
      nPeri: 0, rmin: Math.hypot(ic.x, ic.y),
    };
  }

  function lawsToRun() { return state.law === "both" ? ["N", "E"] : [state.law === "newton" ? "N" : "E"]; }

  // A launch is a set of initial conditions; each law in play gets its own particle.
  // icFor(law) lets presets pick law-specific speeds (a circular orbit needs a different speed in each theory).
  function launch(icFor, label) {
    const colour = COLOURS[state.colourIdx++ % COLOURS.length];
    const L = { icFor, colour, label, parts: [] };
    for (const law of lawsToRun()) {
      const p = makeParticle(icFor(law), law, colour);
      L.parts.push(p);
      state.particles.push(p);
    }
    state.launches.push(L);
    if (state.launches.length > 6) {
      const old = state.launches.shift();
      state.particles = state.particles.filter((p) => !old.parts.includes(p));
    }
    if (Lab.reducedMotion && !state.running) preroll(L.parts);
    updateOrbitStats();
    if (!quietFates) W8.sound("tick", { pitch: 0.5 });
  }

  function relaunchAll() {
    const old = state.launches;
    state.launches = []; state.particles = []; state.colourIdx = 0;
    for (const L of old) launch(L.icFor, L.label);
  }

  function advanceParticle(p, tau) {
    let left = tau, guard = 0;
    while (left > 0 && p.alive && guard++ < 4000) {
      const dt = Math.min(stepSize(p), left);
      const px = p.x, py = p.y;
      rk4(p, dt);
      left -= dt;
      const r = Math.hypot(p.x, p.y);
      if (r < p.rmin) p.rmin = r;
      // Accumulated angle, for measuring how far the orbit turns between closest approaches.
      let dphi = Math.atan2(p.y, p.x) - Math.atan2(py, px);
      dphi -= 2 * Math.PI * Math.round(dphi / (2 * Math.PI));
      const dr = p.x * p.vx + p.y * p.vy;
      if (p.lastDr !== null && p.lastDr < 0 && dr >= 0) {
        p.peri.push(p.phi + dphi * (p.lastDr / (p.lastDr - dr)));
        p.nPeri++;
        if (p.peri.length > 8) p.peri.shift();
      }
      p.lastDr = dr;
      p.phi += dphi;
      const last = p.trail[p.trail.length - 1];
      if (Math.hypot(p.x - last[0], p.y - last[1]) > 0.35) {
        p.trail.push([p.x, p.y]);
        if (p.trail.length > 2400) p.trail.splice(0, p.trail.length - 2400);
      }
      if (r < RS || (p.law === "N" && r < 0.6 * M)) {
        p.alive = false;
        p.status = r < RS && p.law === "E" ? "captured" : "hit the mass";
        p.trail.push([p.x, p.y]);
        fateEvent(p);
      } else if (r > 400 * M && dr > 0) {
        p.alive = false; p.status = "escaped";
        fateEvent(p);
      }
    }
  }

  function preroll(parts) {
    for (const p of parts) advanceParticle(p, 4000);
  }

  // Shift of the closest-approach direction per lap, in degrees, beyond a full turn.
  function shiftPerLap(p) {
    if (!p || p.peri.length < 2) return null;
    const n = p.peri.length;
    return Math.abs(p.peri[n - 1] - p.peri[n - 2]) * 180 / Math.PI - 360;
  }

  // ---------- Narration, sound and challenges ----------
  const W8 = window.WONDERS;
  let quietFates = false; // no narration while pre-rolling the opening orbit
  function fateEvent(p) {
    if (quietFates) return;
    if (p.status === "captured") { W8.describe("A particle fell through the event horizon into the black hole."); W8.sound("fail"); }
    else if (p.status === "hit the mass") { W8.describe("A Newtonian particle hit the central mass."); W8.sound("fail"); }
    else { W8.describe("A particle escaped to deep space."); W8.sound("event", { pitch: 0.8 }); }
  }
  function checkOrbitChallenges() {
    for (const L of state.launches) {
      if (L.label !== "your launch") continue;
      for (const p of L.parts) {
        if (!p.alive) continue;
        if (p.nPeri >= 3) W8.challenge("own-orbit");
        if (p.law === "E" && p.nPeri >= 5 && p.rmin < 4 * RS) W8.challenge("close-orbit");
      }
    }
  }
  function statsText(id) {
    return [...$(id).children].map((s) => s.textContent.replace(/\s+/g, " ").trim()).join(". ") + ".";
  }
  W8.describer(() => {
    if (state.mode === "orbits") {
      return tr("A black hole at the centre of a warped sheet, with test particles orbiting it. The dashed green ring is the last stable orbit at 3 rₛ.") + " " + statsText("orbitStats");
    }
    return tr("A black hole at the centre of a warped sheet, with light rays passing it from the left. The dashed yellow ring is the photon sphere at 1.5 rₛ.") + " " + statsText("lightStats");
  });

  // ---------- Presets ----------
  const tangential = (r, v) => ({ x: r, y: 0, vx: 0, vy: v });
  const PRESETS = {
    presetPrecess: { label: "precessing", icFor: () => tangential(40, 0.12) },
    presetCircle: { label: "circular", icFor: (law) => tangential(20, law === "E" ? Math.sqrt(M / (20 - 3 * M)) : Math.sqrt(M / 20)) },
    // At r = 6M the circular orbit is only marginally stable; a 0.2% nudge shows it.
    presetIsco: { label: "last stable", icFor: (law) => tangential(R_ISCO, (law === "E" ? Math.sqrt(M / (R_ISCO - 3 * M)) : Math.sqrt(M / R_ISCO)) * 0.998) },
    presetWhirl: { label: "zoom-whirl", icFor: () => tangential(40, 0.096) },
    presetPlunge: { label: "plunge", icFor: () => tangential(40, 0.09) },
  };

  // ---------- Light ----------
  const RAY_START = -400 * M;
  function traceRay(b, law) {
    const p = { x: RAY_START, y: b, vx: 1, vy: 0, h: -b, law, light: true };
    // h is x·vy − y·vx = −b; only h² enters the light equation.
    const pts = [];
    let turned = 0, prevAng = Math.atan2(p.vy, p.vx), rmin = Infinity, fate = "escapes", guard = 0;
    const R = viewRadius();
    while (guard++ < 200000) {
      const r = Math.hypot(p.x, p.y);
      rmin = Math.min(rmin, r);
      if (r < R) pts.push([p.x, p.y]);
      if (r < RS) { fate = "captured"; break; }
      if (law === "N" && r < 0.6 * M) { fate = "captured"; break; }
      if (p.x > 0 && r > 400 * M) break;
      const dt = Math.min(0.02 * r, r < R ? 0.08 : 50);
      rk4(p, dt);
      const ang = Math.atan2(p.vy, p.vx);
      let d = ang - prevAng; d -= 2 * Math.PI * Math.round(d / (2 * Math.PI));
      turned += d; prevAng = ang;
    }
    return { pts, deflection: Math.abs(turned), rmin, fate, law, b };
  }

  function computeRays() {
    const laws = lawsToRun();
    const main = laws.map((law) => traceRay(state.b, law));
    const family = [];
    if (state.family) {
      for (let k = 1; k <= 16; k++) {
        const b = k * 0.5 * RS;
        if (Math.abs(b - state.b) < 0.05) continue;
        family.push(traceRay(b, laws[laws.length - 1]));
      }
    }
    state.rays = { main, family };
    state.photonT = 0;
    updateLightStats();
    const e = main.find((q) => q.law === "E"), m = e || main[0];
    const b = (state.b / RS).toFixed(2);
    if (m.fate === "captured") W8.describe("Impact parameter " + b + " rₛ: the light is captured by the black hole.");
    else if (m.deflection >= 2 * Math.PI) W8.describe("Impact parameter " + b + " rₛ: the light loops around the black hole, turning through " + (m.deflection * 180 / Math.PI).toFixed(0) + "°, then escapes.");
    else W8.describe("Impact parameter " + b + " rₛ: the light escapes, bent by " + (m.deflection * 180 / Math.PI).toFixed(1) + "°.");
    if (e && e.fate !== "captured" && e.deflection >= 2 * Math.PI) W8.challenge("loop-light");
  }

  // ---------- Projection: an oblique view of Flamm's paraboloid ----------
  const viewRadius = () => (state.mode === "orbits" ? 44 * M : 9 * RS);
  const flamm = (r) => 2 * Math.sqrt(RS * Math.max(0, r - RS));
  function view() {
    const R = viewRadius();
    const cosT = state.tilt ? 0.55 : 1, sinT = state.tilt ? Math.sqrt(1 - cosT * cosT) : 0;
    const s = Math.min((W / 2 - (NARROW ? 14 : 40)) / R, (H / 2 - 30) / (R * cosT));
    const zR = flamm(R);
    const depthK = 0.55 * R / zR; // scale the funnel so its depth reads the same at any zoom
    return { R, cosT, sinT, s, zR, depthK };
  }
  let V = view();
  const depthPx = (r) => (V.zR - flamm(Math.max(r, RS))) * V.depthK * V.s * V.sinT;
  function project(x, y) {
    const r = Math.hypot(x, y);
    return [CX + x * V.s, CY - y * V.s * V.cosT + depthPx(r)];
  }
  // Screen point to sheet coordinates. The sheet's height depends on r, so iterate.
  function unproject(X, Y) {
    const x = (X - CX) / V.s;
    let y = (CY - Y) / (V.s * V.cosT);
    for (let i = 0; i < 40; i++) {
      const target = (CY - Y + depthPx(Math.hypot(x, y))) / (V.s * V.cosT);
      y = 0.5 * y + 0.5 * target;
    }
    return [x, y];
  }

  // ---------- Drawing ----------
  function drawSheet() {
    const R = V.R;
    const N = 12;
    const step = (2 * R) / N;
    ctx.lineWidth = 1;
    // Grid lines along x and along y, clipped to the circular sheet.
    for (let dir = 0; dir < 2; dir++) {
      for (let i = 0; i <= N; i++) {
        const c = -R + i * step;
        const half = Math.sqrt(Math.max(0, R * R - c * c));
        ctx.beginPath();
        let pen = false;
        for (let j = 0; j <= 160; j++) {
          const t = -half + (2 * half * j) / 160;
          const x = dir ? c : t, y = dir ? t : c;
          if (Math.hypot(x, y) < RS * 1.02) { pen = false; continue; }
          const [X, Y] = project(x, y);
          pen ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
          pen = true;
        }
        ctx.strokeStyle = "#1e2b44";
        ctx.stroke();
      }
    }
    // Rings at fixed radii to make the depth readable.
    const ring = (r, style, dash, width) => {
      ctx.strokeStyle = style; ctx.lineWidth = width || 1;
      ctx.setLineDash(dash || []);
      ctx.beginPath();
      for (let j = 0; j <= 120; j++) {
        const a = (j / 120) * Math.PI * 2;
        const [X, Y] = project(r * Math.cos(a), r * Math.sin(a));
        j ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      }
      ctx.stroke();
      ctx.setLineDash([]); ctx.lineWidth = 1;
    };
    ring(R, "#2a3852");
    if (state.mode === "orbits") ring(R_ISCO, "rgba(120,214,150,0.55)", [3, 4]);
    ring(R_PHOTON, state.mode === "light" ? "rgba(255,214,120,0.85)" : "rgba(255,214,120,0.35)", [4, 4], state.mode === "light" ? 1.4 : 1);

    // Event horizon: the throat of the funnel.
    ctx.fillStyle = "#000";
    ctx.beginPath();
    for (let j = 0; j <= 80; j++) {
      const a = (j / 80) * Math.PI * 2;
      const [X, Y] = project(RS * Math.cos(a), RS * Math.sin(a));
      j ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.closePath(); ctx.fill();
    ring(RS, "rgba(240,138,93,0.9)", null, 1.5);

    // Labels
    ctx.font = fs(11) + MONO;
    ctx.textAlign = "left";
    const lab = (r, text, colour) => {
      ctx.fillStyle = colour;
      if (NARROW) {
        // Centred under the ring's near edge, so it never runs off the right side.
        const [X, Y] = project(0, -r), Yh = project(0, -RS)[1];
        ctx.textAlign = "center"; ctx.fillText(text, X, Math.max(Y, Yh) + 22); ctx.textAlign = "left";
        return;
      }
      const [X, Y] = project(r * Math.cos(-0.45), r * Math.sin(-0.45));
      ctx.fillText(text, X + 6, Y + 4);
    };
    if (state.mode === "orbits") {
      lab(R_ISCO, "last stable orbit 3 rₛ", "rgba(120,214,150,0.9)");
    } else {
      lab(R_PHOTON, "photon sphere 1.5 rₛ", "rgba(255,214,120,0.95)");
      const [X, Y] = project(-RS * 0.2, -RS * 1.0);
      ctx.fillStyle = "rgba(240,138,93,0.95)"; ctx.textAlign = "right";
      if (NARROW) { const [hx, hy] = project(-RS * 1.1, RS * 0.6); ctx.fillText("horizon rₛ", hx - 8, hy - 8); }
      else ctx.fillText("horizon rₛ", X - 10, Y + 18);
      ctx.textAlign = "left";
    }
  }

  function strokePath(pts, style, width, dash) {
    if (pts.length < 2) return;
    ctx.strokeStyle = style; ctx.lineWidth = width;
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    let [X, Y] = project(pts[0][0], pts[0][1]); ctx.moveTo(X, Y);
    for (let i = 1; i < pts.length; i++) { [X, Y] = project(pts[i][0], pts[i][1]); ctx.lineTo(X, Y); }
    ctx.stroke();
    ctx.setLineDash([]); ctx.lineWidth = 1;
  }

  function drawParticles() {
    // Newton first (behind), then Einstein.
    for (const law of ["N", "E"]) {
      for (const p of state.particles) {
        if (p.law !== law) continue;
        const [r, g, b] = p.colour;
        const visible = p.trail.filter((q) => Math.hypot(q[0], q[1]) < V.R * 1.3);
        if (law === "N" && state.law === "both") strokePath(visible, "rgba(201,212,227,0.45)", 1.2, [4, 4]);
        else strokePath(visible, `rgba(${r},${g},${b},0.75)`, 1.6);
        if (p.alive && Math.hypot(p.x, p.y) < V.R * 1.3) {
          const [X, Y] = project(p.x, p.y);
          ctx.fillStyle = law === "N" && state.law === "both" ? "#c9d4e3" : `rgb(${r},${g},${b})`;
          ctx.beginPath(); ctx.arc(X, Y, law === "N" && state.law === "both" ? 3.5 : 5, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  }

  function drawDrag() {
    const d = state.drag || (state.kbOn ? kbAim() : null);
    if (!d) return;
    const [X0, Y0] = project(d.x0, d.y0);
    const [X1, Y1] = project(d.x1, d.y1);
    if (d.preview) strokePath(d.preview.filter((q) => Math.hypot(q[0], q[1]) < V.R * 1.2), "rgba(233,238,247,0.35)", 1, [2, 4]);
    ctx.strokeStyle = "#e9eef7"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1); ctx.stroke();
    const ang = Math.atan2(Y1 - Y0, X1 - X0);
    ctx.beginPath();
    ctx.moveTo(X1, Y1);
    ctx.lineTo(X1 - 9 * Math.cos(ang - 0.4), Y1 - 9 * Math.sin(ang - 0.4));
    ctx.lineTo(X1 - 9 * Math.cos(ang + 0.4), Y1 - 9 * Math.sin(ang + 0.4));
    ctx.closePath(); ctx.fillStyle = "#e9eef7"; ctx.fill();
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(X0, Y0, 5, 0, Math.PI * 2); ctx.fill();
    const v = dragVelocity(d);
    ctx.font = fs(12) + MONO;
    ctx.textAlign = "left";
    const txt = `r = ${(Math.hypot(d.x0, d.y0) / RS).toFixed(1)} rₛ   v = ${Math.hypot(v[0], v[1]).toFixed(3)} c`;
    // Keep the readout on screen: flip it to the left of the arrow near the right edge.
    if (X1 + 10 + ctx.measureText(txt).width > W - 6) { ctx.textAlign = "right"; ctx.fillText(txt, X1 - 10, Math.max(18, Y1 - 8)); ctx.textAlign = "left"; }
    else ctx.fillText(txt, X1 + 10, Math.max(18, Y1 - 8));
  }

  function drawRays() {
    if (!state.rays) return;
    for (const ray of state.rays.family) {
      const col = ray.fate === "captured" ? "rgba(240,138,93,0.28)" : "rgba(255,226,160,0.22)";
      strokePath(ray.pts, col, 1);
    }
    const both = state.law === "both";
    for (const ray of state.rays.main) {
      const isN = ray.law === "N";
      strokePath(ray.pts, isN && both ? "rgba(201,212,227,0.55)" : "rgba(255,226,160,0.95)", isN && both ? 1.2 : 2, isN && both ? [4, 4] : null);
      // A photon pulse travelling along the ray.
      if (!Lab.reducedMotion && ray.pts.length > 1) {
        const n = ray.pts.length;
        const i = Math.floor(state.photonT % (n + 60));
        if (i < n) {
          for (let k = 0; k < 14 && i - k * 2 >= 0; k++) {
            const [X, Y] = project(ray.pts[i - k * 2][0], ray.pts[i - k * 2][1]);
            ctx.fillStyle = isN && both ? `rgba(201,212,227,${0.8 * (1 - k / 14)})` : `rgba(255,240,200,${1 - k / 14})`;
            ctx.beginPath(); ctx.arc(X, Y, (k ? 2.6 : 4) * (1 - k / 20), 0, Math.PI * 2); ctx.fill();
          }
        }
      }
    }
    // Incoming beam marker on the left edge.
    const [X, Y] = project(-V.R * 0.98, state.b);
    ctx.fillStyle = "#ffe2a0";
    ctx.font = fs(11) + MONO;
    ctx.textAlign = "left";
    ctx.fillText(`b = ${(state.b / RS).toFixed(2)} rₛ`, X, Y - 10);
  }

  function drawLegend() {
    ctx.font = fs(12) + MONO;
    ctx.fillStyle = "#7f8ea6";
    ctx.textAlign = "left";
    ctx.fillText(state.mode === "orbits" ? "TEST PARTICLES" : "LIGHT RAYS", 18, 26);
    ctx.font = fs(11) + MONO;
    let y = H - 16;
    const lineH = NARROW ? 20 : 18, lx = NARROW ? 54 : 48;
    const item = (text, colour, dash) => {
      ctx.strokeStyle = colour; ctx.lineWidth = 2; ctx.setLineDash(dash || []);
      ctx.beginPath(); ctx.moveTo(18, y - 4); ctx.lineTo(40, y - 4); ctx.stroke();
      ctx.setLineDash([]); ctx.lineWidth = 1;
      ctx.fillStyle = "#9aa8bd"; ctx.fillText(text, lx, y);
      y -= lineH;
    };
    const solid = state.mode === "light" ? "rgba(255,226,160,0.95)" : "rgb(240,179,90)";
    if (state.law === "both") { item("Newton", "rgba(201,212,227,0.6)", [4, 4]); item("Einstein", solid); }
    else item(state.law === "newton" ? "Newton" : "Einstein", solid);
    ctx.textAlign = "right"; ctx.fillStyle = "#56647c";
    ctx.fillText(state.mode === "orbits" ? "sheet radius 22 rₛ" : "sheet radius 9 rₛ", W - 18, H - 16);
    if (state.mode === "orbits" && !state.drag && state.particles.length === 0) {
      ctx.textAlign = "center"; ctx.fillStyle = "#7f8ea6";
      ctx.font = fs(13) + "'IBM Plex Sans', system-ui, sans-serif";
      if (NARROW) wrap("Drag on the sheet to launch a particle, or pick a preset", CX, 52, W - 40, 20);
      else ctx.fillText("Drag on the sheet to launch a particle, or pick a preset", CX, 60);
    }
  }

  function draw() {
    V = view();
    ctx.fillStyle = "#05080e";
    ctx.fillRect(0, 0, W, H);
    // A soft glow deepening toward the centre, like looking down a well.
    const [gx, gy] = project(0, 0);
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, V.R * V.s * 0.9);
    g.addColorStop(0, "rgba(40,60,110,0.35)"); g.addColorStop(1, "rgba(40,60,110,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    drawSheet();
    if (state.mode === "orbits") { drawParticles(); drawDrag(); }
    else drawRays();
    drawLegend();
  }

  // ---------- Readouts ----------
  const fmtDeg = (d) => (d === null ? "–" : (Math.abs(d) < 0.05 ? "0.0" : d.toFixed(1)) + "°");
  function latest(law) {
    for (let i = state.launches.length - 1; i >= 0; i--) {
      const p = state.launches[i].parts.find((q) => q.law === law);
      if (p) return p;
    }
    return null;
  }
  function updateOrbitStats() {
    $("nParticles").textContent = state.particles.length;
    const e = latest("E"), n = latest("N");
    $("shiftE").textContent = e ? (e.alive || e.peri.length >= 2 ? fmtDeg(shiftPerLap(e)) : "–") : "–";
    $("shiftFormula").textContent = e ? fmtDeg(6 * Math.PI * M * M / (e.h * e.h) * 180 / Math.PI) : "–";
    $("shiftN").textContent = n ? fmtDeg(shiftPerLap(n)) : "–";
    const L = state.launches[state.launches.length - 1];
    if (!L) { $("fate").textContent = "–"; return; }
    $("fate").textContent = L.label + ": " + L.parts.map((p) => (L.parts.length > 1 ? (p.law === "E" ? "Einstein " : "Newton ") : "") + p.status).join(", ");
  }
  function updateLightStats() {
    $("bOut").textContent = (state.b / RS).toFixed(3) + " rₛ";
    $("impactOut").innerHTML = (state.b / RS).toFixed(2) + " r<sub>s</sub>";
    const r = state.rays;
    const e = r && r.main.find((q) => q.law === "E"), n = r && r.main.find((q) => q.law === "N");
    const deg = (q) => (q.fate === "captured" ? "falls in" : (q.deflection * 180 / Math.PI).toFixed(q.deflection < 0.1 ? 3 : 1) + "°");
    $("defE").textContent = e ? deg(e) : "–";
    $("defN").textContent = n ? deg(n) : "–";
    $("defFormula").textContent = (4 * M / state.b * 180 / Math.PI).toFixed(1) + "°";
    const main = e || n;
    $("rminOut").textContent = main ? (main.fate === "captured" ? "inside horizon" : (main.rmin / RS).toFixed(2) + " rₛ") : "–";
    let fate = "–";
    if (e) {
      if (e.fate === "captured") fate = "captured: b < 2.598 rₛ";
      else {
        const loops = Math.floor(e.deflection / (2 * Math.PI));
        fate = loops >= 1 ? `circles the hole ${loops}× then escapes` : "escapes";
      }
    } else if (n) fate = n.fate === "captured" ? "hits the mass" : "escapes";
    $("lightFate").textContent = fate;
  }

  // ---------- Loop ----------
  let lastT = performance.now(), lastStats = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    if (state.running) {
      if (state.mode === "orbits") {
        for (const p of state.particles) if (p.alive) advanceParticle(p, BASE_SPEED * state.speed * dt);
        if (now - lastStats > 200) { lastStats = now; updateOrbitStats(); checkOrbitChallenges(); }
      } else {
        state.photonT += dt * 140;
      }
    }
    draw();
    requestAnimationFrame(frame);
  }

  // ---------- Pointer: drag to launch, or click to set b ----------
  function sheetPoint(e) {
    const rect = canvas.getBoundingClientRect();
    const X = (e.clientX - rect.left) * (W / rect.width);
    const Y = (e.clientY - rect.top) * (H / rect.height);
    return unproject(X, Y);
  }
  const DRAG_GAIN = 0.015; // speed (c) per M of drag
  function dragVelocity(d) {
    let vx = (d.x1 - d.x0) * DRAG_GAIN, vy = (d.y1 - d.y0) * DRAG_GAIN;
    const v = Math.hypot(vx, vy);
    if (v > 0.9) { vx *= 0.9 / v; vy *= 0.9 / v; }
    return [vx, vy];
  }
  function previewPath(d) {
    const [vx, vy] = dragVelocity(d);
    const law = state.law === "newton" ? "N" : "E";
    const p = makeParticle({ x: d.x0, y: d.y0, vx, vy }, law, [0, 0, 0]);
    for (let k = 0; k < 60 && p.alive; k++) advanceParticle(p, 40);
    return p.trail;
  }

  canvas.addEventListener("pointerdown", (e) => {
    const [x, y] = sheetPoint(e);
    if (state.mode === "light") {
      state.b = Math.min(8 * RS, Math.max(0.5 * RS, Math.abs(y)));
      $("impact").value = (state.b / RS).toFixed(3);
      state.dragB = true;
      canvas.setPointerCapture(e.pointerId);
      computeRays();
      return;
    }
    const r = Math.hypot(x, y);
    if (r < 1.5 * RS || r > V.R * 1.05) return;
    state.drag = { x0: x, y0: y, x1: x, y1: y, preview: null };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (state.mode === "light" && state.dragB) {
      const [, y] = sheetPoint(e);
      state.b = Math.min(8 * RS, Math.max(0.5 * RS, Math.abs(y)));
      $("impact").value = (state.b / RS).toFixed(3);
      computeRays();
      return;
    }
    if (!state.drag) return;
    const [x, y] = sheetPoint(e);
    state.drag.x1 = x; state.drag.y1 = y;
    state.drag.preview = previewPath(state.drag);
  });
  function endDrag() {
    state.dragB = false;
    const d = state.drag;
    if (!d) return;
    state.drag = null;
    if (Math.hypot(d.x1 - d.x0, d.y1 - d.y0) < 0.5) return; // a click, not a drag
    const [vx, vy] = dragVelocity(d);
    const ic = { x: d.x0, y: d.y0, vx, vy };
    launch(() => ic, "your launch");
    checkOrbitChallenges();
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", () => { state.drag = null; state.dragB = false; });

  // ---------- Keyboard: aim and launch without a pointer ----------
  // The aim starts at distance kb.r on the right of the hole; kb.dir is the launch direction in
  // degrees from straight outward (90 = sideways, anticlockwise), kb.v the speed as a fraction of c.
  const kb = { r: 30 * M, dir: 90, v: 0.15, preview: null };
  function kbAim() {
    if (state.mode !== "orbits") return null;
    const a = kb.dir * Math.PI / 180, len = kb.v / DRAG_GAIN;
    const d = { x0: kb.r, y0: 0, x1: kb.r + len * Math.cos(a), y1: len * Math.sin(a) };
    if (!kb.preview) kb.preview = previewPath(d);
    d.preview = kb.preview;
    return d;
  }
  function kbSay() {
    W8.describe("Aim: start " + (kb.r / RS).toFixed(1) + " rₛ from the hole, speed " + kb.v.toFixed(3) + " c, " + kb.dir + "° from straight outward. Press Enter to launch.");
  }
  canvas.addEventListener("focus", () => { state.kbOn = canvas.matches(":focus-visible"); kb.preview = null; });
  canvas.addEventListener("blur", () => { state.kbOn = false; });
  canvas.addEventListener("keydown", (e) => {
    const k = e.key, big = e.shiftKey;
    if (k !== "Tab") state.kbOn = true;
    if (state.mode === "light") {
      const step = (big ? 0.1 : 0.005) * RS;
      let b = state.b;
      if (k === "ArrowUp" || k === "ArrowRight") b += step;
      else if (k === "ArrowDown" || k === "ArrowLeft") b -= step;
      else return;
      e.preventDefault();
      state.b = Math.min(8 * RS, Math.max(0.5 * RS, Math.round(b / RS / 0.005) * 0.005 * RS));
      $("impact").value = (state.b / RS).toFixed(3);
      computeRays();
      return;
    }
    if (k === "ArrowLeft" || k === "ArrowRight") kb.dir = ((kb.dir + (k === "ArrowLeft" ? 1 : -1) * (big ? 15 : 3)) % 360 + 360) % 360;
    else if (k === "ArrowUp" || k === "ArrowDown") kb.v = Math.min(0.9, Math.max(0.01, +(kb.v + (k === "ArrowUp" ? 1 : -1) * (big ? 0.01 : 0.001)).toFixed(3)));
    else if (k === "+" || k === "=" || k === "-" || k === "_") kb.r = Math.min(42 * M, Math.max(4 * M, kb.r + (k === "-" || k === "_" ? -1 : 1) * (big ? 4 : 1) * M));
    else if (k === "Enter" || k === " ") {
      e.preventDefault();
      const a = kb.dir * Math.PI / 180;
      const ic = { x: kb.r, y: 0, vx: kb.v * Math.cos(a), vy: kb.v * Math.sin(a) };
      launch(() => ic, "your launch");
      checkOrbitChallenges();
      W8.describe("Launched from " + (kb.r / RS).toFixed(1) + " rₛ at " + kb.v.toFixed(3) + " c.", { now: true });
      return;
    } else return;
    e.preventDefault();
    kb.preview = null;
    kbSay();
  });

  // Switch layouts at the phone breakpoint; particles and rays live in sheet coordinates, so nothing is lost.
  let rzTimer = 0;
  new ResizeObserver(() => {
    clearTimeout(rzTimer);
    rzTimer = setTimeout(() => {
      if (((canvas.parentElement.clientWidth || 960) < 640) !== NARROW) { layout(); V = view(); draw(); }
    }, 120);
  }).observe(canvas.parentElement);

  // ---------- Controls ----------
  function pressed(ids, active) { for (const id of ids) $(id).setAttribute("aria-pressed", String(id === active)); }

  function setMode(mode) {
    state.mode = mode;
    pressed(["modeOrbits", "modeLight"], mode === "orbits" ? "modeOrbits" : "modeLight");
    document.querySelectorAll(".orbit-only").forEach((el) => { el.hidden = mode !== "orbits"; });
    document.querySelectorAll(".light-only").forEach((el) => { el.hidden = mode !== "light"; });
    $("orbitStats").hidden = mode !== "orbits";
    $("lightStats").hidden = mode !== "light";
    $("hint").textContent = mode === "orbits"
      ? "Drag on the sheet to launch a particle: press where it starts and pull in the direction it should move. Longer drags launch faster."
      : "Click or drag on the sheet to set how far from the hole the beam aims. The critical value is b = 2.598 rₛ: just above it light loops round the photon sphere, just below it light is captured.";
    V = view();
    kb.preview = null;
    if (mode === "light") computeRays();
  }
  $("modeOrbits").addEventListener("click", () => setMode("orbits"));
  $("modeLight").addEventListener("click", () => setMode("light"));

  function setLaw(law) {
    state.law = law;
    pressed(["gravNewton", "gravEinstein", "gravBoth"], { newton: "gravNewton", einstein: "gravEinstein", both: "gravBoth" }[law]);
    relaunchAll();
    kb.preview = null;
    if (state.mode === "light") computeRays();
  }
  $("gravNewton").addEventListener("click", () => setLaw("newton"));
  $("gravEinstein").addEventListener("click", () => setLaw("einstein"));
  $("gravBoth").addEventListener("click", () => setLaw("both"));

  for (const id of Object.keys(PRESETS)) {
    $(id).addEventListener("click", () => launch(PRESETS[id].icFor, PRESETS[id].label));
  }
  $("speed").addEventListener("input", (e) => {
    state.speed = Math.pow(10, +e.target.value);
    $("speedOut").textContent = (state.speed < 1 ? state.speed.toFixed(2) : state.speed.toFixed(1)).replace(/\.0+$/, "") + "×";
  });
  $("impact").addEventListener("input", (e) => { state.b = +e.target.value * RS; computeRays(); });
  $("family").addEventListener("change", (e) => { state.family = e.target.checked; computeRays(); });
  $("tilt").addEventListener("change", (e) => {
    state.tilt = e.target.checked;
    V = view();
  });
  $("play").addEventListener("click", () => {
    state.running = !state.running;
    $("play").textContent = state.running ? "Pause" : "Play";
  });
  $("clear").addEventListener("click", () => {
    if (state.mode === "orbits") { state.launches = []; state.particles = []; state.colourIdx = 0; updateOrbitStats(); }
    else { state.b = 3.2 * RS; $("impact").value = "3.2"; computeRays(); }
  });

  // Open with a precessing orbit already traced so the rosette is visible at once.
  if (!state.running) $("play").textContent = "Play";
  quietFates = true;
  launch(PRESETS.presetPrecess.icFor, PRESETS.presetPrecess.label);
  if (!Lab.reducedMotion) for (const p of state.particles) advanceParticle(p, 1400);
  quietFates = false;
  updateOrbitStats();
  requestAnimationFrame(frame);
})();
