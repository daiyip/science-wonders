(function () {
  const $ = (id) => document.getElementById(id);
  const canvas = $("bench");
  // Wide layout: 960 x 560 with panels side by side. Narrow (phones): 480 wide,
  // panels stacked, larger type so text stays readable once scaled down.
  let W = 960, H = 560, NARROW = false, ctx;
  const PANEL_H = { clocks: 320, dials: 300, trip: 320, st: 290 };
  function layout() {
    const cssW = canvas.parentElement.clientWidth || 960;
    NARROW = cssW < 640;
    W = NARROW ? 480 : 960;
    H = NARROW ? PANEL_H.clocks + PANEL_H.dials + PANEL_H.trip + PANEL_H.st : 560;
    canvas.setAttribute("width", W); canvas.setAttribute("height", H);
    ctx = Lab.setupCanvas(canvas, W, H);
  }
  layout();
  // Font size in logical px: unchanged on wide, scaled up (min 17) on narrow.
  const fs = (px) => (NARROW ? Math.max(17, Math.round(px * 1.42)) : px) + "px ";
  const tr = (t) => (window.I18N ? I18N.t(t) : t);
  // Draw text, squeezing it horizontally only if a translation runs long.
  function fit(text, x, y, maxW) {
    const t = tr(text);
    if (ctx.measureText(t).width > maxW) ctx.fillText(t, x, y, maxW); else ctx.fillText(t, x, y);
  }
  // Wrap a sentence (translated whole first; Chinese wraps per character).
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
  const MONO = "'IBM Plex Mono', ui-monospace, monospace";
  const SANS = "'IBM Plex Sans', system-ui, sans-serif";

  const DESTS = {
    proxima: { name: "Proxima Centauri", ly: 4.24 },
    sirius: { name: "Sirius", ly: 8.6 },
    vega: { name: "Vega", ly: 25 },
    pleiades: { name: "The Pleiades", ly: 444 },
    galactic: { name: "Galactic centre", ly: 26700 },
  };
  const START_AGE = 30;
  const TRIP_MS = 9000;

  const state = {
    beta: 0.866, gamma: 2, dest: "proxima", D: 4.24,
    T: 0, tau: 0,          // round-trip time in Earth years and on the ship
    p: 0,                  // trip progress 0..1 in Earth time
    playing: true,
    clockS: 0,             // light-clock animation time, seconds
    trail: true,
  };

  // ---------- Physics ----------
  function recompute() {
    state.gamma = 1 / Math.sqrt(1 - state.beta * state.beta);
    state.D = DESTS[state.dest].ly;
    state.T = 2 * state.D / state.beta;          // coasting out and back, instant turnaround
    state.tau = state.T / state.gamma;
  }
  // Ship's distance from Earth (ly) at Earth time t (years).
  function shipX(t) {
    const half = state.T / 2;
    return t <= half ? state.beta * t : state.D - state.beta * (t - half);
  }

  // ---------- Formatting ----------
  function fmtYears(y, long) {
    const unit = (s, l) => (long ? " " + l : " " + s);
    if (y >= 1000) return Math.round(y).toLocaleString("en-US") + unit("y", "years");
    if (y >= 100) return y.toFixed(0) + unit("y", "years");
    if (y >= 10) return y.toFixed(1) + unit("y", "years");
    if (y >= 1) return y.toFixed(2) + unit("y", "years");
    if (y * 12 >= 1) return (y * 12).toFixed(1) + unit("mo", "months");
    return (y * 365.25).toFixed(0) + unit("d", "days");
  }
  const fmtLy = (d) => (d >= 100 ? Math.round(d).toLocaleString("en-US") : d.toPrecision(3)) + " ly";
  const fmtBeta = (b) => (b >= 0.99 ? b.toFixed(4) : b.toFixed(3)) + " c";
  const fmtGamma = (g) => (g >= 10 ? g.toFixed(2) : g.toFixed(3));
  function niceStep(span, maxTicks) {
    const raw = span / maxTicks;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    for (const m of [1, 2, 5, 10]) if (m * p >= raw) return m * p;
    return 10 * p;
  }

  // ---------- Light clocks ----------
  const C_PX = 200;          // light speed on screen, px per second
  let MIR_TOP = 72, MIR_BOT = 222;
  const LC = MIR_BOT - MIR_TOP;
  const REST_X = 82;
  const LANE_X0 = 196, LANE_X1 = 446;

  // Position of a photon bouncing between mirrors with vertical speed vy.
  function bounceY(s, vy) {
    const period = 2 * LC / vy;
    const ph = ((s % period) + period) % period;
    const d = ph * vy;
    return d <= LC ? MIR_BOT - d : MIR_TOP + (d - LC);
  }
  function movingX(s) {
    const span = LANE_X1 - LANE_X0;
    const d = state.beta * C_PX * s;
    return LANE_X0 + ((d % span) + span) % span;
  }

  function glowDot(x, y, r, col) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
    g.addColorStop(0, `rgba(${col},0.9)`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r * 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  function mirrors(x) {
    ctx.fillStyle = "#8fa6ff";
    ctx.fillRect(x - 24, MIR_TOP - 6, 48, 4);
    ctx.fillRect(x - 24, MIR_BOT + 2, 48, 4);
  }

  function drawLightClocks() {
    const s = state.clockS;
    const vyRest = C_PX, vyMove = C_PX / state.gamma;
    const restPeriod = 2 * LC / vyRest, movePeriod = 2 * LC / vyMove;
    const LIGHT = "255,226,140";

    ctx.font = fs(12) + MONO;
    ctx.textAlign = "center";
    ctx.fillStyle = "#7f8ea6";
    if (NARROW) {
      // Titles wrap within their column; the mirrors sit lower to leave room.
      MIR_TOP = 100; MIR_BOT = MIR_TOP + LC;
      wrap("AT REST", REST_X, wrap("EARTH CLOCK", REST_X, 24, 150, 22) + 22, 150, 22);
      wrap("MOVING AT " + fmtBeta(state.beta).toUpperCase(), (LANE_X0 + LANE_X1) / 2,
        wrap("SHIP CLOCK, SEEN FROM EARTH", (LANE_X0 + LANE_X1) / 2, 24, 300, 22) + 22, 300, 22);
    } else {
      MIR_TOP = 72; MIR_BOT = MIR_TOP + LC;
      ctx.fillText("EARTH CLOCK", REST_X, 30);
      ctx.fillText("AT REST", REST_X, 46);
      ctx.fillText("SHIP CLOCK, SEEN FROM EARTH", (LANE_X0 + LANE_X1) / 2, 30);
      ctx.fillText("MOVING AT " + fmtBeta(state.beta).toUpperCase(), (LANE_X0 + LANE_X1) / 2, 46);
    }

    // Lane for the moving clock
    ctx.strokeStyle = "#1a2436";
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(LANE_X0 - 30, MIR_BOT + 16); ctx.lineTo(LANE_X1 + 30, MIR_BOT + 16); ctx.stroke();
    ctx.setLineDash([]);

    // Trails: the path light takes during the last tick
    if (state.trail) {
      ctx.strokeStyle = `rgba(${LIGHT},0.35)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(REST_X, MIR_TOP); ctx.lineTo(REST_X, MIR_BOT); ctx.stroke();
      // Last tick, or one lane's worth of travel if the clock covers more than that in a tick.
      const span = Math.min(movePeriod, (LANE_X1 - LANE_X0) / (state.beta * C_PX));
      const n = 200;
      let prevX = null;
      ctx.beginPath();
      for (let k = 0; k <= n; k++) {
        const t = s - span * (k / n);
        if (t < 0 && !Lab.reducedMotion) break;
        const x = movingX(t), y = bounceY(t, vyMove);
        if (prevX === null || Math.abs(x - prevX) > 40) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        prevX = x;
      }
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    mirrors(REST_X);
    glowDot(REST_X, bounceY(s, vyRest), 3, LIGHT);

    const mx = movingX(s);
    ctx.save();
    ctx.beginPath(); ctx.rect(LANE_X0 - 30, MIR_TOP - 22, LANE_X1 - LANE_X0 + 60, LC + 50); ctx.clip();
    mirrors(mx);
    ctx.restore();
    glowDot(mx, bounceY(s, vyMove), 3, LIGHT);

    // Tick counters
    const ticksRest = Math.floor(s / restPeriod), ticksMove = Math.floor(s / movePeriod);
    ctx.font = fs(12) + MONO;
    ctx.fillStyle = "#c9d4e3";
    ctx.fillText(ticksRest + (ticksRest === 1 ? " tick" : " ticks"), REST_X, MIR_BOT + 30);
    if (NARROW) {
      ctx.fillText(ticksMove + (ticksMove === 1 ? " tick" : " ticks"), (LANE_X0 + LANE_X1) / 2, MIR_BOT + 30);
      ctx.fillStyle = "#97a6b9";
      fit("1 tick per " + fmtGamma(state.gamma) + " Earth ticks", W / 2, MIR_BOT + 56, W - 20);
    } else {
      ctx.fillText(ticksMove + (ticksMove === 1 ? " tick" : " ticks") + " · 1 tick per " + fmtGamma(state.gamma) + " Earth ticks", (LANE_X0 + LANE_X1) / 2, 252);
    }
  }

  // ---------- Twins' dials ----------
  function drawDial(cx, cy, r, title, elapsed, colour) {
    ctx.font = fs(12) + MONO;
    ctx.textAlign = "center";
    ctx.fillStyle = "#7f8ea6";
    fit(title, cx, 30, NARROW ? 216 : 210);

    ctx.fillStyle = "#0b1220";
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#26324a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;

    // Ticks: Earth years (same scale on both dials). One full turn = the whole trip in Earth time.
    const step = niceStep(state.T, 24);
    ctx.strokeStyle = "#3a4760";
    for (let y = 0; y < state.T - 1e-9; y += step) {
      const a = -Math.PI / 2 + 2 * Math.PI * y / state.T;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 8), cy + Math.sin(a) * (r - 8));
      ctx.lineTo(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2));
      ctx.stroke();
    }

    // Swept sector
    const frac = Math.min(1, elapsed / state.T);
    const a1 = -Math.PI / 2 + 2 * Math.PI * frac;
    ctx.fillStyle = `rgba(${colour},0.18)`;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r - 10, -Math.PI / 2, a1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgb(${colour})`; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a1) * (r - 14), cy + Math.sin(a1) * (r - 14)); ctx.stroke();
    ctx.lineWidth = 1; ctx.lineCap = "butt";
    ctx.fillStyle = `rgb(${colour})`;
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#e9eef7";
    ctx.font = "500 " + fs(16) + MONO;
    ctx.fillText("+" + fmtYears(elapsed, false), cx, cy + r + (NARROW ? 30 : 24));
    const age = START_AGE + elapsed;
    ctx.font = fs(12) + SANS;
    ctx.fillStyle = "#97a6b9";
    fit(age < 125 ? "now aged " + age.toFixed(1) : "would be " + Math.round(age).toLocaleString("en-US"), cx, cy + r + (NARROW ? 54 : 42), 210);
  }

  // ---------- Trip map ----------
  let MAP_X0 = 70, MAP_X1 = 540, MAP_Y = 360;
  function drawTrip() {
    MAP_X1 = NARROW ? 420 : 540; MAP_Y = NARROW ? 384 : 360;
    const t = state.p * state.T;
    const tShip = t / state.gamma;
    const x = shipX(t);
    const outbound = t < state.T / 2;

    ctx.font = fs(12) + MONO;
    ctx.textAlign = "left";
    ctx.fillStyle = "#7f8ea6";
    fit("THE ROUND TRIP, EARTH'S VIEW", 20, 306, NARROW ? W - 40 : 570);

    // Track
    ctx.strokeStyle = "#26324a";
    ctx.beginPath(); ctx.moveTo(MAP_X0, MAP_Y); ctx.lineTo(MAP_X1, MAP_Y); ctx.stroke();
    // Earth
    ctx.fillStyle = "#4b7bd8";
    ctx.beginPath(); ctx.arc(MAP_X0, MAP_Y, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#4cc48d";
    ctx.beginPath(); ctx.arc(MAP_X0 - 3, MAP_Y - 3, 4, 0, Math.PI * 2); ctx.fill();
    // Star
    const g = ctx.createRadialGradient(MAP_X1, MAP_Y, 0, MAP_X1, MAP_Y, 22);
    g.addColorStop(0, "rgba(255,214,150,0.9)"); g.addColorStop(1, "rgba(255,214,150,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(MAP_X1, MAP_Y, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff4dc"; ctx.beginPath(); ctx.arc(MAP_X1, MAP_Y, 5, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#c9d4e3";
    ctx.textAlign = "center";
    ctx.fillText("Earth", MAP_X0, MAP_Y - 22);
    ctx.textAlign = "right";
    if (NARROW) fit(DESTS[state.dest].name, W - 16, MAP_Y - 50, W - 40);
    else ctx.fillText(DESTS[state.dest].name, 594, MAP_Y - 26);
    ctx.textAlign = "center";
    ctx.fillStyle = "#97a6b9";
    if (NARROW) fit(state.D.toLocaleString("en-US") + " light-years", (MAP_X0 + MAP_X1) / 2 + 20, MAP_Y - 22, 230);
    else ctx.fillText(state.D.toLocaleString("en-US") + " light-years", (MAP_X0 + MAP_X1) / 2, MAP_Y - 22);

    // Contracted distance as measured on board
    const contracted = (MAP_X1 - MAP_X0) / state.gamma;
    ctx.strokeStyle = "#f0b35a";
    ctx.beginPath();
    ctx.moveTo(MAP_X0, MAP_Y + 26); ctx.lineTo(MAP_X0 + contracted, MAP_Y + 26);
    ctx.moveTo(MAP_X0, MAP_Y + 21); ctx.lineTo(MAP_X0, MAP_Y + 31);
    ctx.moveTo(MAP_X0 + contracted, MAP_Y + 21); ctx.lineTo(MAP_X0 + contracted, MAP_Y + 31);
    ctx.stroke();
    ctx.fillStyle = "#f0b35a";
    ctx.textAlign = "left";
    fit("on board it measures " + fmtLy(state.D / state.gamma), MAP_X0, MAP_Y + (NARROW ? 50 : 46), W - MAP_X0 - 16);

    // Ship
    const sx = MAP_X0 + (MAP_X1 - MAP_X0) * (x / state.D);
    const dir = state.p >= 1 ? 1 : outbound ? 1 : -1;
    if (state.p > 0 && state.p < 1) {
      ctx.strokeStyle = "rgba(143,166,255,0.5)";
      ctx.beginPath(); ctx.moveTo(sx - dir * 10, MAP_Y); ctx.lineTo(sx - dir * 32, MAP_Y); ctx.stroke();
    }
    ctx.fillStyle = "#e9eef7";
    ctx.beginPath();
    ctx.moveTo(sx + dir * 11, MAP_Y);
    ctx.lineTo(sx - dir * 8, MAP_Y - 7);
    ctx.lineTo(sx - dir * 4, MAP_Y);
    ctx.lineTo(sx - dir * 8, MAP_Y + 7);
    ctx.closePath(); ctx.fill();

    // Phase line
    let phase;
    if (state.p <= 0) phase = "Ready to launch";
    else if (state.p >= 1) phase = "Home again. The traveller is " + fmtYears(t - tShip, true) + " younger than the twin who stayed.";
    else phase = (outbound ? "Outbound" : "Coming home") + " · Earth year " + t.toFixed(t < 100 ? 1 : 0) + " · ship year " + tShip.toFixed(tShip < 100 ? 1 : 0);
    ctx.fillStyle = state.p >= 1 ? "#4cc48d" : "#c9d4e3";
    ctx.font = (state.p >= 1 ? "600 " : "") + fs(13) + SANS;
    if (NARROW) wrap(phase, 20, 462, W - 40, 22);
    else ctx.fillText(phase, 20, 440);

    // Elapsed bars
    const BX = 20, BW = NARROW ? W - 40 : 560;
    const rows = [
      { y: NARROW ? 524 : 470, label: "EARTH TWIN", v: t, col: "143,166,255" },
      { y: NARROW ? 568 : 512, label: "TRAVELLER", v: tShip, col: "240,179,90" },
    ];
    for (const r of rows) {
      ctx.font = fs(11) + MONO;
      ctx.fillStyle = "#7f8ea6";
      ctx.textAlign = "left";
      ctx.fillText(r.label, BX, r.y - 6);
      ctx.textAlign = "right";
      ctx.fillStyle = "#c9d4e3";
      fit(fmtYears(r.v, true) + " lived", BX + BW, r.y - 6, BW - ctx.measureText(tr(r.label)).width - 16);
      ctx.fillStyle = "#121b2b";
      ctx.fillRect(BX, r.y, BW, 10);
      ctx.fillStyle = `rgb(${r.col})`;
      ctx.fillRect(BX, r.y, BW * (r.v / state.T), 10);
    }
  }

  // ---------- Spacetime diagram ----------
  function drawSpacetime() {
    const X0 = NARROW ? 20 : 640, X1 = NARROW ? W - 20 : 940, Y0 = NARROW ? 336 : 318, Y1 = NARROW ? 540 : 520;
    const t = state.p * state.T;
    ctx.font = fs(12) + MONO;
    ctx.textAlign = "left";
    ctx.fillStyle = "#7f8ea6";
    fit("SPACETIME DIAGRAM", X0, 306, X1 - X0);

    const ox = X0 + 28, oy = Y1;
    const s = (Y1 - Y0) / state.T;            // px per year and per light-year (light at 45°)
    const px = (d) => ox + d * s, py = (yr) => oy - yr * s;

    // Axes
    ctx.strokeStyle = "#26324a";
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox, Y0 - 4); ctx.moveTo(ox, oy); ctx.lineTo(X1, oy); ctx.stroke();
    ctx.fillStyle = "#56647c";
    ctx.font = fs(10) + MONO;
    ctx.textAlign = "left";
    if (NARROW) { ctx.textAlign = "right"; ctx.fillText("distance →", X1, oy + 22); ctx.textAlign = "left"; }
    else ctx.fillText("distance →", X1 - 70, oy + 14);
    ctx.save(); ctx.translate(ox - 10, oy); ctx.rotate(-Math.PI / 2); fit("Earth time →", 0, 0, Y1 - Y0); ctx.restore();

    // Light ray from launch
    ctx.strokeStyle = "rgba(255,226,140,0.35)";
    ctx.setLineDash([2, 4]);
    const lr = Math.min(state.T, (X1 - ox) / s);
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(px(lr), py(lr)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,226,140,0.6)";
    ctx.fillText("light", px(lr) - (NARROW ? 46 : 30), py(lr) + 4);

    // Worldlines up to now
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#8fa6ff";
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox, py(t)); ctx.stroke();
    ctx.strokeStyle = "#f0b35a";
    ctx.beginPath(); ctx.moveTo(ox, oy);
    if (t > state.T / 2) ctx.lineTo(px(state.D), py(state.T / 2));
    ctx.lineTo(px(shipX(t)), py(t));
    ctx.stroke();
    ctx.lineWidth = 1;

    // Dots every `step` years of each twin's own time
    const step = niceStep(state.T, 20);
    ctx.fillStyle = "#8fa6ff";
    for (let y = step; y <= t + 1e-9; y += step) {
      ctx.beginPath(); ctx.arc(ox, py(y), 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#f0b35a";
    for (let y = step; y * state.gamma <= t + 1e-9; y += step) {
      const te = y * state.gamma;
      ctx.beginPath(); ctx.arc(px(shipX(te)), py(te), 2.2, 0, Math.PI * 2); ctx.fill();
    }

    // Now line
    if (state.p > 0 && state.p < 1) {
      ctx.strokeStyle = "rgba(201,212,227,0.25)";
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(ox, py(t)); ctx.lineTo(X1, py(t)); ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.font = fs(10) + MONO;
    ctx.fillStyle = "#97a6b9";
    ctx.textAlign = "left";
    const stepLabel = step >= 1 ? step.toLocaleString("en-US") + (step === 1 ? " year" : " years") : fmtYears(step, true);
    ctx.textAlign = "right";
    ctx.fillText("dots: every " + stepLabel, X1, oy - (NARROW ? 46 : 30));
    ctx.fillText("of each twin's own time", X1, oy - (NARROW ? 24 : 17));
  }

  // ---------- Frame ----------
  function draw() {
    ctx.fillStyle = "#05080e";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#121b2b";
    const t = state.p * state.T;
    if (NARROW) {
      const yD = PANEL_H.clocks, yT = yD + PANEL_H.dials, yS = yT + PANEL_H.trip;
      for (const y of [yD, yT, yS]) ctx.fillRect(20, y - 6, W - 40, 1);
      drawLightClocks();
      ctx.save(); ctx.translate(0, yD);
      drawDial(130, 128, 70, "EARTH TWIN", t, "143,166,255");
      drawDial(350, 128, 70, "TRAVELLING TWIN", t / state.gamma, "240,179,90");
      ctx.font = fs(11) + SANS;
      ctx.fillStyle = "#7f8ea6";
      ctx.textAlign = "center";
      fit("one full turn = the whole trip in Earth time", W / 2, 284, W - 20);
      ctx.restore();
      ctx.save(); ctx.translate(0, yT - 280); drawTrip(); ctx.restore();
      ctx.save(); ctx.translate(0, yS - 280); drawSpacetime(); ctx.restore();
      return;
    }
    ctx.fillRect(480, 20, 1, 240);
    ctx.fillRect(20, 280, W - 40, 1);
    ctx.fillRect(610, 296, 1, 240);

    drawLightClocks();
    drawDial(605, 128, 70, "EARTH TWIN", t, "143,166,255");
    drawDial(825, 128, 70, "TRAVELLING TWIN", t / state.gamma, "240,179,90");
    ctx.font = fs(11) + SANS;
    ctx.fillStyle = "#56647c";
    ctx.textAlign = "center";
    ctx.fillText("one full turn = the whole trip in Earth time", 715, 266);
    drawTrip();
    drawSpacetime();
  }

  function updateStats() {
    $("gamma").textContent = fmtGamma(state.gamma);
    $("earthTime").textContent = fmtYears(state.T, true);
    $("shipTime").textContent = fmtYears(state.tau, true);
    $("ageGap").textContent = fmtYears(state.T - state.tau, true);
    $("shipDist").textContent = fmtLy(state.D / state.gamma);
    $("speedOut").textContent = fmtBeta(state.beta);
    const kms = state.beta * 299792.458;
    $("hint").textContent = "At " + fmtBeta(state.beta) + " (" + Math.round(kms).toLocaleString("en-US") + " km/s), every second on the ship takes " + fmtGamma(state.gamma) + " seconds on Earth. " +
      "Earth sees the trip to " + DESTS[state.dest].name + " take " + fmtYears(state.T, true) + "; the traveller lives through " + fmtYears(state.tau, true) + ".";
  }

  // ---------- Loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(100, now - last);
    last = now;
    state.clockS += dt / 1000;
    if (state.playing && state.p < 1) {
      state.p = Math.min(1, state.p + dt / TRIP_MS);
      if (state.p >= 1) setPlayButton();
    }
    draw();
    requestAnimationFrame(frame);
  }

  function setPlayButton() {
    $("pause").textContent = state.p >= 1 ? "Pause" : state.playing ? "Pause" : "Resume";
    $("pause").disabled = state.p >= 1;
  }

  // ---------- Controls ----------
  function settingsChanged(restartTrip) {
    recompute();
    updateStats();
    if (restartTrip) launch();
    else if (Lab.reducedMotion) draw();
  }
  function launch() {
    state.p = Lab.reducedMotion ? 1 : 0;
    state.playing = true;
    setPlayButton();
    if (Lab.reducedMotion) {
      state.clockS = stillClockS();
      draw();
    }
  }
  // For a still picture: the moving clock near the right of its lane, so its light path doesn't wrap.
  const stillClockS = () => (LANE_X1 - LANE_X0 - 1) / (state.beta * C_PX);
  function setBeta(b) {
    state.beta = b;
    $("speed").value = Math.atanh(b).toFixed(4);
    settingsChanged(true);
  }

  $("speed").addEventListener("input", (e) => { state.beta = Math.tanh(+e.target.value); settingsChanged(true); });
  $("dest").addEventListener("change", (e) => { state.dest = e.target.value; settingsChanged(true); });
  for (const [id, b] of [["p50", 0.5], ["p866", 0.866], ["p99", 0.99], ["p999", 0.999]]) {
    $(id).addEventListener("click", () => setBeta(b));
  }
  $("launch").addEventListener("click", launch);
  $("pause").addEventListener("click", () => { state.playing = !state.playing; setPlayButton(); });
  $("trail").addEventListener("change", (e) => { state.trail = e.target.checked; if (Lab.reducedMotion) draw(); });

  // Switch layouts when the bench crosses the phone breakpoint; keep the simulation state.
  let rzTimer = 0;
  new ResizeObserver(() => {
    clearTimeout(rzTimer);
    rzTimer = setTimeout(() => {
      const was = NARROW;
      const cssW = canvas.parentElement.clientWidth || 960;
      if ((cssW < 640) !== was) { layout(); draw(); }
    }, 120);
  }).observe(canvas.parentElement);

  // ---------- Start ----------
  state.beta = Math.tanh(+$("speed").value);
  state.dest = $("dest").value;
  state.trail = $("trail").checked;
  recompute();
  updateStats();
  if (Lab.reducedMotion) {
    // A still picture: the trip already finished, the moving clock one tick in.
    state.p = 1;
    state.clockS = stillClockS();
    $("pause").hidden = true;
    draw();
  } else {
    // Open mid-flight so the first view already shows the clocks drifting apart.
    state.p = 0.3;
    state.clockS = 1.2;
    setPlayButton();
    requestAnimationFrame(frame);
  }
})();
