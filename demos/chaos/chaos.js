(function () {
  const W = 960, H = 520;
  const canvas = document.getElementById("bench");
  const ctx = Lab.setupCanvas(canvas, W, H);
  const $ = (id) => document.getElementById(id);

  // ---------- Layout (logical pixels) ----------
  const PIV_X = 245, PIV_Y = 250;   // pivot of every pendulum
  const SCALE = 105;                // pixels per metre (two 1 m arms reach 210 px)
  const PLOT = { x: 548, y: 46, w: 386, h: 404 };
  const LOG_MIN = -10, LOG_MAX = 1.5; // plot range, log10 of separation

  // ---------- Physics ----------
  // Double pendulum, equal masses m and equal arms l = 1 m. Angles from straight down.
  const G = 9.81, L = 1;
  const DT = 1 / 480;               // fixed RK4 step (s)
  const OMEGA0 = Math.sqrt(G / L);  // scales spin rates into the separation measure
  const VISIBLE = 0.2;              // lower bobs 20 cm apart counts as visibly different

  function deriv(s, out) {
    const a = s[0], b = s[1], w1 = s[2], w2 = s[3];
    const d = a - b, sd = Math.sin(d), cd = Math.cos(d);
    const den = 3 - Math.cos(2 * d); // (2m1 + m2 - m2 cos 2d) / m with m1 = m2
    out[0] = w1;
    out[1] = w2;
    out[2] = (-3 * G * Math.sin(a) - G * Math.sin(a - 2 * b) - 2 * sd * (w2 * w2 * L + w1 * w1 * L * cd)) / (L * den);
    out[3] = (2 * sd * (2 * w1 * w1 * L + 2 * G * Math.cos(a) + w2 * w2 * L * cd)) / (L * den);
  }

  const k1 = new Float64Array(4), k2 = new Float64Array(4), k3 = new Float64Array(4), k4 = new Float64Array(4), tmp = new Float64Array(4);
  function rk4(s, h) {
    deriv(s, k1);
    for (let i = 0; i < 4; i++) tmp[i] = s[i] + 0.5 * h * k1[i];
    deriv(tmp, k2);
    for (let i = 0; i < 4; i++) tmp[i] = s[i] + 0.5 * h * k2[i];
    deriv(tmp, k3);
    for (let i = 0; i < 4; i++) tmp[i] = s[i] + h * k3[i];
    deriv(tmp, k4);
    for (let i = 0; i < 4; i++) s[i] += (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  }

  const wrap = (x) => x - 2 * Math.PI * Math.round(x / (2 * Math.PI));

  // Distance in phase space: both angles (wrapped) and both spin rates scaled by sqrt(g/l).
  function separation(A, B) {
    const d1 = wrap(A[0] - B[0]), d2 = wrap(A[1] - B[1]);
    const d3 = (A[2] - B[2]) / OMEGA0, d4 = (A[3] - B[3]) / OMEGA0;
    return Math.sqrt(d1 * d1 + d2 * d2 + d3 * d3 + d4 * d4);
  }
  const tip = (s) => [L * (Math.sin(s[0]) + Math.sin(s[1])), L * (Math.cos(s[0]) + Math.cos(s[1]))];

  // ---------- State ----------
  const state = {
    th1: 150, th2: 0, logEps: -6, n: 2,
    running: !Lab.reducedMotion, trails: true,
    t: 0, pend: [], trailsXY: [], samples: [],
    tDiv: null, lambda: null, fit: null,
  };

  function colourFor(i, n) {
    if (n === 2) return i === 0 ? [240, 179, 90] : [92, 200, 255];
    // Fan: sweep from amber through pink to cyan.
    const f = n === 1 ? 0 : i / (n - 1);
    const hue = 38 - f * 230;
    return hslToRgb(((hue % 360) + 360) % 360, 0.85, 0.62);
  }
  function hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
    let r, g, b;
    if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x]; else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }

  function trailLength() { return state.n === 2 ? 220 : state.n === 10 ? 90 : 26; }

  function restart() {
    const eps = Math.pow(10, state.logEps);
    const a = state.th1 * Math.PI / 180, b = state.th2 * Math.PI / 180;
    state.t = 0;
    state.pend = [];
    state.trailsXY = [];
    for (let i = 0; i < state.n; i++) {
      const off = state.n === 1 ? 0 : eps * i / (state.n - 1);
      state.pend.push(Float64Array.from([a + off, b, 0, 0]));
      state.trailsXY.push([]);
    }
    state.colours = state.pend.map((_, i) => colourFor(i, state.n));
    state.samples = [{ t: 0, d: separation(state.pend[0], state.pend[state.n - 1]) }];
    state.tDiv = null; state.lambda = null; state.fit = null;
    updateReadouts();
  }

  function step() {
    for (const p of state.pend) rk4(p, DT);
    state.t += DT;
  }

  let sampleAcc = 0;
  function advance(seconds) {
    const steps = Math.round(seconds / DT);
    for (let k = 0; k < steps; k++) {
      step();
      sampleAcc += DT;
      if (sampleAcc >= 0.02) { sampleAcc = 0; record(); }
    }
    pushTrails();
  }

  function record() {
    const A = state.pend[0], B = state.pend[state.n - 1];
    const d = separation(A, B);
    state.samples.push({ t: state.t, d });
    if (state.tDiv === null) {
      const ta = tip(A), tb = tip(B);
      if (Math.hypot(ta[0] - tb[0], ta[1] - tb[1]) > VISIBLE) {
        state.tDiv = state.t;
        computeFit();
      }
    }
  }

  // Least-squares slope of ln(separation) against time, from the first second to the split.
  function computeFit() {
    const pts = state.samples.filter((s) => s.t >= Math.min(1, state.tDiv * 0.3) && s.t <= state.tDiv && s.d > 0);
    if (pts.length < 5) return;
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (const p of pts) { const y = Math.log(p.d); sx += p.t; sy += y; sxx += p.t * p.t; sxy += p.t * y; }
    const n = pts.length;
    const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    const icpt = (sy - slope * sx) / n;
    if (slope > 0.05) { state.lambda = slope; state.fit = { slope, icpt, t0: pts[0].t, t1: state.tDiv }; }
  }

  function pushTrails() {
    const len = trailLength();
    for (let i = 0; i < state.n; i++) {
      const tr = state.trailsXY[i];
      tr.push(tip(state.pend[i]));
      if (tr.length > len) tr.splice(0, tr.length - len);
    }
  }

  // ---------- Drawing ----------
  const toPx = (xy) => [PIV_X + xy[0] * SCALE, PIV_Y + xy[1] * SCALE];

  function drawPendulums() {
    ctx.font = "12px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.fillStyle = "#7f8ea6";
    ctx.textAlign = "center";
    ctx.fillText(state.n === 2 ? "TWO PENDULUMS, OVERLAID" : state.n + " PENDULUMS, OVERLAID", PIV_X, 28);

    // Reach circle
    ctx.strokeStyle = "#1a2436";
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.arc(PIV_X, PIV_Y, 2 * L * SCALE, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    const n = state.n;
    // Trails, drawn in chunks with rising opacity so they fade out behind the bob.
    if (state.trails) {
      const CH = 8;
      ctx.lineWidth = n === 100 ? 1 : 1.5;
      for (let i = 0; i < n; i++) {
        const tr = state.trailsXY[i];
        if (tr.length < 2) continue;
        const [r, g, b] = state.colours[i];
        const per = Math.ceil(tr.length / CH);
        for (let c = 0; c < CH; c++) {
          const s0 = c * per, s1 = Math.min(tr.length - 1, (c + 1) * per);
          if (s1 <= s0) continue;
          const a = ((c + 1) / CH) * (n === 100 ? 0.35 : 0.75);
          ctx.strokeStyle = `rgba(${r},${g},${b},${a})`;
          ctx.beginPath();
          let p = toPx(tr[s0]); ctx.moveTo(p[0], p[1]);
          for (let k = s0 + 1; k <= s1; k++) { p = toPx(tr[k]); ctx.lineTo(p[0], p[1]); }
          ctx.stroke();
        }
      }
      ctx.lineWidth = 1;
    }

    // Arms and bobs. Draw the last pendulum first so the first sits on top.
    const armW = n === 2 ? 3 : n === 10 ? 2 : 1;
    const bobR = n === 2 ? 8 : n === 10 ? 5 : 2.6;
    const alpha = n === 100 ? 0.55 : 0.95;
    for (let i = n - 1; i >= 0; i--) {
      const s = state.pend[i];
      const [r, g, b] = state.colours[i];
      const x1 = PIV_X + Math.sin(s[0]) * L * SCALE, y1 = PIV_Y + Math.cos(s[0]) * L * SCALE;
      const x2 = x1 + Math.sin(s[1]) * L * SCALE, y2 = y1 + Math.cos(s[1]) * L * SCALE;
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.8})`;
      ctx.lineWidth = armW;
      ctx.beginPath(); ctx.moveTo(PIV_X, PIV_Y); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.beginPath(); ctx.arc(x1, y1, bobR * 0.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x2, y2, bobR, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineWidth = 1;
    ctx.fillStyle = "#e9eef7";
    ctx.beginPath(); ctx.arc(PIV_X, PIV_Y, 4, 0, Math.PI * 2); ctx.fill();

    // Legend
    ctx.font = "11px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.textAlign = "left";
    if (n === 2) {
      ctx.fillStyle = "rgb(240,179,90)"; ctx.fillText("● start angle θ", 24, H - 36);
      ctx.fillStyle = "rgb(92,200,255)"; ctx.fillText("● start angle θ + " + fmtExp(Math.pow(10, state.logEps)) + " rad", 24, H - 18);
    } else {
      ctx.fillStyle = "#7f8ea6";
      ctx.fillText("Starts spread evenly over " + fmtExp(Math.pow(10, state.logEps)) + " rad", 24, H - 18);
    }
  }

  const yOf = (d) => PLOT.y + PLOT.h * (1 - (Math.log10(Math.max(d, 1e-12)) - LOG_MIN) / (LOG_MAX - LOG_MIN));

  function drawPlot() {
    const P = PLOT;
    const tMax = Math.max(20, Math.ceil(state.t / 10) * 10);
    const xOf = (t) => P.x + (t / tMax) * P.w;

    ctx.font = "12px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.fillStyle = "#7f8ea6";
    ctx.textAlign = "center";
    ctx.fillText("SEPARATION, FIRST VS LAST (LOG SCALE)", P.x + P.w / 2, 28);

    ctx.fillStyle = "#0a0f19";
    ctx.fillRect(P.x, P.y, P.w, P.h);

    // Decade grid lines
    ctx.font = "10px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.textAlign = "right";
    for (let e = LOG_MIN; e <= 1; e++) {
      const y = yOf(Math.pow(10, e));
      ctx.strokeStyle = e === 0 ? "#2a3852" : "#151e2e";
      ctx.beginPath(); ctx.moveTo(P.x, y + 0.5); ctx.lineTo(P.x + P.w, y + 0.5); ctx.stroke();
      if (e % 2 === 0) { ctx.fillStyle = "#56647c"; ctx.fillText(e === 0 ? "1" : "1e" + e, P.x - 6, y + 3); }
    }
    ctx.textAlign = "center";
    const tick = tMax <= 40 ? 5 : tMax <= 100 ? 10 : 30;
    for (let t = 0; t <= tMax; t += tick) {
      const x = xOf(t);
      ctx.strokeStyle = "#151e2e";
      ctx.beginPath(); ctx.moveTo(x + 0.5, P.y); ctx.lineTo(x + 0.5, P.y + P.h); ctx.stroke();
      ctx.fillStyle = "#56647c";
      ctx.fillText(t + " s", x, P.y + P.h + 14);
    }

    // Saturation band: once separation is order 1 the pendulums are unrelated.
    ctx.fillStyle = "rgba(240,138,93,0.07)";
    ctx.fillRect(P.x, P.y, P.w, yOf(1) - P.y);
    ctx.fillStyle = "#b57a5a";
    ctx.textAlign = "left";
    ctx.fillText("unrelated", P.x + 6, P.y + 12);

    // Fitted exponential
    if (state.fit) {
      const f = state.fit;
      ctx.strokeStyle = "rgba(233,238,247,0.55)";
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      const ya = Math.exp(f.icpt + f.slope * f.t0), yb = Math.exp(f.icpt + f.slope * f.t1);
      ctx.moveTo(xOf(f.t0), yOf(ya)); ctx.lineTo(xOf(f.t1), yOf(yb));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Data
    ctx.save();
    ctx.beginPath(); ctx.rect(P.x, P.y, P.w, P.h); ctx.clip();
    ctx.strokeStyle = state.n === 2 ? "#5cc8ff" : "#e48bd0";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    state.samples.forEach((s, i) => {
      const x = xOf(s.t), y = yOf(s.d);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.restore();

    // Divergence marker
    if (state.tDiv !== null) {
      const x = xOf(state.tDiv);
      ctx.strokeStyle = "#f0b35a";
      ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(x + 0.5, P.y); ctx.lineTo(x + 0.5, P.y + P.h); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#f0b35a";
      ctx.textAlign = x > P.x + P.w - 110 ? "right" : "left";
      ctx.fillText("visibly apart", x + (ctx.textAlign === "right" ? -5 : 5), P.y + P.h - 8);
    }

    ctx.strokeStyle = "#1f2a3f";
    ctx.strokeRect(P.x + 0.5, P.y + 0.5, P.w - 1, P.h - 1);

    ctx.fillStyle = "#7f8ea6";
    ctx.textAlign = "center";
    ctx.font = "11px 'IBM Plex Sans', system-ui, sans-serif";
    const caption = state.fit ? "Straight dashed line: steady exponential growth" : "A straight climb on this scale means exponential growth";
    ctx.fillText(caption, P.x + P.w / 2, P.y + P.h + 34);
  }

  function draw() {
    ctx.fillStyle = "#05080e";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#1a2436";
    ctx.beginPath(); ctx.moveTo(500.5, 20); ctx.lineTo(500.5, H - 20); ctx.stroke();
    drawPendulums();
    drawPlot();
  }

  // ---------- Readouts ----------
  function fmtExp(x) {
    const e = Math.floor(Math.log10(x) + 1e-9);
    const m = x / Math.pow(10, e);
    if (e >= -2) return x.toPrecision(2).replace(/\.?0+$/, "");
    return (Math.abs(m - 1) < 0.01 ? "1" : m.toFixed(1)) + "e" + e;
  }

  let lastStats = 0;
  function updateReadouts() {
    $("theta1Out").textContent = state.th1 + "°";
    $("theta2Out").textContent = state.th2 + "°";
    $("offsetOut").textContent = fmtExp(Math.pow(10, state.logEps)) + " rad";
    $("startDiff").textContent = fmtExp(Math.pow(10, state.logEps)) + " rad";
    $("time").textContent = state.t.toFixed(1) + " s";
    const last = state.samples[state.samples.length - 1];
    $("sepNow").textContent = last ? fmtExp(Math.max(last.d, 1e-12)) : "–";
    $("divTime").textContent = state.tDiv === null ? "not yet" : state.tDiv.toFixed(1) + " s";
    $("lyap").textContent = state.lambda
      ? "×" + Math.exp(state.lambda).toFixed(1) + " per s (×10 every " + (Math.LN10 / state.lambda).toFixed(1) + " s)"
      : (state.tDiv !== null ? "no steady growth" : "measuring…");
  }

  // ---------- Loop ----------
  let lastT = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    if (state.running) {
      advance(dt);
      if (now - lastStats > 120) { lastStats = now; updateReadouts(); }
    }
    draw();
    requestAnimationFrame(frame);
  }

  // ---------- Controls ----------
  function setPlay(on) {
    state.running = on;
    $("play").textContent = on ? "Pause" : "Play";
  }
  function restartAndShow() {
    restart();
    if (Lab.reducedMotion && !state.running) preroll();
  }
  // With reduced motion the page opens on a still frame that already shows the story.
  function preroll() {
    for (let k = 0; k < 600 && state.tDiv === null; k++) advance(1 / 30);
    for (let k = 0; k < 60; k++) advance(1 / 30);
    updateReadouts();
  }

  $("theta1").addEventListener("input", (e) => { state.th1 = +e.target.value; restartAndShow(); });
  $("theta2").addEventListener("input", (e) => { state.th2 = +e.target.value; restartAndShow(); });
  $("offset").addEventListener("input", (e) => { state.logEps = +e.target.value; restartAndShow(); });
  $("trails").addEventListener("change", (e) => { state.trails = e.target.checked; });
  $("play").addEventListener("click", () => setPlay(!state.running));
  $("restart").addEventListener("click", () => { restart(); if (!state.running) setPlay(true); });
  const counts = { count2: 2, count10: 10, count100: 100 };
  for (const id of Object.keys(counts)) {
    $(id).addEventListener("click", () => {
      state.n = counts[id];
      for (const other of Object.keys(counts)) $(other).setAttribute("aria-pressed", String(other === id));
      restartAndShow();
    });
  }

  restart();
  if (Lab.reducedMotion) { setPlay(false); preroll(); }
  else advance(0); // seed trails
  requestAnimationFrame(frame);
})();
