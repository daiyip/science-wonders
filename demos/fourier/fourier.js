(function () {
  const canvas = document.getElementById("bench");
  const $ = (id) => document.getElementById(id);
  const t9 = (s) => (window.I18N ? window.I18N.t(s) : s);

  const MONO = "'IBM Plex Mono', ui-monospace, monospace";
  const SANS = "'IBM Plex Sans', system-ui, sans-serif";
  const BG = "#05080e", PANEL = "#0a0f19", GRID = "#151e2e", RULE = "#1a2436", EDGE = "#1f2a3f";
  const DIM = "#7f8ea6", FAINT = "#56647c", INK = "#e9eef7";
  const CYAN = "#5cc8ff", AMBER = "#f0b35a";
  const HUES = ["#f0b35a", "#5cc8ff", "#e48bd0", "#4cc48d", "#b49cff", "#f08a5d", "#8fd3c8", "#d6d06a"];
  const TAU = Math.PI * 2;
  const SAMPLES = 512;   // a drawn wave: heights per period
  const GRID_N = 2048;   // grid for overshoot and error
  const M = 256;         // a drawn shape: points along the outline
  const MAX_TERMS = 50;
  const WAVE_SPEED = 0.25; // periods per second
  const LOOP_SECONDS = 7;  // one trip round a shape

  // ---------- Layout (logical pixels) ----------
  // Wide benches use a fixed 960 x 610 frame. Below 640 CSS px the drawing is
  // laid out at its displayed width, so canvas text keeps its real size.
  let W = 960, H = 610, narrow = false, ctx;
  let G = {};
  const fpx = (n) => (narrow ? Math.max(11, n) : n) + "px";

  function layout() {
    const cw = Math.round(canvas.clientWidth || canvas.parentElement.clientWidth || 960);
    narrow = cw < 640;
    if (!narrow) {
      W = 960;
      const wave = {
        ep: { x: 12, y: 44, w: 308, h: 322 },
        plot: { x: 336, y: 44, w: 608, h: 322 },
        U: 74, cx: 150, cy: 205,
        lanes: { x: 336, y: 412, w: 608, h: 172 },
        spec: { x: 40, y: 418, w: 270, h: 140 },
        titleY: 30, lowTitleY: 398,
      };
      const draw = {
        area: { x: 12, y: 12, w: 616, h: 586 },
        S: 250,
        spec: { x: 664, y: 56, w: 276, h: 190 },
        err: { x: 704, y: 334, w: 236, h: 196 },
      };
      G = { wave, draw };
      H = 610;
    } else {
      W = Math.max(300, cw);
      const U = Math.max(34, Math.min(52, Math.round(W * 0.115)));
      const cx = Math.round(1.6 * U) + 4;
      const px = cx + Math.round(1.4 * U);
      const top = 30, rowH = Math.round(U * 3.4);
      const lanesY = top + rowH + 40;
      const lanesH = 4 * 34;
      const specY = lanesY + lanesH + 56;
      const wave = {
        ep: { x: 0, y: top, w: px - 4, h: rowH },
        plot: { x: px, y: top, w: W - px - 4, h: rowH },
        U, cx, cy: top + rowH / 2,
        lanes: { x: 8, y: lanesY, w: W - 16, h: lanesH },
        spec: { x: 34, y: specY, w: W - 46, h: 110 },
        titleY: 18, lowTitleY: lanesY - 12, specTitleY: specY - 14,
      };
      const area = { x: 0, y: 0, w: W, h: Math.round(W * 0.98) };
      const specY2 = area.h + 40;
      const errY = specY2 + 110 + 64;
      const draw = {
        area, S: W * 0.4,
        spec: { x: 14, y: specY2, w: W - 28, h: 100 },
        err: { x: 48, y: errY, w: W - 66, h: 130 },
      };
      G = { wave, draw };
      H = state.mode === "wave" ? Math.round(specY + 110 + 34) : Math.round(errY + 130 + 34);
    }
    ctx = Lab.setupCanvas(canvas, W, H);
  }

  // ---------- State ----------
  const state = {
    mode: "wave",
    target: "square",
    terms: 5,
    running: !Lab.reducedMotion,
    theta: 0.9,            // phase of the first harmonic, radians
    custom: new Float64Array(SAMPLES),
    customReady: false,
    shape: "heart",
    circles: 10,
    tLoop: 0.15,
    userPath: null,        // the user's own drawing (normalised points)
    userDrew: false,
    sound: false, volume: 40, pitch: 220,
  };
  const heard = new Set();

  // ---------- Wave model ----------
  // Terms are {n, a, b}: a cos(nx) + b sin(nx). Only non-zero harmonics count as terms.
  function analyticTerms(target, count) {
    const out = [];
    for (let k = 1; out.length < count; k++) {
      let n, b;
      if (target === "sine") { if (k > 1) break; n = 1; b = 1; }
      else if (target === "square") { n = 2 * k - 1; b = 4 / (Math.PI * n); }
      else if (target === "sawtooth") { n = k; b = (n % 2 ? 2 : -2) / (Math.PI * n); }
      else { n = 2 * k - 1; b = (8 / (Math.PI * Math.PI * n * n)) * (((n - 1) / 2) % 2 ? -1 : 1); }
      out.push({ n, a: 0, b });
    }
    return out;
  }
  function customCoeffs(nMax) {
    const g = state.custom;
    let dc = 0;
    for (let j = 0; j < SAMPLES; j++) dc += g[j];
    dc /= SAMPLES;
    const out = [];
    for (let n = 1; n <= nMax; n++) {
      let a = 0, b = 0;
      for (let j = 0; j < SAMPLES; j++) {
        const x = (TAU * n * j) / SAMPLES;
        a += g[j] * Math.cos(x);
        b += g[j] * Math.sin(x);
      }
      out.push({ n, a: (2 * a) / SAMPLES, b: (2 * b) / SAMPLES });
    }
    return { dc, list: out };
  }
  function targetAt(x) {
    const u = ((x % TAU) + TAU) % TAU;
    switch (state.target) {
      case "sine": return Math.sin(u);
      case "square": return u === 0 || u === Math.PI ? 0 : u < Math.PI ? 1 : -1;
      case "sawtooth": return u < Math.PI ? u / Math.PI : (u - TAU) / Math.PI;
      case "triangle": return u < Math.PI / 2 ? (2 * u) / Math.PI : u < 1.5 * Math.PI ? 2 - (2 * u) / Math.PI : (2 * u) / Math.PI - 4;
      default: {
        const p = (u / TAU) * SAMPLES, j = Math.floor(p) % SAMPLES, f = p - Math.floor(p);
        return state.custom[j] * (1 - f) + state.custom[(j + 1) % SAMPLES] * f;
      }
    }
  }
  function defaultCustom() {
    // A plucked-string-like shape: a quick rise, a slow fall and a small dip.
    for (let j = 0; j < SAMPLES; j++) {
      const u = j / SAMPLES;
      let v = u < 0.12 ? u / 0.12 : u < 0.6 ? 1 - ((u - 0.12) / 0.48) * 1.5 : -0.5 + 0.35 * Math.sin(((u - 0.6) / 0.4) * Math.PI);
      state.custom[j] = v * 0.95;
    }
    state.customReady = true;
  }
  function copyTargetToCustom() {
    for (let j = 0; j < SAMPLES; j++) state.custom[j] = targetAt((TAU * (j + 0.5)) / SAMPLES);
    state.customReady = true;
  }

  const model = { dc: 0, all: [], used: [], hi: 1, S: null, F: null, over: 0, overAt: null, rms: 0, specAll: [] };

  function recompute() {
    let dc = 0, all;
    if (state.target === "custom") {
      if (!state.customReady) defaultCustom();
      const c = customCoeffs(100);
      dc = c.dc;
      model.specAll = c.list.map((t) => Math.hypot(t.a, t.b));
      all = c.list.slice(0, MAX_TERMS);
    } else {
      all = analyticTerms(state.target, MAX_TERMS);
      model.specAll = new Array(100).fill(0);
      for (const t of analyticTerms(state.target, 100)) if (t.n <= 100) model.specAll[t.n - 1] = Math.abs(t.b);
    }
    for (const t of all) { t.A = Math.hypot(t.a, t.b); t.phi = Math.atan2(t.a, t.b); }
    model.dc = dc;
    model.all = all;
    model.used = all.slice(0, state.terms);
    model.hi = model.used.length ? model.used[model.used.length - 1].n : 1;

    // Error and overshoot on a fine grid over one period.
    let maxS = -Infinity, minS = Infinity, maxF = -Infinity, minF = Infinity, se = 0, sf = 0, fm = 0;
    let atMax = 0, atMin = 0;
    const fs = new Float64Array(GRID_N);
    for (let i = 0; i < GRID_N; i++) { fs[i] = targetAt((TAU * (i + 0.5)) / GRID_N); fm += fs[i]; }
    fm /= GRID_N;
    for (let i = 0; i < GRID_N; i++) {
      const x = (TAU * (i + 0.5)) / GRID_N;
      const s = partial(x), f = fs[i];
      if (s > maxS) { maxS = s; atMax = x; }
      if (s < minS) { minS = s; atMin = x; }
      if (f > maxF) maxF = f;
      if (f < minF) minF = f;
      se += (s - f) * (s - f);
      sf += (f - fm) * (f - fm);
    }
    const range = Math.max(1e-9, maxF - minF);
    const up = (maxS - maxF) / range, down = (minF - minS) / range;
    model.over = Math.max(0, up, down);
    model.overAt = up >= down - 1e-9 ? { x: atMax, s: maxS, f: maxF } : { x: atMin, s: minS, f: minF };
    model.rms = Math.sqrt(se / Math.max(1e-12, sf));
    model.range = [minF, maxF];

    // Curves across two periods for the plot.
    const P = G.wave.plot, n = Math.max(200, Math.round(P.w * 2));
    model.S = new Float64Array(n + 1);
    model.F = new Float64Array(n + 1);
    for (let i = 0; i <= n; i++) {
      const x = (2 * TAU * i) / n;
      model.S[i] = partial(x);
      model.F[i] = targetAt(x);
    }
    updateReadouts();
    updateSoundWave();
  }
  function partial(x) {
    let s = model.dc;
    for (const t of model.used) s += t.a * Math.cos(t.n * x) + t.b * Math.sin(t.n * x);
    return s;
  }

  // ---------- Shape model (complex DFT) ----------
  function presetShape(name) {
    const pts = [];
    if (name === "heart") {
      for (let i = 0; i < 400; i++) {
        const t = (TAU * i) / 400;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        pts.push([x / 18, y / 18 + 0.1]);
      }
    } else if (name === "star") {
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 0.36 : 0.92, a = Math.PI / 2 + (Math.PI * i) / 5;
        pts.push([r * Math.cos(a), r * Math.sin(a) - 0.04]);
      }
    } else if (name === "square") {
      pts.push([-0.72, 0.72], [0.72, 0.72], [0.72, -0.72], [-0.72, -0.72]);
    }
    return pts;
  }
  function resample(pts) {
    const n = pts.length, seg = [], cum = [0];
    let total = 0;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      seg.push(d); total += d; cum.push(total);
    }
    const out = [];
    let i = 0;
    for (let m = 0; m < M; m++) {
      const s = (total * m) / M;
      while (i < n - 1 && cum[i + 1] < s) i++;
      const a = pts[i], b = pts[(i + 1) % n], f = seg[i] > 0 ? (s - cum[i]) / seg[i] : 0;
      out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
    }
    return { pts: out, length: total };
  }
  const shape = { path: null, c0: [0, 0], terms: [], cum: [], total: 0, recon: null, err: [] };
  function setPath(pts) {
    if (!pts) { shape.path = null; shape.terms = []; shape.recon = null; updateReadouts(); return; }
    const z = resample(pts).pts;
    shape.path = z;
    const terms = [];
    for (let k = -M / 2; k < M / 2; k++) {
      let re = 0, im = 0;
      for (let m = 0; m < M; m++) {
        const ang = (-TAU * k * m) / M;
        const c = Math.cos(ang), s = Math.sin(ang);
        re += z[m][0] * c - z[m][1] * s;
        im += z[m][0] * s + z[m][1] * c;
      }
      re /= M; im /= M;
      if (k === 0) shape.c0 = [re, im];
      else terms.push({ k, re, im, r: Math.hypot(re, im), ph: Math.atan2(im, re) });
    }
    terms.sort((a, b) => b.r - a.r);
    shape.terms = terms;
    let total = 0;
    for (const t of terms) total += t.r * t.r;
    shape.total = total;
    // Parseval: error with the K largest circles is the energy left out.
    shape.err = [1];
    let acc = 0;
    for (let K = 1; K <= terms.length; K++) {
      acc += terms[K - 1].r * terms[K - 1].r;
      shape.err.push(Math.sqrt(Math.max(0, total - acc) / Math.max(1e-18, total)));
    }
    rebuildRecon();
  }
  function rebuildRecon() {
    if (!shape.path) return;
    const R = 512, K = Math.min(state.circles, shape.terms.length);
    const out = new Float64Array(2 * (R + 1));
    for (let i = 0; i <= R; i++) {
      const t = i / R;
      let x = shape.c0[0], y = shape.c0[1];
      for (let j = 0; j < K; j++) {
        const c = shape.terms[j], a = TAU * c.k * t + c.ph;
        x += c.r * Math.cos(a); y += c.r * Math.sin(a);
      }
      out[2 * i] = x; out[2 * i + 1] = y;
    }
    shape.recon = out;
    updateReadouts();
  }
  const shapeErr = () => (shape.path ? shape.err[Math.min(state.circles, shape.terms.length)] : null);
  function loadShape() {
    if (state.shape === "custom") setPath(state.userPath);
    else setPath(presetShape(state.shape));
  }

  // ---------- Drawing helpers ----------
  function fitText(text, x, y, maxW) {
    const m = /(\d+(?:\.\d+)?)px/.exec(ctx.font);
    let size = m ? +m[1] : 12;
    const base = ctx.font;
    while (size > 10 && ctx.measureText(text).width > maxW) {
      size -= 0.5;
      ctx.font = base.replace(/\d+(?:\.\d+)?px/, size + "px");
    }
    ctx.fillText(text, x, y);
    ctx.font = base;
  }
  // Wrap by words; translate the whole sentence first. Chinese wraps per character.
  function wrapText(text, x, y, maxW, lh) {
    text = t9(text);
    const cjk = /[　-鿿]/.test(text);
    const words = cjk ? [...text] : text.split(" ");
    const sep = cjk ? "" : " ";
    let line = "";
    for (const w of words) {
      const tt = line ? line + sep + w : w;
      if (ctx.measureText(tt).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = w; }
      else line = tt;
    }
    if (line) { ctx.fillText(line, x, y); y += lh; }
    return y;
  }
  function title(text, x, y, maxW) {
    ctx.font = fpx(12) + " " + MONO;
    ctx.fillStyle = DIM;
    ctx.textAlign = "center";
    fitText(text, x, y, maxW);
  }
  function hexA(hex, a) {
    const v = parseInt(hex.slice(1), 16);
    return `rgba(${v >> 16},${(v >> 8) & 255},${v & 255},${a})`;
  }
  const pct = (x) => {
    const p = x * 100;
    return p >= 10 ? p.toFixed(0) : p >= 1 ? p.toFixed(1) : p >= 0.1 ? p.toFixed(2) : p > 0 ? p.toFixed(3) : "0";
  };

  // ---------- Draw: build a wave ----------
  function drawWaveMode() {
    const L = G.wave, P = L.plot, U = L.U, cy = L.cy;
    if (!narrow) title("ROTATING CIRCLES", L.ep.x + L.ep.w / 2, L.titleY, L.ep.w);
    const head = model.used.length === 1 ? "ONE SINE WAVE VS THE TARGET" : "SUM OF " + model.used.length + " SINE WAVES VS THE TARGET";
    if (narrow) title(head, W / 2, L.titleY, W - 16); else title(head, P.x + P.w / 2, L.titleY, P.w);

    // Plot frame
    ctx.fillStyle = PANEL;
    ctx.fillRect(P.x, P.y, P.w, P.h);
    const xOf = (x) => P.x + (x / (2 * TAU)) * P.w;
    const yOf = (v) => cy - v * U;
    ctx.lineWidth = 1;
    for (const v of [-1, 0, 1]) {
      ctx.strokeStyle = v === 0 ? "#22304a" : GRID;
      ctx.beginPath(); ctx.moveTo(P.x, Math.round(yOf(v)) + 0.5); ctx.lineTo(P.x + P.w, Math.round(yOf(v)) + 0.5); ctx.stroke();
    }
    ctx.font = fpx(10) + " " + MONO;
    ctx.fillStyle = FAINT;
    if (!narrow) {
      ctx.textAlign = "right";
      ctx.fillText("+1", P.x - 3, yOf(1) + 4);
      ctx.fillText("0", P.x - 3, yOf(0) + 4);
      ctx.fillText("−1", P.x - 3, yOf(-1) + 4);
    }
    for (let k = 1; k <= 2; k++) {
      const x = Math.round(xOf(k * TAU)) + 0.5;
      ctx.strokeStyle = GRID;
      ctx.beginPath(); ctx.moveTo(x, P.y); ctx.lineTo(x, P.y + P.h); ctx.stroke();
      ctx.fillStyle = FAINT;
      ctx.textAlign = "right";
      ctx.fillText(k === 1 ? "T" : "2T", x - 4, P.y + P.h - 6);
    }

    ctx.save();
    ctx.beginPath(); ctx.rect(P.x, P.y, P.w, P.h); ctx.clip();
    const n = model.S.length - 1;
    // Target
    ctx.strokeStyle = "rgba(201,212,227,0.32)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) { const x = P.x + (i / n) * P.w, y = yOf(model.F[i]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    // Partial sum
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) { const x = P.x + (i / n) * P.w, y = yOf(model.S[i]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    ctx.lineWidth = 1;

    // Gibbs marker at the biggest overshoot (shown in both periods).
    if (model.over > 0.004 && model.overAt) {
      const o = model.overAt;
      for (const xx of [o.x, o.x + TAU]) {
        const x = xOf(xx), yS = yOf(o.s), yF = yOf(o.f);
        ctx.strokeStyle = AMBER;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(x - 26, yF); ctx.lineTo(x + 26, yF); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(x - 10, yS); ctx.lineTo(x + 10, yS); ctx.stroke();
        ctx.fillStyle = AMBER;
        ctx.beginPath(); ctx.arc(x, yS, 3, 0, TAU); ctx.fill();
      }
      const x = xOf(o.x + TAU), up = o.s > o.f;
      ctx.font = fpx(11) + " " + MONO;
      ctx.textAlign = x > P.x + P.w - 80 ? "right" : "left";
      const tx = ctx.textAlign === "right" ? x - 14 : x + 14;
      ctx.fillText("+" + pct(model.over) + "%", tx, yOf(o.s) + (up ? -6 : 16));
    }
    ctx.restore();

    // Cursor
    const ph = state.theta % (2 * TAU);
    const xc = xOf(ph), sNow = partial(state.theta);
    ctx.strokeStyle = "rgba(233,238,247,0.18)";
    ctx.beginPath(); ctx.moveTo(Math.round(xc) + 0.5, P.y); ctx.lineTo(Math.round(xc) + 0.5, P.y + P.h); ctx.stroke();

    // Epicycles: one circle per term, chained tip to tail.
    let px = L.cx, py = cy - model.dc * U;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, P.y - 6, W, P.h + 12); ctx.clip();
    ctx.strokeStyle = RULE;
    ctx.beginPath(); ctx.moveTo(L.cx, P.y); ctx.lineTo(L.cx, P.y + P.h); ctx.stroke();
    model.used.forEach((t, i) => {
      const r = t.A * U, a = t.n * state.theta + t.phi;
      const nx = px + r * Math.cos(a), ny = py - r * Math.sin(a);
      const col = HUES[i % HUES.length];
      if (r > 0.7) {
        ctx.strokeStyle = hexA(col, i < 8 ? 0.4 : 0.22);
        ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.stroke();
      }
      ctx.strokeStyle = hexA(col, 0.95);
      ctx.lineWidth = i < 8 ? 1.8 : 1.2;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
      ctx.lineWidth = 1;
      px = nx; py = ny;
    });
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.arc(L.cx, cy - model.dc * U, 3, 0, TAU); ctx.fill();
    ctx.restore();
    // Connector from the tip to the cursor
    ctx.strokeStyle = "rgba(240,179,90,0.6)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(xc, yOf(sNow)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = AMBER;
    ctx.beginPath(); ctx.arc(px, py, 4, 0, TAU); ctx.fill();
    ctx.fillStyle = CYAN;
    ctx.beginPath(); ctx.arc(xc, yOf(sNow), 4, 0, TAU); ctx.fill();

    // Keyboard pen for reshaping the wave
    if (focused && state.target === "custom") {
      const x = xOf((TAU * (pen + 0.5)) / SAMPLES + TAU), y = yOf(state.custom[pen]);
      ctx.strokeStyle = INK;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, P.y); ctx.lineTo(x, P.y + P.h); ctx.strokeStyle = "rgba(233,238,247,0.25)"; ctx.stroke();
    }

    if (state.target === "sine" && state.terms > 1) {
      ctx.font = fpx(11) + " " + SANS;
      ctx.fillStyle = DIM;
      ctx.textAlign = "center";
      fitText("A pure sine needs only one term", P.x + P.w / 2, P.y + 18, P.w - 16);
    } else if (state.target === "custom" && !narrow) {
      ctx.font = fpx(11) + " " + SANS;
      ctx.fillStyle = DIM;
      ctx.textAlign = "center";
      fitText("Drag on the wave to reshape it", P.x + P.w / 2, P.y + 18, P.w - 16);
    }

    drawLanes();
    drawSpectrum();
  }

  function drawLanes() {
    const L = G.wave, R = L.lanes;
    const show = Math.min(4, model.used.length);
    title("THE FIRST HARMONICS ON THEIR OWN", R.x + R.w / 2, L.lowTitleY, R.w);
    const laneH = R.h / 4;
    const A0 = model.used.length ? Math.max(...model.used.slice(0, show).map((t) => t.A)) : 1;
    const xOf = (x) => R.x + (x / (2 * TAU)) * R.w;
    const ph = state.theta % (2 * TAU);
    for (let i = 0; i < 4; i++) {
      const y0 = R.y + i * laneH, mid = y0 + laneH / 2;
      ctx.fillStyle = PANEL;
      ctx.fillRect(R.x, y0 + 2, R.w, laneH - 4);
      if (i >= show) continue;
      const t = model.used[i], col = HUES[i % HUES.length];
      const k = (laneH / 2 - 6) / A0;
      ctx.strokeStyle = GRID;
      ctx.beginPath(); ctx.moveTo(R.x, mid + 0.5); ctx.lineTo(R.x + R.w, mid + 0.5); ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      const steps = Math.round(R.w);
      for (let s = 0; s <= steps; s++) {
        const x = (2 * TAU * s) / steps;
        const y = mid - t.A * Math.sin(t.n * x + t.phi) * k;
        s ? ctx.lineTo(R.x + s * (R.w / steps), y) : ctx.moveTo(R.x, y);
      }
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(xOf(ph), mid - t.A * Math.sin(t.n * state.theta + t.phi) * k, 3, 0, TAU); ctx.fill();
      ctx.font = fpx(10) + " " + MONO;
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(10,15,25,0.8)";
      const label = "n = " + t.n + " · size " + t.A.toFixed(t.A >= 0.1 ? 2 : 3);
      const lw = ctx.measureText(label).width;
      ctx.fillRect(R.x + 4, y0 + 4, lw + 8, 14);
      ctx.fillStyle = col;
      ctx.fillText(label, R.x + 8, y0 + 15);
    }
    ctx.strokeStyle = "rgba(233,238,247,0.18)";
    ctx.beginPath(); ctx.moveTo(Math.round(xOf(ph)) + 0.5, R.y); ctx.lineTo(Math.round(xOf(ph)) + 0.5, R.y + R.h); ctx.stroke();
    if (model.used.length > 4) {
      ctx.font = fpx(10) + " " + MONO;
      ctx.fillStyle = DIM;
      ctx.textAlign = "right";
      const more = model.used.length - 4;
      ctx.fillText(more === 1 ? "+ 1 more harmonic, smaller still" : "+ " + more + " more harmonics, smaller still", R.x + R.w - 6, R.y + R.h + 14);
    }
  }

  function drawSpectrum() {
    const L = G.wave, R = L.spec;
    const ty = narrow ? L.specTitleY : L.lowTitleY;
    title("SIZE OF EACH HARMONIC", narrow ? W / 2 : R.x + R.w / 2 - 14, ty, narrow ? W - 16 : R.w + 30);
    const hi = model.hi;
    const nShow = Math.max(10, Math.min(100, Math.ceil((hi * 1.3 + 1) / 10) * 10));
    const amps = model.specAll.slice(0, nShow);
    const top = Math.max(1e-9, ...amps, ...model.used.map((t) => t.A));
    ctx.fillStyle = PANEL;
    ctx.fillRect(R.x, R.y, R.w, R.h);
    const bw = R.w / nShow;
    const usedN = new Map(model.used.map((t, i) => [t.n, i]));
    for (let n = 1; n <= nShow; n++) {
      const a = amps[n - 1] || 0;
      if (a < top * 1e-4) continue;
      const h = (a / top) * (R.h - 8);
      const x = R.x + (n - 1) * bw + Math.max(0.5, bw * 0.15), w = Math.max(1, bw * 0.7);
      if (usedN.has(n)) {
        const i = usedN.get(n);
        ctx.fillStyle = i < 8 ? HUES[i] : CYAN;
        ctx.fillRect(x, R.y + R.h - h, w, h);
      } else {
        ctx.strokeStyle = "rgba(127,142,166,0.45)";
        ctx.strokeRect(x + 0.5, R.y + R.h - h + 0.5, Math.max(0, w - 1), h - 1);
      }
    }
    ctx.strokeStyle = EDGE;
    ctx.strokeRect(R.x + 0.5, R.y + 0.5, R.w - 1, R.h - 1);
    ctx.font = fpx(10) + " " + MONO;
    ctx.fillStyle = FAINT;
    ctx.textAlign = "center";
    ctx.fillText("1", R.x + bw / 2, R.y + R.h + 13);
    ctx.fillText(String(nShow), R.x + R.w - bw / 2, R.y + R.h + 13);
    ctx.fillText("harmonic n", R.x + R.w / 2, R.y + R.h + 13);
    ctx.textAlign = "right";
    ctx.fillText(top.toFixed(2), R.x - 4, R.y + 10);
    ctx.fillText("0", R.x - 4, R.y + R.h);
  }

  // ---------- Draw: redraw a shape ----------
  function areaMap() {
    const A = G.draw.area;
    return { cx: A.x + A.w / 2, cy: A.y + A.h / 2, S: G.draw.S };
  }
  function drawShapeMode() {
    const D = G.draw, A = D.area, { cx, cy, S } = areaMap();
    const X = (x) => cx + x * S, Y = (y) => cy - y * S;
    ctx.fillStyle = PANEL;
    ctx.fillRect(A.x, A.y, A.w, A.h);
    ctx.strokeStyle = GRID;
    ctx.beginPath();
    ctx.moveTo(cx + 0.5, A.y); ctx.lineTo(cx + 0.5, A.y + A.h);
    ctx.moveTo(A.x, cy + 0.5); ctx.lineTo(A.x + A.w, cy + 0.5);
    ctx.stroke();

    if (shape.path) {
      // Target outline
      ctx.strokeStyle = "rgba(201,212,227,0.3)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      shape.path.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))));
      ctx.closePath(); ctx.stroke();
      // Full redraw, faint
      const R = shape.recon, n = R.length / 2 - 1;
      ctx.strokeStyle = "rgba(92,200,255,0.28)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) (i ? ctx.lineTo(X(R[2 * i]), Y(R[2 * i + 1])) : ctx.moveTo(X(R[0]), Y(R[1])));
      ctx.stroke();
      // Traced so far, bright
      const upto = Math.floor(state.tLoop * n);
      ctx.strokeStyle = CYAN;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let i = 0; i <= upto; i++) (i ? ctx.lineTo(X(R[2 * i]), Y(R[2 * i + 1])) : ctx.moveTo(X(R[0]), Y(R[1])));
      ctx.stroke();
      ctx.lineWidth = 1;
      // Circles
      const K = Math.min(state.circles, shape.terms.length);
      let x = shape.c0[0], y = shape.c0[1];
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(X(x), Y(y), 3, 0, TAU); ctx.fill();
      for (let j = 0; j < K; j++) {
        const c = shape.terms[j], a = TAU * c.k * state.tLoop + c.ph;
        const nx = x + c.r * Math.cos(a), ny = y + c.r * Math.sin(a);
        const rp = c.r * S, col = HUES[j % HUES.length];
        if (rp > 0.8) {
          ctx.strokeStyle = hexA(col, j < 8 ? 0.38 : 0.18);
          ctx.beginPath(); ctx.arc(X(x), Y(y), rp, 0, TAU); ctx.stroke();
        }
        if (rp > 0.3) {
          ctx.strokeStyle = hexA(col, j < 8 ? 0.95 : 0.6);
          ctx.lineWidth = j < 8 ? 1.6 : 1;
          ctx.beginPath(); ctx.moveTo(X(x), Y(y)); ctx.lineTo(X(nx), Y(ny)); ctx.stroke();
          ctx.lineWidth = 1;
        }
        x = nx; y = ny;
      }
      ctx.fillStyle = AMBER;
      ctx.beginPath(); ctx.arc(X(x), Y(y), 4.5, 0, TAU); ctx.fill();
    } else if (!live) {
      ctx.fillStyle = DIM;
      ctx.textAlign = "center";
      ctx.font = fpx(15) + " " + SANS;
      wrapText("Draw a closed shape here", cx, cy - 10, A.w - 40, 20);
      ctx.font = fpx(12) + " " + SANS;
      ctx.fillStyle = FAINT;
      wrapText("Lift your finger or mouse to close it. Keyboard: press Enter, steer with the arrow keys, Enter again to finish.", cx, cy + 18, Math.min(A.w - 40, 420), 17);
    }

    // A drawing in progress
    if (live && live.length) {
      ctx.strokeStyle = AMBER;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      live.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))));
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = "rgba(240,179,90,0.5)";
      const a = live[live.length - 1], b = live[0];
      ctx.beginPath(); ctx.moveTo(X(a[0]), Y(a[1])); ctx.lineTo(X(b[0]), Y(b[1])); ctx.stroke();
      ctx.setLineDash([]);
      if (kbPen) {
        ctx.strokeStyle = INK;
        ctx.beginPath(); ctx.arc(X(kbPen[0]), Y(kbPen[1]), 7, 0, TAU); ctx.stroke();
      }
    }

    drawShapeSpectrum();
    drawErrorCurve();
  }

  function drawShapeSpectrum() {
    const R = G.draw.spec;
    title("CIRCLE SIZES BY SPEED (√ SCALE)", narrow ? W / 2 : R.x + R.w / 2, R.y - 14, narrow ? W - 16 : R.w + 40);
    ctx.fillStyle = PANEL;
    ctx.fillRect(R.x, R.y, R.w, R.h);
    const KS = narrow ? 20 : 30;
    const bw = R.w / (2 * KS + 1);
    const mid = R.x + R.w / 2;
    if (shape.path && shape.terms.length) {
      const rank = new Map(shape.terms.map((t, i) => [t.k, i]));
      const top = Math.sqrt(shape.terms[0].r);
      const K = state.circles;
      for (const t of shape.terms) {
        if (Math.abs(t.k) > KS) continue;
        const h = (Math.sqrt(t.r) / top) * (R.h - 8);
        const x = mid + (t.k - 0.5) * bw + bw * 0.15, w = Math.max(1, bw * 0.7);
        const i = rank.get(t.k);
        if (i < K) { ctx.fillStyle = i < 8 ? HUES[i] : CYAN; ctx.fillRect(x, R.y + R.h - h, w, h); }
        else { ctx.strokeStyle = "rgba(127,142,166,0.45)"; ctx.strokeRect(x + 0.5, R.y + R.h - h + 0.5, Math.max(0, w - 1), Math.max(0, h - 1)); }
      }
    }
    ctx.strokeStyle = EDGE;
    ctx.strokeRect(R.x + 0.5, R.y + 0.5, R.w - 1, R.h - 1);
    ctx.font = fpx(10) + " " + MONO;
    ctx.fillStyle = FAINT;
    ctx.textAlign = "center";
    ctx.fillText("−" + KS, R.x + bw / 2, R.y + R.h + 13);
    ctx.fillText("0", mid, R.y + R.h + 13);
    ctx.fillText("+" + KS, R.x + R.w - bw / 2, R.y + R.h + 13);
    ctx.font = fpx(10) + " " + SANS;
    ctx.fillText("turns per loop (minus = clockwise)", mid, R.y + R.h + 27);
  }

  function drawErrorCurve() {
    const R = G.draw.err;
    title("REDRAW ERROR VS NUMBER OF CIRCLES", narrow ? W / 2 : R.x + R.w / 2 - 20, R.y - 14, narrow ? W - 16 : R.w + 80);
    ctx.fillStyle = PANEL;
    ctx.fillRect(R.x, R.y, R.w, R.h);
    const KMAX = M - 1;
    const xOf = (K) => R.x + (Math.log10(K) / Math.log10(KMAX)) * R.w;
    const yOf = (e) => R.y + ((2 - Math.log10(Math.max(1e-4, e * 100))) / 4) * R.h; // 100% .. 0.01%
    ctx.font = fpx(10) + " " + MONO;
    ctx.textAlign = "right";
    for (const [e, lab] of [[1, "100%"], [0.1, "10%"], [0.01, "1%"], [0.001, "0.1%"], [0.0001, "0.01%"]]) {
      const y = Math.round(yOf(e)) + 0.5;
      ctx.strokeStyle = GRID;
      ctx.beginPath(); ctx.moveTo(R.x, y); ctx.lineTo(R.x + R.w, y); ctx.stroke();
      ctx.fillStyle = FAINT;
      ctx.fillText(lab, R.x - 4, y + 3);
    }
    ctx.textAlign = "center";
    for (const K of [1, 10, 100]) {
      const x = Math.round(xOf(K)) + 0.5;
      ctx.strokeStyle = GRID;
      ctx.beginPath(); ctx.moveTo(x, R.y); ctx.lineTo(x, R.y + R.h); ctx.stroke();
      ctx.fillStyle = FAINT;
      ctx.fillText(String(K), x, R.y + R.h + 13);
    }
    ctx.font = fpx(10) + " " + SANS;
    ctx.fillText("circles (log scale)", R.x + R.w / 2, R.y + R.h + 27);
    if (!shape.path) { ctx.strokeStyle = EDGE; ctx.strokeRect(R.x + 0.5, R.y + 0.5, R.w - 1, R.h - 1); return; }
    ctx.save();
    ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let K = 1; K <= KMAX; K++) { const x = xOf(K), y = yOf(shape.err[K]); K === 1 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.restore();
    const K = Math.min(state.circles, KMAX), e = shape.err[K];
    const x = xOf(K), y = yOf(e);
    ctx.fillStyle = AMBER;
    ctx.beginPath(); ctx.arc(x, Math.min(R.y + R.h - 2, y), 4.5, 0, TAU); ctx.fill();
    ctx.font = fpx(11) + " " + MONO;
    ctx.textAlign = x > R.x + R.w * 0.55 ? "right" : "left";
    const lab = e > 0 ? pct(e) + "%" : "exact";
    ctx.fillText(lab, x + (ctx.textAlign === "right" ? -8 : 8), Math.min(R.y + R.h - 6, y) - 8);
    ctx.strokeStyle = EDGE;
    ctx.strokeRect(R.x + 0.5, R.y + 0.5, R.w - 1, R.h - 1);
  }

  function draw() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    if (state.mode === "wave") drawWaveMode();
    else drawShapeMode();
  }

  // ---------- Readouts ----------
  const TARGET_NAME = { sine: "pure sine", square: "square wave", sawtooth: "sawtooth wave", triangle: "triangle wave", custom: "your drawn wave" };
  const SHAPE_NAME = { heart: "heart", star: "star", square: "square", custom: "your drawing" };
  function updateReadouts() {
    $("termsOut").textContent = String(state.terms);
    $("termsNow").textContent = state.target === "sine" ? "1 (a sine needs only one)" : String(model.used.length);
    $("highest").textContent = "n = " + model.hi;
    const jumpy = state.target === "square" || state.target === "sawtooth";
    if (state.target === "sine") $("overshoot").textContent = "none";
    else if (jumpy) $("overshoot").textContent = pct(model.over) + "% of the jump";
    else if (state.target === "triangle") $("overshoot").textContent = model.over < 0.001 ? "none (no jumps)" : pct(model.over) + "% of the height";
    else $("overshoot").textContent = model.over < 0.001 ? "none" : pct(model.over) + "% of the height";
    $("rms").textContent = pct(model.rms) + "%";
    $("soundState").textContent = state.sound ? "on, " + state.pitch + " Hz" : "off";
    $("volumeOut").textContent = state.volume + "%";
    $("pitchOut").textContent = state.pitch + " Hz";
    $("circlesOut").textContent = String(state.circles);
    const e = shapeErr();
    $("circlesNow").textContent = shape.path ? Math.min(state.circles, shape.terms.length) + " of " + shape.terms.length : "–";
    $("drawErr").textContent = e === null ? "–" : e > 0 ? pct(e) + "%" : "0% (exact)";
    $("shapeNow").textContent = state.shape === "custom" && !shape.path ? "not drawn yet" : SHAPE_NAME[state.shape];
  }

  function sceneText() {
    if (state.mode === "draw") {
      if (!shape.path) return "Redraw mode with no shape yet. Draw a closed shape on the picture, or focus it, press Enter and steer a pen with the arrow keys.";
      return "Redraw mode: " + Math.min(state.circles, shape.terms.length) + " rotating circles, out of " + shape.terms.length + ", trace the outline with an error of " + pct(shapeErr()) + "% of its size.";
    }
    const k = model.used.length, hi = model.hi, o = pct(model.over), r = pct(model.rms);
    switch (state.target) {
      case "sine": return "Target: a pure sine wave. A single rotating circle draws it exactly, so there is nothing to add.";
      case "square": return "Square wave built from " + k + " sine terms, up to harmonic " + hi + ". Next to each jump the sum overshoots by " + o + "% of the jump, and the overall error is " + r + "%.";
      case "sawtooth": return "Sawtooth wave built from " + k + " sine terms, up to harmonic " + hi + ". Next to each jump the sum overshoots by " + o + "% of the jump, and the overall error is " + r + "%.";
      case "triangle": return "Triangle wave built from " + k + " sine terms, up to harmonic " + hi + ". It has no jumps, so there is no lasting overshoot, and the overall error is " + r + "%.";
      default: return "Your drawn wave built from " + k + " terms, up to harmonic " + hi + ". The overall error is " + r + "% and the biggest overshoot is " + o + "% of the wave's height.";
    }
  }
  WONDERS.describer(sceneText);

  // ---------- Sound ----------
  let actx = null, osc = null, gain = null, waveTimer = null;
  const AC = window.AudioContext || window.webkitAudioContext;
  function periodicWave() {
    const len = Math.max(2, model.hi + 1);
    const real = new Float32Array(len), imag = new Float32Array(len);
    for (const t of model.used) { real[t.n] = t.a; imag[t.n] = t.b; }
    return actx.createPeriodicWave(real, imag);
  }
  const level = () => 0.3 * Math.pow(state.volume / 100, 2);
  function startSound() {
    if (!AC) return;
    try {
      if (!actx) actx = new AC();
      if (actx.state === "suspended") actx.resume().catch(() => {});
      osc = actx.createOscillator();
      gain = actx.createGain();
      gain.gain.value = 0;
      osc.setPeriodicWave(periodicWave());
      osc.frequency.value = state.pitch;
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start();
      gain.gain.setTargetAtTime(level(), actx.currentTime, 0.03);
    } catch (e) { osc = null; return; }
    state.sound = true;
    $("listen").textContent = "Stop sound";
    $("listen").classList.add("on");
    noteHeard();
    updateReadouts();
    WONDERS.describe("Sound on at " + state.pitch + " Hz.", { now: true });
  }
  function stopSound(quiet) {
    if (osc && actx) {
      const t = actx.currentTime, o = osc;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setTargetAtTime(0, t, 0.03);
      try { o.stop(t + 0.2); } catch (e) {}
    }
    osc = null;
    const was = state.sound;
    state.sound = false;
    $("listen").textContent = "Play sound";
    $("listen").classList.remove("on");
    updateReadouts();
    if (was && !quiet) WONDERS.describe("Sound off.", { now: true });
  }
  function updateSoundWave() {
    if (!osc || waveTimer) return;
    waveTimer = setTimeout(() => {
      waveTimer = null;
      if (osc) { try { osc.setPeriodicWave(periodicWave()); } catch (e) {} }
    }, 40);
  }
  function noteHeard() {
    if (!state.sound) return;
    heard.add(state.target);
    if (heard.has("square") && heard.has("sine")) WONDERS.challenge("hear");
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden && state.sound) stopSound(true); });

  // ---------- Challenges ----------
  function checkChallenges() {
    if (state.mode === "wave" && state.target === "square" && state.terms >= 25) WONDERS.challenge("gibbs");
    if (state.mode === "draw" && state.shape === "custom" && state.userDrew && shape.path) {
      const e = shapeErr();
      if (state.circles <= 15 && e !== null && e < 0.02) WONDERS.challenge("own-shape");
    }
  }

  // ---------- Pointer input ----------
  let dragging = false, lastIdx = null, live = null, kbPen = null, focused = false, pen = 64;
  function logical(e) {
    const r = canvas.getBoundingClientRect();
    return [((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height];
  }
  function inRect(p, R, pad = 0) { return p[0] >= R.x - pad && p[0] <= R.x + R.w + pad && p[1] >= R.y - pad && p[1] <= R.y + R.h + pad; }
  function makeCustom() {
    if (state.target === "custom") return;
    copyTargetToCustom();
    state.target = "custom";
    $("target").value = "custom";
    onTargetChange(true);
  }
  function paintWave(p) {
    const L = G.wave, P = L.plot;
    const u = ((((p[0] - P.x) / P.w) * 2 * TAU) % TAU + TAU) % TAU;
    const idx = Math.min(SAMPLES - 1, Math.floor((u / TAU) * SAMPLES));
    const v = Math.max(-1.4, Math.min(1.4, (L.cy - p[1]) / L.U));
    if (lastIdx === null) state.custom[idx] = v;
    else {
      let d = idx - lastIdx;
      if (d > SAMPLES / 2) d -= SAMPLES; else if (d < -SAMPLES / 2) d += SAMPLES;
      const v0 = state.custom[lastIdx] ;
      const steps = Math.abs(d);
      for (let s = 1; s <= steps; s++) {
        const j = (((lastIdx + Math.sign(d) * s) % SAMPLES) + SAMPLES) % SAMPLES;
        state.custom[j] = v0 + ((v - v0) * s) / steps;
      }
      if (!steps) state.custom[idx] = v;
    }
    lastIdx = idx;
    pen = idx;
    recompute();
  }
  canvas.addEventListener("pointerdown", (e) => {
    const p = logical(e);
    if (state.mode === "wave") {
      if (!inRect(p, G.wave.plot)) return;
      if (state.target !== "custom" && e.pointerType === "touch") return;
      makeCustom();
      dragging = true; lastIdx = null;
      paintWave(p);
    } else {
      if (!inRect(p, G.draw.area)) return;
      const { cx, cy, S } = areaMap();
      kbPen = null;
      live = [[(p[0] - cx) / S, (cy - p[1]) / S]];
      dragging = true;
    }
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const p = logical(e);
    if (state.mode === "wave") paintWave(p);
    else if (live) {
      const { cx, cy, S } = areaMap();
      const q = [(p[0] - cx) / S, (cy - p[1]) / S], last = live[live.length - 1];
      if (Math.hypot(q[0] - last[0], q[1] - last[1]) * S > 1.5) live.push(q);
    }
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    if (state.mode === "wave") {
      lastIdx = null;
      WONDERS.describe(sceneText());
      noteHeard();
    } else finishShape();
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  function finishShape() {
    const pts = live;
    live = null; kbPen = null;
    if (!pts || pts.length < 3) return;
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (len < 0.25) { WONDERS.describe("That shape is too small to redraw. Try a bigger one.", { now: true }); return; }
    state.userPath = pts;
    state.userDrew = true;
    state.shape = "custom";
    $("shape").value = "custom";
    setPath(pts);
    state.tLoop = 0;
    WONDERS.sound("event");
    WONDERS.describe("Shape drawn. " + Math.min(state.circles, shape.terms.length) + " circles redraw it with an error of " + pct(shapeErr()) + "%.", { now: true });
    checkChallenges();
  }

  // ---------- Keyboard on the canvas ----------
  function nudgeRange(id, d) {
    const el = $(id);
    const v = Math.max(+el.min, Math.min(+el.max, +el.value + d));
    if (v === +el.value) return;
    el.value = String(v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
  canvas.addEventListener("focus", () => { focused = true; });
  canvas.addEventListener("blur", () => { focused = false; });
  canvas.addEventListener("keydown", (e) => {
    const k = e.key;
    let handled = true;
    const big = e.shiftKey;
    if (k === "+" || k === "=") nudgeRange(state.mode === "wave" ? "terms" : "circles", big ? 5 : 1);
    else if (k === "-" || k === "_") nudgeRange(state.mode === "wave" ? "terms" : "circles", big ? -5 : -1);
    else if (k === " ") setPlay(!state.running);
    else if (state.mode === "wave") {
      if (k === "ArrowLeft" || k === "ArrowRight") {
        if (state.target !== "custom") makeCustom();
        pen = (pen + (k === "ArrowRight" ? 1 : -1) * (big ? 32 : 8) + SAMPLES) % SAMPLES;
      } else if (k === "ArrowUp" || k === "ArrowDown") {
        if (state.target !== "custom") makeCustom();
        const d = (k === "ArrowUp" ? 1 : -1) * (big ? 0.5 : 0.1);
        for (let j = -6; j <= 6; j++) {
          const i = (pen + j + SAMPLES) % SAMPLES;
          state.custom[i] = Math.max(-1.4, Math.min(1.4, state.custom[i] + d));
        }
        recompute();
        WONDERS.describe("Wave height at the pen is now " + state.custom[pen].toFixed(1) + ".");
      } else handled = false;
    } else {
      if (k === "Enter") {
        if (!kbPen) { kbPen = [0, 0]; live = [[0, 0]]; WONDERS.describe("Drawing with the keyboard. Steer with the arrow keys, then press Enter to close the shape or Escape to cancel.", { now: true }); }
        else finishShape();
      } else if (k === "Escape" && kbPen) { kbPen = null; live = null; WONDERS.describe("Drawing cancelled.", { now: true }); }
      else if (kbPen && k.startsWith("Arrow")) {
        const s = big ? 0.015 : 0.05;
        const dx = k === "ArrowRight" ? s : k === "ArrowLeft" ? -s : 0;
        const dy = k === "ArrowUp" ? s : k === "ArrowDown" ? -s : 0;
        kbPen = [Math.max(-1.1, Math.min(1.1, kbPen[0] + dx)), Math.max(-1.1, Math.min(1.1, kbPen[1] + dy))];
        live.push(kbPen.slice());
      } else handled = false;
    }
    if (handled) e.preventDefault();
  });

  // ---------- Controls ----------
  const HINTS = {
    wave: "Add terms to the square wave and watch the spike next to each jump: it gets thinner, never shorter. Drag on the wave to draw your own. With the picture focused, the arrow keys move a pen and reshape the wave, and + or − change the number of terms.",
    draw: "Draw a closed shape with your finger or mouse and the circles redraw it. Keyboard: focus the picture, press Enter, steer the pen with the arrow keys and press Enter again to close the shape. + or − change the number of circles.",
  };
  const LABELS = {
    wave: "Rotating circles whose tip traces a sum of sine waves, next to a plot of that sum against the target wave, with the first harmonics drawn separately and a bar chart of every harmonic's size. Drag on the wave to redraw it; with the picture focused, arrow keys move a pen and reshape the wave, and plus or minus change the number of terms.",
    draw: "A chain of rotating circles whose tip redraws a closed outline, with a bar chart of the circle sizes and a plot of the redraw error against the number of circles. Draw on the picture to make your own shape; with the picture focused, press Enter and use the arrow keys to draw, and plus or minus to change the number of circles.",
  };
  function setMode(m) {
    if (m === state.mode) return;
    state.mode = m;
    $("modeWave").setAttribute("aria-pressed", String(m === "wave"));
    $("modeDraw").setAttribute("aria-pressed", String(m === "draw"));
    for (const el of document.querySelectorAll("[data-mode]")) el.hidden = el.dataset.mode !== m;
    $("hint").textContent = HINTS[m];
    canvas.setAttribute("aria-label", LABELS[m]);
    canvas.style.touchAction = m === "draw" || state.target === "custom" ? "none" : "";
    live = null; kbPen = null; dragging = false;
    if (m === "draw") { stopSound(true); if (!shape.path && state.shape !== "custom") loadShape(); }
    layout();
    if (m === "wave") recompute();
    updateReadouts();
    WONDERS.describe(sceneText(), { now: true });
    checkChallenges();
  }
  function onTargetChange(fromDrawing) {
    canvas.style.touchAction = state.mode === "draw" || state.target === "custom" ? "none" : "";
    if (state.target === "custom" && !state.customReady) defaultCustom();
    recompute();
    noteHeard();
    WONDERS.sound("event", { pitch: 0.5 });
    if (!fromDrawing) WONDERS.describe(sceneText(), { now: true });
    checkChallenges();
  }
  function setPlay(on) {
    state.running = on;
    $("play").textContent = on ? "Pause" : "Play";
  }

  $("modeWave").addEventListener("click", () => setMode("wave"));
  $("modeDraw").addEventListener("click", () => setMode("draw"));
  $("target").addEventListener("change", (e) => { state.target = e.target.value; onTargetChange(false); });
  $("terms").addEventListener("input", (e) => {
    state.terms = +e.target.value;
    recompute();
    if (model.used.length === 1) WONDERS.describe("One term, a single sine wave: the overall error is " + pct(model.rms) + "%.");
    else if (model.over > 0.004) WONDERS.describe(model.used.length + " terms, up to harmonic " + model.hi + ": the overshoot is " + pct(model.over) + "% and the overall error is " + pct(model.rms) + "%.");
    else WONDERS.describe(model.used.length + " terms, up to harmonic " + model.hi + ": the overall error is " + pct(model.rms) + "%.");
    checkChallenges();
  });
  $("listen").addEventListener("click", () => (state.sound ? stopSound() : startSound()));
  $("volume").addEventListener("input", (e) => {
    state.volume = +e.target.value;
    if (gain && actx) gain.gain.setTargetAtTime(level(), actx.currentTime, 0.03);
    updateReadouts();
  });
  $("pitch").addEventListener("input", (e) => {
    state.pitch = +e.target.value;
    if (osc && actx) osc.frequency.setTargetAtTime(state.pitch, actx.currentTime, 0.02);
    updateReadouts();
  });
  $("shape").addEventListener("change", (e) => {
    state.shape = e.target.value;
    loadShape();
    state.tLoop = 0;
    WONDERS.sound("event", { pitch: 0.6 });
    WONDERS.describe(sceneText(), { now: true });
    checkChallenges();
  });
  $("circles").addEventListener("input", (e) => {
    state.circles = +e.target.value;
    rebuildRecon();
    if (shape.path) WONDERS.describe(Math.min(state.circles, shape.terms.length) + " circles redraw the shape with an error of " + pct(shapeErr()) + "%.");
    checkChallenges();
  });
  $("clearShape").addEventListener("click", () => {
    state.shape = "custom";
    $("shape").value = "custom";
    state.userPath = null;
    setPath(null);
    live = null; kbPen = null;
    WONDERS.describe("Cleared. Draw a closed shape on the picture, or focus it and press Enter to draw with the arrow keys.", { now: true });
  });
  $("play").addEventListener("click", () => setPlay(!state.running));

  // ---------- Loop ----------
  let lastT = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    if (state.running) {
      if (state.mode === "wave") state.theta = (state.theta + dt * TAU * WAVE_SPEED) % (4 * TAU);
      else if (shape.path && !live) {
        state.tLoop += dt / LOOP_SECONDS;
        if (state.tLoop >= 1) { state.tLoop -= 1; WONDERS.sound("tick", { pitch: 0.4 }); }
      }
    }
    draw();
    requestAnimationFrame(frame);
  }

  // Re-layout when the bench changes width; the state is kept.
  let lastCW = 0;
  function onResize() {
    const cw = Math.round(canvas.parentElement.clientWidth);
    if (cw === lastCW) return;
    lastCW = cw;
    layout();
    if (state.mode === "wave") recompute();
    draw();
  }
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(canvas.parentElement);
  else window.addEventListener("resize", onResize);

  layout();
  recompute();
  loadShape();
  setPlay(state.running);
  if (Lab.reducedMotion) state.tLoop = 0.6;
  requestAnimationFrame(frame);
})();
