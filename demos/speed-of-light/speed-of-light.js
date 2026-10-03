(function () {
  const $ = (id) => document.getElementById(id);
  const MONO = "'IBM Plex Mono', ui-monospace, monospace";
  const SANS = "'IBM Plex Sans', system-ui, sans-serif";

  // ---------- Physical numbers ----------
  const C_KM = 299792.458;            // km/s, exact
  const AU = 149597870.7;             // km
  const LY = 9.4607e12;               // km
  const YEAR = 31557600;              // s (Julian year)
  const DESTS = {
    moon:    { name: "Moon", km: 384400, r: 1737, col: "#c9cdd6", speed: 1 },
    mars:    { name: "Mars", km: 225e6, r: 3390, col: "#e07a4a", speed: 60 },
    sun:     { name: "Sun", km: AU, r: 696000, col: "#ffd27a", speed: 60 },
    voyager: { name: "Voyager 1", km: 25.5e9, r: 0, col: "#e9eef7", speed: 3600 },
    proxima: { name: "Proxima Centauri", km: 4.24 * LY, r: 107000, col: "#ff8a6a", speed: YEAR },
  };
  // Other distances worth marking on the way.
  const LANDMARKS = [
    { name: "Moon", km: 384400 },
    { name: "Sun", km: AU },
    { name: "Mars", km: () => DESTS.mars.km },
    { name: "Neptune", km: 30.1 * AU },
    { name: "Voyager 1", km: 25.5e9 },
  ];

  function fmtDur(s) {
    if (s < 60) return s.toFixed(s < 10 ? 2 : 1) + " s";
    if (s < 3600) { const m = Math.floor(s / 60); return m + " min " + String(Math.floor(s - m * 60)).padStart(2, "0") + " s"; }
    if (s < 86400) { const h = Math.floor(s / 3600); return h + " h " + String(Math.floor((s - h * 3600) / 60)).padStart(2, "0") + " min"; }
    if (s < YEAR) return (s / 86400).toFixed(1) + " days";
    return (s / YEAR).toFixed(2) + " years";
  }
  function fmtKm(km) {
    if (km >= 0.05 * LY) return (km / LY).toFixed(2) + " light-years";
    if (km >= 1e9) return (km / 1e9).toFixed(1) + " billion km";
    if (km >= 1e6) return Math.round(km / 1e6).toLocaleString() + " million km";
    return Math.round(km).toLocaleString() + " km";
  }
  function label(ctx, text, x, y, align, color, size, font) {
    ctx.font = (size || 12) + "px " + (font || MONO);
    ctx.fillStyle = color || "#7f8ea6";
    ctx.textAlign = align || "left";
    ctx.fillText(text, x, y);
  }
  function glowDot(ctx, x, y, r, rgb, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  // =====================================================================
  // Main bench: a light pulse from Earth
  // =====================================================================
  const W = 960, H = 430;
  const ctx = Lab.setupCanvas($("bench"), W, H);
  const RUL = { x0: 70, x1: 900, y: 74, l0: -0.5, l1: 9 };   // log10 seconds
  const EX = 90, TX = 880, TY = 250;

  const state = {
    dest: "moon", speed: 1, elapsed: 0, hold: 0, flash: 0,
    playing: true, roundTrip: false,
  };
  const dest = () => DESTS[state.dest];
  const lightTime = () => dest().km / C_KM;
  const totalTime = () => lightTime() * (state.roundTrip ? 2 : 1);
  const rulX = (s) => RUL.x0 + (Math.log10(Math.max(s, 1e-3)) - RUL.l0) / (RUL.l1 - RUL.l0) * (RUL.x1 - RUL.x0);

  function drawMain() {
    ctx.fillStyle = "#05080e";
    ctx.fillRect(0, 0, W, H);
    drawRuler();
    ctx.strokeStyle = "#1a2436";
    ctx.beginPath(); ctx.moveTo(14, 140.5); ctx.lineTo(W - 14, 140.5); ctx.stroke();
    drawTrack();
  }

  function drawRuler() {
    label(ctx, "HOW LONG LIGHT TAKES (LOG SCALE)", 18, 24);
    ctx.strokeStyle = "#26324a";
    ctx.beginPath(); ctx.moveTo(RUL.x0, RUL.y + 0.5); ctx.lineTo(RUL.x1, RUL.y + 0.5); ctx.stroke();
    ctx.font = "10px " + MONO;
    ctx.fillStyle = "#56647c";
    ctx.textAlign = "center";
    for (const [s, t] of [[1, "1 s"], [60, "1 min"], [3600, "1 h"], [86400, "1 day"], [YEAR / 12, "1 month"], [YEAR, "1 yr"], [10 * YEAR, "10 yr"]]) {
      const x = rulX(s);
      ctx.fillRect(x, RUL.y, 1, 6);
      ctx.fillText(t, x, RUL.y + 19);
    }
    // Mars range
    const m0 = rulX(55e6 / C_KM), m1 = rulX(401e6 / C_KM);
    ctx.fillStyle = "rgba(224,122,74,0.35)";
    ctx.fillRect(m0, RUL.y - 4, m1 - m0, 4);
    const marks = [
      ["Moon", DESTS.moon.km, DESTS.moon.col],
      ["Mars", DESTS.mars.km, DESTS.mars.col],
      ["Sun", DESTS.sun.km, DESTS.sun.col],
      ["Voyager 1", DESTS.voyager.km, DESTS.voyager.col],
      ["Proxima", DESTS.proxima.km, DESTS.proxima.col],
    ];
    marks.forEach(([n, km, col], i) => {
      const x = rulX(km / C_KM);
      const active = dest().name.startsWith(n);
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, RUL.y - 2, active ? 4.5 : 3, 0, Math.PI * 2); ctx.fill();
      label(ctx, n, x, RUL.y - (i % 2 ? 26 : 12), "center", active ? "#e9eef7" : "#7f8ea6", 11);
    });
    // The pulse's progress on the ruler
    if (state.elapsed > 0) {
      const x = rulX(Math.min(state.elapsed, lightTime()));
      glowDot(ctx, x, RUL.y, 10, "190,215,255", 0.9);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x - 1, RUL.y - 6, 2, 12);
    }
  }

  function drawTrack() {
    const d = dest();
    const pxKm = (TX - EX) / d.km;
    label(ctx, "EARTH TO " + d.name.toUpperCase() + ", TO SCALE", 18, 166);
    // Clock
    const lt = lightTime();
    const shown = Math.min(state.elapsed, totalTime());
    label(ctx, fmtDur(shown), W / 2, 196, "center", "#e9eef7", 28, SANS);
    label(ctx, "of " + fmtDur(totalTime()) + (state.roundTrip ? " there and back" : " one way") + (state.speed > 1 ? " · playing " + speedName() : " · real time"), W / 2, 216, "center", "#7f8ea6", 12);
    // Path
    ctx.strokeStyle = "#1a2436";
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(EX, TY + 0.5); ctx.lineTo(TX, TY + 0.5); ctx.stroke();
    ctx.setLineDash([]);
    // Landmarks on the way
    let lastX = EX;
    for (const lm of LANDMARKS) {
      const km = typeof lm.km === "function" ? lm.km() : lm.km;
      if (km >= d.km * 0.97 || d.name.startsWith(lm.name)) continue;
      const x = EX + km * pxKm;
      if (x - EX < 14) continue;
      ctx.fillStyle = "#56647c";
      ctx.fillRect(x, TY - 6, 1, 12);
      if (x - lastX > 60) { label(ctx, lm.name, x, TY + 22, "center", "#56647c", 10); lastX = x; }
    }
    // Earth
    const rE = Math.max(4, 6371 * pxKm);
    glowDot(ctx, EX, TY, rE * 2.2, "90,150,255", 0.25);
    ctx.fillStyle = "#4f8bff";
    ctx.beginPath(); ctx.arc(EX, TY, rE, 0, Math.PI * 2); ctx.fill();
    label(ctx, "Earth", EX, TY + Math.max(rE, 6) + 30, "center", "#c9d4e3", 12);
    // Destination
    if (d.r === 0) {
      ctx.fillStyle = d.col;
      ctx.fillRect(TX - 5, TY - 1, 10, 2);
      ctx.fillRect(TX - 1, TY - 5, 2, 10);
      ctx.beginPath(); ctx.arc(TX + 4, TY - 4, 3, 0, Math.PI * 2); ctx.fill();
    } else {
      const rT = Math.max(4, d.r * pxKm);
      if (state.dest === "sun" || state.dest === "proxima") glowDot(ctx, TX, TY, rT * 3 + 8, "255,200,120", 0.35);
      ctx.fillStyle = d.col;
      ctx.beginPath(); ctx.arc(TX, TY, rT, 0, Math.PI * 2); ctx.fill();
    }
    label(ctx, d.name, TX, TY + 30, "center", "#c9d4e3", 12);
    if (state.flash > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${state.flash})`;
      ctx.beginPath(); ctx.arc(state.flashX, TY, 10 + 20 * (1 - state.flash), 0, Math.PI * 2); ctx.stroke();
    }
    // Pulse
    if (state.elapsed > 0 && state.elapsed < totalTime()) {
      const p = state.elapsed / lt;
      const back = p > 1;
      const x = back ? TX - (p - 1) * (TX - EX) : EX + p * (TX - EX);
      const dir = back ? 1 : -1;
      const trail = Lab.reducedMotion ? 0 : 70;
      const g = ctx.createLinearGradient(x, 0, x + dir * trail, 0);
      g.addColorStop(0, "rgba(200,225,255,0.9)");
      g.addColorStop(1, "rgba(200,225,255,0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = 2;
      if (trail) { ctx.beginPath(); ctx.moveTo(x, TY); ctx.lineTo(x + dir * trail, TY); ctx.stroke(); }
      ctx.lineWidth = 1;
      glowDot(ctx, x, TY, 14, "200,225,255", 0.8);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(x, TY, 3, 0, Math.PI * 2); ctx.fill();
    }
    // Scale bar
    const target = 170 / pxKm;
    let unit = 1, unitName = "km";
    if (d.km > 0.05 * LY) { unit = LY; unitName = "light-year"; }
    const v = nice(target / unit);
    const len = v * unit * pxKm;
    const sy = 340;
    ctx.fillStyle = "#7f8ea6";
    ctx.fillRect(EX, sy, len, 2);
    ctx.fillRect(EX, sy - 4, 1, 10); ctx.fillRect(EX + len - 1, sy - 4, 1, 10);
    const txt = unit === 1 ? fmtKm(v) : v + " " + unitName + (v === 1 ? "" : "s");
    label(ctx, txt + "  ·  light needs " + fmtDur(v * unit / C_KM), EX, sy - 10, "left", "#7f8ea6", 11);
    label(ctx, "1 second of light = 299,792 km" + (pxKm * C_KM >= 1 ? " = " + (pxKm * C_KM).toFixed(pxKm * C_KM < 10 ? 1 : 0) + " px here" : ", less than a pixel here"), EX, sy + 24, "left", "#56647c", 11);
    if (state.dest === "mars") drawMarsInset();
  }
  function nice(x) {
    const e = Math.pow(10, Math.floor(Math.log10(x)));
    const m = x / e;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * e;
  }
  function speedName() {
    const o = $("speed").selectedOptions[0];
    return o ? o.textContent.toLowerCase() : state.speed + "×";
  }
  // Where Earth and Mars sit for the chosen distance (schematic, Sun at centre).
  function marsAngle(kmDist) {
    const s = (kmDist / 1e6 - 55) / (401 - 55);
    const rE = 1, rM = 1.381 + s * (1.666 - 1.381), d = kmDist / AU;
    const c = (rE * rE + rM * rM - d * d) / (2 * rE * rM);
    return { rE, rM, th: Math.acos(Math.max(-1, Math.min(1, c))) };
  }
  function drawMarsInset() {
    const cx = 860, cy = 370, k = 30;
    const { rE, rM, th } = marsAngle(DESTS.mars.km);
    ctx.strokeStyle = "#1f2a3f";
    ctx.beginPath(); ctx.arc(cx, cy, rE * k, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, rM * k, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#ffd27a";
    ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2); ctx.fill();
    const ex = cx - rE * k, ey = cy;
    const mx = cx - rM * k * Math.cos(th), my = cy - rM * k * Math.sin(th);
    ctx.strokeStyle = "rgba(200,225,255,0.4)";
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(mx, my); ctx.stroke();
    ctx.fillStyle = "#4f8bff";
    ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e07a4a";
    ctx.beginPath(); ctx.arc(mx, my, 3, 0, Math.PI * 2); ctx.fill();
    label(ctx, "from above", cx - rM * k - 6, cy + rM * k, "right", "#56647c", 10);
  }

  function advanceMain(dt) {
    if (!state.playing) return;
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 2);
    const tt = totalTime();
    if (state.elapsed >= tt) {
      state.hold += dt;
      if (state.hold > 1.6) { state.elapsed = 0; state.hold = 0; }
      return;
    }
    const before = state.elapsed;
    state.elapsed = Math.min(tt, state.elapsed + dt * state.speed);
    const lt = lightTime();
    if (before < lt && state.elapsed >= lt) { state.flash = Lab.reducedMotion ? 0 : 1; state.flashX = TX; }
    if (state.roundTrip && state.elapsed >= tt && before < tt) { state.flash = Lab.reducedMotion ? 0 : 1; state.flashX = EX; }
  }

  function updateMainStats() {
    const d = dest();
    $("destName").textContent = d.name;
    $("distKm").textContent = fmtKm(d.km);
    $("lightTime").textContent = fmtDur(lightTime()) + (state.roundTrip ? " (echo " + fmtDur(2 * lightTime()) + ")" : "");
    const flown = Math.min(state.elapsed, totalTime());
    $("elapsed").textContent = fmtDur(flown) + ", " + fmtKm(flown * C_KM);
    $("playback").textContent = state.speed === 1 ? "real time" : state.speed.toLocaleString() + "× faster";
  }

  // =====================================================================
  // Rømer: Io's eclipses run late when Jupiter is far
  // =====================================================================
  const RW = 560, RH = 300;
  const rctx = Lab.setupCanvas($("romer"), RW, RH);
  const IO_PERIOD = 1.769138;     // days
  const J_PERIOD = 4332.59;       // days
  const R_J = 5.203;              // AU
  const LIGHT_AU_MIN = AU / C_KM / 60;  // minutes for light to cross 1 AU (8.32)
  const romer = { day: 40, nextEclipse: 0, dots: [], playing: !Lab.reducedMotion, instant: false, last: null, dist: 0 };
  romer.nextEclipse = Math.ceil(romer.day / IO_PERIOD) * IO_PERIOD;
  const PLOT = { x0: 322, x1: 544, y0: 34, y1: 262, days: 400, max: 18 };

  function positions(day) {
    const te = 2 * Math.PI * day / 365.25, tj = 2 * Math.PI * day / J_PERIOD;
    const E = [Math.cos(te), Math.sin(te)], J = [R_J * Math.cos(tj), R_J * Math.sin(tj)];
    return { E, J, te, tj };
  }
  function delayMin(day) {
    if (romer.instant) return 0;
    const { E, J } = positions(day);
    return (Math.hypot(J[0] - E[0], J[1] - E[1]) - (R_J - 1)) * LIGHT_AU_MIN;
  }
  function elongation(day) {
    const { E, J } = positions(day);
    const a = [-E[0], -E[1]], b = [J[0] - E[0], J[1] - E[1]];
    return Math.acos((a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b))) * 180 / Math.PI;
  }

  function advanceRomer(dtDays) {
    romer.day += dtDays;
    while (romer.nextEclipse <= romer.day) {
      const d = romer.nextEclipse;
      if (elongation(d) > 20) {
        const late = delayMin(d);
        romer.dots.push({ day: d, late });
        romer.last = late;
      }
      romer.nextEclipse += IO_PERIOD;
    }
    romer.dots = romer.dots.filter((p) => romer.day - p.day < PLOT.days);
  }

  function drawRomer() {
    const c = rctx;
    c.fillStyle = "#05080e";
    c.fillRect(0, 0, RW, RH);
    const cx = 150, cy = 156, kE = 46, kJ = 118;
    const { te, tj } = positions(romer.day);
    c.strokeStyle = "#1f2a3f";
    c.beginPath(); c.arc(cx, cy, kE, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(cx, cy, kJ, 0, Math.PI * 2); c.stroke();
    glowDot(c, cx, cy, 18, "255,210,120", 0.5);
    c.fillStyle = "#ffd27a";
    c.beginPath(); c.arc(cx, cy, 6, 0, Math.PI * 2); c.fill();
    const ex = cx + kE * Math.cos(te), ey = cy - kE * Math.sin(te);
    const jx = cx + kJ * Math.cos(tj), jy = cy - kJ * Math.sin(tj);
    // Jupiter's shadow, pointing away from the Sun
    const ux = Math.cos(tj), uy = -Math.sin(tj);
    c.fillStyle = "rgba(0,0,0,0.9)";
    c.beginPath();
    c.moveTo(jx - uy * 6, jy + ux * 6); c.lineTo(jx + ux * 30 - uy * 4, jy + uy * 30 + ux * 4);
    c.lineTo(jx + ux * 30 + uy * 4, jy + uy * 30 - ux * 4); c.lineTo(jx + uy * 6, jy - ux * 6);
    c.fill();
    // Light from Jupiter to Earth
    const hidden = elongation(romer.day) < 20;
    c.strokeStyle = hidden ? "rgba(127,142,166,0.25)" : "rgba(200,225,255,0.45)";
    c.setLineDash([3, 4]);
    c.beginPath(); c.moveTo(jx, jy); c.lineTo(ex, ey); c.stroke();
    c.setLineDash([]);
    c.fillStyle = "#d9b38c";
    c.beginPath(); c.arc(jx, jy, 6, 0, Math.PI * 2); c.fill();
    // Io
    const ti = 2 * Math.PI * romer.day / IO_PERIOD + tj;   // in Jupiter's shadow at each eclipse time
    const ix = jx + 13 * Math.cos(ti), iy = jy - 13 * Math.sin(ti);
    const inShadow = Math.cos(ti - tj) > 0.93;
    c.fillStyle = inShadow ? "#333a48" : "#f3e27a";
    c.beginPath(); c.arc(ix, iy, 2.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#4f8bff";
    c.beginPath(); c.arc(ex, ey, 4, 0, Math.PI * 2); c.fill();
    label(c, "Earth", ex, ey + 17, "center", "#c9d4e3", 10);
    label(c, "Jupiter + Io", jx, jy - 12, "center", "#c9d4e3", 10);
    label(c, "SEEN FROM ABOVE (SQUEEZED)", 12, 20, "left", "#7f8ea6", 11);
    if (hidden) label(c, "Jupiter lost in the Sun's glare", 12, RH - 12, "left", "#f08a5d", 11);
    // Plot
    const { x0, x1, y0, y1, days, max } = PLOT;
    const X = (d) => x1 - (romer.day - d) / days * (x1 - x0);
    const Y = (m) => y1 - m / max * (y1 - y0);
    label(c, "HOW LATE EACH ECLIPSE IS SEEN", x0 - 20, 20, "left", "#7f8ea6", 11);
    c.strokeStyle = "#26324a";
    c.beginPath(); c.moveTo(x0 + 0.5, y0); c.lineTo(x0 + 0.5, y1 + 0.5); c.lineTo(x1, y1 + 0.5); c.stroke();
    c.font = "10px " + MONO; c.fillStyle = "#56647c"; c.textAlign = "right";
    for (let m = 0; m <= 15; m += 5) { c.fillRect(x0 - 4, Y(m), 4, 1); c.fillText(m + "", x0 - 7, Y(m) + 4); }
    c.save(); c.translate(296, (y0 + y1) / 2); c.rotate(-Math.PI / 2); c.textAlign = "center"; c.fillText("minutes late", 0, 0); c.restore();
    c.textAlign = "center";
    c.fillText("last 400 days →", (x0 + x1) / 2, y1 + 18);
    c.strokeStyle = "rgba(240,179,90,0.5)";
    c.setLineDash([3, 4]);
    c.beginPath(); c.moveTo(x0, Y(2 * LIGHT_AU_MIN)); c.lineTo(x1, Y(2 * LIGHT_AU_MIN)); c.stroke();
    c.setLineDash([]);
    label(c, "16.6 min: across Earth's orbit", x1, Y(2 * LIGHT_AU_MIN) - 5, "right", "rgba(240,179,90,0.85)", 10);
    c.fillStyle = "#8fa6ff";
    for (const p of romer.dots) c.fillRect(X(p.day) - 1.5, Y(p.late) - 1.5, 3, 3);
    const { E, J } = positions(romer.day);
    romer.dist = Math.hypot(J[0] - E[0], J[1] - E[1]);
  }

  // =====================================================================
  // Mars rover: driving with a light-time delay
  // =====================================================================
  const VW = 560, VH = 300;
  const vctx = Lab.setupCanvas($("rover"), VW, VH);
  const TRACK = { x0: 36, x1: 524, m: 60 };
  const ROCK = 50;                 // metres
  const SPEED = 0.042 * 60;        // m per game-second (4.2 cm/s, 60× time)
  const rover = {};
  function resetRover() {
    Object.assign(rover, {
      gt: 0, x: 0, moving: false, done: null, history: [[0, 0]],
      packets: [], startAt: null, stopAt: null, stopSentAt: null, endAt: null, endX: null, reported: false,
    });
    setVerdict("Light time to Mars right now: " + fmtDur(oneWay() * 60) + " each way. Press Send \"drive\".", "");
  }
  const oneWay = () => DESTS.mars.km / C_KM / 60;      // game-seconds (real minutes)
  function setVerdict(text, cls) {
    const v = $("roverVerdict");
    v.textContent = text;
    v.className = "verdict" + (cls ? " " + cls : "");
  }
  function xAt(t) {
    const h = rover.history;
    if (t <= h[0][0]) return h[0][1];
    for (let i = h.length - 1; i >= 0; i--) {
      if (h[i][0] <= t) {
        const n = h[i + 1];
        if (!n) return h[i][1];
        return h[i][1] + (n[1] - h[i][1]) * (t - h[i][0]) / (n[0] - h[i][0]);
      }
    }
    return 0;
  }
  function advanceRover(dt) {
    rover.gt += dt;
    const g = rover.gt;
    for (const p of rover.packets) {
      if (!p.arrived && g >= p.t0 + oneWay()) {
        p.arrived = true;
        if (p.kind === "drive" && !rover.done) rover.moving = true;
        if (p.kind === "stop" && rover.moving) {
          rover.moving = false;
          rover.done = { kind: "stopped", x: rover.x, t: g };
        }
      }
    }
    if (rover.moving) {
      rover.x += SPEED * dt;
      if ($("roverAuto").checked && rover.x >= ROCK - 4) {
        rover.x = ROCK - 4; rover.moving = false;
        rover.done = { kind: "auto", x: rover.x, t: g };
      } else if (rover.x >= ROCK - 1.4) {
        rover.x = ROCK - 1.4; rover.moving = false;
        rover.done = { kind: "crash", x: rover.x, t: g };
      }
    }
    const lastH = rover.history[rover.history.length - 1];
    if (g - lastH[0] > 0.05) rover.history.push([g, rover.x]);
    // News of the outcome reaches Earth one light time later.
    if (rover.done && !rover.reported && g >= rover.done.t + oneWay()) {
      rover.reported = true;
      const lag = fmtDur(oneWay() * 60);
      if (rover.done.kind === "crash") {
        setVerdict("Crunch. The rover hit the boulder " + lag + " before your screen showed it." + (rover.stopSentAt != null ? " Your stop command was still in space." : ""), "bad");
      } else if (rover.done.kind === "auto") {
        setVerdict("The rover saw the boulder with its own cameras and stopped 4 m short, without waiting for Earth. You found out " + lag + " later.", "ok");
      } else {
        const seenX = xAt(rover.stopSentAt - oneWay());
        setVerdict("Stopped at " + rover.done.x.toFixed(1) + " m, short of the boulder at " + ROCK + " m. When you pressed stop your picture showed it at " + seenX.toFixed(1) + " m, so it drove another " + (rover.done.x - seenX).toFixed(1) + " m.", "ok");
      }
    }
  }
  function drawRover() {
    const c = vctx;
    c.fillStyle = "#05080e";
    c.fillRect(0, 0, VW, VH);
    const ow = oneWay();
    const g = rover.gt;
    // Signal strip
    const sy = 46, ex = 36, mx = 524;
    c.strokeStyle = "#1f2a3f";
    c.setLineDash([2, 4]);
    c.beginPath(); c.moveTo(ex, sy); c.lineTo(mx, sy); c.stroke();
    c.setLineDash([]);
    c.fillStyle = "#4f8bff";
    c.beginPath(); c.arc(ex, sy, 9, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#e07a4a";
    c.beginPath(); c.arc(mx, sy, 7, 0, Math.PI * 2); c.fill();
    label(c, "Earth", ex, sy + 24, "center", "#c9d4e3", 10);
    label(c, "Mars", mx, sy + 24, "center", "#c9d4e3", 10);
    label(c, "light time " + fmtDur(ow * 60) + " each way", VW / 2, 18, "center", "#7f8ea6", 11);
    // pictures streaming home
    c.fillStyle = "rgba(143,166,255,0.7)";
    const spacing = 1.5;
    for (let k = Math.floor((g - ow) / spacing); k * spacing <= g; k++) {
      const t0 = k * spacing;
      if (t0 < 0) continue;
      const f = (g - t0) / ow;
      if (f < 0 || f > 1) continue;
      c.fillRect(mx - 12 - f * (mx - ex - 24), sy - 6, 3, 3);
    }
    // commands going out
    for (const p of rover.packets) {
      const f = (g - p.t0) / ow;
      if (f < 0 || f > 1) continue;
      const x = ex + 12 + f * (mx - ex - 24);
      c.fillStyle = p.kind === "stop" ? "#f08a5d" : "#4cc48d";
      c.fillRect(x - 3, sy + 3, 6, 6);
      label(c, p.kind.toUpperCase(), x, sy + 22, "center", p.kind === "stop" ? "#f08a5d" : "#4cc48d", 10);
    }
    // Lanes
    lane(c, 128, "WHAT MISSION CONTROL SEES (" + fmtDur(ow * 60) + " OLD)", xAt(g - ow), "#c9d4e3");
    lane(c, 226, "WHERE THE ROVER REALLY IS NOW", rover.x, "#f0b35a");
    label(c, "60 m of Martian ground · time runs 60× fast", VW / 2, VH - 8, "center", "#56647c", 10);
  }
  function lane(c, y, title, x, col) {
    const X = (m) => TRACK.x0 + m / TRACK.m * (TRACK.x1 - TRACK.x0);
    label(c, title, TRACK.x0, y - 30, "left", "#7f8ea6", 11);
    c.fillStyle = "#2a1a14";
    c.fillRect(TRACK.x0, y + 8, TRACK.x1 - TRACK.x0, 4);
    // boulder
    c.fillStyle = "#8a6f5c";
    c.beginPath();
    c.moveTo(X(ROCK), y + 8); c.lineTo(X(ROCK) + 4, y - 10); c.lineTo(X(ROCK) + 16, y - 16); c.lineTo(X(ROCK) + 28, y - 6); c.lineTo(X(ROCK) + 30, y + 8);
    c.fill();
    // rover
    const rx = X(x) - 26;
    c.fillStyle = col;
    c.fillRect(rx + 4, y - 8, 22, 9);
    c.fillRect(rx + 20, y - 16, 2, 8);
    c.fillRect(rx + 17, y - 18, 8, 3);
    c.fillStyle = "#56647c";
    for (const wx of [rx + 7, rx + 15, rx + 23]) { c.beginPath(); c.arc(wx, y + 5, 3.5, 0, Math.PI * 2); c.fill(); }
    label(c, x.toFixed(1) + " m", X(x) - 15, y + 28, "center", col, 10);
  }

  // =====================================================================
  // Loop and controls
  // =====================================================================
  let last = performance.now(), lastStats = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    advanceMain(dt);
    if (romer.playing) advanceRomer(dt * 365.25 / 14);
    advanceRover(dt);
    drawMain();
    drawRomer();
    drawRover();
    if (now - lastStats > 150) {
      updateMainStats();
      $("ejDist").textContent = romer.dist.toFixed(2) + " AU, " + (romer.dist * LIGHT_AU_MIN).toFixed(1) + " light-min";
      $("ioLate").textContent = romer.last == null ? "–" : romer.last.toFixed(1) + " min";
      lastStats = now;
    }
    requestAnimationFrame(frame);
  }

  const DEST_IDS = { destMoon: "moon", destMars: "mars", destSun: "sun", destVoyager: "voyager", destProxima: "proxima" };
  function setDest(key) {
    state.dest = key;
    for (const [id, k] of Object.entries(DEST_IDS)) $(id).setAttribute("aria-pressed", String(k === key));
    setSpeed(DESTS[key].speed);
    send();
    const hints = {
      moon: "The Moon is 1.28 light-seconds away. Mission control's words to Apollo astronauts took that long to arrive, and replies the same again.",
      mars: "Drag the Earth to Mars slider: from 3 minutes at a close approach to 22 minutes with the Sun between us.",
      sun: "Sunlight is 8 minutes 20 seconds old when it reaches you. If the Sun vanished, you wouldn't know for that long.",
      voyager: "Voyager 1, launched in 1977, is the most distant human-made object. Its radio signal needs almost a full day to reach us.",
      proxima: "The nearest star after the Sun. Even sped up to a year per second the trip takes over 4 seconds. At real time you would wait 4 years and 3 months.",
    };
    $("hint").textContent = hints[key];
  }
  function setSpeed(v) {
    state.speed = v;
    $("speed").value = String(v);
  }
  function send() {
    state.elapsed = 0;
    state.hold = 0;
    state.flash = 0;
    state.playing = true;
    $("pause").textContent = "Pause";
  }
  for (const [id, k] of Object.entries(DEST_IDS)) $(id).addEventListener("click", () => setDest(k));
  $("speed").addEventListener("change", (e) => { state.speed = +e.target.value; });
  $("send").addEventListener("click", send);
  $("pause").addEventListener("click", () => {
    state.playing = !state.playing;
    $("pause").textContent = state.playing ? "Pause" : "Resume";
  });
  $("roundTrip").addEventListener("change", (e) => { state.roundTrip = e.target.checked; if (state.elapsed >= totalTime()) state.elapsed = totalTime(); });
  $("marsDist").addEventListener("input", (e) => {
    DESTS.mars.km = +e.target.value * 1e6;
    $("marsDistOut").textContent = e.target.value + " million km";
    if (state.dest !== "mars") setDest("mars");
    else if (state.elapsed > totalTime()) state.elapsed = 0;
    resetRover();
  });
  $("romerPlay").addEventListener("click", () => {
    romer.playing = !romer.playing;
    $("romerPlay").textContent = romer.playing ? "Pause" : "Play";
  });
  $("romerReset").addEventListener("click", () => { romer.dots = []; romer.last = null; });
  $("romerInstant").addEventListener("change", (e) => { romer.instant = e.target.checked; romer.dots = []; romer.last = null; });
  $("roverDrive").addEventListener("click", () => {
    if (rover.done || rover.packets.some((p) => p.kind === "drive")) return;
    rover.packets.push({ kind: "drive", t0: rover.gt });
    setVerdict("Drive command sent. It reaches Mars in " + fmtDur(oneWay() * 60) + ", and the first picture of the rover moving takes as long again to come back.", "");
  });
  $("roverStop").addEventListener("click", () => {
    if (!rover.packets.some((p) => p.kind === "drive") || rover.stopSentAt != null || rover.reported) return;
    rover.stopSentAt = rover.gt;
    rover.packets.push({ kind: "stop", t0: rover.gt });
    setVerdict("Stop sent. Your screen shows the rover at " + xAt(rover.gt - oneWay()).toFixed(1) + " m. Wait and see where it ends up.", "");
  });
  $("roverReset").addEventListener("click", resetRover);

  // ---------- Start ----------
  resetRover();
  setSpeed(1);
  updateMainStats();
  if (Lab.reducedMotion) {
    // Still pictures: the pulse halfway to the Moon, and a year of eclipses already plotted.
    state.playing = false;
    state.elapsed = lightTime() / 2;
    $("pause").textContent = "Resume";
    for (let i = 0; i < 400; i++) advanceRomer(1);
    $("romerPlay").textContent = "Play";
  } else {
    state.elapsed = 0.35;
    for (let i = 0; i < 160; i++) advanceRomer(1);
  }
  requestAnimationFrame(frame);
})();
